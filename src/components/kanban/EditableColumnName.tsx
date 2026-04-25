import { useState, useRef, useEffect } from "react";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DeleteColumnDialog from "./DeleteColumnDialog";

interface Props {
    stageId?: string;
    stageValue?: string;
    pipeline?: string;
    initialLabel: string;
    funnelType: "property" | "client";
    className?: string;
}

export default function EditableColumnName({ stageId, stageValue, pipeline, initialLabel, funnelType, className }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(initialLabel);
    const { updateStage } = useKanbanStages(funnelType);
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (!label.trim() || label === initialLabel) {
            setIsEditing(false);
            setLabel(initialLabel);
            return;
        }

        try {
            if (!stageId) {
                // If it's a default stage, create it in the database with the new name
                await addStage({
                    funnel_type: funnelType,
                    value: stageValue!,
                    label: label.trim(),
                    color: "bg-blue-500", // Default color
                    pipeline: pipeline || null,
                });
            } else {
                await updateStage({ id: stageId, label: label.trim() });
            }
            toast({ title: "Nome da coluna atualizado!" });
            setIsEditing(false);
        } catch (error: any) {
            console.error("Error updating column name:", error);
            toast({
                title: "Erro ao atualizar nome",
                variant: "destructive",
                description: error.message
            });
            setLabel(initialLabel);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
            setIsEditing(false);
            setLabel(initialLabel);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 flex-1">
                <Input
                    ref={inputRef}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="h-7 py-0 px-2 text-sm font-bold bg-background/80"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
                    <Check className="h-3 w-3 text-green-600" />
                </Button>
            </div>
        );
    }

    return (
        <div className="group flex items-center gap-1 flex-1 overflow-hidden">
            <div
                className="flex items-center gap-2 flex-1 cursor-pointer truncate"
                onClick={() => setIsEditing(true)}
            >
                <h3 className={cn("text-xs font-bold truncate text-foreground flex-1", className)} title={initialLabel}>
                    {initialLabel}
                </h3>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                <DeleteColumnDialog
                    funnelType={funnelType}
                    pipeline={pipeline}
                    preSelectedStageValue={stageValue}
                    triggerAsGhost
                />
            </div>
        </div>
    );
}
