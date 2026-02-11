import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersRound } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  comercial: "Comercial",
  operacoes: "Operações",
  leitura: "Leitura",
};

export default function TeamSettings() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("*");

      return profiles.map((p) => ({
        ...p,
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
    },
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="h-4 w-4" /> Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-lg border border-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.full_name}</p>
                  {m.phone && (
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {m.roles.length > 0 ? (
                    m.roles.map((r: string) => (
                      <Badge key={r} variant="secondary" className="text-xs">
                        {ROLE_LABELS[r] || r}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">Sem papel</Badge>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum membro encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
