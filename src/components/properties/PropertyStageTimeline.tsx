import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { Clock, Timer } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StageEntry {
  id: string;
  property_id: string;
  stage: string;
  entered_at: string;
  exited_at: string | null;
}

interface Props {
  propertyId: string;
  auctionDate?: string | null;
}

export default function PropertyStageTimeline({ propertyId, auctionDate }: Props) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["property_stage_history", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_stage_history")
        .select("*")
        .eq("property_id", propertyId)
        .order("entered_at", { ascending: true });
      if (error) throw error;
      return data as StageEntry[];
    },
  });

  const totalDays = auctionDate
    ? differenceInDays(new Date(), new Date(auctionDate))
    : null;

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      {totalDays !== null && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Timer className="h-4 w-4 text-primary" />
          <div>
            <span className="text-sm font-semibold">{totalDays} dias</span>
            <span className="text-xs text-muted-foreground ml-1.5">desde a arrematação</span>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum histórico de etapas registrado.</p>
      ) : (
        <div className="relative pl-6 space-y-3">
          <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
          {history.map((entry, i) => {
            const stageLabel = PROPERTY_STAGES.find(s => s.value === entry.stage)?.label ?? entry.stage;
            const enteredDate = new Date(entry.entered_at);
            const exitedDate = entry.exited_at ? new Date(entry.exited_at) : null;
            const days = differenceInDays(exitedDate ?? new Date(), enteredDate);
            const isCurrent = !entry.exited_at;

            return (
              <div key={entry.id} className="relative">
                <div className={`absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                  isCurrent ? "bg-primary border-primary" : "bg-background border-muted-foreground/40"
                }`} />
                <div className={`text-sm ${isCurrent ? "font-semibold" : ""}`}>
                  {stageLabel}
                  {isCurrent && (
                    <span className="ml-1.5 text-[10px] font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      atual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{format(enteredDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                  {exitedDate && (
                    <>
                      <span>→</span>
                      <span>{format(exitedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {days} {days === 1 ? "dia" : "dias"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
