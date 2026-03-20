import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch cards for a board
const fetchCards = async (boardId: string) => {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('board_id', boardId);

  if (error) throw error;
  return data;
};

// Create a new card
const createCard = async (card: { board_id: string; column_name: string; title: string; description: string; position: number }) => {
  const { data, error } = await supabase
    .from('cards')
    .insert([card])
    .single();

  if (error) throw error;
  return data;
};

// Move a card (update column_name and position)
const moveCard = async (cardId: string, column_name: string, position: number) => {
  const { data, error } = await supabase
    .from('cards')
    .update({ column_name, position })
    .eq('id', cardId)
    .single();

  if (error) throw error;
  return data;
};

// Custom hooks
export const useCards = (boardId: string) => {
  return useQuery(['cards', boardId], () => fetchCards(boardId));
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();
  return useMutation(createCard, {
    onSuccess: () => {
      queryClient.invalidateQueries(['cards']);
    },
  });
};

export const useMoveCard = () => {
  const queryClient = useQueryClient();
  return useMutation(moveCard, {
    onSuccess: () => {
      queryClient.invalidateQueries(['cards']);
    },
  });
};