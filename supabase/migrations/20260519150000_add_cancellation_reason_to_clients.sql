-- Add cancellation_reason to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
