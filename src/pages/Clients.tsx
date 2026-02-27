import { useMemo, useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Users, Loader2, ArrowLeft, LayoutGrid, TableIcon } from "lucide-react";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, formatPhone } from "@/lib/client-constants";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import ClientKanbanColumn from "@/components/clients/ClientKanbanColumn";
import ClientTable from "@/components/clients/ClientTable";
import NewClientDialog from "@/components/clients/NewClientDialog";
import ClientFilters, { EMPTY_CLIENT_FILTERS, type ClientFilterValues } from "@/components/clients/ClientFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocation } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];
type ViewMode = "kanban" | "table";

export default function Clients() {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { stages: dynamicStages, isLoading: isStagesLoading } = useKanbanStages("client");
  const updateClient = useUpdateClient();
  const [filters, setFilters] = useState<ClientFilterValues>(EMPTY_CLIENT_FILTERS);
  const [activePipeline, setActivePipeline] = useState<ClientPipeline>("inicial");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const location = useLocation();

  const dashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  useEffect(() => {
    if (dashboardFilter) {
      window.history.replaceState({}, "");
    }
  }, []);

  const [activeListView, setActiveListView] = useState<string | null>(dashboardFilter);

  const stagesForPipeline = useMemo(
    () => {
      const stages = dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES;
      return stages.filter(s => s.pipeline === activePipeline);
    },
    [activePipeline, dynamicStages]
  );

  // Dashboard drill-down: active leads
  const activeLeads = useMemo(() => {
    if (!clients || activeListView !== "active") return [];
    const excludedStages: ClientStage[] = ["venda_concretizada", "venda_cancelada", "credito_reprovado"];
    return clients.filter(c => !excludedStages.includes(c.stage));
  }, [clients, activeListView]);

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => {
      if (c.pipeline !== activePipeline) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = c.full_name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.whatsapp ?? "").includes(q) ||
          (c.email ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.temperature && c.temperature !== filters.temperature) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.city && c.city !== filters.city) return false;
      if (filters.work_regime && c.work_regime !== filters.work_regime) return false;
      if (filters.marital_status && c.marital_status !== filters.marital_status) return false;
      if (filters.has_fgts === "true" && !c.has_fgts) return false;
      if (filters.has_fgts === "false" && c.has_fgts) return false;
      if (filters.income_min && (c.income ?? 0) < Number(filters.income_min)) return false;
      if (filters.income_max && (c.income ?? 0) > Number(filters.income_max)) return false;
      return true;
    });
  }, [clients, filters, activePipeline]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    stagesForPipeline.forEach(s => (map[s.value] = []));
    filtered.forEach(c => {
      if (map[c.stage]) map[c.stage]!.push(c);
    });
    return map;
  }, [filtered, stagesForPipeline]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    updateClient.mutate({ id: draggableId, stage: newStage as any });
  };

  const isLoading = isClientsLoading || isStagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Dashboard drill-down list
  if (activeListView === "active") {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveListView(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Kanban
          </Button>
          <h1 className="text-xl font-bold">Leads Ativos</h1>
          <Badge variant="secondary">{activeLeads.length}</Badge>
        </div>
        {activeLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum lead ativo encontrado.</p>
        ) : (
          <div className="space-y-2">
            {activeLeads.map(c => {
              const stage = (dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES).find(s => s.value === c.stage);
              const temp = TEMPERATURE_OPTIONS.find(t => t.value === c.temperature);
              return (
                <Card key={c.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${temp?.color || "bg-muted"}`} />
                      <div>
                        <p className="font-semibold text-sm">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(c.phone || c.whatsapp)} · {stage?.label}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{temp?.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Funil de Clientes
          </h1>
          <p className="text-xs text-muted-foreground">Arraste os cards entre as etapas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activePipeline} onValueChange={v => setActivePipeline(v as ClientPipeline)}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_PIPELINES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="bg-background border rounded-md p-1 h-9">
            <ToggleGroupItem value="kanban" className="px-3 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="px-3 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <TableIcon className="h-4 w-4 mr-2" />
              Tabela
            </ToggleGroupItem>
          </ToggleGroup>
          <NewClientDialog />
        </div>
      </div>

      <ClientFilters
        filters={filters}
        onFiltersChange={setFilters}
        activePipeline={activePipeline}
      />

      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto mt-4">
            <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
              {stagesForPipeline.map(stage => (
                <ClientKanbanColumn
                  key={stage.value}
                  stageId={(stage as any).id}
                  stageValue={stage.value}
                  stageLabel={stage.label}
                  stageColor={stage.color}
                  clients={grouped[stage.value] || []}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 overflow-hidden mt-4">
          <ClientTable clients={filtered} />
        </div>
      )}
    </div>
  );
}
