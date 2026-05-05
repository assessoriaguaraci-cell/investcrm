
-- Update saved_filters policies to allow all authenticated users to see all filters
-- but only the owner can delete them.

DROP POLICY IF EXISTS "Users can see only their own filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can view their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can see their own filters" ON public.saved_filters;

CREATE POLICY "All authenticated users can see all filters"
  ON public.saved_filters FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep delete policy restricted to owner (optional, based on user request)
-- If the user wants EVERYONE to be able to delete everything, we could change this too.
-- For now, let's just make them visible.
