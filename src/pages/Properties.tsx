import { useMemo, useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Building2, Loader2, ArrowLeft, ChevronRight, LayoutGrid, TableIcon, MoreHorizontal, Search, Download, Eye, Settings2, CheckSquare, Plus } from "lucide-react";
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
import AddColumnDialog from "@/components/kanban/AddColumnDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { usePropertyFunnels, useCreatePropertyFunnel } from "@/hooks/usePropertyFunnels";
import { toast } from "sonner";

type PropertyStage = Database["public"]["Enums"]["property_stage"];
type DashboardFilter = "active" | "sales_this_month" | "custom_ids" | null;
type ViewMode = "kanban" | "table";

export default function Properties() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | undefined>(undefined);
  const { data: properties, isLoading: isPropertiesLoading } = useProperties();
  const { stages: dynamicStages, isLoading: isStagesLoading, updateStage, addStage } = useKanbanStages("property", selectedFunnelId);
  const { data: funnels } = usePropertyFunnels();
  const createFunnelMutation = useCreatePropertyFunnel();

  const updateProperty = useUpdateProperty();
  const [filters, setFilters] = useState<PropertyFilterValues>(EMPTY_FILTERS);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const { user } = useAuth();
  const cardSettings = usePropertySettings();

  const [isNewFunnelOpen, setIsNewFunnelOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");

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

  const stages = useMemo(() => {
    // If we have dynamic stages for this funnel, use them. 
    // Otherwise use default PROPERTY_STAGES for the main funnel (undefined funnelId)
    const base = dynamicStages.length > 0 ? dynamicStages : (!selectedFunnelId ? PROPERTY_STAGES : []);
    
    if (base.length === 0 && selectedFunnelId) {
        return []; // Funnel exists but has no columns
    }

    const hasCancelados = base.some(s => s.value === "cancelados");
    if (!hasCancelados && base.length > 0) {
      return [...base, { value: "cancelados", label: "Cancelados", color: "bg-red-500" } as any];
    }
    return base;
  }, [dynamicStages, selectedFunnelId]);

  const stageOrder = useMemo(() => {
    const map: Record<string, number> = {};
    stages.forEach((s, i) => { map[s.value] = i; });
    return map;
  }, [stages]);

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
    stages.forEach(s => (map[s.value] = []));
    filtered.forEach(p => {
      if (map[p.stage]) map[p.stage]!.push(p);
    });
    return map;
  }, [filtered, stages]);

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
        const newStages = Array.from(stages);
        const [removed] = newStages.splice(source.index, 1);
        newStages.splice(destination.index, 0, removed);
        
        // Use a flag to ensure we handle the first move by promoting all stages
        for (let i = 0; i < newStages.length; i++) {
            const s = newStages[i];
            if ((s as any).id) {
                await updateStage({ id: (s as any).id, sort_order: i * 10 } as any);
            } else {
                // Promote to dynamic to lock the order and exclude deleted ones
                await addStage({
                    funnel_type: "property",
                    value: s.value,
                    label: s.label,
                    color: s.color,
                    funnel_id: selectedFunnelId as any,
                    sort_order: i * 10
                } as any);
            }
        }
        return;
    }

    const newStageId = destination.droppableId;
    // Extract actual stage value if it's a composite ID (val-id-idx)
    const newStage = newStageId.includes("---") ? newStageId.split("---")[0] : newStageId;
    updateProperty.mutate({ id: draggableId, stage: newStage as any });
  };

  const handleCreateFunnel = async () => {
    if (!newFunnelName) return;
    try {
      await createFunnelMutation.mutateAsync(newFunnelName);
      setIsNewFunnelOpen(false);
      setNewFunnelName("");
    } catch (error) {
      toast.error("Erro ao criar funil.");
    }
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
    // ... (Keep existing drill-down view code, it's mostly the same)
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
             <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <Select value={selectedFunnelId || "default"} onValueChange={(v) => setSelectedFunnelId(v === "default" ? undefined : v)}>
                    <SelectTrigger className="w-[180px] h-8 text-[10px] font-black uppercase tracking-widest border-none bg-transparent">
                        <SelectValue placeholder="Funil Padrão" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default" className="text-[10px] font-black uppercase">Funil Padrão</SelectItem>
                        {funnels?.map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-[10px] font-black uppercase">{f.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsNewFunnelOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 border-l pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Imóveis</p>
              <p className="text-sm font-black text-foreground">{filtered.length}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AddColumnDialog funnelType="property" funnelId={selectedFunnelId} showLabel />
          <NewPropertyDialog defaultFunnelId={selectedFunnelId} />

          <div className="h-6 w-px bg-border/50 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-muted border border-border/20 shadow-sm" title="Mais opções (Visualização e Filtros)">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              {/* ... (Keep existing dropdown content) */}
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
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div 
                className="flex-1 overflow-x-auto mt-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <div className="flex gap-4 min-h-0 pb-4" style={{ minWidth: "fit-content" }}>
                  {stages.map((stage, index) => (
                    <Draggable key={`${stage.value}-${(stage as any).id || index}`} draggableId={`col-${stage.value}-${(stage as any).id || index}`} index={index}>
                        {(draggableProvided) => (
                            <div 
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                            >
                                <KanbanColumn
                                    key={stage.value}
                                    stageId={(stage as any).id}
                                    stageValue={stage.value}
                                    stageLabel={stage.label}
                                    stageColor={stage.color}
                                    properties={grouped[stage.value] || []}
                                    cardSettings={cardSettings}
                                    dragHandleProps={draggableProvided.dragHandleProps}
                                />
                            </div>
                        )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <div className="flex flex-col min-w-[100px] shrink-0 items-center justify-start pt-4">
                    <AddColumnDialog funnelType="property" funnelId={selectedFunnelId} />
                    <p className="text-[10px] font-black uppercase text-muted-foreground mt-2 tracking-wider">Nova Coluna</p>
                  </div>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="flex-1 overflow-auto mt-4">
          <PropertyTable properties={filtered} />
        </div>
      )}

      {/* New Funnel Dialog */}
      <Dialog open={isNewFunnelOpen} onOpenChange={setIsNewFunnelOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="font-black uppercase tracking-tighter">Criar Novo Funil de Imóveis</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Funil</Label>
                      <Input value={newFunnelName} onChange={(e) => setNewFunnelName(e.target.value)} placeholder="Ex: Investidores RJ" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewFunnelOpen(false)} className="font-black uppercase tracking-tight">Cancelar</Button>
                  <Button onClick={handleCreateFunnel} className="font-black uppercase tracking-tight">Criar Funil</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Property Dialog */}
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
