
-- 1. Tighten activities SELECT policy to restrict access
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
CREATE POLICY "Users can view relevant activities"
  ON public.activities
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR responsible_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

-- 2. Tighten activities UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
CREATE POLICY "Users can update relevant activities"
  ON public.activities
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR responsible_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

-- 3. Tighten activities INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add input validation constraints on clients table
ALTER TABLE public.clients
  ADD CONSTRAINT clients_full_name_length CHECK (length(full_name) <= 255),
  ADD CONSTRAINT clients_phone_length CHECK (phone IS NULL OR length(phone) <= 30),
  ADD CONSTRAINT clients_email_length CHECK (email IS NULL OR length(email) <= 255),
  ADD CONSTRAINT clients_cpf_length CHECK (cpf IS NULL OR length(cpf) BETWEEN 11 AND 18);

-- 5. Add input validation constraints on properties table
ALTER TABLE public.properties
  ADD CONSTRAINT properties_code_length CHECK (length(code) <= 50),
  ADD CONSTRAINT properties_address_length CHECK (address IS NULL OR length(address) <= 500);

-- 6. Sanitize handle_new_user to truncate full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, status)
  VALUES (
    NEW.id,
    COALESCE(substring(NEW.raw_user_meta_data->>'full_name', 1, 255), ''),
    'pending'
  );
  RETURN NEW;
END;
$$;
