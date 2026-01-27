import {
    FolderKanban,
    Banknote,
    Package,
    User,
    Clock,
    Users,
    Calendar,
    Briefcase,
    Heart,
    Sparkles,
    GraduationCap,
    Share2,
    Globe,
    LucideIcon,
} from "lucide-react";
import { PillTab } from "@/components/layout/MobilePillTabs";
import { SiblingApp } from "@/components/layout/MobileAppHeader";

/* ======================
   FLOW MODE - Level 2 Apps
====================== */
export const FLOW_APPS: SiblingApp[] = [
    { id: "projects", label: "Projects", href: "/flow/projects", icon: FolderKanban },
    { id: "finance", label: "Finance", href: "/flow/finance", icon: Banknote },
    { id: "resources", label: "Resources", href: "/flow/resources", icon: Package },
    { id: "client", label: "Client", href: "/flow/client", icon: User },
];

/* ======================
   FEEL MODE - Level 2 Apps
====================== */
export const FEEL_APPS: SiblingApp[] = [
    { id: "people", label: "People", href: "/feel/people", icon: Heart },
    { id: "clock", label: "Clock", href: "/feel/clock", icon: Clock },
    { id: "crew", label: "Crew", href: "/feel/crew", icon: Users },
    { id: "calendar", label: "Calendar", href: "/feel/calendar", icon: Calendar },
    { id: "career", label: "Career", href: "/feel/career", icon: Briefcase },
    { id: "culture", label: "Culture", href: "/feel/culture", icon: Sparkles },
];

/* ======================
   ALL APPS (Global Switcher)
====================== */
export const ALL_APPS: SiblingApp[] = [...FLOW_APPS, ...FEEL_APPS];

/* ======================
   FRAME MODE - Level 2 Apps
====================== */
export const FRAME_APPS: SiblingApp[] = [
    { id: "website", label: "Website", href: "/frame/website", icon: Globe },
    { id: "social", label: "Social", href: "/frame/social", icon: Share2 },
    { id: "learn", label: "Learn", href: "/frame/learn", icon: GraduationCap },
];

/* ======================
   FINANCE - Level 3 Tabs
====================== */
export const FINANCE_TABS: PillTab[] = [
    { id: "overview", label: "Overview", href: "/flow/finance" },
    { id: "purchasing", label: "Purchasing", href: "/flow/finance/purchasing" },
    { id: "reimburse", label: "Reimburse", href: "/flow/finance/reimburse" },
    { id: "petty-cash", label: "Petty Cash", href: "/flow/finance/petty-cash" },
    { id: "funding", label: "Funding Sources", href: "/flow/finance/funding-sources" },
    { id: "reports", label: "Reports", href: "/flow/finance/reports" },
];

/* ======================
   PROJECTS - Level 3 Tabs
====================== */
export const PROJECTS_TABS: PillTab[] = [
    { id: "list", label: "All Projects", href: "/flow/projects" },
    { id: "schedule", label: "Schedule", href: "/flow/projects/schedule" },
    { id: "wbs", label: "WBS", href: "/flow/projects/wbs" },
];

/* ======================
   CREW - Level 3 Tabs
====================== */
export const CREW_TABS: PillTab[] = [
    { id: "directory", label: "Directory", href: "/feel/crew" },
    { id: "requests", label: "Requests", href: "/feel/crew/requests" },
    { id: "payroll", label: "Payroll", href: "/feel/crew/payroll" },
    { id: "daily", label: "Daily Input", href: "/feel/crew/daily" },
    { id: "assignments", label: "Assignments", href: "/feel/crew/assignments" },
];

/* ======================
   CLOCK - Level 3 Tabs
====================== */
export const CLOCK_TABS: PillTab[] = [
    { id: "today", label: "Today", href: "/feel/clock" },
    { id: "timesheet", label: "Timesheet", href: "/feel/clock/timesheet" },
    { id: "approvals", label: "Approvals", href: "/feel/clock/approvals" },
    { id: "settings", label: "Settings", href: "/feel/clock/settings" },
];

/* ======================
   Helper to get app icon
====================== */
export function getAppIcon(appId: string): LucideIcon {
    const allApps = [...FLOW_APPS, ...FEEL_APPS, ...FRAME_APPS];
    return allApps.find(app => app.id === appId)?.icon || FolderKanban;
}
