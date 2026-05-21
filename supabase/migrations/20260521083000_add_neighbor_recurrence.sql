-- Adiciona coluna is_recurring na tabela city_contacts
ALTER TABLE public.city_contacts
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Remove restrição de chave única para contact_id em atividades (necessário para múltiplos lembretes recorrentes)
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS uq_activities_contact_id;

-- Atualiza a função de trigger
CREATE OR REPLACE FUNCTION public.handle_vizinho_reminder_fn()
RETURNS TRIGGER AS $$
DECLARE
    prop_code TEXT;
    prop_city TEXT;
    resp_user_id UUID;
    activity_desc TEXT;
    final_resp_user UUID;
BEGIN
    -- Remove todos os lembretes PENDENTES antigos associados a este contato parceiro
    DELETE FROM public.activities 
    WHERE contact_id = NEW.id 
      AND status = 'pendente';

    -- Se o tipo de contato for VIZINHO e tiver data de pagamento e valor mensal
    IF NEW.contact_type = 'VIZINHO' AND NEW.payment_date IS NOT NULL AND NEW.monthly_value IS NOT NULL THEN
        
        -- Busca dados do imóvel vinculado
        SELECT code, city, responsible_user_id INTO prop_code, prop_city, resp_user_id 
        FROM public.properties 
        WHERE id = NEW.property_id;
        
        -- Garante que temos um responsável válido para a atividade
        final_resp_user := COALESCE(resp_user_id, auth.uid(), (SELECT user_id FROM public.profiles LIMIT 1), (SELECT id FROM auth.users LIMIT 1));
        
        -- Se não encontrar nenhum usuário no sistema, gera erro
        IF final_resp_user IS NULL THEN
            RAISE EXCEPTION 'Não foi possível encontrar nenhum corretor ou usuário no sistema para atribuir a tarefa do vizinho.';
        END IF;

        -- Se for recorrente, gera 12 lembretes mensais (próximos 12 meses)
        IF NEW.is_recurring = TRUE THEN
            INSERT INTO public.activities (
                description, 
                due_date, 
                status, 
                activity_type, 
                property_id, 
                responsible_user_id, 
                created_by, 
                notes, 
                contact_id
            )
            SELECT
                'Pagamento do Vizinho: ' || NEW.name || 
                ' - Valor: R$ ' || to_char(NEW.monthly_value, 'FM999G999G990D00') || 
                ' - Imóvel: ' || COALESCE(prop_code, 'Não informado') || 
                CASE WHEN prop_city IS NOT NULL THEN ' (' || prop_city || ')' ELSE '' END,
                (NEW.payment_date + (i * interval '1 month'))::DATE,
                'pendente',
                'lembrete',
                NEW.property_id,
                final_resp_user,
                COALESCE(auth.uid(), final_resp_user),
                'Gerado automaticamente pelo sistema de parceiros (Recorrência ' || (i + 1) || '/12).',
                NEW.id
            FROM generate_series(0, 11) AS i;
            
        -- Se não for recorrente, gera apenas um lembrete único na data estipulada
        ELSE
            activity_desc := 'Pagamento do Vizinho: ' || NEW.name || 
                            ' - Valor: R$ ' || to_char(NEW.monthly_value, 'FM999G999G990D00') || 
                            ' - Imóvel: ' || COALESCE(prop_code, 'Não informado') || 
                            CASE WHEN prop_city IS NOT NULL THEN ' (' || prop_city || ')' ELSE '' END;

            INSERT INTO public.activities (
                description, 
                due_date, 
                status, 
                activity_type, 
                property_id, 
                responsible_user_id, 
                created_by, 
                notes, 
                contact_id
            )
            VALUES (
                activity_desc,
                NEW.payment_date,
                'pendente',
                'lembrete',
                NEW.property_id,
                final_resp_user,
                COALESCE(auth.uid(), final_resp_user),
                'Gerado automaticamente pelo sistema de parceiros.',
                NEW.id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
