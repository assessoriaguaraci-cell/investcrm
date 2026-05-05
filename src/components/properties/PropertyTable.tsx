import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, AlertTriangle, User, Calendar, Clock, Receipt, Home, 
  FileText, Image as ImageIcon, Link2, Megaphone, CheckCircle2, 
  XCircle, FolderOpen, Settings2, ChevronDown, Check, Columns,
  DollarSign, TrendingUp, Info, Briefcase, Key, Hammer
} from "lucide-react";
import { 
  formatCurrency, totalInvestment, PROPERTY_STAGES, PROPERTY_TYPES, 
  OCCUPATION_STATUSES, PRIORITY_LEVELS 
} from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format, differenceInDays } from "date-fns";
import EditPropertyDialog from "./EditPropertyDialog";
import type { Property } from "@/hooks/useProperties";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  properties: Property[];
}

const COLUMN_CATEGORIES = {
  identification: { label: "Identificação", icon: Info },
  location: { label: "Localização", icon: MapPin },
  status: { label: "Status & Prioridade", icon: AlertTriangle },
  areas: { label: "Áreas & Divisão", icon: Home },
  financial: { label: "Financeiro", icon: DollarSign },
  auction: { label: "Leilão", icon: Calendar },
  possession: { label: "Ocupação & Posse", icon: Key },
  renovation: { label: "Reforma", icon: Hammer },
  marketing: { label: "Marketing", icon: Megaphone },
  management: { label: "Gestão", icon: Briefcase },
  appraisal: { label: "Avaliação", icon: TrendingUp },
};

export default function PropertyTable({ properties }: Props) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { data: members } = useApprovedMembers();

  // Columns visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("property-table-columns");
    if (saved) return JSON.parse(saved);
    // Default columns
    return {
      photo: true,
      code: true,
      stage: true,
      city: true,
      property_type: true,
      purchase_price: true,
      auction_date: true,
      priority: true,
      responsible: true
    };
  });

  useEffect(() => {
    localStorage.setItem("property-table-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const getStage = (val: string) => PROPERTY_STAGES.find(s => s.value === val);
  const getType = (val: string) => PROPERTY_TYPES.find(t => t.value === val);
  const getOcc = (val: string) => OCCUPATION_STATUSES.find(o => o.value === val);
  const getPrio = (val: string) => PRIORITY_LEVELS.find(p => p.value === val);
  const getResp = (id: string | null) => id ? members?.find(m => m.user_id === id)?.full_name : null;

  const allColumns = useMemo(() => [
    { id: "photo", label: "Foto", category: "identification" },
    { id: "code", label: "Código", category: "identification" },
    { id: "registration_number", label: "Matrícula", category: "identification" },
    { id: "owner", label: "Proprietário", category: "identification" },
    { id: "origin", label: "Origem", category: "identification" },
    
    { id: "address", label: "Endereço", category: "location" },
    { id: "city", label: "Cidade/UF", category: "location" },
    { id: "neighborhood", label: "Bairro", category: "location" },
    { id: "zip_code", label: "CEP", category: "location" },
    { id: "landmark", label: "Ponto de Ref.", category: "location" },
    
    { id: "stage", label: "Etapa Atual", category: "status" },
    { id: "priority", label: "Prioridade", category: "status" },
    
    { id: "property_type", label: "Tipo", category: "areas" },
    { id: "area_total", label: "Área Total", category: "areas" },
    { id: "area_useful", label: "Área Útil", category: "areas" },
    { id: "property_division", label: "Divisão", category: "areas" },
    { id: "has_condo", label: "Condomínio?", category: "areas" },
    { id: "condo_value", label: "Valor Cond.", category: "areas" },
    
    { id: "purchase_price", label: "Valor Compra", category: "financial" },
    { id: "documentation_cost", label: "Custos Doc.", category: "financial" },
    { id: "itbi_cost", label: "ITBI", category: "financial" },
    { id: "registration_cost", label: "Registro", category: "financial" },
    { id: "eviction_cost", label: "Desocupação $", category: "financial" },
    { id: "renovation_cost", label: "Reforma $", category: "financial" },
    { id: "listed_price", label: "Vlr. Laudo/Lista", category: "financial" },
    { id: "sale_price", label: "Preço de Venda", category: "financial" },
    { id: "cash_sale_discount", label: "Desc. à Vista", category: "financial" },
    { id: "final_sale_price", label: "Vlr. Venda Final", category: "financial" },
    { id: "total_investment", label: "Invest. Total", category: "financial" },
    
    { id: "auction_date", label: "Data Leilão", category: "auction" },
    { id: "auction_type", label: "Transação", category: "auction" },
    { id: "sale_type", label: "Usado/Novo", category: "auction" },
    
    { id: "occupation_status", label: "Status Posse", category: "possession" },
    { id: "possession_date", label: "Data Posse", category: "possession" },
    
    { id: "renovation_start", label: "Início Reforma", category: "renovation" },
    { id: "renovation_end", label: "Fim Reforma", category: "renovation" },
    
    { id: "marketing_smartlink", label: "Smartlink", category: "marketing" },
    { id: "marketing_paid_traffic", label: "Tráfego Pago", category: "marketing" },
    { id: "marketing_board", label: "Placa", category: "marketing" },
    { id: "marketing_banner", label: "Faixa", category: "marketing" },
    { id: "has_broker", label: "Corretor?", category: "marketing" },
    
    { id: "responsible", label: "Resp. Geral", category: "management" },
    { id: "op_responsible", label: "Resp. Operação", category: "management" },
    { id: "caretaker_payment_date", label: "Pag. Cuidador", category: "management" },
    
    { id: "appraisal_status", label: "Status Laudo", category: "appraisal" },
    { id: "appraisal_date", label: "Data Laudo", category: "appraisal" },
    { id: "appraisal_expiry", label: "Venc. Laudo", category: "appraisal" },
  ], []);

  const activeColumns = allColumns.filter(c => visibleColumns[c.id]);

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllInCategory = (category: string, value: boolean) => {
    const cols = allColumns.filter(c => c.category === category);
    const newVisible = { ...visibleColumns };
    cols.forEach(c => newVisible[c.id] = value);
    setVisibleColumns(newVisible);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-card/50 backdrop-blur-md border-white/10 gap-2 shadow-lg">
              <Columns className="h-4 w-4" />
              Colunas
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px] bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-0">
            <DropdownMenuLabel className="flex items-center gap-2 p-4 pb-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Configurar Colunas
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="opacity-10" />
            <ScrollArea className="h-[450px] p-2">
              {Object.entries(COLUMN_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <div className="flex items-center gap-2">
                       <cat.icon className="h-3 w-3 text-muted-foreground" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{cat.label}</span>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => toggleAllInCategory(key, true)} className="text-[9px] font-bold text-primary hover:underline">Ver tudo</button>
                       <span className="text-[9px] opacity-20">|</span>
                       <button onClick={() => toggleAllInCategory(key, false)} className="text-[9px] font-bold text-muted-foreground hover:underline">Ocultar</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {allColumns.filter(c => c.category === key).map(col => (
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
                  </div>
                  <DropdownMenuSeparator className="mt-2 opacity-5" />
                </div>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border bg-card/30 backdrop-blur-sm shadow-xl overflow-hidden mx-4 mb-8">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/50 border-b border-white/10 sticky top-0 z-10 shadow-sm">
              <TableRow className="hover:bg-transparent h-10">
                {activeColumns.map(col => (
                  <TableHead key={col.id} className="font-bold text-[9px] uppercase tracking-wider px-3 border-r border-white/5 last:border-0 whitespace-nowrap text-muted-foreground bg-muted/80 backdrop-blur-sm">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeColumns.length} className="text-center text-muted-foreground py-20">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Home className="h-10 w-10 text-primary/20" />
                      <p className="font-medium text-sm">Nenhum imóvel encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                properties.map(p => {
                  const stage = getStage(p.stage);
                  const inv = totalInvestment(p);
                  const resp = getResp(p.responsible_user_id);
                  const respOp = getResp((p as any).operation_responsible_id);
                  const occ = getOcc(p.occupation_status);
                  const prio = getPrio(p.priority);

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
                            content = (p as any).photo_url ? (
                              <img src={(p as any).photo_url} className="h-8 w-8 rounded object-cover border border-white/10 shadow-sm" />
                            ) : <ImageIcon className="h-5 w-5 opacity-10" />;
                            break;
                          case "code":
                            content = <span className="font-mono font-black text-primary text-[10px] bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{p.code}</span>;
                            break;
                          case "registration_number":
                            content = <span className="text-foreground/80 font-bold">{(p as any).registration_number}</span>;
                            break;
                          case "owner":
                            content = (p as any).owner;
                            break;
                          case "origin":
                            content = <span className="uppercase font-black text-blue-500/80">{(p as any).origin}</span>;
                            break;
                          case "address":
                            content = <span className="truncate max-w-[180px] block font-bold text-foreground/70" title={p.address}>{p.address}</span>;
                            break;
                          case "city":
                            content = [p.city, p.state].filter(Boolean).join("/");
                            break;
                          case "neighborhood":
                            content = p.neighborhood;
                            break;
                          case "zip_code":
                            content = p.zip_code;
                            break;
                          case "landmark":
                            content = (p as any).landmark;
                            break;
                          case "stage":
                            content = (
                              <div className="flex items-center gap-1.5">
                                <div className={cn("h-1.5 w-1.5 rounded-full", stage?.color || "bg-slate-400")} />
                                <span className="text-[9px] font-black uppercase tracking-tight text-foreground/90">{stage?.label}</span>
                              </div>
                            );
                            break;
                          case "priority":
                            content = (
                              <div className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border w-fit leading-none", 
                                p.priority === 'alta' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                p.priority === 'media' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 
                                'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              )}>
                                {prio?.label}
                              </div>
                            );
                            break;
                          case "property_type":
                            content = <span className="text-[9px] uppercase font-bold text-muted-foreground">{getType(p.property_type)?.label}</span>;
                            break;
                          case "area_total":
                            content = p.area_total ? <span className="font-mono">{p.area_total}m²</span> : "—";
                            break;
                          case "area_useful":
                            content = p.area_useful ? <span className="font-mono text-primary/80">{p.area_useful}m²</span> : "—";
                            break;
                          case "property_division":
                            content = <span className="truncate max-w-[120px] block italic text-muted-foreground" title={(p as any).property_division}>{(p as any).property_division}</span>;
                            break;
                          case "has_condo":
                            content = p.has_condo ? <Badge className="h-4 text-[7px] bg-amber-500/20 text-amber-600 border-amber-500/30">Sim</Badge> : "Não";
                            break;
                          case "condo_value":
                            content = p.condo_value ? formatCurrency(p.condo_value) : "—";
                            break;
                          case "purchase_price":
                            content = <span className="font-mono text-foreground/80">{formatCurrency(p.purchase_price || 0)}</span>;
                            break;
                          case "documentation_cost":
                            content = formatCurrency(p.documentation_cost || 0);
                            break;
                          case "itbi_cost":
                            content = formatCurrency(p.itbi_cost || 0);
                            break;
                          case "registration_cost":
                            content = formatCurrency(p.registration_cost || 0);
                            break;
                          case "eviction_cost":
                            content = formatCurrency(p.eviction_cost || 0);
                            break;
                          case "renovation_cost":
                            content = formatCurrency(p.renovation_cost || 0);
                            break;
                          case "listed_price":
                            content = <span className="font-mono text-emerald-600 font-bold">{formatCurrency(p.listed_price || 0)}</span>;
                            break;
                          case "sale_price":
                            content = <span className="font-mono text-primary font-bold">{formatCurrency((p as any).sale_price || 0)}</span>;
                            break;
                          case "cash_sale_discount":
                            content = (p as any).cash_sale_discount ? `${(p as any).cash_sale_discount}%` : "—";
                            break;
                          case "final_sale_price":
                            content = (p as any).final_sale_price ? <span className="font-mono text-foreground font-black">{formatCurrency((p as any).final_sale_price)}</span> : "—";
                            break;
                          case "total_investment":
                            content = <span className="font-mono font-black text-foreground underline decoration-primary/30 decoration-2 underline-offset-2">{formatCurrency(inv)}</span>;
                            break;
                          case "auction_date":
                            content = p.auction_date ? <div className="flex items-center gap-1 font-bold text-foreground/60"><Calendar className="h-2.5 w-2.5 opacity-40" /> {format(new Date(p.auction_date + "T12:00:00"), "dd/MM/yy")}</div> : "—";
                            break;
                          case "auction_type":
                            content = <span className="text-[8px] font-black uppercase text-muted-foreground">{(p as any).auction_type}</span>;
                            break;
                          case "sale_type":
                            content = <span className="text-[8px] font-black uppercase text-muted-foreground/60">{(p as any).sale_type}</span>;
                            break;
                          case "occupation_status":
                            content = <span className={cn("text-[9px] font-bold uppercase", p.occupation_status === 'desocupado' ? 'text-emerald-500' : 'text-amber-500')}>{occ?.label}</span>;
                            break;
                          case "possession_date":
                            content = p.possession_date ? format(new Date(p.possession_date + "T12:00:00"), "dd/MM/yy") : "—";
                            break;
                          case "renovation_start":
                            content = p.renovation_start ? format(new Date(p.renovation_start + "T12:00:00"), "dd/MM/yy") : "—";
                            break;
                          case "renovation_end":
                            content = p.renovation_end ? format(new Date(p.renovation_end + "T12:00:00"), "dd/MM/yy") : "—";
                            break;
                          case "marketing_smartlink":
                            content = (p as any).marketing_smartlink ? <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mx-auto" /> : <div className="h-1 w-1 rounded-full bg-white/5 mx-auto" />;
                            break;
                          case "marketing_paid_traffic":
                            content = (p as any).marketing_paid_traffic ? <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mx-auto" /> : <div className="h-1 w-1 rounded-full bg-white/5 mx-auto" />;
                            break;
                          case "marketing_board":
                            content = (p as any).marketing_board ? <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mx-auto" /> : <div className="h-1 w-1 rounded-full bg-white/5 mx-auto" />;
                            break;
                          case "marketing_banner":
                            content = (p as any).marketing_banner ? <div className="h-1.5 w-1.5 rounded-full bg-pink-500 mx-auto" /> : <div className="h-1 w-1 rounded-full bg-white/5 mx-auto" />;
                            break;
                          case "has_broker":
                            content = (p as any).has_broker ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" /> : <XCircle className="h-3 w-3 text-white/5 mx-auto" />;
                            break;
                          case "responsible":
                            content = <span className="truncate max-w-[100px] block">{resp}</span>;
                            break;
                          case "op_responsible":
                            content = <span className="truncate max-w-[100px] block text-emerald-500/80 font-bold">{respOp}</span>;
                            break;
                          case "caretaker_payment_date":
                            content = (p as any).caretaker_payment_date ? `Dia ${(p as any).caretaker_payment_date}` : "—";
                            break;
                          case "appraisal_status":
                            content = <span className="uppercase text-[8px] font-black opacity-60">{(p as any).appraisal_status}</span>;
                            break;
                          case "appraisal_date":
                            content = (p as any).appraisal_date ? format(new Date((p as any).appraisal_date + "T12:00:00"), "dd/MM/yy") : "—";
                            break;
                          case "appraisal_expiry":
                            content = (p as any).appraisal_expiry ? <span className="text-orange-500/80 font-bold">{format(new Date((p as any).appraisal_expiry + "T12:00:00"), "dd/MM/yy")}</span> : "—";
                            break;
                        }

                        return (
                          <TableCell key={col.id} className="px-3 py-1.5 text-[9px] font-medium border-r border-white/5 last:border-0 whitespace-nowrap group-hover:bg-primary/[0.01]">
                            {content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedProperty && (
        <EditPropertyDialog
          property={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={(open) => { if (!open) setSelectedProperty(null); }}
        />
      )}
    </div>
  );
}
