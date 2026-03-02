-- Table for city contacts (diligents, city halls, etc.)
CREATE TABLE public.city_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_info_id UUID NOT NULL REFERENCES public.city_info(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL, -- 'diligente', 'prefeitura', 'outro'
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_contacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view city contacts"
ON public.city_contacts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert city contacts"
ON public.city_contacts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city contacts"
ON public.city_contacts FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete city contacts"
ON public.city_contacts FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_city_contacts_updated_at
BEFORE UPDATE ON public.city_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
