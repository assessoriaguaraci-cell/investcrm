import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUpdateClient, type Client } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES, formatCurrency } from "@/lib/property-constants";
import { supabase } from "@/integrations/supabase/client";
import LinkedProperties from "./LinkedProperties";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ExternalLink, ClipboardList, CheckCircle2 } from "lucide-react";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];

interface Props {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditClientDialog({ client, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const updateClient = useUpdateClient();
  const { stages } = useKanbanStages("client" as any);

  // Find current stage and checklist
  const currentStage = stages.find(s => s.value === client.stage && s.pipeline === client.pipeline);
  const checklist = currentStage?.checklist || [];

  const [pipeline, setPipeline] = useState<ClientPipeline>(client.pipeline);
  const [stage, setStage] = useState<ClientStage>(client.stage);
  const [fullName, setFullName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(client.whatsapp ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [cpf, setCpf] = useState(client.cpf ?? "");
  const [state, setState] = useState(client.state ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [temperature, setTemperature] = useState(client.temperature);
  const [income, setIncome] = useState(client.income?.toString() ?? "");
  const [workRegime, setWorkRegime] = useState(client.work_regime ?? "");
  const [maritalStatus, setMaritalStatus] = useState(client.marital_status ?? "");
  const [hasFgts, setHasFgts] = useState(client.has_fgts ?? false);
  const [fgtsAbove300, setFgtsAbove300] = useState(client.fgts_above_300 ?? false);
  const [hasFinancialPending, setHasFinancialPending] = useState(client.has_financial_pending ?? false);
  const [financialPendingDesc, setFinancialPendingDesc] = useState(client.financial_pending_description ?? "");
  const [canComposeIncome, setCanComposeIncome] = useState(client.can_compose_income ?? false);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [driveUrl, setDriveUrl] = useState((client as any).drive_url ?? "");
  const [lostReason, setLostReason] = useState(client.lost_reason ?? "");
  const [tags, setTags] = useState<string[]>(() => {
    const raw = (client as any).tags;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.includes('{')) {
      return raw.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  });
  const [newTagInput, setNewTagInput] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState(client.responsible_user_id ?? "");

  const { data: members = [] } = useApprovedMembers();

  useEffect(() => {
    if (open) {
      setPipeline(client.pipeline);
      setStage(client.stage);
      setFullName(client.full_name);
      setPhone(client.phone ?? "");
      setWhatsapp(client.whatsapp ?? "");
      setEmail(client.email ?? "");
      setCpf(client.cpf ?? "");
      setState(client.state ?? "");
      setCity(client.city ?? "");
      setTemperature(client.temperature);
      setIncome(client.income?.toString() ?? "");
      setWorkRegime(client.work_regime ?? "");
      setMaritalStatus(client.marital_status ?? "");
      setHasFgts(client.has_fgts ?? false);
      setFgtsAbove300(client.fgts_above_300 ?? false);
      setHasFinancialPending(client.has_financial_pending ?? false);
      setFinancialPendingDesc(client.financial_pending_description ?? "");
      setCanComposeIncome(client.can_compose_income ?? false);
      setNotes(client.notes ?? "");
      setDriveUrl((client as any).drive_url ?? "");
      setLostReason(client.lost_reason ?? "");
      const raw = (client as any).tags;
      let initialTags: string[] = [];
      if (Array.isArray(raw)) initialTags = raw;
      else if (typeof raw === 'string' && raw.includes('{')) {
        initialTags = raw.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
      }
      setTags(initialTags);
      setResponsibleUserId(client.responsible_user_id ?? "");
    }
  }, [client, open]);

  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setNewTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const isLostStage = stage === "venda_cancelada" || stage === "credito_reprovado" || stage === "credito_reprovado_pipe";

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (isLostStage && !lostReason.trim()) {
      toast({ title: "Motivo da perda é obrigatório", variant: "destructive" });
      return;
    }
    try {
      const updateData: any = {
        id: client.id,
        full_name: fullName.trim(),
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        cpf: cpf || null,
        state: state || null,
        city: city || null,
        pipeline,
        stage,
        temperature,
        income: income ? parseFloat(income) : null,
        work_regime: workRegime || null,
        marital_status: maritalStatus || null,
        has_fgts: hasFgts,
        fgts_above_300: fgtsAbove300,
        has_financial_pending: hasFinancialPending,
        financial_pending_description: financialPendingDesc,
        can_compose_income: canComposeIncome,
        notes: notes || null,
        drive_url: driveUrl || null,
        lost_reason: lostReason || null,
        responsible_user_id: responsibleUserId || null,
        tags: tags
      };

      await updateClient.mutateAsync(updateData);
      toast({ title: "Cliente atualizado!" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Lead: {fullName}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Edição de informações e acompanhamento de jornada
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
            {/* Checklist da Etapa */}
            {checklist.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 mb-8">
                <div className="flex items-center gap-2 text-primary">
                  <ClipboardList className="h-4 w-4" />
                  <h4 className="text-xs font-black uppercase tracking-widest">Checklist da Etapa: {currentStage?.label}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-primary/10">
                      <div className="h-4 w-4 rounded border border-primary/30 flex items-center justify-center bg-background">
                        <CheckCircle2 className="h-3 w-3 text-primary opacity-20" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground/80 uppercase">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="info" className="font-black uppercase text-[10px]">Informações</TabsTrigger>
                <TabsTrigger value="properties" className="font-black uppercase text-[10px]">Imóveis Vinculados</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} className="font-bold uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WhatsApp</Label>
                        <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                      <Input value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CPF</Label>
                      <Input value={cpf} onChange={e => setCpf(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</Label>
                        <Select onValueChange={setState} value={state}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cidade</Label>
                        <Input value={city} onChange={e => setCity(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temperatura</Label>
                        <Select value={temperature} onValueChange={v => setTemperature(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMPERATURE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Renda Mensal (R$)</Label>
                        <Input type="number" value={income} onChange={e => setIncome(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Regime de Trabalho</Label>
                        <Select value={workRegime} onValueChange={setWorkRegime}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WORK_REGIMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado Civil</Label>
                        <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MARITAL_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={hasFgts} onCheckedChange={setHasFgts} />
                        <Label className="text-[10px] font-black uppercase">Possui FGTS</Label>
                      </div>
                          {hasFgts && (
                            <div className="flex items-center gap-2 pl-8">
                              <Switch checked={fgtsAbove300} onCheckedChange={setFgtsAbove300} />
                              <Label className="text-[10px] font-black uppercase opacity-70">FGTS &gt; 3 Anos</Label>
                            </div>
                          )}
                      <div className="flex items-center gap-2">
                        <Switch checked={canComposeIncome} onCheckedChange={setCanComposeIncome} />
                        <Label className="text-[10px] font-black uppercase">Compõe Renda</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={hasFinancialPending} onCheckedChange={setHasFinancialPending} />
                        <Label className="text-[10px] font-black uppercase">Pendência Financeira</Label>
                      </div>
                    </div>

                    {hasFinancialPending && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição da Pendência</Label>
                        <Textarea value={financialPendingDesc} onChange={e => setFinancialPendingDesc(e.target.value)} rows={2} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Etiquetas</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar etiqueta..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" size="icon" variant="outline" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(t => (
                        <Badge key={t} variant="secondary" className="gap-1 pl-2 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-100">
                          {t}
                          <button onClick={() => removeTag(t)} className="hover:bg-blue-200 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observações Gerais</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Link do Drive</Label>
                      <div className="flex gap-2">
                        <Input value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                        {driveUrl && (
                          <Button variant="outline" size="icon" asChild>
                            <a href={driveUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsável</Label>
                      <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isLostStage && (
                    <div className="space-y-1 pt-4 border-t border-red-100">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-red-600">Motivo da Perda *</Label>
                      <Input value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Informe o motivo" className="border-red-200 focus-visible:ring-red-200" />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="properties">
                <LinkedProperties clientId={client.id} />
              </TabsContent>
            </Tabs>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-black uppercase tracking-tight">Cancelar</Button>
          <Button onClick={handleSave} disabled={updateClient.isPending} className="font-black uppercase tracking-tight shadow-lg">
            {updateClient.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
