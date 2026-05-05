import { useState } from "react";
import { format, differenceInDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Loader2, CalendarIcon, Clock, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePropertyUpdates, useCreatePropertyUpdate, useDeletePropertyUpdate, useUpdatePropertyUpdate } from "@/hooks/usePropertyUpdates";
import { useAuth } from "@/hooks/useAuth";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

interface Props {
  propertyId: string;
  currentStage: PropertyStage;
  auctionDate?: string | null;
}

export default function PropertyUpdates({ propertyId, currentStage, auctionDate }: Props) {
  const { data: updates, isLoading } = usePropertyUpdates(propertyId);
  const { stages: dynamicStages } = useKanbanStages("property");
  const createUpdate = useCreatePropertyUpdate();
  const deleteUpdate = useDeletePropertyUpdate();
  const updateMutation = useUpdatePropertyUpdate();
  const { user } = useAuth();

  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState<Date>(new Date());

  const handleSave = () => {
    if (!content.trim()) return;
    const daysSinceAuction = auctionDate
      ? differenceInDays(date, new Date(auctionDate + "T12:00:00"))
      : undefined;
    createUpdate.mutate({
      propertyId,
      content: content.trim(),
      updateDate: format(date, "yyyy-MM-dd"),
      userId: user?.id ?? "",
      stage: currentStage,
      daysSinceAuction,
    }, {
      onSuccess: () => { setContent(""); setAdding(false); setDate(new Date()); }
    });
  };

  const handleEditSave = (id: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({
      id,
      propertyId,
      content: editContent.trim(),
      updateDate: format(editDate, "yyyy-MM-dd"),
    }, {
      onSuccess: () => { setEditingId(null); }
    });
  };

  const startEditing = (update: any) => {
    setEditingId(update.id);
    setEditContent(update.content);
    setEditDate(new Date(update.update_date + "T12:00:00"));
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Atualizações semanais</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      </div>

      {adding && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 text-xs w-full justify-start", !date && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(date, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="O que aconteceu nesta semana?" rows={3} className="text-xs" />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={createUpdate.isPending}>Salvar</Button>
          </div>
        </div>
      )}

      {(!updates || updates.length === 0) && !adding && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atualização registrada.</p>
      )}

      <div className="space-y-2">
        {updates?.map(u => {
          const stageInfo = (dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES).find(s => s.value === u.stage);
          const isEditing = editingId === u.id;

          return (
            <div key={u.id} className="border rounded-md p-3 bg-card group relative">
              {isEditing ? (
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] w-full justify-start">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {format(editDate, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editDate} onSelect={d => d && setEditDate(d)} className="p-2" />
                    </PopoverContent>
                  </Popover>
                  <Textarea 
                    value={editContent} 
                    onChange={e => setEditContent(e.target.value)} 
                    rows={3} 
                    className="text-xs bg-muted/20" 
                  />
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleEditSave(u.id)} disabled={updateMutation.isPending}>
                      <Check className="h-3 w-3 mr-1" /> Atualizar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-primary">
                          {format(new Date(u.update_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        {u.stage && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-black uppercase tracking-wider border-primary/30 text-primary bg-primary/5 shadow-sm">
                            {stageInfo ? stageInfo.label : u.stage.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      {u.days_since_auction != null && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1 w-fit border-border/50 text-muted-foreground/80 font-bold">
                          <Clock className="h-2.5 w-2.5" />
                          {u.days_since_auction}d desde arrematação
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-[22px] w-[22px] rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => startEditing(u)}
                      >
                        <Pencil className="h-[10px] w-[10px] text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-[22px] w-[22px] rounded-full hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => {
                          if (confirm("Deseja excluir esta atualização?")) deleteUpdate.mutate({ id: u.id, propertyId });
                        }}
                      >
                        <Trash2 className="h-[10px] w-[10px] text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed font-medium text-foreground/90 bg-muted/20 p-2.5 rounded-md border border-border/50">
                    {u.content}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
