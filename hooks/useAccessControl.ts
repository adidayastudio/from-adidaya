import { useState, useEffect } from "react";
import useUserProfile from "./useUserProfile";
import { fetchMyRolePermissions } from "@/lib/api/people";
import { OrganizationRolePermission, VisibilityLevel } from "@/lib/types/organization";

export default function useAccessControl() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [permissions, setPermissions] = useState<OrganizationRolePermission | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileLoading && profile) {
            setLoading(true);
            fetchMyRolePermissions()
                .then(data => {
                    setPermissions(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else if (!profileLoading && !profile) {
            setLoading(false);
        }
    }, [profile, profileLoading]);

    const can = (capability: keyof OrganizationRolePermission) => {
        if (!permissions) return false;
        const val = permissions[capability];
        return typeof val === 'boolean' ? val : false;
    };

    const hasVisibility = (requiredLevel: VisibilityLevel) => {
        if (!permissions) return false;

        const levels: VisibilityLevel[] = ['Public', 'Internal', 'Restricted', 'Sensitive'];
        const currentIdx = levels.indexOf(permissions.visibility_level);
        const requiredIdx = levels.indexOf(requiredLevel);

        return currentIdx >= requiredIdx;
    };

    return {
        permissions,
        loading: loading || profileLoading,
        can,
        hasVisibility,
        scope: permissions?.visibility_scope || 'Self',
        roleCode: profile?.role
    };
}
