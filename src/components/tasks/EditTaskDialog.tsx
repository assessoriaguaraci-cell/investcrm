import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateActivity, type Activity } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useProperties } from "@/hooks/useProperties";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reunião" },
  { value: "documentacao", label: "Documentação" },
  { value: "lembrete", label: "Lembrete" },
  { value: "outro", label: "Outro" },
];

interface Props {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTaskDialog({ activity, open, onOpenChange }: Props) {
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("lembrete");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"pendente" | "feito" | "atrasado">("pendente");

  const updateActivity = useUpdateActivity();
  const { data: clients } = useClients();
  const { data: properties } = useProperties();

  useEffect(() => {
    if (activity) {
      setDescription(activity.description);
      setActivityType(activity.activity_type);
      setDueDate(activity.due_date?.split("T")[0] || "");
      setClientId(activity.client_id || "");
      setPropertyId(activity.property_id || "");
      setNotes(activity.notes || "");
      setStatus(activity.status);
    }
  }, [activity]);

  const handleSubmit = () => {
    if (!activity || !description.trim()) return;
    updateActivity.mutate(
      {
        id: activity.id,
        description: description.trim(),
        activity_type: activityType,
        due_date: dueDate || null,
        client_id: clientId && clientId !== "none" ? clientId : null,
        property_id: propertyId && propertyId !== "none" ? propertyId : null,
        notes: notes.trim() || null,
        status,
        completed_at: status === "feito" ? new Date().toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success("Tarefa atualizada");
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao atualizar tarefa"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "pendente" | "feito" | "atrasado")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="feito">Feito</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={clientId || "none"} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Imóvel</Label>
            <Select value={propertyId || "none"} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} — {p.city || "Sem cidade"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={!description.trim() || updateActivity.isPending} className="w-full">
            {updateActivity.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
