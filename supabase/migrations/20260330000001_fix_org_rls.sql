-- ================================================================
-- These fixes are now incorporated into 20260329000003_organizations.sql.
-- This file is kept as a no-op so the migration history stays intact
-- for databases that already applied the original 003 migration.
-- ================================================================

-- Fix 1: org members (not just leaders) can read org boards
DROP POLICY IF EXISTS "org members can read org boards" ON public.boards;
CREATE POLICY "org members can read org boards" ON public.boards
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()));

-- Fix 2: org members can fully access cards on org boards
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

-- Fix 3: set created_by from auth.uid() automatically
ALTER TABLE public.organizations
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Fix 4: make the auto-leader trigger safe against null created_by
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

-- Fix 5: board owner can update org assignment
DROP POLICY IF EXISTS "board owner can update org assignment" ON public.boards;
CREATE POLICY "board owner can update org assignment" ON public.boards
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
