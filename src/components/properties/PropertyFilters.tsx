import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PROPERTY_STAGES, PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import MultiSelectFilter from "./MultiSelectFilter";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import AddColumnDialog from "../kanban/AddColumnDialog";
import DeleteColumnDialog from "../kanban/DeleteColumnDialog";
import { useKanbanStages } from "@/hooks/useKanbanStages";

export interface PropertyFilterValues {
  search: string;
  stage: string[];
  property_type: string[];
  state: string[];
  city: string;
  priority: string[];
  occupation_status: string[];
  price_min: string;
  price_max: string;
  responsible_user_id: string[];
  auction_date_start: string;
  auction_date_end: string;
}

export const EMPTY_FILTERS: PropertyFilterValues = {
  search: "",
  stage: [],
  property_type: [],
  state: [],
  city: "",
  priority: [],
  occupation_status: [],
  price_min: "",
  price_max: "",
  responsible_user_id: [],
  auction_date_start: "",
  auction_date_end: "",
};

interface Props {
  filters: PropertyFilterValues;
  onFiltersChange: (filters: PropertyFilterValues) => void;
}

export default function PropertyFilters({ filters, onFiltersChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: members } = useApprovedMembers();
  const { stages: dynamicStages } = useKanbanStages("property");

  const update = <K extends keyof PropertyFilterValues>(key: K, value: PropertyFilterValues[K]) => {
    const next = { ...filters, [key]: value };
    if (key === "state") next.city = "";
    onFiltersChange(next);
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;

  const clear = () => onFiltersChange(EMPTY_FILTERS);

  const stateOptions = BRAZILIAN_STATES.map(s => ({ value: s, label: s }));
  const memberOptions = members.map(m => ({ value: m.user_id, label: m.full_name || "Sem nome" }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código..."
            value={filters.search}
            onChange={e => update("search", e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant={expanded ? "secondary" : "outline"}
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
        <AddColumnDialog funnelType="property" />
        <DeleteColumnDialog funnelType="property" />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Etapa</label>
            <MultiSelectFilter
              label="Etapa"
              options={(dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES).map(s => ({ value: s.value, label: s.label }))}
              selected={filters.stage}
              onSelectionChange={v => update("stage", v)}
              placeholder="Todas"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <MultiSelectFilter
              label="Tipo"
              options={PROPERTY_TYPES.map(t => ({ value: t.value, label: t.label }))}
              selected={filters.property_type}
              onSelectionChange={v => update("property_type", v)}
              placeholder="Todos"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
            <MultiSelectFilter
              label="Estado"
              options={stateOptions}
              selected={filters.state}
              onSelectionChange={v => update("state", v)}
              placeholder="Todos"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
            <MultiSelectFilter
              label="Prioridade"
              options={PRIORITY_LEVELS.map(p => ({ value: p.value, label: p.label }))}
              selected={filters.priority}
              onSelectionChange={v => update("priority", v)}
              placeholder="Todas"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ocupação</label>
            <MultiSelectFilter
              label="Ocupação"
              options={OCCUPATION_STATUSES.map(o => ({ value: o.value, label: o.label }))}
              selected={filters.occupation_status}
              onSelectionChange={v => update("occupation_status", v)}
              placeholder="Todas"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço mín (R$)</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.price_min}
              onChange={e => update("price_min", e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço máx (R$)</label>
            <Input
              type="number"
              placeholder="∞"
              value={filters.price_max}
              onChange={e => update("price_max", e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável</label>
            <MultiSelectFilter
              label="Responsável"
              options={memberOptions}
              selected={filters.responsible_user_id}
              onSelectionChange={v => update("responsible_user_id", v)}
              placeholder="Todos"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de arrematação</label>
            <DateRangePicker
              date={{
                from: filters.auction_date_start ? parseISO(filters.auction_date_start) : undefined,
                to: filters.auction_date_end ? parseISO(filters.auction_date_end) : undefined,
              }}
              onDateChange={(range) => {
                const next = { ...filters };
                next.auction_date_start = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                next.auction_date_end = range?.to ? format(range.to, "yyyy-MM-dd") : "";
                onFiltersChange(next);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
