import React, { useMemo, useState, useEffect } from "react";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import CrewMobileHeader from "@/components/feel/crew/CrewMobileHeader";
import { UserRole } from "@/hooks/useUserProfile";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, ClipboardList, CalendarClock, Wallet, TrendingUp, FileCheck, Plus, ListFilter } from "lucide-react";
import { useHeader } from "@/components/providers/HeaderProvider";
import { useUserContext } from "@/components/providers/UserProvider";
import { Button } from "@/shared/ui/primitives/button/button";

interface CrewPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    // Props needed for Sidebar/Mobile Layout
    activeSection: CrewSection;
    onSectionChange: (section: CrewSection) => void;
    role?: UserRole;
    fabAction?: {
        id?: string;
        icon: React.ReactNode;
        onClick: () => void;
        title: string;
        highlight?: boolean;
    };
    // Mobile Header Props
    view?: string;
    onChangeView?: (v: any) => void;
    selectedRole?: string;
    onRoleChange?: (role: string) => void;
    selectedStatus?: string;
    onStatusChange?: (status: string) => void;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
}

export default function CrewPageWrapper({
    breadcrumbItems,
    header,
    children,
    activeSection,
    onSectionChange,
    role,
    fabAction,
    view,
    onChangeView,
    selectedRole,
    onRoleChange,
    selectedStatus,
    onStatusChange,
    searchQuery,
    onSearchChange,
}: CrewPageWrapperProps) {
    const { profile } = useUserContext();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    const CREW_TABS = [
        { id: "directory", label: "Directory", icon: Users },
        { id: "assignments", label: "Assignment", icon: ClipboardList },
        { id: "daily-input", label: "Daily Log", icon: CalendarClock },
        { id: "payroll", label: "Payroll", icon: Wallet },
        { id: "performance", label: "KPI", icon: TrendingUp },
        { id: "requests", label: "Requests", icon: FileCheck },
    ];

    const activeLabel = useMemo(() => {
        const tab = CREW_TABS.find(t => t.id === activeSection);
        return tab?.label || "Crew";
    }, [activeSection]);

    const activeSubtitle = useMemo(() => {
        if (activeSection === "directory") return "Manage your team and track their specialization.";
        if (activeSection === "assignments") return "Track project assignments and crew distribution.";
        if (activeSection === "daily-input") return "Daily activity logs and manpower reporting.";
        if (activeSection === "payroll") return "Review and manage crew financial records.";
        if (activeSection === "performance") return "Monitor crew efficiency and KPI metrics.";
        if (activeSection === "requests") return "Manage leave, overtime, and administrative requests.";
        return "Comprehensive crew management system.";
    }, [activeSection]);

    // INJECT CUSTOM HEADER FOR DESKTOP/IPAD
    const customHeader = useMemo(() => ({
        hideGlobalActions: true,
        middle: (
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-tight">
                {/* Desktop: Show full breadcrumb */}
                <div className="hidden lg:flex items-center gap-1.5 text-neutral-500">
                    <Link href="/feel/crew" className="hover:text-neutral-900 transition-colors">
                        Crew
                    </Link>
                    <span className="opacity-40">{'>'}</span>
                    <span className="text-neutral-900 font-bold">{activeLabel}</span>
                </div>
                {/* iPad: Show only current section */}
                <div className="flex lg:hidden items-center text-neutral-900 dark:text-white font-bold">
                    {activeLabel}
                </div>
            </div>
        ),
        right: (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all border bg-white/60 border-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900 shadow-sm"
                    title="Filters"
                >
                    <ListFilter className="w-4 h-4 stroke-[1.5px]" />
                </button>
                {canManage && (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: fabAction?.id || 'CREW_ADD' } }))}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all pointer-events-auto"
                        title={fabAction?.title || "Add"}
                    >
                        <Plus className="w-4 h-4 cursor-pointer" strokeWidth={2.5} />
                    </button>
                )}
            </div>
        )
    }), [activeSection, activeLabel, canManage, fabAction]);

    // Use a unique key for the content to force re-synchronization if nodes change
    const headerKey = useMemo(() => {
        return `${activeSection}-${activeLabel}-${fabAction?.title}-${isMounted}`;
    }, [activeSection, activeLabel, fabAction?.title, isMounted]);

    useHeader(isMounted ? customHeader : undefined, headerKey);

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <CrewMobileHeader
                    onAddCrew={fabAction?.onClick}
                    backUrl="/dashboard"
                    view={view}
                    onChangeView={onChangeView}
                    selectedRole={selectedRole}
                    onRoleChange={onRoleChange}
                    selectedStatus={selectedStatus}
                    onStatusChange={onStatusChange}
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                />

                <div className="pb-32 px-4 space-y-4">
                    {header}
                    {children}
                </div>

                <CrewSidebar
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    role={role}
                    fabAction={fabAction}
                />
            </div>

            {/* DESKTOP/IPAD LAYOUT - PARITY WITH FINANCE STRUCTURE */}
            <div className="hidden md:block min-h-screen bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={
                    <CrewSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                } isTransparent>
                    <div className="space-y-4 w-full animate-in fade-in duration-500">
                        {/* Header Area */}
                        <div className="flex flex-col md:px-0">
                            <div className="flex flex-col gap-1 w-full mb-4">
                                <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                                    {activeLabel}
                                </h1>
                                <p className="text-[12px] text-neutral-500 font-medium">
                                    {activeSubtitle}
                                </p>
                            </div>
                            {header}
                        </div>

                        {/* Inline Tabs for iPad viewports */}
                        <div className="hidden md:block lg:hidden md:px-0 pb-2">
                            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4">
                                {CREW_TABS.map((tab) => {
                                    const isActive = activeSection === tab.id;
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => onSectionChange(tab.id as any)}
                                            className={clsx(
                                                "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[13px]",
                                                isActive
                                                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                                    : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                            )}
                                        >
                                            <div className="relative z-10 flex items-center gap-2">
                                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                                <span className="text-[13px]">{tab.label}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Page Content */}
                        <div className="md:px-0">
                            {children}
                        </div>
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
