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
import { useUpdateClient, useDeleteClient, type Client } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES, formatCurrency } from "@/lib/property-constants";
import { supabase } from "@/integrations/supabase/client";
import LinkedProperties from "./LinkedProperties";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ExternalLink, ClipboardList, CheckCircle2, Trash2, MessageSquare } from "lucide-react";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { useClientTags, useCreateClientTag, getTagBgColor } from "@/hooks/useClientTags";
import TagManagerDialog from "./TagManagerDialog";

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
  const [cancellationReason, setCancellationReason] = useState(client.cancellation_reason ?? "");
  
  const { data: dbTags = [] } = useClientTags();
  const createTag = useCreateClientTag();

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
      setCancellationReason(client.cancellation_reason ?? "");
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

  const handleAddTag = async (tagText?: string) => {
    const val = (tagText || newTagInput).trim();
    if (!val) return;
    
    const tagUpper = val.toUpperCase();
    if (!tags.includes(tagUpper)) {
      setTags([...tags, tagUpper]);
    }
    setNewTagInput("");

    // Auto save globally if not exists
    const exists = dbTags.some(t => t.name.toLowerCase() === tagUpper.toLowerCase());
    if (!exists) {
      try {
        await createTag.mutateAsync({ name: tagUpper, color: "blue" });
      } catch (err) {
        console.error("Failed to save tag globally:", err);
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const isLostStage = stage === "venda_cancelada" || stage === "credito_reprovado" || stage === "credito_reprovado_pipe";
  const isCancellationStage = stage === "desistencia";

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (isCancellationStage && !cancellationReason.trim()) {
      toast({ title: "Motivo da desistência é obrigatório", variant: "destructive" });
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
        cancellation_reason: isCancellationStage ? cancellationReason || null : null,
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

  const deleteMutation = useDeleteClient();

  const handleDelete = () => {
    if (window.confirm("ATENÇÃO: Tem certeza que deseja excluir este cliente? Esta ação é permanente e não pode ser desfeita.")) {
      deleteMutation.mutate(client.id, {
        onSuccess: () => {
          toast({ title: "Cliente excluído com sucesso!" });
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Lead: {fullName}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" 
              onClick={handleDelete} 
              title="Excluir Cliente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Edição de informações e acompanhamento de jornada
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="info" className="font-black uppercase text-[10px]">Informações</TabsTrigger>
                <TabsTrigger value="checklist" className="font-black uppercase text-[10px]">Checklist</TabsTrigger>
                <TabsTrigger value="properties" className="font-black uppercase text-[10px]">Imóveis Vinculados</TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="mt-0">
                {checklist.length > 0 ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-3">
                      <ClipboardList className="h-5 w-5" />
                      <h4 className="text-sm font-black uppercase tracking-widest">Checklist da Etapa: {currentStage?.label}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {checklist.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                          <div className="h-5 w-5 rounded border border-primary/30 flex items-center justify-center bg-background shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary opacity-20" />
                          </div>
                          <span className="text-[11px] font-bold text-foreground/80 uppercase leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Nenhuma tarefa configurada para esta etapa.</p>
                  </div>
                )}
              </TabsContent>

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

                    {/* Botão de Link Direto BotConversa */}
                    {(() => {
                        const targetPhone = whatsapp || phone;
                        const cleanPhone = targetPhone ? targetPhone.replace(/\D/g, '') : null;
                        const bcIdMatch = notes?.match(/BC_ID:\s*(\d+)/);
                        const bcId = bcIdMatch ? bcIdMatch[1] : null;

                        if (cleanPhone) {
                            const bcLink = bcId 
                                ? `https://app.botconversa.com.br/201807/inbox?tab=all&status=all&chat_id=${bcId}`
                                : `https://app.botconversa.com.br/201807/inbox?tab=all&status=all&search=${cleanPhone}`;

                            return (
                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-600 p-2 rounded-lg">
                                            <MessageSquare className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-blue-700 leading-none">Chat BotConversa</p>
                                            <p className="text-[11px] font-bold text-blue-600/70">Abrir conversa deste cliente</p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white font-black uppercase text-[10px] h-8 px-4"
                                        onClick={() => window.open(bcLink, '_blank')}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                        Abrir Chat
                                    </Button>
                                </div>
                            );
                        }
                        return null;
                    })()}

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
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {MARITAL_STATUSES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Possui FGTS</Label>
                        <Select value={hasFgts ? "true" : "false"} onValueChange={v => setHasFgts(v === "true")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">FGTS &gt; 3 Anos</Label>
                        <Select value={fgtsAbove300 ? "true" : "false"} onValueChange={v => setFgtsAbove300(v === "true")} disabled={!hasFgts}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compõe Renda</Label>
                        <Select value={canComposeIncome ? "true" : "false"} onValueChange={v => setCanComposeIncome(v === "true")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendência Financeira</Label>
                        <Select value={hasFinancialPending ? "true" : "false"} onValueChange={v => setHasFinancialPending(v === "true")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Etiquetas</Label>
                      <TagManagerDialog />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar etiqueta..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" size="icon" variant="outline" onClick={() => handleAddTag()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tag autocomplete suggestions */}
                    {newTagInput.trim() && (
                      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-100 rounded-lg mt-1 max-h-24 overflow-y-auto">
                        <span className="text-[9px] font-black uppercase text-slate-400 w-full block mb-1">Sugestões de etiquetas:</span>
                        {dbTags
                          .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()) && !tags.includes(t.name.toUpperCase()))
                          .map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleAddTag(t.name)}
                              className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded border transition-colors ${getTagBgColor(t.color)}`}
                            >
                              + {t.name}
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Frequent tags suggestions */}
                    {dbTags.length > 0 && !newTagInput.trim() && (
                      <div className="flex flex-wrap gap-1 pt-1.5 max-h-24 overflow-y-auto">
                        <span className="text-[9px] font-black uppercase text-slate-400 w-full block mb-0.5">Etiquetas frequentes:</span>
                        {dbTags
                          .filter(t => !tags.includes(t.name.toUpperCase()))
                          .slice(0, 8)
                          .map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleAddTag(t.name)}
                              className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded border transition-colors ${getTagBgColor(t.color)}`}
                            >
                              + {t.name}
                            </button>
                          ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(t => {
                        const dbTag = dbTags.find(dt => dt.name.toLowerCase() === t.toLowerCase());
                        const colorClass = getTagBgColor(dbTag?.color);
                        return (
                          <Badge key={t} variant="outline" className={`gap-1 pl-2 pr-1 py-1 font-black uppercase rounded border ${colorClass}`}>
                            {t}
                            <button onClick={() => removeTag(t)} className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
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

                  {isCancellationStage && (
                    <div className="space-y-1 pt-4 border-t border-red-100">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-red-600">Motivo da Desistência *</Label>
                      <Select value={cancellationReason} onValueChange={setCancellationReason}>
                        <SelectTrigger className="border-red-200 focus-visible:ring-red-200 font-bold uppercase">
                          <SelectValue placeholder="Selecione o motivo da desistência..." />
                        </SelectTrigger>
                        <SelectContent className="font-bold uppercase text-[11px]">
                          <SelectItem value="cliente nao respondeu">Cliente não respondeu</SelectItem>
                          <SelectItem value="comprou em outro lugar">Comprou em outro lugar</SelectItem>
                          <SelectItem value="localização não agradou">Localização não agradou</SelectItem>
                          <SelectItem value="não possui renda">Não possui renda</SelectItem>
                        </SelectContent>
                      </Select>
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
