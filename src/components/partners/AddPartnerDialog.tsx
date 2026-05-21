import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Trash2, Plus, ClipboardCheck, History, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCityContact,
  useUpdateCityContact,
  useUpsertCityInfo,
  type CityContact
} from "@/hooks/useCityInfo";
import { CONTACT_ROLES } from "@/lib/partner-constants";
import ServedCitiesSelector from "@/components/partners/ServedCitiesSelector";
import { usePreAuctionProperties } from "@/hooks/usePreAuction";
import { PreAuctionDialog } from "@/components/pre-auction/PreAuctionDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProperties } from "@/hooks/useProperties";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContact?: CityContact | null;
  onSaved?: (contactId: string) => void;
  defaultType?: string;
  defaultCity?: { state: string, city: string };
}

export default function AddPartnerDialog({ 
  open, 
  onOpenChange, 
  editingContact, 
  onSaved,
  defaultType,
  defaultCity
}: Props) {
  const { data: properties = [] } = useProperties();

  // Using initial state based on editingContact. 
  // Since we use a 'key' in the parent, this will correctly reset on every partner selection.
  const [selectedServedCities, setSelectedServedCities] = useState<{ state: string, city: string }[]>(() => 
    editingContact?.served_cities?.map(sc => ({ state: sc.city_info.state, city: sc.city_info.city })) || 
    (defaultCity ? [defaultCity] : [])
  );

  const [newContact, setNewContact] = useState(() => ({
    contact_type: editingContact?.contact_type || defaultType || CONTACT_ROLES[0],
    name: editingContact?.name || "",
    phone: editingContact?.phone || "",
    notes: editingContact?.notes || "",
    has_served: editingContact?.has_served || false,
    pix_key: editingContact?.pix_key || "",
    diligence_history: editingContact?.diligence_history || "",
    payment_date: editingContact?.payment_date || "",
    monthly_value: editingContact?.monthly_value || "" as any,
    property_id: editingContact?.property_id || "",
    is_recurring: editingContact?.is_recurring || false
  }));

  // Fail-safe: ensure state updates if editingContact changes while open
  useEffect(() => {
    if (editingContact) {
      setNewContact({
        contact_type: editingContact.contact_type || CONTACT_ROLES[0],
        name: editingContact.name || "",
        phone: editingContact.phone || "",
        notes: editingContact.notes || "",
        has_served: editingContact.has_served || false,
        pix_key: editingContact.pix_key || "",
        diligence_history: editingContact.diligence_history || "",
        payment_date: editingContact.payment_date || "",
        monthly_value: editingContact.monthly_value || "" as any,
        property_id: editingContact.property_id || "",
        is_recurring: editingContact.is_recurring || false
      });
      setSelectedServedCities(
        editingContact.served_cities?.map(sc => ({ state: sc.city_info.state, city: sc.city_info.city })) || []
      );
    }
  }, [editingContact]);

  const [selectedDiligence, setSelectedDiligence] = useState<any>(null);
  const [isDiligenceDialogOpen, setIsDiligenceDialogOpen] = useState(false);

  const { data: services = [] } = usePreAuctionProperties(undefined, editingContact?.id);

  const createContact = useCreateCityContact();
  const updateContact = useUpdateCityContact();
  const upsertCity = useUpsertCityInfo();

  const handleSaveContact = async () => {
    if (!newContact.name || selectedServedCities.length === 0) {
      toast.error("Preencha ao menos o nome e selecione uma cidade.");
      return;
    }

    if (newContact.contact_type === 'VIZINHO') {
      if (!newContact.payment_date || !newContact.monthly_value || !newContact.property_id) {
        toast.error("Para Vizinhos, preencha a data de pagamento, valor mensal e o imóvel que ele cuida.");
        return;
      }
    }

    const toastId = toast.loading(editingContact ? "Atualizando parceiro..." : "Criando parceiro...");
    try {
      const cityInfoIds: string[] = [];
      for (const cityData of selectedServedCities) {
        const res = await upsertCity.mutateAsync(cityData);
        cityInfoIds.push(res.id);
      }

      let finalId = "";
      if (editingContact) {
        await updateContact.mutateAsync({
          id: editingContact.id,
          city_info_id: cityInfoIds[0],
          contact_type: newContact.contact_type,
          name: newContact.name,
          phone: newContact.phone,
          notes: newContact.notes,
          has_served: newContact.has_served,
          pix_key: newContact.pix_key,
          diligence_history: newContact.diligence_history,
          served_city_ids: cityInfoIds,
          payment_date: newContact.contact_type === 'VIZINHO' ? newContact.payment_date || null : null,
          monthly_value: newContact.contact_type === 'VIZINHO' ? (newContact.monthly_value ? Number(newContact.monthly_value) : null) : null,
          property_id: newContact.contact_type === 'VIZINHO' ? newContact.property_id || null : null,
          is_recurring: newContact.contact_type === 'VIZINHO' ? newContact.is_recurring : false
        });
        finalId = editingContact.id;
      } else {
        const res = await createContact.mutateAsync({
          city_info_id: cityInfoIds[0], 
          contact_type: newContact.contact_type,
          name: newContact.name,
          phone: newContact.phone,
          email: "",
          notes: newContact.notes,
          has_served: newContact.has_served,
          pix_key: newContact.pix_key,
          diligence_history: newContact.diligence_history,
          served_city_ids: cityInfoIds,
          payment_date: newContact.contact_type === 'VIZINHO' ? newContact.payment_date || null : null,
          monthly_value: newContact.contact_type === 'VIZINHO' ? (newContact.monthly_value ? Number(newContact.monthly_value) : null) : null,
          property_id: newContact.contact_type === 'VIZINHO' ? newContact.property_id || null : null,
          is_recurring: newContact.contact_type === 'VIZINHO' ? newContact.is_recurring : false
        });
        finalId = res.id;
      }

      toast.success(editingContact ? "Parceiro atualizado!" : "Parceiro criado!", { id: toastId });
      onOpenChange(false);
      if (onSaved) onSaved(finalId);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar parceiro", { id: toastId });
    }
  };

  const handleOpenDiligence = (diligence: any) => {
      setSelectedDiligence(diligence);
      setIsDiligenceDialogOpen(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl focus:outline-none">
        <div className="bg-primary p-6 text-white shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            {editingContact ? "EDITAR PARCEIRO" : "CADASTRAR NOVO PARCEIRO"}
          </DialogTitle>
          <p className="text-primary-foreground/80 font-medium text-sm">
            {editingContact ? `Atualize os dados de ${editingContact.name}` : "Vincule diligentes às cidades que eles atendem"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
          <div className="space-y-8 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-primary tracking-widest border-b pb-1">Dados Básicos</h3>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-muted-foreground">Nome Completo *</Label>
                  <Input
                    placeholder="Ex: João da Silva"
                    className="h-11 border-2 focus-visible:ring-primary font-bold"
                    value={newContact.name}
                    onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-muted-foreground">Função / Cargo *</Label>
                  <Select value={newContact.contact_type} onValueChange={(val) => setNewContact({ ...newContact, contact_type: val })}>
                    <SelectTrigger className="h-11 border-2 font-bold focus:ring-primary">
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {CONTACT_ROLES.map(role => <SelectItem key={role} value={role} className="font-bold">{role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground">Celular / WhatsApp</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      className="h-11 border-2 font-bold"
                      value={newContact.phone}
                      onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground">Chave PIX</Label>
                    <Input
                      placeholder="PIX"
                      className="h-11 border-2 font-bold"
                      value={newContact.pix_key}
                      onChange={e => setNewContact({ ...newContact, pix_key: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-muted-foreground">Notas e Observações</Label>
                  <Input
                    placeholder="Detalhes sobre atendimento, preços, etc."
                    className="h-11 border-2 font-semibold"
                    value={newContact.notes}
                    onChange={e => setNewContact({ ...newContact, notes: e.target.value })}
                  />
                </div>

                {newContact.contact_type === 'VIZINHO' && (
                  <div className="space-y-4 border-2 border-primary/20 bg-primary/5 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <h4 className="text-xs font-black uppercase text-primary tracking-wider">Configurações de Vizinho</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-muted-foreground">Data do Pagamento *</Label>
                        <Input
                          type="date"
                          className="h-11 border-2 font-bold"
                          value={newContact.payment_date}
                          onChange={e => setNewContact({ ...newContact, payment_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-muted-foreground">Valor Mensal (R$) *</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="h-11 border-2 font-bold"
                          value={newContact.monthly_value}
                          onChange={e => setNewContact({ ...newContact, monthly_value: e.target.value ? parseFloat(e.target.value) : "" as any })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase text-muted-foreground">Imóvel sob Cuidado *</Label>
                      <Select 
                        value={newContact.property_id || "none"} 
                        onValueChange={(val) => setNewContact({ ...newContact, property_id: val === "none" ? "" : val })}
                      >
                        <SelectTrigger className="h-11 border-2 font-bold focus:ring-primary">
                          <SelectValue placeholder="Selecione o imóvel..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="none" className="font-bold">Nenhum</SelectItem>
                          {properties.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold">
                              {p.code} — {p.city || "Sem cidade"}/{p.state || "Sem estado"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/10 bg-background">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-black uppercase text-primary">Agendar Recorrência?</Label>
                        <p className="text-[9px] text-muted-foreground font-semibold">Cria 12 lembretes mensais na agenda</p>
                      </div>
                      <Switch 
                        checked={newContact.is_recurring} 
                        onCheckedChange={(val) => setNewContact({ ...newContact, is_recurring: val })} 
                      />
                    </div>

                    {editingContact?.is_recurring && newContact.is_recurring && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-full text-[10px] font-black uppercase tracking-tight py-2 h-9"
                        onClick={() => {
                          setNewContact({ ...newContact, is_recurring: false });
                          toast.success("Recorrência desativada! Salve o formulário para limpar todos os lembretes futuros.");
                        }}
                      >
                        Cancelar Recorrência de Lembretes
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="font-black text-xs uppercase text-primary">Já prestou serviço?</Label>
                    <p className="text-[10px] text-muted-foreground font-bold">Marque se já houve parceria ativa</p>
                  </div>
                  <Switch checked={newContact.has_served} onCheckedChange={(val) => setNewContact({ ...newContact, has_served: val })} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-primary tracking-widest border-b pb-1">Atendimento</h3>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    CIDADES DE ATENDIMENTO *
                  </Label>
                  <ServedCitiesSelector
                    selectedCities={selectedServedCities}
                    onSelect={setSelectedServedCities}
                  />
                </div>
              </div>
            </div>

              <div className="space-y-4 pt-6 border-t animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico de Serviços / Diligências
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] font-black uppercase tracking-tighter gap-1 border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => {
                                setSelectedDiligence(null);
                                setIsDiligenceDialogOpen(true);
                            }}
                        >
                            <Plus className="h-3 w-3" /> Adicionar Manual
                        </Button>
                        <Badge variant="secondary" className="font-black">{services.length} SERVIÇOS</Badge>
                    </div>
                </div>
                
                {services.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma diligência registrada ainda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {services.map((service) => (
                            <div 
                                key={service.id}
                                className="group flex items-center justify-between p-4 rounded-xl border-2 bg-background hover:border-primary hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleOpenDiligence(service)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">
                                            {service.created_at ? format(new Date(service.created_at), "dd/MM/yyyy", { locale: ptBR }) : 'SEM DATA'}
                                        </p>
                                        <h4 className="font-black text-sm text-foreground uppercase tracking-tight">
                                            {service.code} — {service.city}/{service.state}
                                        </h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver Detalhes
                                    <ExternalLink className="h-3 w-3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 flex flex-col sm:flex-row sm:justify-end">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-8 font-black uppercase tracking-tight"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveContact}
              disabled={createContact.isPending || updateContact.isPending}
              className="h-12 px-10 font-black uppercase tracking-tight shadow-lg"
            >
              {(createContact.isPending || updateContact.isPending) ? "SALVANDO..." : "SALVAR PARCEIRO"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {isDiligenceDialogOpen && (
        <PreAuctionDialog
            open={isDiligenceDialogOpen}
            onOpenChange={setIsDiligenceDialogOpen}
            property={selectedDiligence}
            initialDiligenteId={editingContact?.id}
        />
    )}
    </>
  );
}

function Badge({ children, variant = "default", className = "" }: any) {
    const variants: any = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
