CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'full_name', p.full_name,
            'phone', p.phone,
            'occupation', p.occupation,
            'status', COALESCE(p.status, 'approved'),
            'email', u.email,
            'roles', COALESCE((
                SELECT json_agg(ur.role)
                FROM public.user_roles ur
                WHERE ur.user_id = p.user_id
            ), '[]'::json)
        )
    ) INTO result
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id;
    
    RETURN COALESCE(result, '[]');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_team_members TO authenticated;
