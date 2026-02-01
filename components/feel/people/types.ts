export type PersonRole = "admin" | "hr" | "supervisor" | "staff" | "intern" | "management";
export type PersonStatus = "Active" | "Inactive" | "On Leave" | "Probation";
export type AccountType = "human_account" | "system_account";
export type EmploymentType = "Full Time" | "Contract" | "Freelance" | "Intern";

export interface AttendanceStats {
    attendanceRate: number; // 0-100
    totalDays: number;
    lateDays: number;
    absentDays: number;
    overtimeHours: number;
}

export interface PerformanceStats {
    tasksCompleted: number;
    avgTaskCompletionTime: string; // e.g. "2.5 days"
    performanceScore: number; // 0-100
    productivityTrend: "rising" | "stable" | "falling";
    activeProjects: number;
    performanceStatus: "Top Performer" | "Good" | "Requires Review" | "Not Applicable" | "No Data";
}

export interface KPIStats {
    projectInvolvement: number; // 0-100 (Primary Metric)
    presenceScore: number; // 0-100 (Attendance based)
    engagementScore: number; // 0-100 (Activity/Platform usage)
    peerReviewScore: number; // 0-100 (Team feedback)
    qualityScore: number; // 0-100 (Rework/Revision based)
    taskCompletionScore: number; // 0-100 (Rate)
    bonusScore: number; // Extra points
    overallScore: number; // Weighted average
}

export interface UserDocument {
    id: string;
    user_id: string;
    name: string;
    category: 'KTP' | 'NPWP' | 'CV' | 'Diploma' | 'Transcript' | 'Other' | string;
    file_path: string;
    file_type?: string;
    size?: number;
    status: 'Verified' | 'Pending' | 'Missing' | 'Rejected' | string;
    created_at: string;
    updated_at: string;
}

export interface Person {
    id: string;
    id_number?: string;  // 8-digit numeric ID (primary)
    id_code?: string;    // Human-readable ID (derived)
    // Backward compatibility aliases
    system_id?: string;  // @deprecated Use id_number
    display_id?: string; // @deprecated Use id_code
    account_type: AccountType;

    name: string;
    nickname?: string;
    email: string;

    role: PersonRole;
    title: string;
    department: string;
    level?: string;

    status: PersonStatus;
    joinedAt: string;
    join_date?: string;
    type: EmploymentType;
    office?: string;
    schedule_id?: string;
    schedule_name?: string;

    // Contract
    contract_end_date?: string;
    probation_status?: string;

    // History
    history?: {
        id: string;
        title: string;
        event_date: string;
        type: string;
        is_manual?: boolean;
    }[];

    department_id?: string;
    position_id?: string;
    level_id?: string;
    employment_type_id?: string;
    work_status_id?: string;

    avatarUrl?: string;
    initials: string;

    // Module Inclusion Flags
    include_in_timesheet?: boolean;
    include_in_performance?: boolean;
    include_in_attendance?: boolean;
    include_in_people_analytics?: boolean;

    // Personal Data
    birthday?: string; // Kept for compatibility, birth_date preferred
    birth_date?: string;
    nik?: string;

    // Contact
    phone?: string; // Work/Main phone
    personal_email?: string;
    whatsapp?: string;
    phone_number?: string; // Personal phone

    password?: string; // Account Info

    address?: {
        current?: {
            street?: string;
            village?: string;
            district?: string;
            city?: string;
            province?: string;
            postal_code?: string;
            country?: string;
        };
        home?: {
            is_same_as_current?: boolean;
            street?: string;
            village?: string;
            district?: string;
            city?: string;
            province?: string;
            postal_code?: string;
            country?: string;
        };
    };

    emergency_contact?: {
        name?: string;
        phone?: string;
        relation?: string; // User mentioned relation/relationship
    };

    social_links?: {
        linkedin?: string;
        instagram?: string;
        x?: string;
        facebook?: string;
        youtube?: string;
        behance?: string;
        dribbble?: string;
        [key: string]: string | undefined;
    };

    bank_info?: {
        bank_name?: string;
        account_number?: string;
        account_holder?: string;
        is_custom_holder?: boolean;
    };

    // Linked Data
    attendance: AttendanceStats;
    performance: PerformanceStats;
    kpi: KPIStats;
    documents?: UserDocument[];
}
