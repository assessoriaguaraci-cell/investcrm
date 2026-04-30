import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Loader2, CalendarIcon, Trash2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useChecklistForStage,
  useToggleChecklistItem,
  useUpdateChecklistNotes,
  useUpdateChecklistDate,
  useAddChecklistStrategy,
  useDeleteChecklistGroup,
  type ChecklistItem,
} from "@/hooks/usePropertyChecklist";
import { STRATEGY_TEMPLATES } from "@/lib/checklist-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const updateDate = useUpdateChecklistDate();
  const addStrategy = useAddChecklistStrategy();
  const deleteGroup = useDeleteChecklistGroup();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-sm text-muted-foreground">Nenhum checklist configurado para esta etapa.</p>
        <p className="text-xs text-muted-foreground/60 italic">Isso pode ocorrer se a etapa for nova ou não possuir tarefas padrão.</p>
      </div>
    );
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    items.forEach(item => {
      const list = map.get(item.group_name) || [];
      list.push(item);
      map.set(item.group_name, list);
    });
    return map;
  }, [items]);

  const totalDone = items.filter(i => i.completed).length;
  const totalItems = items.length;

  const handleToggleGroup = (groupItems: ChecklistItem[], allDone: boolean) => {
    // Toggle all items in group to opposite of current state
    const targetState = !allDone;
    groupItems.forEach(item => {
      if (item.completed !== targetState) {
        toggleItem.mutate({ item, userId: user?.id ?? "" });
      }
    });
  };

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
          onToggleGroup={handleToggleGroup}
          onUpdateNotes={(id, notes) => updateNotes.mutate({ id, notes, propertyId })}
          onUpdateDate={(id, date) => updateDate.mutate({ id, completedAt: date, propertyId })}
          onDeleteGroup={() => deleteGroup.mutate({ propertyId, groupName })}
        />
      ))}

      {stage === "desocupacao" && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adicionar Estratégia de Desocupação</p>
          <div className="flex gap-2">
            <Select onValueChange={(val) => addStrategy.mutate({ propertyId, stage, strategyName: val, tasks: STRATEGY_TEMPLATES[val] })}>
              <SelectTrigger className="flex-1 h-9 text-xs font-bold uppercase">
                <SelectValue placeholder="SELECIONE A ESTRATÉGIA" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STRATEGY_TEMPLATES).map(strat => (
                  <SelectItem key={strat} value={strat} className="text-xs font-bold uppercase">{strat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistGroup({
  groupName,
  items,
  userId,
  propertyId,
  onToggle,
  onToggleGroup,
  onUpdateNotes,
  onUpdateDate,
  onDeleteGroup,
}: {
  groupName: string;
  items: ChecklistItem[];
  userId: string;
  propertyId: string;
  onToggle: (item: ChecklistItem) => void;
  onToggleGroup: (items: ChecklistItem[], allDone: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDate: (id: string, date: string) => void;
  onDeleteGroup: () => void;
}) {
  const [open, setOpen] = useState(true);
  const done = items.filter(i => i.completed).length;
  const allDone = done === items.length && items.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allDone}
          onCheckedChange={() => onToggleGroup(items, allDone)}
          className="shrink-0"
        />
        <Collapsible open={open} onOpenChange={setOpen} className="flex-1">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group/trigger">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-medium flex-1">{groupName}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
              {groupName !== "Diagnóstico" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover/trigger:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Tem certeza que deseja excluir o grupo "${groupName}"?`)) {
                      onDeleteGroup();
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1 mt-1">
            {items.map(item => {
              return (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item)}
                  onUpdateNotes={(notes) => onUpdateNotes(item.id, notes)}
                  onUpdateDate={(date) => onUpdateDate(item.id, date)}
                />
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function ChecklistItemRow({
  item,
  disabled,
  onToggle,
  onUpdateNotes,
  onUpdateDate,
}: {
  item: ChecklistItem;
  disabled?: boolean;
  onToggle: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateDate: (date: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes ?? "");

  const handleSaveNotes = () => {
    onUpdateNotes(localNotes);
    setShowNotes(false);
  };

  return (
    <div className={cn("rounded-md border p-2 bg-card", disabled && "opacity-50")}>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={item.completed}
          onCheckedChange={onToggle}
          className="mt-0.5"
          disabled={disabled}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
            {item.task_name.toLowerCase().includes("fluxo do crm") || item.task_name.toLowerCase().includes("cadastrado no crm") ? "Imóvel cadastrado no SMARTAPP" : item.task_name}
          </span>
          {disabled && (
            <p className="text-[10px] text-destructive mt-0.5">Bloqueado (CCV assinado)</p>
          )}
          {item.completed && item.completed_at && (
            <div className="flex items-center gap-1 mt-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                    <CalendarIcon className="h-2.5 w-2.5" />
                    {format(new Date(item.completed_at), "dd/MM/yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(item.completed_at)}
                    onSelect={(d) => {
                      if (d) onUpdateDate(d.toISOString());
                    }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
