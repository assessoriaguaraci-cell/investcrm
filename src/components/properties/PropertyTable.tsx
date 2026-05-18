import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, AlertTriangle, User, Calendar, Clock, Receipt, Home, 
  FileText, Image as ImageIcon, Link2, Megaphone, CheckCircle2, 
  XCircle, FolderOpen, Settings2, ChevronDown, Check, Columns,
  DollarSign, TrendingUp, Info, Briefcase, Key, Hammer, ExternalLink
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
import { useUpdateProperty } from "@/hooks/useProperties";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";

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

const defaultWidths: Record<string, number> = {
  photo: 50,
  code: 120,
  address: 200,
  owner: 150,
  neighborhood: 150,
  city: 120,
  landmark: 150,
  total_investment: 120,
};

export default function PropertyTable({ properties }: Props) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("property-table-widths");
    return saved ? JSON.parse(saved) : defaultWidths;
  });

  useEffect(() => {
    localStorage.setItem("property-table-widths", JSON.stringify(columnWidths));
  }, [columnWidths]);

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = columnWidths[colId] || 120; // Default min width

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      setColumnWidths(prev => ({
        ...prev,
        [colId]: Math.max(50, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { data: members } = useApprovedMembers();
  const updateProperty = useUpdateProperty();

  const handleUpdate = (id: string, field: string, value: any) => {
    updateProperty.mutate({ id, [field]: value }, {
      onError: (err: any) => toast.error(`Erro ao atualizar: ${err.message}`)
    });
  };

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
            <Button variant="outline" size="sm" className="bg-muted text-foreground border-border gap-2 shadow-lg font-black uppercase text-[10px]">
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

      <div className="flex-1 overflow-auto border rounded-xl bg-card/30 backdrop-blur-sm shadow-xl mx-4 mb-8">
          <Table className="border-collapse min-w-full">
            <TableHeader className="sticky top-0 z-30 shadow-md">
              <TableRow className="hover:bg-transparent h-10 border-none">
                {activeColumns.map(col => {
                  const width = columnWidths[col.id] || 120;
                  return (
                    <TableHead 
                      key={col.id} 
                      className="relative font-bold text-[9px] uppercase tracking-wider px-3 border-r border-white/5 last:border-0 whitespace-nowrap text-muted-foreground bg-muted/95 backdrop-blur-sm sticky top-0 group select-none"
                      style={{ width: `${width}px`, minWidth: `${width}px` }}
                    >
                      {col.label}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/20 z-10 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, col.id)}
                      />
                    </TableHead>
                  );
                })}
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
                        const id = p.id;
                        
                        switch(col.id) {
                          case "photo":
                            content = (p as any).photo_url ? (
                              <img src={(p as any).photo_url} className="h-8 w-8 rounded object-cover border border-white/10 shadow-sm" />
                            ) : <ImageIcon className="h-5 w-5 opacity-10" />;
                            break;
                          case "code":
                            content = (
                              <div className="flex items-center gap-2">
                                <Input 
                                  className="h-7 text-[10px] font-black uppercase bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 px-1"
                                  defaultValue={p.code}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== p.code) handleUpdate(id, "code", e.target.value.toUpperCase());
                                  }}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); }}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                            break;
                          case "registration_number":
                            content = (
                              <Input 
                                className="h-7 text-[10px] font-bold bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 px-1"
                                defaultValue={(p as any).registration_number || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== (p as any).registration_number) handleUpdate(id, "registration_number", e.target.value);
                                }}
                              />
                            );
                            break;
                          case "owner":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary min-w-[120px] px-1"
                                defaultValue={(p as any).owner || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== (p as any).owner) handleUpdate(id, "owner", e.target.value);
                                }}
                              />
                            );
                            break;
                          case "origin":
                            content = (
                              <Select 
                                defaultValue={(p as any).origin || ""} 
                                onValueChange={(val) => handleUpdate(id, "origin", val)}
                              >
                                <SelectTrigger 
                                  className="h-7 text-[10px] font-black uppercase border-none bg-transparent hover:bg-muted/50 p-1 w-20"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="caixa">Caixa</SelectItem>
                                  <SelectItem value="emgea">Emgea</SelectItem>
                                  <SelectItem value="bancos_leiloes">Bancos</SelectItem>
                                </SelectContent>
                              </Select>
                            );
                            break;
                          case "address":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary min-w-[200px] px-1"
                                defaultValue={p.address || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== p.address) handleUpdate(id, "address", e.target.value);
                                }}
                              />
                            );
                            break;
                          case "city":
                            content = (
                              <div className="flex items-center gap-1">
                                <Input 
                                  className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-20 px-1 uppercase"
                                  defaultValue={p.city || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== p.city) handleUpdate(id, "city", e.target.value.toUpperCase());
                                  }}
                                />
                                <span className="opacity-30">/</span>
                                <Input 
                                  className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-8 px-1 uppercase"
                                  defaultValue={p.state || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== p.state) handleUpdate(id, "state", e.target.value.toUpperCase());
                                  }}
                                />
                              </div>
                            );
                            break;
                          case "neighborhood":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary min-w-[100px] px-1 uppercase"
                                defaultValue={p.neighborhood || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== p.neighborhood) handleUpdate(id, "neighborhood", e.target.value.toUpperCase());
                                }}
                              />
                            );
                            break;
                          case "stage":
                            content = (
                              <Select value={p.stage} onValueChange={(val) => handleUpdate(id, "stage", val)}>
                                <SelectTrigger 
                                  className="h-7 text-[9px] font-black uppercase border-none bg-transparent hover:bg-muted/50 p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("h-1.5 w-1.5 rounded-full", stage?.color || "bg-slate-400")} />
                                    <span>{stage?.label}</span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {PROPERTY_STAGES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full", s.color)} />
                                        {s.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                            break;
                          case "priority":
                            content = (
                              <Select value={p.priority} onValueChange={(val) => handleUpdate(id, "priority", val)}>
                                <SelectTrigger 
                                  className={cn("h-7 text-[8px] font-black uppercase border-none bg-transparent hover:bg-muted/50 p-1", 
                                    p.priority === 'alta' ? 'text-destructive' : 
                                    p.priority === 'media' ? 'text-orange-600' : 
                                    'text-emerald-600'
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITY_LEVELS.map(l => (
                                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                            break;
                          case "property_type":
                            content = (
                              <Select value={p.property_type} onValueChange={(val) => handleUpdate(id, "property_type", val)}>
                                <SelectTrigger 
                                  className="h-7 text-[9px] font-black uppercase border-none bg-transparent hover:bg-muted/50 p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROPERTY_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                            break;
                          case "area_total":
                            content = (
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number"
                                  className="h-7 text-[10px] font-mono bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-16 px-1"
                                  defaultValue={p.area_total || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (Number(e.target.value) !== p.area_total) handleUpdate(id, "area_total", Number(e.target.value));
                                  }}
                                />
                                <span className="text-[8px] opacity-30">m²</span>
                              </div>
                            );
                            break;
                          case "purchase_price":
                            content = (
                              <CurrencyInput 
                                className="h-7 text-[10px] font-mono bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 p-1"
                                value={p.purchase_price || 0}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {}} // CurrencyInput handles blur internally or via callback
                                onChange={(val) => {
                                  if (val !== p.purchase_price) handleUpdate(id, "purchase_price", val);
                                }}
                              />
                            );
                            break;
                          case "listed_price":
                            content = (
                              <CurrencyInput 
                                className="h-7 text-[10px] font-mono font-bold text-emerald-600 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 p-1"
                                value={p.listed_price || 0}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(val) => {
                                  if (val !== p.listed_price) handleUpdate(id, "listed_price", val);
                                }}
                              />
                            );
                            break;
                          case "sale_price":
                            content = (
                              <CurrencyInput 
                                className="h-7 text-[10px] font-mono font-bold text-primary bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 p-1"
                                value={(p as any).sale_price || 0}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(val) => {
                                  if (val !== (p as any).sale_price) handleUpdate(id, "sale_price", val);
                                }}
                              />
                            );
                            break;
                          case "auction_date":
                            content = (
                              <div className="w-24" onClick={(e) => e.stopPropagation()}>
                                <SmartDatePicker 
                                  value={p.auction_date || ""} 
                                  onChange={(val) => handleUpdate(id, "auction_date", val)}
                                  className="h-7 text-[9px] p-1 border-none bg-transparent hover:bg-muted/50"
                                />
                              </div>
                            );
                            break;
                          case "occupation_status":
                            content = (
                              <Select value={p.occupation_status} onValueChange={(val) => handleUpdate(id, "occupation_status", val)}>
                                <SelectTrigger 
                                  className={cn("h-7 text-[9px] font-black uppercase border-none bg-transparent hover:bg-muted/50 p-1", 
                                    p.occupation_status === 'desocupado' ? 'text-emerald-500' : 'text-amber-500'
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OCCUPATION_STATUSES.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                            break;
                          case "responsible":
                            content = (
                              <Select 
                                value={p.responsible_user_id || "__none__"} 
                                onValueChange={(val) => handleUpdate(id, "responsible_user_id", val === "__none__" ? null : val)}
                              >
                                <SelectTrigger 
                                  className="h-7 text-[9px] border-none bg-transparent hover:bg-muted/50 p-1 w-32"
                                  onClick={(e) => e.stopPropagation()}
                                >
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
                                value={(p as any).operation_responsible_id || "__none__"} 
                                onValueChange={(val) => handleUpdate(id, "operation_responsible_id", val === "__none__" ? null : val)}
                              >
                                <SelectTrigger 
                                  className="h-7 text-[9px] font-bold text-emerald-600 border-none bg-transparent hover:bg-muted/50 p-1 w-32"
                                  onClick={(e) => e.stopPropagation()}
                                >
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
                          case "zip_code":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-20 px-1"
                                defaultValue={p.zip_code || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== p.zip_code) handleUpdate(id, "zip_code", e.target.value);
                                }}
                              />
                            );
                            break;
                          case "area_useful":
                            content = (
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number"
                                  className="h-7 text-[10px] font-mono bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-16 px-1"
                                  defaultValue={p.area_useful || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (Number(e.target.value) !== p.area_useful) handleUpdate(id, "area_useful", Number(e.target.value));
                                  }}
                                />
                                <span className="text-[8px] opacity-30">m²</span>
                              </div>
                            );
                            break;
                          case "condo_value":
                            content = (
                              <CurrencyInput 
                                className="h-7 text-[10px] font-mono bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 p-1"
                                value={p.condo_value || 0}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(val) => {
                                  if (val !== p.condo_value) handleUpdate(id, "condo_value", val);
                                }}
                              />
                            );
                            break;
                          case "documentation_cost":
                          case "itbi_cost":
                          case "registration_cost":
                          case "eviction_cost":
                          case "renovation_cost":
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
                          case "possession_date":
                          case "renovation_start":
                          case "renovation_end":
                          case "appraisal_date":
                          case "appraisal_expiry":
                            content = (
                              <div className="w-28">
                                <SmartDatePicker 
                                  value={(p as any)[col.id] || ""} 
                                  onChange={(val) => handleUpdate(id, col.id, val)}
                                  className="h-7 text-[9px] p-0 border-none bg-transparent hover:bg-muted/50"
                                />
                              </div>
                            );
                            break;
                          case "appraisal_status":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 px-1 uppercase"
                                defaultValue={(p as any).appraisal_status || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== (p as any).appraisal_status) handleUpdate(id, "appraisal_status", e.target.value.toUpperCase());
                                }}
                              />
                            );
                            break;
                          case "auction_type":
                          case "sale_type":
                            content = (
                              <Input 
                                className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary w-24 px-1 uppercase"
                                defaultValue={(p as any)[col.id] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  if (e.target.value !== (p as any)[col.id]) handleUpdate(id, col.id, e.target.value.toUpperCase());
                                }}
                              />
                            );
                            break;
                          case "total_investment":
                            content = <span className="font-mono font-black text-foreground underline decoration-primary/30 decoration-2 underline-offset-2 px-1">{formatCurrency(inv)}</span>;
                            break;
                          // Default for other fields
                          default:
                            const val = (p as any)[col.id];
                            content = typeof val === 'string' || typeof val === 'number' ? (
                                <Input 
                                  className="h-7 text-[10px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary min-w-[80px] px-1"
                                  defaultValue={val || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== String(val)) handleUpdate(id, col.id, e.target.value);
                                  }}
                                />
                            ) : <span className="px-1 opacity-50">#</span>;
                        }

                        const width = columnWidths[col.id] || 120;
                        return (
                          <TableCell 
                            key={col.id} 
                            className="px-1 py-0 text-[9px] font-medium border-r border-white/5 last:border-0 whitespace-nowrap hover:bg-primary/[0.05] transition-colors focus-within:bg-primary/[0.08]"
                            style={{ width: `${width}px`, maxWidth: `${width}px`, overflow: 'hidden' }}
                          >
                            <div className="w-full flex items-center">
                              {content}
                            </div>
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
