import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  status: string;
  roles: string[];
  is_registered: boolean;
  email?: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      // Fetch profiles directly from the profiles table
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      
      if (pError) throw pError;

      // We still use this RPC because it should return the email of the users
      // which is stored in auth.users and joined in this function
      const { data: teamData } = await (supabase.rpc as any)("get_team_members");
      const teamList = Array.isArray(teamData) ? teamData : [];

      return profiles.map((p: any) => {
        // Since emails only exist in auth.users, try to get it from the RPC
        const authUser = teamList.find((u: any) => (u.id === p.id) || (u.id === p.user_id));
        
        return {
          id: p.id,
          user_id: p.user_id, // Use the real auth user id
          full_name: p.full_name || "Sem nome",
          phone: p.phone,
          status: "approved", // Hardcode to approved since column doesn't exist yet
          roles: authUser?.roles || ["investor"],
          is_registered: !!p.full_name && p.full_name !== "EMPTY",
          email: authUser?.email
        };
      }) as TeamMember[];
    },
  });
}

export function useApprovedMembers() {
  const { data, ...rest } = useTeamMembers();
  return {
    data: data?.filter((m) => m.status === "approved" || m.status === "pending_registration") ?? [],
    ...rest,
  };
}
