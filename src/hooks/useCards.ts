import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Board, Card } from '../lib/supabase'

// Type guard for Card
function isCard(data: any): data is Card {
  return (
    data && 
    typeof data.id === 'string' && 
    typeof data.board_id === 'string' &&
    ['todo', 'in_progress', 'done'].includes(data.column_name) &&
    typeof data.title === 'string' &&
    (data.description === null || typeof data.description === 'string') &&
    typeof data.position === 'number' &&
    typeof data.created_at === 'string'
  )
}

// Type guard for Board
function isBoard(data: any): data is Board {
  return (
    data && 
    typeof data.id === 'string' && 
    typeof data.title === 'string' &&
    typeof data.created_at === 'string'
  )
}

// Custom hook to fetch all cards for a board ordered by position
export function useCards(boardId: string) {
  return useQuery({
    queryKey: ['cards', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('No data returned from Supabase')
      }

      // Validate data
      if (!Array.isArray(data)) {
        throw new Error('Expected array of cards')
      }

      for (const item of data) {
        if (!isCard(item)) {
          throw new Error('Invalid card data')
        }
      }

      return data
    },
  })
}

// Custom hook for creating a new card
export function useCreateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (card: Omit<Card, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('cards')
        .insert([card])
        .select('*')

      if (error) {
        throw new Error(error.message)
      }

      if (!data || !isCard(data[0])) {
        throw new Error('Invalid response from Supabase')
      }

      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

// Custom hook for moving a card
export function useMoveCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, column_name, position }: { id: string; column_name: Card['column_name']; position: number }) => {
      const { data, error } = await supabase
        .from('cards')
        .update({ column_name, position })
        .eq('id', id)
        .select('*')

      if (error) {
        throw new Error(error.message)
      }

      if (!data || !isCard(data[0])) {
        throw new Error('Invalid response from Supabase')
      }

      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}
