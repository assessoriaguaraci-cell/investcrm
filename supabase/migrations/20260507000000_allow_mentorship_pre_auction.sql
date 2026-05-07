-- Migration to allow custom labels like 'mentoria' in both responsible fields
-- We change the column types to TEXT to accommodate both UUIDs and custom labels
ALTER TABLE public.pre_auction_properties ALTER COLUMN operation_responsible_id TYPE TEXT;
ALTER TABLE public.pre_auction_properties ALTER COLUMN responsible_id TYPE TEXT;

-- Drop the foreign key constraints to allow text labels
ALTER TABLE public.pre_auction_properties DROP CONSTRAINT IF EXISTS pre_auction_properties_operation_responsible_id_fkey;
ALTER TABLE public.pre_auction_properties DROP CONSTRAINT IF EXISTS pre_auction_properties_responsible_id_fkey;
