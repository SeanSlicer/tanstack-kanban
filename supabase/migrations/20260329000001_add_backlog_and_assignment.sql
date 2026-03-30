-- Allow backlog as a valid column name
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_column_name_check;
ALTER TABLE cards ADD CONSTRAINT cards_column_name_check
  CHECK (column_name = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text, 'backlog'::text]));

-- Add assigned_to referencing profiles
ALTER TABLE cards ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);
