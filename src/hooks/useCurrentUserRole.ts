import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useCurrentUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current_user_role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.role);
    },
  });
}

export function useIsManagerOrAdmin() {
  const { data: roles = [] } = useCurrentUserRole();
  return roles.includes("admin") || roles.includes("gestor");
}
