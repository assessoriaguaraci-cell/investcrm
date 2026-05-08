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
      try {
        // 1. Fetch profiles
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name");
        
        if (pError) throw pError;

        // 2. Try to get emails and roles from RPC
        let teamList: any[] = [];
        try {
          const { data: teamData } = await (supabase.rpc as any)("get_team_members");
          teamList = Array.isArray(teamData) ? teamData : [];
        } catch (rpcErr) {
          console.error("RPC Error:", rpcErr);
        }

        // 3. Merge data safely
        return (profiles || []).map((p: any) => {
          const authUser = teamList.find((u: any) => u.id === p.id || u.user_id === p.user_id || u.id === p.user_id);
          
          return {
            id: p.id,
            user_id: p.user_id || p.id,
            full_name: p.full_name || "Sem nome",
            phone: p.phone,
            status: p.status || "approved",
            roles: authUser?.roles || [],
            is_registered: !!p.full_name && p.full_name !== "EMPTY",
            email: authUser?.email || p.email
          };
        }) as TeamMember[];
      } catch (err) {
        console.error("useTeamMembers Error:", err);
        return []; // Return empty array instead of crashing
      }
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
