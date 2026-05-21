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
import { supabase } from "@/integrations/supabase/client";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

export interface TaskFilterValues {
  types: string[];
  responsibles: string[];
  createdFrom: string | null;
  createdTo: string | null;
  dueFrom: string | null;
  dueTo: string | null;
}

export const EMPTY_TASK_FILTERS: TaskFilterValues = {
  types: [],
  responsibles: [],
  createdFrom: null,
  createdTo: null,
  dueFrom: null,
  dueTo: null,
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

import TaskFilters from "@/components/tasks/TaskFilters";

export default function Tasks() {
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

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

  // Silently trigger monthly neighbor recurrence sync on mount
  useEffect(() => {
    supabase.rpc('sync_vizinho_reminders')
      .then(() => {
        qc.invalidateQueries({ queryKey: ["activities"] });
      })
      .catch((err) => {
        console.error("Erro ao sincronizar lembretes de vizinhos:", err);
      });
  }, []);

  // Default to "pending" tab when coming from dashboard
  // const defaultTab = dashboardFilter === "pending" ? "pending" : "pending";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TaskFilterValues>(EMPTY_TASK_FILTERS);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const { data: members = [] } = useApprovedMembers();
  const [selectedMemberTab, setSelectedMemberTab] = useState<string>("todos");

  const getMemberPendingCount = (memberUserId: string) => {
    if (!activities) return 0;
    return activities.filter(a => a.status !== "feito" && a.responsible_user_id === memberUserId).length;
  };

  const getAllPendingCount = () => {
    if (!activities) return 0;
    return activities.filter(a => a.status !== "feito").length;
  };

  const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
    if (selected.length === 0) return true; // "all"
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value || "");
  };

  const filtered = useMemo(() => {
    if (!activities) return [];
    return activities.filter((a) => {
      // Tipos
      if (!matchesMultiSelect(a.activity_type, filters.types)) return false;
      
      // Responsável
      if (!matchesMultiSelect(a.responsible_user_id, filters.responsibles)) return false;

      // Top overlap fichário tab filtering
      if (selectedMemberTab !== "todos" && a.responsible_user_id !== selectedMemberTab) return false;
      
      // Data de Criação
      if (filters.createdFrom || filters.createdTo) {
        const createdDate = a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : null;
        if (createdDate) {
          if (filters.createdFrom && createdDate < filters.createdFrom) return false;
          if (filters.createdTo && createdDate > filters.createdTo) return false;
        } else {
           // if filtering by date and item has no date, it's filtered out
           return false;
        }
      }

      // Prazo (Vencimento)
      if (filters.dueFrom || filters.dueTo) {
        const dueDate = a.due_date;
        if (dueDate) {
          if (filters.dueFrom && dueDate < filters.dueFrom) return false;
          if (filters.dueTo && dueDate > filters.dueTo) return false;
        } else {
           // if filtering by date and item has no date, it's filtered out
           return false;
        }
      }

      // Busca por Texto
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchClient = a.clients?.full_name?.toLowerCase().includes(q);
        const matchProperty = a.properties?.code?.toLowerCase().includes(q);
        if (!matchDesc && !matchClient && !matchProperty) return false;
      }
      return true;
    });
  }, [activities, search, filters, selectedMemberTab]);

  const columns = useMemo(() => {
    const overdue = filtered.filter(
      (a) => a.status !== "feito" && a.due_date && isPast(parseLocalDate(a.due_date)) && !isToday(parseLocalDate(a.due_date))
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
      if (task && task.due_date && isPast(parseLocalDate(task.due_date)) && !isToday(parseLocalDate(task.due_date))) {
        updates.due_date = today;
      }
    } else if (destColumnId === "todo") {
      updates.status = "pendente";
      updates.completed_at = null;
      const task = activities?.find(a => a.id === draggableId);
      if (task && task.due_date && isPast(parseLocalDate(task.due_date)) && !isToday(parseLocalDate(task.due_date))) {
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

  const handleSelectAll = (ids: string[], selected: boolean) => {
    if (selected) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    }
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
      const today = new Date().toISOString().split('T')[0];
      
      for (const id of selectedIds) {
        let updates: any = {};
        const task = activities?.find(a => a.id === id);
        
        if (destColumnId === "done") {
          updates.status = "feito";
          updates.completed_at = new Date().toISOString();
        } else {
          updates.completed_at = null;
          if (destColumnId === "inProgress") {
            updates.status = "em_andamento";
          } else if (destColumnId === "todo" || destColumnId === "overdue") {
            updates.status = "pendente";
          }
          
          // If moving OUT of overdue view to a non-done status, reset date to today
          if (task && task.due_date && isPast(parseLocalDate(task.due_date)) && !isToday(parseLocalDate(task.due_date))) {
             if (destColumnId !== "overdue") {
               updates.due_date = today;
             }
          }
        }
        
        const { error } = await supabase
          .from("activities")
          .update(updates)
          .eq("id", id);
        
        if (error) throw error;
      }
      
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
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                Gestão de Atividades
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider font-body">Organize suas tarefas e compromissos</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6 border-l border-border pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">A Fazer</p>
              <p className="text-sm font-black text-foreground">{(columns.todo.length + columns.overdue.length + columns.inProgress.length)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Concluídas</p>
              <p className="text-sm font-black text-orange-500">{columns.done.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-1 gap-2 items-start max-w-full lg:max-w-[70%]">
          <div className="flex-1 w-full">
            <TaskFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              search={search}
              onSearchChange={setSearch}
              emptyFilters={EMPTY_TASK_FILTERS}
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
              selectionModeActive ? "bg-orange-600 hover:bg-orange-700 text-white border-none" : "bg-muted text-foreground border-border hover:bg-muted/80"
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
                <SelectItem value="overdue">ATRASADAS</SelectItem>
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

        <TabsContent value="kanban" className="flex-1 mt-0 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
              {/* Overlapping File Folder Fichário Tab Row */}
              <div className="flex flex-wrap items-end pl-1 pr-1 border-b border-border/60 mb-4 shrink-0 gap-1.5 overflow-x-auto custom-scrollbar select-none pb-[1px]">
                {/* All Tab */}
                <div 
                  onClick={() => setSelectedMemberTab("todos")}
                  className={cn(
                    "relative px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-2xl border-t border-x cursor-pointer transition-all duration-200 flex items-center gap-2 shrink-0 select-none",
                    selectedMemberTab === "todos" 
                      ? "bg-[#F1F2F4] dark:bg-muted/30 border-border/60 text-foreground z-10 -mb-[1px] h-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)]"
                      : "bg-muted/20 hover:bg-muted/40 border-border/30 text-muted-foreground hover:text-foreground h-9"
                  )}
                >
                  <span>📋 Todos</span>
                  <span className={cn(
                    "text-[9px] font-black rounded-full px-1.5 py-0.5 transition-colors",
                    selectedMemberTab === "todos" ? "bg-primary text-white" : "bg-muted dark:bg-muted/50 text-muted-foreground"
                  )}>
                    {getAllPendingCount()}
                  </span>
                </div>

                {/* Member Tabs */}
                {members.map(member => {
                  const count = getMemberPendingCount(member.user_id);
                  return (
                    <div 
                      key={member.user_id}
                      onClick={() => setSelectedMemberTab(member.user_id)}
                      className={cn(
                        "relative px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-2xl border-t border-x cursor-pointer transition-all duration-200 flex items-center gap-2 shrink-0 select-none",
                        selectedMemberTab === member.user_id 
                          ? "bg-[#F1F2F4] dark:bg-muted/30 border-border/60 text-foreground z-10 -mb-[1px] h-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)]"
                          : "bg-muted/20 hover:bg-muted/40 border-border/30 text-muted-foreground hover:text-foreground h-9"
                      )}
                    >
                      <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px] border border-primary/20 shrink-0">
                        {member.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{member.full_name}</span>
                      <span className={cn(
                        "text-[9px] font-black rounded-full px-1.5 py-0.5 transition-colors",
                        selectedMemberTab === member.user_id ? "bg-primary text-white" : "bg-muted dark:bg-muted/50 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Trello Board columns */}
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 items-stretch custom-scrollbar min-h-0">
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
                  onSelectAll={handleSelectAll}
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
                  onSelectAll={handleSelectAll}
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
                  onSelectAll={handleSelectAll}
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
                  onSelectAll={handleSelectAll}
                  selectable={selectionModeActive}
                />
              </div>
              </DragDropContext>
            </div>
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
