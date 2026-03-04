import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Activity } from "@/hooks/useActivities";
import { Badge } from "@/components/ui/badge";

interface Props {
    columnId: string;
    title: string;
    tasks: Activity[];
    onToggle: (activity: Activity) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (id: string) => void;
    colorClass: string;
}

export default function TaskKanbanColumn({
    columnId,
    title,
    tasks,
    onToggle,
    onEdit,
    onDelete,
    colorClass
}: Props) {
    return (
        <div className="flex flex-col min-w-[280px] w-[300px] shrink-0 bg-slate-50/50 rounded-xl border border-slate-100 h-full">
            <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h3>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold text-[10px]">
                    {tasks.length}
                </Badge>
            </div>

            <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-3 transition-colors min-h-[200px] ${snapshot.isDraggingOver ? "bg-slate-100/50" : ""
                            }`}
                    >
                        {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={snapshot.isDragging ? "opacity-90 shadow-2xl" : ""}
                                    >
                                        <TaskCard
                                            activity={task}
                                            onToggle={onToggle}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
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
}
