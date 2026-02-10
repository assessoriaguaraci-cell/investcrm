import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpdateClient, type Client } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES } from "@/lib/property-constants";
import type { Database } from "@/integrations/supabase/types";

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
  const [lostReason, setLostReason] = useState(client.lost_reason ?? "");

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
    setLostReason(client.lost_reason ?? "");
  }, [client]);

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
      await updateClient.mutateAsync({
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
        income: income ? Number(income) : null,
        work_regime: workRegime ? (workRegime as Database["public"]["Enums"]["work_regime"]) : null,
        marital_status: maritalStatus || null,
        has_fgts: hasFgts,
        fgts_above_300: fgtsAbove300,
        has_financial_pending: hasFinancialPending,
        financial_pending_description: financialPendingDesc || null,
        can_compose_income: canComposeIncome,
        notes: notes || null,
        lost_reason: isLostStage ? lostReason : null,
      });
      toast({ title: "Cliente atualizado!" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>{client.full_name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <Input value={cpf} onChange={e => setCpf(e.target.value)} />
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
            <Input value={city} onChange={e => setCity(e.target.value)} />
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
                {WORK_REGIMES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
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

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateClient.isPending}>
            {updateClient.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
