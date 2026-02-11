import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  status: string;
  roles: string[];
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("*");

      return profiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        status: (p as any).status ?? "approved",
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      })) as TeamMember[];
    },
  });
}

export function useApprovedMembers() {
  const { data, ...rest } = useTeamMembers();
  return {
    data: data?.filter((m) => m.status === "approved") ?? [],
    ...rest,
  };
}
