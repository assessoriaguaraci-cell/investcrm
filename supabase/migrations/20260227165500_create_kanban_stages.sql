
-- Migration to support dynamic Kanban columns
-- Created: 2026-02-27

-- 1. Create kanban_stages table
CREATE TABLE IF NOT EXISTS public.kanban_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_type TEXT NOT NULL, -- 'property' or 'client'
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pipeline TEXT, -- used for clients
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (funnel_type, value)
);

-- 2. Enable RLS
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view kanban stages" 
    ON public.kanban_stages FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage kanban stages" 
    ON public.kanban_stages FOR ALL TO authenticated USING (true); -- Allowing authenticated for now as requested for "+" button ease
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Update existing tables to use TEXT for stage (to allow dynamic addition)
ALTER TABLE public.properties ALTER COLUMN stage TYPE TEXT;
ALTER TABLE public.clients ALTER COLUMN stage TYPE TEXT;

-- 4. Seed initial Property Stages
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order) 
VALUES
  ('property', 'pre_arrematacao', 'Pré-Arrematação', 'bg-[hsl(var(--stage-pre-auction))]', 10),
  ('property', 'itbi_contrato', 'ITBI/Contrato', 'bg-[hsl(var(--stage-itbi-contract))]', 20),
  ('property', 'registro', 'Registro', 'bg-[hsl(var(--stage-registration))]', 30),
  ('property', 'desocupacao', 'Desocupação', 'bg-[hsl(var(--stage-eviction))]', 40),
  ('property', 'reforma', 'Reforma', 'bg-[hsl(var(--stage-renovation))]', 50),
  ('property', 'venda', 'Venda', 'bg-[hsl(var(--stage-sale))]', 60),
  ('property', 'pos_venda', 'Pós-Venda', 'bg-[hsl(var(--stage-post-sale))]', 70),
  ('property', 'ir', 'IR', 'bg-[hsl(var(--stage-tax))]', 80),
  ('property', 'finalizado', 'Finalizado', 'bg-[hsl(var(--stage-finished))]', 90)
ON CONFLICT (funnel_type, value) DO NOTHING;

-- 5. Seed initial Client Stages
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order, pipeline) 
VALUES
  ('client', 'chegada_lead', 'Chegada do Lead', 'bg-[hsl(var(--stage-new-lead))]', 10, 'inicial'),
  ('client', 'em_triagem', 'Em Triagem', 'bg-[hsl(var(--stage-screening))]', 20, 'inicial'),
  ('client', 'interessados', 'Interessados', 'bg-[hsl(var(--stage-interested))]', 30, 'inicial'),
  ('client', 'aguardando_atendimento', 'Aguardando Atendimento', 'bg-[hsl(var(--stage-waiting))]', 40, 'inicial'),
  ('client', 'em_atendimento', 'Em Atendimento', 'bg-[hsl(var(--stage-in-service))]', 50, 'inicial'),
  ('client', 'lead_qualificado', 'Lead Qualificado', 'bg-[hsl(var(--stage-qualified))]', 60, 'inicial'),
  ('client', 'orientacao_financiamento', 'Orientação Financiamento', 'bg-[hsl(var(--stage-interested))]', 110, 'aprovacao_credito'),
  ('client', 'aguardando_documentacao', 'Aguardando Documentação', 'bg-[hsl(var(--stage-waiting))]', 120, 'aprovacao_credito'),
  ('client', 'documentacao_incompleta', 'Documentação Incompleta', 'bg-[hsl(var(--stage-in-service))]', 130, 'aprovacao_credito'),
  ('client', 'aguardando_analise_credito', 'Aguardando Análise de Crédito', 'bg-[hsl(var(--stage-screening))]', 140, 'aprovacao_credito'),
  ('client', 'credito_aprovado', 'Crédito Aprovado', 'bg-[hsl(var(--stage-credit-approved))]', 150, 'aprovacao_credito'),
  ('client', 'cliente_com_pendencia', 'Cliente com Pendência', 'bg-[hsl(var(--stage-waiting))]', 160, 'aprovacao_credito'),
  ('client', 'credito_reprovado', 'Crédito Reprovado', 'bg-[hsl(var(--stage-credit-rejected))]', 170, 'aprovacao_credito'),
  ('client', 'aguardando_prioridade', 'Aguardando Prioridade', 'bg-[hsl(var(--stage-waiting))]', 210, 'financiamento'),
  ('client', 'agendamento_visitas', 'Agendamento de Visitas', 'bg-[hsl(var(--stage-interested))]', 220, 'financiamento'),
  ('client', 'aguardando_ccv', 'Aguardando CCV', 'bg-[hsl(var(--stage-screening))]', 230, 'financiamento'),
  ('client', 'aguardando_reserva', 'Aguardando Reserva', 'bg-[hsl(var(--stage-in-service))]', 240, 'financiamento'),
  ('client', 'aguardando_contrato_caixa', 'Aguardando Contrato Caixa', 'bg-[hsl(var(--stage-financing))]', 250, 'financiamento'),
  ('client', 'em_registro', 'Em Registro', 'bg-[hsl(var(--stage-qualified))]', 260, 'financiamento'),
  ('client', 'venda_concretizada', 'Venda Concretizada', 'bg-[hsl(var(--stage-closed))]', 270, 'financiamento'),
  ('client', 'venda_cancelada', 'Venda Cancelada', 'bg-[hsl(var(--stage-lost))]', 280, 'financiamento'),
  ('client', 'credito_reprovado_pipe', 'Crédito Reprovado', 'bg-[hsl(var(--stage-credit-rejected))]', 310, 'credito_reprovado'),
  ('client', 'documentacao_atualizada', 'Documentação Atualizada', 'bg-[hsl(var(--stage-interested))]', 320, 'credito_reprovado'),
  ('client', 'reaprovacao_credito', 'Reaprovação de Crédito', 'bg-[hsl(var(--stage-screening))]', 330, 'credito_reprovado'),
  ('client', 'credito_aprovado_pipe', 'Crédito Aprovado', 'bg-[hsl(var(--stage-credit-approved))]', 340, 'credito_reprovado')
ON CONFLICT (funnel_type, value) DO NOTHING;
