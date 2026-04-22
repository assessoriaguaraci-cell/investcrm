import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useKanbanStages, PRESET_COLORS } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";

interface Props {
    funnelType: "property" | "client";
    pipeline?: string;
    showLabel?: boolean;
}

export default function AddColumnDialog({ funnelType, pipeline, showLabel }: Props) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [color, setColor] = useState("bg-blue-500");
    const { addStage, isAdding } = useKanbanStages(funnelType);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!label.trim()) {
            toast({ title: "O nome da coluna é obrigatório", variant: "destructive" });
            return;
        }

        try {
            // Create a value from the label (slugify)
            const value = label
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/(^_|_$)/g, "");

            await addStage({
                funnel_type: funnelType,
                value,
                label,
                color,
                pipeline: pipeline || null,
            });

            toast({ title: "Coluna adicionada com sucesso!" });
            setOpen(false);
            setLabel("");
        } catch (error: any) {
            console.error("Error adding column:", error);
            toast({
                title: "Erro ao adicionar coluna",
                description: error.message || "Verifique se já não existe uma coluna com esse nome.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 border-dashed font-bold text-[10px] uppercase", showLabel ? "px-3 gap-2" : "w-9 p-0 rounded-full")}>
                    <Plus className="h-4 w-4" />
                    {showLabel && "Nova Coluna"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nova Coluna</DialogTitle>
                    <DialogDescription>
                        Crie uma nova etapa para o seu funil de {funnelType === "property" ? "imóveis" : "clientes"}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome da Coluna</Label>
                        <Input
                            id="name"
                            autoFocus
                            placeholder="Ex: Em Negociação"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Cor da Etapa</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c.class}
                                    type="button"
                                    onClick={() => setColor(c.class)}
                                    className={cn(
                                        "w-8 h-8 rounded-full transition-all border-2",
                                        c.class,
                                        color === c.class ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-80"
                                    )}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isAdding}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isAdding}>
                        {isAdding ? "Salvando..." : "Salvar Coluna"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
