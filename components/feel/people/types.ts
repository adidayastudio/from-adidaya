export type PersonRole = "admin" | "hr" | "supervisor" | "staff" | "intern" | "management";
export type PersonStatus = "Active" | "Inactive" | "On Leave" | "Probation";
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
}

export interface KPIStats {
    projectInvolvement: number; // 0-100 (Primary Metric)
    presenceScore: number; // 0-100 (Attendance based)
    engagementScore: number; // 0-100 (Activity/Platform usage)
    overallScore: number; // Weighted average
}

export interface Person {
    id: string;
    name: string;
    email: string;
    role: PersonRole;
    title: string;
    department: string;
    status: PersonStatus;
    joinedAt: string;
    type: EmploymentType;
    avatarUrl?: string;
    initials: string;

    // Linked Data
    attendance: AttendanceStats;
    performance: PerformanceStats;
    kpi: KPIStats;
}
