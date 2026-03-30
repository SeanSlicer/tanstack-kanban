import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export const useProfiles = () => {
  return useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data as Profile[];
    },
  });
};

export const useProfile = (userId: string) => {
  return useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { userId: string; fullName: string }>({
    mutationFn: async ({ userId, fullName }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
      if (error) throw new Error(error.message);

      // Also update auth metadata so it stays in sync
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (metaError) throw new Error(metaError.message);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
};
