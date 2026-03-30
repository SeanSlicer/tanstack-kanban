import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Card } from "../lib/supabase";

// Fetch cards for a specific board
export const useCards = (boardId: string) => {
  return useQuery<Card[], Error>({
    queryKey: ["cards", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("board_id", boardId)
        .order("position");
      if (error) throw new Error(error.message);
      return data as Card[];
    },
  });
};

// Create a new card
export const useCreateCard = () => {
  const queryClient = useQueryClient();

  return useMutation<Card, Error, Omit<Card, "id" | "created_at">>({
    mutationFn: async (card) => {
      const { data, error } = await supabase
        .from("cards")
        .insert(card)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Card;
    },
    onSuccess: (newCard) => {
      queryClient.setQueryData<Card[]>(["cards", newCard.board_id], (old) =>
        old ? [...old, newCard] : [newCard],
      );
    },
  });
};

// Update a card's fields (e.g. assigned_to)
export const useUpdateCard = () => {
  const queryClient = useQueryClient();

  return useMutation<Card, Error, { cardId: string; assigned_to: string | null }>({
    mutationFn: async ({ cardId, assigned_to }) => {
      const { data, error } = await supabase
        .from("cards")
        .update({ assigned_to })
        .eq("id", cardId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Card;
    },
    onSuccess: (updatedCard) => {
      queryClient.invalidateQueries({ queryKey: ["cards", updatedCard.board_id] });
    },
  });
};

// Move a card
export const useMoveCard = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Card,
    Error,
    { cardId: string; position: number; column_name: Card["column_name"] }
  >({
    mutationFn: async ({ cardId, position, column_name }) => {
      const { data, error } = await supabase
        .from("cards")
        .update({ position, column_name })
        .eq("id", cardId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Card;
    },
    onMutate: async ({ cardId, position, column_name }) => {
      await queryClient.cancelQueries({ queryKey: ["cards"] });

      const previousCards = queryClient.getQueryData<Card[]>(["cards"]);

      queryClient.setQueryData<Card[]>(["cards"], (old) => {
        if (!old) return old;
        return old.map((card: Card) =>
          card.id === cardId ? { ...card, position, column_name } : card,
        );
      });

      return { previousCards };
    },
    onError: (_error, _variables, context) => {
      const safeContext = context as { previousCards?: Card[] } | undefined;
      if (safeContext?.previousCards) {
        queryClient.setQueryData(["cards"], safeContext.previousCards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
};
