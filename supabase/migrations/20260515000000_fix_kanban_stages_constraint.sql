-- Update kanban_stages unique constraint to include funnel_id
-- This allows stages with the same name/value in different funnels
-- Note: NULLs are distinct in standard unique constraints, so multiple NULL funnel_ids are allowed.

ALTER TABLE public.kanban_stages DROP CONSTRAINT IF EXISTS kanban_stages_funnel_type_value_key;

-- We use COALESCE or a separate partial index if we want to handle NULLs properly for older Postgres,
-- but for standard CRM use cases where we might want shared default stages (NULL funnel_id)
-- and specific funnel stages, we need to be careful.

-- Let's create a unique index that handles NULL funnel_id by treating it as a specific value
-- or just allow the standard multi-null behavior if that's what's needed.
-- Actually, we want (funnel_type, value, funnel_id) to be UNIQUE.

CREATE UNIQUE INDEX IF NOT EXISTS kanban_stages_funnel_type_value_funnel_id_key 
ON public.kanban_stages (funnel_type, value, (COALESCE(funnel_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- Update existing stages that might conflict if needed (unlikely based on current error)
