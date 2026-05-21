import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Activity } from "@/hooks/useActivities";
import { GripVertical, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
    columnId: string;
    title: string;
    tasks: Activity[];
    onToggle: (activity: Activity) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (id: string) => void;
    colorClass: string;
    selectedIds: string[];
    onToggleSelection: (id: string) => void;
    onSelectAll?: (ids: string[], selected: boolean) => void;
    selectable?: boolean;
}

export default function TaskKanbanColumn({
    columnId,
    title,
    tasks,
    onToggle,
    onEdit,
    onDelete,
    colorClass,
    selectedIds,
    onToggleSelection,
    onSelectAll,
    selectable
}: Props) {
    
    // Map status types to colored indicator lines for a visual wow factor
    const indicatorColors: Record<string, string> = {
        "overdue": "bg-destructive",
        "todo": "bg-slate-400",
        "inProgress": "bg-blue-500",
        "done": "bg-green-500",
    };

    const topIndicatorColor = indicatorColors[columnId] || "bg-slate-400";

    return (
        <div className="flex flex-col w-[282px] bg-[#F1F2F4] dark:bg-muted/20 border border-border/40 rounded-2xl p-3 shrink-0 h-full max-h-full overflow-hidden shadow-sm hover:shadow transition-shadow">
            
            {/* Trello Header bar */}
            <div className="flex items-center justify-between mb-3 px-1 pt-0.5 shrink-0 group/header cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {selectable && (
                        <Checkbox 
                            checked={tasks.length > 0 && tasks.every(t => selectedIds.includes(t.id))}
                            onCheckedChange={(checked) => {
                                if (onSelectAll) {
                                    onSelectAll(tasks.map(t => t.id), !!checked);
                                }
                            }}
                            className="h-3.5 w-3.5 border-border data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 shrink-0"
                        />
                    )}
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/header:text-primary/50 transition-colors shrink-0" />
                    
                    {/* Status colored pill */}
                    <div className={cn("w-2 h-2 rounded-full shrink-0", topIndicatorColor)} />
                    
                    <h3 className="text-xs font-bold truncate text-foreground/80 uppercase tracking-wider font-heading">{title}</h3>
                </div>

                <span className="ml-2 text-[10px] font-black text-muted-foreground bg-background/60 dark:bg-background/30 rounded-full px-2 py-0.5 border border-border/25">
                    {tasks.length}
                </span>
            </div>

            {/* Scrollable list content */}
            <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            "flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3 min-h-[150px] transition-all rounded-lg duration-200",
                            snapshot.isDraggingOver && "bg-muted-foreground/5 shadow-inner ring-1 ring-primary/5"
                        )}
                    >
                        <div className="space-y-3 pt-0.5">
                            {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? "opacity-90 shadow-2xl scale-[1.02] rotate-1 transition-transform" : ""}
                                        >
                                            <TaskCard
                                                activity={task}
                                                onToggle={onToggle}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                selected={selectedIds.includes(task.id)}
                                                onSelect={onToggleSelection}
                                                selectable={selectable}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {/* Bottom Actions Add Card shortcut */}
            <div className="pt-2 shrink-0 border-t border-border/10 mt-1">
                <button 
                    onClick={() => {
                        const addBtn = document.getElementById("btn-new-task");
                        if (addBtn) (addBtn as HTMLButtonElement).click();
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted-foreground/15 hover:text-foreground rounded-xl transition-all text-left"
                >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground/80" />
                    <span>Adicionar um cartão</span>
                </button>
            </div>
        </div>
    );
}
