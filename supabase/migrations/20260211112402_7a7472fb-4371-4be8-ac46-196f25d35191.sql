
ALTER TABLE public.property_updates
  ADD COLUMN stage text,
  ADD COLUMN days_since_auction integer;
