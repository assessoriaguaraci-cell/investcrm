import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCityContact,
  useUpdateCityContact,
  useUpsertCityInfo,
  type CityContact
} from "@/hooks/useCityInfo";
import { CONTACT_ROLES } from "@/lib/partner-constants";
import ServedCitiesSelector from "@/components/partners/ServedCitiesSelector";

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
  const [selectedServedCities, setSelectedServedCities] = useState<{ state: string, city: string }[]>(
    editingContact?.served_cities?.map(sc => ({ state: sc.city_info.state, city: sc.city_info.city })) || 
    (defaultCity ? [defaultCity] : [])
  );
  
  const [newContact, setNewContact] = useState({
    contact_type: editingContact?.contact_type || defaultType || CONTACT_ROLES[0],
    name: editingContact?.name || "",
    phone: editingContact?.phone || "",
    notes: editingContact?.notes || "",
    has_served: editingContact?.has_served || false,
    pix_key: editingContact?.pix_key || ""
  });

  const createContact = useCreateCityContact();
  const updateContact = useUpdateCityContact();
  const upsertCity = useUpsertCityInfo();

  const handleSaveContact = async () => {
    if (!newContact.name || selectedServedCities.length === 0) {
      toast.error("Preencha ao menos o nome e selecione uma cidade.");
      return;
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
          served_city_ids: cityInfoIds
        });
        finalId = editingContact.id;
      } else {
        const res = await createContact.mutateAsync({
          city_info_id: cityInfoIds[0], // Main city
          contact_type: newContact.contact_type,
          name: newContact.name,
          phone: newContact.phone,
          email: "",
          notes: newContact.notes,
          has_served: newContact.has_served,
          pix_key: newContact.pix_key,
          served_city_ids: cityInfoIds
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-6 text-white shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight uppercase">
            {editingContact ? "EDITAR PARCEIRO" : "CADASTRAR NOVO PARCEIRO"}
          </DialogTitle>
          <p className="text-primary-foreground/80 font-medium text-sm">
            {editingContact ? `Atualize os dados de ${editingContact.name}` : "Vincule diligentes às cidades que eles atendem"}
          </p>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-primary">Nome Completo *</Label>
                  <Input
                    placeholder="Ex: João da Silva"
                    className="h-11 border-2 focus-visible:ring-primary font-bold"
                    value={newContact.name}
                    onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-primary">Função / Cargo *</Label>
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
                    <Label className="text-[11px] font-black uppercase text-primary">Celular / WhatsApp</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      className="h-11 border-2 font-bold"
                      value={newContact.phone}
                      onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-primary">Chave PIX</Label>
                    <Input
                      placeholder="PIX"
                      className="h-11 border-2 font-bold"
                      value={newContact.pix_key}
                      onChange={e => setNewContact({ ...newContact, pix_key: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-primary">Notas e Observações</Label>
                  <Input
                    placeholder="Detalhes sobre atendimento, preços, etc."
                    className="h-11 border-2 font-semibold"
                    value={newContact.notes}
                    onChange={e => setNewContact({ ...newContact, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="font-black text-xs uppercase text-primary">Já prestou serviço?</Label>
                    <p className="text-[10px] text-muted-foreground font-bold">Marque se já houve parceria ativa</p>
                  </div>
                  <Switch checked={newContact.has_served} onCheckedChange={(val) => setNewContact({ ...newContact, has_served: val })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-primary flex items-center gap-2">
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
        </ScrollArea>

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
  );
}
