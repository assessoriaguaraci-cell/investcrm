import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PROPERTY_STAGES, PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS, BRAZILIAN_STATES } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import CityCombobox from "./CityCombobox";

export interface PropertyFilterValues {
  search: string;
  stage: string;
  property_type: string;
  state: string;
  city: string;
  priority: string;
  occupation_status: string;
  price_min: string;
  price_max: string;
  responsible_user_id: string;
}

export const EMPTY_FILTERS: PropertyFilterValues = {
  search: "",
  stage: "",
  property_type: "",
  state: "",
  city: "",
  priority: "",
  occupation_status: "",
  price_min: "",
  price_max: "",
  responsible_user_id: "",
};

interface Props {
  filters: PropertyFilterValues;
  onFiltersChange: (filters: PropertyFilterValues) => void;
}

export default function PropertyFilters({ filters, onFiltersChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: members } = useApprovedMembers();
  const update = (key: keyof PropertyFilterValues, value: string) => {
    const next = { ...filters, [key]: value };
    if (key === "state") next.city = "";
    onFiltersChange(next);
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== "search").length;

  const clear = () => onFiltersChange(EMPTY_FILTERS);

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
            <Select value={filters.stage} onValueChange={v => update("stage", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PROPERTY_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <Select value={filters.property_type} onValueChange={v => update("property_type", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
            <Select value={filters.state} onValueChange={v => update("state", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {BRAZILIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
            <CityCombobox value={filters.city} onValueChange={v => update("city", v)} state={filters.state || undefined} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
            <Select value={filters.priority} onValueChange={v => update("priority", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PRIORITY_LEVELS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ocupação</label>
            <Select value={filters.occupation_status} onValueChange={v => update("occupation_status", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {OCCUPATION_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Select value={filters.responsible_user_id} onValueChange={v => update("responsible_user_id", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Sem nome"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
