import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define types
interface Board {
  id: string;
  title: string;
  created_at: string;
}

interface Card {
  id: string;
  board_id: string;
  column_name: 'todo' | 'in_progress' | 'done';
  title: string;
  description: string;
  position: number;
  created_at: string;
}

// Export the Supabase client and types
export { supabase };
export type { Board, Card };