import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, totalInvestment, PROPERTY_STAGES, PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format, differenceInDays } from "date-fns";
import EditPropertyDialog from "./EditPropertyDialog";
import type { Property } from "@/hooks/useProperties";

const priorityColors: Record<string, string> = {
  alta: "bg-[hsl(var(--priority-high))] text-white",
  media: "bg-[hsl(var(--priority-medium))] text-white",
  baixa: "bg-[hsl(var(--priority-low))] text-white",
};

interface Props {
  properties: Property[];
}

export default function PropertyTable({ properties }: Props) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { data: members } = useApprovedMembers();

  const getStage = (val: string) => PROPERTY_STAGES.find(s => s.value === val);
  const getType = (val: string) => PROPERTY_TYPES.find(t => t.value === val);
  const getOcc = (val: string) => OCCUPATION_STATUSES.find(o => o.value === val);
  const getPrio = (val: string) => PRIORITY_LEVELS.find(p => p.value === val);
  const getResp = (id: string | null) => id ? members?.find(m => m.user_id === id)?.full_name : null;

  return (
    <>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Ocupação</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Preço Laudo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data Leilão</TableHead>
              <TableHead>Dias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Nenhum imóvel encontrado.
                </TableCell>
              </TableRow>
            ) : (
              properties.map(p => {
                const stage = getStage(p.stage);
                const inv = totalInvestment(p);
                const resp = getResp(p.responsible_user_id);
                const lifeDays = p.auction_date ? differenceInDays(new Date(), new Date(p.auction_date)) : null;

                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedProperty(p)}
                  >
                    <TableCell className="font-mono font-semibold text-primary">{p.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${stage?.color}`} />
                        <span className="text-xs">{stage?.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{getType(p.property_type)?.label}</TableCell>
                    <TableCell className="text-xs">
                      {[p.city, p.state].filter(Boolean).join("/") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${priorityColors[p.priority] ?? ""}`}>
                        {getPrio(p.priority)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{getOcc(p.occupation_status)?.label}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{formatCurrency(inv)}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(p.listed_price)}</TableCell>
                    <TableCell className="text-xs">{resp ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {p.auction_date ? format(new Date(p.auction_date + "T12:00:00"), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lifeDays !== null ? `${lifeDays}d` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedProperty && (
        <EditPropertyDialog
          property={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={(open) => { if (!open) setSelectedProperty(null); }}
        />
      )}
    </>
  );
}
