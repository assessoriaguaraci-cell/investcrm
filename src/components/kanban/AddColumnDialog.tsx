import { useState } from "react";
import { Plus, PlusCircle, Trash2, ClipboardList, GripVertical } from "lucide-react";
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
import { useKanbanStages, PRESET_COLORS, ChecklistSection } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface Props {
    funnelType: "property" | "client" | "pre_auction";
    funnelId?: string;
    pipeline?: string;
    showLabel?: boolean;
}

export default function AddColumnDialog({ funnelType, funnelId, pipeline, showLabel }: Props) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [color, setColor] = useState("bg-blue-500");
    const [sections, setSections] = useState<ChecklistSection[]>([
        { title: "", items: [""] }
    ]);
    const { addStage, isAdding } = useKanbanStages(funnelType, funnelId);
    const { toast } = useToast();

    const handleAddSection = () => {
        setSections([...sections, { title: "", items: [""] }]);
    };

    const handleRemoveSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const handleUpdateSectionTitle = (index: number, title: string) => {
        const newSections = [...sections];
        newSections[index].title = title;
        setSections(newSections);
    };

    const handleAddItem = (sectionIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].items.push("");
        setSections(newSections);
    };

    const handleUpdateItem = (sectionIndex: number, itemIndex: number, value: string) => {
        const newSections = [...sections];
        newSections[sectionIndex].items[itemIndex] = value;
        setSections(newSections);
    };

    const handleRemoveItem = (sectionIndex: number, itemIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, i) => i !== itemIndex);
        setSections(newSections);
    };

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

            // Clean up sections (remove empty items and empty sections if needed)
            const cleanedSections = sections
                .map(s => ({
                    title: s.title.trim(),
                    items: s.items.map(i => i.trim()).filter(i => i !== "")
                }))
                .filter(s => s.title !== "" || s.items.length > 0);

            await addStage({
                funnel_type: funnelType,
                value,
                label,
                color,
                pipeline: pipeline || null,
                funnel_id: funnelId as any,
                checklist: cleanedSections
            });

            toast({ title: "Coluna adicionada com sucesso!" });
            setOpen(false);
            setLabel("");
            setSections([{ title: "", items: [""] }]);
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
                <Button variant="outline" size="sm" className={cn("h-9 border-dashed border-white/30 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase shadow-sm transition-all", showLabel ? "px-3 gap-2" : "w-9 p-0 rounded-full")}>
                    <Plus className="h-4 w-4 text-orange-500" />
                    {showLabel && "Nova Etapa"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Nova Etapa do Funil</DialogTitle>
                    <DialogDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
                        Configure a coluna e seus conjuntos de checklists
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 scrollbar-thin">
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Coluna</Label>
                            <Input
                                id="name"
                                autoFocus
                                placeholder="Ex: Aguardando Reserva"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="h-10 font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cor da Etapa</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c.class}
                                        type="button"
                                        onClick={() => setColor(c.class)}
                                        className={cn(
                                            "w-7 h-7 rounded-full transition-all border-2",
                                            c.class,
                                            color === c.class ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-80"
                                        )}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ClipboardList className="h-3.5 w-3.5" />
                                Checklist Estruturado
                            </Label>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleAddSection}
                                className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5 hover:bg-primary/10 text-primary"
                            >
                                <PlusCircle className="h-3.5 w-3.5" /> Adicionar Conjunto
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {sections.map((section, sIdx) => (
                                <div key={sIdx} className="bg-muted/30 rounded-xl p-4 border border-border/50 relative group">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 absolute -top-2 -right-2 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:text-destructive"
                                        onClick={() => handleRemoveSection(sIdx)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>

                                    <div className="space-y-3">
                                        <div className="grid gap-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título do Conjunto</Label>
                                            <Input 
                                                placeholder="Ex: Documentação Necessária"
                                                value={section.title}
                                                onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                                                className="h-8 text-xs font-bold bg-background/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subtarefas</Label>
                                            <div className="space-y-2">
                                                {section.items.map((item, iIdx) => (
                                                    <div key={iIdx} className="flex gap-2">
                                                        <Input 
                                                            placeholder="Descreva a tarefa..."
                                                            value={item}
                                                            onChange={(e) => handleUpdateItem(sIdx, iIdx, e.target.value)}
                                                            className="h-8 text-xs bg-background"
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 shrink-0 hover:text-destructive"
                                                            onClick={() => handleRemoveItem(sIdx, iIdx)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleAddItem(sIdx)}
                                                    className="w-full h-8 border-dashed text-[9px] font-black uppercase tracking-widest gap-1.5"
                                                >
                                                    <Plus className="h-3 w-3" /> Nova Subtarefa
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted/20 border-t mt-auto">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isAdding} className="font-black uppercase tracking-tight text-xs">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isAdding} className="font-black uppercase tracking-tight text-xs px-8">
                        {isAdding ? "Salvando..." : "Criar Coluna"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
