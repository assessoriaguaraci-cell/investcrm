-- Add trigger_code to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS trigger_code TEXT;

-- Create an index for better lookup
CREATE INDEX IF NOT EXISTS idx_clients_trigger_code ON public.clients(trigger_code);

-- Search and auto-link property if trigger_code matches property code on insert
-- This is a trigger function
CREATE OR REPLACE FUNCTION public.handle_new_lead_trigger()
RETURNS TRIGGER AS $$
DECLARE
    found_property_id UUID;
BEGIN
    IF NEW.trigger_code IS NOT NULL THEN
        SELECT id INTO found_property_id FROM public.properties WHERE code = NEW.trigger_code LIMIT 1;
        
        IF found_property_id IS NOT NULL THEN
            INSERT INTO public.client_property_links (client_id, property_id, status)
            VALUES (NEW.id, found_property_id, 'interessado')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to clients table
DROP TRIGGER IF EXISTS tr_handle_new_lead_trigger ON public.clients;
CREATE TRIGGER tr_handle_new_lead_trigger
AFTER INSERT OR UPDATE OF trigger_code ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lead_trigger();
