-- ================================================================
-- Tables first (functions below reference these)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.board_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (board_id, user_id)
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- Schema changes to existing tables
-- ================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date date;

-- ================================================================
-- Grants
-- ================================================================

GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.board_members TO authenticated;

-- ================================================================
-- Helper functions (SECURITY DEFINER avoids recursive RLS lookups)
-- Must come after tables exist so the sql function bodies validate
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_leader_org_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'leader';
$$;

-- ================================================================
-- RLS: organizations
-- ================================================================

DROP POLICY IF EXISTS "org members can read their orgs" ON public.organizations;
CREATE POLICY "org members can read their orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "authenticated users can create orgs" ON public.organizations;
CREATE POLICY "authenticated users can create orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "org leaders can update their orgs" ON public.organizations;
CREATE POLICY "org leaders can update their orgs" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.get_my_leader_org_ids()));

DROP POLICY IF EXISTS "org leaders can delete their orgs" ON public.organizations;
CREATE POLICY "org leaders can delete their orgs" ON public.organizations
  FOR DELETE TO authenticated
  USING (id IN (SELECT public.get_my_leader_org_ids()));

DROP POLICY IF EXISTS "admins can manage all orgs" ON public.organizations;
CREATE POLICY "admins can manage all orgs" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: organization_members
-- ================================================================

DROP POLICY IF EXISTS "org members can view org members" ON public.organization_members;
CREATE POLICY "org members can view org members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "org leaders can manage members" ON public.organization_members;
CREATE POLICY "org leaders can manage members" ON public.organization_members
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.get_my_leader_org_ids()))
  WITH CHECK (org_id IN (SELECT public.get_my_leader_org_ids()));

DROP POLICY IF EXISTS "members can leave orgs" ON public.organization_members;
CREATE POLICY "members can leave orgs" ON public.organization_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins can manage all org members" ON public.organization_members;
CREATE POLICY "admins can manage all org members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: board_members
-- ================================================================

-- Helper: board IDs the current user owns or leads via org.
-- SECURITY DEFINER bypasses boards/org_members RLS → no recursion.
-- Also defined (as CREATE OR REPLACE) in 20260330000002_fix_rls_recursion.sql.
CREATE OR REPLACE FUNCTION public.get_my_managed_board_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.boards WHERE user_id = auth.uid()
  UNION
  SELECT b.id FROM public.boards b
    INNER JOIN public.organization_members om
      ON om.org_id = b.org_id
     AND om.user_id = auth.uid()
     AND om.role = 'leader'
  WHERE b.org_id IS NOT NULL
$$;

-- NOTE: board_members policies must NOT contain inline `boards` subqueries
-- or they cause infinite recursion with the boards RLS policies.
-- get_my_managed_board_ids() is SECURITY DEFINER and bypasses boards RLS.
-- It is defined in migration 20260330000002_fix_rls_recursion.sql which
-- runs after this file, so these policies reference a function that may
-- not exist yet on a fresh install.  The function is idempotent so the
-- fix migration is safe to run even on a fresh DB.

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

DROP POLICY IF EXISTS "admins can manage all board members" ON public.board_members;
CREATE POLICY "admins can manage all board members" ON public.board_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: additional board policies for org access
-- ================================================================

DROP POLICY IF EXISTS "board members can read assigned boards" ON public.boards;
CREATE POLICY "board members can read assigned boards" ON public.boards
  FOR SELECT TO authenticated
  USING (id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "org members can read org boards" ON public.boards;
CREATE POLICY "org members can read org boards" ON public.boards
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "org leaders can manage org boards" ON public.boards;
CREATE POLICY "org leaders can manage org boards" ON public.boards
  FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_leader_org_ids()))
  WITH CHECK (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_leader_org_ids()));

DROP POLICY IF EXISTS "board owner can update org assignment" ON public.boards;
CREATE POLICY "board owner can update org assignment" ON public.boards
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- RLS: additional card policies for org/board-member access
-- ================================================================

DROP POLICY IF EXISTS "board members can access cards" ON public.cards;
CREATE POLICY "board members can access cards" ON public.cards
  FOR ALL TO authenticated
  USING (board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "org members can access org board cards" ON public.cards;
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

DROP POLICY IF EXISTS "org leaders can access org board cards" ON public.cards;
CREATE POLICY "org leaders can access org board cards" ON public.cards
  FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_leader_org_ids())
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_leader_org_ids())
    )
  );

-- ================================================================
-- Trigger: org creator is automatically added as leader
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

DROP TRIGGER IF EXISTS on_org_created ON public.organizations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();
