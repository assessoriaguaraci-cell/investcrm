import { differenceInHours, differenceInDays, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimeInStageBadgeProps {
  updatedAt: string;
  stage: string;
}

export default function TimeInStageBadge({ updatedAt, stage }: TimeInStageBadgeProps) {
  // Use stage_updated_at if it's available (as passed in 'updatedAt' from ClientCard), 
  // ensuring metadata changes don't reset the timer.
  if (!updatedAt) return null;
  const lastUpdate = parseISO(updatedAt);
  if (isNaN(lastUpdate.getTime())) return null;
  const now = new Date();
  
  const diffHours = differenceInHours(now, lastUpdate);
  const diffDays = differenceInDays(now, lastUpdate);

  // Exceptions where no timer is needed
  if (['venda_concretizada', 'venda_cancelada', 'cliente_com_pendencia'].includes(stage)) {
    return null;
  }

  // Credit Rejected: Weekly timer
  if (stage === 'credito_reprovado' || stage === 'credito_reprovado_pipe') {
    if (diffDays < 7) return null;
    const weeks = Math.floor(diffDays / 7);
    return (
      <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 font-bold">
        <Clock className="w-2.5 h-2.5" />
        {weeks === 1 ? '1 semana' : `${weeks} semanas`}
      </Badge>
    );
  }

  // Waiting Reservation: Biweekly timer
  if (stage === 'aguardando_reserva') {
    if (diffDays < 15) return null;
    const intervals = Math.floor(diffDays / 15) * 15;
    return (
      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 font-bold">
        <Clock className="w-2.5 h-2.5" />
        {intervals} dias
      </Badge>
    );
  }

  // Standard stages: 24h, 48h, 72h, 7d+
  if (diffHours >= 24) {
    let label = '';
    let colorClass = '';

    if (diffDays >= 7) {
      label = `7 dias+`;
      colorClass = "bg-red-50 text-red-600 border-red-100";
    } else if (diffHours >= 72) {
      label = `72h`;
      colorClass = "bg-orange-50 text-orange-600 border-orange-100";
    } else if (diffHours >= 48) {
      label = `48h`;
      colorClass = "bg-amber-50 text-amber-600 border-amber-100";
    } else {
      label = `24h`;
      colorClass = "bg-blue-50 text-blue-600 border-blue-100";
    }

    return (
      <Badge variant="secondary" className={cn("flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 font-black uppercase tracking-tight", colorClass)}>
        <Clock className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  }

  return null;
}
