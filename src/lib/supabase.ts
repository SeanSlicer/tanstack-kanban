import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Board = {
  id: string
  title: string
  user_id: string | null
  org_id: string | null
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
  priority: 'low' | 'medium' | 'high' | null
  due_date: string | null
  created_at: string
}

export type Organization = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type OrgMember = {
  id: string
  org_id: string
  user_id: string
  role: 'leader' | 'member'
  created_at: string
}

export type BoardMember = {
  id: string
  board_id: string
  user_id: string
  created_at: string
}
