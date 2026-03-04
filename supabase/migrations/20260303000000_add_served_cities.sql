-- Create join table for partners and cities they serve
CREATE TABLE IF NOT EXISTS public.contact_served_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.city_contacts(id) ON DELETE CASCADE,
  city_info_id UUID NOT NULL REFERENCES public.city_info(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, city_info_id)
);

-- Enable RLS
ALTER TABLE public.contact_served_cities ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view served cities" 
    ON public.contact_served_cities FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage served cities" 
    ON public.contact_served_cities FOR ALL TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Make city_info_id nullable in city_contacts if wanted, 
-- but we'll keep it as the 'Base City' for now to avoid breaking existing queries.
-- We can add a column to indicate if it's a global partner or something, 
-- but let's stick to the join table for 'served cities'.
