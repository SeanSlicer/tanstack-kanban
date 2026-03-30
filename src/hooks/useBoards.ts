import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Board } from "../lib/supabase";

export const useBoards = () => {
  return useQuery<Board[], Error>({
    queryKey: ["boards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as Board[];
    },
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, { title: string; orgId?: string }>({
    mutationFn: async ({ title, orgId }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("boards")
        .insert({ title, user_id: user?.id, org_id: orgId ?? null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Board;
    },
    onSuccess: (newBoard) => {
      queryClient.setQueryData<Board[]>(["boards"], (old) =>
        old ? [...old, newBoard] : [newBoard],
      );
    },
  });
};
