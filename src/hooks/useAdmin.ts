import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Board, Card, Organization } from "../lib/supabase";

export const useAllBoards = () => {
  return useQuery<Board[]>({
    queryKey: ["admin", "boards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Board[];
    },
  });
};

export const useAllCards = () => {
  return useQuery<Card[]>({
    queryKey: ["admin", "cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Card[];
    },
  });
};

export const useToggleAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; isAdmin: boolean }>({
    mutationFn: async ({ userId, isAdmin }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: isAdmin })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
};

export const useCreateTestUser = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { email: string; password: string; fullName: string }>({
    mutationFn: async ({ email, password, fullName }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Profile will be created by the DB trigger; give it a moment then refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
      }, 1500);
    },
  });
};

export const useAdminDeleteBoard = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (boardId) => {
      const { error } = await supabase.from("boards").delete().eq("id", boardId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "boards"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
  });
};

export const useAdminDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (cardId) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
  });
};

export const useAllOrganizations = () =>
  useQuery<Organization[]>({
    queryKey: ["admin", "organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Organization[];
    },
  });

export const useAdminDeleteOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (orgId) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
  });
};

export const useAdminDeleteProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (userId) => {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
};
