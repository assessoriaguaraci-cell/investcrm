ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_url TEXT;
NOTIFY pgrst, 'reload schema';
