import { UserRole } from "@/hooks/useUserProfile";

export const TEAM_VIEW_ROLES: (UserRole | string)[] = ["superadmin", "admin", "administrator", "supervisor", "pm", "management"];

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

    return false;
}
