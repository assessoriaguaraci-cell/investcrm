-- Migration to allow 'MENTORIA' as a valid option for operation_responsible_id
-- We change the column type to TEXT to accommodate both UUIDs and custom labels
ALTER TABLE properties ALTER COLUMN operation_responsible_id TYPE TEXT;

-- We also need to drop the foreign key constraint if it exists
-- To find the constraint name, we can use this query, but since we know it from the previous migration...
-- It was likely created as 'properties_operation_responsible_id_fkey' by Supabase automatically or in the migration
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_operation_responsible_id_fkey;
