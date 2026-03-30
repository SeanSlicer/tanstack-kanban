-- ================================================================
-- Helper functions (SECURITY DEFINER avoids recursive RLS lookups)
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
-- New tables
-- ================================================================

CREATE TABLE public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.board_members (
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
-- RLS: organizations
-- ================================================================

CREATE POLICY "org members can read their orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "authenticated users can create orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "org leaders can update their orgs" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.get_my_leader_org_ids()));

CREATE POLICY "org leaders can delete their orgs" ON public.organizations
  FOR DELETE TO authenticated
  USING (id IN (SELECT public.get_my_leader_org_ids()));

CREATE POLICY "admins can manage all orgs" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: organization_members
-- ================================================================

CREATE POLICY "org members can view org members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "org leaders can manage members" ON public.organization_members
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.get_my_leader_org_ids()))
  WITH CHECK (org_id IN (SELECT public.get_my_leader_org_ids()));

CREATE POLICY "members can leave orgs" ON public.organization_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins can manage all org members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: board_members
-- ================================================================

CREATE POLICY "users can view their board assignments" ON public.board_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
    OR board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_leader_org_ids())
    )
  );

CREATE POLICY "board owners and org leaders can manage board members" ON public.board_members
  FOR ALL TO authenticated
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
    OR board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_leader_org_ids())
    )
  )
  WITH CHECK (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
    OR board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (SELECT public.get_my_leader_org_ids())
    )
  );

CREATE POLICY "admins can manage all board members" ON public.board_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- RLS: additional board policies for org access
-- ================================================================

CREATE POLICY "board members can read assigned boards" ON public.boards
  FOR SELECT TO authenticated
  USING (id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()));

CREATE POLICY "org leaders can manage org boards" ON public.boards
  FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_leader_org_ids()))
  WITH CHECK (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_leader_org_ids()));

-- ================================================================
-- RLS: additional card policies for org/board-member access
-- ================================================================

CREATE POLICY "board members can access cards" ON public.cards
  FOR ALL TO authenticated
  USING (board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid()));

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
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new.id, new.created_by, 'leader');
  RETURN new;
end;
$$;

CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();
