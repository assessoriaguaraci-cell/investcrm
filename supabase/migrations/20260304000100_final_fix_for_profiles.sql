-- 1. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant permissions on tables
GRANT ALL ON TABLE public.profiles TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.user_roles TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.authorized_emails TO anon, authenticated, postgres, service_role;

-- 3. Reset RLS and make them open for now (fixing properly later if needed)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_select" ON public.profiles;
CREATE POLICY "allow_public_select" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "allow_individual_update" ON public.profiles;
CREATE POLICY "allow_individual_update" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_public_select_roles" ON public.user_roles;
CREATE POLICY "allow_public_select_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "allow_admin_manage_roles" ON public.user_roles;
CREATE POLICY "allow_admin_manage_roles" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_manage_auth_emails" ON public.authorized_emails;
CREATE POLICY "allow_admin_manage_auth_emails" ON public.authorized_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
