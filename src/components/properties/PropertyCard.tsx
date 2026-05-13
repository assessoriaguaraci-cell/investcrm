import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { MapPin, AlertTriangle, Pencil, User, Calendar, FolderOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, totalInvestment, PRIORITY_LEVELS, OCCUPATION_STATUSES } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format, differenceInDays } from "date-fns";
import EditPropertyDialog from "./EditPropertyDialog";
import type { Property } from "@/hooks/useProperties";
import { CardSettings } from "@/pages/Properties";

interface Props {
  property: Property;
  index: number;
  cardSettings: CardSettings;
}

const priorityColors: Record<string, string> = {
  alta: "bg-[hsl(var(--priority-high))] text-white",
  media: "bg-[hsl(var(--priority-medium))] text-white",
  baixa: "bg-[hsl(var(--priority-low))] text-white",
};

export default function PropertyCard({ property, index, cardSettings }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: members } = useApprovedMembers();
  const investment = totalInvestment(property);
  const occLabel = OCCUPATION_STATUSES.find(o => o.value === property.occupation_status)?.label ?? "";
  const prioLabel = PRIORITY_LEVELS.find(p => p.value === property.priority)?.label ?? "";
  const responsibleName = members?.find(m => m.user_id === property.responsible_user_id)?.full_name;
  const photoUrl = (property as any).photo_url as string | null;
  const auctionDate = property.auction_date;
  const lifeDays = auctionDate ? differenceInDays(new Date(), new Date(auctionDate)) : null;

  // Appraisal expiry badge
  const appraisalExpiry = (property as any).appraisal_expiry as string | null;
  const daysUntilExpiry = appraisalExpiry ? differenceInDays(new Date(appraisalExpiry + "T12:00:00"), new Date()) : null;
  const showExpiryBadge = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  return (
    <>
      <Draggable draggableId={property.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditOpen(true)}
            className={`rounded-lg border bg-card mb-2 shadow-sm transition-all cursor-pointer group overflow-hidden ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 scale-[1.02]" : "hover:shadow-md hover:border-primary/30"
              }`}
          >
            {photoUrl && cardSettings.showPhoto && (
              <div className={`relative overflow-hidden ${cardSettings.size === 'small' ? 'h-16' : cardSettings.size === 'large' ? 'h-32' : 'h-24'}`}>
                <img src={photoUrl} alt={property.code} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-[10px] text-white font-bold uppercase tracking-widest">Clique para editar</span>
                </div>
              </div>
            )}

            <div className={`${cardSettings.size === 'small' ? 'p-2 space-y-1.5' : cardSettings.size === 'large' ? 'p-5 space-y-4' : 'p-4 space-y-3'}`}>
              {/* Header: Code & Priority Area */}
              <div className="flex items-center justify-between">
                <span className={`font-bold font-mono tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm shadow-sm border border-primary/10 ${cardSettings.size === 'small' ? 'text-[9px]' : 'text-[10px]'}`}>{property.code}</span>
                {cardSettings.showPriority && (
                  <div className="flex items-center gap-2">
                    {showExpiryBadge && (
                      <Badge className={`${cardSettings.size === 'small' ? 'text-[8px] h-3.5 px-1' : 'text-[9px] h-4.5 px-2'} bg-destructive border-none shadow-sm uppercase font-black tracking-tighter`}>
                        {daysUntilExpiry! <= 0 ? "VENCIDO" : `-${daysUntilExpiry}d`}
                      </Badge>
                    )}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full uppercase shadow-inner ${cardSettings.size === 'small' ? 'text-[8px]' : 'text-[9px]'} font-extrabold ${property.priority === 'alta' ? 'bg-destructive/10 text-destructive' : property.priority === 'media' ? 'bg-orange-500/10 text-orange-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      <div className={`rounded-full ${cardSettings.size === 'small' ? 'h-1 w-1' : 'h-1.5 w-1.5'} ${property.priority === 'alta' ? 'bg-destructive animate-pulse' : property.priority === 'media' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                      {cardSettings.size !== 'small' && prioLabel}
                    </div>
                  </div>
                )}
              </div>

              {/* Core Property Info */}
              {cardSettings.showLocation && (
                <div className="space-y-0.5">
                  <h4 className={`${cardSettings.size === 'small' ? 'text-xs' : cardSettings.size === 'large' ? 'text-base' : 'text-sm'} font-extrabold text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2 uppercase`}>
                    {property.city ? `${property.city}/${property.state}` : "Sem endereço"}
                  </h4>
                  {cardSettings.showNeighborhood && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      <MapPin className="h-3 w-3 text-muted-foreground/40" />
                      <span className="truncate">{property.neighborhood || "Sem bairro"}</span>
                      {cardSettings.size !== 'small' && (
                        <>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="shrink-0">{property.property_type || "Imóvel"}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status Row */}
              <div className={`flex flex-wrap gap-2 ${cardSettings.size === 'small' ? 'pt-0' : 'pt-0.5'}`}>
                {cardSettings.showStatus && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md shadow-sm font-black border uppercase tracking-tighter",
                    property.occupation_status === "desocupado" 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : (property.occupation_status === "venda_para_ocupante" || property.occupation_status === "imissao_na_posse")
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    <AlertTriangle className="h-3 w-3" />
                    <span>{cardSettings.size === 'small' ? (property.occupation_status === "desocupado" ? "Desocup." : "Ocupado") : occLabel}</span>
                  </div>
                )}
                
                {cardSettings.showAuctionDate && auctionDate && (
                  <div className={`flex items-center gap-1.5 text-[10px] bg-muted text-muted-foreground ${cardSettings.size === 'small' ? 'px-1 py-0.5' : 'px-2 py-1'} rounded-md font-extrabold border border-border shadow-sm uppercase tracking-tighter`}>
                    <Calendar className="h-3 w-3 opacity-60" />
                    <span>{format(new Date(auctionDate + "T12:00:00"), "dd/MM")}</span>
                    <span className="opacity-30 mx-0.5">•</span>
                    <Clock className="h-3 w-3 opacity-60" />
                    <span>{lifeDays}</span>
                  </div>
                )}
              </div>

              {/* Financial Section */}
              {cardSettings.showFinancial && (
                <div className={`relative overflow-hidden bg-muted/30 rounded-xl ${cardSettings.size === 'small' ? 'p-1.5' : cardSettings.size === 'large' ? 'p-4' : 'p-3'} border border-muted/50 group/fin shadow-inner`}>
                  <div className="absolute top-0 right-0 p-1 opacity-10 group-hover/fin:opacity-30 transition-opacity">
                    <FolderOpen className={`${cardSettings.size === 'small' ? 'h-6 w-6 -m-2' : 'h-10 w-10 -m-3'} text-primary/20`} />
                  </div>
                  <div className="flex items-center justify-between relative">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-[0.1em]">Invest.</p>
                      <p className={`${cardSettings.size === 'small' ? 'text-[11px]' : 'text-[13px]'} font-black text-foreground font-mono tracking-tighter leading-none`}>{formatCurrency(investment)}</p>
                    </div>
                    {property.listed_price ? (
                      <div className={`text-right space-y-0.5 border-l border-muted-foreground/10 ${cardSettings.size === 'small' ? 'pl-2' : 'pl-4'}`}>
                        <p className="text-[8px] font-black text-primary/50 uppercase tracking-[0.1em]">Laudo</p>
                        <p className={`${cardSettings.size === 'small' ? 'text-[11px]' : 'text-[13px]'} font-black text-primary/80 font-mono tracking-tighter leading-none italic`}>{formatCurrency(property.listed_price)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Footer: Responsible / Metadata */}
              {responsibleName && cardSettings.showResponsible && (
                <div className={`flex items-center justify-between border-t border-dashed border-muted/80 ${cardSettings.size === 'small' ? 'pt-1.5 mt-0.5' : 'pt-2.5 mt-1'}`}>
                  <div className="flex items-center gap-2 group/user max-w-[80%]">
                    <div className={`rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm ${cardSettings.size === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`}>
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold truncate group-hover:text-foreground transition-colors uppercase tracking-tight italic">
                      {responsibleName}
                    </span>
                  </div>
                  <Pencil className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary transition-colors" />
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
