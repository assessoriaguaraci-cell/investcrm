CREATE OR REPLACE FUNCTION public.update_authorized_email(
    p_id UUID,
    p_full_name TEXT,
    p_phone TEXT,
    p_occupation TEXT,
    p_role TEXT
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.authorized_emails
    SET 
        full_name = p_full_name,
        phone = p_phone,
        occupation = p_occupation,
        role = p_role
    WHERE id = p_id;
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_authorized_email TO authenticated;

-- Also update existing profiles if they exist matching that email
CREATE OR REPLACE FUNCTION public.update_profile_from_auth_email()
RETURNS TRIGGER AS $$
DECLARE
    matched_user_id UUID;
BEGIN
    -- Only do this if it's an update
    IF TG_OP = 'UPDATE' THEN
        SELECT id INTO matched_user_id FROM auth.users WHERE email = NEW.email;
        IF matched_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET
                full_name = NEW.full_name,
                phone = NEW.phone,
                occupation = NEW.occupation
            WHERE user_id = matched_user_id;

            IF NEW.role IS NOT NULL THEN
                -- update role
                DELETE FROM public.user_roles WHERE user_id = matched_user_id;
                INSERT INTO public.user_roles (user_id, role) VALUES (matched_user_id, NEW.role);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_profile_from_auth_email ON public.authorized_emails;
CREATE TRIGGER tr_update_profile_from_auth_email
AFTER UPDATE ON public.authorized_emails FOR EACH ROW EXECUTE FUNCTION public.update_profile_from_auth_email();
