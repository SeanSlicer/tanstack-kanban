-- ================================================================
-- Fix 1: org members (not just leaders) can read org boards
-- ================================================================

CREATE POLICY "org members can read org boards" ON public.boards
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()));

-- ================================================================
-- Fix 2: org members can fully access cards on org boards
-- Previously only leaders had this; regular members were locked out
-- ================================================================

CREATE POLICY "org members can access org board cards" ON public.cards
  FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_org_ids())
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_org_ids())
    )
  );

-- ================================================================
-- Fix 3: set created_by from auth.uid() automatically so the
-- client doesn't have to pass it (avoids race / null issues)
-- ================================================================

ALTER TABLE public.organizations
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ================================================================
-- Fix 4: make the auto-leader trigger safe against null created_by
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  IF new.created_by IS NOT NULL THEN
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new.id, new.created_by, 'leader')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  RETURN new;
end;
$$;

-- ================================================================
-- Fix 5: allow boards to be reassigned to / removed from an org
-- by the board owner (needed for "assign existing board" feature)
-- ================================================================

CREATE POLICY "board owner can update org assignment" ON public.boards
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
