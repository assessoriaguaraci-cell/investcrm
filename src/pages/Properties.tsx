import { useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Building2, Loader2 } from "lucide-react";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import KanbanColumn from "@/components/properties/KanbanColumn";
import NewPropertyDialog from "@/components/properties/NewPropertyDialog";
import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

export default function Properties() {
  const { data: properties, isLoading } = useProperties();
  const updateProperty = useUpdateProperty();

  const grouped = useMemo(() => {
    const map: Record<string, typeof properties> = {};
    PROPERTY_STAGES.forEach(s => (map[s.value] = []));
    properties?.forEach(p => {
      if (map[p.stage]) map[p.stage]!.push(p);
    });
    return map;
  }, [properties]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId as PropertyStage;
    updateProperty.mutate({ id: draggableId, stage: newStage });
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Funil de Imóveis
          </h1>
          <p className="text-xs text-muted-foreground">Arraste os cards entre as etapas</p>
        </div>
        <NewPropertyDialog />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
            {PROPERTY_STAGES.map(stage => (
              <KanbanColumn
                key={stage.value}
                stageValue={stage.value}
                stageLabel={stage.label}
                stageColor={stage.color}
                properties={grouped[stage.value] || []}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
