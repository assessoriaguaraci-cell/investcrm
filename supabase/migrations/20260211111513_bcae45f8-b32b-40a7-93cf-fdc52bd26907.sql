
-- Table for weekly property updates
CREATE TABLE public.property_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view property updates"
  ON public.property_updates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property updates"
  ON public.property_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property updates"
  ON public.property_updates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property updates"
  ON public.property_updates FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_property_updates_updated_at
  BEFORE UPDATE ON public.property_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
