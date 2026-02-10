import { useState, useMemo } from "react";
import { CheckSquare, ListFilter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities, useUpdateActivity, useDeleteActivity, type Activity } from "@/hooks/useActivities";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import TaskCard from "@/components/tasks/TaskCard";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";

const TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reunião" },
  { value: "documentacao", label: "Documentação" },
  { value: "lembrete", label: "Lembrete" },
  { value: "outro", label: "Outro" },
];

export default function Tasks() {
  const { data: activities, isLoading } = useActivities();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

  const filtered = useMemo(() => {
    if (!activities) return [];
    return activities.filter((a) => {
      if (typeFilter !== "all" && a.activity_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchClient = a.clients?.full_name?.toLowerCase().includes(q);
        const matchProperty = a.properties?.code?.toLowerCase().includes(q);
        if (!matchDesc && !matchClient && !matchProperty) return false;
      }
      return true;
    });
  }, [activities, search, typeFilter]);

  const pending = filtered.filter((a) => a.status !== "feito");
  const overdue = pending.filter(
    (a) => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  );
  const today = pending.filter((a) => a.due_date && isToday(new Date(a.due_date)));
  const upcoming = pending.filter(
    (a) => !overdue.includes(a) && !today.includes(a)
  );
  const done = filtered.filter((a) => a.status === "feito");

  const handleToggle = (activity: Activity) => {
    const newStatus = activity.status === "feito" ? "pendente" : "feito";
    updateActivity.mutate(
      {
        id: activity.id,
        status: newStatus,
        completed_at: newStatus === "feito" ? new Date().toISOString() : null,
      },
      {
        onSuccess: () => toast.success(newStatus === "feito" ? "Tarefa concluída" : "Tarefa reaberta"),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteActivity.mutate(id, {
      onSuccess: () => toast.success("Tarefa excluída"),
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  const renderList = (items: Activity[], emptyText: string) =>
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {items.map((a) => (
          <TaskCard key={a.id} activity={a} onToggle={handleToggle} onEdit={setEditActivity} onDelete={handleDelete} />
        ))}
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pendente{pending.length !== 1 ? "s" : ""}
            {overdue.length > 0 && <span className="text-destructive ml-1">· {overdue.length} atrasada{overdue.length !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <NewTaskDialog />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Buscar tarefa, cliente ou imóvel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <ListFilter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
            <TabsTrigger value="done">Concluídas ({done.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {overdue.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Atrasadas</h3>
                {renderList(overdue, "")}
              </div>
            )}
            {today.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Hoje</h3>
                {renderList(today, "")}
              </div>
            )}
            <div>
              {(overdue.length > 0 || today.length > 0) && upcoming.length > 0 && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Próximas</h3>
              )}
              {renderList(upcoming, "Nenhuma tarefa pendente")}
            </div>
          </TabsContent>

          <TabsContent value="done">
            {renderList(done, "Nenhuma tarefa concluída")}
          </TabsContent>
        </Tabs>
      )}

      <EditTaskDialog activity={editActivity} open={!!editActivity} onOpenChange={(o) => !o && setEditActivity(null)} />
    </div>
  );
}
