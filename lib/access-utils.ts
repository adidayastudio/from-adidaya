import { OrganizationRolePermission } from "@/lib/types/organization";

export function generateEffectiveAccessPreview(
    roleName: string,
    permissions: Partial<OrganizationRolePermission>
): string {
    const {
        can_view_directory,
        can_manage_people,
        can_view_performance_summary,
        can_view_performance_detail,
        visibility_level,
        visibility_scope,
        can_approve_leave,
        can_approve_overtime,
        can_approve_expense
    } = permissions;

    const sections: string[] = [];

    // 1. Visibility
    let visibilityDesc = "";
    const scopeDesc = visibility_scope === 'Global' ? "across all teams" :
        visibility_scope === 'Team' ? "within their own team" : "for themselves only";

    if (visibility_level === 'Sensitive') {
        visibilityDesc = `can view full sensitive profiles (including contracts and legal documents) ${scopeDesc}.`;
    } else if (visibility_level === 'Restricted') {
        visibilityDesc = `can view basic profiles and KPI summaries ${scopeDesc}, but cannot access sensitive documents.`;
    } else if (visibility_level === 'Internal') {
        visibilityDesc = `can view internal profiles (skills and availability) ${scopeDesc}.`;
    } else {
        visibilityDesc = `can only view public profile information ${scopeDesc}.`;
    }
    sections.push(visibilityDesc);

    // 2. Capabilities
    const capabilities: string[] = [];
    if (can_manage_people) capabilities.push("can fully manage personnel data");
    if (can_view_performance_detail) capabilities.push("can access detailed performance metrics");
    else if (can_view_performance_summary) capabilities.push("can see performance overviews");

    if (capabilities.length > 0) {
        sections.push(`In addition, ${roleName} ${capabilities.join(" and ")}.`);
    }

    // 3. Approvals
    const approvals: string[] = [];
    if (can_approve_leave) approvals.push("leave");
    if (can_approve_overtime) approvals.push("overtime");
    if (can_approve_expense) approvals.push("expense");

    if (approvals.length > 0) {
        sections.push(`They have approval authority for ${approvals.join(", ")} requests.`);
    } else {
        sections.push(`They do not have any approval authority.`);
    }

    // 4. Directory
    if (!can_view_directory) {
        sections.push(`Note: Access to the People Directory is currently disabled for this role.`);
    }

    return `With this configuration, ${roleName} ${sections.join(" ")}`;
}
