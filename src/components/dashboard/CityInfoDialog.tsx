import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useUpsertCityInfo, type CityInfo } from "@/hooks/useCityInfo";
import { formatCurrency, totalInvestment, PROPERTY_STAGES } from "@/lib/property-constants";
import type { Property } from "@/hooks/useProperties";
import { toast } from "sonner";

const ACTIVE_FINANCIAL_STAGES = ["itbi_contrato", "registro", "desocupacao", "reforma", "venda", "pos_venda"];

function guaraciFactor(p: any): number {
  return ((p.guaraci_share_pct ?? 100) || 0) / 100;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: string;
  city: string;
  cityInfo: CityInfo | null;
  properties: Property[];
}

export default function CityInfoDialog({ open, onOpenChange, state, city, cityInfo, properties }: Props) {
  const upsert = useUpsertCityInfo();

  const [bestNeighborhoods, setBestNeighborhoods] = useState("");
  const [worstNeighborhoods, setWorstNeighborhoods] = useState("");
  const [considerations, setConsiderations] = useState("");
  const [dangerousRegions, setDangerousRegions] = useState("");
  const [whereSold, setWhereSold] = useState("");

  useEffect(() => {
    if (open) {
      setBestNeighborhoods(cityInfo?.best_neighborhoods || "");
      setWorstNeighborhoods(cityInfo?.worst_neighborhoods || "");
      setConsiderations(cityInfo?.considerations || "");
      setDangerousRegions(cityInfo?.dangerous_regions || "");
      setWhereSold(cityInfo?.where_sold || "");
    }
  }, [open, cityInfo]);

  const cityProps = properties.filter(p => p.state === state && p.city?.toLowerCase() === city.toLowerCase());
  const activeProps = cityProps.filter(p => ACTIVE_FINANCIAL_STAGES.includes(p.stage));
  const finalizados = cityProps.filter(p => p.stage === "finalizado");

  const capitalInvested = activeProps.reduce((s, p) => s + totalInvestment(p) * guaraciFactor(p), 0);
  const returnRealized = finalizados.reduce((s, p) => {
    const rev = (p.financing_value || 0) + (p.down_payment_value || 0) + (p.subsidy_value || 0);
    const inv = totalInvestment(p);
    return s + (rev - inv) * guaraciFactor(p);
  }, 0);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        state,
        city,
        best_neighborhoods: bestNeighborhoods || null,
        worst_neighborhoods: worstNeighborhoods || null,
        considerations: considerations || null,
        dangerous_regions: dangerousRegions || null,
        where_sold: whereSold || null,
      });
      toast.success("Informações da cidade salvas!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {city} — {state}
            <Badge variant="secondary">{cityProps.length} imóveis</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Capital Investido (Ativos)</p>
            <p className="text-sm font-bold">{formatCurrency(capitalInvested)}</p>
            <p className="text-[10px] text-muted-foreground">{activeProps.length} imóveis</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Retorno Realizado</p>
            <p className="text-sm font-bold">{formatCurrency(returnRealized)}</p>
            <p className="text-[10px] text-muted-foreground">{finalizados.length} finalizados</p>
          </div>
        </div>

        {/* Properties by stage */}
        {cityProps.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Imóveis por Etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_STAGES.filter(s => cityProps.some(p => p.stage === s.value)).map(s => {
                const count = cityProps.filter(p => p.stage === s.value).length;
                return (
                  <Badge key={s.value} variant="outline" className="text-xs gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Melhores Bairros</Label>
            <Textarea value={bestNeighborhoods} onChange={e => setBestNeighborhoods(e.target.value)} placeholder="Ex: Centro, Jardim das Flores..." rows={2} />
          </div>
          <div>
            <Label className="text-xs">Piores Bairros</Label>
            <Textarea value={worstNeighborhoods} onChange={e => setWorstNeighborhoods(e.target.value)} placeholder="Ex: Vila Nova..." rows={2} />
          </div>
          <div>
            <Label className="text-xs">Regiões Perigosas</Label>
            <Textarea value={dangerousRegions} onChange={e => setDangerousRegions(e.target.value)} placeholder="Áreas com alto índice..." rows={2} />
          </div>
          <div>
            <Label className="text-xs">Onde Já Vendemos</Label>
            <Textarea value={whereSold} onChange={e => setWhereSold(e.target.value)} placeholder="Bairros/regiões onde temos vendas concluídas..." rows={2} />
          </div>
          <div>
            <Label className="text-xs">Considerações e Particularidades</Label>
            <Textarea value={considerations} onChange={e => setConsiderations(e.target.value)} placeholder="Informações importantes sobre a cidade..." rows={3} />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
