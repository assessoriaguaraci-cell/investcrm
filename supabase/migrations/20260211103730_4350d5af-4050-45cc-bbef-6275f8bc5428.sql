
-- Add drive_url and photo_url to properties
ALTER TABLE public.properties ADD COLUMN drive_url text;
ALTER TABLE public.properties ADD COLUMN photo_url text;

-- Create property_stage_history table
CREATE TABLE public.property_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stage text NOT NULL,
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  exited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.property_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stage history"
  ON public.property_stage_history FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert stage history"
  ON public.property_stage_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage history"
  ON public.property_stage_history FOR UPDATE USING (true);

-- Trigger to auto-track stage changes
CREATE OR REPLACE FUNCTION public.track_property_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Close previous stage entry
    UPDATE public.property_stage_history
    SET exited_at = now()
    WHERE property_id = NEW.id AND exited_at IS NULL;

    -- Insert new stage entry
    INSERT INTO public.property_stage_history (property_id, stage, entered_at)
    VALUES (NEW.id, NEW.stage, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_stage_change
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.track_property_stage_change();

-- Also insert initial stage history for new properties
CREATE OR REPLACE FUNCTION public.init_property_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.property_stage_history (property_id, stage, entered_at)
  VALUES (NEW.id, NEW.stage, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER init_stage_history
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.init_property_stage_history();

-- Saved filters table
CREATE TABLE public.saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'properties',
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved filters"
  ON public.saved_filters FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved filters"
  ON public.saved_filters FOR DELETE USING (user_id = auth.uid());

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true);

CREATE POLICY "Anyone can view property photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can update property photos"
  ON storage.objects FOR UPDATE USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'property-photos');
