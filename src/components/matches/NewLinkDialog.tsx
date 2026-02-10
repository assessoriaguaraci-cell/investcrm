import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/hooks/useClients";
import { useProperties } from "@/hooks/useProperties";
import { useCreateLink } from "@/hooks/useClientPropertyLinks";
import { LINK_STATUSES } from "@/lib/link-constants";
import { formatCurrency } from "@/lib/property-constants";
import type { Database } from "@/integrations/supabase/types";

type LinkStatus = Database["public"]["Enums"]["link_status"];

export default function NewLinkDialog() {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState<LinkStatus>("interessado");
  const [proposalValue, setProposalValue] = useState("");
  const [proposalDate, setProposalDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clients } = useClients();
  const { data: properties } = useProperties();
  const createLink = useCreateLink();

  const reset = () => {
    setClientId("");
    setPropertyId("");
    setStatus("interessado");
    setProposalValue("");
    setProposalDate("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!clientId || !propertyId) {
      toast.error("Selecione um cliente e um imóvel");
      return;
    }
    createLink.mutate(
      {
        client_id: clientId,
        property_id: propertyId,
        status,
        proposal_value: proposalValue ? Number(proposalValue) : null,
        proposal_date: proposalDate || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Vínculo criado com sucesso");
          reset();
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Vínculo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Vínculo Cliente ↔ Imóvel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Imóvel *</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Selecione o imóvel" /></SelectTrigger>
              <SelectContent>
                {properties?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} — {p.city ?? "Sem cidade"} {p.listed_price ? `(${formatCurrency(p.listed_price)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LinkStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINK_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor da Proposta</Label>
              <Input type="number" placeholder="0" value={proposalValue} onChange={e => setProposalValue(e.target.value)} />
            </div>
            <div>
              <Label>Data da Proposta</Label>
              <Input type="date" value={proposalDate} onChange={e => setProposalDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={createLink.isPending}>
            {createLink.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Criar Vínculo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
