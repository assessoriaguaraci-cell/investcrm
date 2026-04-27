import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, CalendarIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateProperty } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import CityCombobox from "./CityCombobox";
import ResponsibleSelect from "./ResponsibleSelect";
import PartnerSelect from "../partners/PartnerSelect";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";

const schema = z.object({
  code: z.string().optional(),
  property_type: z.enum(["casa", "casa_condominio", "apartamento", "apartamento_condominio", "terreno", "comercial"]),
  state: z.string().min(2, "Obrigatório"),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  zip_code: z.string().optional(),
  maps_url: z.string().optional(),
  occupation_status: z.enum(["desocupado", "ocupado", "imissao_na_posse", "venda_para_ocupante"]),
  priority: z.enum(["baixa", "media", "alta"]),
  purchase_price: z.coerce.number().min(0).optional(),
  listed_price: z.coerce.number().min(0).optional(),
  area_total: z.coerce.number().min(0).optional(),
  area_useful: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  responsible_user_id: z.string().optional(),
  auction_date: z.string().optional(),
  drive_url: z.string().optional(),
  appraisal_expiry: z.string().optional(),
  owner: z.string().optional(),
  sale_type: z.string().optional(),
  operation_responsible_id: z.string().optional(),
  origin: z.string().optional(),
  registration_number: z.string().optional(),
  landmark: z.string().optional(),
  property_division: z.string().optional(),
  auction_type: z.string().optional(),
  caretaker_id: z.string().optional(),
  caretaker_payment_date: z.string().optional(),
  caretaker_notes: z.string().optional(),
  has_broker: z.boolean().optional(),
  broker_id: z.string().optional(),
  cca_id: z.string().optional(),
  marketing_smartlink: z.boolean().optional(),
  marketing_board: z.boolean().optional(),
  marketing_banner: z.boolean().optional(),
  marketing_banner_property: z.boolean().optional(),
  marketing_paid_traffic: z.boolean().optional(),
  marketing_facebook_group: z.boolean().optional(),
  marketing_whatsapp_group: z.boolean().optional(),
  marketing_flyer: z.boolean().optional(),
  marketing_influencer: z.boolean().optional(),
  marketing_ad_copy: z.string().optional(),
  sale_price: z.coerce.number().min(0).optional(),
  cash_sale_discount: z.coerce.number().min(0).optional(),
  appraisal_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    defaultFunnelId?: string;
}

export default function NewPropertyDialog({ defaultFunnelId }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createProperty = useCreateProperty();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_type: "casa",
      state: "SP",
      occupation_status: "desocupado",
      priority: "media",
      sale_price: 0,
      cash_sale_discount: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createProperty.mutateAsync({
        ...values,
        code: values.code || "",
        responsible_user_id: values.responsible_user_id || user?.id || null,
        state: values.state,
        funnel_id: defaultFunnelId as any
      });
      toast.success("Imóvel cadastrado com sucesso!");
      form.reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao cadastrar imóvel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-black shadow-lg bg-primary hover:bg-primary/90 text-white h-10 px-6 uppercase text-xs shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl focus:outline-none">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Cadastrar Novo Imóvel</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="rounded-md border p-4 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Identificação Principal</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Código (opcional)</FormLabel><FormControl><Input {...field} placeholder="IL-2026-XXXX" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="registration_number" render={({ field }) => (
                  <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="property_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="rounded-md border p-4 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Leilão e Aquisição</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="origin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="rounded-md border p-4 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Localização Registrada</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* 4. Marketing */}
            <div className="rounded-md border p-4 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Marketing</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="broker_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corretor Vinculado</FormLabel>
                    <FormControl><PartnerSelect value={field.value} onValueChange={field.onChange} className="h-9" roleFilter={["CORRETOR"]} placeholder="Selecionar Corretor" defaultCity={{ state: form.watch("state") || "", city: form.watch("city") || "" }} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="cca_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CCA</FormLabel>
                    <FormControl><PartnerSelect value={field.value} onValueChange={field.onChange} className="h-9" roleFilter={["CCA"]} placeholder="Selecionar CCA" defaultCity={{ state: form.watch("state") || "", city: form.watch("city") || "" }} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "marketing_smartlink", label: "Smartlink" },
                  { name: "marketing_board", label: "Placa" },
                  { name: "marketing_banner", label: "Faixa" },
                  { name: "marketing_banner_property", label: "Faixa no Imóvel?" },
                  { name: "marketing_paid_traffic", label: "Tráfego Pago" },
                  { name: "marketing_facebook_group", label: "Grupo Facebook" },
                  { name: "marketing_whatsapp_group", label: "Grupo WhatsApp" },
                  { name: "marketing_flyer", label: "Panfletagem" },
                  { name: "marketing_influencer", label: "Influencer" },
                  { name: "has_broker", label: "Possui Corretor?" },
                ].map((item) => (
                  <FormField key={item.name} control={form.control} name={item.name as any} render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>{item.label}</FormLabel></div>
                    </FormItem>
                  )} />
                ))}
              </div>

              <FormField control={form.control} name="marketing_ad_copy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Copy do Anúncio</FormLabel>
                  <div className="space-y-2">
                    <FormControl><Textarea rows={4} {...field} value={field.value || ""} /></FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                       const city = form.watch("city") || "";
                       const neighborhood = form.watch("neighborhood") || "";
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
                  </div>
                </FormItem>
              )} />
            </div>

            {/* 5. Acervo e Gestão */}
            <div className="rounded-md border p-4 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary/60"></div> Acervo e Gestão</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FormField control={form.control} name="drive_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pasta do Drive</FormLabel>
                      <FormControl><Input {...field} placeholder="https://drive.google.com/..." /></FormControl>
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
                <FormField control={form.control} name="caretaker_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vizinho/Cuidador</FormLabel>
                    <FormControl><PartnerSelect value={field.value} onValueChange={field.onChange} className="h-9" roleFilter={["VIZINHO", "DILIGENTE"]} defaultCity={{ state: form.watch("state") || "", city: form.watch("city") || "" }} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="caretaker_payment_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl><Input type="number" min="1" max="31" placeholder="Dia do mês (Ex: 5)" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="col-span-2">
                  <FormField control={form.control} name="caretaker_notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observação Cuidador/Vizinho</FormLabel>
                      <FormControl><Textarea rows={2} {...field} value={field.value || ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="col-span-2">
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Extras</FormLabel>
                      <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 pb-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createProperty.isPending}>
                {createProperty.isPending ? "Cadastrando..." : "Cadastrar Imóvel"}
              </Button>
            </div>

          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
