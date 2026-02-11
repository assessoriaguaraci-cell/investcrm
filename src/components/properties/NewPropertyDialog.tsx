import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateProperty } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import CityCombobox from "./CityCombobox";
import ResponsibleSelect from "./ResponsibleSelect";
import { toast } from "sonner";

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
});

type FormValues = z.infer<typeof schema>;

export default function NewPropertyDialog() {
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
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createProperty.mutateAsync({
        ...values,
        code: values.code || "",
        responsible_user_id: values.responsible_user_id || user?.id || null,
        state: values.state,
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
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Código (opcional — gerado automaticamente se vazio)</FormLabel>
                <FormControl><Input {...field} placeholder="Ex: IL-2026-0001" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
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
            </div>

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
                <FormControl><Input {...field} placeholder="https://drive.google.com/..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
                      onSelect={d => field.onChange(d ? format(d, "yyyy-MM-dd") : undefined)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="purchase_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Arrematação (R$)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="listed_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Anúncio (R$)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="area_total" render={({ field }) => (
                <FormItem>
                  <FormLabel>Área Total (m²)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="area_useful" render={({ field }) => (
                <FormItem>
                  <FormLabel>Área Útil (m²)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
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
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createProperty.isPending}>
                {createProperty.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
