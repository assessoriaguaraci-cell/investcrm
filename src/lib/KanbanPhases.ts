export interface KanbanPhase {
  name: string;
  color: string;
  stages: string[];
}

export const CLIENT_PHASES: KanbanPhase[] = [
  {
    name: "Fase Inicial",
    color: "bg-blue-600",
    stages: ["chegada_lead", "em_atendimento", "lead_qualificado"]
  },
  {
    name: "Fase de Aprovação",
    color: "bg-purple-600",
    stages: ["aguardando_documentos", "documentos_incompletos", "analise_de_credito", "credito_aprovado"]
  },
  {
    name: "Fase de Vendas",
    color: "bg-orange-600",
    stages: ["aguardando_ccv", "agendamento_de_visitas", "aguardando_reserva", "contrato_caixa", "venda_concretizada", "venda_cancelada"]
  },
  {
    name: "Fase de Reaprovação",
    color: "bg-red-600",
    stages: ["credito_reprovado", "documentacao_atualizada", "reaprovacoa_de_credito"]
  }
];

export const getPhaseForStage = (stageValue: string) => {
  return CLIENT_PHASES.find(p => p.stages.includes(stageValue));
};
