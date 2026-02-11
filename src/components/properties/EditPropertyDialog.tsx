import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateProperty, type Property } from "@/hooks/useProperties";
import { PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import CityCombobox from "./CityCombobox";
import ResponsibleSelect from "./ResponsibleSelect";
import PropertyChecklist from "./PropertyChecklist";
import LinkedClients from "./LinkedClients";
import PropertyPhotoUpload from "./PropertyPhotoUpload";
import PropertyStageTimeline from "./PropertyStageTimeline";
import PropertyUpdates from "./PropertyUpdates";
import { useCreateChecklistForStage } from "@/hooks/usePropertyChecklist";
import { toast } from "sonner";

const schema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  property_type: z.enum(["casa", "casa_condominio", "apartamento", "apartamento_condominio", "terreno", "comercial"]),
  state: z.string().min(2, "Obrigatório"),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  zip_code: z.string().optional(),
  maps_url: z.string().optional(),
  drive_url: z.string().optional().nullable(),
  occupation_status: z.enum(["desocupado", "ocupado", "imissao_na_posse", "venda_para_ocupante"]),
  priority: z.enum(["baixa", "media", "alta"]),
  purchase_price: z.coerce.number().min(0).optional().nullable(),
  listed_price: z.coerce.number().min(0).optional().nullable(),
  area_total: z.coerce.number().min(0).optional().nullable(),
  area_useful: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  responsible_user_id: z.string().optional().nullable(),
  auction_date: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditPropertyDialog({ property, open, onOpenChange }: Props) {
  const updateProperty = useUpdateProperty();
  const createChecklist = useCreateChecklistForStage();
  const [photoUrl, setPhotoUrl] = useState<string | null>((property as any).photo_url ?? null);

  useEffect(() => {
    if (open && property.id) {
      createChecklist.mutate({ propertyId: property.id, stage: property.stage });
      setPhotoUrl((property as any).photo_url ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, property.id, property.stage]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      code: property.code,
      property_type: property.property_type,
      state: property.state,
      city: property.city ?? "",
      neighborhood: property.neighborhood ?? "",
      address: property.address ?? "",
      zip_code: property.zip_code ?? "",
      maps_url: property.maps_url ?? "",
      drive_url: (property as any).drive_url ?? "",
      occupation_status: property.occupation_status,
      priority: property.priority,
      purchase_price: property.purchase_price,
      listed_price: property.listed_price,
      area_total: property.area_total,
      area_useful: property.area_useful,
      notes: property.notes,
      responsible_user_id: property.responsible_user_id,
      auction_date: property.auction_date,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProperty.mutateAsync({
        id: property.id,
        ...values,
        photo_url: photoUrl,
      } as any);
      toast.success("Imóvel atualizado com sucesso!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar imóvel");
    }
  };

  const auctionDateValue = form.watch("auction_date");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Imóvel — {property.code}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1">Checklist</TabsTrigger>
            <TabsTrigger value="updates" className="flex-1">Atualizações</TabsTrigger>
            <TabsTrigger value="clientes" className="flex-1">Clientes</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">Cronômetro</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            <PropertyChecklist propertyId={property.id} stage={property.stage} />
          </TabsContent>

          <TabsContent value="updates" className="mt-4">
            <PropertyUpdates propertyId={property.id} />
          </TabsContent>

          <TabsContent value="clientes" className="mt-4">
            <LinkedClients propertyId={property.id} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <PropertyStageTimeline propertyId={property.id} auctionDate={property.auction_date} />
          </TabsContent>

          <TabsContent value="dados" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Photo upload */}
                <PropertyPhotoUpload
                  propertyId={property.id}
                  currentUrl={photoUrl}
                  onUploaded={setPhotoUrl}
                />

                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="property_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PRIORITY_LEVELS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="occupation_status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocupação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {OCCUPATION_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Auction date */}
                <FormField control={form.control} name="auction_date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Arrematação</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(new Date(field.value + "T12:00:00"), "dd/MM/yyyy") : "Selecionar data"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value + "T12:00:00") : undefined}
                          onSelect={d => field.onChange(d ? format(d, "yyyy-MM-dd") : null)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <CityCombobox value={field.value || ""} onValueChange={field.onChange} state={form.watch("state")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="neighborhood" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="maps_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Google Maps</FormLabel>
                    <FormControl><Input {...field} placeholder="https://maps.google.com/..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="drive_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasta do Drive</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://drive.google.com/..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="purchase_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Arrematação (R$)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="listed_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Anúncio (R$)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="area_total" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Total (m²)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="area_useful" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Útil (m²)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="responsible_user_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <ResponsibleSelect value={field.value} onValueChange={field.onChange} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={updateProperty.isPending}>
                    {updateProperty.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
