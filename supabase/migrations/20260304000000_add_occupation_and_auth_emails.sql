-- Add occupation to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Create authorized_emails table to control who can sign up
CREATE TABLE IF NOT EXISTS public.authorized_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on authorized_emails
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to manage authorized emails
CREATE POLICY "Admins can manage authorized emails"
ON public.authorized_emails
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'gestor')
    )
);

-- Policy to allow public to check emails (though we don't strictly need public if we check server-side, 
-- but for a simple invite check we might need it)
-- Actually, better to keep it restricted.

-- Insert a few roles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'gestor', 'comercial', 'operacoes', 'leitura');
  END IF;
END
$$;
