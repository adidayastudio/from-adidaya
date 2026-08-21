"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { useTheme } from "next-themes";
import {
    CreditCard,
    Package,
    FileText,
    User,
    Clock,
    Users,
    FolderKanban,
    Plus,
    Users as TeamIcon,
    User as PersonalIcon,
    ChevronDown,
    Wallet,
    Building2,
    Truck,
    Wrench,
    Calendar,
    ShieldCheck,
    Heart,
    Settings,
    Plane,
    CheckCircle2,
    DollarSign,
    FilePlus
} from "lucide-react";

import { HeaderProvider } from "@/components/providers/HeaderProvider";
import { FinanceProvider } from "@/components/flow/finance/FinanceContext";
import { ClockProvider } from "@/components/feel/clock/ClockContext";
import FinanceOverviewClient from "@/components/flow/finance/FinanceOverviewClient";
import PurchasingPage from "@/app/flow/finance/purchasing/page";
import ReimbursementPage from "@/app/flow/finance/reimburse/page";
import PettyCashPage from "@/app/flow/finance/petty-cash/page";
import FundingSourcesPage from "@/app/flow/finance/funding-sources/page";
import FinancialReportsPage from "@/app/flow/finance/reports/page";
import { NewRequestDrawer } from "@/components/flow/finance/modules/NewRequestDrawer";

import ResourcesOverviewPage from "@/app/flow/resources/overview/page";
import MaterialsPage from "@/app/flow/resources/materials/page";
import ToolsPage from "@/app/flow/resources/tools/page";
import AssetsPage from "@/app/flow/resources/assets/page";
import ServicesPage from "@/app/flow/resources/services/page";

import ReportsOverviewPage from "@/app/flow/reports/overview/page";
import FeelPeoplePage from "@/app/feel/people/page";
import ClockPage from "@/app/feel/clock/page";
import CrewPage from "@/app/feel/crew/page";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { SubTabButton } from "./stream-nav-helpers";

interface WorkspaceModuleViewProps {
    selectedModule: string;
}

interface ModuleConfig {
    title: string;
    icon: React.ReactNode;
    mainTabs: { id: string; label: string }[];
    moreTabs: { id: string; label: string; shortLabel: string; icon: React.ReactNode }[];
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
    finance: {
        title: "Finance Workspace",
        icon: <CreditCard className="w-4 h-4 text-amber-500" />,
        mainTabs: [
            { id: "overview", label: "Overview" },
            { id: "purchasing", label: "Purchasing" },
            { id: "reimburse", label: "Reimbursements" },
        ],
        moreTabs: [
            { id: "petty-cash", label: "Petty Cash", shortLabel: "Petty", icon: <Wallet className="w-3.5 h-3.5 text-amber-500" /> },
            { id: "funding-sources", label: "Funding Sources", shortLabel: "Funds", icon: <Building2 className="w-3.5 h-3.5 text-blue-500" /> },
            { id: "reports", label: "Financial Reports", shortLabel: "Reports", icon: <FileText className="w-3.5 h-3.5 text-purple-500" /> },
        ]
    },
    resources: {
        title: "Resources Workspace",
        icon: <Package className="w-4 h-4 text-blue-500" />,
        mainTabs: [
            { id: "overview", label: "Overview" },
            { id: "materials", label: "Materials" },
            { id: "tools", label: "Tools" },
        ],
        moreTabs: [
            { id: "assets", label: "Fleet & Assets", shortLabel: "Assets", icon: <Truck className="w-3.5 h-3.5 text-emerald-500" /> },
            { id: "services", label: "Subcontractors", shortLabel: "Services", icon: <Wrench className="w-3.5 h-3.5 text-amber-500" /> },
        ]
    },
    reports: {
        title: "Reports Workspace",
        icon: <FileText className="w-4 h-4 text-purple-500" />,
        mainTabs: [
            { id: "overview", label: "Hub" },
            { id: "daily", label: "Daily Log" },
            { id: "weekly", label: "Weekly Progress" },
        ],
        moreTabs: [
            { id: "monthly", label: "Monthly Summary", shortLabel: "Monthly", icon: <Calendar className="w-3.5 h-3.5 text-blue-500" /> },
            { id: "quality", label: "QA/QC & HSE", shortLabel: "HSE", icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> },
        ]
    },
    people: {
        title: "People Workspace",
        icon: <User className="w-4 h-4 text-emerald-500" />,
        mainTabs: [
            { id: "directory", label: "Directory" },
            { id: "overview", label: "Org Overview" },
            { id: "performance", label: "Performance" },
        ],
        moreTabs: [
            { id: "team-culture", label: "Culture", shortLabel: "Culture", icon: <Heart className="w-3.5 h-3.5 text-rose-500" /> },
            { id: "setup", label: "Setup", shortLabel: "Setup", icon: <Settings className="w-3.5 h-3.5 text-neutral-500" /> },
        ]
    },
    clock: {
        title: "Clock & Attendance",
        icon: <Clock className="w-4 h-4 text-cyan-500" />,
        mainTabs: [
            { id: "overview", label: "Overview" },
            { id: "timesheets", label: "Timesheets" },
            { id: "leaves", label: "Leave Requests" },
        ],
        moreTabs: [
            { id: "overtime", label: "Overtime", shortLabel: "Overtime", icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
            { id: "business-trip", label: "Business Trip", shortLabel: "Trips", icon: <Plane className="w-3.5 h-3.5 text-indigo-500" /> },
            { id: "approvals", label: "Approvals", shortLabel: "Approvals", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
        ]
    },
    crew: {
        title: "Crew & Field Ops",
        icon: <Users className="w-4 h-4 text-rose-500" />,
        mainTabs: [
            { id: "directory", label: "Crew Directory" },
            { id: "assignments", label: "Assignments" },
            { id: "daily-input", label: "Daily Log" },
            { id: "payroll", label: "Payroll" },
            { id: "performance", label: "KPI" },
            { id: "requests", label: "Requests" },
        ],
        moreTabs: []
    }
};

export default function WorkspaceModuleView({ selectedModule }: WorkspaceModuleViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const { theme } = useTheme();
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
    const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);

    const config = MODULE_CONFIGS[selectedModule] || {
        title: `${selectedModule.toUpperCase()} Workspace`,
        icon: <FolderKanban className="w-4 h-4 text-blue-500" />,
        mainTabs: [{ id: "overview", label: "Overview" }],
        moreTabs: []
    };

    const [activeSubTab, setActiveSubTab] = useState(() => {
        if (typeof window !== "undefined") {
            const parts = window.location.pathname.split("/");
            if (parts.length >= 4 && parts[1] === "stream" && parts[2] === selectedModule) {
                const pathSubtab = parts[3];
                const currentConfig = MODULE_CONFIGS[selectedModule] || config;
                const isValid = [...(currentConfig.mainTabs || []), ...(currentConfig.moreTabs || [])].some(t => t.id === pathSubtab);
                if (isValid) return pathSubtab;
            }
        }
        const currentConfig = MODULE_CONFIGS[selectedModule] || config;
        return currentConfig.mainTabs[0]?.id || "overview";
    });

    // Reset or update sub-tab when module changes
    useEffect(() => {
        const currentConfig = MODULE_CONFIGS[selectedModule] || config;
        const parts = window.location.pathname.split("/");
        
        let subtab = currentConfig.mainTabs[0]?.id || "overview";
        if (parts.length >= 4 && parts[1] === "stream" && parts[2] === selectedModule) {
            const pathSubtab = parts[3];
            const isValid = [...(currentConfig.mainTabs || []), ...(currentConfig.moreTabs || [])].some(t => t.id === pathSubtab);
            if (isValid) subtab = pathSubtab;
        }
        
        setActiveSubTab(subtab);
        setShowMoreDropdown(false);
    }, [selectedModule]);

    // Sync subtab state to URL path
    useEffect(() => {
        const parts = window.location.pathname.split("/");
        if (parts.length >= 3 && parts[1] === "stream" && parts[2] === selectedModule) {
            const currentSubtab = parts[3] || "";
            if (currentSubtab !== activeSubTab) {
                const params = new URLSearchParams(window.location.search);
                params.delete("subtab"); // Clean up old query param if present
                const finalPath = `/stream/${selectedModule}/${activeSubTab}`;
                const search = params.toString();
                router.replace(search ? `${finalPath}?${search}` : finalPath, { scroll: false });
            }
        }
    }, [activeSubTab, selectedModule, router]);

    useEffect(() => {
        if (viewMode === "personal" && config.moreTabs.some(t => t.id === activeSubTab)) {
            setActiveSubTab(config.mainTabs[0]?.id || "overview");
        }
    }, [viewMode, activeSubTab, config]);

    const showPlusButton = useMemo(() => {
        if (selectedModule === "crew") {
            return ["directory", "assignments", "requests"].includes(activeSubTab);
        }
        if (selectedModule === "reports") return false;
        return true;
    }, [selectedModule, activeSubTab]);

    const plusButtonTitle = useMemo(() => {
        if (selectedModule === "crew") {
            if (activeSubTab === "directory") return "Add Crew";
            if (activeSubTab === "assignments") return "New Assignment";
            if (activeSubTab === "requests") return "Add Request";
        }
        if (selectedModule === "finance") return "New Request";
        if (selectedModule === "resources") return "Add Resource";
        return "Add";
    }, [selectedModule, activeSubTab]);

    const handlePlusClick = () => {
        if (selectedModule === "finance") {
            setIsNewRequestOpen(true);
        } else if (selectedModule === "crew") {
            let fabId = "CREW_ADD";
            if (activeSubTab === "assignments") fabId = "CREW_ASSIGNMENT_NEW";
            else if (activeSubTab === "requests") fabId = "CREW_REQUEST_NEW";
            
            window.dispatchEvent(new CustomEvent("fab-action", { detail: { id: fabId } }));
        } else if (selectedModule === "resources") {
            window.dispatchEvent(new CustomEvent("fab-action", { detail: { id: "RESOURCE_ADD" } }));
        } else if (selectedModule === "clock") {
            let fabId = "CLOCK";
            if (activeSubTab === "leaves") fabId = "CLOCK_NEW_LEAVE";
            else if (activeSubTab === "overtime") fabId = "CLOCK_LOG_OVERTIME";
            else if (activeSubTab === "business-trip") fabId = "CLOCK_NEW_TRIP";
            
            window.dispatchEvent(new CustomEvent("fab-action", { detail: { id: fabId } }));
        } else {
            window.dispatchEvent(new CustomEvent("fab-action"));
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setIsHeaderScrolled(scrollTop > 10);
    };

    // Intercept internal link clicks so user stays inside Stream
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");
        if (anchor) {
            const href = anchor.getAttribute("href");
            if (href && (href.startsWith("/flow/") || href.startsWith("/feel/"))) {
                e.preventDefault();
                e.stopPropagation();
                if (href.includes("purchasing")) setActiveSubTab("purchasing");
                else if (href.includes("reimburse")) setActiveSubTab("reimburse");
                else if (href.includes("petty-cash")) {
                    setViewMode("team");
                    setActiveSubTab("petty-cash");
                }
                else if (href.includes("funding-sources")) {
                    setViewMode("team");
                    setActiveSubTab("funding-sources");
                }
                else if (href.includes("reports")) {
                    setViewMode("team");
                    setActiveSubTab("reports");
                }
                else if (href.includes("materials")) setActiveSubTab("materials");
                else if (href.includes("tools")) setActiveSubTab("tools");
                else if (href.includes("assets")) setActiveSubTab("assets");
                else if (href.includes("services")) setActiveSubTab("services");
                else setActiveSubTab("overview");
            }
        }
    };

    const activeMoreTab = config.moreTabs.find(t => t.id === activeSubTab);

    return (
        <HeaderProvider>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Dynamic Floating Liquid Glass Header */}
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
                            "h-13 sm:h-14 px-3 sm:px-4 flex items-center justify-between transition-all duration-300 w-full rounded-2xl gap-2",
                            !isHeaderScrolled && "bg-transparent border border-transparent shadow-none"
                        )}
                    >
                        {/* Dynamic Module Title */}
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                            <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                                {config.icon}
                            </div>
                            <h2 className="hidden md:inline-block text-[13px] font-bold text-neutral-900 dark:text-white truncate">
                                {config.title}
                            </h2>
                        </div>

                        {/* Primary Main Sub-tabs for the Selected Workspace */}
                        <div className="flex items-center gap-1 shrink-0">
                            {config.mainTabs.map(tab => (
                                <SubTabButton
                                    key={tab.id}
                                    active={activeSubTab === tab.id}
                                    onClick={() => setActiveSubTab(tab.id)}
                                    icon={null}
                                    label={tab.label}
                                />
                            ))}

                            {/* More Dropdown (Only visible in Team View Mode when workspace has moreTabs) */}
                            {viewMode === "team" && config.moreTabs.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                                        className={clsx(
                                            "h-9 flex items-center justify-center gap-1 px-3 rounded-full text-[12px] font-bold transition-all border",
                                            activeMoreTab
                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-xs"
                                                : "bg-transparent text-neutral-600 dark:text-neutral-300 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        <span>
                                            {activeMoreTab?.shortLabel || "More"}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>

                                    {showMoreDropdown && (
                                        <div className="absolute left-0 top-full mt-1.5 w-48 p-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xl z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                                                Team Views
                                            </div>
                                            {config.moreTabs.map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => {
                                                        setActiveSubTab(tab.id);
                                                        setShowMoreDropdown(false);
                                                    }}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-bold text-left transition-colors",
                                                        activeSubTab === tab.id
                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                    )}
                                                >
                                                    {tab.icon}
                                                    <span>{tab.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Top Right Toolbar Controls (ONLY Personal/Team Toggle + Blue + Button) */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Personal / Team Slider Toggle */}
                            {selectedModule !== "crew" && (
                                <div className="h-9 p-0.5 flex items-center rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 backdrop-blur-xl text-[12px] font-bold border border-neutral-300/40 dark:border-neutral-700/40">
                                    <button
                                        onClick={() => setViewMode("personal")}
                                        title="Personal View"
                                        className={clsx(
                                            "flex items-center justify-center gap-1.5 transition-all duration-200 rounded-full h-8",
                                            viewMode === "personal"
                                                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 shadow-xs font-bold"
                                                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white w-8"
                                        )}
                                    >
                                        <PersonalIcon className="w-3.5 h-3.5" />
                                        {viewMode === "personal" && <span>Personal</span>}
                                    </button>
                                    <button
                                        onClick={() => setViewMode("team")}
                                        title="Team View"
                                        className={clsx(
                                            "flex items-center justify-center gap-1.5 transition-all duration-200 rounded-full h-8",
                                            viewMode === "team"
                                                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 shadow-xs font-bold"
                                                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white w-8"
                                        )}
                                    >
                                        <TeamIcon className="w-3.5 h-3.5" />
                                        {viewMode === "team" && <span>Team</span>}
                                    </button>
                                </div>
                            )}

                            {/* Primary Blue Plus Action Button */}
                            {showPlusButton && (
                                <button
                                    onClick={handlePlusClick}
                                    className="h-9 w-9 rounded-full bg-[#0A84FF] hover:bg-blue-600 active:scale-90 text-white flex items-center justify-center shadow-md transition-all shrink-0"
                                    title={plusButtonTitle}
                                >
                                    <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Body with pt-16 so content slides underneath header */}
                <div
                    onScroll={handleScroll}
                    onClick={handleContentClick}
                    className="flex-1 h-full overflow-y-auto px-6 pt-16 pb-20 scrollbar-hide stream-workspace-ipad"
                >
                    {/* Hide duplicate internal sidebars, headers, and sub-tab rows */}
                    <style>{`
                        .stream-workspace-ipad aside { display: none !important; }
                        .stream-workspace-ipad .flex-col.px-5.md\\:px-0 { display: none !important; }
                        .stream-workspace-ipad .hidden.md\\:block.lg\\:hidden.md\\:px-0.pb-2 { display: none !important; }
                        .stream-workspace-ipad h1 { display: none !important; }
                        .stream-workspace-ipad header { display: none !important; }
                        .stream-workspace-ipad .flex-col.gap-1.w-full.mb-4 { display: none !important; }
                    `}</style>

                    <Suspense fallback={<GlobalLoading />}>
                        {/* FINANCE MODULE VIEWS */}
                        {selectedModule === "finance" && (
                            <FinanceProvider>
                                {activeSubTab === "overview" && <FinanceOverviewClient />}
                                {activeSubTab === "purchasing" && <PurchasingPage />}
                                {activeSubTab === "reimburse" && <ReimbursementPage />}
                                {activeSubTab === "petty-cash" && <PettyCashPage />}
                                {activeSubTab === "funding-sources" && <FundingSourcesPage />}
                                {activeSubTab === "reports" && <FinancialReportsPage />}
                            </FinanceProvider>
                        )}

                        {/* RESOURCES MODULE VIEWS */}
                        {selectedModule === "resources" && (
                            <>
                                {activeSubTab === "overview" && <ResourcesOverviewPage />}
                                {activeSubTab === "materials" && <MaterialsPage />}
                                {activeSubTab === "tools" && <ToolsPage />}
                                {activeSubTab === "assets" && <AssetsPage />}
                                {activeSubTab === "services" && <ServicesPage />}
                            </>
                        )}

                        {/* REPORTS MODULE VIEWS */}
                        {selectedModule === "reports" && (
                            <ReportsOverviewPage />
                        )}

                        {/* PEOPLE MODULE VIEWS */}
                        {selectedModule === "people" && (
                            <FeelPeoplePage />
                        )}

                        {/* CLOCK MODULE VIEWS */}
                        {selectedModule === "clock" && (
                            <ClockProvider>
                                <ClockPage />
                            </ClockProvider>
                        )}

                        {/* CREW MODULE VIEWS */}
                        {selectedModule === "crew" && (
                            <CrewPage forcedSection={activeSubTab as any} />
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

                {/* Real Finance New Request Drawer Component */}
                <FinanceProvider>
                    <NewRequestDrawer
                        isOpen={isNewRequestOpen}
                        onClose={() => setIsNewRequestOpen(false)}
                    />
                </FinanceProvider>
            </div>
        </HeaderProvider>
    );
}
