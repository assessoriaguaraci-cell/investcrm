CREATE OR REPLACE FUNCTION public.get_authorized_emails()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(t) INTO result FROM (SELECT * FROM public.authorized_emails) t;
    RETURN COALESCE(result, '[]');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_authorized_emails TO authenticated;
