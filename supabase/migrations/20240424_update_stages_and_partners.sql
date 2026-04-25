-- Add new stage and update partners table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'property_stage' AND e.enumlabel = 'pos_arrematacao') THEN
        ALTER TYPE property_stage ADD VALUE 'pos_arrematacao';
    END IF;
END $$;

-- Migrate existing pre_arrematacao to pos_arrematacao
UPDATE properties SET stage = 'pos_arrematacao' WHERE stage = 'pre_arrematacao';

-- Add diligence_history to partners (city_contacts)
ALTER TABLE public.city_contacts ADD COLUMN IF NOT EXISTS diligence_history TEXT;
