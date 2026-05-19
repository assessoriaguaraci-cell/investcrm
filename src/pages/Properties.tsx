import { useMemo, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Building2, Loader2, ArrowLeft, ChevronRight, LayoutGrid, TableIcon, MoreHorizontal, Search, Download, Eye, Settings2, CheckSquare, Plus } from "lucide-react";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { PROPERTY_STAGES, totalInvestment, formatCurrency } from "@/lib/property-constants";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { usePropertySettings } from "@/hooks/usePropertySettings";
import { usePropertyFiltersStore } from "@/hooks/usePropertyFiltersStore";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { parseISO, isAfter, isBefore, startOfMonth, endOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import type { Property } from "@/hooks/useProperties";
import type { Property } from "@/hooks/useProperties";
import { usePropertyFunnels, useCreatePropertyFunnel, useUpdatePropertyFunnel, useDeletePropertyFunnel } from "@/hooks/usePropertyFunnels";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Pencil, Trash2 } from "lucide-react";

type PropertyStage = Database["public"]["Enums"]["property_stage"];
type DashboardFilter = "active" | "sales_this_month" | "custom_ids" | null;
type ViewMode = "kanban" | "table";

export default function Properties() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | undefined>(undefined);
  const { data: properties, isLoading: isPropertiesLoading } = useProperties();
  const { stages: dynamicStages, isLoading: isStagesLoading, updateStage, addStage } = useKanbanStages("property", selectedFunnelId);
  const { data: funnels } = usePropertyFunnels();
  const createFunnelMutation = useCreatePropertyFunnel();
  const updateFunnelMutation = useUpdatePropertyFunnel();
  const deleteFunnelMutation = useDeletePropertyFunnel();

  const updateProperty = useUpdateProperty();
  const { filters, setFilters, loadFromCloud: loadFiltersFromCloud } = usePropertyFiltersStore();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("properties_view_mode") as ViewMode) || "kanban";
  });
  const { user } = useAuth();
  const cardSettings = usePropertySettings();

  useEffect(() => {
    localStorage.setItem("properties_view_mode", viewMode);
  }, [viewMode]);

  const [isNewFunnelOpen, setIsNewFunnelOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [isRenamingFunnel, setIsRenamingFunnel] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  useEffect(() => {
    if (user) {
      cardSettings.loadFromCloud(user.id);
      loadFiltersFromCloud(user.id);
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
    const base = dynamicStages.length > 0 ? dynamicStages : (!selectedFunnelId ? PROPERTY_STAGES : []);
    
    if (base.length === 0 && selectedFunnelId) {
        return []; 
    }

    return base;
  }, [dynamicStages, selectedFunnelId]);

  const stageOrder = useMemo(() => {
    const map: Record<string, number> = {};
    if (!stages) return map;
    stages.forEach((s, i) => { 
      if (s && s.value) map[s.value] = i; 
    });
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

  const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
    if (selected.length === 0) return true; 
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value || "");
  };

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => {
      if (filters.search) {
        const q = filters.search.trim().toLowerCase();
        const qNumeric = q.replace(/\D/g, "");
        
        const code = p.code?.toLowerCase() || "";
        const codeNumeric = code.replace(/\D/g, "");

        const match = 
          code.includes(q) ||
          (qNumeric && codeNumeric.includes(qNumeric)) ||
          (p.address?.toLowerCase().includes(q)) ||
          (p.neighborhood?.toLowerCase().includes(q)) ||
          (p.city?.toLowerCase().includes(q)) ||
          (p.registration_number?.toLowerCase().includes(q));
          
        if (!match) return false;
      }
      if (!matchesMultiSelect(p.stage, filters.stage)) return false;
      if (!matchesMultiSelect(p.property_type, filters.property_type)) return false;
      if (!matchesMultiSelect(p.state, filters.state)) return false;
      if (!matchesMultiSelect(p.city, filters.city)) return false;
      if (!matchesMultiSelect(p.priority, filters.priority)) return false;
      if (!matchesMultiSelect(p.occupation_status, filters.occupation_status)) return false;
      if (!matchesMultiSelect(p.responsible_user_id ?? "", filters.responsible_user_id)) return false;
      if (!matchesMultiSelect(p.operation_responsible_id ?? "", filters.operation_responsible_id)) return false;
      
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

  // Combined results for Dashboard views (when activeListView is set)
  // We want to apply the active filters to the dashboard view too!
  const dashboardFilteredItems = useMemo(() => {
    return listItems.filter(p => filtered.some(fp => fp.id === p.id));
  }, [listItems, filtered]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    if (!stages || stages.length === 0) return map;
    
    stages.forEach(s => {
      if (s && s.value) map[s.value] = [];
    });

    const firstStageValue = stages[0]?.value;

    filtered.forEach(p => {
      if (p) {
        // If the property has a stage that exists in the current view, use it
        if (p.stage && map[p.stage]) {
          map[p.stage]!.push(p);
        } else if (firstStageValue && map[firstStageValue]) {
          // Orphaned property: put it in the first stage of the current view so it's not lost
          map[firstStageValue]!.push(p);
        }
      }
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
        
        const updatePromises = newStages.map((s, i) => {
            if ((s as any).id) {
                return updateStage({ id: (s as any).id, sort_order: i * 10 } as any);
            } else {
                return addStage({
                    funnel_type: "property",
                    value: s.value,
                    label: s.label,
                    color: s.color,
                    funnel_id: selectedFunnelId as any,
                    sort_order: i * 10
                } as any);
            }
        });

        try {
            await Promise.all(updatePromises);
            toast.success("Ordem das colunas atualizada");
        } catch (error) {
            toast.error("Erro ao salvar nova ordem");
        }
        return;
    }

    const newStageId = destination.droppableId;
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

  const handleRenameFunnel = async () => {
    if (!selectedFunnelId || !renameValue) return;
    try {
      await updateFunnelMutation.mutateAsync({ id: selectedFunnelId, name: renameValue });
      setIsRenamingFunnel(false);
    } catch (error) {
      toast.error("Erro ao renomear funil.");
    }
  };

  const handleDeleteFunnel = async () => {
    if (!selectedFunnelId) return;
    if (confirm("Tem certeza que deseja excluir esta fase? Todos os imóveis vinculados a ela voltarão para a Fase Padrão.")) {
      try {
        await deleteFunnelMutation.mutateAsync(selectedFunnelId);
        setSelectedFunnelId(undefined);
      } catch (error) {
        toast.error("Erro ao excluir funil.");
      }
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

  // Removed early return to keep filters visible
  // if (activeListView) { ... }

  const totalPortfolioValue = filtered.reduce((sum, p) => sum + (p.purchase_price || 0), 0);
  const selectedFunnel = funnels?.find(f => f.id === selectedFunnelId);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                FUNIL DE IMÓVEIS
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider font-body">Portfólio e Ativos</p>
                <Badge variant="outline" className="text-[9px] font-black bg-orange-500 text-white border-none h-4 shadow-sm">
                    {properties?.length || 0} TOTAL
                </Badge>
                {filtered.length !== properties?.length && (
                    <Badge variant="secondary" className="text-[9px] font-black h-4 bg-muted text-foreground border-none">
                        {filtered.length} NO FILTRO
                    </Badge>
                )}
                <div className="h-4 w-px bg-border mx-1" />
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-wider">
                  {formatCurrency(totalPortfolioValue)}
                </p>
              </div>
            </div>
          </div>
          
        </div>

        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                {isRenamingFunnel ? (
                    <div className="flex items-center gap-1 px-2">
                        <Input 
                            value={renameValue} 
                            onChange={e => setRenameValue(e.target.value)}
                            className="h-7 w-[120px] text-[10px] font-black uppercase"
                            autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleRenameFunnel}>
                            <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setIsRenamingFunnel(false)}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ) : (
                    <Select value={selectedFunnelId || "default"} onValueChange={(v) => setSelectedFunnelId(v === "default" ? undefined : v)}>
                        <SelectTrigger className="w-[150px] h-8 text-[10px] font-black uppercase tracking-widest border-none bg-transparent">
                            <SelectValue placeholder="Selecionar Fase" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default" className="text-[10px] font-black uppercase">Fase Padrão</SelectItem>
                            {funnels?.map(f => (
                                <SelectItem key={f.id} value={f.id} className="text-[10px] font-black uppercase">{f.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                
                {selectedFunnelId && !isRenamingFunnel && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2 font-black uppercase text-[10px]" onClick={() => {
                                setIsRenamingFunnel(true);
                                setRenameValue(selectedFunnel?.name || "");
                            }}>
                                <Pencil className="h-3.5 w-3.5" /> Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-black uppercase text-[10px] text-destructive focus:text-destructive" onClick={handleDeleteFunnel}>
                                <Trash2 className="h-3.5 w-3.5" /> Excluir Fase
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {!selectedFunnelId && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsNewFunnelOpen(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>

          <AddColumnDialog funnelType="property" funnelId={selectedFunnelId} showLabel />
          <NewPropertyDialog defaultFunnelId={selectedFunnelId} />

          <div className="h-6 w-px bg-border/50 mx-1" />

          <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (viewMode === "table") exportToCSV("imoveis", filtered);
                else exportToExcel("imoveis", filtered);
              }} 
              className="font-black uppercase tracking-tight gap-2 h-9 bg-muted text-foreground border-border hover:bg-muted/80 shadow-sm text-[10px]"
          >
            <Download className="h-4 w-4 text-orange-500" /> Exportar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-muted border border-border shadow-sm" title="Mais opções (Visualização e Filtros)">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">Visualização</DropdownMenuLabel>
                <div className="p-1">
                    <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="justify-start gap-1">
                        <ToggleGroupItem value="kanban" className="flex-1 text-[10px] font-bold uppercase gap-2 h-8">
                            <LayoutGrid className="h-3 w-3" /> Kanban
                        </ToggleGroupItem>
                        <ToggleGroupItem value="table" className="flex-1 text-[10px] font-bold uppercase gap-2 h-8">
                            <TableIcon className="h-3 w-3" /> Tabela
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                <DropdownMenuSeparator className="my-1 opacity-50" />

                <div className="p-2 space-y-3">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Tamanho do Card</p>
                        <div className="flex bg-muted/50 p-0.5 rounded-md">
                            {(['small', 'medium', 'large'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => cardSettings.setCardSize(s)}
                                    className={cn(
                                        "flex-1 text-[8px] font-black uppercase py-1 rounded transition-all",
                                        cardSettings.size === s ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {s === 'small' ? 'P' : s === 'medium' ? 'M' : 'G'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Campos Visíveis</p>
                        <div className="grid grid-cols-2 gap-1">
                            {[
                                { id: 'showPhoto', label: 'Foto' },
                                { id: 'showPriority', label: 'Prio' },
                                { id: 'showLocation', label: 'Loc' },
                                { id: 'showStatus', label: 'Status' },
                                { id: 'showAuctionDate', label: 'Data' },
                                { id: 'showFinancial', label: 'Fin' },
                                { id: 'showResponsible', label: 'Resp' }
                            ].map((field) => (
                                <label key={field.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                                    <Checkbox
                                        checked={(cardSettings as any)[field.id]}
                                        onCheckedChange={() => cardSettings.toggleField(field.id as any)}
                                    />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">{field.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PropertyFilters filters={filters} onFiltersChange={setFilters} />
      <div className="mt-2 flex items-center justify-between">
        <SavedFiltersButton currentFilters={filters} onLoadFilter={setFilters} />
        {activeListView && (
          <Button variant="outline" size="sm" className="gap-2 text-[10px] font-black uppercase" onClick={() => setActiveListView(null)}>
            <ArrowLeft className="h-3 w-3" /> Ver Kanban Completo
          </Button>
        )}
      </div>

      {activeListView ? (
        <div className="flex-1 mt-4 min-h-0">
          <PropertyTable properties={listItems} />
        </div>
      ) : viewMode === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div 
                className="flex-1 overflow-x-auto overflow-y-auto mt-4 custom-scrollbar"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <div className="flex gap-4 min-h-0 pb-4 h-full items-stretch" style={{ minWidth: "fit-content" }}>
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
                  <div className="flex flex-col min-w-[300px] w-[300px] border-2 border-dashed border-primary/20 rounded-lg items-center justify-center bg-muted/5 p-4 group/add mt-4 mb-4">
                    <Button 
                      variant="ghost" 
                      className="w-full h-full flex flex-col gap-3 hover:bg-primary/5 transition-colors"
                      onClick={() => setIsAddColumnOpen(true)}
                    >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/add:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-primary group-hover/add:text-orange-500 transition-colors">Nova Etapa</span>
                    </Button>
                  </div>
                  
                  <AddColumnDialog 
                    open={isAddColumnOpen}
                    onOpenChange={setIsAddColumnOpen}
                    funnelType="property" 
                    funnelId={selectedFunnelId} 
                  />
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="flex-1 mt-4 min-h-0">
          <PropertyTable properties={filtered} />
        </div>
      )}

      {/* New Funnel Dialog */}
      <Dialog open={isNewFunnelOpen} onOpenChange={setIsNewFunnelOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="font-black uppercase tracking-tighter">Criar Nova Fase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome da Fase (Funil)</Label>
                      <Input value={newFunnelName} onChange={(e) => setNewFunnelName(e.target.value)} placeholder="Ex: Investidores SP" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewFunnelOpen(false)} className="font-black uppercase tracking-tight">Cancelar</Button>
                  <Button onClick={handleCreateFunnel} className="font-black uppercase tracking-tight">Criar Fase</Button>
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
