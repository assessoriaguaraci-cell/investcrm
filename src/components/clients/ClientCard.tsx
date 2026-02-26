import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, Thermometer, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_OPTIONS } from "@/lib/client-constants";
import { formatCurrency } from "@/lib/property-constants";
import EditClientDialog from "./EditClientDialog";
import type { Client } from "@/hooks/useClients";

import { useClientPropertyLinks } from "@/hooks/useClientPropertyLinks";

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
  const { data: links = [] } = useClientPropertyLinks();

  const clientLinks = links.filter(l => l.client_id === client.id);
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
            className={`rounded-lg border bg-card p-3 mb-2 shadow-sm transition-shadow cursor-pointer group ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
              }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 truncate">{client.full_name}</span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-slate-100 group-hover:border-primary/20 transition-colors">
                {clientLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {clientLinks.map(link => (
                      <span key={link.id} className="text-[12px] font-extrabold text-blue-600 bg-blue-50 px-1.5 rounded">
                        {link.properties?.code}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center">
                  <Badge className={`text-[10px] px-2 py-0 rounded-full font-medium ${tempColors[client.temperature] ?? ""}`}>
                    {tempLabel}
                  </Badge>
                </div>

                {(client.phone || client.whatsapp) && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{client.whatsapp || client.phone}</span>
                  </div>
                )}

                {(client.income || client.city) && (
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 font-medium pt-1">
                    {client.income ? (
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>Renda: {formatCurrency(client.income)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 opacity-60">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-[10px]">Sem renda informada</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span className="truncate">{client.city}/{client.state}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
