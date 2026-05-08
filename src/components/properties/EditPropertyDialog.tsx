import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useUpdateProperty, useDeleteProperty, type Property } from "@/hooks/useProperties";
import { PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import CityCombobox from "./CityCombobox";
import ResponsibleSelect from "./ResponsibleSelect";
import PartnerSelect from "../partners/PartnerSelect";
import PropertyChecklist from "./PropertyChecklist";
import LinkedClients from "./LinkedClients";
import PropertyPhotoUpload from "./PropertyPhotoUpload";
import PropertyStageTimeline from "./PropertyStageTimeline";
import PropertyUpdates from "./PropertyUpdates";
import PropertyReportGenerator from "./PropertyReportGenerator";
import PropertyFinancials from "./PropertyFinancials";
import { useCreateChecklistForStage } from "@/hooks/usePropertyChecklist";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Plus, Trash2, ClipboardList, CheckCircle2 } from "lucide-react";
import { useKanbanStages } from "@/hooks/useKanbanStages";

const schema = z.object({
  code: z.string().trim().min(1, "O código é obrigatório"),
  property_type: z.enum(["casa", "casa_condominio", "apartamento", "apartamento_condominio", "terreno", "comercial"]),
  state: z.string().min(2, "O estado é obrigatório"),
  city: z.string().min(1, "A cidade é obrigatória"),
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
  appraisal_expiry: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  sale_type: z.string().optional().nullable(),
  operation_responsible_id: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  property_division: z.string().optional().nullable(),
  auction_type: z.string().optional().nullable(),
  caretaker_id: z.string().optional().nullable(),
  caretaker_payment_date: z.string().optional().nullable(),
  caretaker_notes: z.string().optional().nullable(),
  has_broker: z.boolean().optional().nullable(),
  broker_id: z.string().optional().nullable(),
  marketing_smartlink: z.boolean().optional().nullable(),
  marketing_board: z.boolean().optional().nullable(),
  marketing_banner: z.boolean().optional().nullable(),
  marketing_banner_property: z.boolean().optional().nullable(),
  marketing_paid_traffic: z.boolean().optional().nullable(),
  marketing_facebook_group: z.boolean().optional().nullable(),
  marketing_whatsapp_group: z.boolean().optional().nullable(),
  marketing_flyer: z.boolean().optional().nullable(),
  marketing_influencer: z.boolean().optional().nullable(),
  cca_id: z.string().optional().nullable(),
  marketing_ad_copy: z.string().optional().nullable(),
  appraisal_status: z.string().optional().nullable(),
  appraisal_notes: z.string().optional().nullable(),
  appraisal_date: z.string().optional().nullable(),
  appraisal_history: z.array(z.object({
    date: z.string().optional().nullable(),
    expiry: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    situation: z.string().optional().nullable(),
    value: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional().nullable(),
  sale_price: z.coerce.number().min(0).optional().nullable(),
  cash_sale_discount: z.coerce.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditPropertyDialog({ property, open, onOpenChange }: Props) {
  const updateProperty = useUpdateProperty();
  const { stages } = useKanbanStages("property", property.funnel_id || undefined);
  
  // Find current stage and its checklist
  const currentStage = stages.find(s => s.value === property.stage);
  const checklist = currentStage?.checklist || [];
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
      appraisal_expiry: (property as any).appraisal_expiry ?? null,
      owner: (property as any).owner ?? null,
      sale_type: (property as any).sale_type ?? null,
      operation_responsible_id: (property as any).operation_responsible_id ?? null,
      origin: (property as any).origin ?? null,
      registration_number: (property as any).registration_number ?? null,
      landmark: (property as any).landmark ?? null,
      property_division: (property as any).property_division ?? null,
      auction_type: (property as any).auction_type ?? null,
      caretaker_id: (property as any).caretaker_id ?? null,
      caretaker_payment_date: (property as any).caretaker_payment_date ?? null,
      caretaker_notes: (property as any).caretaker_notes ?? null,
      has_broker: (property as any).has_broker ?? false,
      broker_id: (property as any).broker_id ?? null,
      marketing_smartlink: (property as any).marketing_smartlink ?? false,
      marketing_board: (property as any).marketing_board ?? false,
      marketing_banner: (property as any).marketing_banner ?? false,
      marketing_banner_property: (property as any).marketing_banner_property ?? false,
      marketing_paid_traffic: (property as any).marketing_paid_traffic ?? false,
      marketing_facebook_group: (property as any).marketing_facebook_group ?? false,
      marketing_whatsapp_group: (property as any).marketing_whatsapp_group ?? false,
      marketing_flyer: (property as any).marketing_flyer ?? false,
      marketing_influencer: (property as any).marketing_influencer ?? false,
      cca_id: (property as any).cca_id ?? null,
      marketing_ad_copy: (property as any).marketing_ad_copy ?? null,
      appraisal_status: (property as any).appraisal_status ?? null,
      appraisal_notes: (property as any).appraisal_notes ?? null,
      appraisal_date: (property as any).appraisal_date ?? null,
      appraisal_history: (property as any).appraisal_history || [],
      sale_price: (property as any).sale_price ?? null,
      cash_sale_discount: (property as any).cash_sale_discount ?? null,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProperty.mutateAsync({
        id: property.id,
        ...values,
        city: values.city.toUpperCase(),
        state: values.state.toUpperCase(),
        photo_url: photoUrl,
      } as any);
      toast.success("Imóvel atualizado com sucesso!");
      onOpenChange(false);
    } catch (e: any) {
      if (e.message?.includes("properties_code_key")) {
        toast.error("Este código de imóvel já está em uso. Por favor, escolha outro.");
      } else {
        toast.error(e.message || "Erro ao atualizar imóvel");
      }
    }
  };

  const deleteMutation = useDeleteProperty();

  const handleDelete = () => {
    if (window.confirm("ATENÇÃO: Tem certeza que deseja excluir este imóvel? Esta ação é permanente e não pode ser desfeita.")) {
      deleteMutation.mutate(property.id, {
        onSuccess: () => {
          toast.success("Imóvel excluído com sucesso!");
          onOpenChange(false);
        },
        onError: (e) => toast.error("Erro ao excluir imóvel"),
      });
    }
  };

  const auctionDateValue = form.watch("auction_date");
  const appraisalExpiryValue = form.watch("appraisal_expiry");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    Imóvel: {property.code}
                    <span className="text-muted-foreground font-bold ml-2 text-base">
                      {property.city ? `${property.city}/${property.state}` : ""}
                    </span>
                  </DialogTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" 
                  onClick={handleDelete} 
                  title="Excluir Imóvel"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-black bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
                  Etapa: {currentStage?.label || property.stage?.toUpperCase().replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
            <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
            <TabsTrigger value="venda" className="flex-1">Venda</TabsTrigger>
            <TabsTrigger value="marketing" className="flex-1">Mkt</TabsTrigger>
            <TabsTrigger value="engenharia" className="flex-1">Engenharia</TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1">Checklist</TabsTrigger>
            <TabsTrigger value="updates" className="flex-1">Atualizações</TabsTrigger>
            <TabsTrigger value="clientes" className="flex-1">Clientes</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="relatorio" className="flex-1">Relatório</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="mt-4">
            <PropertyFinancials property={property} />
          </TabsContent>

          <TabsContent value="relatorio" className="mt-4">
            <PropertyReportGenerator property={property} />
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            <PropertyChecklist propertyId={property.id} stage={property.stage} />
          </TabsContent>

          <TabsContent value="updates" className="mt-4">
            <PropertyUpdates propertyId={property.id} currentStage={property.stage} auctionDate={property.auction_date} />
          </TabsContent>

          <TabsContent value="clientes" className="mt-4">
            <LinkedClients propertyId={property.id} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <PropertyStageTimeline propertyId={property.id} auctionDate={property.auction_date} />
          </TabsContent>

          <TabsContent value="venda" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="sale_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Venda (R$)</FormLabel>
                      <FormControl><CurrencyInput value={field.value ?? undefined} onChange={field.onChange} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cash_sale_discount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto à Vista (%)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                {/* Computed items for Venda */}
                <div className="rounded border bg-muted/20 p-3 space-y-2 mt-2">
                  <p className="text-sm font-semibold">Cálculos do Financiamento</p>
                  <p className="text-xs text-muted-foreground">
                    Cota Máx. Financiamento (80%): <strong>{
                      (() => {
                        let val = form.watch("sale_price");
                        if (val === undefined || val === null || val === "") return "R$ 0,00";
                        // Safety: ensure it's treated as a clean number
                        const cleanVal = typeof val === "string" ? parseFloat(val.replace(/\./g, "").replace(",", ".")) : Number(val);
                        if (isNaN(cleanVal)) return "R$ 0,00";
                        return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanVal * 0.8);
                      })()
                    }</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor à Vista com Desconto: <strong>{
                      (() => {
                        let val = form.watch("sale_price");
                        const desc = form.watch("cash_sale_discount");
                        if (val === undefined || val === null || val === "" || desc === undefined) return "R$ 0,00";
                        // Safety: ensure it's treated as a clean number
                        const cleanVal = typeof val === "string" ? parseFloat(val.replace(/\./g, "").replace(",", ".")) : Number(val);
                        if (isNaN(cleanVal)) return "R$ 0,00";
                        return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanVal * (1 - Number(desc) / 100));
                      })()
                    }</strong>
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateProperty.isPending}>{updateProperty.isPending ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="marketing" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="rounded-md border p-4 bg-muted/10 space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Responsáveis Comerciais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="broker_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corretor Vinculado</FormLabel>
                        <FormControl><PartnerSelect value={field.value ?? undefined} onValueChange={field.onChange} className="h-9" roleFilter={["CORRETOR"]} placeholder="Selecionar Corretor" defaultCity={{ state: form.watch("state") || property.state, city: form.watch("city") || property.city }} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cca_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CCA</FormLabel>
                        <FormControl><PartnerSelect value={field.value ?? undefined} onValueChange={field.onChange} className="h-9" roleFilter={["CCA"]} placeholder="Selecionar CCA" defaultCity={{ state: form.watch("state") || property.state, city: form.watch("city") || property.city }} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="has_broker" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Possui Corretor?</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_smartlink" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Smartlink</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_board" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Placa</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_banner" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Faixa</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_banner_property" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Faixa no Imóvel?</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_paid_traffic" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Tráfego Pago</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_facebook_group" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Grupo Facebook</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_whatsapp_group" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Grupo WhatsApp</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_flyer" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Panfletagem</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marketing_influencer" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Influencer</FormLabel></div>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="marketing_ad_copy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copy do Anúncio (Gerado a partir das informações)</FormLabel>
                    <FormControl><Textarea rows={6} {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <div className="flex justify-end pt-2">
                  <Button type="button" variant="outline" className="mr-2" onClick={() => {
                     const city = form.watch("city") || property.city || "";
                     const neighborhood = form.watch("neighborhood") || property.neighborhood || "";
                     const origin = form.watch("origin") || "";
                     const sale_type = form.watch("sale_type") || "";
                     const div = form.watch("property_division") || "";
                     const useful = form.watch("area_useful") || "";
                     const total = form.watch("area_total") || "";
                     const price = form.watch("sale_price") || 0;
                     const installment = price ? `R$${Math.round(Number(price) * 0.0045)}` : "R$470";

                     form.setValue("marketing_ad_copy", 
`As condições estão imperdíveis !!!
🔥Compre agora sua casa própria de ${div || "2 quartos"} e parcelas a partir de ${installment}!

📍 Bairro ${neighborhood}, ${city}.
${origin || "QUITADA"} e ${sale_type || "ESCRITURADA"}!
🏠 ${useful || "52"}m² de área construída
📐 ${total || "180"}m² de terreno
🛏 ${div || "2 quartos"}
🚽 1 banheiro
🚘 area ampla de garagem`);
                  }}>Gerar Texto</Button>
                  <Button type="submit" disabled={updateProperty.isPending}>{updateProperty.isPending ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="engenharia" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Histórico de Laudos</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    const history = form.getValues("appraisal_history") || [];
                    form.setValue("appraisal_history", [
                      ...history,
                      { date: "", expiry: "", status: "aceito", situation: "valido", value: 0, notes: "" }
                    ]);
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Laudo
                  </Button>
                </div>

                <div className="space-y-6">
                  {(form.watch("appraisal_history") || []).map((_, index) => (
                    <div key={index} className="relative rounded-lg border p-4 bg-muted/10 space-y-4">
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-7 w-7 text-destructive"
                        onClick={() => {
                          const history = form.getValues("appraisal_history") || [];
                          form.setValue("appraisal_history", history.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <FormField control={form.control} name={`appraisal_history.${index}.date`} render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">Data de Expedição</FormLabel>
                            <FormControl><SmartDatePicker value={field.value ?? undefined} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        
                        <FormField control={form.control} name={`appraisal_history.${index}.expiry`} render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">Vencimento do Laudo</FormLabel>
                            <FormControl><SmartDatePicker value={field.value ?? undefined} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name={`appraisal_history.${index}.status`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Status do Laudo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="aceito">Aceito</SelectItem>
                                <SelectItem value="negado">Negado</SelectItem>
                                <SelectItem value="nao_solicitado">Não Solicitado</SelectItem>
                                <SelectItem value="revisao">Revisão</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name={`appraisal_history.${index}.situation`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Situação do Laudo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="valido">Válido</SelectItem>
                                <SelectItem value="vencido">Vencido</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name={`appraisal_history.${index}.value`} render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs font-semibold">Valor do Laudo (R$)</FormLabel>
                            <FormControl>
                              <CurrencyInput 
                                value={field.value ?? undefined} 
                                onChange={field.onChange} 
                                className="h-9" 
                                placeholder="(valor será preenchido manualmente)" 
                              />
                            </FormControl>
                          </FormItem>
                        )} />

                      </div>

                      <FormField control={form.control} name={`appraisal_history.${index}.notes`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Observação</FormLabel>
                          <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  ))}

                  {(!form.watch("appraisal_history") || form.watch("appraisal_history")?.length === 0) && (
                    <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground text-sm">
                      Nenhum laudo cadastrado. Clique no botão acima para adicionar.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateProperty.isPending} onClick={() => {
                    // Update main appraisal fields based on latest entry before saving
                    const history = form.getValues("appraisal_history") || [];
                    if (history.length > 0) {
                      const latest = [...history].sort((a, b) => (b.expiry || "").localeCompare(a.expiry || ""))[0];
                      form.setValue("appraisal_expiry", latest.expiry);
                      form.setValue("appraisal_date", latest.date);
                      form.setValue("appraisal_status", latest.status);
                      form.setValue("listed_price", latest.value);
                    }
                  }}>
                    {updateProperty.isPending ? "Salvando..." : "Salvar Histórico"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="dados" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* 1. Identificação Principal */}
                <div className="rounded-md border p-4 space-y-4 bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Identificação Principal</h3>
                  <PropertyPhotoUpload propertyId={property.id} currentUrl={photoUrl} onUploaded={setPhotoUrl} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="registration_number" render={({ field }) => (
                      <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
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
                    <FormField control={form.control} name="property_division" render={({ field }) => (
                      <FormItem><FormLabel>Divisão do Imóvel</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="area_total" render={({ field }) => (
                      <FormItem><FormLabel>Área Total (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="area_useful" render={({ field }) => (
                      <FormItem><FormLabel>Área Útil (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="col-span-2">
                      <FormField control={form.control} name="owner" render={({ field }) => (
                        <FormItem><FormLabel>Proprietário</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* 2. Informações de Arrematação */}
                <div className="rounded-md border p-4 space-y-4 bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Leilão e Aquisição</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="origin" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="caixa">Caixa</SelectItem>
                            <SelectItem value="emgea">Emgea</SelectItem>
                            <SelectItem value="bancos_leiloes">Bancos de Leilões</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="auction_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="a_vista">À Vista</SelectItem>
                            <SelectItem value="financiado">Financiado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sale_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Venda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="usado">Usado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="purchase_price" render={({ field }) => (
                      <FormItem><FormLabel>Valor Arrematação (R$)</FormLabel><FormControl><CurrencyInput value={field.value ?? undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="col-span-2">
                       <FormField control={form.control} name="auction_date" render={({ field }) => (
                         <FormItem className="flex flex-col">
                           <FormLabel>Data de Arrematação</FormLabel>
                           <FormControl><SmartDatePicker value={field.value ?? undefined} onChange={field.onChange} /></FormControl>
                           <FormMessage />
                         </FormItem>
                       )} />
                    </div>
                  </div>
                </div>

                {/* 3. Localização */}
                <div className="rounded-md border p-4 space-y-4 bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Localização Registrada</h3>
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
                    <FormField control={form.control} name="neighborhood" render={({ field }) => (
                      <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="zip_code" render={({ field }) => (
                      <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="col-span-2">
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                       <FormField control={form.control} name="landmark" render={({ field }) => (
                         <FormItem><FormLabel>Ponto de Referência</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                       )} />
                    </div>
                    <div className="col-span-2">
                       <FormField control={form.control} name="maps_url" render={({ field }) => (
                         <FormItem><FormLabel>Link Google Maps</FormLabel><FormControl><Input {...field} placeholder="https://maps.google.com/..." /></FormControl><FormMessage /></FormItem>
                       )} />
                    </div>
                  </div>
                </div>

                {/* 4. Documentação e Gestão */}
                <div className="rounded-md border p-4 space-y-4 bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Acervo e Gestão</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                       <FormField control={form.control} name="drive_url" render={({ field }) => (
                         <FormItem>
                           <FormLabel>Pasta do Drive</FormLabel>
                           <div className="flex gap-2">
                             <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://drive.google.com/..." /></FormControl>
                             {field.value && (
                               <Button type="button" variant="outline" size="icon" onClick={() => window.open(field.value ?? "", '_blank')} title="Acessar Drive" className="shrink-0">
                                 <ExternalLink className="h-4 w-4" />
                               </Button>
                             )}
                           </div>
                           <FormMessage />
                         </FormItem>
                       )} />
                    </div>

                    <FormField control={form.control} name="responsible_user_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável Geral</FormLabel>
                        <FormControl><ResponsibleSelect value={field.value || undefined} onValueChange={field.onChange} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="operation_responsible_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável Operação</FormLabel>
                        <FormControl><ResponsibleSelect value={field.value || undefined} onValueChange={field.onChange} className="h-9" showMentoria={true} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea rows={4} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={updateProperty.isPending}>{updateProperty.isPending ? "Salvando..." : "Salvar Dados"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
          </div>
      </DialogContent>
    </Dialog>
  );
}
