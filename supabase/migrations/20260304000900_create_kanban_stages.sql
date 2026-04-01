-- Create kanban stages table to store custom columns and order
CREATE TABLE IF NOT EXISTS public.kanban_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_type TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    pipeline TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set RLS policies
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow all users to read kanban_stages') THEN
    CREATE POLICY "Allow all users to read kanban_stages" ON public.kanban_stages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow authenticated users to insert kanban_stages') THEN
    CREATE POLICY "Allow authenticated users to insert kanban_stages" ON public.kanban_stages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow authenticated users to update kanban_stages') THEN
    CREATE POLICY "Allow authenticated users to update kanban_stages" ON public.kanban_stages FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow authenticated users to delete kanban_stages') THEN
    CREATE POLICY "Allow authenticated users to delete kanban_stages" ON public.kanban_stages FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Populate default property stages if empty
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order)
SELECT 'property', p.value, p.label, p.color, p.sort_order 
FROM (VALUES 
    ('chegada_lead', 'Chegada Leads', 'bg-blue-500', 10),
    ('visita_marcada', 'Visita Marcada', 'bg-purple-500', 20),
    ('visita_feita', 'Visita Feita - Com Proposta', 'bg-orange-500', 30),
    ('analise_credito', 'Análise Crédito (Pendente)', 'bg-yellow-500', 40),
    ('credito_aprovado', 'Crédito Aprovado', 'bg-green-500', 50),
    ('assinatura_contrato', 'Em Assinatura', 'bg-teal-500', 60),
    ('venda_efetuada', 'Venda Efetuada', 'bg-blue-600', 70)
) AS p(value, label, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE funnel_type = 'property');

-- Populate default client stages if empty
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order, pipeline)
SELECT 'client', c.value, c.label, c.color, c.sort_order, c.pipeline 
FROM (VALUES 
    ('chegada_lead', 'Chegada Leads', 'bg-blue-500', 10, 'comprador'),
    ('visitas', 'Visitas', 'bg-purple-500', 20, 'comprador'),
    ('proposta_enviada', 'Proposta Enviada', 'bg-orange-500', 30, 'comprador'),
    ('analise_credito', 'Análise de Pagamento/Crédito', 'bg-yellow-500', 40, 'comprador'),
    ('fechamento', 'Processo Fechamento', 'bg-green-500', 50, 'comprador'),
    ('assinatura', 'Ag. Assinatura/Emissão', 'bg-teal-500', 60, 'comprador'),
    ('venda_finalizada', 'VENDA FINALIZADA', 'bg-blue-600', 70, 'comprador'),
    ('venda_cancelada', 'PERDIDO (VENDA CANCELADA)', 'bg-red-600', 80, 'comprador'),
    ('credito_reprovado', 'PERDIDO (CRÉDITO REPROVADO)', 'bg-red-500', 90, 'comprador'),
    
    ('chegada_lead_pipe', 'Chegada Lead/Pipe', 'bg-blue-500', 10, 'investidor'),
    ('em_conversa', 'Em Conversa/Apresentação', 'bg-purple-500', 20, 'investidor'),
    ('imovel_indicado', 'Imóvel Indicado (Aguardando Retorno)', 'bg-orange-500', 30, 'investidor'),
    ('proposta_feita', 'Proposta Realizada (Negociação)', 'bg-yellow-500', 40, 'investidor'),
    ('fechamento_pipe', 'Fechamento do Acordo', 'bg-green-500', 50, 'investidor'),
    ('assinatura_contrato', 'Assinatura do Contrato', 'bg-teal-500', 60, 'investidor'),
    ('finalizado_com_sucesso', 'VENDA ESTRUTURADA (FINALIZADA)', 'bg-blue-600', 70, 'investidor'),
    ('venda_cancelada_pipe', 'PERDIDO (NEGÓCIO CANCELADO)', 'bg-red-600', 80, 'investidor'),
    ('credito_reprovado_pipe', 'PERDIDO (MÉTRICA/TESE DE INVESTIMENTO NÃO ALCANÇADA)', 'bg-red-500', 90, 'investidor')
) AS c(value, label, color, sort_order, pipeline)
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE funnel_type = 'client');

-- Notify postgrest to reload the schema
NOTIFY pgrst, 'reload schema';
