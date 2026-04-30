
-- Fix stage columns to be TEXT instead of ENUM to support dynamic Kanban stages
-- Also add checklist column to kanban_stages if missing

-- 1. Convert property_checklist_items.stage to TEXT
ALTER TABLE IF EXISTS public.property_checklist_items ALTER COLUMN stage TYPE TEXT;

-- 2. Convert property_stage_history.stage to TEXT if the table exists
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_stage_history') THEN
        ALTER TABLE public.property_stage_history ALTER COLUMN stage TYPE TEXT;
    END IF;
END $$;

-- 3. Add checklist column to kanban_stages if it doesn't exist
ALTER TABLE IF EXISTS public.kanban_stages ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';

-- 4. Update the enum-based stages in the DB to match the new names if needed
-- (They should already be correct but let's be safe)
UPDATE public.kanban_stages SET value = 'pre_arrematacao' WHERE value = 'pos_arrematacao' AND funnel_type = 'property';
UPDATE public.properties SET stage = 'pre_arrematacao' WHERE stage = 'pos_arrematacao';
UPDATE public.property_checklist_items SET stage = 'pre_arrematacao' WHERE stage = 'pos_arrematacao';
