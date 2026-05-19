import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Users, Loader2, ArrowLeft, LayoutGrid, TableIcon, MoreHorizontal, ChevronDown, Search, CheckSquare, Download } from "lucide-react";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { CLIENT_PIPELINES, CLIENT_STAGES, TEMPERATURE_OPTIONS, formatPhone } from "@/lib/client-constants";
import { formatCurrency } from "@/lib/property-constants";
import AddColumnDialog from "@/components/kanban/AddColumnDialog";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import ClientKanbanColumn from "@/components/clients/ClientKanbanColumn";
import ClientTable from "@/components/clients/ClientTable";
import NewClientDialog from "@/components/clients/NewClientDialog";
import ClientFilters, { EMPTY_CLIENT_FILTERS, type ClientFilterValues } from "@/components/clients/ClientFilters";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocation, useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { BoardSettingsMenu } from "@/components/kanban/BoardSettingsMenu";
import { BulkActionBar } from "@/components/kanban/BulkActionBar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { BulkStageDialog } from "@/components/kanban/BulkStageDialog";
import { BulkTagsDialog } from "@/components/kanban/BulkTagsDialog";
import { BulkTaskDialog } from "@/components/kanban/BulkTaskDialog";
import { useAuth } from "@/hooks/useAuth";
import { BulkFieldDialog } from "@/components/kanban/BulkFieldDialog";
import ImportClientsDialog from "@/components/clients/ImportClientsDialog";
import DuplicateManagerDialog from "@/components/clients/DuplicateManagerDialog";
import { useClientFiltersStore } from "@/hooks/useClientFiltersStore";
import { exportToCSV, exportToExcel } from "@/utils/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CLIENT_PHASES, getPhaseForStage } from "@/lib/KanbanPhases";
import { Check, Eye, EyeOff, ScrollText, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddPhaseDialog from "@/components/kanban/AddPhaseDialog";
import { CancellationReasonDialog } from "@/components/kanban/CancellationReasonDialog";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];
type ViewMode = "kanban" | "table";

export default function Clients() {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { stages: dynamicStages, isLoading: isStagesLoading, updateStage, addStage } = useKanbanStages("client" as any);
  const updateClient = useUpdateClient();
  const qc = useQueryClient();
  const { activeFilters: filters, setActiveFilters: setFilters, loadFromCloud, saveToCloud, hiddenStages, toggleStageVisibility } = useClientFiltersStore();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [bulkFieldInitial, setBulkFieldInitial] = useState<string>("temperature");
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [cancellationClientId, setCancellationClientId] = useState<string | null>(null);
  const [cancellationStageId, setCancellationStageId] = useState<string | null>(null);

  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFromCloud(user.id);
    }
  }, [user, loadFromCloud]);

  useEffect(() => {
    if (user) {
      saveToCloud(user.id);
    }
  }, [filters, user, saveToCloud]);

  const dashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  useEffect(() => {
    if (dashboardFilter) {
      window.history.replaceState({}, "");
    }
  }, []);

  const boardSettings = useBoardSettings();
  const [collapsedPhases, setCollapsedPhases] = useState<string[]>([]);

  const togglePhaseCollapse = (phaseName: string) => {
    setCollapsedPhases(prev => 
      prev.includes(phaseName) 
        ? prev.filter(p => p !== phaseName) 
        : [...prev, phaseName]
    );
  };

  useEffect(() => {
    if (user) {
      boardSettings.loadFromCloud(user.id);
    }
  }, [user]);

  const [activeListView, setActiveListView] = useState<string | null>(dashboardFilter);

  // Source of truth for stages is dynamicStages from the hook
  const stages = (dynamicStages && Array.isArray(dynamicStages)) ? dynamicStages : [];
  const loadingStages = isStagesLoading;

  // Dashboard drill-down: active leads
  const activeLeads = useMemo(() => {
    if (!clients || activeListView !== "active") return [];
    const excludedStages: ClientStage[] = ["venda_concretizada", "venda_cancelada", "credito_reprovado"];
    return clients.filter(c => !excludedStages.includes(c.stage));
  }, [clients, activeListView]);

  const matchesMultiSelect = (value: string | null | undefined, selected: string[]) => {
    if (selected.length === 0) return true; // "all"
    if (selected.length === 1 && selected[0] === "__none__") return false;
    return selected.includes(value || "");
  };

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = c.full_name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.whatsapp ?? "").includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.cpf ?? "").includes(q);
        if (!match) return false;
      }
      if (!matchesMultiSelect(c.temperature, filters.temperature)) return false;
      if (!matchesMultiSelect(c.state, filters.state)) return false;
      if (!matchesMultiSelect(c.city, filters.city)) return false;
      if (!matchesMultiSelect(c.work_regime, filters.work_regime)) return false;
      if (!matchesMultiSelect(c.marital_status, filters.marital_status)) return false;
      if (!matchesMultiSelect(c.has_fgts ? "true" : "false", filters.has_fgts)) return false;
      if (!matchesMultiSelect(c.has_financial_pending ? "true" : "false", filters.has_financial_pending)) return false;
      if (!matchesMultiSelect(c.can_compose_income ? "true" : "false", filters.can_compose_income)) return false;
      if (!matchesMultiSelect(c.responsible_user_id, filters.responsible_user_id)) return false;
      if (filters.created_at_start && c.created_at < filters.created_at_start) return false;
      if (filters.created_at_end && (c.created_at || "") > (filters.created_at_end + "T23:59:59")) return false;
      if (filters.income_min && (c.income ?? 0) < Number(filters.income_min)) return false;
      if (filters.income_max && (c.income ?? 0) > Number(filters.income_max)) return false;
      if (filters.tag) {
        const clientTags = Array.isArray((c as any).tags) ? (c as any).tags : [];
        const q = filters.tag.toLowerCase();
        if (!clientTags.some((t: string) => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [clients, filters]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    if (!stages || !Array.isArray(stages)) return g;
    
    // Inicializar o mapa com arrays vazios para cada etapa
    stages.forEach(s => {
      if (s && s.value) {
        g[s.value] = [];
      }
    });

    // Distribuir os clientes filtrados nas etapas correspondentes
    filtered.forEach(c => {
      if (c && c.stage && g[c.stage]) {
        g[c.stage].push(c);
      }
    });
    
    return g;
  }, [filtered, stages]);

  const onDragEnd = async (result: DropResult) => {
    try {
        const { draggableId, destination, source, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'column') {
            if (!stages || stages.length === 0) return;
            const newStages = Array.from(stages || []);
            const [removed] = newStages.splice(source.index, 1);
            if (!removed) return;
            newStages.splice(destination.index, 0, removed);
            
            for (let i = 0; i < newStages.length; i++) {
                const s = newStages[i];
                if (s && (s as any).id) {
                    await updateStage({ id: (s as any).id, sort_order: i * 10 } as any);
                }
            }
            return;
        }

        const newStageId = destination.droppableId;
        const newStage = newStageId.includes("---") ? newStageId.split("---")[0] : newStageId;
        
        // draggableId is the client ID in our case
        if (draggableId) {
            if (newStage === "desistencia") {
                setCancellationClientId(draggableId);
                setCancellationStageId(newStage);
                setCancellationOpen(true);
            } else {
                updateClient.mutate({ 
                    id: draggableId, 
                    stage: newStage as any,
                    updated_at: new Date().toISOString() 
                });
            }
        }
    } catch (e) {
        console.error("Error in onDragEnd:", e);
    }
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (cancellationClientId && cancellationStageId) {
      try {
        await updateClient.mutateAsync({
          id: cancellationClientId,
          stage: cancellationStageId as any,
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        });
        toast({
          title: "Cliente movido!",
          description: "O cliente foi movido para Desistência e o motivo foi salvo com sucesso."
        });
      } catch (err: any) {
        console.error("Failed to update client with cancellation reason:", err);
        toast({
          title: "Erro ao mover cliente",
          description: "O banco de dados rejeitou a alteração. Certifique-se de executar a migração SQL no painel do Supabase! Erro: " + (err.message || err.code || "Desconhecido"),
          variant: "destructive"
        });
        throw err; // Propagate to let dialog know it failed
      } finally {
        setCancellationClientId(null);
        setCancellationStageId(null);
      }
    }
  };

  const handleCancelCancellation = () => {
    setCancellationClientId(null);
    setCancellationStageId(null);
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  const handleSelectAll = (ids: string[], selected: boolean) => {
    if (selected) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmMessage = selectedIds.length === 1 
      ? "Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita."
      : `Tem certeza que deseja excluir ${selectedIds.length} leads? Esta ação excluirá todos os dados, tarefas e vínculos relacionados.`;
      
    if (!confirm(confirmMessage)) return;

    try {
      console.log(`Iniciando exclusão em massa de ${selectedIds.length} leads em lotes...`);
      
      const CHUNK_SIZE = 50;
      for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
        const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
        console.log(`Processando lote ${Math.floor(i / CHUNK_SIZE) + 1}...`);

        // 1. Limpeza de dependências por lote
        await supabase.from("client_property_links").delete().in("client_id", chunk);
        await supabase.from("activities").delete().in("client_id", chunk);
        await supabase.from("client_documents").delete().in("client_id", chunk);
        await supabase.from("properties").update({ buyer_client_id: null }).in("buyer_client_id", chunk);

        // 2. Exclusão dos registros principais por lote
        const { error } = await supabase.from("clients").delete().in("id", chunk);
        if (error) throw error;
      }

      setSelectedIds([]);
      toast({ 
        title: "Sucesso", 
        description: `${selectedIds.length} lead(s) excluído(s) com sucesso.` 
      });
      
      qc.invalidateQueries({ queryKey: ["clients"] });
      
    } catch (e: any) {
      console.error("Erro completo:", e);
      toast({ 
        title: "Erro ao excluir", 
        description: `Falha técnica: ${e.message || "Verifique se você tem permissão de Admin."}`, 
        variant: "destructive" 
      });
    }
  };

  const handleBulkMove = async (targetStage: string) => {
    try {
      // Find pipeline for target stage with safety
      const allStages = (dynamicStages && dynamicStages.length > 0) ? dynamicStages : (CLIENT_STAGES || []);
      const stageObj = allStages.find(s => s && s.value === targetStage);
      
      if (!stageObj) {
        throw new Error("Etapa de destino não encontrada.");
      }

      for (const id of selectedIds) {
        await supabase.from("clients").update({
          stage: targetStage as any
        }).eq("id", id);
      }
      setSelectedIds([]);
      toast({ title: "Sucesso", description: `${selectedIds.length} clientes movidos para ${stageObj.label}` });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkTags = async (newTags: string[]) => {
    try {
      console.log(`Starting bulk tags for ${selectedIds.length} clients:`, newTags);
      for (const id of selectedIds) {
        // Get current tags first
        const { data: client, error: fetchError } = await supabase
          .from("clients")
          .select("tags")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error(`Error fetching tags for client ${id}:`, fetchError);
          continue;
        }

        const rawCurrentTags = (client as any)?.tags;
        let currentTags: string[] = [];
        if (Array.isArray(rawCurrentTags)) {
          currentTags = rawCurrentTags;
        } else if (typeof rawCurrentTags === 'string' && rawCurrentTags.includes('{')) {
          currentTags = rawCurrentTags.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
        }

        const combined = Array.from(new Set([...currentTags, ...newTags]));

        console.log(`Updating client ${id} with tags:`, combined);

        const { error: updateError } = await supabase
          .from("clients")
          .update({ tags: combined })
          .eq("id", id);

        if (updateError) {
          console.error(`Error updating tags for client ${id}:`, updateError);
          throw updateError;
        }
      }

      try {
        await qc.invalidateQueries({ queryKey: ["clients"] });
        setSelectedIds([]);
        toast({ title: "Sucesso", description: `Tags vinculadas a ${selectedIds.length} clientes.` });
      } catch (err: any) {
        if (err.message?.includes("tags") && err.message?.includes("schema cache")) {
          toast({
            title: "Erro de Sincronização",
            description: "A coluna de etiquetas ainda não foi criada no banco de dados. Por favor, execute o script SQL de migração.",
            variant: "destructive"
          });
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      console.error("Bulk tags fatal error:", e);
      toast({ title: "Erro ao vincular tags", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkFieldUpdate = async (field: string, value: any) => {
    try {
      console.log(`Mass updating ${field} to ${value} for ${selectedIds.length} clients`);
      for (const id of selectedIds) {
        const { error } = await supabase
          .from("clients")
          .update({ [field]: value })
          .eq("id", id);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["clients"] });
      setSelectedIds([]);
      toast({ title: "Sucesso", description: `${selectedIds.length} clientes atualizados.` });
    } catch (e: any) {
      console.error("Bulk field update fatal error:", e);
      toast({ title: "Erro na atualização", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkTasks = async (data: { description: string, due_date: string, notes: string, activity_type: string }) => {
    if (!user) return;
    try {
      const taskInserts = selectedIds.map(id => ({
        client_id: id,
        description: data.description,
        due_date: new Date(data.due_date).toISOString(),
        notes: data.notes,
        responsible_user_id: user.id,
        created_by: user.id,
        activity_type: data.activity_type,
        status: "pendente" as const
      }));

      await supabase.from("activities").insert(taskInserts);
      await qc.invalidateQueries({ queryKey: ["activities"] });

      setSelectedIds([]);
      toast({ title: "Tarefas criadas", description: `${selectedIds.length} novas tarefas agendadas.` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  // ALL HOOKS MUST BE DECLARED ABOVE THIS LINE
  
  // Filtrar etapas visíveis (com segurança extra)
  const visibleStages = useMemo(() => {
    if (!stages) return [];
    const hidden = Array.isArray(hiddenStages) ? hiddenStages : [];
    return stages.filter(s => s && s.value && !hidden.includes(s.value));
  }, [stages, hiddenStages]);

  // Agrupar etapas visíveis por fase
  const phasesWithStages = useMemo(() => {
    if (!visibleStages || visibleStages.length === 0) return [];
    
    const allPhases = [
      ...(CLIENT_PHASES || []),
      ...(boardSettings.customPhases || []).map(p => ({ ...p, stages: [] }))
    ];

    return allPhases.map(phase => {
      if (!phase) return { ...phase, stagesInPhase: [] };
      
      const stagesInPhase = visibleStages.filter(s => {
        if (!s || !s.value) return false;
        
        const hardcodedPhase = getPhaseForStage(s.value);
        if (hardcodedPhase) {
          return hardcodedPhase.name === phase.name;
        }
        
        // Se não for uma coluna hardcoded, ela foi criada pelo usuário.
        // Verificamos o pipeline dela no banco.
        if (s.pipeline) {
            return s.pipeline === phase.value;
        }
        
        // Se não tiver pipeline e for customizada, por garantia não exibimos em lugar errado.
        return false;
      });

      return {
        ...phase,
        isCustom: !CLIENT_PHASES.find(p => p.name === phase.name),
        stagesInPhase
      };
    }).filter(p => p.stagesInPhase && p.stagesInPhase.length > 0 || p.isCustom);
  }, [visibleStages, boardSettings.customPhases]);

  const totalFunnelValue = filtered.reduce((sum, c) => sum + (c.income || 0), 0);

  // NOW WE CAN DO CONDITIONAL RETURNS
  const isLoading = isClientsLoading || loadingStages;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Dashboard drill-down list
  if (activeListView === "active") {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao relatório de imóveis por etapa
          </Button>
          <h1 className="text-xl font-bold">Leads Ativos</h1>
          <Badge variant="secondary">{activeLeads.length}</Badge>
        </div>
        {activeLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum lead ativo encontrado.</p>
        ) : (
          <div className="space-y-2">
            {activeLeads.map(c => {
              const allStages = (dynamicStages && dynamicStages.length > 0) ? dynamicStages : (CLIENT_STAGES || []);
              const stage = allStages.find(s => s && s.value === c.stage);
              const temp = TEMPERATURE_OPTIONS.find(t => t && t.value === c.temperature);
              return (
                <Card key={c.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${temp?.color || "bg-muted"}`} />
                      <div>
                        <p className="font-semibold text-sm">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(c.phone || c.whatsapp)} · {stage?.label || "Sem etapa"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{temp?.label || "Normal"}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Conditional return only for the JSX part, AFTER all hooks
  if (!user) return null;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                  PIPELINE DE LEADS
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Gestão Unificada</p>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-4 border-l border-border pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Leads</p>
              <p className="text-sm font-black text-foreground">{filtered.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Valor</p>
              <p className="text-sm font-black text-orange-500">{formatCurrency(totalFunnelValue)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary" />
            <Input 
              placeholder="Busca rápida..." 
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="h-8 w-40 pl-9 bg-muted/30 border-none shadow-none text-[10px] font-bold uppercase focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 bg-muted text-foreground border-border hover:bg-muted/80 text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Eye className="h-3.5 w-3.5 text-orange-500" />
                Colunas
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[9px]">
                  {visibleStages.length}/{stages.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-2xl border-slate-200" align="end">
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Configurar Colunas</h3>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-4">
                  {[...CLIENT_PHASES, ...(boardSettings.customPhases || []).map(p => ({ ...p, stages: [] }))].map(phase => {
                    if (!stages || !Array.isArray(stages)) return null;
                    const stagesInPhase = stages.filter(s => {
                        if (!s || !s.value) return false;
                        
                        const hardcodedPhase = getPhaseForStage(s.value);
                        if (hardcodedPhase) {
                          return hardcodedPhase.name === phase.name;
                        }
                        
                        if (s.pipeline) {
                            return s.pipeline === (phase as any).value;
                        }
                        return false;
                    });
                    if (stagesInPhase.length === 0) return null;
                    
                    return (
                      <div key={phase.name} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-2 py-1">
                          <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{phase.name}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5">
                          {stagesInPhase.map(stage => {
                            const isHidden = hiddenStages.includes(stage.value);
                            return (
                              <button
                                key={stage.value}
                                onClick={() => toggleStageVisibility(stage.value)}
                                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-all ${
                                  isHidden 
                                    ? "bg-slate-50/50 text-slate-400 hover:bg-slate-100" 
                                    : "bg-white text-slate-700 hover:bg-slate-50 shadow-sm border border-slate-100/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-1 h-3 rounded-full ${stage.color || 'bg-slate-300'}`} />
                                  <span className="text-[10px] font-bold uppercase truncate max-w-[180px]">{stage.label}</span>
                                </div>
                                {isHidden ? <EyeOff className="h-3 w-3" /> : <Check className="h-3 w-3 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <p className="text-[9px] text-muted-foreground font-medium italic">As mudanças são salvas automaticamente localmente.</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[9px] font-black uppercase tracking-tighter hover:bg-primary/5 text-primary"
                  onClick={() => saveToCloud(user?.id || "")}
                >
                  Salvar na Nuvem
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant={selectionModeActive ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectionModeActive(!selectionModeActive);
              if (!selectionModeActive) setSelectedIds([]);
            }}
            className={cn(
              "h-9 gap-1.5 font-black uppercase text-[10px] tracking-tight shadow-sm transition-all",
              selectionModeActive ? "bg-orange-600 hover:bg-orange-700 text-white border-none" : "bg-muted text-foreground border-border hover:bg-muted/80"
            )}
          >
            <CheckSquare className="h-4 w-4 text-orange-500" />
            {selectionModeActive 
              ? (selectedIds.length > 0 ? `${selectedIds.length} Selecionados` : "Sair") 
              : "Massa"}
          </Button>
          <DuplicateManagerDialog />
          <NewClientDialog />
        </div>
      </div>

      <ClientFilters
        filters={filters}
        onFiltersChange={setFilters}
        activePipeline="inicial"
      />

      {selectedIds.length > 0 && (
        <div className="mt-4 border-t border-slate-100/50 space-y-2">
          {selectedIds.length < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedIds(filtered.map(c => c.id))}
                className="text-[10px] font-black uppercase h-7 px-4 border-primary/30 text-primary hover:bg-primary/5 animate-bounce"
              >
                Selecionar absolutamente todos os {filtered.length} leads
              </Button>
            </div>
          )}
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={handleDeleteSelected}
            onChangeStage={() => setMoveDialogOpen(true)}
            onAddTag={() => setTagsDialogOpen(true)}
            onReassign={() => {
              setBulkFieldInitial("responsible_user_id");
              setFieldDialogOpen(true);
            }}
            onAddTask={() => setTaskDialogOpen(true)}
            onChangeField={() => {
              setBulkFieldInitial("temperature");
              setFieldDialogOpen(true);
            }}
            inline
          />
        </div>
      )}

      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-slate-50/30 rounded-xl border border-slate-100 shadow-inner p-4 mt-2">
          <div className="flex flex-col h-full min-w-full">
            
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="board" type="column" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex gap-6 h-full items-stretch"
                  >
                    {phasesWithStages.map((phase, pIdx) => {
                      const isCollapsed = collapsedPhases.includes(phase.name);
                      const stagesInPhase = phase.stagesInPhase || [];
                      
                      if (isCollapsed) {
                        return (
                          <div 
                            key={`collapsed-${phase.name}`}
                            onClick={() => togglePhaseCollapse(phase.name)}
                            className="h-full w-10 flex flex-col items-center py-6 bg-white/40 backdrop-blur-sm border border-slate-200/50 rounded-2xl cursor-pointer hover:bg-white/60 transition-all group shrink-0 shadow-sm relative overflow-hidden"
                          >
                            <div className={cn("w-1 h-12 rounded-full mb-6 shadow-sm shrink-0", phase.color)} />
                            <div className="flex-1 flex items-center justify-center w-full">
                              <span 
                                className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors whitespace-nowrap"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                              >
                                {phase.name}
                              </span>
                            </div>
                            <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Eye className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={`phase-group-${phase.name}`}
                          className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border shadow-sm shrink-0"
                          style={{ minWidth: `calc(${stagesInPhase.length} * 280px + (${stagesInPhase.length - 1} * 16px) + 32px)` }}
                        >
                          <div className="flex items-center justify-between px-2 mb-2">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-4 w-1.5 rounded-full shadow-sm", phase.color)} />
                              <h2 className="text-sm font-black uppercase tracking-tighter text-foreground">
                                {phase.name}
                              </h2>
                              <Badge variant="secondary" className="bg-muted text-foreground border-border text-[10px] h-5">
                                {stagesInPhase.length} etapas
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => togglePhaseCollapse(phase.name)}
                                  className="h-7 px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5"
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Ocultar
                                </Button>
                                {phase.isCustom && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem className="text-destructive font-black uppercase text-[10px]" onClick={() => boardSettings.removeCustomPhase((phase as any).value)}>
                                                Excluir Fase
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                          </div>

                          <div className="flex gap-4 h-full">
                            {stagesInPhase.map((stage, sIdx) => {
                              const stageClients = grouped[stage.value] || [];
                              const globalIndex = visibleStages.findIndex(s => s.value === stage.value);
                              const uniqueDraggableId = stage.id || `draggable-${stage.value}-${globalIndex}`;

                              return (
                                <Draggable key={uniqueDraggableId} draggableId={String(uniqueDraggableId)} index={globalIndex}>
                                  {(draggableProvided) => (
                                    <div
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      className="w-[280px] shrink-0 h-full"
                                    >
                                      <ClientKanbanColumn
                                        stageId={stage.id}
                                        stageValue={stage.value}
                                        stageLabel={stage.label}
                                        stageColor={stage.color}
                                        clients={stageClients}
                                        selectable={selectionModeActive}
                                        onSelect={handleSelect}
                                        onSelectAll={handleSelectAll}
                                        selectedIds={selectedIds}
                                        dragHandleProps={draggableProvided.dragHandleProps}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            
                            <div className="flex flex-col min-w-[200px] h-40 items-center justify-center border-2 border-dashed border-border rounded-2xl group/add bg-muted/50 hover:bg-muted transition-all shrink-0">
                              <AddColumnDialog funnelType="client" pipeline={(phase as any).value || "inicial"} showLabel />
                              <p className="text-[10px] font-black uppercase text-muted-foreground mt-2 tracking-widest">Nova Etapa</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {provided.placeholder}
                    
                    <AddPhaseDialog />
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden mt-4">
          <ClientTable clients={filtered} />
        </div>
      )}



      <BulkStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkMove}
      />

      <BulkTagsDialog
        open={tagsDialogOpen}
        onOpenChange={setTagsDialogOpen}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkTags}
      />

      <BulkTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkTasks}
      />

      <BulkFieldDialog
        open={fieldDialogOpen}
        onOpenChange={setFieldDialogOpen}
        selectedCount={selectedIds.length}
        initialField={bulkFieldInitial}
        onConfirm={handleBulkFieldUpdate}
      />

      <CancellationReasonDialog
        open={cancellationOpen}
        onOpenChange={setCancellationOpen}
        onConfirm={handleConfirmCancellation}
        onCancel={handleCancelCancellation}
      />
    </div>
  );
}
