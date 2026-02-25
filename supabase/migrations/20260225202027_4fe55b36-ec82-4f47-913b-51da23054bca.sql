
-- City information table for map feature
CREATE TABLE public.city_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  best_neighborhoods TEXT,
  worst_neighborhoods TEXT,
  considerations TEXT,
  dangerous_regions TEXT,
  where_sold TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(state, city)
);

-- Enable RLS
ALTER TABLE public.city_info ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view city info"
ON public.city_info FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert city info"
ON public.city_info FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city info"
ON public.city_info FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_city_info_updated_at
BEFORE UPDATE ON public.city_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
