-- 1. Adiciona coluna is_recurring na tabela city_contacts
ALTER TABLE public.city_contacts
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- 2. Remove restrição de chave única para contact_id em atividades (necessário para múltiplos lembretes recorrentes)
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS uq_activities_contact_id;

-- 3. Cria a função global que faz o sync mensal dinâmico dos lembretes de vizinhos
CREATE OR REPLACE FUNCTION public.sync_vizinho_reminders()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    target_date DATE;
    payment_day INT;
    last_day INT;
    prop_code TEXT;
    prop_city TEXT;
    resp_user_id UUID;
    final_resp_user UUID;
    activity_desc TEXT;
BEGIN
    FOR r IN 
        SELECT id, name, payment_date, monthly_value, property_id, is_recurring
        FROM public.city_contacts
        WHERE contact_type = 'VIZINHO' 
          AND is_recurring = TRUE 
          AND payment_date IS NOT NULL 
          AND monthly_value IS NOT NULL
    LOOP
        -- Calcula o vencimento para o mês atual
        payment_day := EXTRACT(DAY FROM r.payment_date)::INT;
        last_day := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::INT;
        target_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, LEAST(payment_day, last_day));

        -- Se a data calculada for menor que a data de pagamento inicial cadastrada, usamos a inicial
        IF target_date < r.payment_date THEN
            target_date := r.payment_date;
        END IF;

        -- Verifica se já existe um lembrete (pendente ou feito) para este contato parceiro NESTE MES e ANO
        IF NOT EXISTS (
            SELECT 1 FROM public.activities 
            WHERE contact_id = r.id 
              AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM target_date)
              AND EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM target_date)
        ) THEN
            -- Busca dados do imóvel vinculado
            SELECT code, city, responsible_user_id INTO prop_code, prop_city, resp_user_id 
            FROM public.properties 
            WHERE id = r.property_id;
            
            -- Garante usuário responsável
            final_resp_user := COALESCE(resp_user_id, (SELECT user_id FROM public.profiles LIMIT 1), (SELECT id FROM auth.users LIMIT 1));

            IF final_resp_user IS NOT NULL THEN
                activity_desc := 'Pagamento do Vizinho: ' || r.name || 
                                ' - Valor: R$ ' || to_char(r.monthly_value, 'FM999G999G990D00') || 
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
                    target_date,
                    'pendente',
                    'lembrete',
                    r.property_id,
                    final_resp_user,
                    final_resp_user,
                    'Gerado automaticamente pelo sistema de recorrência mensal.',
                    r.id
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Cria/atualiza a função do trigger para city_contacts
CREATE OR REPLACE FUNCTION public.handle_vizinho_reminder_fn()
RETURNS TRIGGER AS $$
DECLARE
    prop_code TEXT;
    prop_city TEXT;
    resp_user_id UUID;
    activity_desc TEXT;
    final_resp_user UUID;
    target_date DATE;
    payment_day INT;
    last_day INT;
BEGIN
    -- Se a recorrência foi desativada (is_recurring mudou para false ou foi limpo),
    -- apagamos todas as atividades PENDENTES futuras (apenas as que não foram concluídas)
    IF NEW.is_recurring = FALSE OR NEW.contact_type != 'VIZINHO' THEN
        DELETE FROM public.activities 
        WHERE contact_id = NEW.id 
          AND status = 'pendente';
          
        -- E se o tipo mudou ou limpou campos de pagamento, apaga todos os pendentes
        IF NEW.contact_type != 'VIZINHO' OR NEW.payment_date IS NULL OR NEW.monthly_value IS NULL THEN
            DELETE FROM public.activities 
            WHERE contact_id = NEW.id 
              AND status = 'pendente';
        END IF;
        
        -- Caso não seja recorrente mas seja vizinho ativo, cria apenas o lembrete único (se não existir pendente)
        IF NEW.contact_type = 'VIZINHO' AND NEW.payment_date IS NOT NULL AND NEW.monthly_value IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.activities WHERE contact_id = NEW.id AND status = 'pendente') THEN
                SELECT code, city, responsible_user_id INTO prop_code, prop_city, resp_user_id 
                FROM public.properties 
                WHERE id = NEW.property_id;
                
                final_resp_user := COALESCE(resp_user_id, auth.uid(), (SELECT user_id FROM public.profiles LIMIT 1), (SELECT id FROM auth.users LIMIT 1));
                
                IF final_resp_user IS NOT NULL THEN
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
        END IF;

    -- Se a recorrência está ativa, executamos a sincronização imediata
    ELSIF NEW.contact_type = 'VIZINHO' AND NEW.payment_date IS NOT NULL AND NEW.monthly_value IS NOT NULL AND NEW.is_recurring = TRUE THEN
        -- Remove pendentes antigos para recriar com os dados atualizados (se houve alteração de valor ou imóvel)
        DELETE FROM public.activities 
        WHERE contact_id = NEW.id 
          AND status = 'pendente';
          
        -- Calcula o vencimento para o mês atual
        payment_day := EXTRACT(DAY FROM NEW.payment_date)::INT;
        last_day := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::INT;
        target_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, LEAST(payment_day, last_day));

        -- Se a data calculada for menor que a data de pagamento inicial cadastrada, usamos a inicial
        IF target_date < NEW.payment_date THEN
            target_date := NEW.payment_date;
        END IF;

        -- Cria o lembrete pendente para o mês atual
        SELECT code, city, responsible_user_id INTO prop_code, prop_city, resp_user_id 
        FROM public.properties 
        WHERE id = NEW.property_id;
        
        final_resp_user := COALESCE(resp_user_id, auth.uid(), (SELECT user_id FROM public.profiles LIMIT 1), (SELECT id FROM auth.users LIMIT 1));

        IF final_resp_user IS NOT NULL THEN
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
                target_date,
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

-- 5. Recria a trigger tr_vizinho_reminder
DROP TRIGGER IF EXISTS tr_vizinho_reminder ON public.city_contacts;
CREATE TRIGGER tr_vizinho_reminder
AFTER INSERT OR UPDATE ON public.city_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_vizinho_reminder_fn();
