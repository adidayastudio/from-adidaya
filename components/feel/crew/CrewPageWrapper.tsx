
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import { Users, ClipboardList, CalendarClock, Wallet, TrendingUp, FileCheck, HardHat } from "lucide-react";
import { UserRole } from "@/hooks/useUserProfile";

import { FEEL_APPS } from "@/lib/navigation-config";

// Define Crew Tabs matching CrewSidebar logic
// Href uses query params to switch sections
const CREW_TABS = [
    { id: "directory", label: "Directory", href: "/feel/crew?tab=directory", icon: Users },
    { id: "assignments", label: "Assignment", href: "/feel/crew?tab=assignments", icon: ClipboardList },
    { id: "daily-input", label: "Daily Log", href: "/feel/crew?tab=daily-input", icon: CalendarClock },
    { id: "payroll", label: "Payroll", href: "/feel/crew?tab=payroll", icon: Wallet },
    { id: "performance", label: "KPI", href: "/feel/crew?tab=performance", icon: TrendingUp },
    { id: "requests", label: "Requests", href: "/feel/crew?tab=requests", icon: FileCheck },
];

interface CrewPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    // Props needed for Sidebar/Mobile Layout
    activeSection: CrewSection;
    onSectionChange: (section: CrewSection) => void;
    role?: UserRole;
    fabAction?: {
        icon: React.ReactNode;
        onClick: () => void;
        title: string;
        highlight?: boolean;
    };
}

export default function CrewPageWrapper({
    breadcrumbItems,
    header,
    children,
    activeSection,
    onSectionChange,
    role,
    fabAction
}: CrewPageWrapperProps) {

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100 pb-20">
                {/* Single-row liquid glass nav bar */}
                <MobileNavBar
                    appName="Crew"
                    appIcon={HardHat}
                    parentHref="/feel"
                    parentLabel="Feel"
                    siblingApps={FEEL_APPS}
                    tabs={CREW_TABS}
                    accentColor="text-blue-600"
                />

                {/* Content with top padding */}
                <div className="px-4 pt-20 space-y-4">
                    {/* Header if needed */}
                    {header}
                    {children}
                </div>

                {/* Mobile FAB */}
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
                    <CrewSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                }>
                    <div className="flex flex-col h-full pb-28 lg:pb-0">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
