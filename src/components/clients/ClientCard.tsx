import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_OPTIONS } from "@/lib/client-constants";
import { formatCurrency } from "@/lib/property-constants";
import EditClientDialog from "./EditClientDialog";
import type { Client } from "@/hooks/useClients";
import { Plus, Tag as TagIcon, Phone, Pencil, FolderOpen } from "lucide-react";

import { useClientPropertyLinks } from "@/hooks/useClientPropertyLinks";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { Checkbox } from "@/components/ui/checkbox";
import TimeInStageBadge from "./TimeInStageBadge";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

interface Props {
  client: Client;
  index: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const tempColors: Record<string, string> = {
  frio: "bg-[hsl(var(--temp-cold))] text-white",
  morno: "bg-[hsl(var(--temp-warm))] text-white",
  quente: "bg-[hsl(var(--temp-hot))] text-white",
};

export default function ClientCard({ client, index, selectable, selected, onSelect }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: links = [] } = useClientPropertyLinks();
  const { data: members = [] } = useApprovedMembers();
  const settings = useBoardSettings();

  const clientLinks = links.filter(l => l.client_id === client.id);
  const tempLabel = TEMPERATURE_OPTIONS.find(t => t.value === client.temperature)?.label ?? "";
  
  // Find responsible name from members list
  const responsible = members.find(m => m.user_id === client.responsible_user_id);

  return (
    <>
      <Draggable draggableId={client.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => selectable && onSelect ? onSelect(client.id, !selected) : setEditOpen(true)}
            className={`rounded-lg border bg-white shadow-sm transition-shadow cursor-pointer group 
              ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"}
              ${selected ? "ring-2 ring-primary bg-primary/5" : ""}
              ${settings.cardSize === "small" ? "p-2 mb-1.5" : settings.cardSize === "large" ? "p-4 mb-3" : "p-3 mb-2"}
              `}
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  {selectable && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(c) => onSelect?.(client.id, c === true)}
                        className="h-3.5 w-3.5"
                      />
                    </div>
                  )}
                  <span className={`font-bold text-slate-800 truncate ${settings.cardSize === "small" ? "text-xs" : settings.cardSize === "large" ? "text-base" : "text-[13px]"}`}>
                    {client.full_name}
                  </span>
                </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <TimeInStageBadge updatedAt={(client as any).stage_updated_at || client.updated_at} stage={client.stage} />
                    <div className="w-[52px] flex justify-end">
                      <Badge className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter w-full flex justify-center items-center ${tempColors[client.temperature] ?? ""}`}>
                        {tempLabel}
                      </Badge>
                    </div>
                    {!selectable && (
                      <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
              </div>

              {(settings.showTags) && (
                <div className="flex flex-wrap items-center gap-1 px-0.5 min-h-[14px]">
                  {(() => {
                    const rawTags = (client as any).tags;
                    let tagsArray: string[] = [];
                    if (Array.isArray(rawTags)) {
                      tagsArray = rawTags;
                    } else if (typeof rawTags === 'string' && rawTags.includes('{')) {
                      tagsArray = rawTags.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
                    }

                    return tagsArray.map((t: string) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-[8px] h-3.5 px-1 font-bold border-blue-100 bg-blue-50/50 text-blue-600 rounded-sm"
                      >
                        {t}
                      </Badge>
                    ));
                  })()}
                  {client.has_financial_pending && (
                    <Badge
                      variant="outline"
                      className="text-[8px] h-3.5 px-1 font-bold border-red-100 bg-red-50 text-red-600 rounded-sm uppercase"
                    >
                      PENDÊNCIA
                    </Badge>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                    className="h-3.5 w-3.5 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-300 border border-slate-100"
                    title="Gerenciar tags"
                  >
                    <Plus className="h-2 w-2" />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1 mt-0.5">
                {settings.showPhone && (client.whatsapp || client.phone) && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[11px] mb-0.5">
                    <Phone className="h-2.5 w-2.5" />
                    {client.whatsapp || client.phone}
                  </div>
                )}

                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 leading-tight">
                  {settings.showPropertyLinks && clientLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {clientLinks.map(link => (
                        <span key={link.id} className="text-[9px] px-1 py-0 bg-slate-50 text-slate-400 rounded border border-slate-100 truncate" title={link.properties?.code || ''}>
                          🏢 {link.properties?.code?.slice(-4)}
                        </span>
                      ))}
                    </div>
                  )}

                  {settings.showCpf && client.cpf && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      CPF: <span className="font-mono">{client.cpf}</span>
                    </div>
                  )}
                  {settings.showMaritalStatus && client.marital_status && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      Civil: {client.marital_status}
                    </div>
                  )}
                  {settings.showWorkRegime && client.work_regime && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      Trab: {client.work_regime}
                    </div>
                  )}

                  {settings.showIncome && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      Renda: {client.income ? formatCurrency(client.income) : "Não inf."}
                    </div>
                  )}

                  {settings.showLocation && client.city && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      {client.city}/{client.state}
                    </div>
                  )}

                  {responsible && (
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      👤 {responsible.full_name || "Sem nome"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
