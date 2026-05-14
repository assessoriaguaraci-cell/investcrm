import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useClientPropertyLinks, useCreateLink } from "@/hooks/useClientPropertyLinks";
import { useProperties } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES, formatCurrency } from "@/lib/property-constants";
import type { Database } from "@/integrations/supabase/types";
import { Search, X, Building2, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

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
  const [driveUrl, setDriveUrl] = useState("");
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);
  const [propSearch, setPropSearch] = useState("");
  const [showPropSearch, setShowPropSearch] = useState(false);
  const [responsibleUserId, setResponsibleUserId] = useState<string>("");

  const { user } = useAuth();
  const { data: members = [] } = useApprovedMembers();
  const [allCities, setAllCities] = useState<{ city: string, state: string }[]>([]);

  useEffect(() => {
    if (open) {
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

  useEffect(() => {
    if (open && user && !responsibleUserId) {
      setResponsibleUserId(user.id);
    }
  }, [open, user, responsibleUserId]);

  const { data: allProperties = [] } = useProperties();
  const createLink = useCreateLink();

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
    setDriveUrl("");
    setSelectedPropIds([]);
    setPropSearch("");
    setShowPropSearch(false);
    setResponsibleUserId("");
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    try {
      const newClient = await createClient.mutateAsync({
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
        drive_url: driveUrl || null,
        responsible_user_id: responsibleUserId || null,
      } as any);

      // Link properties
      if (selectedPropIds.length > 0) {
        for (const pid of selectedPropIds) {
          await createLink.mutateAsync({
            client_id: (newClient as any).id,
            property_id: pid,
          });
        }
      }

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
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-tight shadow-lg border-b-2 border-primary-foreground/20">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl focus:outline-none">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20 text-left">
          <div className="space-y-1">
            <Label className="text-xs font-black uppercase text-muted-foreground">Cadastrar Novo Lead</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="NOME COMPLETO"
              className="text-2xl font-black bg-transparent border-none shadow-none focus-visible:ring-0 px-0 h-auto uppercase tracking-tighter"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">

        <div className="mt-4">
          <div className="bg-muted px-4 py-2 rounded-md mb-6">
            <span className="text-sm font-semibold text-slate-700">Dados Cliente</span>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-2">
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>

            <div className="col-span-full border rounded-md p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Imóveis Vinculados</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowPropSearch(!showPropSearch)}>
                  <Building2 className="h-3.5 w-3.5" /> Vincular
                </Button>
              </div>

              {showPropSearch && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código ou cidade..."
                      value={propSearch}
                      onChange={e => setPropSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>
                  {propSearch.trim() && (
                    <ScrollArea className="max-h-32 border rounded-md bg-background">
                      {allProperties
                        .filter(p => !selectedPropIds.includes(p.id))
                        .filter(p => p.code.toLowerCase().includes(propSearch.toLowerCase()) || (p.city && p.city.toLowerCase().includes(propSearch.toLowerCase())))
                        .slice(0, 8)
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedPropIds([...selectedPropIds, p.id]);
                              setPropSearch("");
                              
                              // Lead Routing: Auto-assign responsible agent based on property
                              if (p.responsible_user_id && p.responsible_user_id !== responsibleUserId) {
                                setResponsibleUserId(p.responsible_user_id);
                                toast({ 
                                  title: "Roleta Inteligente", 
                                  description: "Responsável atualizado para o corretor dono deste imóvel." 
                                });
                              }
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between"
                          >
                            <span className="font-mono font-medium">{p.code}</span>
                            <span className="text-muted-foreground ml-2">
                              {[p.city, p.state].filter(Boolean).join("/")} {p.purchase_price ? `• ${formatCurrency(p.purchase_price)}` : ""}
                            </span>
                          </button>
                        ))}
                    </ScrollArea>
                  )}
                </div>
              )}

              {selectedPropIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPropIds.map(id => {
                    const p = allProperties.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1.5 py-1 px-2.5 text-[11px]">
                        {p.code}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => setSelectedPropIds(selectedPropIds.filter(x => x !== id))}
                        />
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center py-1">Nenhum imóvel vinculado</p>
              )}
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
                  {stagesForPipeline
                    .filter(s => s.value && s.value.trim() !== "")
                    .map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Possui FGTS</Label>
                <Select value={hasFgts ? "true" : "false"} onValueChange={v => setHasFgts(v === "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>FGTS &gt; 3 Anos</Label>
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
                <Label>Compõe Renda</Label>
                <Select value={canComposeIncome ? "true" : "false"} onValueChange={v => setCanComposeIncome(v === "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pendência Financeira</Label>
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

          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-black uppercase tracking-tight">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createClient.isPending} className="font-black uppercase tracking-tight shadow-lg">
            {createClient.isPending ? "Salvando..." : "Cadastrar Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
