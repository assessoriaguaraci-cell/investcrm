import { Droppable } from "@hello-pangea/dnd";
import PropertyCard from "./PropertyCard";
import type { Property } from "@/hooks/useProperties";

interface Props {
  stageValue: string;
  stageLabel: string;
  stageColor: string;
  properties: Property[];
}

export default function KanbanColumn({ stageValue, stageLabel, stageColor, properties }: Props) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-3 h-3 rounded-full ${stageColor}`} />
        <h3 className="text-sm font-semibold truncate">{stageLabel}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {properties.length}
        </span>
      </div>

      <Droppable droppableId={stageValue}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-lg p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5 border border-dashed border-primary/30" : "bg-muted/30"
            }`}
          >
            {properties.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
