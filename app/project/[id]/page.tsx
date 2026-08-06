"use client";

import { useEffect, useState, use } from "react";
import { fetchProject, updateProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import { 
    ChevronLeft, 
    ChevronRight, 
    Star, 
    Pencil, 
    Settings, 
    FileText, 
    Activity, 
    Target, 
    Plus, 
    CheckCircle2, 
    CreditCard, 
    X, 
    Calendar, 
    Filter, 
    User, 
    AlertTriangle,
    MapPin,
    Briefcase,
    Clock,
    FileUp,
    MessageSquare,
    ClipboardList,
    ThumbsUp,
    Layers,
    Grid3X3,
    DollarSign,
    ShieldCheck,
    ExternalLink,
    Users,
    Package,
    Banknote,
    Receipt,
    Wallet,
    ChevronDown,
    FileSpreadsheet,
    LayoutDashboard,
    Info,
    Construction,
    Calculator
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useHeader } from "@/components/providers/HeaderProvider";
import { AnimatePresence, motion } from "framer-motion";
import PageWrapper from "@/components/layout/PageWrapper";

// Embedded Tab Components (loaded inline, no nested page wrappers)
import dynamic from "next/dynamic";
const ResourcesOverviewEmbed = dynamic(() => import("@/app/flow/resources/overview/page"), { ssr: false });
const MaterialsPage = dynamic(() => import("@/app/flow/resources/materials/page"), { ssr: false });
const ToolsPage = dynamic(() => import("@/app/flow/resources/tools/page"), { ssr: false });
const AssetsPage = dynamic(() => import("@/app/flow/resources/assets/page"), { ssr: false });
const ServicesPage = dynamic(() => import("@/app/flow/resources/services/page"), { ssr: false });

const PurchasingClient = dynamic(() => import("@/components/flow/finance/PurchasingClient"), { ssr: false });
const ReimburseClient = dynamic(() => import("@/components/flow/finance/ReimburseClient"), { ssr: false });
const PettyCashClient = dynamic(() => import("@/components/flow/finance/PettyCashClient"), { ssr: false });
const ReportsClient = dynamic(() => import("@/components/flow/finance/ReportsClient"), { ssr: false });

import { CrewDirectory } from "@/components/feel/crew/CrewDirectory";
import { CrewAssignments } from "@/components/feel/crew/CrewAssignments";
import { CrewDailyInput } from "@/components/feel/crew/CrewDailyInput";
import { CrewPayroll } from "@/components/feel/crew/CrewPayroll";
import { CrewPerformance } from "@/components/feel/crew/CrewPerformance";
import { CrewRequests } from "@/components/feel/crew/CrewRequests";
import { FinanceProvider } from "@/components/flow/finance/FinanceContext";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "@/components/flow/finance/FinanceSummaryCard";
import { FinancePulseBeta } from "@/components/flow/finance/FinancePulseBeta";
import { fetchFinanceDashboardData } from "@/lib/client/finance-api";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { ProjectProvider } from "@/components/flow/project-context";
import { fetchPeopleDirectory } from "@/lib/api/people";
import GlobalDirectory from "@/components/feel/people/GlobalDirectory";
import ProjectDetailDocsContent from "@/components/flow/projects/project-detail/docs/ProjectDetailDocsContent";

import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";

// Custom Local Sidebar Component for Desktop
function ProjectDetailLocalSidebar({
    activeTab,
    setActiveTab,
    projectId,
    router
}: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    projectId: string;
    router: any;
}) {
    const pathname = usePathname();
    const [planningOpen, setPlanningOpen] = useState(false);

    const basePath = `/project/${projectId}`;

    const PLANNING_ITEMS = [
        { label: "Project Information", href: `${basePath}/setup/info`, icon: Info },
        { label: "Stages & Tasks", href: `${basePath}/setup/stages`, icon: Layers },
        { label: "WBS", href: `${basePath}/setup/wbs`, icon: Grid3X3 },
        { label: "Volume Calc", href: `${basePath}/setup/volume-calc`, icon: Calculator },
        { label: "RAB", href: `${basePath}/setup/rab`, icon: DollarSign },
        { label: "Schedule", href: `${basePath}/setup/schedule`, icon: Calendar },
    ];

    const isRouteActive = (href: string, exact = false) => {
        const cleanPath = (pathname || "").split("?")[0].replace(/\/$/, "");
        const cleanHref = (href || "").split("?")[0].replace(/\/$/, "");

        const pathSub = cleanPath.replace(/^\/(flow\/projects|project)\/[^\/]+/, "");
        const hrefSub = cleanHref.replace(/^\/(flow\/projects|project)\/[^\/]+/, "");

        if (pathSub && hrefSub) {
            if (pathSub === hrefSub) return true;
            if (pathSub.startsWith(hrefSub)) return true;
            if ((pathSub.includes('setup/info') || pathSub.includes('settings/general')) && (hrefSub.includes('setup/info') || hrefSub.includes('settings/general'))) return true;
            return false;
        }

        if (exact) return cleanPath === cleanHref;
        return cleanPath.startsWith(cleanHref);
    };

    const isPlanningRoute = pathname ? (pathname.includes('/setup') || pathname.includes('/settings')) : false;

    useEffect(() => {
        if (isPlanningRoute) setPlanningOpen(true);
    }, [isPlanningRoute]);

    const [workOpen, setWorkOpen] = useState(false);

    return (
        <aside className="w-full hidden lg:flex flex-col space-y-4 pt-0">
            <div className="space-y-0.5">
                {/* Overview */}
                <button
                    onClick={() => setActiveTab("overview")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "overview" && !isPlanningRoute
                            ? "text-neutral-900 dark:text-white bg-neutral-900/10 dark:bg-white/15 font-extrabold shadow-sm border border-neutral-300/60"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-neutral-800/40 hover:text-neutral-900 font-medium"
                    )}
                >
                    <LayoutDashboard className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "overview" && !isPlanningRoute ? "text-neutral-900 dark:text-white" : "text-neutral-500")} />
                    <span className="truncate">Overview</span>
                </button>

                {/* Planning Accordion */}
                <div>
                    <button
                        onClick={() => setPlanningOpen((v) => !v)}
                        className={clsx(
                            "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5 font-medium",
                            isPlanningRoute ? "text-neutral-900 dark:text-white font-extrabold" : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 hover:text-neutral-900"
                        )}
                    >
                        <Calendar className={clsx("w-4 h-4 shrink-0 transition-colors", isPlanningRoute ? "text-neutral-900 dark:text-white" : "text-neutral-500")} />
                        <span className="flex-1 truncate">Planning</span>
                        <ChevronDown
                            className={clsx("w-3.5 h-3.5 text-neutral-400 transition-transform duration-200", planningOpen && "rotate-180")}
                        />
                    </button>

                    {planningOpen && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-neutral-300 dark:border-neutral-700 pl-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            {PLANNING_ITEMS.map((item) => {
                                const active = isRouteActive(item.href, true);
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={clsx(
                                            "w-full text-left rounded-lg text-[11px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                            active
                                                ? "text-neutral-900 dark:text-white bg-neutral-900/10 dark:bg-white/15 font-extrabold shadow-sm border border-neutral-300/60"
                                                : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 hover:text-neutral-900 font-medium"
                                        )}
                                    >
                                        <item.icon className={clsx("w-3.5 h-3.5 shrink-0 transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-500")} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Work Accordion */}
                <div>
                    <button
                        onClick={() => setWorkOpen((v) => !v)}
                        className="w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5 text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    >
                        <Activity className="w-4 h-4 shrink-0 text-neutral-400" />
                        <span className="flex-1 truncate">Work</span>
                        <ChevronDown
                            className={clsx("w-3.5 h-3.5 text-neutral-400 transition-transform duration-200", workOpen && "rotate-180")}
                        />
                    </button>

                    {workOpen && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 dark:border-neutral-800 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                                onClick={() => setActiveTab("tracking")}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[11px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeTab === "tracking"
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold"
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <Target className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                                <span className="truncate">Tracking</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("activity")}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[11px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeTab === "activity"
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold"
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <Activity className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                                <span className="truncate">Activity</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Documents */}
                <button
                    onClick={() => setActiveTab("document")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "document"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <FileText className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "document" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate font-medium">Documents</span>
                </button>

                {/* Finance */}
                <button
                    onClick={() => setActiveTab("finance")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "finance"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <Banknote className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "finance" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate">Finance</span>
                </button>

                {/* Resources */}
                <button
                    onClick={() => setActiveTab("resources")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "resources"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <Package className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "resources" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate">Resources</span>
                </button>

                {/* People */}
                <button
                    onClick={() => setActiveTab("people")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "people"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <Users className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "people" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate">People</span>
                </button>

                {/* Crew */}
                <button
                    onClick={() => setActiveTab("crew")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "crew"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <ClipboardList className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "crew" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate">Crew</span>
                </button>

                {/* Reports */}
                <button
                    onClick={() => setActiveTab("reports")}
                    className={clsx(
                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                        activeTab === "reports"
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                    )}
                >
                    <FileSpreadsheet className={clsx("w-4 h-4 shrink-0 transition-colors", activeTab === "reports" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                    <span className="truncate font-medium">Reports</span>
                </button>
            </div>
        </aside>
    );
}

// ==========================================
// EMBEDDED SUB-COMPONENTS (NO NESTED WRAPPERS)
// ==========================================

/** Finance: renders summary cards + pulse inline with sub-tabs */
function ProjectFinanceEmbed({ projectId }: { projectId: string }) {
    const [subTab, setSubTab] = useState("overview");
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const wsId = await fetchDefaultWorkspaceId();
                const res = await fetchFinanceDashboardData(wsId || undefined, projectId);
                setData(res);
            } catch (err) {
                console.error("Failed to load finance data", err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [projectId]);

    const subTabs = [
        { id: "overview", label: "Overview" },
        { id: "purchasing", label: "Purchasing" },
        { id: "reimburse", label: "Reimburse" },
        { id: "petty-cash", label: "Petty Cash" },
        { id: "reports", label: "Reports" },
    ];

    if (isLoading || !data) {
        return <div className="py-12 flex justify-center"><GlobalLoading /></div>;
    }

    const summary = data.summary?.team || data.summary?.personal;

    return (
        <FinanceProvider>
            <div className="animate-in fade-in duration-300 pb-12 space-y-4">
                {/* Finance Sub-Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
                    {subTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id)}
                            className={clsx(
                                "px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all select-none shrink-0",
                                subTab === tab.id
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Sub-Tab Contents */}
                {subTab === "overview" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <FinanceSummaryCardsRow>
                            <FinanceSummaryCard
                                icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                                iconBg="bg-emerald-100"
                                label="Total Paid (Month)"
                                value={summary?.totalPaid ? `Rp ${(summary.totalPaid / 1000000).toFixed(1)}M` : "Rp 0"}
                                subtext="This period"
                            />
                            <FinanceSummaryCard
                                icon={<Receipt className="w-4 h-4 text-orange-600" />}
                                iconBg="bg-orange-100"
                                label="Outstanding"
                                value={summary?.outstanding?.count || 0}
                                subtext="Pending approval"
                            />
                            <FinanceSummaryCard
                                icon={<Users className="w-4 h-4 text-blue-600" />}
                                iconBg="bg-blue-100"
                                label="Reimburse Pending"
                                value={summary?.reimbursePending?.count || 0}
                                subtext="Claims to process"
                            />
                            <FinanceSummaryCard
                                icon={<Wallet className="w-4 h-4 text-purple-600" />}
                                iconBg="bg-purple-100"
                                label="Balance"
                                value={summary?.balance?.accounts ? `${summary.balance.accounts} Acc` : "0 Acc"}
                                subtext="Active accounts"
                            />
                        </FinanceSummaryCardsRow>

                        <FinancePulseBeta pulseData={data?.pulse} />
                    </div>
                )}

                {subTab === "purchasing" && <PurchasingClient />}
                {subTab === "reimburse" && <ReimburseClient />}
                {subTab === "petty-cash" && <PettyCashClient />}
                {subTab === "reports" && <ReportsClient />}
            </div>
        </FinanceProvider>
    );
}

/** Resources: renders tabbed resources views inline with sub-tabs */
function ProjectResourcesEmbed() {
    const [resTab, setResTab] = useState("overview");
    const resTabs = [
        { id: "overview", label: "Overview" },
        { id: "materials", label: "Materials" },
        { id: "tools", label: "Tools" },
        { id: "assets", label: "Assets" },
        { id: "services", label: "Services" },
    ];

    return (
        <div className="animate-in fade-in duration-300 pb-12 space-y-4">
            {/* Resources Sub-Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
                {resTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setResTab(tab.id)}
                        className={clsx(
                            "px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all select-none shrink-0",
                            resTab === tab.id
                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Resources Tab Content */}
            {resTab === "overview" && <ResourcesOverviewEmbed />}
            {resTab === "materials" && <MaterialsPage />}
            {resTab === "tools" && <ToolsPage />}
            {resTab === "assets" && <AssetsPage />}
            {resTab === "services" && <ServicesPage />}
        </div>
    );
}

/** People: renders GlobalDirectory inline */
function ProjectPeopleEmbed() {
    const [people, setPeople] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPeopleDirectory();
                setPeople(data);
            } catch (error) {
                console.error("Failed to load people directory", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="py-12 flex justify-center"><GlobalLoading /></div>;
    }

    return (
        <div className="animate-in fade-in duration-300 pb-12">
            <GlobalDirectory people={people} role="admin" triggerAddPerson={0} />
        </div>
    );
}

/** Crew: renders tabbed crew views inline */
function ProjectCrewEmbed() {
    const [crewTab, setCrewTab] = useState("directory");
    const crewTabs = [
        { id: "directory", label: "Directory" },
        { id: "assignments", label: "Assignments" },
        { id: "daily-input", label: "Daily Log" },
        { id: "payroll", label: "Payroll" },
        { id: "performance", label: "Performance" },
        { id: "requests", label: "Requests" },
    ];

    return (
        <div className="animate-in fade-in duration-300 pb-12 space-y-4">
            {/* Crew Sub-Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
                {crewTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setCrewTab(tab.id)}
                        className={clsx(
                            "px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all select-none shrink-0",
                            crewTab === tab.id
                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Crew Tab Content */}
            {crewTab === "directory" && <CrewDirectory role="admin" />}
            {crewTab === "assignments" && <CrewAssignments role="admin" />}
            {crewTab === "daily-input" && <CrewDailyInput role="admin" />}
            {crewTab === "payroll" && <CrewPayroll role="admin" />}
            {crewTab === "performance" && <CrewPerformance role="admin" />}
            {crewTab === "requests" && <CrewRequests role="admin" />}
        </div>
    );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") || "overview";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isFav, setIsFav] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();

    // Activity Feed Filter State
    const [filterCategory, setFilterCategory] = useState("all");
    const [filterPIC, setFilterPIC] = useState("all");
    const [filterStage, setFilterStage] = useState("all");

    // Drawer Form State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editCode, setEditCode] = useState("");
    const [editClient, setEditClient] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editCoverUrl, setEditCoverUrl] = useState("");

    // Listen to media query to toggle headers dynamically
    useEffect(() => {
        const media = window.matchMedia("(max-w: 1023px)");
        setIsMobile(media.matches);
        const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const scroll = window.scrollY;
            setIsScrolled(scroll > 40);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        async function load() {
            const data = await fetchProject(id);
            setProject(data);
            if (data?.meta?.isFavorite) {
                setIsFav(true);
            }
            if (data) {
                setEditName(data.projectName || "");
                setEditCode(data.projectCode || "");
                setEditClient(data.meta?.clientName || "");
                setEditCity(data.location?.city || "");
                setEditCoverUrl(data.meta?.coverUrl || "");
            }
            setLoading(false);
        }
        load();
    }, [id]);

    const toggleFavorite = async () => {
        if (!project || isUpdating) return;

        setIsUpdating(true);
        const newFavStatus = !isFav;
        const newMeta = { ...(project.meta || {}), isFavorite: newFavStatus };

        const success = await updateProject(project.id, { meta: newMeta });

        if (success) {
            setIsFav(newFavStatus);
            setProject({ ...project, meta: newMeta });
        }
        setIsUpdating(false);
    };
 
    const handleUpdateProject = async () => {
        if (!project || isUpdating) return;
        setIsUpdating(true);

        const newMeta = { 
            ...(project.meta || {}), 
            clientName: editClient,
            coverUrl: editCoverUrl 
        };
        const newLocation = { ...(project.location || {}), city: editCity };

        const success = await updateProject(project.id, {
            projectName: editName,
            projectCode: editCode,
            meta: newMeta,
            location: newLocation
        });

        if (success) {
            setProject({
                ...project,
                projectName: editName,
                projectCode: editCode,
                meta: newMeta,
                location: newLocation
            });
            setIsEditOpen(false);
        } else {
            alert("Failed to update project details.");
        }
        setIsUpdating(false);
    };

    // HEADER INJECTION (Desktop Only)
    useHeader({
        hideGlobalActions: true,
        middle: project ? (
            <div className="hidden lg:flex items-center gap-2 pointer-events-auto text-[11px] font-bold text-neutral-800 dark:text-neutral-200 animate-in fade-in duration-300">
                <span className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => router.push("/project")}>Projects</span>
                <ChevronRight size={10} className="text-neutral-400 dark:text-neutral-500 opacity-60" />
                <span className="truncate max-w-[200px]">{project.projectName}</span>
            </div>
        ) : undefined,
        right: (
            <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-full border border-white/20 dark:border-neutral-700/20 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl shadow-sm pointer-events-auto transition-all">
                <button
                    onClick={toggleFavorite}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-neutral-700/60 active:scale-95 transition-all shrink-0"
                >
                    <Star
                        size={15}
                        className={clsx(isFav ? "text-[#FFC107] fill-[#FFC107]" : "text-neutral-700 dark:text-neutral-300")}
                        strokeWidth={isFav ? 2 : 1.5}
                    />
                </button>
                <button
                    onClick={() => setIsEditOpen(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-neutral-700/60 active:scale-95 transition-all shrink-0"
                >
                    <Pencil size={14} className="text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </button>
                <button
                    onClick={() => router.push(`/project/${id}/setup`)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-neutral-700/60 active:scale-95 transition-all shrink-0"
                >
                    <Settings size={15} className="text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </button>
            </div>
        )
    }, [project, isFav, isMobile, router, id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F6F6] dark:bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-[#F6F6F6] dark:bg-black p-6">
                <h2 className="text-xl font-bold mb-2 dark:text-white">Project Not Found</h2>
                <button onClick={() => router.back()} className="text-[#0A84FF] font-medium">Go Back</button>
            </div>
        );
    }

    const progress = project.meta?.progress || 0;
    const locationText = project.location?.city || "Location";

    let stageCode = "SD";
    if (progress > 30) stageCode = "DD";
    if (progress > 60) stageCode = "CD";

    // Dynamic color tags based on project status
    const statusDetails = {
        "active": { label: "Active", style: "bg-green-500/10 text-green-600 dark:text-green-400" },
        "on-track": { label: "On Track", style: "bg-green-500/10 text-green-600 dark:text-green-400" },
        "at-risk": { label: "At Risk", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
        "delayed": { label: "Delayed", style: "bg-red-500/10 text-red-600 dark:text-red-400" },
        "completed": { label: "Completed", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
        "on_hold": { label: "On Hold", style: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400" }
    };
    const currentStatus = statusDetails[project.status as keyof typeof statusDetails] || { label: project.status, style: "bg-neutral-500/10 text-neutral-600" };
    const projectForComponents = {
        id: project.id,
        projectNo: project.projectNumber,
        code: project.projectCode,
        name: project.projectName,
        status: project.status,
        stage: stageCode,
        progress: progress,
        type: project.meta?.type ?? "design-build",
        client: project.meta?.clientName,
        city: locationText,
    };

    const innerTabs = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "tracking", label: "Tracking", icon: Target },
        { id: "document", label: "Document", icon: FileText },
        { id: "finance", label: "Finance", icon: Banknote },
        { id: "crew", label: "Crew", icon: ClipboardList },
        { id: "resources", label: "Resources", icon: Package },
        { id: "people", label: "People", icon: Users },
        { id: "reports", label: "Reports", icon: FileSpreadsheet },
    ];

    // Mock Data for Activities
    const rawActivities = [
        { id: 1, type: "task", title: "Verify Foundation Rebar Alignment", pic: "Andi Prasetya", stage: "Construction", date: "2026-07-14", content: "Site inspection task created for structure crew." },
        { id: 2, type: "daily_log", title: "Daily Construction Log - Week 24", pic: "Yudi P.", stage: "Construction", date: "2026-07-14", content: "Slab pouring complete in Zone 1. Weather: Clear, slight rain at 4 PM." },
        { id: 3, type: "meeting", title: "Schematic Signoff Coordination", pic: "Budi Santoso", stage: "Schematic Design", date: "2026-07-13", content: "Reviewed layout options with client. Minor adjustment to kitchen layout approved." },
        { id: 4, type: "docs", title: "Structure Engineering Plan (REV_2)", pic: "Hendra K.", stage: "Design Development", date: "2026-07-12", content: "Uploaded PDF sheet detailing structural steel joints." },
        { id: 5, type: "progress", title: "CD Progress weightage updated", pic: "System", stage: "Construction", date: "2026-07-11", content: "Progress increased by 2.6% due to foundation completion." },
        { id: 6, type: "approval", title: "Material Submittal: Granite Tile Grade A", pic: "Yudi P.", stage: "Procurement", date: "2026-07-10", content: "Approved Granite tiles purchase request from supplier Indah Jaya." },
        { id: 7, type: "notes", title: "Site Obstruction Note", pic: "Rendi A.", stage: "Construction", date: "2026-07-09", content: "Access path blocked temporarily by neighboring excavation crew." }
    ];

    // Filter Activities
    const filteredActivities = rawActivities.filter(act => {
        if (filterCategory !== "all" && act.type !== filterCategory) return false;
        if (filterPIC !== "all" && act.pic !== filterPIC) return false;
        if (filterStage !== "all" && act.stage !== filterStage) return false;
        return true;
    });

    const categoryIcons = {
        task: ClipboardList,
        daily_log: Clock,
        meeting: MessageSquare,
        docs: FileUp,
        progress: Target,
        approval: ThumbsUp,
        notes: FileText
    };

    return (
        <ProjectProvider projectId={id}>
            <div className="min-h-screen bg-transparent pb-24 pt-0">
            {/* Top Navigation Bar - Fixed (Mobile Only) */}
            <div
                className={clsx(
                    "lg:hidden fixed top-0 inset-x-0 z-50 transition-all duration-300 px-5 flex flex-col",
                    isScrolled ? "h-[80px] pt-6" : "h-[100px] pt-8"
                )}
            >
                {/* Background Mask/Blur when scrolled */}
                <div
                    className={clsx(
                        "absolute inset-0 z-[-1] transition-opacity duration-300 pointer-events-none",
                        isScrolled ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="absolute inset-x-0 top-[-120px] h-[240px] bg-[#F6F6F6]/60 dark:bg-[#121212]/60 backdrop-blur-2xl"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        }}
                    />
                </div>

                <div className="flex items-center justify-between relative z-[51]">
                    {/* Back Button Container */}
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border transition-all duration-300",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05]"
                            : "bg-white/70 dark:bg-black/50 backdrop-blur-md border-white/40 dark:border-white/10"
                    )}>
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={20} className="text-neutral-900 dark:text-white" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Minimized Title (Only on scroll) */}
                    <h1
                        className={clsx(
                            "font-bold text-neutral-900 dark:text-white tracking-tight leading-none transition-all duration-300 ease-in-out absolute left-1/2 -translate-x-1/2 w-max max-w-[50%] text-center line-clamp-1",
                            isScrolled ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                        )}
                    >
                        {project.projectName}
                    </h1>

                    {/* Toolbar */}
                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border transition-all duration-300 z-[52]",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05] scale-90"
                            : "bg-white/70 dark:bg-black/50 backdrop-blur-md border-white/40 dark:border-white/10"
                    )}>
                        <button
                            onClick={toggleFavorite}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Star
                                size={19}
                                className={clsx(isFav ? "text-[#FFC107] fill-[#FFC107]" : "text-neutral-600 dark:text-neutral-400")}
                                strokeWidth={isFav ? 2 : 1.5}
                            />
                        </button>
                        <button
                            onClick={() => setIsEditOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Pencil size={18} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => router.push(`/project/${id}/setup`)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Wrapper with custom Local Sidebar */}
            <PageWrapper
                sidebar={<ProjectDetailLocalSidebar activeTab={activeTab} setActiveTab={setActiveTab} projectId={id} router={router} />}
                isTransparent={true}
            >
                <div className={clsx(
                    "space-y-6 max-w-4xl mx-auto px-4 lg:px-0",
                    activeTab !== "overview" ? "pt-24 lg:pt-0" : "pt-0"
                )}>
                    {/* Cover Photo - only on Overview */}
                    {activeTab === "overview" && (
                    <div className="relative w-full h-[240px] md:h-[280px] rounded-3xl overflow-hidden mb-6 shadow-sm border border-neutral-100 dark:border-neutral-800/20 bg-neutral-100 dark:bg-neutral-800 group">
                        {project.meta?.coverUrl ? (
                            <img
                                src={project.meta.coverUrl}
                                alt={project.projectName}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900/60 flex items-center justify-center transition-colors">
                                <img
                                    src="/logo-adidaya-red.svg"
                                    alt="Adidaya Default Logo"
                                    className="w-16 h-16 object-contain opacity-80"
                                />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                        
                        {/* Edit Cover Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-5 py-2.5 bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-white rounded-full font-bold text-xs shadow-lg backdrop-blur-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Pencil size={12} />
                                Change Cover Photo
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Project Header Info */}
                    <ProjectDetailHeader project={projectForComponents as any} />

                    {/* Main Content Body */}
                    <div className="space-y-6">
                        {/* Sticky Inner Tabs (Mobile Only) */}
                        <div className={clsx(
                            "lg:hidden z-[40] flex overflow-x-auto hide-scrollbar bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl p-1 gap-1 border border-white/20 dark:border-white/5 shadow-md rounded-[24px] mb-4"
                        )}>
                            {innerTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTab(tab.id);
                                        }}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all shrink-0 active:scale-95 text-xs font-semibold",
                                            isActive
                                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                                : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        <Icon
                                            className={clsx(
                                                "w-4 h-4",
                                                isActive ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 opacity-60"
                                            )}
                                            strokeWidth={isActive ? 2 : 1.5}
                                        />
                                        <span className="text-[13px]">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Body */}
                        <div className="space-y-6">
                            {/* OVERVIEW TAB */}
                            {activeTab === "overview" && (
                                <div className="space-y-8 animate-in fade-in duration-300 pb-12">
                                    {/* Project Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "Progress", value: `${progress}%`, sub: "Overall progress", icon: Target, color: "text-blue-500 dark:text-blue-400", bgIcon: "bg-blue-500/10 text-blue-500" },
                                            { label: "Schedule Status", value: "On Track", sub: "Matches baseline", icon: Calendar, color: "text-green-500 dark:text-green-400", bgIcon: "bg-green-500/10 text-green-500" },
                                            { label: "Budget Status", value: "Within Limit", sub: "Rp 150M Utilized", icon: CreditCard, color: "text-neutral-900 dark:text-white", bgIcon: "bg-purple-500/10 text-purple-500" },
                                            { label: "Target Finish", value: project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A", sub: "Contract completion", icon: Clock, color: "text-neutral-900 dark:text-white", bgIcon: "bg-amber-500/10 text-amber-500" },
                                        ].map((item, idx) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={idx} className="group relative p-5 bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.04] dark:border-white/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 flex flex-col justify-between h-32">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{item.label}</p>
                                                        <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center shrink-0", item.bgIcon)}>
                                                            <Icon size={14} strokeWidth={2} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className={clsx("text-2.5xl font-black tracking-tight leading-none", item.color)}>{item.value}</p>
                                                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold">{item.sub}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Attention Section */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">Attention Required</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { label: "Overdue Tasks", count: "2 Tasks", desc: "Foundation concrete review is overdue by 3 days.", icon: AlertTriangle, color: "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400" },
                                                { label: "Pending Approvals", count: "3 Pending", desc: "Material purchase requests require your verification.", icon: CheckCircle2, color: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400" },
                                                { label: "Active Issues", count: "1 Active", desc: "Site access coordination issue reported by team.", icon: Activity, color: "border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400" }
                                            ].map((item, idx) => {
                                                const Icon = item.icon;
                                                return (
                                                    <div key={idx} className={clsx("p-5 border rounded-[22px] flex items-start gap-4 transition-all duration-300 hover:scale-[1.01] shadow-sm", item.color)}>
                                                        <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 shrink-0">
                                                            <Icon size={18} strokeWidth={2} />
                                                        </div>
                                                        <div className="space-y-1 min-w-0">
                                                            <div>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 block">{item.label}</span>
                                                                <h4 className="text-base font-black leading-none mt-0.5">{item.count}</h4>
                                                            </div>
                                                            <p className="text-xs opacity-80 font-medium leading-relaxed">{item.desc}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Current Work */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">Current Work</h3>
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                            {[
                                                { title: "Floor Slab Rebar Inspection", desc: "Structure verification under progress for Area B.", pic: "Andi Prasetya", progress: 65, color: "bg-blue-500" },
                                                { title: "Plumbing Riser Piping Installation", desc: "MEP routing inside shafts.", pic: "Yudi P.", progress: 40, color: "bg-amber-500" }
                                            ].map((task, idx) => (
                                                <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] space-y-3">
                                                    <div className="flex justify-between items-start text-xs">
                                                        <div className="space-y-0.5">
                                                            <h4 className="font-bold text-neutral-900 dark:text-white">{task.title}</h4>
                                                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{task.desc}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-neutral-200/50 dark:bg-neutral-700 rounded text-[9px] font-bold text-neutral-600 dark:text-neutral-300">PIC: {task.pic}</span>
                                                            <span className="font-bold text-neutral-900 dark:text-white">{task.progress}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                        <div className={clsx("h-full rounded-full transition-all duration-700", task.color)} style={{ width: `${task.progress}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">Recent Activity</h3>
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                            {[
                                                { title: "Approved Material Submittal for Ceramic Tiles", time: "2 hours ago", author: "Andi Prasetya" },
                                                { title: "Daily Construction Log uploaded for Week 24", time: "1 day ago", author: "Yudi P." },
                                                { title: "Schematic Signoff Coordination meeting scheduled", time: "2 days ago", author: "Budi Santoso" }
                                            ].map((act, idx) => (
                                                <div key={idx} className="flex justify-between items-start gap-4 text-xs pb-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 last:pb-0">
                                                    <div>
                                                        <p className="font-bold text-neutral-800 dark:text-neutral-200 leading-snug">{act.title}</p>
                                                        <p className="text-[10px] text-neutral-400 mt-0.5">{act.author}</p>
                                                    </div>
                                                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">{act.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ACTIVITY TAB */}
                            {activeTab === "activity" && (
                                <div className="space-y-6 animate-in fade-in duration-300 pb-12">
                                    {/* Filter Toolbar */}
                                    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Category Filter */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Category</label>
                                            <div className="relative">
                                                <select 
                                                    value={filterCategory}
                                                    onChange={(e) => setFilterCategory(e.target.value)}
                                                    className="w-full bg-neutral-50 dark:bg-neutral-800 text-xs px-3 py-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                                >
                                                    <option value="all">All Categories</option>
                                                    <option value="task">Tasks</option>
                                                    <option value="daily_log">Daily Logs</option>
                                                    <option value="meeting">Meetings</option>
                                                    <option value="docs">Documents</option>
                                                    <option value="progress">Progress Updates</option>
                                                    <option value="approval">Approvals</option>
                                                    <option value="notes">Site Notes</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Stage Filter */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stage</label>
                                            <select 
                                                value={filterStage}
                                                onChange={(e) => setFilterStage(e.target.value)}
                                                className="w-full bg-neutral-50 dark:bg-neutral-800 text-xs px-3 py-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                            >
                                                <option value="all">All Stages</option>
                                                <option value="Schematic Design">Schematic Design</option>
                                                <option value="Design Development">Design Development</option>
                                                <option value="Procurement">Procurement</option>
                                                <option value="Construction">Construction</option>
                                            </select>
                                        </div>

                                        {/* PIC Filter */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">PIC</label>
                                            <select 
                                                value={filterPIC}
                                                onChange={(e) => setFilterPIC(e.target.value)}
                                                className="w-full bg-neutral-50 dark:bg-neutral-800 text-xs px-3 py-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                            >
                                                <option value="all">All PICs</option>
                                                <option value="Andi Prasetya">Andi Prasetya</option>
                                                <option value="Yudi P.">Yudi P.</option>
                                                <option value="Budi Santoso">Budi Santoso</option>
                                                <option value="Hendra K.">Hendra K.</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Activities List */}
                                    <div className="space-y-3.5">
                                        {filteredActivities.length > 0 ? (
                                            filteredActivities.map((act) => {
                                                const IconComponent = categoryIcons[act.type as keyof typeof categoryIcons] || FileText;
                                                return (
                                                    <div 
                                                        key={act.id} 
                                                        className="p-5 bg-white dark:bg-neutral-900 rounded-[22px] border border-black/5 dark:border-white/5 shadow-sm flex items-start gap-4"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border border-neutral-100 dark:border-neutral-800">
                                                            <IconComponent size={18} className="text-neutral-500 dark:text-neutral-400" />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-tight">{act.title}</h4>
                                                                <span className="text-[10px] text-neutral-400 whitespace-nowrap">{act.date}</span>
                                                            </div>
                                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{act.content}</p>
                                                            <div className="flex items-center gap-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                                                <span>{act.pic}</span>
                                                                <span>•</span>
                                                                <span>{act.stage}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="h-[20vh] flex flex-col items-center justify-center text-center">
                                                <p className="text-xs font-semibold text-neutral-400">No activities matches the current filter.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TRACKING TAB */}
                            {activeTab === "tracking" && (
                                <div className="space-y-8 animate-in fade-in duration-300 pb-12">
                                    {/* Simplified Tracking Indicators */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[
                                            { label: "Overall Progress", value: `${progress}%`, sub: "Total completed", color: "text-blue-500" },
                                            { label: "Schedule Status", value: "On Track", sub: "0 days variance", color: "text-green-500" },
                                            { label: "Budget Status", value: "Within limit", sub: "No overspend", color: "text-green-500" },
                                            { label: "Current Stage", value: stageCode, sub: "Active focus", color: "text-neutral-900 dark:text-white" },
                                            { label: "Next Milestone", value: "ED Drawings", sub: "Target: Jul 30", color: "text-neutral-900 dark:text-white" },
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-black/5 dark:border-white/5 shadow-sm space-y-1">
                                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{item.label}</p>
                                                <p className={clsx("text-base font-extrabold leading-none", item.color)}>{item.value}</p>
                                                <p className="text-[9px] text-neutral-500 dark:text-neutral-400 font-medium">{item.sub}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Progress per Stage & Planned vs Actual */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Progress per Stage */}
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Progress per Stage</h4>
                                            <div className="space-y-4">
                                                {[
                                                    { label: "01-KO (Kickoff)", progress: 100, status: "completed" },
                                                    { label: "02-SD (Schematic)", progress: 100, status: "completed" },
                                                    { label: "03-DD (Design Development)", progress: 42, status: "active" },
                                                    { label: "04-ED (Engineering)", progress: 0, status: "pending" },
                                                ].map((st, idx) => (
                                                    <div key={idx} className="space-y-1">
                                                        <div className="flex justify-between items-center text-xs font-medium">
                                                            <span className="text-neutral-700 dark:text-neutral-300">{st.label}</span>
                                                            <span className="text-neutral-900 dark:text-white font-bold">{st.progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={clsx(
                                                                    "h-full rounded-full transition-all duration-700", 
                                                                    st.status === "completed" ? "bg-green-500" :
                                                                    st.status === "active" ? "bg-blue-500" : "bg-neutral-200 dark:bg-neutral-700"
                                                                )} 
                                                                style={{ width: `${st.progress}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Planned vs Actual */}
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Planned vs Actual Timeline</h4>
                                            <div className="space-y-4">
                                                {[
                                                    { label: "Design Phase", planned: "May 1 - Jul 15", actual: "May 1 - Jul 20", status: "completed", delayed: true },
                                                    { label: "Procurement Phase", planned: "Jul 10 - Aug 5", actual: "Jul 10 - Ongoing", status: "active", delayed: false },
                                                    { label: "Construction Phase", planned: "Aug 1 - Dec 15", actual: "Not Started", status: "pending", delayed: false },
                                                ].map((tLine, idx) => (
                                                    <div key={idx} className="space-y-1.5 text-xs pb-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 last:pb-0">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-neutral-900 dark:text-white">{tLine.label}</span>
                                                            {tLine.delayed && (
                                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                                    +5d Variance
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                                                            <div>
                                                                <span className="font-semibold block text-[8px] uppercase tracking-wider opacity-60">Planned</span>
                                                                {tLine.planned}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold block text-[8px] uppercase tracking-wider opacity-60">Actual</span>
                                                                {tLine.actual}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DOCUMENT TAB */}
                    {activeTab === "document" && (
                        <div className="animate-in fade-in duration-300 pb-12">
                            <ProjectDetailDocsContent project={projectForComponents as any} />
                        </div>
                    )}

                    {/* FINANCE TAB */}
                    {activeTab === "finance" && (
                        <ProjectFinanceEmbed projectId={id} />
                    )}

                    {/* RESOURCES TAB */}
                    {activeTab === "resources" && (
                        <div className="py-16 text-center animate-in fade-in duration-300">
                            <div className="max-w-md mx-auto p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                <div className="w-16 h-16 mx-auto bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Construction className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Resources Under Construction</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    We are currently building this section to match your workflow. This feature will be available shortly.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* PEOPLE TAB */}
                    {activeTab === "people" && (
                        <div className="py-16 text-center animate-in fade-in duration-300">
                            <div className="max-w-md mx-auto p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                <div className="w-16 h-16 mx-auto bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Construction className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">People Under Construction</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    We are currently building this section to match your workflow. This feature will be available shortly.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* CREW TAB */}
                    {activeTab === "crew" && (
                        <ProjectCrewEmbed />
                    )}

                    {/* REPORTS TAB */}
                    {activeTab === "reports" && (
                        <div className="animate-in fade-in duration-300 pb-12">
                            <div className="p-8 bg-white dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 text-center space-y-3">
                                <FileSpreadsheet className="w-12 h-12 mx-auto text-neutral-300" />
                                <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">Project Reports</h3>
                                <p className="text-sm text-neutral-500">Generated reports and analytics for this project.</p>
                            </div>
                        </div>
                    )}
                </div>
            </PageWrapper>

            {/* Edit Drawer Modal */}
            <AnimatePresence>
                {isEditOpen && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] pointer-events-auto"
                        />

                        {/* Slide-over panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-neutral-900 shadow-2xl z-[101] flex flex-col border-l border-neutral-100 dark:border-neutral-800 pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div>
                                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Edit Project</h2>
                                    <p className="text-xs text-neutral-500 mt-0.5">Update project details and metadata</p>
                                </div>
                                <button
                                    onClick={() => setIsEditOpen(false)}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-500" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Project Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Project Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-neutral-900 dark:text-white transition-all"
                                    />
                                </div>

                                {/* Project Code */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Project Code</label>
                                    <input
                                        type="text"
                                        value={editCode}
                                        onChange={(e) => setEditCode(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-neutral-900 dark:text-white transition-all uppercase"
                                    />
                                </div>

                                {/* Client Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Client Name</label>
                                    <input
                                        type="text"
                                        value={editClient}
                                        onChange={(e) => setEditClient(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-neutral-900 dark:text-white transition-all"
                                    />
                                </div>

                                {/* Location (City) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">City</label>
                                    <input
                                        type="text"
                                        value={editCity}
                                        onChange={(e) => setEditCity(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-neutral-900 dark:text-white transition-all"
                                    />
                                </div>
 
                                {/* Cover Photo URL */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cover Photo URL</label>
                                    <input
                                        type="text"
                                        value={editCoverUrl}
                                        onChange={(e) => setEditCoverUrl(e.target.value)}
                                        placeholder="https://images.unsplash.com/..."
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-neutral-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex gap-3">
                                <button
                                    onClick={() => setIsEditOpen(false)}
                                    className="flex-1 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateProject}
                                    disabled={isUpdating}
                                    className="flex-1 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-white transition-colors disabled:opacity-50"
                                >
                                    {isUpdating ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
        </ProjectProvider>
    );
}
