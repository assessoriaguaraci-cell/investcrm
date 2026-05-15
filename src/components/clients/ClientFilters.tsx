import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MultiSelectFilter from "../properties/MultiSelectFilter";
import { TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { BRAZILIAN_STATES } from "@/lib/property-constants";
import AddColumnDialog from "../kanban/AddColumnDialog";
import { SavedFiltersButton } from "@/components/ui/saved-filters-button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { sanitizeClientFilters, type ClientFilterValues, EMPTY_CLIENT_FILTERS } from "@/hooks/useClientFiltersStore";

interface Props {
  filters: ClientFilterValues;
  onFiltersChange: (filters: ClientFilterValues) => void;
  activePipeline?: string;
}

import { useApprovedMembers } from "@/hooks/useTeamMembers";

export default function ClientFilters({ filters, onFiltersChange, activePipeline }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: members = [] } = useApprovedMembers();
  const [allCities, setAllCities] = useState<{ city: string, state: string }[]>([]);

  useEffect(() => {
    // Fetch unique cities from clients to linked filters
    supabase.from("clients").select("city, state").not("city", "is", null).then(({ data }) => {
      if (data) {
        const unique = data.reduce((acc: any[], curr) => {
          if (!acc.find(item => item.city === curr.city && item.state === curr.state)) {
            acc.push(curr);
          }
          return acc;
        }, []);
        setAllCities(unique);
      }
    });
  }, []);

  const update = <K extends keyof ClientFilterValues>(key: K, value: ClientFilterValues[K]) => {
    const next = { ...filters, [key]: value };
    if (key === "state") next.city = []; // Reset city when state changes if not matches? Or just filter?
    onFiltersChange(next);
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
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
          className={cn(
            "gap-1.5 font-black uppercase text-[10px] tracking-tight",
            expanded ? "bg-orange-600 text-white hover:bg-orange-700 border-none" : "bg-muted text-foreground border-border hover:bg-muted/80"
          )}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-orange-500 text-white">
              {activeCount}
            </Badge>
          )}
        </Button>
        <AddColumnDialog funnelType="client" pipeline={activePipeline} />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-orange-500 font-black uppercase text-[10px] hover:bg-orange-500/10">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Temperatura</label>
            <MultiSelectFilter
              label="Temperatura"
              options={TEMPERATURE_OPTIONS.map(t => ({ value: t.value, label: t.label }))}
              selected={filters.temperature}
              onSelectionChange={v => update("temperature", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
            <MultiSelectFilter
              label="Estado"
              options={BRAZILIAN_STATES.map(s => ({ value: s, label: s }))}
              selected={filters.state}
              onSelectionChange={v => update("state", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
            <MultiSelectFilter
              label="Cidade"
              options={allCities
                .filter(c => filters.state.length === 0 || filters.state.includes(c.state))
                .map(c => ({ value: c.city, label: c.city }))
                .sort((a, b) => a.label.localeCompare(b.label))
              }
              selected={filters.city}
              onSelectionChange={v => update("city", v)}
              placeholder={filters.state.length === 0 ? "Selecione um estado" : "Todas"}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Regime de Trabalho</label>
            <MultiSelectFilter
              label="Regime"
              options={WORK_REGIMES.map(w => ({ value: w.value, label: w.label }))}
              selected={filters.work_regime}
              onSelectionChange={v => update("work_regime", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado Civil</label>
            <MultiSelectFilter
              label="Civil"
              options={MARITAL_STATUSES.map(m => ({ value: m, label: m }))}
              selected={filters.marital_status}
              onSelectionChange={v => update("marital_status", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">FGTS</label>
            <MultiSelectFilter
              label="FGTS"
              options={[
                { value: "true", label: "Com FGTS" },
                { value: "false", label: "Sem FGTS" }
              ]}
              selected={filters.has_fgts}
              onSelectionChange={v => update("has_fgts", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Renda mín (R$)</label>
            <Input type="number" placeholder="0" value={filters.income_min} onChange={e => update("income_min", e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Renda máx (R$)</label>
            <Input type="number" placeholder="∞" value={filters.income_max} onChange={e => update("income_max", e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável</label>
            <MultiSelectFilter
              label="Responsável"
              options={members.map(m => ({ value: m.user_id, label: m.full_name || "Sem nome" }))}
              selected={filters.responsible_user_id}
              onSelectionChange={v => update("responsible_user_id", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Filtrar por Tag</label>
            <Input placeholder="Ex: Lead Frio" value={filters.tag} onChange={e => update("tag", e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pendência Fin.</label>
            <MultiSelectFilter
              label="Pendência"
              options={[
                { value: "true", label: "Sim" },
                { value: "false", label: "Não" }
              ]}
              selected={filters.has_financial_pending}
              onSelectionChange={v => update("has_financial_pending", v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Compõe Renda</label>
            <MultiSelectFilter
              label="Compõe"
              options={[
                { value: "true", label: "Sim" },
                { value: "false", label: "Não" }
              ]}
              selected={filters.can_compose_income}
              onSelectionChange={v => update("can_compose_income", v)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de Cadastro</label>
            <DateRangePicker
              date={{
                from: filters.created_at_start ? parseISO(filters.created_at_start) : undefined,
                to: filters.created_at_end ? parseISO(filters.created_at_end) : undefined,
              }}
              onDateChange={(range) => {
                onFiltersChange({
                  ...filters,
                  created_at_start: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  created_at_end: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                });
              }}
            />
          </div>
        </div>
      )}
    <div className="mt-2">
        <SavedFiltersButton
          entityType="clients"
          currentFilters={filters}
          emptyFilters={EMPTY_CLIENT_FILTERS}
          onLoadFilter={onFiltersChange}
          sanitize={sanitizeClientFilters}
        />
      </div>
    </div>
  );
}
