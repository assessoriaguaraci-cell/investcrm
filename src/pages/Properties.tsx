import { useMemo, useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Building2, Loader2, ArrowLeft, X } from "lucide-react";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { totalInvestment, formatCurrency } from "@/lib/property-constants";
import KanbanColumn from "@/components/properties/KanbanColumn";
import NewPropertyDialog from "@/components/properties/NewPropertyDialog";
import PropertyFilters, { EMPTY_FILTERS, type PropertyFilterValues } from "@/components/properties/PropertyFilters";
import SavedFiltersButton from "@/components/properties/SavedFiltersButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from "react-router-dom";
import { parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

type DashboardFilter = "active" | "sales_this_month" | null;

export default function Properties() {
  const { data: properties, isLoading } = useProperties();
  const updateProperty = useUpdateProperty();
  const [filters, setFilters] = useState<PropertyFilterValues>(EMPTY_FILTERS);
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardFilter: DashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  // Clear nav state so refreshing doesn't re-apply
  useEffect(() => {
    if (dashboardFilter) {
      window.history.replaceState({}, "");
    }
  }, []);

  const [activeListView, setActiveListView] = useState<DashboardFilter>(dashboardFilter);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const stageOrder = useMemo(() => {
    const map: Record<string, number> = {};
    PROPERTY_STAGES.forEach((s, i) => { map[s.value] = i; });
    return map;
  }, []);

  // Filtered items for the dashboard drill-down list views
  const listItems = useMemo(() => {
    if (!properties || !activeListView) return [];
    if (activeListView === "active") {
      return [...properties]
        .filter(p => p.stage !== "finalizado")
        .sort((a, b) => (stageOrder[a.stage] ?? 99) - (stageOrder[b.stage] ?? 99));
    }
    if (activeListView === "sales_this_month") {
      return properties.filter(p => {
        if (!p.sale_date) return false;
        const d = parseISO(p.sale_date);
        return isAfter(d, monthStart) && isBefore(d, monthEnd);
      });
    }
    return [];
  }, [properties, activeListView, stageOrder]);

  // Normal kanban filter
  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => {
      if (filters.search && !p.code.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.stage && p.stage !== filters.stage) return false;
      if (filters.property_type && p.property_type !== filters.property_type) return false;
      if (filters.state && p.state !== filters.state) return false;
      if (filters.city && p.city !== filters.city) return false;
      if (filters.priority && p.priority !== filters.priority) return false;
      if (filters.occupation_status && p.occupation_status !== filters.occupation_status) return false;
      if (filters.responsible_user_id && p.responsible_user_id !== filters.responsible_user_id) return false;
      const inv = totalInvestment(p);
      if (filters.price_min && inv < Number(filters.price_min)) return false;
      if (filters.price_max && inv > Number(filters.price_max)) return false;
      return true;
    });
  }, [properties, filters]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    PROPERTY_STAGES.forEach(s => (map[s.value] = []));
    filtered.forEach(p => {
      if (map[p.stage]) map[p.stage]!.push(p);
    });
    return map;
  }, [filtered]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId as PropertyStage;
    updateProperty.mutate({ id: draggableId, stage: newStage });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Dashboard drill-down list view
  if (activeListView) {
    const title = activeListView === "active" ? "Imóveis Ativos" : "Vendas do Mês";
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveListView(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Kanban
          </Button>
          <h1 className="text-xl font-bold">{title}</h1>
          <Badge variant="secondary">{listItems.length}</Badge>
        </div>
        {listItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum imóvel encontrado.</p>
        ) : (
          <div className="space-y-4">
            {PROPERTY_STAGES
              .filter(s => listItems.some(p => p.stage === s.value))
              .map(stage => {
                const stageItems = listItems.filter(p => p.stage === stage.value);
                return (
                  <div key={stage.value}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stage.label}</h3>
                      <Badge variant="secondary" className="text-xs h-5">{stageItems.length}</Badge>
                    </div>
                    <div className="space-y-1.5 ml-5">
                      {stageItems.map(p => (
                        <Card key={p.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{p.code}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.city ? `${p.city}/${p.state}` : p.state}
                              </p>
                            </div>
                            <p className="text-sm font-semibold">{formatCurrency(p.listed_price || p.purchase_price)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Funil de Imóveis
          </h1>
          <p className="text-xs text-muted-foreground">Arraste os cards entre as etapas</p>
        </div>
        <NewPropertyDialog />
      </div>

      <PropertyFilters filters={filters} onFiltersChange={setFilters} />
      <div className="mt-2">
        <SavedFiltersButton currentFilters={filters} onLoadFilter={setFilters} />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto mt-4">
          <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
            {PROPERTY_STAGES.map(stage => (
              <KanbanColumn
                key={stage.value}
                stageValue={stage.value}
                stageLabel={stage.label}
                stageColor={stage.color}
                properties={grouped[stage.value] || []}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
