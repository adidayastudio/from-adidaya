
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import ClockSidebar, { ClockSection } from "@/components/feel/clock/ClockSidebar";
import { FolderKanban, LayoutDashboard, CalendarDays, UserX, Hourglass, Briefcase, CheckSquare, Clock } from "lucide-react";
import { UserRole } from "@/hooks/useUserProfile";

import { canViewTeamData } from "@/lib/auth-utils";
import { FEEL_APPS } from "@/lib/navigation-config";
import { ClockProvider } from "./ClockContext";
import ClockMobileViewToggle from "./ClockMobileViewToggle";

// Define Clock Tabs matching ClockSidebar logic
// Href uses query params to switch sections
const CLOCK_TABS = [
    { id: "overview", label: "Overview", href: "/feel/clock", icon: LayoutDashboard },
    { id: "timesheets", label: "Timesheets", href: "/feel/clock?section=timesheets", icon: CalendarDays },
    { id: "leaves", label: "Leave", href: "/feel/clock?section=leaves", icon: UserX },
    { id: "overtime", label: "Overtime", href: "/feel/clock?section=overtime", icon: Hourglass },
    { id: "business-trip", label: "Trip", href: "/feel/clock?section=business-trip", icon: Briefcase },
    { id: "approvals", label: "Approvals", href: "/feel/clock?section=approvals", icon: CheckSquare }, // Logic to hide for non-admin to be handled slightly differently or we show all and let content decide? 
    // MobileNavBar tabs usually show all available, or we need to pass filtered tabs.
];

interface ClockPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    // Props needed for Sidebar/Mobile Layout
    activeSection: ClockSection;
    onSectionChange: (section: ClockSection) => void;
    role?: UserRole;
    fabAction?: {
        icon: React.ReactNode;
        onClick: () => void;
        title: string;
        highlight?: boolean;
    };
}

export default function ClockPageWrapper({
    breadcrumbItems,
    header,
    children,
    activeSection,
    onSectionChange,
    role,
    fabAction
}: ClockPageWrapperProps) {

    // Filter tabs for mobile usage
    const isManager = canViewTeamData(role);
    const filteredTabs = CLOCK_TABS.filter(tab => tab.id !== "approvals" || isManager);

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100 pb-20">
                {/* Single-row liquid glass nav bar */}
                <MobileNavBar
                    appName="Clock"
                    appIcon={Clock}
                    parentHref="/feel"
                    parentLabel="Feel"
                    siblingApps={FEEL_APPS}
                    tabs={filteredTabs}
                    accentColor="text-blue-600"
                />

                {/* Floating Personal/Team toggle */}
                <ClockMobileViewToggle />

                {/* Content with top padding */}
                <div className="pb-32 px-4 pt-20 space-y-4">
                    {/* Header is optional here or part of each section */}
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={
                    <ClockSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                } isTransparent>
                    <div className="animate-in fade-in duration-500 pb-24 lg:pb-0 space-y-6">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
