import { useState } from "react";
import { Trash2, AlertTriangle, ArrowRight } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useKanbanStages, KanbanStage } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { CLIENT_STAGES } from "@/lib/client-constants";

interface Props {
    funnelType: "property" | "client";
    pipeline?: string;
    preSelectedStageValue?: string;
    triggerAsGhost?: boolean;
}

export default function DeleteColumnDialog({ funnelType, pipeline, preSelectedStageValue, triggerAsGhost }: Props) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"select" | "confirm">(preSelectedStageValue ? "confirm" : "select");
    const [stageToDelete, setStageToDelete] = useState<string>(preSelectedStageValue || "");
    const [destinationStage, setDestinationStage] = useState<string>("");

    const { stages, deleteStage, isDeleting } = useKanbanStages(funnelType);
    const { toast } = useToast();

    // Fallback to constants if kanban_stages is empty (e.g. before SQL migration)
    const actualStages = stages.length > 0
        ? stages
        : (funnelType === "property" ? PROPERTY_STAGES : CLIENT_STAGES);

    const filteredStages = pipeline
        ? (actualStages as any[]).filter(s => s.pipeline === pipeline)
        : actualStages;

    const handleNext = () => {
        if (!stageToDelete) {
            toast({ title: "Selecione uma coluna para excluir", variant: "destructive" });
            return;
        }
        setStep("confirm");
    };

    const handleConfirm = async () => {
        if (!destinationStage) {
            toast({ title: "Selecione para qual coluna os cards devem ir", variant: "destructive" });
            return;
        }

        try {
            await deleteStage({
                stageValue: stageToDelete,
                destinationStageValue: destinationStage,
            });

            toast({ title: "Coluna excluída com sucesso!" });
            handleClose();
        } catch (error) {
            console.error("Error deleting column:", error);
            toast({
                title: "Erro ao excluir coluna",
                description: "Ocorreu um erro inesperado.",
                variant: "destructive",
            });
        }
    };

    const handleClose = () => {
        setOpen(false);
        setStep(preSelectedStageValue ? "confirm" : "select");
        setStageToDelete(preSelectedStageValue || "");
        setDestinationStage("");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val ? handleClose() : setOpen(val)}>
            <DialogTrigger asChild>
                {triggerAsGhost ? (
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); }}>
                        <Trash2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors shrink-0" />
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full border-dashed border-red-200 hover:bg-red-50 hover:border-red-300">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === "confirm" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        Excluir Coluna
                    </DialogTitle>
                    <DialogDescription>
                        {step === "select"
                            ? "Escolha qual etapa você deseja remover do funil."
                            : `Você tem certeza que deseja excluir esta coluna?`}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {step === "select" ? (
                        <div className="grid gap-2">
                            <Label htmlFor="stage-to-delete">Coluna para Excluir</Label>
                            <Select value={stageToDelete} onValueChange={setStageToDelete}>
                                <SelectTrigger id="stage-to-delete">
                                    <SelectValue placeholder="Selecione a coluna..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredStages.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", s.color)} />
                                                {s.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                                Os cards que estão na coluna <b>{(actualStages as any[]).find(s => s.value === stageToDelete)?.label || "selecionada"}</b> precisam ser movidos para outra coluna antes da exclusão.
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="destination-stage">Mover cards para:</Label>
                                <Select value={destinationStage} onValueChange={setDestinationStage}>
                                    <SelectTrigger id="destination-stage">
                                        <SelectValue placeholder="Selecione a nova coluna..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {funnelType === "client" ? (
                                            <>
                                                {/* Group by Pipeline for Clients */}
                                                {Array.from(new Set((actualStages as any[]).map(s => s.pipeline).filter(Boolean))).map(pipe => (
                                                    <SelectGroup key={pipe as string}>
                                                        <SelectLabel className="bg-muted/50 font-bold uppercase text-[10px] tracking-wider text-muted-foreground">{pipe as string}</SelectLabel>
                                                        {(actualStages as any[])
                                                            .filter(s => s.pipeline === pipe && s.value !== stageToDelete)
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
                                            </>
                                        ) : (
                                            <>
                                                {(actualStages as any[])
                                                    .filter(s => s.value !== stageToDelete)
                                                    .map((s) => (
                                                        <SelectItem key={s.value} value={s.value}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("w-2 h-2 rounded-full", s.color)} />
                                                                {s.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === "select" ? (
                        <>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleNext} disabled={!stageToDelete}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            {(!preSelectedStageValue) && (
                                <Button variant="ghost" onClick={() => setStep("select")} disabled={isDeleting}>
                                    Voltar
                                </Button>
                            )}
                            {(preSelectedStageValue) && (
                                <Button variant="ghost" onClick={handleClose} disabled={isDeleting}>
                                    Cancelar
                                </Button>
                            )}
                            <Button
                                variant="destructive"
                                onClick={handleConfirm}
                                disabled={isDeleting || !destinationStage}
                            >
                                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
