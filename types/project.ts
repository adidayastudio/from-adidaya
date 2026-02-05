/**
 * PROJECT SSOT TYPES
 * Aligned with Supabase schema (workspaces, projects, stages, wbs, rab, schedule)
 */

// ============================================
// WORKSPACE (Multi-tenant)
// ============================================

export interface Workspace {
    id: string;
    slug: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: "owner" | "admin" | "member";
    createdAt: string;
}

// ============================================
// PROJECT
// ============================================

export type ProjectStatus = "active" | "archived" | "on_hold" | "on-track" | "at-risk" | "delayed" | "overloaded" | "completed";
export type ProjectType = "design-only" | "design-build" | "build-only";
export type BuildType = "new" | "renovation";
export type Discipline = "architecture" | "interior" | "structural" | "mep";

export interface ProjectLocation {
    province?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
}

export interface Project {
    id: string;
    workspaceId: string;

    projectCode: string;       // e.g. "PRG", "MBG-LIWA"
    projectNumber: string;     // e.g. "001", "2026-01"
    projectName: string;

    status: ProjectStatus;
    startDate?: string;
    endDate?: string;

    location: ProjectLocation;
    meta: Record<string, any>; // extra fields like type, buildType, disciplines, rabClass, etc.

    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// Helper to get slug
export function getProjectSlug(project: Pick<Project, "projectNumber" | "projectCode">): string {
    return `${project.projectNumber}-${project.projectCode.toLowerCase()}`;
}

// ============================================
// STAGE
// ============================================

export type StageCode = "KO" | "SD" | "DD" | "ED" | "PC" | "CN" | "HO";

export interface ProjectStage {
    id: string;
    projectId: string;

    stageCode: string;         // "SD", "DD", "ED", etc.
    stageName: string;         // "Schematic Design"
    stageNameId?: string;      // Indonesian label
    position: number;
    isActive: boolean;

    startDate?: string;
    endDate?: string;

    createdAt: string;
    updatedAt: string;
}

// Stage template for creating new projects
export interface StageTemplate {
    code: StageCode;
    number: number;
    displayCode: string;       // "01-KO", "02-SD"
    name: string;
    nameId?: string;
    weightDefault: number;
}

export const STAGE_TEMPLATES: Record<ProjectType, StageTemplate[]> = {
    "design-build": [
        { code: "KO", number: 1, displayCode: "01-KO", name: "Kickoff", nameId: "Kickoff", weightDefault: 5.00 },
        { code: "SD", number: 2, displayCode: "02-SD", name: "Schematic Design", nameId: "Desain Skematik", weightDefault: 12.50 },
        { code: "DD", number: 3, displayCode: "03-DD", name: "Design Development", nameId: "Pengembangan Desain", weightDefault: 17.50 },
        { code: "ED", number: 4, displayCode: "04-ED", name: "Engineering Design", nameId: "Desain Rekayasa", weightDefault: 22.50 },
        { code: "PC", number: 5, displayCode: "05-PC", name: "Procurement", nameId: "Pengadaan", weightDefault: 12.50 },
        { code: "CN", number: 6, displayCode: "06-CN", name: "Construction", nameId: "Konstruksi", weightDefault: 25.00 },
        { code: "HO", number: 7, displayCode: "07-HO", name: "Handover", nameId: "Serah Terima", weightDefault: 5.00 },
    ],
    "design-only": [
        { code: "KO", number: 1, displayCode: "01-KO", name: "Kickoff", nameId: "Kickoff", weightDefault: 5.00 },
        { code: "SD", number: 2, displayCode: "02-SD", name: "Schematic Design", nameId: "Desain Skematik", weightDefault: 20.65 },
        { code: "DD", number: 3, displayCode: "03-DD", name: "Design Development", nameId: "Pengembangan Desain", weightDefault: 28.91 },
        { code: "ED", number: 4, displayCode: "04-ED", name: "Engineering Design", nameId: "Desain Rekayasa", weightDefault: 37.17 },
        { code: "HO", number: 5, displayCode: "05-HO", name: "Handover", nameId: "Serah Terima", weightDefault: 8.26 },
    ],
    "build-only": [
        { code: "KO", number: 1, displayCode: "01-KO", name: "Kickoff", nameId: "Kickoff", weightDefault: 5.00 },
        { code: "PC", number: 2, displayCode: "02-PC", name: "Procurement", nameId: "Pengadaan", weightDefault: 27.94 },
        { code: "CN", number: 3, displayCode: "03-CN", name: "Construction", nameId: "Konstruksi", weightDefault: 55.88 },
        { code: "HO", number: 4, displayCode: "04-HO", name: "Handover", nameId: "Serah Terima", weightDefault: 11.18 },
    ],
};

export function getStagesForProjectType(type: ProjectType): StageTemplate[] {
    return STAGE_TEMPLATES[type] || STAGE_TEMPLATES["design-build"];
}

// ============================================
// WBS (Work Breakdown Structure)
// ============================================

export interface WBSItem {
    id: string;
    projectId?: string;
    stageId?: string;
    parentId?: string;

    wbsCode?: string;          // SSOT: "S", "S.1", "S.1.1" (DB format)
    code?: string;             // UI format alias for wbsCode
    title?: string;            // main title (Indonesian)
    titleEn?: string;          // English title
    nameEn?: string;           // UI format English name
    nameId?: string;           // UI format Indonesian name

    level?: number;            // 0, 1, 2...
    position?: number;         // sibling ordering
    isLeaf?: boolean;

    quantity?: number;
    unit?: string;             // "m2", "ls", etc.
    unitPrice?: number;        // for estimates

    notes?: string;
    meta?: Record<string, any>;

    createdAt?: string;
    updatedAt?: string;

    children?: WBSItem[];      // for tree structure (computed)
}

export const WBS_DISCIPLINES = ["S", "A", "M", "I", "L"] as const;
export type WBSDiscipline = typeof WBS_DISCIPLINES[number];

// ============================================
// RAB (Rencana Anggaran Biaya)
// ============================================

export type PricingMode = "ballpark" | "estimates" | "detail";
export type RABClass = "A" | "B" | "C" | "D";

export interface RABVersion {
    id: string;
    projectId: string;
    stageId?: string;

    name: string;
    versionNo: number;

    pricingMode: PricingMode;
    currency: string;

    rf?: number;               // regional factor
    df?: number;               // difficulty factor
    buildingClass?: RABClass;

    isLocked: boolean;
    notes?: string;

    createdBy?: string;
    createdAt: string;
}

export interface RABItem {
    id: string;
    projectId: string;
    rabVersionId: string;
    wbsItemId: string;

    unit?: string;
    qty: number;
    unitPrice: number;
    subtotal: number;          // computed: qty * unitPrice

    materialCost?: number;
    laborCost?: number;
    equipmentCost?: number;

    notes?: string;
    meta: Record<string, any>;

    createdAt: string;
    updatedAt: string;
}

// ============================================
// SCHEDULE
// ============================================

export type CalendarMode = "weekly" | "daily";
export type DependencyType = "FS" | "SS" | "FF" | "SF";

export interface ScheduleVersion {
    id: string;
    projectId: string;
    stageId?: string;

    name: string;
    versionNo: number;

    calendarMode: CalendarMode;
    isLocked: boolean;
    notes?: string;

    createdBy?: string;
    createdAt: string;
}

export interface ScheduleTask {
    id: string;
    projectId: string;
    scheduleVersionId: string;
    wbsItemId?: string;

    name: string;
    description?: string;

    startDate?: string;
    endDate?: string;
    durationDays?: number;

    progress: number;          // 0-100
    weight?: number;           // for S-curve
    position: number;

    createdAt: string;
    updatedAt: string;
}

export interface ScheduleDependency {
    id: string;
    projectId: string;
    scheduleVersionId: string;
    predecessorTaskId: string;
    successorTaskId: string;
    depType: DependencyType;
    lagDays: number;
    createdAt: string;
}

// ============================================
// TASKS (Work Management)
// ============================================

export type TaskStatus = "todo" | "doing" | "done" | "blocked";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface ProjectTask {
    id: string;
    projectId: string;
    stageId?: string;
    wbsItemId?: string;

    title: string;
    description?: string;

    status: TaskStatus;
    priority: TaskPriority;
    dueAt?: string;

    assigneeId?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// DOCS
// ============================================

export type DocType = "file" | "link" | "note";

export interface ProjectDoc {
    id: string;
    projectId: string;
    stageId?: string;
    wbsItemId?: string;

    title: string;
    docType: DocType;
    url?: string;
    storagePath?: string;
    content?: string;

    tags: string[];

    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// REPORTS (Manual Tracking)
// ============================================

export type ReportStatus = "on-track" | "delayed" | "critical" | "completed";

export interface ProjectReport {
    id: string;
    projectId: string;

    title: string;
    reportDate: string; // ISO Date "YYYY-MM-DD"

    progress: number; // 0-100 manual estimate
    status: ReportStatus;

    manpowerCount?: number;
    weatherCondition?: string; // e.g. "Sunny", "Rainy"

    content?: string; // Markdown supported

    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
