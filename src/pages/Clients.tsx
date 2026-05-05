import { useMemo, useState, useEffect } from "react";
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
} from "@/components/ui/dropdown-menu";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];
type ViewMode = "kanban" | "table";

export default function Clients() {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { stages: dynamicStages, isLoading: isStagesLoading, updateStage, addStage } = useKanbanStages("client" as any);
  const updateClient = useUpdateClient();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ClientFilterValues>(EMPTY_CLIENT_FILTERS);
  const [activePipeline, setActivePipeline] = useState<ClientPipeline>("inicial");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [bulkFieldInitial, setBulkFieldInitial] = useState<string>("temperature");

  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const dashboardFilter = (location.state as any)?.from === "dashboard"
    ? (location.state as any)?.filter ?? null
    : null;

  useEffect(() => {
    if (dashboardFilter) {
      window.history.replaceState({}, "");
    }
  }, []);

  const boardSettings = useBoardSettings();

  useEffect(() => {
    if (user) {
      boardSettings.loadFromCloud(user.id);
    }
  }, [user]);

  const [activeListView, setActiveListView] = useState<string | null>(dashboardFilter);

  const stagesForPipeline = useMemo(
    () => {
      const stages = dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES;
      return stages.filter(s => s.pipeline === activePipeline);
    },
    [activePipeline, dynamicStages]
  );

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
      if (c.pipeline !== activePipeline) return false;
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
  }, [clients, filters, activePipeline]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    if (!stagesForPipeline || stagesForPipeline.length === 0) return map;
    
    stagesForPipeline.forEach(s => {
      if (s && s.value) map[s.value] = [];
    });

    const firstStageValue = stagesForPipeline[0]?.value;

    filtered.forEach(c => {
      if (c) {
        if (c.stage && map[c.stage]) {
          map[c.stage]!.push(c);
        } else if (firstStageValue) {
          // Orphaned client: put in first stage of current pipeline
          map[firstStageValue]!.push(c);
        }
      }
    });
    return map;
  }, [filtered, stagesForPipeline]);

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
        const newStages = Array.from(stagesForPipeline);
        const [removed] = newStages.splice(source.index, 1);
        newStages.splice(destination.index, 0, removed);
        
        for (let i = 0; i < newStages.length; i++) {
            const s = newStages[i];
            if ((s as any).id) {
                await updateStage({ id: (s as any).id, sort_order: i * 10 } as any);
            } else {
                // Promote to dynamic to lock the order and exclude deleted ones
                await addStage({
                    funnel_type: "client",
                    value: s.value,
                    label: s.label,
                    color: s.color,
                    pipeline: activePipeline as any,
                    sort_order: i * 10
                } as any);
            }
        }
        return;
    }

    const newStageId = destination.droppableId;
    const newStage = newStageId.includes("---") ? newStageId.split("---")[0] : newStageId;
    updateClient.mutate({ id: draggableId, stage: newStage as any });
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
      // 1. Limpar dependências (se houver)
      await Promise.all([
        supabase.from("client_property_links").delete().in("client_id", selectedIds),
        supabase.from("activities").delete().in("client_id", selectedIds),
        supabase.from("client_documents").delete().in("client_id", selectedIds)
      ]);

      // 2. Excluir os clientes
      const { error } = await supabase.from("clients").delete().in("id", selectedIds);

      if (error) throw error;

      setSelectedIds([]);
      toast({ 
        title: "Sucesso", 
        description: `${selectedIds.length} lead(s) excluído(s) com sucesso.` 
      });
      
      // Invalidar cache do React Query
      qc.invalidateQueries({ queryKey: ["clients"] });
      
    } catch (e: any) {
      console.error("Erro ao excluir leads:", e);
      toast({ 
        title: "Erro ao excluir", 
        description: "Não foi possível excluir alguns leads. Verifique se eles possuem dados vinculados que impedem a exclusão.", 
        variant: "destructive" 
      });
    }
  };

  const handleBulkMove = async (targetStage: string) => {
    try {
      // Find pipeline for target stage
      const allStages = dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES;
      const stageObj = allStages.find(s => s.value === targetStage);
      const targetPipeline = stageObj?.pipeline as any;

      for (const id of selectedIds) {
        await supabase.from("clients").update({
          stage: targetStage as any,
          pipeline: targetPipeline || activePipeline
        }).eq("id", id);
      }
      setSelectedIds([]);
      toast({ title: "Sucesso", description: `${selectedIds.length} clientes movidos para ${stageObj?.label}` });
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

  const isLoading = isClientsLoading || isStagesLoading;

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
              const stage = (dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES).find(s => s.value === c.stage);
              const temp = TEMPERATURE_OPTIONS.find(t => t.value === c.temperature);
              return (
                <Card key={c.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${temp?.color || "bg-muted"}`} />
                      <div>
                        <p className="font-semibold text-sm">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(c.phone || c.whatsapp)} · {stage?.label}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{temp?.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const totalFunnelValue = filtered.reduce((sum, c) => sum + (c.income || 0), 0);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <Select value={activePipeline} onValueChange={v => setActivePipeline(v as ClientPipeline)}>
                <SelectTrigger className="border-none shadow-none bg-transparent p-0 h-auto focus:ring-0 w-auto gap-2 group flex items-center">
                  <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                     FUNIL DE CLIENTES / {CLIENT_PIPELINES.find(p => p.value === activePipeline)?.label}
                  </h1>
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_PIPELINES.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs font-black uppercase text-foreground">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Gestão de Funis e Leads</p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l pl-4">
             <Badge variant="outline" className="bg-[#EDF0F4] dark:bg-[#016FAE] text-[#002B44] dark:text-white border-none font-black text-[10px] uppercase py-1 px-3 shadow-sm">Leads ativos</Badge>
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
              <p className="text-[10px] font-black text-muted-foreground uppercase">Leads</p>
              <p className="text-sm font-black text-foreground">{filtered.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Valor</p>
              <p className="text-sm font-black text-primary">{formatCurrency(totalFunnelValue)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant={selectionModeActive ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectionModeActive(!selectionModeActive);
              if (!selectionModeActive) setSelectedIds([]);
            }}
            className={cn(
              "gap-1.5 font-black uppercase tracking-tight shadow-sm transition-all",
              selectionModeActive ? "bg-[#002B44] hover:bg-[#003d61]" : "border-primary/20 hover:bg-primary/5"
            )}
          >
            <CheckSquare className="h-4 w-4" />
            {selectionModeActive ? "Sair da Seleção" : "Seleção em Massa"}
          </Button>

          <NewClientDialog />

          <div className="h-6 w-px bg-border/50 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-muted border border-border/20 shadow-sm" title="Mais opções (Visualização e Filtros)">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-border/40">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 pt-2 tracking-widest">Visualização</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={viewMode} onValueChange={v => setViewMode(v as ViewMode)} className="px-1">
                <DropdownMenuRadioItem value="kanban" className="text-xs font-bold uppercase py-2 cursor-pointer transition-colors">
                  <LayoutGrid className="h-4 w-4 mr-2" /> Modo Kanban (Cards)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="table" className="text-xs font-bold uppercase py-2 cursor-pointer transition-colors">
                  <TableIcon className="h-4 w-4 mr-2" /> Modo Tabela (Lista)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              
              {viewMode === "kanban" && (
                <BoardSettingsMenu triggerAsMenuItem />
              )}

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Operação</DropdownMenuLabel>
              <div 
                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/50 rounded px-2 transition-colors mx-1" 
                onClick={() => {
                  setSelectionModeActive(!selectionModeActive);
                  if (!selectionModeActive) setSelectedIds([]);
                }}
              >
                <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectionModeActive ? 'bg-[#002B44] border-[#002B44] text-white' : 'border-muted-foreground/30'}`}>
                  {selectionModeActive && <CheckSquare className="h-2.5 w-2.5" />}
                </div>
                <span className="text-[11px] font-bold uppercase leading-none">Seleção em Massa (Editar)</span>
              </div>
              
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Dados</DropdownMenuLabel>
              <div className="px-1 space-y-1">
                <ImportClientsDialog />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2 font-bold uppercase text-[10px] h-8 border-primary/20 hover:bg-primary/5 transition-all"
                  onClick={() => exportToCSV('clientes_invest_crm', filtered)}
                >
                  <Download className="h-3.5 w-3.5 text-primary" /> Exportar CSV
                </Button>
                <Button 
                  variant="outline" 
                   size="sm" 
                  className="w-full justify-start gap-2 font-bold uppercase text-[10px] h-8 border-primary/20 hover:bg-primary/5 transition-all"
                  onClick={() => exportToExcel('clientes_invest_crm', filtered)}
                >
                  <Download className="h-3.5 w-3.5 text-primary" /> Exportar Excel (XLSX)
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ClientFilters
        filters={filters}
        onFiltersChange={setFilters}
        activePipeline={activePipeline}
      />

      {selectedIds.length > 0 && (
        <div className="mt-4 border-t border-slate-100/50">
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
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div 
                className="flex-1 overflow-x-auto min-h-0 pb-4 mt-2"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <div className="flex gap-4" style={{ minWidth: "fit-content" }}>
                  {stagesForPipeline.map((stage, index) => (
                    <Draggable key={`${stage.value}-${(stage as any).id || index}`} draggableId={`col-${stage.value}-${(stage as any).id || index}`} index={index}>
                        {(draggableProvided) => (
                            <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                            >
                                <ClientKanbanColumn
                                    key={stage.value}
                                    stageId={(stage as any).id}
                                    stageValue={stage.value}
                                    stageLabel={stage.label}
                                    stageColor={stage.color}
                                    clients={grouped[stage.value] || []}
                                    selectable={selectionModeActive}
                                    onSelect={handleSelect}
                                    onSelectAll={handleSelectAll}
                                    selectedIds={selectedIds}
                                    dragHandleProps={draggableProvided.dragHandleProps}
                                />
                            </div>
                        )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <div className="flex flex-col min-w-[200px] items-center justify-start pt-6 border-2 border-dashed border-muted rounded-lg group/add">
                    <AddColumnDialog funnelType="client" pipeline={activePipeline} showLabel />
                    <p className="text-[10px] font-black uppercase text-muted-foreground mt-2 tracking-widest">Nova Coluna</p>
                  </div>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
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
    </div>
  );
}
