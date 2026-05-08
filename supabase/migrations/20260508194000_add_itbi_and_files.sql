-- Add ITBI column to pre_auction_properties
ALTER TABLE public.pre_auction_properties ADD COLUMN IF NOT EXISTS itbi NUMERIC;

-- Create table for analysis files (diligence images, PDFs, etc)
CREATE TABLE IF NOT EXISTS public.pre_auction_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pre_auction_properties(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT, -- 'image', 'pdf', 'other'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pre_auction_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can manage pre_auction_files" ON public.pre_auction_files
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
