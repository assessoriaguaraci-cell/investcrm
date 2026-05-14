import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, ListFilter, Search, CalendarDays, Kanban as KanbanIcon, Trash2, CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import MultiSelectFilter from "@/components/properties/MultiSelectFilter";
import { SavedFiltersButton } from "@/components/ui/saved-filters-button";

export interface TaskFilterValues {
  types: string[];
}

export const EMPTY_TASK_FILTERS: TaskFilterValues = {
  types: [],
};

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
  const qc = useQueryClient();
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
  const [filters, setFilters] = useState<TaskFilterValues>(EMPTY_TASK_FILTERS);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionModeActive, setSelectionModeActive] = useState(false);

  const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
    if (selected.length === 0) return true; // "all"
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value || "");
  };

  const filtered = useMemo(() => {
    if (!activities) return [];
    return activities.filter((a) => {
      if (!matchesMultiSelect(a.activity_type, filters.types)) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchClient = a.clients?.full_name?.toLowerCase().includes(q);
        const matchProperty = a.properties?.code?.toLowerCase().includes(q);
        if (!matchDesc && !matchClient && !matchProperty) return false;
      }
      return true;
    });
  }, [activities, search, filters]);

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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.length} tarefas selecionadas?`)) return;
    
    try {
      const { error } = await supabase
        .from("activities")
        .delete()
        .in("id", selectedIds);
      
      if (error) throw error;
      
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success(`${selectedIds.length} tarefas excluídas com sucesso`);
    } catch (e: any) {
      console.error("Error bulk deleting:", e);
      toast.error("Erro ao excluir tarefas: " + (e.message || "Erro desconhecido"));
    }
  };

  const handleBulkMarkDone = async () => {
    try {
      const { error } = await supabase
        .from("activities")
        .update({
          status: "feito",
          completed_at: new Date().toISOString()
        })
        .in("id", selectedIds);
      
      if (error) throw error;
      
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success(`${selectedIds.length} tarefas marcadas como concluídas`);
    } catch (e: any) {
      console.error("Error bulk completing:", e);
      toast.error("Erro ao concluir tarefas: " + (e.message || "Erro desconhecido"));
    }
  };

  const handleBulkMove = async (destColumnId: string) => {
    try {
      let updates: any = {};
      
      if (destColumnId === "done") {
        updates.status = "feito";
        updates.completed_at = new Date().toISOString();
      } else if (destColumnId === "inProgress") {
        updates.status = "em_andamento";
        updates.completed_at = null;
      } else if (destColumnId === "todo") {
        updates.status = "pendente";
        updates.completed_at = null;
      }
      
      const { error } = await supabase
        .from("activities")
        .update(updates)
        .in("id", selectedIds);
      
      if (error) throw error;
      
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success(`${selectedIds.length} tarefas movidas com sucesso`);
    } catch (e: any) {
      console.error("Error bulk moving:", e);
      toast.error("Erro ao mover tarefas: " + (e.message || "Erro desconhecido"));
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none font-heading">
                Gestão de Atividades
              </h1>
              <p className="text-[10px] text-white/60 font-black uppercase tracking-wider font-body">Organize suas tarefas e compromissos</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-white/60 uppercase">A Fazer</p>
              <p className="text-sm font-black text-white">{(columns.todo.length + columns.overdue.length + columns.inProgress.length)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white/60 uppercase">Concluídas</p>
              <p className="text-sm font-black text-orange-500">{columns.done.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border focus-visible:ring-primary/20"
            />
          </div>
          <div className="w-[220px]">
            <MultiSelectFilter
              label="Tipos"
              options={TYPE_OPTIONS.filter(o => o.value !== "all").map(o => ({ value: o.value, label: o.label }))}
              selected={filters.types}
              onSelectionChange={v => setFilters({ ...filters, types: v })}
              placeholder="Todos os tipos"
            />
          </div>
          <SavedFiltersButton
            entityType="tasks"
            currentFilters={filters}
            emptyFilters={EMPTY_TASK_FILTERS}
            onLoadFilter={setFilters}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={selectionModeActive ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectionModeActive(!selectionModeActive);
              if (!selectionModeActive) setSelectedIds([]);
            }}
            className={cn(
              "h-9 gap-1.5 font-black uppercase text-[10px] tracking-tight shadow-sm transition-all",
              selectionModeActive ? "bg-orange-600 hover:bg-orange-700 text-white border-none" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
            )}
          >
            <CheckSquare className="h-4 w-4 text-orange-500" />
            {selectionModeActive ? "Sair" : "Massa"}
          </Button>
          <NewTaskDialog />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-primary text-white font-black px-3 py-1">
              {selectedIds.length} SELECIONADAS
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-xs font-black uppercase tracking-tight">
              Desmarcar Todas
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkMarkDone} className="gap-2 text-[10px] font-black uppercase">
              <CheckSquare className="h-3.5 w-3.5" /> Concluir
            </Button>
            <Select onValueChange={handleBulkMove}>
              <SelectTrigger className="w-[140px] h-9 text-[10px] font-black uppercase">
                <SelectValue placeholder="MOVER PARA..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">A FAZER</SelectItem>
                <SelectItem value="inProgress">EM ANDAMENTO</SelectItem>
                <SelectItem value="done">CONCLUÍDAS</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2 text-[10px] font-black uppercase">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-muted/50 p-1 border border-border mb-6 self-start">
          <TabsTrigger value="kanban" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <KanbanIcon className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar_view" className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
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
              <div className="flex gap-4 h-full overflow-x-auto overflow-y-auto pb-4 items-stretch custom-scrollbar">
                <TaskKanbanColumn
                  columnId="overdue"
                  title="Atrasadas"
                  tasks={columns.overdue}
                  colorClass="bg-destructive"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  selectable={selectionModeActive}
                />
                <TaskKanbanColumn
                  columnId="todo"
                  title="A Fazer"
                  tasks={columns.todo}
                  colorClass="bg-slate-400"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  selectable={selectionModeActive}
                />
                <TaskKanbanColumn
                  columnId="inProgress"
                  title="Em Andamento"
                  tasks={columns.inProgress}
                  colorClass="bg-blue-500"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  selectable={selectionModeActive}
                />
                <TaskKanbanColumn
                  columnId="done"
                  title="Concluídas"
                  tasks={columns.done}
                  colorClass="bg-primary"
                  onToggle={handleToggle}
                  onEdit={setEditActivity}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  selectable={selectionModeActive}
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
