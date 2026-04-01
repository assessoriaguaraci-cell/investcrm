import { useState, useEffect } from "react";
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
import { TEMPERATURE_OPTIONS, WORK_REGIMES, MARITAL_STATUSES } from "@/lib/client-constants";
import { Settings2, Loader2 } from "lucide-react";
import { useApprovedMembers } from "@/hooks/useTeamMembers";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    initialField?: string;
    onConfirm: (field: string, value: any) => Promise<void>;
}

export function BulkFieldDialog({ open, onOpenChange, selectedCount, initialField, onConfirm }: Props) {
    const [field, setField] = useState<string>(initialField || "temperature");
    const [value, setValue] = useState<any>("frio");
    const [loading, setLoading] = useState(false);
    const { data: members } = useApprovedMembers();

    useEffect(() => {
        if (open) {
            handleFieldChange(initialField || "temperature");
        }
    }, [open, initialField]);

    useEffect(() => {
        if (field === "responsible_user_id" && !value && members && members.length > 0) {
            setValue(members[0].user_id);
        }
    }, [field, members, value]);

    const handleFieldChange = (newField: string) => {
        setField(newField);
        // Reset value to default for that field
        if (newField === "temperature") setValue("frio");
        else if (newField === "work_regime") setValue("clt");
        else if (newField === "marital_status") setValue(MARITAL_STATUSES[0]);
        else if (newField === "has_fgts") setValue("true");
        else if (newField === "responsible_user_id") setValue(members?.[0]?.user_id || "");
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // Convert string "true"/"false" back to boolean for has_fgts
            const finalValue = field === "has_fgts" ? value === "true" : value;
            await onConfirm(field, finalValue);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" />
                        Alterar Campo em Massa
                    </DialogTitle>
                    <DialogDescription>
                        Alterar um campo específico para <b>{selectedCount}</b> clientes selecionados.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Selecione o Campo</Label>
                        <Select value={field} onValueChange={handleFieldChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="temperature">Temperatura</SelectItem>
                                <SelectItem value="work_regime">Regime de Trabalho</SelectItem>
                                <SelectItem value="marital_status">Estado Civil</SelectItem>
                                <SelectItem value="has_fgts">Tem FGTS</SelectItem>
                                <SelectItem value="responsible_user_id">Responsável</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Novo Valor</Label>
                        {field === "temperature" && (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPERATURE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {field === "work_regime" && (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WORK_REGIMES.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {field === "marital_status" && (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MARITAL_STATUSES.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {field === "has_fgts" && (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Sim</SelectItem>
                                    <SelectItem value="false">Não</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {field === "responsible_user_id" && (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members?.map(m => (
                                        <SelectItem
                                            key={m.user_id}
                                            value={m.user_id}
                                            disabled={!m.is_registered}
                                        >
                                            {m.full_name} {!m.is_registered && "(Aguardando Registro)"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Aplicar Mudança
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
