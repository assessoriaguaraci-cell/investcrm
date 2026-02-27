import { useState, useRef, useEffect } from "react";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    stageId?: string;
    initialLabel: string;
    funnelType: "property" | "client";
}

export default function EditableColumnName({ stageId, initialLabel, funnelType }: Props) {
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
                toast({
                    title: "Recurso não disponível",
                    description: "Esta é uma coluna padrão. Para editar nomes ou cores, você precisa aplicar a migração SQL no Supabase.",
                    variant: "destructive",
                });
                setLabel(initialLabel);
                setIsEditing(false);
                return;
            }

            await updateStage({ id: stageId, label: label.trim() });
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
        <div
            className="group flex items-center gap-2 flex-1 cursor-pointer overflow-hidden"
            onClick={() => setIsEditing(true)}
        >
            <h3 className="text-sm font-bold truncate text-foreground flex-1">
                {initialLabel}
            </h3>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
    );
}
