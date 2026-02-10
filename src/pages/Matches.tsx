import { useMemo, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { useClientPropertyLinks } from "@/hooks/useClientPropertyLinks";
import { LINK_STATUSES } from "@/lib/link-constants";
import LinkCard from "@/components/matches/LinkCard";
import NewLinkDialog from "@/components/matches/NewLinkDialog";
import MatchFilters, { EMPTY_MATCH_FILTERS, type MatchFilterValues } from "@/components/matches/MatchFilters";

export default function Matches() {
  const { data: links, isLoading } = useClientPropertyLinks();
  const [filters, setFilters] = useState<MatchFilterValues>(EMPTY_MATCH_FILTERS);

  const filtered = useMemo(() => {
    if (!links) return [];
    return links.filter(l => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchClient = l.clients?.full_name?.toLowerCase().includes(q);
        const matchProperty = l.properties?.code?.toLowerCase().includes(q);
        if (!matchClient && !matchProperty) return false;
      }
      if (filters.status && l.status !== filters.status) return false;
      if (filters.temperature && l.clients?.temperature !== filters.temperature) return false;
      if (filters.property_stage && l.properties?.stage !== filters.property_stage) return false;
      return true;
    });
  }, [links, filters]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    LINK_STATUSES.forEach(s => (map[s.value] = []));
    filtered.forEach(l => {
      if (map[l.status]) map[l.status]!.push(l);
    });
    return map;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vínculos Cliente ↔ Imóvel
          </h1>
          <p className="text-xs text-muted-foreground">Gerencie propostas e relacionamentos</p>
        </div>
        <NewLinkDialog />
      </div>

      <MatchFilters filters={filters} onFiltersChange={setFilters} />

      <div className="flex-1 overflow-x-auto mt-4">
        <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
          {LINK_STATUSES.map(status => (
            <div key={status.value} className="w-72 shrink-0 flex flex-col">
              <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${status.color}`}>
                <span className="text-xs font-semibold text-white">{status.label}</span>
                <span className="text-[10px] font-mono text-white/80">
                  {grouped[status.value]?.length ?? 0}
                </span>
              </div>
              <div className="flex-1 bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[120px]">
                {(grouped[status.value] ?? []).map(link => (
                  <LinkCard key={link.id} link={link} />
                ))}
                {(grouped[status.value] ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhum vínculo</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
