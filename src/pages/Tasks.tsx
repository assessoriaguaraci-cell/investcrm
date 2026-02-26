import { useState, useMemo, useEffect } from "react";
import { CheckSquare, ListFilter, Search, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities, useUpdateActivity, useDeleteActivity, type Activity } from "@/hooks/useActivities";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import TaskCard from "@/components/tasks/TaskCard";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";
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
  }, []);

  // Default to "pending" tab when coming from dashboard
  const defaultTab = dashboardFilter === "pending" ? "pending" : "pending";

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
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Atividades</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Organize suas tarefas e acompanhe sua agenda</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 border border-slate-200">
          <TabsTrigger value="list" className="gap-2 px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CheckSquare className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="calendar_view" className="gap-2 px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CalendarDays className="h-4 w-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar tarefa, cliente ou imóvel..."
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

          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Suas Atividades</h2>
              <Badge variant="secondary" className="ml-1 bg-slate-200/50 text-slate-600 border-none">
                {pending.length} pendente{pending.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs defaultValue={defaultTab} className="bg-transparent">
                <TabsList className="bg-transparent p-0 gap-4 mb-4 border-b border-slate-200 w-full justify-start rounded-none h-auto">
                  <TabsTrigger 
                    value="pending" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 font-semibold text-slate-500 data-[state=active]:text-primary shadow-none"
                  >
                    Pendentes ({pending.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="done"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 font-semibold text-slate-500 data-[state=active]:text-primary shadow-none"
                  >
                    Concluídas ({done.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0">
                  {overdue.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-3 flex items-center gap-2">
                        Atrasadas
                        <div className="h-px flex-1 bg-destructive/10" />
                      </h3>
                      {renderList(overdue, "")}
                    </div>
                  )}
                  {today.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                        Hoje
                        <div className="h-px flex-1 bg-primary/10" />
                      </h3>
                      {renderList(today, "")}
                    </div>
                  )}
                  <div>
                    {(overdue.length > 0 || today.length > 0) && upcoming.length > 0 && (
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        Próximas
                        <div className="h-px flex-1 bg-slate-200" />
                      </h3>
                    )}
                    {renderList(upcoming, "Nenhuma tarefa pendente")}
                  </div>
                </TabsContent>

                <TabsContent value="done" className="mt-0">
                  {renderList(done, "Nenhuma tarefa concluída")}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar_view" className="mt-0">
          <GoogleCalendarView />
        </TabsContent>
      </Tabs>

      <EditTaskDialog activity={editActivity} open={!!editActivity} onOpenChange={(o) => !o && setEditActivity(null)} />
    </div>
  );
}
