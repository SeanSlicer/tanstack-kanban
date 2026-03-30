import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// TypeScript types
export type Board = {
  id: string
  title: string
  created_at: string
}

export type Card = {
  id: string
  board_id: string
  column_name: 'todo' | 'in_progress' | 'done' | 'backlog'
  title: string
  description: string | null
  position: number
  assigned_to: string | null
  created_at: string
}
