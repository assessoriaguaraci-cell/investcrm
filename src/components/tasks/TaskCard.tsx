import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  User, 
  Building2, 
  Play,
  AlignLeft,
  CheckSquare,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Activity } from "@/hooks/useActivities";

const TYPE_LABELS: Record<string, string> = {
  ligacao: "📞 Ligação",
  whatsapp: "💬 WhatsApp",
  visita: "🚗 Visita",
  reuniao: "🤝 Reunião",
  documentacao: "📄 Documentação",
  lembrete: "⏰ Lembrete",
  outro: "💡 Outro",
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
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const isDone = activity.status === "feito";
  const isInProgress = activity.status === "em_andamento";
  
  const dueDateLocal = activity.due_date ? parseLocalDate(activity.due_date) : null;
  
  const isOverdue =
    !isDone && !isInProgress && dueDateLocal && isPast(dueDateLocal) && !isToday(dueDateLocal);
  const isDueToday = dueDateLocal && isToday(dueDateLocal);
  // Parse JSON metadata or fallback to plain text notes
  let hasDescription = false;
  let checklistTotal = 0;
  let checklistCompleted = 0;
  let commentsCount = 0;
  let labels: string[] = [];
  let customLabels: { id: string, name: string, color: string }[] = [];

  const notesRaw = activity.notes || "";
  if (notesRaw.trim().startsWith("{") && notesRaw.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(notesRaw);
      hasDescription = !!parsed.description?.trim();
      checklistTotal = parsed.checklist?.length || 0;
      checklistCompleted = parsed.checklist?.filter((i: any) => i.done).length || 0;
      commentsCount = parsed.comments?.length || 0;
      labels = parsed.labels || [];
      customLabels = parsed.customLabels || [];
    } catch (e) {
      hasDescription = !!notesRaw.trim();
    }
  } else {
    hasDescription = !!notesRaw.trim();
  }

  const DEFAULT_LABELS = [
    { id: "lbl-1", name: "Pedido de Texto", color: "#e2b203" },
    { id: "lbl-2", name: "Mais um passo", color: "#ea7e00" },
    { id: "lbl-3", name: "Prioridade", color: "#cf2e2e" },
    { id: "lbl-4", name: "Time de Design", color: "#7f53f1" },
    { id: "lbl-5", name: "Marketing de Produto", color: "#0079bf" },
    { id: "lbl-6", name: "Dica do Trello", color: "#00c2e0" },
    { id: "lbl-7", name: "Socorro", color: "#61bd4f" }
  ];

  return (
    <div 
      onClick={() => onEdit(activity)}
      className={cn(
        "bg-card hover:bg-card/90 border border-border/80 rounded-xl p-3.5 flex flex-col gap-3 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group relative",
        isDone && "opacity-60 bg-muted/30 border-muted/50 hover:shadow-sm",
        isInProgress && "border-blue-500/40 bg-blue-500/[0.03] ring-1 ring-blue-500/20 shadow-sm",
        selected && "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
      )}
    >
      
      {/* Top row: Checkbox status, Activity type badge, Delete */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {selectable && (
            <button 
              onClick={() => onSelect?.(activity.id)} 
              className={cn(
                "h-4 w-4 rounded-full border transition-all duration-200 flex items-center justify-center shrink-0",
                selected ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50 bg-background"
              )}
            >
              {selected && <div className="h-1.5 w-1.5 rounded-full bg-white animate-in zoom-in" />}
            </button>
          )}

          <button onClick={() => onToggle(activity)} className="shrink-0 transition-transform active:scale-95">
            {isDone ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
            ) : isInProgress ? (
              <Play className="h-4.5 w-4.5 text-blue-500 fill-blue-500 animate-pulse" />
            ) : (
              <Circle className="h-4.5 w-4.5 text-muted-foreground/50 hover:text-primary transition-colors" />
            )}
          </button>
        </div>

        {/* Activity Type Badge */}
        <Badge variant="outline" className="text-[9px] font-semibold px-2 py-0 h-5 shrink-0 bg-background/50">
          {TYPE_LABELS[activity.activity_type] || activity.activity_type}
        </Badge>

        {/* Action: Delete */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={() => onDelete(activity.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Middle row: Card title */}
      <div className="space-y-1.5">
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-0.5 select-none">
            {labels.map((labelId) => {
              const custom = customLabels.find(l => l.id === labelId);
              const def = DEFAULT_LABELS.find(l => l.id === labelId);
              const color = custom?.color || def?.color || "#6b7280";
              const name = custom?.name || def?.name || "";
              return (
                <span 
                  key={labelId}
                  className="h-1.5 w-6 rounded-full shrink-0 transition-all hover:w-10"
                  style={{ backgroundColor: color }}
                  title={name}
                />
              );
            })}
          </div>
        )}
        <p className={cn("text-xs font-semibold leading-snug text-foreground/90 font-sans", isDone && "line-through text-muted-foreground/75")}>
          {activity.description}
        </p>
      </div>

      {/* Bottom Row: Dynamic Indicators & Member Avatar */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/10">
        
        {/* Metadados / Indicators */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Due date */}
          {activity.due_date && (
            <span
              className={cn(
                "text-[9px] font-black uppercase flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                isOverdue && "bg-destructive/10 text-destructive",
                isDueToday && !isDone && "bg-primary/10 text-primary",
                !isOverdue && !isDueToday && "bg-muted/80 text-muted-foreground"
              )}
            >
              <Clock className="h-2.5 w-2.5 shrink-0" />
              {dueDateLocal && format(dueDateLocal, "dd/MM", { locale: ptBR })}
            </span>
          )}

          {/* Description Icon */}
          {hasDescription && (
            <span className="text-muted-foreground/60 flex items-center" title="Tem descrição">
              <AlignLeft className="h-3 w-3" />
            </span>
          )}

          {/* Checklist progress */}
          {checklistTotal > 0 && (
            <span 
              className={cn(
                "text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
                checklistCompleted === checklistTotal ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
              )}
              title="Progresso do Checklist"
            >
              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
              <span>{checklistCompleted}/{checklistTotal}</span>
            </span>
          )}

          {/* Comments count */}
          {commentsCount > 0 && (
            <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted" title="Comentários">
              <MessageSquare className="h-2.5 w-2.5 shrink-0" />
              <span>{commentsCount}</span>
            </span>
          )}

          {/* Client badge */}
          {activity.clients && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" title={`Cliente: ${activity.clients.full_name}`}>
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="font-semibold break-words leading-tight">{activity.clients.full_name}</span>
            </span>
          )}

          {/* Property badge */}
          {activity.properties && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" title={`Imóvel: ${activity.properties.code}`}>
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              <span className="font-semibold break-words leading-tight">{activity.properties.code}</span>
            </span>
          )}
        </div>

        {/* Member Avatar (Initials) */}
        {activity.responsible_profile && (
          <div 
            className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px] border border-primary/20 shrink-0"
            title={`Responsável: ${activity.responsible_profile.full_name}`}
          >
            {activity.responsible_profile.full_name.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>

    </div>
  );
}
