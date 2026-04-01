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
import { Plus, X, ExternalLink } from "lucide-react";
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
  const [allCities, setAllCities] = useState<{ city: string, state: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchExistingTags();
      // Fetch unique cities from city_info and clients
      Promise.all([
        supabase.from("city_info").select("city, state"),
        supabase.from("clients").select("city, state").not("city", "is", null)
      ]).then(([infoRes, clientRes]) => {
        const combined = [...(infoRes.data || []), ...(clientRes.data || [])];
        const unique = combined.reduce((acc: any[], curr) => {
          if (!acc.find(item => item.city === curr.city && item.state === curr.state)) {
            acc.push(curr);
          }
          return acc;
        }, []);
        setAllCities(unique);
      });
    }
  }, [open]);

  const fetchExistingTags = async () => {
    try {
      const { data } = await supabase.from("clients").select("tags").not("tags", "is", null);
      if (data) {
        const allTags = data.flatMap(d => (Array.isArray(d.tags) ? d.tags : []));
        const uniqueTags = [...new Set(allTags)].sort();
        setExistingTags(uniqueTags);
      }
    } catch (e) {
      console.error("Error fetching tags", e);
    }
  };

  useEffect(() => {
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
  }, [client]);

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

  const stagesForPipeline = CLIENT_STAGES.filter(s => s.pipeline === pipeline);

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

      try {
        await updateClient.mutateAsync(updateData);
        toast({ title: "Cliente atualizado!" });
        onOpenChange(false);
      } catch (err: any) {
        // Fallback for when the 'tags' column is still propagating in the DB
        if (err.message?.includes("tags") && err.message?.includes("schema cache")) {
          console.warn("Tags column not found in cache, retrying without tags field...");
          const { tags, ...dataWithoutTags } = updateData;
          await updateClient.mutateAsync(dataWithoutTags);
          toast({
            title: "Informações salvas parcialmente",
            description: "O banco de dados ainda não possui a coluna de etiquetas. Por favor, execute o código SQL de migração no painel do Supabase para habilitar esta função.",
            variant: "destructive"
          });
          onOpenChange(false);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-1 content-start text-left">
            <Label className="text-sm font-medium text-muted-foreground">Nome Lead</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="text-xl font-bold bg-blue-50/50 border-blue-100 focus-visible:ring-blue-200 px-3 h-12"
            />
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="bg-muted px-4 py-2 rounded-md mb-6">
            <span className="text-sm font-semibold text-slate-700">Dados Cliente</span>
          </div>

          <div className="grid gap-2 mb-6">
            <Label>Tags do Cliente</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag..."
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

            {existingTags.length > 0 && (
              <div className="mt-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sugestões:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {existingTags.filter(t => !tags.includes(t)).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTags([...tags, t])}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary transition-colors"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={cpf} onChange={e => setCpf(e.target.value)} />
            </div>

            <div className="col-span-full border rounded-md p-3 bg-muted/20">
              <LinkedProperties clientId={client.id} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Link do Drive</Label>
              <div className="flex gap-2">
                <Input type="url" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                {driveUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(driveUrl, '_blank')}
                    title="Acessar Drive"
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                <SelectTrigger><SelectValue placeholder="Selecione o corretor" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem
                      key={m.user_id}
                      value={m.user_id}
                      disabled={!m.is_registered}
                    >
                      {m.full_name} {!m.is_registered && "(Aguardando Registro)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado Civil</Label>
              <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Select value={city} onValueChange={setCity} disabled={!state}>
                <SelectTrigger>
                  <SelectValue placeholder={!state ? "Selecione um estado" : "Selecione a cidade"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(c => c.state === state)
                    .sort((a, b) => a.city.localeCompare(b.city))
                    .map(c => <SelectItem key={c.city} value={c.city}>{c.city}</SelectItem>)
                  }
                  {state && !allCities.some(c => c.state === state) && (
                    <div className="p-2 text-xs text-muted-foreground text-center">Nenhuma cidade cadastrada para este estado</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Pipeline</Label>
              <Select value={pipeline} onValueChange={v => {
                const p = v as ClientPipeline;
                setPipeline(p);
                const first = CLIENT_STAGES.find(s => s.pipeline === p);
                if (first) setStage(first.value);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_PIPELINES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Etapa</Label>
              <Select value={stage} onValueChange={v => setStage(v as ClientStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stagesForPipeline.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Temperatura</Label>
              <Select value={temperature} onValueChange={v => setTemperature(v as Database["public"]["Enums"]["lead_temperature"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPERATURE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Renda (R$)</Label>
              <Input type="number" value={income} onChange={e => setIncome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Regime de Trabalho</Label>
              <Select value={workRegime} onValueChange={setWorkRegime}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {WORK_REGIMES.map(w => <SelectItem key={w.value} value={w.value} className="flex justify-between">{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={hasFgts} onCheckedChange={setHasFgts} />
                <Label className="text-sm">Tem FGTS</Label>
              </div>
              {hasFgts && (
                <div className="flex items-center gap-2">
                  <Switch checked={fgtsAbove300} onCheckedChange={setFgtsAbove300} />
                  <Label className="text-sm">FGTS &gt; R$300</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={canComposeIncome} onCheckedChange={setCanComposeIncome} />
                <Label className="text-sm">Compõe renda</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hasFinancialPending} onCheckedChange={setHasFinancialPending} />
                <Label className="text-sm">Pendência financeira</Label>
              </div>
            </div>

            {hasFinancialPending && (
              <div className="col-span-full space-y-1">
                <Label>Descrição da pendência</Label>
                <Input value={financialPendingDesc} onChange={e => setFinancialPendingDesc(e.target.value)} />
              </div>
            )}

            {isLostStage && (
              <div className="col-span-full space-y-1">
                <Label>Motivo da perda *</Label>
                <Input value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Informe o motivo" />
              </div>
            )}

            <div className="col-span-full space-y-1">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateClient.isPending}>
              {updateClient.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
