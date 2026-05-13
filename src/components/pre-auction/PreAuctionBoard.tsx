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
            className="flex gap-4 overflow-x-auto overflow-y-hidden pb-6 h-full items-stretch"
          >
            {STAGES.map((stage, index) => {
              if (!stage || !stage.value) return null;
              
              // Group properties for this stage
              // If it's the first stage, also include properties with invalid or missing stages
              const stageProperties = (properties || []).filter((p) => {
                  if (!p || !p.id) return false;
                  if (p.stage === stage.value) return true;
                  
                  // Orphaned property logic: if it's the first column and the property stage is invalid
                  if (index === 0) {
                      const isValidStage = STAGES.some(s => s && s.value === p.stage);
                      return !isValidStage;
                  }
                  return false;
              });
              
              // Extracting the CSS variable name from the stageColor string
              let colorVar = stage.color.match(/var\(([^)]+)\)/)?.[1];
              
              // Fallback for standard preset tailwind classes
              if (!colorVar) {
                  if (stage.color.includes('blue')) colorVar = '--preset-blue';
                  else if (stage.color.includes('green')) colorVar = '--preset-green';
                  else if (stage.color.includes('yellow')) colorVar = '--preset-yellow';
                  else if (stage.color.includes('orange')) colorVar = '--preset-orange';
                  else if (stage.color.includes('red')) colorVar = '--preset-red';
                  else if (stage.color.includes('purple')) colorVar = '--preset-purple';
                  else if (stage.color.includes('pink')) colorVar = '--preset-pink';
                  else if (stage.color.includes('slate') || stage.color.includes('gray')) colorVar = '--preset-slate';
              }

              const bgColor = colorVar ? `hsl(var(${colorVar}) / 0.1)` : undefined;
              const borderColor = colorVar ? `hsl(var(${colorVar}) / 0.2)` : undefined;
              const headerBgColor = colorVar ? `hsl(var(${colorVar}) / 0.15)` : undefined;
              const borderBottomColor = colorVar ? `hsl(var(${colorVar}))` : undefined;

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
                            className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0"
                        >
                            <div 
                                {...draggableProvided.dragHandleProps}
                                className="flex flex-col mb-3 px-3 py-2 rounded-t-lg border-b-2 group/header cursor-grab active:cursor-grabbing"
                                style={{
                                    backgroundColor: headerBgColor,
                                    borderBottomColor: borderBottomColor || 'transparent'
                                }}
                            >
                                <div className="flex items-center gap-2">
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
                        <h3 className="font-black text-xs uppercase tracking-tighter text-foreground truncate flex-1">
                            {stage.label}
                        </h3>
                    )}
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <span className="text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/50">
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
            </div>

              <Droppable droppableId={stage.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[120px] overflow-y-auto custom-scrollbar rounded-b-lg p-2 transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-primary/20 ring-inset" : ""
                      }`}
                    style={{
                      backgroundColor: snapshot.isDraggingOver ? undefined : bgColor,
                      border: snapshot.isDraggingOver ? "1px dashed hsl(var(--primary))" : `1px solid ${borderColor || 'transparent'}`,
                      borderTop: 'none'
                    }}
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
