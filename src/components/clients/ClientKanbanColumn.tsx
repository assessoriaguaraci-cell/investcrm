import { Droppable } from "@hello-pangea/dnd";
import ClientCard from "./ClientCard";
import type { Client } from "@/hooks/useClients";

interface Props {
  stageValue: string;
  stageLabel: string;
  stageColor: string;
  clients: Client[];
}

export default function ClientKanbanColumn({ stageValue, stageLabel, stageColor, clients }: Props) {
  // Extracting the CSS variable name from the stageColor string (e.g., "bg-[hsl(var(--stage-new-lead))]")
  const colorVar = stageColor.match(/var\(([^)]+)\)/)?.[1];
  const bgColor = colorVar ? `hsla(var(${colorVar}), 0.1)` : undefined;
  const borderColor = colorVar ? `hsla(var(${colorVar}), 0.2)` : undefined;
  const headerBgColor = colorVar ? `hsla(var(${colorVar}), 0.15)` : undefined;

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0">
      <div
        className="flex items-center gap-2 mb-3 px-3 py-2 rounded-t-lg border-b-2"
        style={{
          backgroundColor: headerBgColor,
          borderBottomColor: colorVar ? `hsl(var(${colorVar}))` : 'transparent'
        }}
      >
        <div className={`w-3 h-3 rounded-full ${stageColor} shadow-sm`} />
        <h3 className="text-sm font-bold truncate text-foreground">{stageLabel}</h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/50">
          {clients.length}
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
              {clients.map((c, i) => (
                <ClientCard key={c.id} client={c} index={i} />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
