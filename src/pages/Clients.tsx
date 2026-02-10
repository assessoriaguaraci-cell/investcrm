import { useMemo, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Users, Loader2 } from "lucide-react";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES } from "@/lib/client-constants";
import ClientKanbanColumn from "@/components/clients/ClientKanbanColumn";
import NewClientDialog from "@/components/clients/NewClientDialog";
import ClientFilters, { EMPTY_CLIENT_FILTERS, type ClientFilterValues } from "@/components/clients/ClientFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const updateClient = useUpdateClient();
  const [filters, setFilters] = useState<ClientFilterValues>(EMPTY_CLIENT_FILTERS);
  const [activePipeline, setActivePipeline] = useState<ClientPipeline>("inicial");

  const stagesForPipeline = useMemo(
    () => CLIENT_STAGES.filter(s => s.pipeline === activePipeline),
    [activePipeline]
  );

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
    const newStage = destination.droppableId as ClientStage;
    updateClient.mutate({ id: draggableId, stage: newStage });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <NewClientDialog />
        </div>
      </div>

      <ClientFilters filters={filters} onFiltersChange={setFilters} />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto mt-4">
          <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
            {stagesForPipeline.map(stage => (
              <ClientKanbanColumn
                key={stage.value}
                stageValue={stage.value}
                stageLabel={stage.label}
                stageColor={stage.color}
                clients={grouped[stage.value] || []}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
