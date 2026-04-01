-- Final migration to ensure 'tags' column exists on clients and properties
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
COMMENT ON COLUMN public.clients.tags IS 'Tags para organização de clientes';
COMMENT ON COLUMN public.properties.tags IS 'Tags para organização de imóveis';
