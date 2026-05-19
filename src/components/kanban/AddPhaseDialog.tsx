import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PRESET_COLORS } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";
import { useBoardSettings } from "@/hooks/useBoardSettings";

export default function AddPhaseDialog() {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [color, setColor] = useState("bg-blue-500");
    const { addCustomPhase, customPhases = [] } = useBoardSettings();
    const { toast } = useToast();

    const handleSave = () => {
        if (!label.trim()) {
            toast({ title: "O nome da fase é obrigatório", variant: "destructive" });
            return;
        }

        const value = label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/(^_|_$)/g, "");

        if (customPhases.find(p => p.value === value)) {
            toast({ title: "Esta fase já existe", variant: "destructive" });
            return;
        }

        addCustomPhase({ name: label, value, color });
        toast({ title: "Fase adicionada com sucesso!" });
        setOpen(false);
        setLabel("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-col min-w-[200px] h-full min-h-[400px] items-center justify-center border-2 border-dashed border-border rounded-2xl group/add bg-muted/20 hover:bg-muted/50 transition-all shrink-0 cursor-pointer">
                    <Button variant="outline" size="icon" className="h-10 w-10 border-dashed rounded-full pointer-events-none">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <p className="text-xs font-black uppercase text-muted-foreground mt-3 tracking-widest">Nova Fase</p>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-tighter">Criar Nova Fase</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nome da Fase</Label>
                        <Input
                            placeholder="Ex: Fase de Contratos"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Cor da Fase</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setColor(c.class.replace("bg-[hsl(", "bg-").replace(")]", "-500"))}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 border-transparent hover:scale-110 transition-transform",
                                        c.class,
                                        color.includes(c.class.replace("bg-[hsl(", "").replace(")]", "")) && "border-foreground scale-110 shadow-sm"
                                    )}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Criar Fase</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
