import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PreAuctionProperty, PreAuctionStage } from "@/types/pre-auction";
import { PreAuctionCard } from "./PreAuctionCard";
import { cn } from "@/lib/utils";
import { useKanbanStages, PRESET_COLORS } from "@/hooks/useKanbanStages";
import { MoreHorizontal, Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import AddColumnDialog from "@/components/kanban/AddColumnDialog";

interface PreAuctionBoardProps {
  properties: PreAuctionProperty[];
  onMoveProperty: (id: string, newStage: PreAuctionStage) => void;
  onCardClick: (property: PreAuctionProperty) => void;
  funnelId?: string;
}

export function PreAuctionBoard({ properties, onMoveProperty, onCardClick, funnelId }: PreAuctionBoardProps) {
  const { stages: dynamicStages, updateStage, deleteStage, addStage } = useKanbanStages("pre_auction", funnelId);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  const STAGES = dynamicStages.length > 0 ? dynamicStages : [
    { value: 'inicial', label: 'Fase Inicial', color: 'bg-blue-500' },
    { value: 'em_andamento', label: 'Em Andamento', color: 'bg-yellow-500' },
    { value: 'concluido', label: 'Concluído', color: 'bg-green-500' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500' },
    { value: 'arrematado', label: 'Arrematado', color: 'bg-purple-600' },
  ];
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
        const newStages = Array.from(STAGES);
        const [removed] = newStages.splice(source.index, 1);
        newStages.splice(destination.index, 0, removed);
        
        // Update sort order in DB for all stages
        for (let i = 0; i < newStages.length; i++) {
            const s = newStages[i];
            if ((s as any).id) {
                await updateStage.mutateAsync({ id: (s as any).id, sort_order: i * 10 });
            } else {
                // Promote to dynamic if it doesn't have an id yet
                await addStage.mutateAsync({
                    label: s.label,
                    value: s.value,
                    color: s.color,
                    funnel_type: "pre_auction",
                    funnel_id: funnelId || null,
                    sort_order: i * 10
                } as any);
            }
        }
        return;
    }

    onMoveProperty(draggableId, destination.droppableId as PreAuctionStage);
  };

  const handleUpdateStage = async (id: string | undefined, label: string, stageValue?: string, stageColor?: string) => {
    try {
      if (id) {
        await updateStage.mutateAsync({ id, label });
      } else {
        // Promote default stage to dynamic
        await addStage.mutateAsync({ 
          label, 
          value: stageValue || label.toLowerCase().replace(/\s+/g, '_'), 
          color: stageColor || "bg-blue-500",
          funnel_type: "pre_auction",
          funnel_id: funnelId || null
        } as any);
      }
      setEditingStage(null);
      toast.success("Coluna atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleDeleteStage = async (stageValue: string, id?: string) => {
      const destination = STAGES.find(s => s.value !== stageValue)?.value || "";
      if (!destination) {
          toast.error("Não é possível excluir a única coluna");
          return;
      }
      
      if (confirm("Tem certeza que deseja excluir esta coluna? Os itens serão movidos para a primeira coluna disponível.")) {
          try {
              if (id) {
                await deleteStage.mutateAsync({ stageValue, destinationStageValue: destination });
              } else {
                // If it's a default stage, we can't delete it from DB, 
                // but we can't really delete it from the UI either unless we move to dynamic.
                // For now, let's just alert that they should edit it instead or create dynamic columns.
                toast.error("Colunas padrão não podem ser excluídas. Renomeie-as ou crie novas colunas.");
                return;
              }
              toast.success("Coluna excluída!");
          } catch (error) {
              toast.error("Erro ao excluir coluna");
          }
      }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="column" direction="horizontal">
        {(provided) => (
          <div 
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex gap-4 overflow-x-auto pb-6 h-full min-h-[calc(100vh-200px)]"
          >
            {STAGES.map((stage, index) => {
              const stageProperties = properties.filter((p) => p.stage === stage.value);

              return (
                <Draggable 
                    key={stage.value} 
                    draggableId={stage.value} 
                    index={index}
                    isDragDisabled={false} // Enable dragging for all stages
                >
                    {(draggableProvided) => (
                        <div 
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className="flex flex-col min-w-[300px] w-[300px] bg-muted/30 rounded-lg border border-border/50"
                        >
                            <div 
                                {...draggableProvided.dragHandleProps}
                                className={cn(
                                    "p-3 rounded-t-lg border-b-2 flex items-center justify-between group/header cursor-grab active:cursor-grabbing",
                                    stage.value === 'cancelado' || stage.value === 'cancelados' ? "bg-gray-100 border-gray-300" : "bg-background border-primary/20"
                                )}
                            >
                <div className="flex items-center gap-2 flex-1 mr-2 overflow-hidden">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/header:text-primary/50 transition-colors shrink-0" />
                    <div className={cn("h-2 w-2 rounded-full shrink-0", stage.color)} />
                    {editingStage === (stage as any).id || editingStage === stage.value ? (
                        <div className="flex items-center gap-1 w-full">
                            <Input 
                                value={editLabel} 
                                onChange={e => setEditLabel(e.target.value)}
                                className="h-6 text-[10px] font-black uppercase py-0 px-2"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleUpdateStage((stage as any).id, editLabel, stage.value, stage.color)}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => handleUpdateStage((stage as any).id, editLabel, stage.value, stage.color)}>
                                <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditingStage(null)}>
                                <X className="h-3 w-3 text-red-600" />
                            </Button>
                        </div>
                    ) : (
                        <h3 className="font-black text-xs uppercase tracking-tighter text-foreground truncate">
                            {stage.label}
                        </h3>
                    )}
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {stageProperties.length}
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => {
                                setEditingStage((stage as any).id || stage.value);
                                setEditLabel(stage.label);
                            }} className="text-[10px] font-black uppercase gap-2 cursor-pointer">
                                <Pencil className="h-3 w-3" /> Renomear
                            </DropdownMenuItem>
                            
                            {(stage as any).id && (
                                <div className="p-2 flex gap-1 border-t border-b">
                                    {PRESET_COLORS.map(c => (
                                        <button 
                                            key={c.class} 
                                            className={cn("h-3 w-3 rounded-full hover:scale-125 transition-transform", c.class)}
                                            onClick={() => updateStage.mutate({ id: (stage as any).id, color: c.class })}
                                        />
                                    ))}
                                </div>
                            )}

                            {(stage as any).id && (
                                <DropdownMenuItem 
                                    onClick={() => handleDeleteStage(stage.value, (stage as any).id)} 
                                    className="text-[10px] font-black uppercase gap-2 text-destructive focus:text-destructive cursor-pointer"
                                >
                                    <Trash2 className="h-3 w-3" /> Excluir
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>

              <Droppable droppableId={stage.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-2 space-y-3 transition-colors",
                      snapshot.isDraggingOver ? "bg-primary/5" : "bg-transparent"
                    )}
                  >
                    {stageProperties.map((property, index) => (
                      <Draggable key={property.id} draggableId={property.id} index={index}>
                        {(draggableProvided) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                          >
                            <PreAuctionCard 
                                property={property} 
                                onClick={onCardClick}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                        </div>
                    )}
                </Droppable>
              </div>
            )}
          </Draggable>
        );
      })}
      {provided.placeholder}
    </div>
  )}
</Droppable>
      
      <div className="flex flex-col min-w-[300px] w-[300px] border-2 border-dashed border-primary/20 rounded-lg items-center justify-center bg-muted/5 p-4 group/add">
          <Button 
            variant="ghost" 
            className="w-full h-full flex flex-col gap-3 hover:bg-primary/5 transition-colors"
            onClick={() => setIsAddColumnOpen(true)}
          >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/add:scale-110 transition-transform">
                  <Plus className="h-6 w-6" />
              </div>
              <span className="font-black text-xs uppercase tracking-widest text-primary/60">Nova Coluna</span>
          </Button>
      </div>

      <AddColumnDialog 
        open={isAddColumnOpen}
        onOpenChange={setIsAddColumnOpen}
        funnelType="pre_auction"
        funnelId={funnelId}
      />
    </DragDropContext>
  );
}
