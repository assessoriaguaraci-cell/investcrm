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

  // Calculate total final_sale_price for all clients in this column with extra safety
  const totalValue = (clients || []).reduce((sum, client) => {
    if (!client || !client.id) return sum;
    // Get all links for this client
    const clientLinks = (links || []).filter(l => l && l.client_id === client.id);
    // Sum final_sale_price from the properties associated with those links
    const clientTotal = clientLinks.reduce((cSum, link) => {
      return cSum + (link?.properties?.final_sale_price || 0);
    }, 0);
    return sum + clientTotal;
  }, 0);

  // Safely extract color variable
  let colorVar: string | undefined = undefined;
  if (stageColor && typeof stageColor === 'string') {
    colorVar = stageColor.match(/var\(([^)]+)\)/)?.[1];
    
    // Fallback for standard preset tailwind classes stored in DB
    if (!colorVar) {
        if (stageColor.includes('blue')) colorVar = '--preset-blue';
        else if (stageColor.includes('green')) colorVar = '--preset-green';
        else if (stageColor.includes('yellow')) colorVar = '--preset-yellow';
        else if (stageColor.includes('orange')) colorVar = '--preset-orange';
        else if (stageColor.includes('red')) colorVar = '--preset-red';
        else if (stageColor.includes('purple')) colorVar = '--preset-purple';
        else if (stageColor.includes('pink')) colorVar = '--preset-pink';
        else if (stageColor.includes('slate') || stageColor.includes('gray')) colorVar = '--preset-slate';
    }
  }

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
          />
          <span className="ml-auto text-xs font-black text-foreground bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 border border-primary/20 shadow-sm">
            {clients.length}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-bold text-muted-foreground flex justify-between items-center">
          <span className="uppercase tracking-tight opacity-90">VALOR DE VENDA</span>
          <span className="text-primary font-extrabold">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <Droppable droppableId={`${stageValue}---${stageId || 'default'}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] overflow-y-auto custom-scrollbar rounded-b-lg p-2 transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-primary/20 ring-inset" : ""
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
