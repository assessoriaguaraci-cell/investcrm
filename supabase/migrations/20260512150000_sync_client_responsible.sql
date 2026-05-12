-- 1. Função para sincronizar o responsável do cliente com o do imóvel vinculado
CREATE OR REPLACE FUNCTION public.sync_client_responsible_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Tenta encontrar o responsável do imóvel vinculado
  -- Se houver múltiplos imóveis, pega o do último vinculado
  UPDATE public.clients
  SET responsible_user_id = (
    SELECT p.responsible_user_id 
    FROM public.properties p 
    WHERE p.id = NEW.property_id 
    LIMIT 1
  )
  WHERE id = NEW.client_id
  AND (responsible_user_id IS NULL OR responsible_user_id::text = '');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Gatilho para novos vínculos (Futuro)
DROP TRIGGER IF EXISTS tr_sync_client_responsible ON public.client_property_links;
CREATE TRIGGER tr_sync_client_responsible
AFTER INSERT OR UPDATE ON public.client_property_links
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_responsible_fn();

-- 3. Sincronização do Passado (Executa uma vez agora)
UPDATE public.clients c
SET responsible_user_id = p.responsible_user_id
FROM public.client_property_links cpl
JOIN public.properties p ON p.id = cpl.property_id
WHERE cpl.client_id = c.id
AND (c.responsible_user_id IS NULL OR c.responsible_user_id::text = '');
