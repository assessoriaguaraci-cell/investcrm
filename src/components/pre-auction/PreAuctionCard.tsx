import { PreAuctionProperty } from "@/types/pre-auction";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Home, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PreAuctionCardProps {
  property: PreAuctionProperty;
  onClick: (property: PreAuctionProperty) => void;
}

export function PreAuctionCard({ property, onClick }: PreAuctionCardProps) {
  const isCancelled = property.stage === 'cancelado';
  const isWon = property.stage === 'arrematado';

  const statusMap = {
    inicial: { label: 'FASE INICIAL', color: 'bg-blue-500' },
    em_andamento: { label: 'EM ANDAMENTO', color: 'bg-yellow-500' },
    concluido: { label: 'CONCLUÍDO', color: 'bg-green-500' },
    cancelado: { label: 'DESISTÊNCIA', color: 'bg-gray-500' },
    arrematado: { label: 'ARREMATADO', color: 'bg-purple-600' },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-500';
      case 'Em Andamento': return 'bg-blue-500';
      default: return 'bg-orange-500'; // Não Iniciado
    }
  };

  const status = statusMap[property.stage] || { label: 'PENDENTE', color: 'bg-gray-400' };

  return (
    <Card 
      onClick={() => onClick(property)}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group border-2 border-primary/5",
        isCancelled && "opacity-50 grayscale bg-muted/50"
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
        {property.photo_url ? (
          <img 
            src={property.photo_url} 
            alt={property.code}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Home className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        <Badge className={cn("absolute top-2 right-2 font-black uppercase text-[9px] tracking-widest", status.color)}>
          {status.label}
        </Badge>
        <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                {property.code}
            </Badge>
        </div>
      </div>
      
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-black text-sm text-foreground uppercase tracking-tight truncate">
            {property.city || "Cidade não informada"}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
            <MapPin className="h-3 w-3 shrink-0" />
            {property.neighborhood} — {property.property_type || "Imóvel"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Vencimento</span>
            <div className="flex items-center gap-1 text-[11px] font-bold tabular-nums">
              <Calendar className="h-3 w-3 text-primary" />
              {property.proposal_deadline 
                ? format(new Date(property.proposal_deadline), "dd/MM/yyyy") 
                : "N/A"}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Responsável</span>
            <div className="flex items-center gap-1 text-[11px] font-bold truncate">
              <User className="h-3 w-3 text-primary" />
              {(property as any).responsible?.full_name || "N/A"}
            </div>
          </div>
        </div>

        {/* Minimalist Indicators */}
        <div className="flex items-center justify-between pt-2 border-t border-primary/5">
            <div className="flex gap-2">
                <div className="flex flex-col items-center gap-1">
                    <div className={cn("h-1.5 w-6 rounded-full", getStatusColor((property as any).status_diligence))} title="Diligência" />
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter text-center">Dili</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className={cn("h-1.5 w-6 rounded-full", getStatusColor((property as any).status_debts))} title="Débitos" />
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter text-center">Débi</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className={cn("h-1.5 w-6 rounded-full", getStatusColor((property as any).status_market_analysis))} title="Mercado" />
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter text-center">Merc</span>
                </div>
            </div>

            {property.maps_url && (
                <a 
                    href={property.maps_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-widest"
                >
                    Maps <ExternalLink className="h-2.5 w-2.5" />
                </a>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
