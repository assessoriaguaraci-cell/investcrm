import type { Database } from "@/integrations/supabase/types";

type ClientPipeline = Database["public"]["Enums"]["client_pipeline"];
type ClientStage = Database["public"]["Enums"]["client_stage"];
type LeadTemperature = Database["public"]["Enums"]["lead_temperature"];
type WorkRegime = Database["public"]["Enums"]["work_regime"];

export const CLIENT_PIPELINES: { value: ClientPipeline; label: string }[] = [
  { value: "inicial", label: "Inicial" },
  { value: "aprovacao_credito", label: "Aprovação de Crédito" },
  { value: "financiamento", label: "Financiamento" },
  { value: "credito_reprovado", label: "Crédito Reprovado" },
];

export interface StageConfig {
  value: ClientStage;
  label: string;
  color: string;
  pipeline: ClientPipeline;
}

export const CLIENT_STAGES: StageConfig[] = [
  // Pipeline: Inicial
  { value: "chegada_lead", label: "Chegada do Lead", color: "bg-[hsl(var(--stage-new-lead))]", pipeline: "inicial" },
  { value: "em_triagem", label: "Em Triagem", color: "bg-[hsl(var(--stage-screening))]", pipeline: "inicial" },
  { value: "interessados", label: "Interessados", color: "bg-[hsl(var(--stage-interested))]", pipeline: "inicial" },
  { value: "aguardando_atendimento", label: "Aguardando Atendimento", color: "bg-[hsl(var(--stage-waiting))]", pipeline: "inicial" },
  { value: "em_atendimento", label: "Em Atendimento", color: "bg-[hsl(var(--stage-in-service))]", pipeline: "inicial" },
  { value: "lead_qualificado", label: "Lead Qualificado", color: "bg-[hsl(var(--stage-qualified))]", pipeline: "inicial" },

  // Pipeline: Aprovação de Crédito
  { value: "orientacao_financiamento", label: "Orientação Financiamento", color: "bg-[hsl(var(--stage-interested))]", pipeline: "aprovacao_credito" },
  { value: "aguardando_documentacao", label: "Aguardando Documentação", color: "bg-[hsl(var(--stage-waiting))]", pipeline: "aprovacao_credito" },
  { value: "documentacao_incompleta", label: "Documentação Incompleta", color: "bg-[hsl(var(--stage-in-service))]", pipeline: "aprovacao_credito" },
  { value: "aguardando_analise_credito", label: "Aguardando Análise de Crédito", color: "bg-[hsl(var(--stage-screening))]", pipeline: "aprovacao_credito" },
  { value: "credito_aprovado", label: "Crédito Aprovado", color: "bg-[hsl(var(--stage-credit-approved))]", pipeline: "aprovacao_credito" },
  { value: "cliente_com_pendencia", label: "Cliente com Pendência", color: "bg-[hsl(var(--stage-waiting))]", pipeline: "aprovacao_credito" },
  { value: "credito_reprovado", label: "Crédito Reprovado", color: "bg-[hsl(var(--stage-credit-rejected))]", pipeline: "aprovacao_credito" },

  // Pipeline: Financiamento
  { value: "aguardando_prioridade", label: "Aguardando Prioridade", color: "bg-[hsl(var(--stage-waiting))]", pipeline: "financiamento" },
  { value: "agendamento_visitas", label: "Agendamento de Visitas", color: "bg-[hsl(var(--stage-interested))]", pipeline: "financiamento" },
  { value: "aguardando_ccv", label: "Aguardando CCV", color: "bg-[hsl(var(--stage-screening))]", pipeline: "financiamento" },
  { value: "aguardando_reserva", label: "Aguardando Reserva", color: "bg-[hsl(var(--stage-in-service))]", pipeline: "financiamento" },
  { value: "aguardando_contrato_caixa", label: "Aguardando Contrato Caixa", color: "bg-[hsl(var(--stage-financing))]", pipeline: "financiamento" },
  { value: "em_registro", label: "Em Registro", color: "bg-[hsl(var(--stage-qualified))]", pipeline: "financiamento" },
  { value: "venda_concretizada", label: "Venda Concretizada", color: "bg-[hsl(var(--stage-closed))]", pipeline: "financiamento" },
  { value: "venda_cancelada", label: "Venda Cancelada", color: "bg-[hsl(var(--stage-lost))]", pipeline: "financiamento" },

  // Pipeline: Crédito Reprovado
  { value: "credito_reprovado_pipe", label: "Crédito Reprovado", color: "bg-[hsl(var(--stage-credit-rejected))]", pipeline: "credito_reprovado" },
  { value: "documentacao_atualizada", label: "Documentação Atualizada", color: "bg-[hsl(var(--stage-interested))]", pipeline: "credito_reprovado" },
  { value: "reaprovacao_credito", label: "Reaprovação de Crédito", color: "bg-[hsl(var(--stage-screening))]", pipeline: "credito_reprovado" },
  { value: "credito_aprovado_pipe", label: "Crédito Aprovado", color: "bg-[hsl(var(--stage-credit-approved))]", pipeline: "credito_reprovado" },
];

export const TEMPERATURE_OPTIONS: { value: LeadTemperature; label: string; color: string }[] = [
  { value: "frio", label: "Frio", color: "bg-[hsl(var(--temp-cold))]" },
  { value: "morno", label: "Morno", color: "bg-[hsl(var(--temp-warm))]" },
  { value: "quente", label: "Quente", color: "bg-[hsl(var(--temp-hot))]" },
];

export const WORK_REGIMES: { value: WorkRegime; label: string }[] = [
  { value: "clt", label: "CLT" },
  { value: "autonomo", label: "Autônomo" },
  { value: "funcionario_publico", label: "Funcionário Público" },
  { value: "aposentado", label: "Aposentado" },
  { value: "bolsa_familia", label: "Bolsa Família" },
  { value: "outro", label: "Outro" },
];

export const MARITAL_STATUSES = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União Estável",
];

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}
