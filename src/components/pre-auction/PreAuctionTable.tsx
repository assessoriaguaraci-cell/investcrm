import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, User, Calendar, Home, Info, Briefcase, ExternalLink, Columns, Settings2, ChevronDown, Image as ImageIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format } from "date-fns";
import { PreAuctionDialog } from "./PreAuctionDialog";
import { PreAuctionProperty } from "@/types/pre-auction";
import { useUpdatePreAuctionProperty, usePreAuctionFunnels } from "@/hooks/usePreAuction";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { useKanbanStages } from "@/hooks/useKanbanStages";

interface Props {
  properties: PreAuctionProperty[];
}

const COLUMN_CATEGORIES = {
  identification: { label: "Identificação", icon: Info },
  location: { label: "Localização", icon: MapPin },
  status: { label: "Status", icon: Settings2 },
  financial: { label: "Financeiro", icon: Briefcase },
  auction: { label: "Leilão", icon: Calendar },
};

export function PreAuctionTable({ properties }: Props) {
  const [selectedProperty, setSelectedProperty] = useState<PreAuctionProperty | null>(null);
  const { data: members } = useApprovedMembers();
  const updateProperty = useUpdatePreAuctionProperty();
  const { data: funnels } = usePreAuctionFunnels();

  const handleUpdate = (id: string, field: string, value: any) => {
    updateProperty.mutate({ id, [field]: value }, {
      onError: (err: any) => toast.error(`Erro ao atualizar: ${err.message}`)
    });
  };

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("pre-auction-table-columns");
    if (saved) return JSON.parse(saved);
    return {
      photo: true,
      code: true,
      stage: true,
      city: true,
      purchase_price: true,
      auction_date: true,
      responsible: true
    };
  });

  useEffect(() => {
    localStorage.setItem("pre-auction-table-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const allColumns = useMemo(() => [
    { id: "photo", label: "Foto", category: "identification" },
    { id: "code", label: "Código", category: "identification" },
    { id: "property_type", label: "Tipo", category: "identification" },
    
    { id: "address", label: "Endereço", category: "location" },
    { id: "city", label: "Cidade/UF", category: "location" },
    { id: "neighborhood", label: "Bairro", category: "location" },
    
    { id: "stage", label: "Etapa", category: "status" },
    { id: "status_diligence", label: "Diligência", category: "status" },
    { id: "status_market_analysis", label: "Mkt. Analysis", category: "status" },
    { id: "status_debts", label: "Débitos", category: "status" },
    
    { id: "purchase_price", label: "Vlr. Arremate", category: "financial" },
    { id: "current_bid", label: "Lance Atual", category: "financial" },
    { id: "market_value", label: "Vlr. Mercado", category: "financial" },
    { id: "appraisal_value", label: "Vlr. Laudo", category: "financial" },
    { id: "listed_price", label: "Venda Pret.", category: "financial" },
    
    { id: "auction_date", label: "Data Leilão", category: "auction" },
    { id: "proposal_deadline", label: "Venc. Lance", category: "auction" },
    { id: "diligence_date", label: "Data Dilig.", category: "auction" },
    
    { id: "responsible", label: "Resp. Comercial", category: "status" },
    { id: "op_responsible", label: "Resp. Operação", category: "status" },
  ], []);

  const activeColumns = allColumns.filter(c => visibleColumns[c.id]);

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-500';
      case 'Concluída': return 'bg-green-500';
      case 'Em Andamento': return 'bg-blue-500';
      default: return 'bg-orange-500';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-card/50 backdrop-blur-md border-white/10 shadow-lg">
              <Columns className="h-4 w-4" />
              Colunas
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px] bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-0">
            <DropdownMenuLabel className="p-4 pb-2 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" /> Configurar Colunas
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="opacity-10" />
            <ScrollArea className="h-[400px] p-2">
              {allColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns[col.id]}
                  onCheckedChange={() => toggleColumn(col.id)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-[11px] h-8"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl bg-card/30 backdrop-blur-sm shadow-xl mx-4 mb-8">
        <Table className="border-collapse min-w-full">
          <TableHeader className="sticky top-0 z-30 shadow-md">
            <TableRow className="hover:bg-transparent h-10 border-none">
              {activeColumns.map(col => (
                <TableHead key={col.id} className="font-bold text-[9px] uppercase tracking-wider px-3 border-r border-white/5 last:border-0 whitespace-nowrap text-muted-foreground bg-muted/95 backdrop-blur-sm">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map(p => {
              const id = p.id;
              return (
              <TableRow
                key={p.id}
                className="group cursor-pointer hover:bg-primary/[0.03] transition-all duration-200 border-b border-white/5 h-12"
                onClick={() => setSelectedProperty(p)}
              >
                {activeColumns.map(col => {
                  let content: React.ReactNode = "—";
                  
                  switch(col.id) {
                    case "photo":
                      content = p.photo_url ? (
                        <img src={p.photo_url} className="h-8 w-8 rounded object-cover border border-white/10 shadow-sm" />
                      ) : <ImageIcon className="h-4 w-4 opacity-10" />;
                      break;
                    case "code":
                      content = (
                        <div className="flex items-center gap-2 px-1">
                            <span className="font-black uppercase text-[10px] tracking-tight">{p.code}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); }}>
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        </div>
                      );
                      break;
                    case "address":
                      content = <span className="text-[10px] truncate max-w-[200px] block px-1">{p.address}</span>;
                      break;
                    case "city":
                      content = <span className="text-[10px] uppercase px-1">{p.city} / {p.state}</span>;
                      break;
                    case "neighborhood":
                        content = <span className="text-[10px] uppercase px-1">{p.neighborhood}</span>;
                        break;
                    case "purchase_price":
                    case "current_bid":
                    case "market_value":
                    case "appraisal_value":
                    case "listed_price":
                      content = (
                        <CurrencyInput 
                            className="h-7 text-[10px] font-mono bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 p-1"
                            value={(p as any)[col.id] || 0}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(val) => {
                                if (val !== (p as any)[col.id]) handleUpdate(id, col.id, val);
                            }}
                        />
                      );
                      break;
                    case "auction_date":
                    case "proposal_deadline":
                    case "diligence_date":
                      content = (
                        <div className="w-24 px-1" onClick={(e) => e.stopPropagation()}>
                            <SmartDatePicker 
                                value={(p as any)[col.id] || ""} 
                                onChange={(val) => handleUpdate(id, col.id, val)}
                                className="h-7 text-[9px] p-0 border-none bg-transparent hover:bg-muted/50"
                            />
                        </div>
                      );
                      break;
                    case "stage":
                      content = <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0 h-5 bg-muted/50">{p.stage}</Badge>;
                      break;
                    case "status_diligence":
                    case "status_market_analysis":
                    case "status_debts":
                        const status = (p as any)[col.id] || "Não Iniciado";
                        content = (
                            <div className="flex items-center gap-1.5 px-1">
                                <div className={cn("h-1.5 w-1.5 rounded-full", getStatusColor(status))} />
                                <span className="text-[9px] font-black uppercase">{status}</span>
                            </div>
                        );
                        break;
                    case "responsible":
                      content = (
                        <Select 
                            value={p.responsible_id || "__none__"} 
                            onValueChange={(val) => handleUpdate(id, "responsible_id", val === "__none__" ? null : val)}
                        >
                            <SelectTrigger className="h-7 text-[9px] border-none bg-transparent hover:bg-muted/50 p-1 w-32" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {members?.map(m => (
                                    <SelectItem key={m.user_id} value={m.user_id || ""}>{m.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      );
                      break;
                    case "op_responsible":
                        content = (
                          <Select 
                              value={p.operation_responsible_id || "__none__"} 
                              onValueChange={(val) => handleUpdate(id, "operation_responsible_id", val === "__none__" ? null : val)}
                          >
                              <SelectTrigger className="h-7 text-[9px] border-none bg-transparent hover:bg-muted/50 p-1 w-32 font-bold text-emerald-600" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="__none__">Nenhum</SelectItem>
                                  <SelectItem value="mentoria">Mentoria</SelectItem>
                                  {members?.map(m => (
                                      <SelectItem key={m.user_id} value={m.user_id || ""}>{m.full_name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                        );
                        break;
                    default:
                      content = <span className="text-[10px] px-1">{(p as any)[col.id] || "—"}</span>;
                  }

                  return (
                    <TableCell key={col.id} className="px-1 py-0 text-[9px] font-medium border-r border-white/5 last:border-0 whitespace-nowrap hover:bg-primary/[0.05] transition-colors focus-within:bg-primary/[0.08]">
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedProperty && (
        <PreAuctionDialog
          property={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={(open) => { if (!open) setSelectedProperty(null); }}
        />
      )}
    </div>
  );
}
