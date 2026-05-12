export interface KanbanPhase {
  name: string;
  color: string;
  stages: string[];
}

export const CLIENT_PHASES: KanbanPhase[] = [
  {
    name: "Fase Inicial",
    color: "bg-blue-600",
    stages: ["chegada_lead", "em_triagem", "interessados", "aguardando_atendimento", "em_atendimento", "lead_qualificado", "orientacao_financiamento"]
  },
  {
    name: "Fase de Aprovação",
    color: "bg-purple-600",
    stages: ["aguardando_documentacao", "aguardando_documentos", "documentacao_incompleta", "documentos_incompletos", "aguardando_analise_credito", "analise_credito", "analise_de_credito", "credito_aprovado", "cliente_com_pendencia"]
  },
  {
    name: "Fase de Vendas",
    color: "bg-orange-600",
    stages: ["aguardando_ccv", "agendamento_visitas", "agendamento_de_visitas", "aguardando_reserva", "aguardando_contrato_caixa", "contrato_caixa", "em_registro", "venda_concretizada", "venda_cancelada"]
  },
  {
    name: "Fase de Reaprovação",
    color: "bg-red-600",
    stages: ["credito_reprovado", "credito_reprovado_pipe", "documentacao_atualizada", "reaprovacao_credito", "reaprovacao_de_credito", "credito_aprovado_pipe"]
  }
];

export const getPhaseForStage = (stageValue: string) => {
  return CLIENT_PHASES.find(p => p.stages.includes(stageValue));
};
