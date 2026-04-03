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

import { CurrencyInput } from "@/components/ui/currency-input";

function NumField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <CurrencyInput
        value={value}
        onChange={onChange}
        className="h-8 text-sm"
        placeholder="R$ 0,00"
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

      {/* Monthly expenses */}
      <div className="rounded-lg border bg-muted/30 p-3 mt-4 space-y-3">
        <h3 className="text-sm font-semibold">Despesas Mensais</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Condomínio" value={condoMonthly} onChange={setCondoMonthly} />
          <NumField label="Cuidador / Vizinho" value={caretakerMonthly} onChange={setCaretakerMonthly} />
          <NumField label="IPTU" value={iptuMonthly} onChange={setIptuMonthly} />
          <NumField label="Água / Luz" value={utilitiesMonthly} onChange={setUtilitiesMonthly} />
        </div>
      </div>

      <Button onClick={save} disabled={updateProperty.isPending} className="w-full mt-4">
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
