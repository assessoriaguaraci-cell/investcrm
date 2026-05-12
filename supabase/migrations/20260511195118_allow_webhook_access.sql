-- Desativa RLS para as tabelas que o webhook precisa acessar
-- Isso garante que o Botconversa consiga gravar dados sem erros de permissão
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_property_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Garante permissões de uso para os papéis anon e authenticated
GRANT ALL ON public.clients TO anon, authenticated, service_role;
GRANT ALL ON public.audit_logs TO anon, authenticated, service_role;
GRANT ALL ON public.client_property_links TO anon, authenticated, service_role;
GRANT ALL ON public.properties TO anon, authenticated, service_role;
