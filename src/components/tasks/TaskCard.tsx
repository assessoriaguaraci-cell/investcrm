import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, Pencil, Trash2, User, Building2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Activity } from "@/hooks/useActivities";

const TYPE_LABELS: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  visita: "Visita",
  reuniao: "Reunião",
  documentacao: "Documentação",
  lembrete: "Lembrete",
  outro: "Outro",
};

interface Props {
  activity: Activity;
  onToggle: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
  selectable?: boolean;
}

export default function TaskCard({ activity, onToggle, onEdit, onDelete, selected, onSelect, selectable }: Props) {
  const isDone = activity.status === "feito";
  const isInProgress = activity.status === "em_andamento";
  const isOverdue =
    !isDone && !isInProgress && activity.due_date && isPast(new Date(activity.due_date)) && !isToday(new Date(activity.due_date));
  const isDueToday = activity.due_date && isToday(new Date(activity.due_date));

  return (
    <Card className={cn(
      "p-3 flex items-start gap-3 transition-all duration-200 border relative group",
      isDone && "opacity-60 bg-slate-50",
      isInProgress && "border-blue-200 bg-blue-50/30 shadow-sm",
      selected && "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md"
    )}>
      <div className="flex flex-col gap-2 mt-1 shrink-0">
        {selectable && (
          <button 
            onClick={() => onSelect?.(activity.id)} 
            className={cn(
              "h-4 w-4 rounded-full border transition-all duration-200 flex items-center justify-center",
              selected ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50 bg-background"
            )}
          >
            {selected && <div className="h-1.5 w-1.5 rounded-full bg-white animate-in zoom-in" />}
          </button>
        )}

        <button onClick={() => onToggle(activity)} className="shrink-0 transition-transform active:scale-90">
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : isInProgress ? (
            <Play className="h-5 w-5 text-blue-500 fill-blue-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/50" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn("text-sm font-medium leading-tight", isDone && "line-through text-muted-foreground")}>
          {activity.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {TYPE_LABELS[activity.activity_type] || activity.activity_type}
          </Badge>

          {activity.due_date && (
            <span
              className={cn(
                "text-[10px] flex items-center gap-0.5",
                isOverdue && "text-destructive font-semibold",
                isDueToday && !isDone && "text-primary font-semibold",
                !isOverdue && !isDueToday && "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {format(new Date(activity.due_date), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}

          {activity.clients && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <User className="h-3 w-3" />
              {activity.clients.full_name}
            </span>
          )}

          {activity.properties && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Building2 className="h-3 w-3" />
              {activity.properties.code}
            </span>
          )}

          {activity.responsible_profile && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {activity.responsible_profile.full_name}
            </Badge>
          )}
        </div>

        {activity.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{activity.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(activity)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(activity.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
