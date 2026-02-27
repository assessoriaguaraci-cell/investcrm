import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES } from "@/lib/property-constants";
import AddColumnDialog from "../kanban/AddColumnDialog";
import DeleteColumnDialog from "../kanban/DeleteColumnDialog";

export interface ClientFilterValues {
  search: string;
  temperature: string;
  state: string;
  city: string;
  work_regime: string;
  marital_status: string;
  has_fgts: string;
  income_min: string;
  income_max: string;
}

export const EMPTY_CLIENT_FILTERS: ClientFilterValues = {
  search: "",
  temperature: "",
  state: "",
  city: "",
  work_regime: "",
  marital_status: "",
  has_fgts: "",
  income_min: "",
  income_max: "",
};

interface Props {
  filters: ClientFilterValues;
  onFiltersChange: (filters: ClientFilterValues) => void;
  activePipeline?: string;
}

export default function ClientFilters({ filters, onFiltersChange, activePipeline }: Props) {
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof ClientFilterValues, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== "search").length;
  const clear = () => onFiltersChange(EMPTY_CLIENT_FILTERS);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
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
        <AddColumnDialog funnelType="client" pipeline={activePipeline} />
        <DeleteColumnDialog funnelType="client" pipeline={activePipeline} />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Temperatura</label>
            <Select value={filters.temperature} onValueChange={v => update("temperature", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TEMPERATURE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Regime de Trabalho</label>
            <Select value={filters.work_regime} onValueChange={v => update("work_regime", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {WORK_REGIMES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado Civil</label>
            <Select value={filters.marital_status} onValueChange={v => update("marital_status", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MARITAL_STATUSES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">FGTS</label>
            <Select value={filters.has_fgts} onValueChange={v => update("has_fgts", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Com FGTS</SelectItem>
                <SelectItem value="false">Sem FGTS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Renda mín (R$)</label>
            <Input type="number" placeholder="0" value={filters.income_min} onChange={e => update("income_min", e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Renda máx (R$)</label>
            <Input type="number" placeholder="∞" value={filters.income_max} onChange={e => update("income_max", e.target.value)} className="h-9" />
          </div>
        </div>
      )}
    </div>
  );
}
