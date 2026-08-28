/**
 * MODULE & SUBMODULE DESIGN TOKENS & TAXONOMY
 * Cross-module Activity Timeline + Notification System
 * Standardized Visual Language matching Workspace Cards
 */

export type ParentModule =
    | "stream"
    | "finance"
    | "resources"
    | "reports"
    | "people"
    | "clock"
    | "crew";

export type ActivityEvent =
    | "Created"
    | "Submitted"
    | "Updated"
    | "Revised"
    | "Assigned"
    | "Requested"
    | "Approved"
    | "Rejected"
    | "Completed"
    | "Cancelled"
    | "Received"
    | "Returned"
    | "Paid"
    | "Generated"
    | "Uploaded"
    | "Deleted"
    | "Overdue"
    | "Reminder"
    | "Status Changed";

export interface ModuleToken {
    parentModule: ParentModule;
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    badgeBg: string;
    dotClass: string;
}

export const MODULE_TOKENS: Record<ParentModule, ModuleToken> = {
    stream: {
        parentModule: "stream",
        label: "Stream",
        bgClass: "bg-blue-500/10 dark:bg-blue-500/20",
        textClass: "text-blue-600 dark:text-blue-400",
        borderClass: "border-blue-200/60 dark:border-blue-800/60",
        badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30",
        dotClass: "bg-blue-500",
    },
    finance: {
        parentModule: "finance",
        label: "Finance",
        bgClass: "bg-red-400/15 dark:bg-red-500/20",
        textClass: "text-red-600 dark:text-red-400",
        borderClass: "border-red-200/60 dark:border-red-800/60",
        badgeBg: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20 dark:border-red-500/30",
        dotClass: "bg-red-500",
    },
    resources: {
        parentModule: "resources",
        label: "Resources",
        bgClass: "bg-amber-400/15 dark:bg-amber-500/20",
        textClass: "text-amber-700 dark:text-amber-400",
        borderClass: "border-amber-200/60 dark:border-amber-800/60",
        badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30",
        dotClass: "bg-amber-500",
    },
    reports: {
        parentModule: "reports",
        label: "Reports",
        bgClass: "bg-sky-400/15 dark:bg-sky-500/20",
        textClass: "text-sky-700 dark:text-sky-400",
        borderClass: "border-sky-200/60 dark:border-sky-800/60",
        badgeBg: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/20 dark:border-sky-500/30",
        dotClass: "bg-sky-500",
    },
    people: {
        parentModule: "people",
        label: "People",
        bgClass: "bg-emerald-400/15 dark:bg-emerald-500/20",
        textClass: "text-emerald-700 dark:text-emerald-400",
        borderClass: "border-emerald-200/60 dark:border-emerald-800/60",
        badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30",
        dotClass: "bg-emerald-500",
    },
    clock: {
        parentModule: "clock",
        label: "Clock",
        bgClass: "bg-cyan-400/15 dark:bg-cyan-500/20",
        textClass: "text-cyan-700 dark:text-cyan-400",
        borderClass: "border-cyan-200/60 dark:border-cyan-800/60",
        badgeBg: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30",
        dotClass: "bg-cyan-500",
    },
    crew: {
        parentModule: "crew",
        label: "Crew",
        bgClass: "bg-purple-400/15 dark:bg-purple-500/20",
        textClass: "text-purple-700 dark:text-purple-400",
        borderClass: "border-purple-200/60 dark:border-purple-800/60",
        badgeBg: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30",
        dotClass: "bg-purple-500",
    },
};

// Submodule to Parent Module Mapping
export const SUBMODULE_PARENT_MAP: Record<string, ParentModule> = {
    // Finance Submodules
    Purchasing: "finance",
    Reimburse: "finance",
    "Petty Cash": "finance",
    "Funding Sources": "finance",

    // Resources Submodules
    Materials: "resources",
    Tools: "resources",
    Assets: "resources",
    Services: "resources",

    // Reports Submodules
    Reports: "reports",
    "Daily Report": "reports",
    "Weekly Report": "reports",
    "Monthly Report": "reports",

    // Clock Submodules
    "Daily Log": "clock",
    Leave: "clock",
    Overtime: "clock",
    "Business Trip": "clock",
    "Clock Approval": "clock",

    // Crew Submodules
    Directory: "crew",
    Assignment: "crew",
    "Daily Log Reminder": "crew",
    "Payroll Reminder": "crew",
    "Crew Request": "crew",
    Cashbon: "crew",

    // Stream & Task
    Task: "stream",
    Project: "stream",
    Input: "stream",
    Activity: "stream",
};

/**
 * Get module design token by submodule name or parent module name
 */
export function getModuleToken(submoduleOrParent?: string): ModuleToken {
    if (!submoduleOrParent) return MODULE_TOKENS.stream;

    const parentKey = SUBMODULE_PARENT_MAP[submoduleOrParent] || (submoduleOrParent.toLowerCase() as ParentModule);
    return MODULE_TOKENS[parentKey] || MODULE_TOKENS.stream;
}
