import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useUpdateProperty, type Property } from "@/hooks/useProperties";
import {
  formatCurrency, totalInvestment, totalMonthlyExpenses, totalRevenue,
  grossRevenue, netRevenue, grossProfit, netProfit,
} from "@/lib/property-constants";
import { toast } from "sonner";

interface Props {
  property: Property;
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value || ""}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="h-8 text-sm"
        placeholder="0"
      />
    </div>
  );
}

export default function PropertyFinancials({ property }: Props) {
  const updateProperty = useUpdateProperty();
  const p = property as any;

  const [revenueOpen, setRevenueOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  // Revenue fields
  const [saleValueRoi, setSaleValueRoi] = useState<number>(p.sale_value_roi || 0);
  const [financingValue, setFinancingValue] = useState<number>(p.financing_value || 0);
  const [downPayment, setDownPayment] = useState<number>(p.down_payment_value || 0);
  const [subsidyValue, setSubsidyValue] = useState<number>(p.subsidy_value || 0);
  const [cashbackValue, setCashbackValue] = useState<number>(p.cashback_value || 0);
  const [incomeTax, setIncomeTax] = useState<number>(p.income_tax_value || 0);
  const [saleDocCost, setSaleDocCost] = useState<number>(p.sale_documentation_cost || 0);

  // Investment fields
  const [purchasePrice, setPurchasePrice] = useState<number>(p.purchase_price || 0);
  const [itbiCost, setItbiCost] = useState<number>(p.itbi_cost || 0);
  const [contractCost, setContractCost] = useState<number>(p.contract_cost || 0);
  const [registrationCost, setRegistrationCost] = useState<number>(p.registration_cost || 0);
  const [evictionCost, setEvictionCost] = useState<number>(p.eviction_cost || 0);
  const [renovationCost, setRenovationCost] = useState<number>(p.renovation_cost || 0);
  const [iptuDebts, setIptuDebts] = useState<number>(p.iptu_debts || 0);
  const [condoDebts, setCondoDebts] = useState<number>(p.condo_debts || 0);
  const [maintenanceCost, setMaintenanceCost] = useState<number>(p.maintenance_cost || 0);

  // Monthly expenses
  const [condoMonthly, setCondoMonthly] = useState<number>(p.condo_monthly || 0);
  const [caretakerMonthly, setCaretakerMonthly] = useState<number>(p.caretaker_monthly || 0);
  const [iptuMonthly, setIptuMonthly] = useState<number>(p.iptu_monthly || 0);
  const [utilitiesMonthly, setUtilitiesMonthly] = useState<number>(p.utilities_monthly || 0);

  // Quota
  const [numShareholders, setNumShareholders] = useState<number>(p.num_shareholders || 1);
  const [guaraciPct, setGuaraciPct] = useState<number>(p.guaraci_share_pct ?? 100);

  // Build an object for calcs
  const current = {
    sale_value_roi: saleValueRoi, financing_value: financingValue, down_payment_value: downPayment,
    subsidy_value: subsidyValue, cashback_value: cashbackValue, income_tax_value: incomeTax,
    sale_documentation_cost: saleDocCost, purchase_price: purchasePrice, itbi_cost: itbiCost,
    contract_cost: contractCost, registration_cost: registrationCost, eviction_cost: evictionCost,
    renovation_cost: renovationCost, iptu_debts: iptuDebts, condo_debts: condoDebts,
    maintenance_cost: maintenanceCost, documentation_cost: p.documentation_cost || 0,
    other_costs: p.other_costs || 0, condo_monthly: condoMonthly, caretaker_monthly: caretakerMonthly,
    iptu_monthly: iptuMonthly, utilities_monthly: utilitiesMonthly,
  };

  const gRevenue = grossRevenue(current);
  const nRevenue = netRevenue(current);
  const gProfit = grossProfit(current);
  const nProfit = netProfit(current);
  const invest = totalInvestment(current);
  const monthly = totalMonthlyExpenses(current);

  const guaraciFactor = (guaraciPct || 0) / 100;

  const save = async () => {
    try {
      await updateProperty.mutateAsync({
        id: property.id,
        sale_value_roi: saleValueRoi, financing_value: financingValue, down_payment_value: downPayment,
        subsidy_value: subsidyValue, cashback_value: cashbackValue, income_tax_value: incomeTax,
        sale_documentation_cost: saleDocCost, purchase_price: purchasePrice, itbi_cost: itbiCost,
        contract_cost: contractCost, registration_cost: registrationCost, eviction_cost: evictionCost,
        renovation_cost: renovationCost, iptu_debts: iptuDebts, condo_debts: condoDebts,
        maintenance_cost: maintenanceCost, condo_monthly: condoMonthly, caretaker_monthly: caretakerMonthly,
        iptu_monthly: iptuMonthly, utilities_monthly: utilitiesMonthly,
        num_shareholders: numShareholders, guaraci_share_pct: guaraciPct,
      } as any);
      toast.success("Dados financeiros salvos!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard label="Fat. Bruto" value={gRevenue} icon={<TrendingUp className="h-4 w-4" />} color="text-emerald-600" />
        <SummaryCard label="Fat. Líquido" value={nRevenue} icon={<TrendingUp className="h-4 w-4" />} color="text-emerald-500" />
        <SummaryCard label="Lucro Bruto" value={gProfit} icon={<DollarSign className="h-4 w-4" />} color={gProfit >= 0 ? "text-emerald-600" : "text-destructive"} />
        <SummaryCard label="Lucro Líquido" value={nProfit} icon={<DollarSign className="h-4 w-4" />} color={nProfit >= 0 ? "text-emerald-600" : "text-destructive"} />
      </div>

      {/* Guaraci share */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> Cotas Guaraci
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Nº Cotistas" value={numShareholders} onChange={setNumShareholders} />
          <NumField label="% Cota Guaraci" value={guaraciPct} onChange={setGuaraciPct} />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Fat. Bruto:</span> <span className="font-semibold">{formatCurrency(gRevenue * guaraciFactor)}</span></div>
          <div><span className="text-muted-foreground">Fat. Líquido:</span> <span className="font-semibold">{formatCurrency(nRevenue * guaraciFactor)}</span></div>
          <div><span className="text-muted-foreground">Lucro Bruto:</span> <span className="font-semibold">{formatCurrency(gProfit * guaraciFactor)}</span></div>
          <div><span className="text-muted-foreground">Lucro Líquido:</span> <span className="font-semibold">{formatCurrency(nProfit * guaraciFactor)}</span></div>
        </div>
      </div>

      {/* Faturamento */}
      <Collapsible open={revenueOpen} onOpenChange={setRevenueOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Faturamento
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-600">{formatCurrency(gRevenue)}</span>
            {revenueOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2 px-1">
          <NumField label="Valor de Venda / ROI" value={saleValueRoi} onChange={setSaleValueRoi} />
          <NumField label="Valor de Financiamento" value={financingValue} onChange={setFinancingValue} />
          <NumField label="Valor de Entrada" value={downPayment} onChange={setDownPayment} />
          <NumField label="Valor de Subsídio" value={subsidyValue} onChange={setSubsidyValue} />
          <NumField label="Valor de Cashback" value={cashbackValue} onChange={setCashbackValue} />
          <NumField label="Valor de IR (Imposto de Renda)" value={incomeTax} onChange={setIncomeTax} />
          <NumField label="Documentação de Venda" value={saleDocCost} onChange={setSaleDocCost} />
        </CollapsibleContent>
      </Collapsible>

      {/* Investimento */}
      <Collapsible open={investOpen} onOpenChange={setInvestOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Investimento
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-destructive">{formatCurrency(invest)}</span>
            {investOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2 px-1">
          <NumField label="Aquisição" value={purchasePrice} onChange={setPurchasePrice} />
          <NumField label="ITBI" value={itbiCost} onChange={setItbiCost} />
          <NumField label="Contrato" value={contractCost} onChange={setContractCost} />
          <NumField label="Registro" value={registrationCost} onChange={setRegistrationCost} />
          <NumField label="Desocupação" value={evictionCost} onChange={setEvictionCost} />
          <NumField label="Reforma" value={renovationCost} onChange={setRenovationCost} />
          <NumField label="Débitos de IPTU" value={iptuDebts} onChange={setIptuDebts} />
          <NumField label="Débitos de Condomínio" value={condoDebts} onChange={setCondoDebts} />
          <NumField label="Manutenção" value={maintenanceCost} onChange={setMaintenanceCost} />

          {/* Monthly expenses nested */}
          <Collapsible open={monthlyOpen} onOpenChange={setMonthlyOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full rounded-md border p-2 hover:bg-muted/50 transition-colors mt-2">
              <span className="text-xs font-semibold">Despesas Mensais</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{formatCurrency(monthly)}/mês</span>
                {monthlyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2 px-1">
              <NumField label="Condomínio" value={condoMonthly} onChange={setCondoMonthly} />
              <NumField label="Cuidador / Vizinho" value={caretakerMonthly} onChange={setCaretakerMonthly} />
              <NumField label="IPTU" value={iptuMonthly} onChange={setIptuMonthly} />
              <NumField label="Água / Luz" value={utilitiesMonthly} onChange={setUtilitiesMonthly} />
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>

      <Button onClick={save} disabled={updateProperty.isPending} className="w-full">
        {updateProperty.isPending ? "Salvando..." : "Salvar Financeiro"}
      </Button>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
