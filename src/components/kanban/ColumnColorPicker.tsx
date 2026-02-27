import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRESET_COLORS, useKanbanStages } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
    stageId?: string;
    stageValue: string;
    stageLabel: string;
    currentColor: string;
    funnelType: "property" | "client";
}

export default function ColumnColorPicker({ stageId, stageValue, stageLabel, currentColor, funnelType }: Props) {
    const { updateStage } = useKanbanStages(funnelType);
    const { toast } = useToast();

    const handleColorChange = async (newColor: string) => {
        try {
            if (!stageId) {
                toast({
                    title: "Recurso não disponível",
                    description: "Esta é uma coluna padrão. Para mudar a cor de colunas padrão ou criar novas, você precisa aplicar a migração SQL no Supabase.",
                    variant: "destructive",
                });
                return;
            }
            await updateStage({ id: stageId, color: newColor });
            toast({ title: "Cor da coluna atualizada!" });
        } catch (error: any) {
            console.error("Error updating column color:", error);
            toast({ title: "Erro ao atualizar cor", variant: "destructive", description: error.message });
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "w-3 h-3 rounded-full shadow-sm cursor-pointer hover:scale-125 transition-transform",
                        currentColor
                    )}
                    title="Mudar cor da coluna"
                />
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2" align="start">
                <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c.class}
                            type="button"
                            onClick={() => handleColorChange(c.class)}
                            className={cn(
                                "w-6 h-6 rounded-full transition-all border",
                                c.class,
                                currentColor === c.class ? "border-foreground scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                            )}
                            title={c.name}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
