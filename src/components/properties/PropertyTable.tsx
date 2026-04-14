import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, User, Calendar, Clock, Receipt, Home, FileText, Image as ImageIcon, Link2, Megaphone, CheckCircle2, XCircle, FolderOpen } from "lucide-react";
import { formatCurrency, totalInvestment, PROPERTY_STAGES, PROPERTY_TYPES, OCCUPATION_STATUSES, PRIORITY_LEVELS } from "@/lib/property-constants";
import { useApprovedMembers } from "@/hooks/useTeamMembers";
import { format, differenceInDays } from "date-fns";
import EditPropertyDialog from "./EditPropertyDialog";
import type { Property } from "@/hooks/useProperties";

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
      <div className="rounded-xl border bg-card/30 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-muted/50 border-b border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] font-bold text-[10px] uppercase tracking-wider text-center">Foto</TableHead>
                <TableHead className="w-[120px] font-bold text-[10px] uppercase tracking-wider">Identificação</TableHead>
                <TableHead className="w-[150px] font-bold text-[10px] uppercase tracking-wider">Etapa / Ocupação</TableHead>
                <TableHead className="w-[200px] font-bold text-[10px] uppercase tracking-wider">Localização & Tipo</TableHead>
                <TableHead className="w-[200px] font-bold text-[10px] uppercase tracking-wider">Áreas & Divisão</TableHead>
                <TableHead className="w-[100px] font-bold text-[10px] uppercase tracking-wider">Prioridade</TableHead>
                <TableHead className="w-[180px] font-bold text-[10px] uppercase tracking-wider">Gestão</TableHead>
                <TableHead className="w-[140px] font-bold text-[10px] uppercase tracking-wider text-right">Financeiro</TableHead>
                <TableHead className="w-[120px] font-bold text-[10px] uppercase tracking-wider text-center">Marketing</TableHead>
                <TableHead className="w-[120px] font-bold text-[10px] uppercase tracking-wider text-right">Leilão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-20">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Home className="h-10 w-10 text-primary/20" />
                      <p className="font-medium text-sm">Nenhum imóvel encontrado.</p>
                      <p className="text-xs">Tente ajustar seus filtros para ver resultados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                properties.map(p => {
                  const stage = getStage(p.stage);
                  const inv = totalInvestment(p);
                  const resp = getResp(p.responsible_user_id);
                  const respOp = getResp((p as any).operation_responsible_id);
                  const lifeDays = p.auction_date ? differenceInDays(new Date(), new Date(p.auction_date)) : null;
                  const occ = getOcc(p.occupation_status);
                  const prio = getPrio(p.priority);
                  const registration = (p as any).registration_number;
                  const owner = (p as any).owner;
                  const photoUrl = (p as any).photo_url;
                  const division = (p as any).property_division;
                  const address = p.address;
                  const mapsUrl = p.maps_url;
                  const driveUrl = (p as any).drive_url;
                  const appraisalExpiry = (p as any).appraisal_expiry;
                  const daysUntilExpiry = appraisalExpiry ? differenceInDays(new Date(appraisalExpiry + "T12:00:00"), new Date()) : null;

                  return (
                    <TableRow
                      key={p.id}
                      className="group cursor-pointer hover:bg-primary/[0.03] transition-all duration-200 border-b border-white/5 h-28"
                      onClick={() => setSelectedProperty(p)}
                    >
                      {/* Foto */}
                      <TableCell>
                        <div className="flex justify-center">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Prop" className="h-16 w-16 rounded-lg object-cover border border-white/10 shadow-lg group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-white/5">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Identificação */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <span className="font-mono font-black text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 text-[11px] w-fit shadow-sm">
                            {p.code}
                          </span>
                          {registration && (
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold tracking-tight px-1 uppercase italic">
                              <FileText className="h-2.5 w-2.5 opacity-40" />
                              <span className="truncate max-w-[100px]">{registration}</span>
                            </div>
                          )}
                          <div className="flex gap-1.5 mt-1">
                            {mapsUrl && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                                      onClick={(e) => { e.stopPropagation(); window.open(mapsUrl, '_blank'); }}>
                                <MapPin className="h-3 w-3" />
                              </Button>
                            )}
                            {driveUrl && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                                      onClick={(e) => { e.stopPropagation(); window.open(driveUrl, '_blank'); }}>
                                <FolderOpen className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Etapa / Ocupação */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full border border-white/20 shadow-sm ${stage?.color || "bg-slate-400"}`} />
                            <span className="text-[11px] font-black uppercase tracking-tight text-foreground/90 leading-none">{stage?.label}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[9px] w-fit px-2 py-0.5 rounded border shadow-inner font-black uppercase tracking-tighter ${
                            p.occupation_status === "desocupado" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : (p.occupation_status === "venda_para_ocupante" || p.occupation_status === "imissao_na_posse")
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}>
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            {occ?.label}
                          </div>
                        </div>
                      </TableCell>

                      {/* Localização & Tipo */}
                      <TableCell>
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                            <MapPin className="h-3 w-3 text-primary/40 shrink-0" />
                            <span className="text-[11px] font-extrabold leading-tight">
                              {[p.city, p.state].filter(Boolean).join("/") || "—"}
                            </span>
                          </div>
                          {address && (
                            <div className="text-[9px] text-foreground/70 font-bold leading-tight line-clamp-2 pl-4">
                              {address}
                            </div>
                          )}
                          <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight pl-4 italic truncate">
                             {p.neighborhood || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-primary/60 font-black pl-4 uppercase tracking-[0.05em]">
                            <Home className="h-2.5 w-2.5 opacity-40" />
                            {getType(p.property_type)?.label}
                          </div>
                        </div>
                      </TableCell>

                      {/* Áreas & Divisão */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                             <div className="bg-muted px-1.5 py-0.5 rounded font-black text-muted-foreground uppercase tracking-widest text-[8px] flex items-center justify-center border border-white/5">
                                Total: {p.area_total || 0}m²
                             </div>
                             <div className="bg-primary/5 px-1.5 py-0.5 rounded font-black text-primary uppercase tracking-widest text-[8px] flex items-center justify-center border border-primary/10">
                                Útil: {p.area_useful || 0}m²
                             </div>
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 font-bold italic line-clamp-2 border-l-2 border-primary/20 pl-2">
                             {division || "Divisão não informada"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Prioridade */}
                      <TableCell>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border shadow-sm w-fit uppercase font-black tracking-tighter text-[9px] ${
                          p.priority === 'alta' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          p.priority === 'media' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 
                          'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}>
                          <div className={`rounded-full h-1.5 w-1.5 ${
                            p.priority === 'alta' ? 'bg-destructive animate-pulse' : 
                            p.priority === 'media' ? 'bg-orange-500' : 
                            'bg-emerald-500'
                          }`} />
                          {prio?.label}
                        </div>
                      </TableCell>

                      {/* Gestão */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col gap-1 bg-muted/30 p-1.5 rounded-lg border border-white/5">
                             <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-primary/60 shrink-0" />
                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Geral:</span>
                                <span className="text-[9px] font-bold truncate text-foreground uppercase">{resp || "—"}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0" />
                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Oper.:</span>
                                <span className="text-[9px] font-bold truncate text-foreground uppercase">{respOp || "—"}</span>
                             </div>
                          </div>
                          {owner && (
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 font-black italic border-l border-primary/20 pl-2 leading-none max-w-[140px]">
                              <span className="truncate">{owner}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Financeiro */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="bg-primary/5 px-2 py-1 rounded border border-primary/10 shadow-inner">
                            <span className="text-[8px] font-black text-muted-foreground/60 block uppercase leading-none mb-0.5 tracking-tighter">Total Invest.</span>
                            <span className="text-[12px] font-mono font-black text-foreground">{formatCurrency(inv)}</span>
                          </div>
                          {p.listed_price ? (
                            <div className="px-2 border-r-2 border-emerald-500/30">
                              <span className="text-[7px] font-black text-emerald-600/60 block uppercase leading-none tracking-tighter">Laudo</span>
                              <span className="text-[11px] font-mono font-black text-emerald-600 italic tracking-tighter">{formatCurrency(p.listed_price)}</span>
                            </div>
                          ) : null}
                          {appraisalExpiry && (
                            <div className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              daysUntilExpiry! <= 7 ? "bg-destructive text-white" : daysUntilExpiry! <= 30 ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              <Clock className="h-2.5 w-2.5" />
                              Expira: {format(new Date(appraisalExpiry + "T12:00:00"), "dd/MM/yy")}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Marketing */}
                      <TableCell>
                        <div className="flex justify-center flex-wrap gap-1 max-w-[100px] mx-auto">
                           {(p as any).marketing_smartlink && <Badge variant="outline" className="text-[8px] h-4 px-1 bg-blue-500/10 border-blue-500/20 text-blue-500 font-black" title="Smartlink">SL</Badge>}
                           {(p as any).marketing_paid_traffic && <Badge variant="outline" className="text-[8px] h-4 px-1 bg-purple-500/10 border-purple-500/20 text-purple-500 font-black" title="Tráfego Pago">AD</Badge>}
                           {(p as any).marketing_board && <Badge variant="outline" className="text-[8px] h-4 px-1 bg-amber-500/10 border-amber-500/20 text-amber-500 font-black" title="Placa">PC</Badge>}
                           {(p as any).marketing_banner && <Badge variant="outline" className="text-[8px] h-4 px-1 bg-pink-500/10 border-pink-500/20 text-pink-500 font-black" title="Faixa">FX</Badge>}
                           {(p as any).has_broker && <Badge variant="outline" className="text-[8px] h-4 px-1 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-black" title="Corretor Parceiro">CRT</Badge>}
                        </div>
                      </TableCell>

                      {/* Leilão */}
                      <TableCell className="text-right">
                        {p.auction_date ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-foreground/80 bg-slate-500/5 px-2 py-1 rounded border border-slate-500/10">
                              <Calendar className="h-3 w-3 text-slate-500/40 shrink-0" />
                              {format(new Date(p.auction_date + "T12:00:00"), "dd/MM/yyyy")}
                            </div>
                            {lifeDays !== null && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground pr-2 uppercase tracking-tighter">
                                <Clock className="h-2.5 w-2.5 opacity-40 shrink-0" />
                                {lifeDays} dias
                              </div>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
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
    </>
  );
}
