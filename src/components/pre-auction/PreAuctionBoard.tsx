import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PreAuctionProperty, PreAuctionStage } from "@/types/pre-auction";
import { PreAuctionCard } from "./PreAuctionCard";
import { cn } from "@/lib/utils";

interface PreAuctionBoardProps {
  properties: PreAuctionProperty[];
  onMoveProperty: (id: string, newStage: PreAuctionStage) => void;
  onCardClick: (property: PreAuctionProperty) => void;
}

const STAGES: { value: PreAuctionStage; label: string; color: string }[] = [
  { value: 'inicial', label: 'Fase Inicial', color: 'bg-blue-500' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-yellow-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500' },
  { value: 'arrematado', label: 'Arrematado', color: 'bg-purple-600' },
];

export function PreAuctionBoard({ properties, onMoveProperty, onCardClick }: PreAuctionBoardProps) {
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    onMoveProperty(draggableId, destination.droppableId as PreAuctionStage);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 h-full min-h-[calc(100vh-200px)]">
        {STAGES.map((stage) => {
          const stageProperties = properties.filter((p) => p.stage === stage.value);

          return (
            <div key={stage.value} className="flex flex-col min-w-[300px] w-[300px] bg-muted/30 rounded-lg border border-border/50">
              <div className={cn(
                "p-3 rounded-t-lg border-b-2 flex items-center justify-between",
                stage.value === 'cancelado' ? "bg-gray-100 border-gray-300" : "bg-background border-primary/20"
              )}>
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", stage.color)} />
                    <h3 className="font-black text-xs uppercase tracking-tighter text-foreground">
                        {stage.label}
                    </h3>
                </div>
                <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {stageProperties.length}
                </span>
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
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
