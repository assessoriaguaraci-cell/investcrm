import { useState, useMemo, useEffect } from "react";
import { CheckSquare, ListFilter, Search, CalendarDays, Kanban as KanbanIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities, useUpdateActivity, useDeleteActivity, type Activity } from "@/hooks/useActivities";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import TaskCard from "@/components/tasks/TaskCard";
import TaskKanbanColumn from "@/components/tasks/TaskKanbanColumn";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { isPast, isToday, format } from "date-fns";
import { useLocation } from "react-router-dom";
import GoogleCalendarView from "@/components/tasks/GoogleCalendarView";

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
  const location = useLocation();
  const dashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  useEffect(() => {
    if (dashboardFilter) {
      window.history.replaceState({}, "");
    }
  }, [dashboardFilter]);

  // Default to "pending" tab when coming from dashboard
  // const defaultTab = dashboardFilter === "pending" ? "pending" : "pending";

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

  const columns = useMemo(() => {
    const overdue = filtered.filter(
      (a) => a.status !== "feito" && a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
    );
    const remaining = filtered.filter(a => !overdue.find(o => o.id === a.id));

    return {
      overdue: overdue,
      todo: remaining.filter(a => a.status === "pendente" || a.status === "atrasado"),
      inProgress: remaining.filter(a => a.status === "em_andamento"),
      done: filtered.filter(a => a.status === "feito")
    };
  }, [filtered]);

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

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const destColumnId = destination.droppableId;

    let updates: any = { id: draggableId };
    const today = new Date().toISOString().split('T')[0];

    if (destColumnId === "done") {
      updates.status = "feito";
      updates.completed_at = new Date().toISOString();
    } else if (destColumnId === "inProgress") {
      updates.status = "em_andamento";
      updates.completed_at = null;
      // If moving OUT of overdue to in-progress, we might want to reset the date to today
      const task = activities?.find(a => a.id === draggableId);
      if (task && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) {
        updates.due_date = today;
      }
    } else if (destColumnId === "todo") {
      updates.status = "pendente";
      updates.completed_at = null;
      const task = activities?.find(a => a.id === draggableId);
      if (task && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) {
        updates.due_date = today;
      }
    } else if (destColumnId === "overdue") {
      // You generally can't move INTO overdue manually without changing the date, 
      // but if they do, we keep it as pending but it will stay overdue if date is past.
      updates.status = "pendente";
      updates.completed_at = null;
    }

    updateActivity.mutate(updates);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Atividades</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Organize suas tarefas no Kanban</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-primary/20"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <ListFilter className="h-4 w-4 mr-2 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NewTaskDialog />
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-slate-100/80 p-1 border border-slate-200 mb-6 self-start">
          <TabsTrigger value="kanban" className="gap-2 px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <KanbanIcon className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar_view" className="gap-2 px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CalendarDays className="h-4 w-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 mt-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-full overflow-x-auto pb-4">
                <TaskKanbanColumn
                  columnId="overdue"
                  title="Atrasadas"
                  tasks={columns.overdue}
                  colorClass="bg-destructive"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                />
                <TaskKanbanColumn
                  columnId="todo"
                  title="A Fazer"
                  tasks={columns.todo}
                  colorClass="bg-slate-400"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                />
                <TaskKanbanColumn
                  columnId="inProgress"
                  title="Em Andamento"
                  tasks={columns.inProgress}
                  colorClass="bg-blue-500"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                />
                <TaskKanbanColumn
                  columnId="done"
                  title="Concluídas"
                  tasks={columns.done}
                  colorClass="bg-primary"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                />
              </div>
            </DragDropContext>
          )}
        </TabsContent>

        <TabsContent value="calendar_view" className="flex-1 mt-0 overflow-auto">
          <GoogleCalendarView />
        </TabsContent>
      </Tabs>

      <EditTaskDialog
        activity={editActivity}
        open={!!editActivity}
        onOpenChange={(o) => !o && setEditActivity(null)}
      />
    </div>
  );
}
