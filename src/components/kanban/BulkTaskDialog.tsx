import { useState } from "react";
import { Clock, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: (data: { description: string, due_date: string, notes: string, activity_type: string }) => Promise<void>;
}

export function BulkTaskDialog({ open, onOpenChange, selectedCount, onConfirm }: Props) {
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [type, setType] = useState("lembrete");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!description || !dueDate) return;
        setLoading(true);
        try {
            await onConfirm({ description, due_date: dueDate, notes, activity_type: type });
            onOpenChange(false);
            setDescription("");
            setDueDate("");
            setNotes("");
            setType("lembrete");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Adicionar Tarefa em Massa
                    </DialogTitle>
                    <DialogDescription>
                        Criar tarefa para os <b>{selectedCount}</b> clientes selecionados.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="task-desc">Descrição da Tarefa</Label>
                        <Input
                            id="task-desc"
                            placeholder="Ex: Ligar para verificar interesse"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="task-date">Vencimento</Label>
                        <Input
                            id="task-date"
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="task-type">Tipo de Atividade</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="task-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ligacao">Ligação</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="visita">Visita</SelectItem>
                                <SelectItem value="reuniao">Reunião</SelectItem>
                                <SelectItem value="documentacao">Documentação</SelectItem>
                                <SelectItem value="lembrete">Lembrete</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="task-notes">Observações</Label>
                        <Textarea
                            id="task-notes"
                            placeholder="Detalhes extras..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!description || !dueDate || loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Criar {selectedCount} Tarefas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
