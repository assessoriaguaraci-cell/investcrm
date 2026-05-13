import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PreAuctionProperty } from "@/types/pre-auction";
import { useUpdatePreAuctionProperty, useCreatePreAuctionProperty, usePreAuctionFunnels, useDeletePreAuctionProperty } from "@/hooks/usePreAuction";
import { PROPERTY_TYPES, BRAZILIAN_STATES, OCCUPATION_STATUSES } from "@/lib/property-constants";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Save, Gavel, ExternalLink, Trash2 } from "lucide-react";
import PropertyPhotoUpload from "@/components/properties/PropertyPhotoUpload";
import PropertyChecklist from "@/components/properties/PropertyChecklist";
import ResponsibleSelect from "@/components/properties/ResponsibleSelect";
import PartnerSelect from "@/components/partners/PartnerSelect";
import CityCombobox from "@/components/properties/CityCombobox";
import { toast } from "sonner";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreAuctionFiles } from "./PreAuctionFiles";

const schema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  property_type: z.string().default("casa"),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  maps_url: z.string().optional().nullable(),
  drive_url: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  
  auction_date: z.string().optional().nullable(),
  auction_type: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  purchase_price: z.coerce.number().optional().nullable(),
  current_bid: z.coerce.number().optional().nullable(),
  proposal_date: z.string().optional().nullable(),
  proposal_deadline: z.string().optional().nullable(),
  
  area_total: z.coerce.number().optional().nullable(),
  area_useful: z.coerce.number().optional().nullable(),
  property_division: z.string().optional().nullable(),
  occupation_status: z.string().optional().nullable(),
  
  appraisal_value: z.coerce.number().optional().nullable(),
  market_value: z.coerce.number().optional().nullable(),
  appraisal_validity: z.string().optional().nullable(),
  listed_price: z.coerce.number().optional().nullable(),
  
  responsible_id: z.string().optional().nullable(),
  operation_responsible_id: z.string().optional().nullable(),
  
  diligence_date: z.string().optional().nullable(),
  diligence_professional_id: z.string().optional().nullable(),
  diligence_samples: z.string().optional().nullable(),
  status_diligence: z.string().default("Não Iniciado"),
  status_market_analysis: z.string().default("Não Iniciado"),
  status_debts: z.string().default("Não Iniciado"),
  
  security_analysis: z.string().optional().nullable(),
  transport_analysis: z.string().optional().nullable(),
  complementary_analysis: z.string().optional().nullable(),
  
  registration_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  manager_contact: z.string().optional().nullable(),
  iptu: z.coerce.number().optional().nullable(),
  condo_fees: z.coerce.number().optional().nullable(),
  
  notes: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
  group_created: z.boolean().default(false),
  funnel_id: z.string().optional().nullable(),
  
  // New Analysis Fields
  bill_due_date: z.string().optional().nullable(),
  property_conditions: z.string().optional().nullable(),
  registry_analysis: z.string().optional().nullable(),
  legal_analysis: z.string().optional().nullable(),
  occupant_contact: z.string().optional().nullable(),
  syndic_contact: z.string().optional().nullable(),
  itbi: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface PreAuctionDialogProps {
  property: PreAuctionProperty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId?: string;
  initialDiligenteId?: string;
}

export function PreAuctionDialog({ property, open, onOpenChange, funnelId, initialDiligenteId }: PreAuctionDialogProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(property?.photo_url ?? null);
  const updateMutation = useUpdatePreAuctionProperty();
  const createMutation = useCreatePreAuctionProperty();
  const deleteMutation = useDeletePreAuctionProperty();
  const { data: funnels } = usePreAuctionFunnels();
  const currentFunnelId = property?.funnel_id || funnelId;
  const { stages } = useKanbanStages("pre_auction", currentFunnelId || undefined);

  // Find the current stage and its checklist
  const currentStage = stages.find(s => s.value === property?.stage);
  const checklist = currentStage?.checklist || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      property_type: "casa",
      status_diligence: "Não Iniciado",
      status_market_analysis: "Não Iniciado",
      status_debts: "Não Iniciado",
      group_created: false,
    }
  });

  useEffect(() => {
    if (open) {
      if (property) {
        form.reset({
          ...property,
          funnel_id: property.funnel_id ?? funnelId,
        } as any);
        setPhotoUrl(property.photo_url);
      } else {
        form.reset({
          code: "",
          property_type: "casa",
          status_diligence: "Não Iniciado",
          status_market_analysis: "Não Iniciado",
          status_debts: "Não Iniciado",
          group_created: false,
          diligence_professional_id: initialDiligenteId || null,
          funnel_id: funnelId || null,
        });
        setPhotoUrl(null);
      }
    }
  }, [open, property, initialDiligenteId, funnelId]);
  const handleDelete = async () => {
    if (!property?.id) return;
    if (confirm("Tem certeza que deseja excluir este imóvel permanentemente?")) {
      try {
        await deleteMutation.mutateAsync(property.id);
        onOpenChange(false);
      } catch (error) {
        toast.error("Erro ao excluir imóvel.");
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        ...values,
        stage: property?.stage || 'inicial',
        funnel_id: values.funnel_id && values.funnel_id !== "default" ? values.funnel_id : null,
        photo_url: photoUrl,
      };

      if (property?.id) {
        await updateMutation.mutateAsync({ id: property.id, ...data } as any);
      } else {
        await createMutation.mutateAsync(data as any);
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar informações.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl focus:outline-none">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between w-full pr-12">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary" />
              {property ? `Ficha do Imóvel: ${property.code}` : "Novo Imóvel"}
            </DialogTitle>
            
            {property && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDelete}
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                disabled={deleteMutation.isPending}
                title="Excluir Imóvel"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
               <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                  <TabsTrigger value="analise" className="flex-1">Análise</TabsTrigger>
                  <TabsTrigger value="checklist" className="flex-1">Checklist</TabsTrigger>
                  <TabsTrigger value="relatorio" className="flex-1">Relatório</TabsTrigger>
                </TabsList>

                <TabsContent value="checklist" className="mt-0 space-y-6">
                   <PropertyChecklist propertyId={property?.id || ""} stage="pre_arrematacao" />
                   <div className="flex justify-end pt-6 border-t">
                      <Button type="submit" className="font-black uppercase tracking-tight gap-2" disabled={updateMutation.isPending || createMutation.isPending}>
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending || createMutation.isPending ? "SALVANDO..." : "SALVAR CHECKLIST"}
                      </Button>
                   </div>
                </TabsContent>

                <TabsContent value="relatorio" className="mt-0">
                   <div className="space-y-4">
                     <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Relatório de Pré-Arrematação
                     </h3>
                     <p className="text-sm text-muted-foreground">Confira a prévia abaixo e clique em copiar para compartilhar.</p>
                     
                     {(() => {
                        const vals = form.watch();
                        const formatCurrency = (val: any) => 
                           val ? Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)) : "---";
                        const formatDate = (date: any) => date ? format(new Date(date + "T12:00:00"), "dd/MM/yyyy") : "---";

                        const reportText = [
                           `📊 *ANÁLISE PRÉ-ARREMATAÇÃO – INVEST LAR*`,
                           ``,
                           `📆 Data vencimento do boleto: *${formatDate(vals.bill_due_date)}*`,
                           ``,
                           `🏠 Código do imóvel: *${vals.code}*`,
                           ``,
                           `📍 Endereço: *${vals.address || "---"}*`,
                           `Link do Localização (Maps): ${vals.maps_url || "---"}`,
                           ``,
                           `💰 Lance atual: *${formatCurrency(vals.current_bid || vals.purchase_price)}*`,
                           ``,
                           `📈 Valor de mercado: *${formatCurrency(vals.market_value || vals.listed_price)}*`,
                           ``,
                           `📅 Data de Validade do laudo: *${formatDate(vals.appraisal_validity)}*`,
                           ``,
                           `📄 Débitos`,
                           `•  IPTU: *${formatCurrency(vals.iptu)}*`,
                           `•  ITBI: *${formatCurrency(vals.itbi)}*`,
                           `•  Condomínio: *${formatCurrency(vals.condo_fees)}*`,
                           ``,
                           `🧱 Condicoes do imóvel:`,
                           `${vals.property_conditions || "---"}`,
                           ``,
                           `📄 Analise da Matricula:`,
                           `${vals.registry_analysis || "---"}`,
                           ``,
                           `🗃️ Analise juridica:`,
                           `${vals.legal_analysis || "---"}`,
                           ``,
                           `🔐 Segurança da região:`,
                           `${vals.security_analysis || "---"}`,
                           ``,
                           `🏪 Comércios, transporte e serviços:`,
                           `${vals.transport_analysis || "---"}`,
                           ``,
                           `📞 Contato do ocupante: *${vals.occupant_contact || "---"}*`,
                           ``,
                           `📞 Contato do síndico: *${vals.syndic_contact || "---"}*`,
                           ``,
                           `🏢 Contato Administradora: *${vals.manager_contact || "---"}*`
                        ].join("\n");

                        return (
                          <>
                            <Textarea 
                              value={reportText} 
                              readOnly 
                              className="min-h-[300px] font-mono text-xs bg-muted/30" 
                            />
                            <Button 
                              type="button"
                              className="w-full font-black uppercase tracking-tight gap-2 h-12 text-lg shadow-xl shadow-primary/20"
                              onClick={() => {
                                navigator.clipboard.writeText(reportText);
                                toast.success("Relatório copiado para o WhatsApp!");
                              }}
                            >
                              <ClipboardList className="h-5 w-5" />
                              COPIAR RELATÓRIO FORMATADO
                            </Button>
                          </>
                        );
                     })()}
                   </div>
                </TabsContent>

                <TabsContent value="analise" className="mt-0">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 rounded-md border p-4 bg-muted/10">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-primary">Análise Técnica</h3>
                        <FormField control={form.control} name="bill_due_date" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Data vencimento do boleto</FormLabel>
                            <FormControl><SmartDatePicker value={field.value || ""} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="appraisal_validity" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Data de Validade do laudo</FormLabel>
                            <FormControl><SmartDatePicker value={field.value || ""} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="itbi" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Débito ITBI (R$)</FormLabel>
                            <FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <div className="space-y-4 rounded-md border p-4 bg-muted/10">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-primary">Contatos Adicionais</h3>
                        <FormField control={form.control} name="occupant_contact" render={({ field }) => (
                          <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Contato do ocupante</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="syndic_contact" render={({ field }) => (
                          <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Contato do síndico</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="manager_contact" render={({ field }) => (
                          <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Contato Administradora</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                      </div>

                      <div className="md:col-span-2 space-y-4 rounded-md border p-4 bg-muted/10">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-primary">Relatórios e Vistorias</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="property_conditions" render={({ field }) => (
                            <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Condições do imóvel</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="registry_analysis" render={({ field }) => (
                            <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Analise da Matricula</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="legal_analysis" render={({ field }) => (
                            <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Analise juridica</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="security_analysis" render={({ field }) => (
                            <FormItem><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Segurança da região</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="transport_analysis" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Comércios, transporte e serviços</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={2} /></FormControl></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <PreAuctionFiles propertyId={property?.id || ""} />
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                      <Button type="submit" className="font-black uppercase tracking-tight gap-2" disabled={updateMutation.isPending || createMutation.isPending}>
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending || createMutation.isPending ? "SALVANDO..." : "SALVAR ANÁLISE"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dados" className="mt-0">
                  <div className="space-y-8">
                    {/* SEÇÃO 1: IDENTIFICAÇÃO E FOTO */}
                    <div className="space-y-4">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Identificação e Foto
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                          <div className="md:col-span-1">
                              <PropertyPhotoUpload 
                                  propertyId={property?.id || "temp-id"} 
                                  currentUrl={photoUrl} 
                                  onUploaded={setPhotoUrl} 
                              />
                          </div>
                          <div className="md:col-span-2 grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="code" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Código</FormLabel>
                                      <FormControl><Input {...field} placeholder="Ex: ABC-123" /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )} />
                              <FormField control={form.control} name="property_type" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Tipo</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value || ""}>
                                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )} />
                              <FormField control={form.control} name="funnel_id" render={({ field }) => (
                                  <FormItem className="col-span-2">
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Funil Atual</FormLabel>
                                      <Select value={field.value || "default"} onValueChange={(v) => field.onChange(v === "default" ? null : v)}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o funil" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="default">Funil Padrão</SelectItem>
                                              {funnels?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  </FormItem>
                              )} />
                          </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: LOCALIZAÇÃO */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Localização
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField control={form.control} name="state" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Estado</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                          {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="city" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Cidade</FormLabel>
                                  <CityCombobox value={field.value || ""} onValueChange={field.onChange} state={form.watch("state") || ""} />
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="neighborhood" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Bairro</FormLabel>
                                  <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="zip_code" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">CEP</FormLabel>
                                  <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="address" render={({ field }) => (
                              <FormItem className="col-span-2 md:col-span-3">
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Endereço Completo</FormLabel>
                                  <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="landmark" render={({ field }) => (
                              <FormItem className="col-span-2 md:col-span-1">
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Referência</FormLabel>
                                  <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="maps_url" render={({ field }) => (
                              <FormItem className="col-span-2 md:col-span-4">
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Link Google Maps</FormLabel>
                                  <div className="flex gap-2">
                                      <FormControl><Input {...field} value={field.value || ""} placeholder="https://maps..." /></FormControl>
                                      {field.value && (
                                          <Button type="button" variant="outline" size="icon" onClick={() => window.open(field.value!, "_blank")}>
                                              <ExternalLink className="h-4 w-4" />
                                          </Button>
                                      )}
                                  </div>
                              </FormItem>
                          )} />
                      </div>
                    </div>

                    {/* SEÇÃO 3: LEILÃO E AQUISIÇÃO */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Leilão e Aquisição
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="auction_date" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Data do Leilão</FormLabel>
                                  <FormControl><SmartDatePicker value={field.value || ""} onChange={field.onChange} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="auction_type" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Tipo Transação</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                      <SelectContent>
                                          <SelectItem value="a_vista">À Vista</SelectItem>
                                          <SelectItem value="financiado">Financiado</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="origin" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Origem</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                      <SelectContent>
                                          <SelectItem value="caixa">Caixa</SelectItem>
                                          <SelectItem value="emgea">Emgea</SelectItem>
                                          <SelectItem value="bancos_leiloes">Bancos de Leilões</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="purchase_price" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Valor Arremate (R$)</FormLabel>
                                  <FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="current_bid" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Lance Atual (R$)</FormLabel>
                                  <FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="proposal_deadline" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Vencimento Lance</FormLabel>
                                  <FormControl><SmartDatePicker value={field.value || ""} onChange={field.onChange} /></FormControl>
                              </FormItem>
                          )} />
                      </div>
                    </div>

                    {/* SEÇÃO 4: DILIGÊNCIA E ANÁLISE */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Diligência e Análise
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <FormField control={form.control} name="diligence_date" render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Data Diligência</FormLabel>
                                      <FormControl><SmartDatePicker value={field.value || ""} onChange={field.onChange} /></FormControl>
                                  </FormItem>
                              )} />
                              <FormField control={form.control} name="diligence_professional_id" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Diligente Responsável</FormLabel>
                                      <FormControl>
                                          <PartnerSelect 
                                              value={field.value || undefined} 
                                              onValueChange={field.onChange} 
                                              roleFilter={["DILIGENTE"]} 
                                              placeholder="Selecionar Diligente"
                                              defaultCity={{ state: form.watch("state") || "", city: form.watch("city") || "" }}
                                          />
                                      </FormControl>
                                  </FormItem>
                              )} />
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                              {/* Status Selectors */}
                              <FormField control={form.control} name="status_diligence" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status Diligência</FormLabel>
                                      <div className="flex gap-1">
                                          {['Não Iniciado', 'Em Andamento', 'Concluído'].map(status => (
                                              <Button 
                                                  key={status} type="button" size="sm" 
                                                  variant={field.value === status ? "default" : "outline"}
                                                  className="text-[9px] font-black uppercase px-2 h-7"
                                                  onClick={() => field.onChange(status)}
                                              >
                                                  {status}
                                              </Button>
                                          ))}
                                      </div>
                                  </FormItem>
                              )} />
                              <FormField control={form.control} name="status_market_analysis" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status Análise de Mercado</FormLabel>
                                      <div className="flex gap-1">
                                          {['Não Iniciado', 'Em Andamento', 'Concluída'].map(status => (
                                              <Button 
                                                  key={status} type="button" size="sm" 
                                                  variant={field.value === status ? "default" : "outline"}
                                                  className="text-[9px] font-black uppercase px-2 h-7"
                                                  onClick={() => field.onChange(status)}
                                              >
                                                  {status}
                                              </Button>
                                          ))}
                                      </div>
                                  </FormItem>
                              )} />
                              <FormField control={form.control} name="status_debts" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status Débitos</FormLabel>
                                      <div className="flex gap-1">
                                          {['Não Iniciado', 'Em Andamento', 'Concluída'].map(status => (
                                              <Button 
                                                  key={status} type="button" size="sm" 
                                                  variant={field.value === status ? "default" : "outline"}
                                                  className="text-[9px] font-black uppercase px-2 h-7"
                                                  onClick={() => field.onChange(status)}
                                              >
                                                  {status}
                                              </Button>
                                          ))}
                                      </div>
                                  </FormItem>
                              )} />
                          </div>
                      </div>
                      <FormField control={form.control} name="diligence_samples" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Amostras (Link ou Texto)</FormLabel>
                              <FormControl><Textarea {...field} value={field.value || ""} placeholder="Insira links ou descrições..." /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                    {/* SEÇÃO 5: DADOS DO IMÓVEL E FINANCEIRO */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Dados do Imóvel e Financeiro
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="area_total" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Área Total (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="area_useful" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Área Útil (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="property_division" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Divisão</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="Ex: 2 quartos, 1 suíte" /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="occupation_status" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black text-[10px] uppercase">Ocupação</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                          {OCCUPATION_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="iptu" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">IPTU (R$)</FormLabel><FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="condo_fees" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Condomínio (R$)</FormLabel><FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="appraisal_value" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Valor do Laudo (R$)</FormLabel><FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="market_value" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Valor de Mercado (R$)</FormLabel><FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="listed_price" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Venda Pretendida (R$)</FormLabel><FormControl><CurrencyInput value={field.value || undefined} onChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="registration_number" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Matrícula</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="Número da Matrícula" /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="tax_id" render={({ field }) => (
                              <FormItem><FormLabel className="font-black text-[10px] uppercase">Inscrição Imobiliária (IPTU)</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="Ex: 12.345.678" /></FormControl></FormItem>
                          )} />
                      </div>
                    </div>

                    {/* SEÇÃO 6: GESTÃO E RESPONSÁVEIS */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Gestão e Responsáveis
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="responsible_id" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black text-[10px] uppercase">Responsável Comercial</FormLabel>
                                  <FormControl><ResponsibleSelect value={field.value} onValueChange={field.onChange} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="operation_responsible_id" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-black text-[10px] uppercase">Responsável Operação</FormLabel>
                                  <FormControl><ResponsibleSelect value={field.value} onValueChange={field.onChange} showMentoria /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="drive_url" render={({ field }) => (
                              <FormItem className="col-span-2">
                                  <FormLabel className="font-black text-[10px] uppercase">Link Drive</FormLabel>
                                  <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                              </FormItem>
                          )} />
                      </div>
                      <div className="flex items-center space-x-2 py-4">
                          <FormField control={form.control} name="group_created" render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                  <FormLabel className="font-black uppercase text-xs cursor-pointer">Grupo criado</FormLabel>
                              </FormItem>
                          )} />
                      </div>
                    </div>

                    {/* SEÇÃO 7: CONCLUSÃO E OBSERVAÇÕES */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Conclusão e Observações
                      </h3>
                      <FormField control={form.control} name="conclusion" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-[10px] uppercase">Conclusão do Imóvel</FormLabel>
                              <FormControl><Textarea {...field} value={field.value || ""} rows={4} /></FormControl>
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-[10px] uppercase">Observações Extras</FormLabel>
                              <FormControl><Textarea {...field} value={field.value || ""} rows={3} /></FormControl>
                          </FormItem>
                      )} />

                      <div className="flex justify-end pt-6 border-t pb-8">
                        <Button type="submit" className="font-black uppercase tracking-tight gap-2 h-10 px-8 shadow-lg shadow-primary/20" disabled={updateMutation.isPending || createMutation.isPending}>
                          <Save className="h-4 w-4" />
                          {updateMutation.isPending || createMutation.isPending ? "SALVANDO..." : "SALVAR FICHA"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>
        <DialogFooter className="p-4 border-t bg-muted/5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-black uppercase tracking-tight h-9 px-4 text-[10px]">Fechar</Button>
          <Button onClick={form.handleSubmit(onSubmit)} className="font-black uppercase tracking-tight gap-2 h-9 px-6 text-[10px] shadow-md shadow-primary/10" disabled={updateMutation.isPending || createMutation.isPending}>
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending || createMutation.isPending ? "SALVANDO..." : "SALVAR TUDO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
