import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];
type PropertyType = Database["public"]["Enums"]["property_type"];
type OccupationStatus = Database["public"]["Enums"]["occupation_status"];
type PriorityLevel = Database["public"]["Enums"]["priority_level"];

export const PROPERTY_STAGES: { value: PropertyStage; label: string; color: string }[] = [
  { value: "pre_arrematacao", label: "Pré-Arrematação", color: "bg-[hsl(var(--stage-pre-auction))]" },
  { value: "documentacao", label: "Documentação", color: "bg-[hsl(var(--stage-documentation))]" },
  { value: "desocupacao", label: "Desocupação", color: "bg-[hsl(var(--stage-eviction))]" },
  { value: "reforma", label: "Reforma", color: "bg-[hsl(var(--stage-renovation))]" },
  { value: "venda", label: "Venda", color: "bg-[hsl(var(--stage-sale))]" },
  { value: "pos_venda", label: "Pós-Venda", color: "bg-[hsl(var(--stage-post-sale))]" },
  { value: "ir", label: "IR", color: "bg-[hsl(var(--stage-tax))]" },
  { value: "finalizado", label: "Finalizado", color: "bg-[hsl(var(--stage-finished))]" },
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
  if (value == null) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function totalInvestment(p: {
  purchase_price?: number | null;
  documentation_cost?: number | null;
  itbi_cost?: number | null;
  registration_cost?: number | null;
  eviction_cost?: number | null;
  renovation_cost?: number | null;
  other_costs?: number | null;
}): number {
  return (p.purchase_price || 0) + (p.documentation_cost || 0) + (p.itbi_cost || 0) +
    (p.registration_cost || 0) + (p.eviction_cost || 0) + (p.renovation_cost || 0) + (p.other_costs || 0);
}
