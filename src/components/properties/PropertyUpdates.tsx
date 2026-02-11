import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePropertyUpdates, useCreatePropertyUpdate, useDeletePropertyUpdate } from "@/hooks/usePropertyUpdates";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  propertyId: string;
}

export default function PropertyUpdates({ propertyId }: Props) {
  const { data: updates, isLoading } = usePropertyUpdates(propertyId);
  const createUpdate = useCreatePropertyUpdate();
  const deleteUpdate = useDeletePropertyUpdate();
  const { user } = useAuth();

  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const handleSave = () => {
    if (!content.trim()) return;
    createUpdate.mutate({
      propertyId,
      content: content.trim(),
      updateDate: format(date, "yyyy-MM-dd"),
      userId: user?.id ?? "",
    }, {
      onSuccess: () => { setContent(""); setAdding(false); setDate(new Date()); }
    });
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
        {updates?.map(u => (
          <div key={u.id} className="border rounded-md p-3 bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-primary">
                {format(new Date(u.update_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteUpdate.mutate({ id: u.id, propertyId })}>
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
            <p className="text-xs whitespace-pre-wrap">{u.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
