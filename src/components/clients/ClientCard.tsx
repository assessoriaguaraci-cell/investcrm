import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, Thermometer, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_OPTIONS } from "@/lib/client-constants";
import { formatCurrency } from "@/lib/property-constants";
import EditClientDialog from "./EditClientDialog";
import type { Client } from "@/hooks/useClients";

interface Props {
  client: Client;
  index: number;
}

const tempColors: Record<string, string> = {
  frio: "bg-[hsl(var(--temp-cold))] text-white",
  morno: "bg-[hsl(var(--temp-warm))] text-white",
  quente: "bg-[hsl(var(--temp-hot))] text-white",
};

export default function ClientCard({ client, index }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const tempLabel = TEMPERATURE_OPTIONS.find(t => t.value === client.temperature)?.label ?? "";

  return (
    <>
      <Draggable draggableId={client.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditOpen(true)}
            className={`rounded-lg border bg-card p-3 mb-2 shadow-sm transition-shadow cursor-pointer group ${
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold truncate max-w-[180px]">{client.full_name}</span>
              <div className="flex items-center gap-1">
                <Badge className={`text-[10px] px-1.5 py-0 ${tempColors[client.temperature] ?? ""}`}>
                  {tempLabel}
                </Badge>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {(client.phone || client.whatsapp) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{client.whatsapp || client.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              {client.income ? (
                <span className="text-muted-foreground">Renda: {formatCurrency(client.income)}</span>
              ) : (
                <span className="text-muted-foreground text-[10px]">Sem renda informada</span>
              )}
              {client.city && (
                <span className="text-muted-foreground truncate ml-2">{client.city}/{client.state}</span>
              )}
            </div>
          </div>
        )}
      </Draggable>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
