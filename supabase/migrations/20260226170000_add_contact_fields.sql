-- Execute este script no SQL Editor do Supabase para aplicar a nova tabela
-- de parceiros
ALTER TABLE public.city_contacts
  ADD COLUMN IF NOT EXISTS has_served BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pix_key TEXT;
