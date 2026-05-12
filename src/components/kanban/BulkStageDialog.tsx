import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useKanbanStages } from "@/hooks/useKanbanStages";
import { CLIENT_STAGES } from "@/lib/client-constants";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: (stageValue: string) => Promise<void>;
    currentPipeline?: string;
}

export function BulkStageDialog({ open, onOpenChange, selectedCount, onConfirm, currentPipeline }: Props) {
    const [targetStage, setTargetStage] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { stages: dynamicStages } = useKanbanStages("client");

    const actualStages = dynamicStages.length > 0 ? dynamicStages : CLIENT_STAGES;

    const handleConfirm = async () => {
        if (!targetStage) return;
        setLoading(true);
        try {
            await onConfirm(targetStage);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    const pipelines = Array.from(new Set(actualStages.map(s => s.pipeline).filter(Boolean)));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        Mover em Massa
                    </DialogTitle>
                    <DialogDescription>
                        Mover <b>{selectedCount}</b> clientes selecionados para uma nova etapa.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="target-stage">Nova Etapa</Label>
                        <Select value={targetStage} onValueChange={setTargetStage}>
                            <SelectTrigger id="target-stage">
                                <SelectValue placeholder="Selecione a etapa de destino..." />
                            </SelectTrigger>
                            <SelectContent>
                                {pipelines.map(pipe => (
                                    <SelectGroup key={pipe as string}>
                                        <SelectLabel className="bg-muted/50 font-bold uppercase text-[10px] tracking-wider text-muted-foreground px-2 py-1">
                                            {pipe as string}
                                        </SelectLabel>
                                        {actualStages
                                            .filter(s => s.pipeline === pipe && s.value && s.value.trim() !== "")
                                            .map((s) => (
                                                <SelectItem key={s.value} value={s.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", s.color)} />
                                                        {s.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!targetStage || loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Mover {selectedCount} Clientes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
