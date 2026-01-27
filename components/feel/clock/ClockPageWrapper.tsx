
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import ClockSidebar, { ClockSection } from "@/components/feel/clock/ClockSidebar";
import { FolderKanban, LayoutDashboard, CalendarDays, UserX, Hourglass, Briefcase, CheckSquare, Clock } from "lucide-react";
import { UserRole } from "@/hooks/useUserProfile";

import { FEEL_APPS } from "@/lib/navigation-config";

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

    // Filter tabs for mobile usage if needed (e.g. hide approvals if not admin)
    // For now assuming we match visible items from Sidebar logic in parent or here
    // But MobileNavBar takes simple tabs. Let's just pass all for now or filter if role is passed.

    // Actually, simple static tabs might be better. 

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
                    tabs={CLOCK_TABS}
                    accentColor="text-blue-600"
                />

                {/* Content with top padding */}
                <div className="px-4 pt-20 space-y-4">
                    {/* Header is optional here or part of each section */}
                    {/* For Clock, the header content is usually inside the section components (e.g., ClockOverview) 
                        so we might not render 'header' prop explicitly if it duplicates.
                        But FinancePageWrapper renders it. Let's keep it consistent.
                    */}
                    {header}
                    {children}
                </div>

                {/* Mobile FAB or Actions might be needed if they were in the old sidebar bottom bar */}
                {/* The MobileNavBar replaces the top part. The bottom nav from ClockSidebar might be redundant if we have top tabs.
                    BUT ClockSidebar has the FAB integrated in the bottom bar.
                    If we use top tabs, we might need a floating FAB for the main actions.
                */}
                {fabAction && (
                    <div className="fixed bottom-6 right-4 z-50">
                        <button
                            onClick={fabAction.onClick}
                            className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 text-white ${fabAction.highlight ? "bg-red-500" : "bg-blue-600"}`}
                        >
                            {fabAction.icon}
                        </button>
                    </div>
                )}
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
                    <div className="animate-in fade-in duration-500 pb-24 lg:pb-0">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
