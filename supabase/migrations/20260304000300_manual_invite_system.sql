-- 1. Create or Update authorized_emails table
CREATE TABLE IF NOT EXISTS public.authorized_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    occupation TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns if they don't exist (safety for existing table)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'authorized_emails' AND COLUMN_NAME = 'full_name') THEN
        ALTER TABLE public.authorized_emails ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'authorized_emails' AND COLUMN_NAME = 'phone') THEN
        ALTER TABLE public.authorized_emails ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'authorized_emails' AND COLUMN_NAME = 'occupation') THEN
        ALTER TABLE public.authorized_emails ADD COLUMN occupation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'authorized_emails' AND COLUMN_NAME = 'role') THEN
        ALTER TABLE public.authorized_emails ADD COLUMN role TEXT;
    END IF;
END $$;

-- 3. Grant Permissions
GRANT ALL ON TABLE public.authorized_emails TO authenticated, service_role;
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authorized_emails_all" ON public.authorized_emails;
CREATE POLICY "authorized_emails_all" ON public.authorized_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Trigger to Auto-Approve and Set Metadata on Profile Creation
CREATE OR REPLACE FUNCTION public.handle_profile_authorization()
RETURNS TRIGGER AS $$
DECLARE
    auth_rec RECORD;
BEGIN
    -- Look for authorization for the new user's email
    SELECT * INTO auth_rec 
    FROM public.authorized_emails 
    WHERE email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
    LIMIT 1;

    IF auth_rec IS NOT NULL THEN
        -- Auto-approve
        UPDATE public.profiles 
        SET 
            status = 'approved',
            full_name = COALESCE(NEW.full_name, auth_rec.full_name),
            phone = COALESCE(NEW.phone, auth_rec.phone),
            occupation = COALESCE(NEW.occupation, auth_rec.occupation)
        WHERE user_id = NEW.user_id;

        -- Assign Role
        IF auth_rec.role IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.user_id, auth_rec.role)
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;

        -- Optional: Remove from authorized_emails or mark as used
        -- DELETE FROM public.authorized_emails WHERE id = auth_rec.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS tr_handle_profile_authorization ON public.profiles;
CREATE TRIGGER tr_handle_profile_authorization
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_authorization();
