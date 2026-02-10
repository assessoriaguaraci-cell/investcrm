import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Calendar, Pencil } from "lucide-react";
import { getLinkStatusLabel, getLinkStatusColor } from "@/lib/link-constants";
import { formatCurrency } from "@/lib/property-constants";
import { formatPhone } from "@/lib/client-constants";
import EditLinkDialog from "./EditLinkDialog";
import type { LinkWithRelations } from "@/hooks/useClientPropertyLinks";

interface Props {
  link: LinkWithRelations;
}

export default function LinkCard({ link }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const statusLabel = getLinkStatusLabel(link.status);
  const statusColor = getLinkStatusColor(link.status);

  return (
    <>
      <div
        onClick={() => setEditOpen(true)}
        className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {link.clients?.full_name ?? "Cliente removido"}
          </span>
          <div className="flex items-center gap-1">
            <Badge className={`text-[10px] px-1.5 py-0 text-white ${statusColor}`}>
              {statusLabel}
            </Badge>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {link.properties?.code ?? "—"} — {link.properties?.city ?? "Sem cidade"}
          </span>
        </div>

        {(link.clients?.whatsapp || link.clients?.phone) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{formatPhone(link.clients?.whatsapp || link.clients?.phone)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs mt-1.5">
          {link.proposal_value ? (
            <span className="font-medium text-primary">{formatCurrency(link.proposal_value)}</span>
          ) : (
            <span className="text-muted-foreground text-[10px]">Sem proposta</span>
          )}
          {link.proposal_date && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(link.proposal_date).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      <EditLinkDialog link={link} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
