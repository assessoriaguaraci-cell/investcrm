import { Droppable } from "@hello-pangea/dnd";
import PropertyCard from "./PropertyCard";
import ColumnColorPicker from "../kanban/ColumnColorPicker";
import EditableColumnName from "../kanban/EditableColumnName";
import type { Property } from "@/hooks/useProperties";
import { formatCurrency } from "@/lib/property-constants";
import { CardSettings } from "@/pages/Properties";
import { GripVertical } from "lucide-react";

interface Props {
  stageId?: string;
  stageValue: string;
  stageLabel: string;
  stageColor: string;
  properties: Property[];
  cardSettings: CardSettings;
  dragHandleProps?: any;
}

export default function KanbanColumn({ stageId, stageValue, stageLabel, stageColor, properties, cardSettings, dragHandleProps }: Props) {
  // Sum final_sale_price for all properties in this stage
  const totalValue = properties.reduce((sum, p) => sum + (p.final_sale_price || 0), 0);

  // Extracting the CSS variable name from the stageColor string (e.g., "bg-[hsl(var(--stage-pre-auction))]")
  const colorVar = stageColor.match(/var\(([^)]+)\)/)?.[1];
  const bgColor = colorVar ? `hsl(var(${colorVar}) / 0.1)` : undefined;
  const borderColor = colorVar ? `hsl(var(${colorVar}) / 0.2)` : undefined;
  const headerBgColor = colorVar ? `hsl(var(${colorVar}) / 0.15)` : undefined;

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0">
      <div
        className="flex flex-col mb-3 px-3 py-2 rounded-t-lg border-b-2 group/header"
        style={{
          backgroundColor: headerBgColor,
          borderBottomColor: colorVar ? `hsl(var(${colorVar}))` : 'transparent'
        }}
        {...dragHandleProps}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/header:text-primary/50 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
          <ColumnColorPicker
            stageId={stageId}
            stageValue={stageValue}
            stageLabel={stageLabel}
            currentColor={stageColor}
            funnelType="property"
          />
          <EditableColumnName
            stageId={stageId}
            stageValue={stageValue}
            initialLabel={stageLabel}
            funnelType="property"
          />
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/50">
            {properties.length}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-bold text-foreground/70 flex justify-between items-center">
          <span className="opacity-80">VALOR DE VENDA</span>
          <span className="text-primary font-extrabold">{formatCurrency(totalValue)}</span>
        </div>
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
                <PropertyCard key={p.id} property={p} index={i} cardSettings={cardSettings} />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
