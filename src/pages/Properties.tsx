import { useMemo, useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Building2, Loader2, ArrowLeft, ChevronRight, LayoutGrid, TableIcon, MoreHorizontal, Search, Download, Eye, Settings2, CheckSquare } from "lucide-react";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { PROPERTY_STAGES, totalInvestment, formatCurrency } from "@/lib/property-constants";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { usePropertySettings } from "@/hooks/usePropertySettings";
import { useAuth } from "@/hooks/useAuth";
import { exportToCSV, exportToExcel } from "@/utils/exportUtils";
import KanbanColumn from "@/components/properties/KanbanColumn";
import PropertyTable from "@/components/properties/PropertyTable";
import EditPropertyDialog from "@/components/properties/EditPropertyDialog";
import NewPropertyDialog from "@/components/properties/NewPropertyDialog";
import ImportPropertiesDialog from "@/components/properties/ImportPropertiesDialog";
import PropertyFilters, { EMPTY_FILTERS, type PropertyFilterValues } from "@/components/properties/PropertyFilters";
import SavedFiltersButton from "@/components/properties/SavedFiltersButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import type { Property } from "@/hooks/useProperties";

type PropertyStage = Database["public"]["Enums"]["property_stage"];
type DashboardFilter = "active" | "sales_this_month" | "custom_ids" | null;
type ViewMode = "kanban" | "table";

export default function Properties() {
  const { data: properties, isLoading: isPropertiesLoading } = useProperties();
  const { stages: dynamicStages, isLoading: isStagesLoading } = useKanbanStages("property");
  const updateProperty = useUpdateProperty();
  const [filters, setFilters] = useState<PropertyFilterValues>(EMPTY_FILTERS);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const { user } = useAuth();
  const cardSettings = usePropertySettings();

  useEffect(() => {
    if (user) {
      cardSettings.loadFromCloud(user.id);
    }
  }, [user]);
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardFilter: DashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  useEffect(() => {
    if (dashboardFilter) window.history.replaceState({}, "");
  }, []);

  const [activeListView, setActiveListView] = useState<DashboardFilter>(dashboardFilter);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const stageOrder = useMemo(() => {
    const map: Record<string, number> = {};
    const stages = dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES;
    stages.forEach((s, i) => { map[s.value] = i; });
    return map;
  }, [dynamicStages]);

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
    if (activeListView === "custom_ids") {
      const ids = (location.state as any)?.ids || [];
      return properties.filter(p => ids.includes(p.id));
    }
    return [];
  }, [properties, activeListView, stageOrder, location.state]);

  const matchesMultiSelect = (value: string, selected: string[]) => {
    if (selected.length === 0) return true; // "all"
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value);
  };

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => {
      if (filters.search && !p.code.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (!matchesMultiSelect(p.stage, filters.stage)) return false;
      if (!matchesMultiSelect(p.property_type, filters.property_type)) return false;
      if (!matchesMultiSelect(p.state, filters.state)) return false;
      if (!matchesMultiSelect(p.city, filters.city)) return false;
      if (!matchesMultiSelect(p.priority, filters.priority)) return false;
      if (!matchesMultiSelect(p.occupation_status, filters.occupation_status)) return false;
      if (!matchesMultiSelect(p.responsible_user_id ?? "", filters.responsible_user_id)) return false;
      const inv = totalInvestment(p);
      if (filters.price_min && inv < Number(filters.price_min)) return false;
      if (filters.price_max && inv > Number(filters.price_max)) return false;
      if (filters.auction_date_start && (!p.auction_date || p.auction_date < filters.auction_date_start)) return false;
      if (filters.auction_date_end && (!p.auction_date || p.auction_date > filters.auction_date_end)) return false;
      if (filters.neighborhood && !p.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase())) return false;
      if (filters.area_min && (p.area_total ?? 0) < Number(filters.area_min)) return false;
      if (filters.area_max && (p.area_total ?? 0) > Number(filters.area_max)) return false;
      return true;
    });
  }, [properties, filters]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    const stages = dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES;
    stages.forEach(s => (map[s.value] = []));
    filtered.forEach(p => {
      if (map[p.stage]) map[p.stage]!.push(p);
    });
    return map;
  }, [filtered, dynamicStages]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    updateProperty.mutate({ id: draggableId, stage: newStage as any });
  };

  const isLoading = isPropertiesLoading || isStagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Dashboard drill-down list view
  if (activeListView) {
    const title = activeListView === "active" ? "Imóveis Ativos" 
                : activeListView === "sales_this_month" ? "Vendas do Mês"
                : (location.state as any)?.title || "Imóveis Selecionados";
    
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao relatório de imóveis por etapa
          </Button>
          <h1 className="text-xl font-bold">{title}</h1>
          <Badge variant="secondary">{listItems.length}</Badge>
        </div>
        {listItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum imóvel encontrado.</p>
        ) : (
          <div className="space-y-4">
            {(dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES)
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
                        <Card key={p.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedProperty(p)}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{p.code}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.city ? `${p.city}/${p.state}` : p.state}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{formatCurrency(p.listed_price || p.purchase_price)}</p>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        {selectedProperty && (
          <EditPropertyDialog
            property={selectedProperty}
            open={!!selectedProperty}
            onOpenChange={(open) => { if (!open) setSelectedProperty(null); }}
          />
        )}
      </div>
    );
  }

  const totalPortfolioValue = filtered.reduce((sum, p) => sum + (p.purchase_price || 0), 0);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                Funil de Imóveis
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider font-body">Portfólio e Ativos Imobiliários</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-l pl-4">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary" />
                <Input 
                  placeholder="Busca e filtro" 
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="h-8 w-48 pl-9 bg-muted/30 dark:bg-muted/10 border-none shadow-none text-xs focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                />
             </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 border-l pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Imóveis</p>
              <p className="text-sm font-black text-foreground">{filtered.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Portfólio</p>
              <p className="text-sm font-black text-primary">{formatCurrency(totalPortfolioValue)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NewPropertyDialog />

          <div className="h-6 w-px bg-border/50 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-muted border border-border/20 shadow-sm" title="Mais opções (Visualização e Filtros)">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 pt-2">Visualização</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={viewMode} onValueChange={v => setViewMode(v as ViewMode)} className="px-1">
                <DropdownMenuRadioItem value="kanban" className="text-xs font-bold uppercase py-2 cursor-pointer">
                  <LayoutGrid className="h-4 w-4 mr-2" /> Modo Kanban (Cards)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="table" className="text-xs font-bold uppercase py-2 cursor-pointer">
                  <TableIcon className="h-4 w-4 mr-2" /> Modo Tabela (Lista)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              {viewMode === "kanban" && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 pt-1">Tamanho do Card</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={cardSettings.size} onValueChange={v => cardSettings.setCardSize(v as any)} className="px-1">
                    <DropdownMenuRadioItem value="small" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Pequeno</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Médio</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="large" className="text-xs font-bold uppercase py-1.5 cursor-pointer">Grande</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>

                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground uppercase px-2 py-1.5 tracking-widest">Campos Visíveis</DropdownMenuLabel>
                  <div className="px-2 py-1 space-y-1">
                    {[
                      { id: "showPhoto", label: "Fotos", icon: Eye },
                      { id: "showPriority", label: "Prioridade / Prazo", icon: CheckSquare },
                      { id: "showLocation", label: "Localização", icon: CheckSquare },
                      { id: "showNeighborhood", label: "Bairro", icon: CheckSquare },
                      { id: "showStatus", label: "Status Ocupação", icon: CheckSquare },
                      { id: "showAuctionDate", label: "Data de Arrematação", icon: CheckSquare },
                      { id: "showFinancial", label: "Valores", icon: CheckSquare },
                      { id: "showResponsible", label: "Responsável", icon: CheckSquare },
                    ].map(field => (
                      <div key={field.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 transition-colors" 
                           onClick={() => cardSettings.toggleField(field.id as any)}>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${cardSettings[field.id as keyof typeof cardSettings] ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'}`}>
                          {cardSettings[field.id as keyof typeof cardSettings] && <LayoutGrid className="h-2.5 w-2.5" />}
                        </div>
                        <span className="text-[11px] font-bold uppercase leading-none">{field.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">Dados</DropdownMenuLabel>
              <div className="px-1 space-y-1">
                <ImportPropertiesDialog />
                <Button 
                  variant="outline" 
                   size="sm" 
                  className="w-full justify-start gap-2 font-bold uppercase text-[10px] h-8 border-primary/20 hover:bg-primary/5"
                  onClick={() => exportToCSV('imoveis_invest_crm', filtered)}
                >
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </Button>
                <Button 
                  variant="outline" 
                   size="sm" 
                  className="w-full justify-start gap-2 font-bold uppercase text-[10px] h-8 border-primary/20 hover:bg-primary/5"
                  onClick={() => exportToExcel('imoveis_invest_crm', filtered)}
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Excel (XLSX)
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PropertyFilters filters={filters} onFiltersChange={setFilters} />
      <div className="mt-2">
        <SavedFiltersButton currentFilters={filters} onLoadFilter={setFilters} />
      </div>

      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto mt-4">
            <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
              {(dynamicStages.length > 0 ? dynamicStages : PROPERTY_STAGES).map(stage => (
                <KanbanColumn
                  key={stage.value}
                  stageId={(stage as any).id}
                  stageValue={stage.value}
                  stageLabel={stage.label}
                  stageColor={stage.color}
                  properties={grouped[stage.value] || []}
                  cardSettings={cardSettings}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 overflow-auto mt-4">
          <PropertyTable properties={filtered} />
        </div>
      )}
    </div>
  );
}
