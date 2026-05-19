import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
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
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => Promise<void>;
    onCancel: () => void;
}

const REASONS = [
    { value: "cliente nao respondeu", label: "Cliente não respondeu" },
    { value: "comprou em outro lugar", label: "Comprou em outro lugar" },
    { value: "localização não agradou", label: "Localização não agradou" },
    { value: "não possui renda", label: "Não possui renda" }
];

export function CancellationReasonDialog({ open, onOpenChange, onConfirm, onCancel }: Props) {
    const [reason, setReason] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!reason) return;
        setLoading(true);
        try {
            await onConfirm(reason);
            onOpenChange(false);
            setReason("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onCancel();
        onOpenChange(false);
        setReason("");
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) handleClose();
        }}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive font-black uppercase tracking-tighter">
                        <AlertCircle className="h-5 w-5" />
                        Motivo de Desistência
                    </DialogTitle>
                    <DialogDescription>
                        Identificamos que o cliente foi movido para a etapa de <b>Desistência</b>. Por favor, nos informe o motivo da desistência:
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cancellation-reason">Motivo</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="cancellation-reason">
                                <SelectValue placeholder="Selecione o motivo da perda..." />
                            </SelectTrigger>
                            <SelectContent>
                                {REASONS.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!reason || loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
