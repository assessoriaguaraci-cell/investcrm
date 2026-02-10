import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateClient } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES } from "@/lib/property-constants";
import type { Database } from "@/integrations/supabase/types";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];

export default function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createClient = useCreateClient();

  const [pipeline, setPipeline] = useState<ClientPipeline>("inicial");
  const [stage, setStage] = useState<ClientStage>("chegada_lead");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [temperature, setTemperature] = useState<Database["public"]["Enums"]["lead_temperature"]>("frio");
  const [income, setIncome] = useState("");
  const [workRegime, setWorkRegime] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasFgts, setHasFgts] = useState(false);
  const [fgtsAbove300, setFgtsAbove300] = useState(false);
  const [hasFinancialPending, setHasFinancialPending] = useState(false);
  const [financialPendingDesc, setFinancialPendingDesc] = useState("");
  const [canComposeIncome, setCanComposeIncome] = useState(false);
  const [notes, setNotes] = useState("");

  const stagesForPipeline = CLIENT_STAGES.filter(s => s.pipeline === pipeline);

  const reset = () => {
    setPipeline("inicial");
    setStage("chegada_lead");
    setFullName("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setCpf("");
    setState("");
    setCity("");
    setTemperature("frio");
    setIncome("");
    setWorkRegime("");
    setMaritalStatus("");
    setHasFgts(false);
    setFgtsAbove300(false);
    setHasFinancialPending(false);
    setFinancialPendingDesc("");
    setCanComposeIncome(false);
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    try {
      await createClient.mutateAsync({
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
      });
      toast({ title: "Cliente cadastrado!" });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Preencha os dados do cliente</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Dados básicos */}
          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
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

          {/* Localização */}
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
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" />
          </div>

          {/* Pipeline e Etapa */}
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

          {/* Temperatura e Renda */}
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
            <Input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="0" />
          </div>

          {/* Regime de Trabalho */}
          <div className="space-y-1">
            <Label>Regime de Trabalho</Label>
            <Select value={workRegime} onValueChange={setWorkRegime}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {WORK_REGIMES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Toggles */}
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
              <Input value={financialPendingDesc} onChange={e => setFinancialPendingDesc(e.target.value)} placeholder="Descreva a pendência" />
            </div>
          )}

          <div className="col-span-full space-y-1">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre o cliente" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createClient.isPending}>
            {createClient.isPending ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
