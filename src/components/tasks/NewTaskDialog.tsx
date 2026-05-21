import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateActivity } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useProperties } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
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

export default function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("lembrete");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [notes, setNotes] = useState("");

  const { user } = useAuth();
  const createActivity = useCreateActivity();
  const { data: clients } = useClients();
  const { data: properties } = useProperties();
  const { data: members } = useApprovedMembers();
  const selectedProperty = propertyId && propertyId !== "none"
    ? properties?.find((p) => p.id === propertyId)
    : null;

  // Auto-set responsible when property changes
  useEffect(() => {
    if (selectedProperty?.responsible_user_id) {
      setResponsibleUserId(selectedProperty.responsible_user_id);
    } else if (user) {
      setResponsibleUserId(user.id);
    }
  }, [propertyId, selectedProperty, user]);

  const handleSubmit = () => {
    if (!description.trim() || !user) return;
    const responsibleId = responsibleUserId || user.id;
    createActivity.mutate(
      {
        description: description.trim(),
        activity_type: activityType,
        due_date: dueDate || null,
        client_id: clientId && clientId !== "none" ? clientId : null,
        property_id: propertyId && propertyId !== "none" ? propertyId : null,
        notes: notes.trim() || null,
        created_by: user.id,
        responsible_user_id: responsibleId,
        status: "pendente",
      },
      {
        onSuccess: () => {
          toast.success("Tarefa criada");
          setDescription("");
          setActivityType("lembrete");
          setDueDate("");
          setClientId("");
          setPropertyId("");
          setNotes("");
          setOpen(false);
        },
        onError: () => toast.error("Erro ao criar tarefa"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="btn-new-task" size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-tight shadow-md">
          <Plus className="h-4 w-4" /> Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva a tarefa" />
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
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
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
            <Label>Imóvel (opcional)</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
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
            <Label>Responsável</Label>
            <Select value={responsibleUserId || "none"} onValueChange={(v) => setResponsibleUserId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={!description.trim() || createActivity.isPending} className="w-full">
            {createActivity.isPending ? "Salvando..." : "Criar Tarefa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
