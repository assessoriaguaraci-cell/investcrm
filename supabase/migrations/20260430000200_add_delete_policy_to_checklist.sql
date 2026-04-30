
-- Add DELETE policy for property_checklist_items
-- This was missing in the original migration, causing deletions to fail silently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_checklist_items' 
        AND policyname = 'Authenticated users can delete checklist'
    ) THEN
        CREATE POLICY "Authenticated users can delete checklist" ON public.property_checklist_items
          FOR DELETE TO authenticated USING (true);
    END IF;
END
$$;
