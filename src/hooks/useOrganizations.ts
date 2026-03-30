import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Board, BoardMember, OrgMember, Organization } from "../lib/supabase";

// ─── Organizations ────────────────────────────────────────────────

export const useOrganizations = () =>
  useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as Organization[];
    },
  });

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<Organization, Error, { name: string; description?: string }>({
    mutationFn: async ({ name, description }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, description: description?.trim() || null, created_by: user?.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { orgId: string; name: string; description?: string }>({
    mutationFn: async ({ orgId, name, description }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ name, description: description?.trim() || null })
        .eq("id", orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (orgId) => {
      const { error } = await supabase.from("organizations").delete().eq("id", orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
};

// Returns the current user's membership rows across all orgs (role lookup)
export const useMyOrgMemberships = () =>
  useQuery<OrgMember[]>({
    queryKey: ["org_members", "me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return data as OrgMember[];
    },
  });

// ─── Organization members ─────────────────────────────────────────

export const useOrgMembers = (orgId: string) =>
  useQuery<OrgMember[]>({
    queryKey: ["org_members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as OrgMember[];
    },
    enabled: !!orgId,
  });

export const useAddOrgMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { orgId: string; userId: string; role?: OrgMember["role"] }>({
    mutationFn: async ({ orgId, userId, role = "member" }) => {
      const { error } = await supabase
        .from("organization_members")
        .insert({ org_id: orgId, user_id: userId, role });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { orgId }) =>
      queryClient.invalidateQueries({ queryKey: ["org_members", orgId] }),
  });
};

export const useRemoveOrgMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { orgId: string; userId: string }>({
    mutationFn: async ({ orgId, userId }) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("org_id", orgId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { orgId }) =>
      queryClient.invalidateQueries({ queryKey: ["org_members", orgId] }),
  });
};

export const useUpdateOrgMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { orgId: string; userId: string; role: OrgMember["role"] }>({
    mutationFn: async ({ orgId, userId, role }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("org_id", orgId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { orgId }) =>
      queryClient.invalidateQueries({ queryKey: ["org_members", orgId] }),
  });
};

// ─── Org boards ───────────────────────────────────────────────────

export const useOrgBoards = (orgId: string) =>
  useQuery<Board[]>({
    queryKey: ["boards", "org", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as Board[];
    },
    enabled: !!orgId,
  });

export const useCreateOrgBoard = () => {
  const queryClient = useQueryClient();
  return useMutation<Board, Error, { title: string; orgId: string }>({
    mutationFn: async ({ title, orgId }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("boards")
        .insert({ title, org_id: orgId, user_id: user?.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Board;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ["boards", "org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
};

// ─── Board members ────────────────────────────────────────────────

export const useBoardMembers = (boardId: string) =>
  useQuery<BoardMember[]>({
    queryKey: ["board_members", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .eq("board_id", boardId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as BoardMember[];
    },
    enabled: !!boardId,
  });

export const useAssignBoardMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { boardId: string; userId: string }>({
    mutationFn: async ({ boardId, userId }) => {
      const { error } = await supabase
        .from("board_members")
        .insert({ board_id: boardId, user_id: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { boardId }) =>
      queryClient.invalidateQueries({ queryKey: ["board_members", boardId] }),
  });
};

export const useRemoveBoardMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { boardId: string; userId: string }>({
    mutationFn: async ({ boardId, userId }) => {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("board_id", boardId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { boardId }) =>
      queryClient.invalidateQueries({ queryKey: ["board_members", boardId] }),
  });
};
