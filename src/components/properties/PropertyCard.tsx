import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { MapPin, AlertTriangle, Pencil, User, Calendar, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, totalInvestment, PRIORITY_LEVELS, OCCUPATION_STATUSES } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format, differenceInDays } from "date-fns";
import EditPropertyDialog from "./EditPropertyDialog";
import type { Property } from "@/hooks/useProperties";

interface Props {
  property: Property;
  index: number;
}

const priorityColors: Record<string, string> = {
  alta: "bg-[hsl(var(--priority-high))] text-white",
  media: "bg-[hsl(var(--priority-medium))] text-white",
  baixa: "bg-[hsl(var(--priority-low))] text-white",
};

export default function PropertyCard({ property, index }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: members } = useApprovedMembers();
  const investment = totalInvestment(property);
  const occLabel = OCCUPATION_STATUSES.find(o => o.value === property.occupation_status)?.label ?? "";
  const prioLabel = PRIORITY_LEVELS.find(p => p.value === property.priority)?.label ?? "";
  const responsibleName = members?.find(m => m.user_id === property.responsible_user_id)?.full_name;
  const photoUrl = (property as any).photo_url as string | null;
  const auctionDate = property.auction_date;
  const lifeDays = auctionDate ? differenceInDays(new Date(), new Date(auctionDate)) : null;

  return (
    <>
      <Draggable draggableId={property.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditOpen(true)}
            className={`rounded-lg border bg-card mb-2 shadow-sm transition-shadow cursor-pointer group overflow-hidden ${
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
            }`}
          >
            {photoUrl && (
              <img src={photoUrl} alt={property.code} className="w-full h-20 object-cover" />
            )}

            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-semibold text-primary">{property.code}</span>
                <div className="flex items-center gap-1">
                  <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[property.priority] ?? ""}`}>
                    {prioLabel}
                  </Badge>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-start gap-1 text-xs text-muted-foreground mb-1.5">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="line-clamp-1">
                  {[property.city, property.state].filter(Boolean).join(", ") || "Sem endereço"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{formatCurrency(investment)}</span>
                {property.listed_price ? (
                  <span className="text-muted-foreground">Anúncio: {formatCurrency(property.listed_price)}</span>
                ) : null}
              </div>

              {auctionDate && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(auctionDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                  {lifeDays !== null && <span className="ml-1">({lifeDays}d)</span>}
                </div>
              )}

              {property.occupation_status === "ocupado" && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{occLabel}</span>
                </div>
              )}

              {responsibleName && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{responsibleName}</span>
                </div>
              )}

              {(property as any).drive_url && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  <span className="truncate">Drive</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>

      <EditPropertyDialog property={property} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
