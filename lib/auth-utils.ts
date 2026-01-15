import { UserRole } from "@/hooks/useUserProfile";

export const TEAM_VIEW_ROLES: (UserRole | string)[] = ["superadmin", "admin", "administrator", "supervisor", "pm", "management", "finance"];

// Finance-specific roles that can access finance team features
export const FINANCE_ROLES: string[] = ["superadmin", "admin", "administrator", "finance", "supervisor", "pm", "management"];

export function canViewTeamData(role: string | undefined): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '');

    // Explicit list check
    if (TEAM_VIEW_ROLES.includes(normalizedRole)) return true;

    // Fallback partial matching
    if (normalizedRole.includes('admin')) return true;
    if (normalizedRole.includes('supervisor')) return true;
    if (normalizedRole.includes('pm')) return true;
    if (normalizedRole.includes('manage')) return true;
    if (normalizedRole.includes('finance')) return true;

    return false;
}

export function canAccessFinanceTeam(role: string | undefined): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
    return FINANCE_ROLES.some(r => normalizedRole.includes(r) || normalizedRole === r);
}
