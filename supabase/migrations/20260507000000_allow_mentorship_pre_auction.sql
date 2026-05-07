-- Migration to allow 'mentoria' as a valid option for operation_responsible_id in pre_auction_properties
-- We change the column type to TEXT to accommodate both UUIDs and custom labels
ALTER TABLE public.pre_auction_properties ALTER COLUMN operation_responsible_id TYPE TEXT;

-- Drop the foreign key constraint to allow text labels like 'mentoria'
ALTER TABLE public.pre_auction_properties DROP CONSTRAINT IF EXISTS pre_auction_properties_operation_responsible_id_fkey;
