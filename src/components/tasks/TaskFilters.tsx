import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import MultiSelectFilter from "../properties/MultiSelectFilter";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, parseISO } from "date-fns";
import type { TaskFilterValues } from "@/pages/Tasks";

const TYPE_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reunião" },
  { value: "documentacao", label: "Documentação" },
  { value: "lembrete", label: "Lembrete" },
  { value: "outro", label: "Outro" },
];

interface Props {
  filters: TaskFilterValues;
  onFiltersChange: (filters: TaskFilterValues) => void;
  search: string;
  onSearchChange: (search: string) => void;
  emptyFilters: TaskFilterValues;
}

export default function TaskFilters({ filters, onFiltersChange, search, onSearchChange, emptyFilters }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: members = [] } = useApprovedMembers();

  const update = <K extends keyof TaskFilterValues>(key: K, value: TaskFilterValues[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length + (search ? 1 : 0);

  const clear = () => {
    onFiltersChange(emptyFilters);
    onSearchChange("");
  };

  const memberOptions = members.map(m => ({ value: m.user_id, label: m.full_name || "Sem nome" }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa, lead, imóvel..."
            className="pl-9 bg-background/50 border-border h-9 text-xs"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant={activeCount > 0 || expanded ? "secondary" : "outline"}
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={cn("h-9 gap-2", activeCount > 0 && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20")}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1 h-5 bg-primary/20 hover:bg-primary/30">
              {activeCount}
            </Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-9 px-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2">
          
          {/* Tipo de Tarefa */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tipo de Tarefa</label>
            <MultiSelectFilter
              options={TYPE_OPTIONS}
              selected={filters.types}
              onSelectionChange={(val) => update("types", val)}
              placeholder="Todos os tipos"
            />
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Responsável</label>
            <MultiSelectFilter
              options={memberOptions}
              selected={filters.responsibles}
              onSelectionChange={(val) => update("responsibles", val)}
              placeholder="Todos os responsáveis"
            />
          </div>

          {/* Data de Criação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data de Criação</label>
            <DateRangePicker
              from={filters.createdFrom ? parseISO(filters.createdFrom) : undefined}
              to={filters.createdTo ? parseISO(filters.createdTo) : undefined}
              onChange={(f, t) => {
                onFiltersChange({
                  ...filters,
                  createdFrom: f ? format(f, "yyyy-MM-dd") : null,
                  createdTo: t ? format(t, "yyyy-MM-dd") : null,
                });
              }}
              placeholder="Período"
            />
          </div>

          {/* Prazo (Vencimento) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Prazo (Vencimento)</label>
            <DateRangePicker
              from={filters.dueFrom ? parseISO(filters.dueFrom) : undefined}
              to={filters.dueTo ? parseISO(filters.dueTo) : undefined}
              onChange={(f, t) => {
                onFiltersChange({
                  ...filters,
                  dueFrom: f ? format(f, "yyyy-MM-dd") : null,
                  dueTo: t ? format(t, "yyyy-MM-dd") : null,
                });
              }}
              placeholder="Período"
            />
          </div>

        </div>
      )}
    </div>
  );
}
