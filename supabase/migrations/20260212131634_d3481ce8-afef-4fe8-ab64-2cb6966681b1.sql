
-- Fix: Restrict client SELECT to assigned users, admin, and gestor
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Users can view assigned clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR responsible_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activities
      WHERE activities.client_id = clients.id
      AND (activities.responsible_user_id = auth.uid() OR activities.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.client_property_links
      WHERE client_property_links.client_id = clients.id
      AND client_property_links.responsible_user_id = auth.uid()
    )
  );

-- Fix: Restrict client UPDATE to assigned users, admin, and gestor
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

CREATE POLICY "Users can update assigned clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR responsible_user_id = auth.uid()
  );

-- Fix: Restrict client INSERT to require auth
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
