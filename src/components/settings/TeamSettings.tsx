import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersRound, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { useIsManagerOrAdmin } from "@/hooks/useCurrentUserRole";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "gestor", label: "Gestor" },
  { value: "comercial", label: "Comercial" },
  { value: "operacoes", label: "Operações" },
  { value: "leitura", label: "Leitura" },
];

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Aprovado", variant: "default" },
  pending: { label: "Pendente", variant: "outline" },
  rejected: { label: "Recusado", variant: "destructive" },
};

export default function TeamSettings() {
  const { data: members = [], isLoading } = useTeamMembers();
  const canManage = useIsManagerOrAdmin();
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Remove all existing roles for user, then insert new one
      await supabase.from("user_roles").delete().eq("user_id", userId);
      if (role) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Papel atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  const pending = members.filter((m) => m.status === "pending");
  const others = members.filter((m) => m.status !== "pending");

  return (
    <div className="space-y-6 max-w-2xl">
      {canManage && pending.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" /> Solicitações pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.full_name || "Sem nome"}</p>
                    {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => updateStatus.mutate({ userId: m.user_id, status: "approved" })}>
                      <Check className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive text-xs h-8 gap-1" onClick={() => updateStatus.mutate({ userId: m.user_id, status: "rejected" })}>
                      <X className="h-3 w-3" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="h-4 w-4" /> Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-lg border border-border">
            {others.map((m) => (
              <MemberRow key={m.id} member={m} canManage={canManage} onRoleChange={(role) => updateRole.mutate({ userId: m.user_id, role })} onStatusChange={(status) => updateStatus.mutate({ userId: m.user_id, status })} />
            ))}
            {others.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum membro encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({ member, canManage, onRoleChange, onStatusChange }: { member: TeamMember; canManage: boolean; onRoleChange: (role: string) => void; onStatusChange: (status: string) => void }) {
  const statusInfo = STATUS_BADGES[member.status] ?? STATUS_BADGES.pending;
  const currentRole = member.roles[0] ?? "";
  const roleLabel = ROLE_OPTIONS.find(r => r.value === currentRole)?.label ?? "Sem papel";

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{member.full_name || "Sem nome"}</p>
          <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
        </div>
        {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canManage ? (
          <>
            <Select value={currentRole || "none"} onValueChange={(v) => onRoleChange(v === "none" ? "" : v)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem papel</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {member.status === "approved" && (
              <Button size="sm" variant="ghost" className="text-destructive text-xs h-8" onClick={() => onStatusChange("rejected")}>
                Bloquear
              </Button>
            )}
            {member.status === "rejected" && (
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => onStatusChange("approved")}>
                Reativar
              </Button>
            )}
          </>
        ) : (
          <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
        )}
      </div>
    </div>
  );
}
