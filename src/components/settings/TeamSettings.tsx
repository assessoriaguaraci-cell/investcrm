import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UsersRound, Check, X, ShieldCheck, UserPlus, Pencil, Trash2, Search, FilterX } from "lucide-react";
import { toast } from "sonner";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { useIsManagerOrAdmin } from "@/hooks/useCurrentUserRole";
import { useAuth } from "@/hooks/useAuth";
import MultiSelectFilter from "@/components/properties/MultiSelectFilter";
import { SavedFiltersButton } from "@/components/ui/saved-filters-button";

export interface TeamFilterValues {
  roles: string[];
  status: string[];
}

export const EMPTY_TEAM_FILTERS: TeamFilterValues = {
  roles: [],
  status: [],
};

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
  pending_registration: { label: "Aguardando Registro", variant: "outline" },
  rejected: { label: "Recusado", variant: "destructive" },
};

export default function TeamSettings() {
  const { data: members = [], isLoading } = useTeamMembers();
  const canManage = useIsManagerOrAdmin();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TeamFilterValues>(EMPTY_TEAM_FILTERS);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteOccupation, setInviteOccupation] = useState("");

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

  const deleteMember = useMutation({
    mutationFn: async (m: TeamMember) => {
      const email = m.status === 'pending_registration' ? m.user_id : (m as any).email;
      const { error } = await (supabase.rpc as any)("delete_team_member", {
        p_id: m.status === 'pending_registration' ? m.id : m.user_id,
        p_status: m.status,
        p_email: email || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Membro excluído com sucesso");
    },
    onError: (e: any) => toast.error("Erro ao excluir: " + e.message),
  });

  const inviteMember = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("add_authorized_email", {
        p_email: inviteEmail.trim(),
        p_full_name: inviteName.trim(),
        p_phone: invitePhone.trim() || null,
        p_occupation: inviteOccupation || null,
        p_role: inviteRole || null
      });

      if (error) throw error;
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error((data as any).error);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Membro adicionado com sucesso");
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      setInvitePhone("");
      setInviteOccupation("");
    },
    onError: (e: any) => toast.error("Erro ao convidar: " + e.message),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  const { user } = useAuth();
  const isAdmin = !!user?.id && members.some(m => m.user_id === user.id && (m.roles || []).includes('admin'));
  // Emergency bypass: if the user is one of the main leads (Annalu or Douglas) or if no admin exists
  const isProjectOwner = user?.email?.includes('annalu') || user?.email?.includes('guaraci') || !members.some(m => (m.roles || []).includes('admin'));
  const effectiveCanManage = canManage || isAdmin || isProjectOwner;

  const pending = members.filter((m) => m.status === "pending");
  
  const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
    if (selected.length === 0) return true; // "all"
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value || "");
  };

  const filteredMembers = members.filter((m) => {
    if (m.status === "pending") return false;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (m.full_name || "").toLowerCase().includes(q);
      const mEmail = (m as any).email || "";
      const mUserId = m.user_id || "";
      const matchEmail = mEmail.toLowerCase().includes(q) || mUserId.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // Role filter
    if (filters.roles.length > 0) {
      const memberRoles = m.roles || [];
      const hasRole = memberRoles.some(r => filters.roles.includes(r));
      if (!hasRole && !(filters.roles.length === 1 && filters.roles[0] === "__none__" && memberRoles.length === 0)) {
         if (filters.roles.length === 1 && filters.roles[0] === "__none__") return false;
         if (!hasRole) return false;
      }
      // Re-implementing role logic more clearly
      const isNoneSelected = filters.roles.length === 1 && filters.roles[0] === "__none__";
      if (isNoneSelected) {
        if (memberRoles.length > 0) return false;
      } else {
        const hasAnyRoleMatch = memberRoles.some(r => filters.roles.includes(r));
        if (!hasAnyRoleMatch) return false;
      }
    }

    // Status filter
    if (!matchesMultiSelect(m.status, filters.status)) return false;

    return true;
  });

  const others = filteredMembers;

  const OCCUPATION_OPTIONS = [
    { value: "gestor", label: "Gestor" },
    { value: "coordenador", label: "Coordenador" },
    { value: "administrativo", label: "Administrativo" },
    { value: "estagiario", label: "Estagiário" },
    { value: "outro", label: "Outro" },
  ];

  return (
    <div className="space-y-6 max-w-2xl text-foreground">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" /> Gestão de Equipe
        </h2>
        
        {effectiveCanManage && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 font-black uppercase tracking-tight shadow-md">
                <UserPlus className="h-4 w-4" /> Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="font-black uppercase tracking-tight">Autorizar Novo Acesso</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  O e-mail autorizado poderá criar uma conta e entrar automaticamente na equipe.
                </p>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Nome Completo</Label>
                    <Input placeholder="Ex: João Silva" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">E-mail</Label>
                    <Input type="email" placeholder="email@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Telefone</Label>
                    <Input placeholder="(00) 00000-0000" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Cargo</Label>
                    <Select value={inviteOccupation} onValueChange={setInviteOccupation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OCCUPATION_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Permissões CRM</Label>
                  <Select value={inviteRole || "none"} onValueChange={(v) => setInviteRole(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem papel (Apenas leitura)</SelectItem>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full mt-4 font-black uppercase tracking-tight"
                  disabled={!inviteEmail.trim() || !inviteName.trim() || inviteMember.isPending}
                  onClick={() => inviteMember.mutate()}
                >
                  {inviteMember.isPending ? "Processando..." : "Enviar Convite e Autorizar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="h-4 w-4" /> Equipe
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cargo</Label>
              <MultiSelectFilter
                label="Cargo"
                options={ROLE_OPTIONS}
                selected={filters.roles}
                onSelectionChange={(v) => setFilters({ ...filters, roles: v })}
                placeholder="Todos os cargos"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
              <MultiSelectFilter
                label="Status"
                options={Object.entries(STATUS_BADGES).map(([val, info]) => ({ value: val, label: info.label }))}
                selected={filters.status}
                onSelectionChange={(v) => setFilters({ ...filters, status: v })}
                placeholder="Todos os status"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-bold"
                onClick={() => {
                  setSearchTerm("");
                  setFilters(EMPTY_TEAM_FILTERS);
                }}
                disabled={!searchTerm && filters.roles.length === 0 && filters.status.length === 0}
              >
                <FilterX className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </div>

          <SavedFiltersButton
            entityType="team"
            currentFilters={filters}
            emptyFilters={EMPTY_TEAM_FILTERS}
            onLoadFilter={setFilters}
          />

          <div className="divide-y divide-border rounded-lg border border-border">
            {others.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canManage={canManage}
                onRoleChange={(role) => updateRole.mutate({ userId: m.user_id, role })}
                onStatusChange={(status) => updateStatus.mutate({ userId: m.user_id, status })}
                onDelete={(member) => {
                  if (window.confirm(`Tem certeza que deseja excluir ${member.full_name || 'este membro'}?`)) {
                    deleteMember.mutate(member);
                  }
                }}
              />
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

function MemberRow({ member, canManage, onRoleChange, onStatusChange, onDelete }: { member: TeamMember; canManage: boolean; onRoleChange: (role: string) => void; onStatusChange: (status: string) => void; onDelete?: (member: TeamMember) => void }) {
  const { user } = useAuth();
  const isMe = member.user_id === user?.id;
  const statusInfo = STATUS_BADGES[member.status] ?? STATUS_BADGES.pending;
  const memberRoles = member.roles || [];
  const currentRole = memberRoles[0] ?? "";
  const roleLabel = ROLE_OPTIONS.find(r => r.value === currentRole)?.label ?? "Sem papel";

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm truncate">{member.full_name || "Sem nome"}</p>
          <Badge variant={statusInfo.variant} className="text-[9px] uppercase tracking-wider h-4">{statusInfo.label}</Badge>
          {member.occupation && (
            <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-4 border-primary/30 text-primary">
              {member.occupation}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {member.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1">📞 {member.phone}</p>}
          <p className="text-[11px] text-muted-foreground italic truncate max-w-[200px]">{member.user_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {(canManage || isMe) ? (
          <>
            <EditMemberDialog member={member} />
            {canManage && (
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
            )}
            {canManage && member.status === "approved" && !isMe && (
              <Button size="sm" variant="ghost" className="text-destructive text-xs h-8" onClick={() => onStatusChange("rejected")}>
                Bloquear
              </Button>
            )}
            {member.status === "rejected" && (
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => onStatusChange("approved")}>
                Reativar
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" title="Excluir" onClick={() => onDelete(member)}>
                <Trash2 className="h-4 w-4" />
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

function EditMemberDialog({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member.full_name || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [occupation, setOccupation] = useState(member.occupation || "");
  const qc = useQueryClient();

  const OCCUPATION_OPTIONS = [
    { value: "Estagiário", label: "Estagiário" },
    { value: "Administrativo", label: "Administrativo" },
    { value: "Gestor", label: "Gestor" },
    { value: "Coordenador", label: "Coordenador" },
    { value: "Sócio", label: "Sócio" },
    { value: "Corretor", label: "Corretor" }
  ];

  const updateMember = useMutation({
    mutationFn: async () => {
      if (member.status === "pending_registration") {
        const { error } = await (supabase.rpc as any)("update_authorized_email", {
          p_id: member.id,
          p_full_name: name.trim(),
          p_phone: phone.trim() || null,
          p_occupation: occupation || null,
          p_role: member.roles[0] || null
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").update({
          full_name: name.trim(),
          phone: phone.trim() || null,
          occupation: occupation || null
        } as any).eq("user_id", member.user_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Perfil atualizado com sucesso");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Email (Acesso)</Label>
            <Input
              value={member.status === "pending_registration" ? member.user_id : (member as any).auth_users?.email || member.user_id}
              disabled
              className="bg-muted/50"
            />
            <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado por questões de segurança.</p>
          </div>
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Ocupação</Label>
            <Select value={occupation} onValueChange={setOccupation}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {OCCUPATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => updateMember.mutate()} disabled={updateMember.isPending}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
