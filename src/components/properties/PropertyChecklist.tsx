import { useState, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, MessageSquare, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  useChecklistForStage,
  useToggleChecklistItem,
  useUpdateChecklistNotes,
  type ChecklistItem,
} from "@/hooks/usePropertyChecklist";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

interface Props {
  propertyId: string;
  stage: PropertyStage;
}

export default function PropertyChecklist({ propertyId, stage }: Props) {
  const { data: items, isLoading } = useChecklistForStage(propertyId, stage);
  const toggleItem = useToggleChecklistItem();
  const updateNotes = useUpdateChecklistNotes();
  const { user } = useAuth();

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    items.forEach(item => {
      const list = map.get(item.group_name) || [];
      list.push(item);
      map.set(item.group_name, list);
    });
    return map;
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma tarefa para esta etapa.
      </p>
    );
  }

  const totalDone = items.filter(i => i.completed).length;
  const totalItems = items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Checklist da etapa</span>
        <Badge variant="outline" className="text-xs">
          {totalDone}/{totalItems} concluídas
        </Badge>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%` }}
        />
      </div>

      {[...grouped.entries()].map(([groupName, groupItems]) => (
        <ChecklistGroup
          key={groupName}
          groupName={groupName}
          items={groupItems}
          userId={user?.id ?? ""}
          propertyId={propertyId}
          onToggle={(item) => toggleItem.mutate({ item, userId: user?.id ?? "" })}
          onUpdateNotes={(id, notes) => updateNotes.mutate({ id, notes, propertyId })}
        />
      ))}
    </div>
  );
}

function ChecklistGroup({
  groupName,
  items,
  userId,
  propertyId,
  onToggle,
  onUpdateNotes,
}: {
  groupName: string;
  items: ChecklistItem[];
  userId: string;
  propertyId: string;
  onToggle: (item: ChecklistItem) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = items.filter(i => i.completed).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium flex-1">{groupName}</span>
        <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-1 mt-1">
        {items.map(item => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item)}
            onUpdateNotes={(notes) => onUpdateNotes(item.id, notes)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
  onUpdateNotes,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onUpdateNotes: (notes: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes ?? "");

  const handleSaveNotes = () => {
    onUpdateNotes(localNotes);
    setShowNotes(false);
  };

  return (
    <div className="rounded-md border p-2 bg-card">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={item.completed}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
            {item.task_name}
          </span>
          {item.completed && item.completed_at && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Concluída em {new Date(item.completed_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setShowNotes(!showNotes)}
        >
          <MessageSquare className={`h-3.5 w-3.5 ${item.notes ? "text-primary" : "text-muted-foreground"}`} />
        </Button>
      </div>
      {showNotes && (
        <div className="mt-2 space-y-1.5">
          <Textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            placeholder="Adicionar observação..."
            rows={2}
            className="text-xs"
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowNotes(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveNotes}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
