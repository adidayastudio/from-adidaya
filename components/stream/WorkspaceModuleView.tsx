"use client";

import React, { useState, Suspense } from "react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import {
    CreditCard,
    Package,
    FileText,
    User,
    Clock,
    Users,
    FolderKanban
} from "lucide-react";

import { HeaderProvider } from "@/components/providers/HeaderProvider";
import { FinanceProvider } from "@/components/flow/finance/FinanceContext";
import { ClockProvider } from "@/components/feel/clock/ClockContext";
import FinanceOverviewClient from "@/components/flow/finance/FinanceOverviewClient";
import ResourcesOverviewPage from "@/app/flow/resources/overview/page";
import ReportsOverviewPage from "@/app/flow/reports/overview/page";
import FeelPeoplePage from "@/app/feel/people/page";
import ClockPage from "@/app/feel/clock/page";
import CrewPage from "@/app/feel/crew/page";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { SubTabButton } from "./stream-nav-helpers";

interface WorkspaceModuleViewProps {
    selectedModule: string;
}

const MODULE_CONFIGS: Record<string, { title: string; icon: React.ReactNode; subTabs: { id: string; label: string }[] }> = {
    finance: {
        title: "Finance Workspace",
        icon: <CreditCard className="w-4 h-4 text-amber-500" />,
        subTabs: [
            { id: "overview", label: "Overview" },
            { id: "purchasing", label: "Purchasing" },
            { id: "reimburse", label: "Reimbursements" },
            { id: "petty-cash", label: "Petty Cash" },
            { id: "funding-sources", label: "Funding Sources" },
            { id: "reports", label: "Financial Reports" },
        ]
    },
    resources: {
        title: "Resources Workspace",
        icon: <Package className="w-4 h-4 text-blue-500" />,
        subTabs: [
            { id: "overview", label: "Overview" },
            { id: "materials", label: "Materials" },
            { id: "tools", label: "Tools" },
            { id: "assets", label: "Fleet & Assets" },
            { id: "services", label: "Subcontractors" },
        ]
    },
    reports: {
        title: "Reports Workspace",
        icon: <FileText className="w-4 h-4 text-purple-500" />,
        subTabs: [
            { id: "overview", label: "Hub & Generator" },
            { id: "daily", label: "Daily Log" },
            { id: "weekly", label: "Weekly Progress" },
            { id: "monthly", label: "Monthly Summary" },
            { id: "quality", label: "QA/QC & HSE" },
        ]
    },
    people: {
        title: "People Workspace",
        icon: <User className="w-4 h-4 text-emerald-500" />,
        subTabs: [
            { id: "directory", label: "Directory" },
            { id: "overview", label: "Org Overview" },
            { id: "performance", label: "Performance" },
            { id: "team-culture", label: "Culture" },
            { id: "setup", label: "Setup" },
        ]
    },
    clock: {
        title: "Clock & Attendance",
        icon: <Clock className="w-4 h-4 text-cyan-500" />,
        subTabs: [
            { id: "overview", label: "Overview" },
            { id: "timesheets", label: "Timesheets" },
            { id: "leaves", label: "Leave Requests" },
            { id: "overtime", label: "Overtime" },
            { id: "business-trip", label: "Business Trip" },
            { id: "approvals", label: "Approvals" },
        ]
    },
    crew: {
        title: "Crew & Field Ops",
        icon: <Users className="w-4 h-4 text-rose-500" />,
        subTabs: [
            { id: "directory", label: "Crew Directory" },
            { id: "assignments", label: "Assignments" },
            { id: "daily-input", label: "Daily Log" },
            { id: "payroll", label: "Payroll" },
            { id: "requests", label: "Requests" },
        ]
    }
};

export default function WorkspaceModuleView({ selectedModule }: WorkspaceModuleViewProps) {
    const { theme } = useTheme();
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

    const config = MODULE_CONFIGS[selectedModule] || {
        title: `${selectedModule.toUpperCase()} Workspace`,
        icon: <FolderKanban className="w-4 h-4 text-blue-500" />,
        subTabs: [{ id: "overview", label: "Overview" }]
    };

    const [activeSubTab, setActiveSubTab] = useState(config.subTabs[0]?.id || "overview");

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setIsHeaderScrolled(scrollTop > 10);
    };

    return (
        <HeaderProvider>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Dynamic Floating Liquid Glass Header (Identical to Project Channel Header) */}
                <div className="absolute top-2 left-4 right-4 z-30 pointer-events-auto">
                    <div
                        style={isHeaderScrolled ? {
                            background: theme === "dark"
                                ? "linear-gradient(180deg, rgba(24,24,27,0.88) 0%, rgba(15,15,18,0.78) 100%)"
                                : "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(245,245,250,0.78) 100%)",
                            backdropFilter: "blur(32px) saturate(180%)",
                            WebkitBackdropFilter: "blur(32px) saturate(180%)",
                            border: theme === "dark"
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid rgba(255,255,255,0.7)",
                            boxShadow: theme === "dark"
                                ? "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)"
                                : "0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.9)",
                        } : undefined}
                        className={clsx(
                            "h-13 sm:h-14 px-5 flex items-center justify-between transition-all duration-300 w-full rounded-2xl",
                            !isHeaderScrolled && "bg-transparent border border-transparent shadow-none"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                                {config.icon}
                            </div>
                            <h2 className="text-[14px] font-bold text-neutral-900 dark:text-white truncate">
                                {config.title}
                            </h2>
                        </div>

                        {/* Sub-tabs Header Bar */}
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 shrink-0">
                            {config.subTabs.map(tab => (
                                <SubTabButton
                                    key={tab.id}
                                    active={activeSubTab === tab.id}
                                    onClick={() => setActiveSubTab(tab.id)}
                                    icon={null}
                                    label={tab.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Body with pt-16 so content slides underneath header */}
                <div
                    onScroll={handleScroll}
                    className="flex-1 h-full overflow-y-auto px-6 pt-16 pb-20 scrollbar-hide stream-workspace-ipad"
                >
                    <style>{`
                        .stream-workspace-ipad aside { display: none !important; }
                        .stream-workspace-ipad .lg\\:hidden { display: block !important; }
                    `}</style>
                    <Suspense fallback={<GlobalLoading />}>
                        {selectedModule === "finance" && (
                            <FinanceProvider>
                                <FinanceOverviewClient />
                            </FinanceProvider>
                        )}
                        {selectedModule === "resources" && (
                            <ResourcesOverviewPage />
                        )}
                        {selectedModule === "reports" && (
                            <ReportsOverviewPage />
                        )}
                        {selectedModule === "people" && (
                            <FeelPeoplePage />
                        )}
                        {selectedModule === "clock" && (
                            <ClockProvider>
                                <ClockPage />
                            </ClockProvider>
                        )}
                        {selectedModule === "crew" && (
                            <CrewPage />
                        )}
                        {!["finance", "resources", "reports", "people", "clock", "crew"].includes(selectedModule) && (
                            <div className="space-y-6 max-w-5xl">
                                <h2 className="text-[20px] font-bold capitalize text-neutral-900 dark:text-white">
                                    {selectedModule} Module Overview
                                </h2>
                                <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40">
                                    Operational summary for {selectedModule}.
                                </div>
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>
        </HeaderProvider>
    );
}
