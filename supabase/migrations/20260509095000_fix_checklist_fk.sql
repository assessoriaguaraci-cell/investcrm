-- Allow property_id to be NULL so we can use pre_auction_property_id
ALTER TABLE public.property_checklist_items ALTER COLUMN property_id DROP NOT NULL;

-- Add column for pre-auction property reference
ALTER TABLE public.property_checklist_items ADD COLUMN IF NOT EXISTS pre_auction_property_id UUID REFERENCES public.pre_auction_properties(id) ON DELETE CASCADE;

-- Update RLS policies to include the new column
DROP POLICY IF EXISTS "All authenticated users can manage checklist items" ON public.property_checklist_items;
CREATE POLICY "Enable manage for authenticated users" ON public.property_checklist_items
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
