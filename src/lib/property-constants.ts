import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];
type PropertyType = Database["public"]["Enums"]["property_type"];
type OccupationStatus = Database["public"]["Enums"]["occupation_status"];
type PriorityLevel = Database["public"]["Enums"]["priority_level"];

export const PROPERTY_STAGES: { value: string; label: string; color: string }[] = [
  { value: "pre_arrematacao", label: "Pré-Arrematação", color: "bg-[hsl(var(--stage-pre-auction))]" },
  { value: "documentacao", label: "Documentação", color: "bg-[hsl(var(--stage-itbi-contract))]" },
  { value: "itbi_contrato", label: "ITBI/Contrato", color: "bg-[hsl(var(--stage-itbi-contract))]" },
  { value: "registro", label: "Registro", color: "bg-[hsl(var(--stage-registration))]" },
  { value: "desocupacao", label: "Desocupação", color: "bg-[hsl(var(--stage-eviction))]" },
  { value: "reforma", label: "Reforma", color: "bg-[hsl(var(--stage-renovation))]" },
  { value: "venda", label: "Venda", color: "bg-[hsl(var(--stage-sale))]" },
  { value: "pos_venda", label: "Pós-Venda", color: "bg-[hsl(var(--stage-post-sale))]" },
  { value: "ir", label: "IR", color: "bg-[hsl(var(--stage-tax))]" },
  { value: "finalizado", label: "Finalizado", color: "bg-[hsl(var(--stage-finished))]" },
  { value: "cancelados", label: "Cancelados", color: "bg-red-500" },
];

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "casa", label: "Casa" },
  { value: "casa_condominio", label: "Casa de Condomínio" },
  { value: "apartamento", label: "Apartamento" },
  { value: "apartamento_condominio", label: "Apto Condomínio" },
  { value: "terreno", label: "Terreno" },
  { value: "comercial", label: "Comercial" },
];

export const OCCUPATION_STATUSES: { value: OccupationStatus; label: string }[] = [
  { value: "desocupado", label: "Desocupado" },
  { value: "ocupado", label: "Ocupado" },
  { value: "imissao_na_posse", label: "Imissão na Posse" },
  { value: "venda_para_ocupante", label: "Venda p/ Ocupante" },
];

export const PRIORITY_LEVELS: { value: PriorityLevel; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL", 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value);
}

export function totalInvestment(p: {
  purchase_price?: number | null;
  documentation_cost?: number | null;
  itbi_cost?: number | null;
  registration_cost?: number | null;
  eviction_cost?: number | null;
  renovation_cost?: number | null;
  other_costs?: number | null;
  contract_cost?: number | null;
  iptu_debts?: number | null;
  condo_debts?: number | null;
  maintenance_cost?: number | null;
}): number {
  return (p.purchase_price || 0) + (p.documentation_cost || 0) + (p.itbi_cost || 0) +
    (p.registration_cost || 0) + (p.eviction_cost || 0) + (p.renovation_cost || 0) +
    (p.other_costs || 0) + (p.contract_cost || 0) + (p.iptu_debts || 0) +
    (p.condo_debts || 0) + (p.maintenance_cost || 0);
}

export function totalMonthlyExpenses(p: {
  condo_monthly?: number | null;
  caretaker_monthly?: number | null;
  iptu_monthly?: number | null;
  utilities_monthly?: number | null;
}): number {
  return (p.condo_monthly || 0) + (p.caretaker_monthly || 0) + (p.iptu_monthly || 0) + (p.utilities_monthly || 0);
}

/** Entradas efetivas = Financiamento + Subsídio + Entrada */
export function totalRevenue(p: {
  financing_value?: number | null;
  down_payment_value?: number | null;
  subsidy_value?: number | null;
}): number {
  return (p.financing_value || 0) + (p.down_payment_value || 0) + (p.subsidy_value || 0);
}

/** Deduções = Cashback + IR + Doc de Venda */
export function totalDeductions(p: {
  cashback_value?: number | null;
  income_tax_value?: number | null;
  sale_documentation_cost?: number | null;
}): number {
  return (p.cashback_value || 0) + (p.income_tax_value || 0) + (p.sale_documentation_cost || 0);
}

/** Faturamento Bruto = Financiamento + Subsídio + Entrada */
export function grossRevenue(p: any): number {
  return totalRevenue(p);
}

/** Faturamento Líquido = Faturamento Bruto - Deduções */
export function netRevenue(p: any): number {
  return grossRevenue(p) - totalDeductions(p);
}

/** Lucro Bruto = Faturamento Bruto - Investimento Total */
export function grossProfit(p: any): number {
  return grossRevenue(p) - totalInvestment(p);
}

/** Lucro Líquido = Faturamento Líquido - Investimento Total */
export function netProfit(p: any): number {
  return netRevenue(p) - totalInvestment(p);
}
