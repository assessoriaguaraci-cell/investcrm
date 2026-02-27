import { Droppable } from "@hello-pangea/dnd";
import PropertyCard from "./PropertyCard";
import ColumnColorPicker from "../kanban/ColumnColorPicker";
import EditableColumnName from "../kanban/EditableColumnName";
import type { Property } from "@/hooks/useProperties";

interface Props {
  stageId?: string;
  stageValue: string;
  stageLabel: string;
  stageColor: string;
  properties: Property[];
}

export default function KanbanColumn({ stageId, stageValue, stageLabel, stageColor, properties }: Props) {
  // Extracting the CSS variable name from the stageColor string (e.g., "bg-[hsl(var(--stage-pre-auction))]")
  const colorVar = stageColor.match(/var\(([^)]+)\)/)?.[1];
  const bgColor = colorVar ? `hsl(var(${colorVar}) / 0.1)` : undefined;
  const borderColor = colorVar ? `hsl(var(${colorVar}) / 0.2)` : undefined;
  const headerBgColor = colorVar ? `hsl(var(${colorVar}) / 0.15)` : undefined;

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0">
      <div
        className="flex items-center gap-2 mb-3 px-3 py-2 rounded-t-lg border-b-2"
        style={{
          backgroundColor: headerBgColor,
          borderBottomColor: colorVar ? `hsl(var(${colorVar}))` : 'transparent'
        }}
      >
        <ColumnColorPicker
          stageId={stageId}
          stageValue={stageValue}
          stageLabel={stageLabel}
          currentColor={stageColor}
          funnelType="property"
        />
        <EditableColumnName
          stageId={stageId}
          initialLabel={stageLabel}
          funnelType="property"
        />
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/50">
          {properties.length}
        </span>
      </div>

      <Droppable droppableId={stageValue}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-b-lg p-2 transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-primary/20 ring-inset" : ""
              }`}
            style={{
              backgroundColor: snapshot.isDraggingOver ? undefined : bgColor,
              border: snapshot.isDraggingOver ? "1px dashed hsl(var(--primary))" : `1px solid ${borderColor || 'transparent'}`,
              borderTop: 'none'
            }}
          >
            <div className="space-y-3">
              {properties.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
