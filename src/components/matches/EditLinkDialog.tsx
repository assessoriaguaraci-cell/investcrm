import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateLink, useDeleteLink, type LinkWithRelations } from "@/hooks/useClientPropertyLinks";
import { LINK_STATUSES } from "@/lib/link-constants";
import type { Database } from "@/integrations/supabase/types";

type LinkStatus = Database["public"]["Enums"]["link_status"];

interface Props {
  link: LinkWithRelations;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function EditLinkDialog({ link, open, onOpenChange }: Props) {
  const [status, setStatus] = useState<LinkStatus>(link.status);
  const [proposalValue, setProposalValue] = useState(link.proposal_value?.toString() ?? "");
  const [proposalDate, setProposalDate] = useState(link.proposal_date ?? "");
  const [notes, setNotes] = useState(link.notes ?? "");

  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();

  const handleSave = () => {
    updateLink.mutate(
      {
        id: link.id,
        status,
        proposal_value: proposalValue ? Number(proposalValue) : null,
        proposal_date: proposalDate || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Vínculo atualizado");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja excluir este vínculo?")) return;
    deleteLink.mutate(link.id, {
      onSuccess: () => {
        toast.success("Vínculo excluído");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vínculo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
            <p><span className="font-medium">Cliente:</span> {link.clients?.full_name ?? "—"}</p>
            <p><span className="font-medium">Imóvel:</span> {link.properties?.code ?? "—"} — {link.properties?.city ?? ""}</p>
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" disabled={updateLink.isPending}>
              {updateLink.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleteLink.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
