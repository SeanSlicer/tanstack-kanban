-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set the initial admin user
UPDATE profiles SET is_admin = true WHERE id = '4d8278ff-8386-432c-abfb-d7ba316f7d71';

-- SECURITY DEFINER function to check admin status without recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Admins can read all boards (existing policy covers own boards)
DROP POLICY IF EXISTS "admins can read all boards" ON boards;
CREATE POLICY "admins can read all boards"
  ON boards FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admins can delete any board
DROP POLICY IF EXISTS "admins can delete any board" ON boards;
CREATE POLICY "admins can delete any board"
  ON boards FOR DELETE TO authenticated
  USING (public.is_admin());

-- Admins can read all cards
DROP POLICY IF EXISTS "admins can read all cards" ON cards;
CREATE POLICY "admins can read all cards"
  ON cards FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admins can delete any card
DROP POLICY IF EXISTS "admins can delete any card" ON cards;
CREATE POLICY "admins can delete any card"
  ON cards FOR DELETE TO authenticated
  USING (public.is_admin());

-- Admins can update any profile (e.g. toggle admin flag)
DROP POLICY IF EXISTS "admins can update any profile" ON profiles;
CREATE POLICY "admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Admins can delete profiles
DROP POLICY IF EXISTS "admins can delete profiles" ON profiles;
CREATE POLICY "admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (public.is_admin());
