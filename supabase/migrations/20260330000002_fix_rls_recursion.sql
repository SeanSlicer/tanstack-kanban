-- ================================================================
-- Fix infinite recursion between boards and board_members policies.
--
-- The cycle was:
--   SELECT boards
--     → "board members can read assigned boards" → SELECT board_members
--       → "users can view their board assignments" (inline boards subquery)
--         → SELECT boards  →  LOOP
--
-- Fix: replace all inline `boards` subqueries inside board_members
-- policies with a SECURITY DEFINER function.  SECURITY DEFINER
-- bypasses RLS on boards, so the recursion never starts.
-- ================================================================

-- Helper: returns all board IDs the current user owns or leads via org.
-- SECURITY DEFINER means it queries boards/organization_members directly,
-- skipping their RLS policies, which is what prevents the recursion.
CREATE OR REPLACE FUNCTION public.get_my_managed_board_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- boards owned directly
  SELECT id FROM public.boards WHERE user_id = auth.uid()
  UNION
  -- boards belonging to orgs where the user is a leader
  SELECT b.id FROM public.boards b
    INNER JOIN public.organization_members om
      ON om.org_id = b.org_id
     AND om.user_id = auth.uid()
     AND om.role = 'leader'
  WHERE b.org_id IS NOT NULL
$$;

-- ================================================================
-- Rebuild board_members policies without any inline boards queries
-- ================================================================

DROP POLICY IF EXISTS "users can view their board assignments" ON public.board_members;
CREATE POLICY "users can view their board assignments" ON public.board_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR board_id IN (SELECT public.get_my_managed_board_ids())
  );

DROP POLICY IF EXISTS "board owners and org leaders can manage board members" ON public.board_members;
CREATE POLICY "board owners and org leaders can manage board members" ON public.board_members
  FOR ALL TO authenticated
  USING  (board_id IN (SELECT public.get_my_managed_board_ids()))
  WITH CHECK (board_id IN (SELECT public.get_my_managed_board_ids()));

-- admins policy is fine (no boards subquery) — recreate for idempotency
DROP POLICY IF EXISTS "admins can manage all board members" ON public.board_members;
CREATE POLICY "admins can manage all board members" ON public.board_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
