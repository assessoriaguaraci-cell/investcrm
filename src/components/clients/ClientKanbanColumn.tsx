import { Droppable } from "@hello-pangea/dnd";
import ClientCard from "./ClientCard";
import ColumnColorPicker from "../kanban/ColumnColorPicker";
import EditableColumnName from "../kanban/EditableColumnName";
import type { Client } from "@/hooks/useClients";
import { formatCurrency } from "@/lib/property-constants";
import { useClientPropertyLinks } from "@/hooks/useClientPropertyLinks";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";

interface Props {
  stageId?: string;
  stageValue: string;
  stageLabel: string;
  stageColor: string;
  pipeline?: string;
  clients: Client[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string, selected: boolean) => void;
  onSelectAll?: (ids: string[], selected: boolean) => void;
  dragHandleProps?: any;
}

export default function ClientKanbanColumn({ stageId, stageValue, stageLabel, stageColor, pipeline, clients, selectable, selectedIds, onSelect, onSelectAll, dragHandleProps }: Props) {
  const { data: links = [] } = useClientPropertyLinks();

  // Calculate total final_sale_price for all clients in this column
  const totalValue = clients.reduce((sum, client) => {
    // Get all links for this client
    const clientLinks = links.filter(l => l.client_id === client.id);
    // Sum final_sale_price from the properties associated with those links
    const clientTotal = clientLinks.reduce((cSum, link) => {
      return cSum + (link.properties?.final_sale_price || 0);
    }, 0);
    return sum + clientTotal;
  }, 0);

  // Extracting the CSS variable name from the stageColor string (e.g., "bg-[hsl(var(--stage-new-lead))]")
  const colorVar = stageColor.match(/var\(([^)]+)\)/)?.[1];
  const bgColor = colorVar ? `hsl(var(${colorVar}) / 0.1)` : undefined;
  const borderColor = colorVar ? `hsl(var(${colorVar}) / 0.2)` : undefined;
  const headerBgColor = colorVar ? `hsl(var(${colorVar}) / 0.15)` : undefined;

  const allClientsIds = clients.map(c => c.id);
  const isAllSelected = allClientsIds.length > 0 && allClientsIds.every(id => selectedIds?.includes(id));
  const isSomeSelected = allClientsIds.length > 0 && allClientsIds.some(id => selectedIds?.includes(id));

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
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/header:text-primary/50 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
          {selectable && (
            <Checkbox
              checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
              onCheckedChange={(c) => onSelectAll?.(allClientsIds, !!c)}
              className="h-3.5 w-3.5 rounded-sm border-slate-300"
            />
          )}
          <ColumnColorPicker
            stageId={stageId}
            stageValue={stageValue}
            stageLabel={stageLabel}
            currentColor={stageColor}
            funnelType="client"
          />
          <EditableColumnName
            stageId={stageId}
            stageValue={stageValue}
            pipeline={pipeline}
            initialLabel={stageLabel}
            funnelType="client"
            className="text-[11px] font-black text-foreground uppercase tracking-tight"
          />
          <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-full border border-border/50">
            {clients.length}
          </span>
        </div>
        <div className="mt-1 pb-1 flex justify-between items-center text-[9px] font-bold tracking-tight text-muted-foreground">
          <span className="uppercase opacity-70">VALOR DE VENDA</span>
          <span className="text-primary font-black">{formatCurrency(totalValue)}</span>
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
              {clients.map((c, i) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  index={i}
                  selectable={selectable}
                  selected={selectedIds?.includes(c.id)}
                  onSelect={onSelect}
                />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
