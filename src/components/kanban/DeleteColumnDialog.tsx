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
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useKanbanStages, KanbanStage } from "@/hooks/useKanbanStages";
import { cn } from "@/lib/utils";

interface Props {
    funnelType: "property" | "client";
    pipeline?: string;
}

export default function DeleteColumnDialog({ funnelType, pipeline }: Props) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"select" | "confirm">("select");
    const [stageToDelete, setStageToDelete] = useState<string>("");
    const [destinationStage, setDestinationStage] = useState<string>("");

    const { stages, deleteStage, isDeleting } = useKanbanStages(funnelType);
    const { toast } = useToast();

    const filteredStages = pipeline
        ? stages.filter(s => s.pipeline === pipeline)
        : stages;

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
        setStep("select");
        setStageToDelete("");
        setDestinationStage("");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val ? handleClose() : setOpen(val)}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full border-dashed border-red-200 hover:bg-red-50 hover:border-red-300">
                    <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
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
                                Os cards que estão na coluna <b>{stages.find(s => s.value === stageToDelete)?.label}</b> precisam ser movidos para outra coluna antes da exclusão.
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="destination-stage">Mover cards para:</Label>
                                <Select value={destinationStage} onValueChange={setDestinationStage}>
                                    <SelectTrigger id="destination-stage">
                                        <SelectValue placeholder="Selecione a nova coluna..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredStages
                                            .filter(s => s.value !== stageToDelete)
                                            .map((s) => (
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
                            <Button variant="ghost" onClick={() => setStep("select")} disabled={isDeleting}>
                                Voltar
                            </Button>
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
