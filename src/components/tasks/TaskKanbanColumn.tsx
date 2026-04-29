import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Activity } from "@/hooks/useActivities";
import { GripVertical } from "lucide-react";

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
    // Map tailwind color classes to CSS variables if possible
    const colorVarMap: Record<string, string> = {
        "bg-slate-400": "--preset-slate",
        "bg-blue-500": "--preset-blue",
        "bg-yellow-500": "--preset-yellow",
        "bg-green-500": "--preset-green",
        "bg-purple-500": "--preset-purple",
    };

    const colorVar = colorVarMap[colorClass] || "--preset-slate";
    const bgColor = `hsl(var(${colorVar}) / 0.1)`;
    const borderColor = `hsl(var(${colorVar}) / 0.2)`;
    const headerBgColor = `hsl(var(${colorVar}) / 0.15)`;
    const borderBottomColor = `hsl(var(${colorVar}))`;

    return (
        <div className="flex flex-col min-w-[260px] max-w-[300px] w-[280px] shrink-0">
            <div
                className="flex flex-col mb-3 px-3 py-2 rounded-t-lg border-b-2 group/header cursor-grab active:cursor-grabbing"
                style={{
                    backgroundColor: headerBgColor,
                    borderBottomColor: borderBottomColor
                }}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/header:text-primary/50 transition-colors shrink-0" />
                    <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
                    <h3 className="text-[11px] font-black truncate text-foreground flex-1 uppercase tracking-wider">{title}</h3>
                    <span className="ml-auto text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/50">
                        {tasks.length}
                    </span>
                </div>
            </div>

            <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-[120px] rounded-b-lg p-2 transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-primary/20 ring-inset" : ""
                            }`}
                        style={{
                            backgroundColor: snapshot.isDraggingOver ? undefined : bgColor,
                            border: snapshot.isDraggingOver ? "1px dashed hsl(var(--primary))" : `1px solid ${borderColor}`,
                            borderTop: 'none'
                        }}
                    >
                        <div className="space-y-3">
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
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
