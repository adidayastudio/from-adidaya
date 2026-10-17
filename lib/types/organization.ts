export type EntityStatus = "Active" | "Inactive" | "Archived";

export interface OrganizationDepartment {
    id: string;
    code: string; // Combined format (e.g. 1-AID)
    cluster_code: number; // Single digit (e.g. 1)
    name: string;
    order_index: number;
    status: EntityStatus;
    usageCount?: number;
}

export interface OrganizationPosition {
    id: string;
    code: string; // 2-letter uppercase (e.g. AR)
    name: string;
    department_id: string;
    category_code: number; // 1-9
    status: EntityStatus;
    // Expanded for display
    department_name?: string;
    department_abbr?: string;
    department_full_code?: string;
    system_role_id?: string;
    system_role_name?: string;
    usageCount?: number;
}

export interface OrganizationLevel {
    id: string;
    code: string; // 3-digit + Roman + Label (e.g. 001 I JR)
    name: string;
    level_code: number; // 0-5
    roman_code: string; // I, II, etc.
    order_index: number;
    status: EntityStatus;
    usageCount?: number;
}

export interface OrganizationSystemRole {
    id: string;
    code: string; // e.g. SUPERADMIN
    name: string; // e.g. Superadmin
    description?: string;
    order_index: number;
    status: EntityStatus;
    usageCount?: number;
    created_at?: string;
    updated_at?: string;
}

export type VisibilityLevel = 'Public' | 'Internal' | 'Restricted' | 'Sensitive';
export type VisibilityScope = 'Self' | 'Team' | 'Global';

export interface OrganizationRolePermission {
    id: string;
    role_id: string;
    // Capabilities
    can_view_directory: boolean;
    can_manage_people: boolean;
    can_view_performance_summary: boolean;
    can_view_performance_detail: boolean;
    // Data Visibility
    visibility_level: VisibilityLevel;
    visibility_scope: VisibilityScope;
    // Approval Authority
    can_approve_leave: boolean;
    can_approve_overtime: boolean;
    can_approve_expense: boolean;
    created_at?: string;
    updated_at?: string;
}

export type WorkStatusVisibility = "Public" | "Team Only" | "Private";

export interface EmploymentType {
    id: string;
    name: string;
    min_level_code: number;
    max_level_code: number;
    is_default: boolean;
    status: "Active" | "Archived";
    order_index: number;
    usageCount?: number;
    created_at?: string;
    updated_at?: string;
}

export interface WorkStatus {
    id: string;
    name: string;
    color: string;
    visibility: WorkStatusVisibility;
    status: "Active" | "Archived";
    order_index: number;
    created_at?: string;
    updated_at?: string;
}

export interface EmploymentPolicy {
    id: string;
    employment_type_id: string;
    // eligibility & rights
    overtime_eligible: boolean;
    benefits_eligible: boolean;
    default_working_hours?: number; // Keeping for reference or removal later if fully replaced by Schedule
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface WorkSchedule {
    id: string;
    name: string;
    type: 'Fixed' | 'Shift' | 'Flexible' | 'Custom';
    days_config?: any; // JSONB
    start_time?: string;
    end_time?: string;
    break_duration_minutes: number;
    timezone: string;
    description?: string;
    status: 'Active' | 'Archived';
    created_at?: string;
    updated_at?: string;
}

export interface LeavePolicy {
    id: string;
    name: string;
    description?: string;
    annual_leave_quota: number;
    sick_leave_quota: number;
    permission_quota: number;
    accrual_type: 'Per Year' | 'Monthly' | 'None' | 'Pro-rated (Year-based)' | 'Pro-rated (Quadratic)';
    carry_over_allowed: boolean;
    max_carry_over_days?: number;
    policy_config?: any; // JSONB
    status: 'Active' | 'Archived';
    created_at?: string;
    updated_at?: string;
}
