
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { FolderKanban, LayoutDashboard, Activity, Settings, List, Calendar, FileText, BarChart2 } from "lucide-react";

// Define Projects Tabs (matching sidebar)
const PROJECT_TABS = [
    { id: "overview", label: "Overview", href: "/flow/projects", icon: LayoutDashboard },
    { id: "projects", label: "Projects", href: "/flow/projects/list", icon: List },
    { id: "activity", label: "Activity", href: "/flow/projects/activity", icon: Activity },
    { id: "schedule", label: "Schedule", href: "/flow/projects/schedule", icon: Calendar },
    { id: "docs", label: "Docs", href: "/flow/projects/docs", icon: FileText },
    { id: "reports", label: "Reports", href: "/flow/projects/reports", icon: BarChart2 },
    { id: "settings", label: "Settings", href: "/flow/projects/settings", icon: Settings },
];

import { FLOW_APPS } from "@/lib/navigation-config";

export default function ProjectsPageWrapper({
    breadcrumbItems,
    header,
    children,
}: {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                {/* Single-row liquid glass nav bar */}
                <MobileNavBar
                    appName="Projects"
                    appIcon={FolderKanban}
                    parentHref="/flow"
                    parentLabel="Flow"
                    siblingApps={FLOW_APPS}
                    tabs={PROJECT_TABS}
                    accentColor="text-red-500"
                />

                {/* Content with top padding */}
                <div className="pb-32 px-4 pt-20 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={<ProjectsSidebar />}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
