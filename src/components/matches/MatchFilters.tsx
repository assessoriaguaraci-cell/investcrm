import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { LINK_STATUSES } from "@/lib/link-constants";
import { TEMPERATURE_OPTIONS } from "@/lib/client-constants";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import type { Database } from "@/integrations/supabase/types";

type LinkStatus = Database["public"]["Enums"]["link_status"];
type LeadTemperature = Database["public"]["Enums"]["lead_temperature"];
type PropertyStage = Database["public"]["Enums"]["property_stage"];

export interface MatchFilterValues {
  search: string;
  status: LinkStatus | "";
  temperature: LeadTemperature | "";
  property_stage: PropertyStage | "";
}

export const EMPTY_MATCH_FILTERS: MatchFilterValues = {
  search: "",
  status: "",
  temperature: "",
  property_stage: "",
};

interface Props {
  filters: MatchFilterValues;
  onFiltersChange: (f: MatchFilterValues) => void;
}

export default function MatchFilters({ filters, onFiltersChange }: Props) {
  const set = (key: keyof MatchFilterValues, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        placeholder="Buscar cliente ou imóvel…"
        value={filters.search}
        onChange={e => set("search", e.target.value)}
        className="w-48 h-8 text-xs"
      />

      <Select value={filters.status || "all"} onValueChange={v => set("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {LINK_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.temperature || "all"} onValueChange={v => set("temperature", v === "all" ? "" : v)}>
        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Temperatura" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {TEMPERATURE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.property_stage || "all"} onValueChange={v => set("property_stage", v === "all" ? "" : v)}>
        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Etapa imóvel" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas etapas</SelectItem>
          {PROPERTY_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onFiltersChange(EMPTY_MATCH_FILTERS)}>
          <X className="h-3 w-3 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}
