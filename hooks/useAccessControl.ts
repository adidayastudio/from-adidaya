import { useEffect, useState } from 'react';
import { useUserContext } from '@/context/UserProvider';
import { supabase } from '@/lib/supabase';

// Same role-code join and deny-by-default capability checks as from-adidaya.
export default function useAccessControl() {
    const { user, profile, profileStatus } = useUserContext();
    const [permissions, setPermissions] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        setPermissions(null);
        if (!user) { setLoading(false); return; }
        setLoading(true);
        void (async () => {
            const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
            if (!role?.role) return null;
            const { data, error } = await supabase.from('organization_role_permissions').select('*, organization_system_roles!inner(code)').eq('organization_system_roles.code', role.role.toUpperCase()).maybeSingle();
            return error ? null : data;
        })().then(data => { if (active) setPermissions(data); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [user?.id, profile?.role]);
    return { permissions, loading: loading || profileStatus === 'loading', can: (key: string) => permissions?.[key] === true, hasVisibility: (level: string) => {
        const levels = ['Public', 'Internal', 'Restricted', 'Sensitive'];
        return !!permissions && levels.includes(level) && levels.indexOf(permissions.visibility_level) >= levels.indexOf(level);
    }, scope: permissions?.visibility_scope || 'Self', roleCode: profile?.role };
}
