import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

export interface ChecklistTemplate {
  stage: PropertyStage;
  group: string;
  task: string;
  sort: number;
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // ── PRÉ-ARREMATAÇÃO ──────────────────────────────────────────
  // Grupo 1: Entrada de Oportunidade
  { stage: "pre_arrematacao", group: "Entrada de Oportunidade", task: "Proposta recebida pelo e-mail", sort: 1 },
  { stage: "pre_arrematacao", group: "Entrada de Oportunidade", task: "Grupo de análise criado", sort: 2 },
  { stage: "pre_arrematacao", group: "Entrada de Oportunidade", task: "Validação de endereço", sort: 3 },
  { stage: "pre_arrematacao", group: "Entrada de Oportunidade", task: "Responsável atribuído", sort: 4 },
  // Grupo 2: Documentos
  { stage: "pre_arrematacao", group: "Documentos", task: "Matrícula", sort: 5 },
  { stage: "pre_arrematacao", group: "Documentos", task: "Edital e laudo", sort: 6 },
  { stage: "pre_arrematacao", group: "Documentos", task: "Ações judiciais", sort: 7 },
  // Grupo 3: Débitos
  { stage: "pre_arrematacao", group: "Débitos", task: "IPTU", sort: 8 },
  { stage: "pre_arrematacao", group: "Débitos", task: "ITBI", sort: 9 },
  { stage: "pre_arrematacao", group: "Débitos", task: "Condomínio", sort: 10 },
  // Grupo 4: Diligência
  { stage: "pre_arrematacao", group: "Diligência", task: "Confirmar ocupação", sort: 11 },
  { stage: "pre_arrematacao", group: "Diligência", task: "Dados do ocupante", sort: 12 },
  { stage: "pre_arrematacao", group: "Diligência", task: "Fotos externas do imóvel", sort: 13 },
  { stage: "pre_arrematacao", group: "Diligência", task: "Fotos dos arredores do imóvel", sort: 14 },
  { stage: "pre_arrematacao", group: "Diligência", task: "Análise da região", sort: 15 },

  // ── DOCUMENTAÇÃO ──────────────────────────────────────────────
  // Grupo 1: Organização Inicial
  { stage: "documentacao", group: "Organização Inicial", task: "Pasta criada no Drive", sort: 1 },
  { stage: "documentacao", group: "Organização Inicial", task: "Matrícula, edital, laudo e contratos salvos", sort: 2 },
  { stage: "documentacao", group: "Organização Inicial", task: "Gastos lançados nas planilhas e Splitwise", sort: 3 },
  // Grupo 2: Controle Documental
  { stage: "documentacao", group: "Controle Documental", task: "ITBI pago", sort: 4 },
  { stage: "documentacao", group: "Controle Documental", task: "IPTU pago", sort: 5 },
  { stage: "documentacao", group: "Controle Documental", task: "Matrícula em nome do novo proprietário", sort: 6 },
  { stage: "documentacao", group: "Controle Documental", task: "Registro concluído", sort: 7 },
  { stage: "documentacao", group: "Controle Documental", task: "Listar pendências", sort: 8 },

  // ── DESOCUPAÇÃO ───────────────────────────────────────────────
  // Grupo 1: Diagnóstico
  { stage: "desocupacao", group: "Diagnóstico", task: "Imóvel ocupado ou vazio", sort: 1 },
  { stage: "desocupacao", group: "Diagnóstico", task: "Perfil do ocupante identificado", sort: 2 },
  { stage: "desocupacao", group: "Diagnóstico", task: "Histórico de pagamento conhecido", sort: 3 },
  { stage: "desocupacao", group: "Diagnóstico", task: "Risco jurídico avaliado", sort: 4 },
  // Grupo 2: Estratégia Definida
  { stage: "desocupacao", group: "Estratégia Definida", task: "Tentativa de acordo", sort: 5 },
  { stage: "desocupacao", group: "Estratégia Definida", task: "Proposta formal enviada", sort: 6 },
  { stage: "desocupacao", group: "Estratégia Definida", task: "Valor de eventual indenização definido", sort: 7 },
  { stage: "desocupacao", group: "Estratégia Definida", task: "Decisão jurídica registrada", sort: 8 },
  // Grupo 3: Execução
  { stage: "desocupacao", group: "Execução", task: "CCV assinado (venda para morador)", sort: 9 },
  { stage: "desocupacao", group: "Execução", task: "Contrato de acordo (desocupação amigável)", sort: 10 },
  { stage: "desocupacao", group: "Execução", task: "Prazo de saída definido", sort: 11 },
  { stage: "desocupacao", group: "Execução", task: "Chaves entregues", sort: 12 },
  { stage: "desocupacao", group: "Execução", task: "Fotos pós-desocupação", sort: 13 },

  // ── REFORMA ───────────────────────────────────────────────────
  // Grupo 1: Planejamento e Orçamento
  { stage: "reforma", group: "Planejamento e Orçamento", task: "Registro do que será e não será feito", sort: 1 },
  { stage: "reforma", group: "Planejamento e Orçamento", task: "3 orçamentos de mão de obra", sort: 2 },
  { stage: "reforma", group: "Planejamento e Orçamento", task: "3 orçamentos de material inicial", sort: 3 },
  { stage: "reforma", group: "Planejamento e Orçamento", task: "Custo total aprovado", sort: 4 },
  { stage: "reforma", group: "Planejamento e Orçamento", task: "Planilha de materiais/custo definida", sort: 5 },
  // Grupo 2: Contratos
  { stage: "reforma", group: "Contratos", task: "Prazo definido", sort: 6 },
  { stage: "reforma", group: "Contratos", task: "Forma de pagamento por andamento da obra", sort: 7 },
  { stage: "reforma", group: "Contratos", task: "Contrato assinado com o empreiteiro", sort: 8 },
  { stage: "reforma", group: "Contratos", task: "Fotos semanais recebidas", sort: 9 },
  { stage: "reforma", group: "Contratos", task: "Pagamento total feito", sort: 10 },
  // Grupo 3: Finalização
  { stage: "reforma", group: "Finalização", task: "Fotos pós-reforma", sort: 11 },
  { stage: "reforma", group: "Finalização", task: "Pedir engenharia", sort: 12 },
  { stage: "reforma", group: "Finalização", task: "Engenharia marcada", sort: 13 },
  { stage: "reforma", group: "Finalização", task: "Engenharia feita", sort: 14 },
  { stage: "reforma", group: "Finalização", task: "Laudo válido", sort: 15 },
  { stage: "reforma", group: "Finalização", task: "Custos finais lançados", sort: 16 },
  { stage: "reforma", group: "Finalização", task: "Imóvel liberado para venda", sort: 17 },

  // ── VENDA ─────────────────────────────────────────────────────
  // Grupo 1: Preparação
  { stage: "venda", group: "Preparação", task: "Fotos do imóvel", sort: 1 },
  { stage: "venda", group: "Preparação", task: "Descrição dos atributos do imóvel", sort: 2 },
  { stage: "venda", group: "Preparação", task: "Condições definidas", sort: 3 },
  // Grupo 2: Divulgação
  { stage: "venda", group: "Divulgação", task: "Anúncio criado", sort: 4 },
  { stage: "venda", group: "Divulgação", task: "Anúncio ativo", sort: 5 },
  { stage: "venda", group: "Divulgação", task: "Post no Instagram", sort: 6 },
  { stage: "venda", group: "Divulgação", task: "Imóvel cadastrado no fluxo do CRM", sort: 7 },
  // Grupo 3: Negociação
  { stage: "venda", group: "Negociação", task: "Visita", sort: 8 },
  { stage: "venda", group: "Negociação", task: "Cliente aprovado", sort: 9 },
  { stage: "venda", group: "Negociação", task: "CCV assinado", sort: 10 },
  { stage: "venda", group: "Negociação", task: "Cliente aguardando reserva", sort: 11 },
  { stage: "venda", group: "Negociação", task: "Contrato assinado", sort: 12 },

  // ── PÓS-VENDA ────────────────────────────────────────────────
  // Grupo 1: Finalização da Venda
  { stage: "pos_venda", group: "Finalização da Venda", task: "Valor recebido", sort: 1 },
  { stage: "pos_venda", group: "Finalização da Venda", task: "Fotos do cliente com as chaves", sort: 2 },
  { stage: "pos_venda", group: "Finalização da Venda", task: "Post depoimento no Instagram", sort: 3 },
  { stage: "pos_venda", group: "Finalização da Venda", task: "Registro concluído", sort: 4 },
  { stage: "pos_venda", group: "Finalização da Venda", task: "Conferir gastos lançados em Splitwise e SmartApp", sort: 5 },
];

/** Returns the next stage in the pipeline, or null if at the end. */
export function getNextStage(current: PropertyStage): PropertyStage | null {
  const order: PropertyStage[] = [
    "pre_arrematacao", "documentacao", "desocupacao", "reforma",
    "venda", "pos_venda", "ir", "finalizado",
  ];
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

/** Get all template items for a given stage */
export function getTemplatesForStage(stage: PropertyStage): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter(t => t.stage === stage);
}
