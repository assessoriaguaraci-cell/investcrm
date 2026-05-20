-- Adiciona colunas na tabela city_contacts
ALTER TABLE public.city_contacts
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_value NUMERIC,
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

-- Adiciona coluna de vínculo na tabela de atividades
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.city_contacts(id) ON DELETE CASCADE;

-- Adiciona restrição de chave única para contact_id em atividades
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS uq_activities_contact_id,
  ADD CONSTRAINT uq_activities_contact_id UNIQUE (contact_id);

-- Cria ou atualiza a função de trigger
CREATE OR REPLACE FUNCTION public.handle_vizinho_reminder_fn()
RETURNS TRIGGER AS $$
DECLARE
    prop_code TEXT;
    prop_city TEXT;
    resp_user_id UUID;
    activity_desc TEXT;
    final_resp_user UUID;
BEGIN
    -- Se o tipo de contato for VIZINHO e tiver data de pagamento e valor mensal
    IF NEW.contact_type = 'VIZINHO' AND NEW.payment_date IS NOT NULL AND NEW.monthly_value IS NOT NULL THEN
        
        -- Busca dados do imóvel vinculado
        SELECT code, city, responsible_user_id INTO prop_code, prop_city, resp_user_id 
        FROM public.properties 
        WHERE id = NEW.property_id;
        
        -- Garante que temos um responsável válido para a atividade
        final_resp_user := COALESCE(resp_user_id, auth.uid(), (SELECT user_id FROM public.profiles LIMIT 1), (SELECT id FROM auth.users LIMIT 1));
        
        -- Se não encontrar nenhum usuário no sistema de forma alguma, gera erro amigável ou define NULL
        IF final_resp_user IS NULL THEN
            RAISE EXCEPTION 'Não foi possível encontrar nenhum corretor ou usuário no sistema para atribuir a tarefa do vizinho.';
        END IF;

        -- Constrói a descrição amigável do lembrete
        activity_desc := 'Pagamento do Vizinho: ' || NEW.name || 
                        ' - Valor: R$ ' || to_char(NEW.monthly_value, 'FM999G999G990D00') || 
                        ' - Imóvel: ' || COALESCE(prop_code, 'Não informado') || 
                        CASE WHEN prop_city IS NOT NULL THEN ' (' || prop_city || ')' ELSE '' END;

        -- Faz o upsert na tabela de atividades
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
        )
        ON CONFLICT (contact_id) DO UPDATE 
        SET description = EXCLUDED.description,
            due_date = EXCLUDED.due_date,
            property_id = EXCLUDED.property_id,
            responsible_user_id = EXCLUDED.responsible_user_id,
            updated_at = now();
            
    -- Caso mude de tipo ou limpe os campos, apaga o lembrete correspondente
    ELSE
        DELETE FROM public.activities WHERE contact_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria a trigger para monitorar a tabela city_contacts
DROP TRIGGER IF EXISTS tr_vizinho_reminder ON public.city_contacts;
CREATE TRIGGER tr_vizinho_reminder
AFTER INSERT OR UPDATE ON public.city_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_vizinho_reminder_fn();
