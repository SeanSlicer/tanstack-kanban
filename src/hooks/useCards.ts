import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Card } from "../lib/supabase";

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

type CreateCardInput = Omit<Card, "id" | "created_at" | "priority" | "due_date"> & {
  priority?: Card["priority"];
  due_date?: Card["due_date"];
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();

  return useMutation<Card, Error, CreateCardInput>({
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

// Generalised update — pass any subset of editable card fields
type CardUpdate = Partial<
  Pick<Card, "assigned_to" | "priority" | "due_date" | "title" | "description">
>;

export const useUpdateCard = () => {
  const queryClient = useQueryClient();

  return useMutation<Card, Error, { cardId: string } & CardUpdate>({
    mutationFn: async ({ cardId, ...updates }) => {
      const { data, error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Card;
    },
    onSuccess: (updatedCard) => {
      queryClient.invalidateQueries({
        queryKey: ["cards", updatedCard.board_id],
      });
    },
  });
};

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
        return old.map((card) =>
          card.id === cardId ? { ...card, position, column_name } : card,
        );
      });
      return { previousCards };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previousCards?: Card[] } | undefined;
      if (ctx?.previousCards) {
        queryClient.setQueryData(["cards"], ctx.previousCards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
};
