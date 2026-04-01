CREATE OR REPLACE FUNCTION public.delete_team_member(p_id UUID, p_status TEXT, p_email TEXT)
RETURNS JSON AS $$
BEGIN
    IF p_status = 'pending_registration' THEN
        DELETE FROM public.authorized_emails WHERE id = p_id;
    ELSE
        -- Remove perfis e roles desse usuário (p_id is user_id from profiles, usually)
        DELETE FROM public.user_roles WHERE user_id = p_id;
        DELETE FROM public.profiles WHERE user_id = p_id;
        -- E caso existisse em emails autorizados tmb exclui 
        DELETE FROM public.authorized_emails WHERE email = p_email;
    END IF;
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_team_member TO authenticated;
