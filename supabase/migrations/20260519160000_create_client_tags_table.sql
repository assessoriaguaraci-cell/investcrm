-- Create client_tags table
CREATE TABLE IF NOT EXISTS public.client_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT 'blue',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Permitir leitura para autenticados" ON public.client_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.client_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON public.client_tags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir deleção para autenticados" ON public.client_tags FOR DELETE TO authenticated USING (true);

-- Grant privileges
GRANT ALL ON TABLE public.client_tags TO anon, authenticated, service_role;
