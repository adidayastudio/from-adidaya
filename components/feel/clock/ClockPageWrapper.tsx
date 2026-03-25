
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import { LiquidMobileHeader } from "@/components/shared/liquid/LiquidMobileHeader";
import ClockSidebar, { ClockSection } from "@/components/feel/clock/ClockSidebar";
import { FolderKanban, LayoutDashboard, CalendarDays, UserX, Hourglass, Briefcase, CheckSquare, Clock } from "lucide-react";
import { UserRole } from "@/hooks/useUserProfile";

import { canViewTeamData } from "@/lib/auth-utils";
import { FEEL_APPS } from "@/lib/navigation-config";
import { ClockProvider } from "./ClockContext";
import ClockMobileViewToggle from "./ClockMobileViewToggle";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
    activeTabId?: string; // Add this to highlight active tab
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

    const isManager = canViewTeamData(role);
    const filteredTabs = CLOCK_TABS.filter(tab => tab.id !== "approvals" || isManager);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100 pb-20">
                {/* Single-row liquid glass nav bar */}
                <LiquidMobileHeader
                    title="Clock"
                    backUrl="/dashboard"
                    tabs={filteredTabs}
                    actions={
                        fabAction ? (
                            <button
                                onClick={fabAction.onClick}
                                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            >
                                {fabAction.icon}
                            </button>
                        ) : undefined
                    }
                />

                {/* Floating Personal/Team toggle */}
                <ClockMobileViewToggle />

                {/* Content */}
                <div className="pb-32 px-4 space-y-4">
                    {/* Header is optional here or part of each section */}
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={
                    <ClockSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                } isTransparent>
                    <div className="animate-in fade-in duration-500 space-y-8 w-full">
                        {header}
                        <div className="hidden items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-2">
                            {filteredTabs.map((tab) => {
                                const isActive = activeSection === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.href}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0",
                                            isActive
                                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                                : "text-neutral-500 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900/40"
                                        )}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={clsx(isActive ? "text-neutral-900 dark:text-white" : "opacity-60")} />
                                        <span className="text-[13px]">{tab.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
