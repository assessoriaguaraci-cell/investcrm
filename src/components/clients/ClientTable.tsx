import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STAGES, TEMPERATURE_OPTIONS, formatPhone } from "@/lib/client-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format } from "date-fns";
import EditClientDialog from "./EditClientDialog";
import type { Client } from "@/hooks/useClients";

const temperatureColors: Record<string, string> = {
    hot: "bg-red-500 text-white",
    warm: "bg-orange-500 text-white",
    cold: "bg-blue-500 text-white",
};

interface Props {
    clients: Client[];
}

export default function ClientTable({ clients }: Props) {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const { data: members } = useApprovedMembers();

    const getStage = (val: string) => CLIENT_STAGES.find(s => s.value === val);
    const getTemp = (val: string) => TEMPERATURE_OPTIONS.find(t => t.value === val);
    const getResp = (id: string | null) => id ? members?.find(m => m.user_id === id)?.full_name : null;

    return (
        <>
            <div className="rounded-md border overflow-auto bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Etapa</TableHead>
                            <TableHead>Temperatura</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Criado em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    Nenhum cliente encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map(c => {
                                const stage = getStage(c.stage);
                                const temp = getTemp(c.temperature);
                                const resp = getResp(c.responsible_user_id);

                                return (
                                    <TableRow
                                        key={c.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setSelectedClient(c)}
                                    >
                                        <TableCell className="font-medium text-primary">{c.full_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-2.5 w-2.5 rounded-full ${stage?.color}`} />
                                                <span className="text-xs">{stage?.label}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] ${temperatureColors[c.temperature] ?? ""}`}>
                                                {temp?.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">{c.phone ? formatPhone(c.phone) : "—"}</TableCell>
                                        <TableCell className="text-xs">{c.email || "—"}</TableCell>
                                        <TableCell className="text-xs">{resp ?? "—"}</TableCell>
                                        <TableCell className="text-xs">
                                            {format(new Date(c.created_at), "dd/MM/yyyy")}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedClient && (
                <EditClientDialog
                    client={selectedClient}
                    open={!!selectedClient}
                    onOpenChange={(open) => { if (!open) setSelectedClient(null); }}
                />
            )}
        </>
    );
}
