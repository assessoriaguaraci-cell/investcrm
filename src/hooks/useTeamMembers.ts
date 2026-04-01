import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  occupation: string | null;
  status: string;
  roles: string[];
  is_registered: boolean;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data: teamData, error: tError } = await (supabase.rpc as any)("get_team_members");
      if (tError) throw tError;

      const { data: authEmailsData } = await (supabase.rpc as any)("get_authorized_emails");
      const authEmails: any[] = Array.isArray(authEmailsData) ? authEmailsData : [];

      const rawMembers: any[] = Array.isArray(teamData) ? teamData : [];
      const existingEmails = new Set(rawMembers.map((m) => m.email?.toLowerCase()).filter(Boolean));

      const registeredMembers = rawMembers.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        occupation: p.occupation,
        status: p.status ?? "approved",
        roles: Array.isArray(p.roles) ? p.roles : [],
        is_registered: true,
      })) as TeamMember[];

      const pendingMembers = authEmails
        .filter((auth) => auth.email && !existingEmails.has(auth.email.toLowerCase()))
        .map((auth) => ({
          id: auth.id,
          user_id: auth.email, // using email as id for ui purposes to avoid empty state
          full_name: auth.full_name || auth.email,
          phone: auth.phone || null,
          occupation: auth.occupation || null,
          status: "pending_registration",
          roles: auth.role ? [auth.role] : [],
          is_registered: false,
        })) as TeamMember[];

      return [...registeredMembers, ...pendingMembers];
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
