"use client";

import { useEffect, useState } from "react";
import { fetchAllProjects, createProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import CompactProjectCard from "@/components/project/CompactProjectCard";
import { Plus, ChevronLeft, ListFilter, X, Check, ChevronDown, List, History, Send, Undo2, CheckCircle2, TrendingUp, AlertTriangle, User, Hash, FileCode2, BarChart3, Settings, ArrowUp, ArrowDown, Layout, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import NewProjectDrawer from "@/components/project/NewProjectDrawer";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const FILTER_TABS = [
    { id: "all", label: "All Projects", icon: List },
    { id: "my", label: "My Projects", icon: User },
    { id: "on-track", label: "On Track", icon: TrendingUp },
    { id: "risky", label: "Risky", icon: AlertTriangle },
    { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function AllProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [sortBy, setSortBy] = useState("recent"); // recent, name, code, number, progress
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const router = useRouter();

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 20);
    };

    useEffect(() => {
        async function load() {
            const data = await fetchAllProjects();
            setProjects(data);
            setLoading(false);
        }
        load();
    }, []);

    // Tier 1: Favorites
    const favorites = projects.filter(p => p.meta?.isFavorite === true);

    // Tier 2: Recently Accessed (Top 5 updated, excluding favs)
    const recentlyAccessed = [...projects]
        .filter(p => !p.meta?.isFavorite)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    // Tier 3: Risky (Progress 1-39% or status at-risk/delayed)
    const risky = projects.filter(p =>
        !p.meta?.isFavorite &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        ((p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40 || p.status === "at-risk" || p.status === "delayed")
    ).sort((a, b) => (a.meta?.progress || 0) - (b.meta?.progress || 0));

    // Tier 4: Recently Added (Top 5 created, excluding previous)
    const recentlyAdded = projects.filter(p =>
        !p.meta?.isFavorite &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !p.projectCode.includes("ADY")
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Tier 5: Others
    const others = projects.filter(p =>
        !p.meta?.isFavorite &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !recentlyAdded.some(ra => ra.id === p.id)
    );

    let sortedProjects = [
        ...favorites,
        ...recentlyAccessed,
        ...risky,
        ...recentlyAdded,
        ...others
    ];

    // Apply sorting from filter drawer
    if (sortBy === "name") {
        sortedProjects = [...projects].sort((a, b) => sortOrder === "asc" ? a.projectName.localeCompare(b.projectName) : b.projectName.localeCompare(a.projectName));
    } else if (sortBy === "code") {
        sortedProjects = [...projects].sort((a, b) => sortOrder === "asc" ? a.projectCode.localeCompare(b.projectCode) : b.projectCode.localeCompare(a.projectCode));
    } else if (sortBy === "number") {
        sortedProjects = [...projects].sort((a, b) => sortOrder === "asc" ? a.projectNumber.localeCompare(b.projectNumber) : b.projectNumber.localeCompare(a.projectNumber));
    } else if (sortBy === "progress") {
        sortedProjects = [...projects].sort((a, b) => sortOrder === "asc" ? (a.meta?.progress || 0) - (b.meta?.progress || 0) : (b.meta?.progress || 0) - (a.meta?.progress || 0));
    } else if (sortBy === "recent") {
        sortedProjects = [...projects].sort((a, b) => sortOrder === "asc" ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime() : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const filteredSortedProjects = sortedProjects.filter(p => {
        // Active Filter (Tabs)
        if (activeFilter !== "all") {
            if (activeFilter === "my") return false;
            if (activeFilter === "on-track") {
                const isOnTrack = p.status === "on-track" || p.status === "active";
                if (!isOnTrack) return false;
            }
            if (activeFilter === "risky") {
                const isRisky = p.status === "at-risk" || p.status === "delayed" || (p.meta?.progress || 0) < 40;
                if (!isRisky) return false;
            }
            if (activeFilter === "completed") {
                if (p.status !== "completed") return false;
            }
        }

        // Stage Filter (Drawer)
        if (selectedStage !== "all") {
            // Stage is often determined by progress in this mock/early setup
            const progress = p.meta?.progress || 0;
            let stageCode = "SD";
            if (progress > 30) stageCode = "DD";
            if (progress > 60) stageCode = "CD";
            if (selectedStage !== stageCode) return false;
        }

        return true;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F6F6] dark:bg-black pb-[100px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <div
            className="h-[100dvh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F6F6F6] dark:bg-[#000000] pb-24 relative"
            onScroll={handleScroll}
        >
            {/* Extended Blur Mask - Matched to Finance Benchmark */}
            <div
                className={clsx(
                    "fixed left-0 right-0 z-40 pointer-events-none transition-opacity duration-300",
                    isScrolled ? "opacity-100" : "opacity-0"
                )}
                style={{
                    top: '0px',
                    height: '80px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                }}
            >
                <div className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60 transition-all duration-500" />
            </div>

            {/* Top Navigation Bar - Sticky - Matched to Finance Benchmark */}
            <div
                className={clsx(
                    "sticky top-0 z-50 transition-all duration-300 px-5 flex flex-col",
                    isScrolled ? "h-[80px] pt-6" : "pt-8"
                )}
            >
                {isScrolled && (
                    <div
                        className="absolute inset-0 z-[-1] bg-white/60 dark:bg-neutral-900/60 backdrop-blur-2xl"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        }}
                    />
                )}

                <div className="flex items-center justify-between relative z-[51]">
                    {/* Back Button Container */}
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border transition-all duration-300",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05]"
                            : "bg-white dark:bg-neutral-900 border-black/[0.03] dark:border-white/[0.05]"
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
                            "font-bold text-neutral-900 dark:text-white tracking-tight leading-none transition-all duration-300 ease-in-out origin-left absolute left-1/2 -translate-x-1/2",
                            isScrolled ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                        )}
                    >
                        All Projects
                    </h1>

                    {/* Toolbar */}
                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border transition-all duration-300 z-[52]",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05] scale-90"
                            : "bg-white dark:bg-neutral-900 border-black/[0.03] dark:border-white/[0.05]"
                    )}>
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <ListFilter size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Plus size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => router.push("/flow/projects/settings")}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Large Title - Below Header */}
            <div className={clsx(
                "px-5 pt-8 transition-all duration-300",
                isScrolled ? "opacity-0 invisible h-0 overflow-hidden" : "opacity-100 visible mb-4"
            )}>
                <h1 className="text-[32px] font-bold text-neutral-900 dark:text-white tracking-tight ml-3">
                    All Projects
                </h1>
            </div>

            {/* Sticky Tabs Control - Matched to Finance Benchmark */}
            <div className={clsx(
                "z-[60] transition-all duration-300",
                isScrolled
                    ? "fixed top-[80px] left-5 right-5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] dark:border-white/[0.05] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] dark:shadow-none"
                    : "relative px-5 mb-6"
            )}>
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFilter(tab.id);
                                }}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0 active:scale-95",
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
                                <span className="text-[14px]">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Spacer for Content jumping avoid */}
            {isScrolled && <div className="h-[64px]" />}

            {/* Content List */}
            <div className="px-5 mt-4 flex flex-col gap-0.5 min-h-[400px]">
                {filteredSortedProjects.length > 0 ? (
                    filteredSortedProjects.map((p) => (
                        <CompactProjectCard
                            key={p.id}
                            project={p}
                            onClick={() => router.push(`/project/${p.id}`)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center mb-6 border border-neutral-200/50 dark:border-neutral-800/50">
                            {activeFilter === "my" ? (
                                <User className="text-neutral-300 dark:text-neutral-600" size={32} strokeWidth={1.5} />
                            ) : (
                                <List className="text-neutral-300 dark:text-neutral-600" size={32} strokeWidth={1.5} />
                            )}
                        </div>
                        <h3 className="text-[20px] font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
                            {activeFilter === "my" ? "No Projects Assigned" : "No Results Found"}
                        </h3>
                        <p className="text-[15px] text-neutral-500 dark:text-neutral-400 max-w-[280px] leading-relaxed">
                            {activeFilter === "my"
                                ? "You haven't been assigned to any projects yet. Reach out to your manager to get started."
                                : "We couldn't find any projects matching your current filters. Try adjusting your search criteria."}
                        </p>
                    </div>
                )}
            </div>

            {/* Filter Drawer */}
            <AnimatePresence>
                {isFilterDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterDrawerOpen(false)}
                            className="fixed inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] z-[90]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-2 left-2 right-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[48px] shadow-2xl z-[100] flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
                                <div className="w-10 h-1.5 rounded-full bg-neutral-200/50 dark:bg-neutral-700/50" />
                            </div>

                            <div className="flex items-center justify-between px-8 py-5 relative z-10">
                                <h3 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                                    Filter Projects
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setActiveFilter("all");
                                            setSortBy("recent");
                                            setSortOrder("desc");
                                            setSelectedStage("all");
                                        }}
                                        className="text-[14px] font-bold text-blue-500 hover:text-blue-600 active:scale-95 transition-all"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={() => setIsFilterDrawerOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm"
                                    >
                                        <X size={20} strokeWidth={1.5} />
                                    </button>
                                </div>
                            </div>

                            <div className="px-8 py-4 space-y-8 relative z-10 h-full overflow-y-auto pb-12">
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-3">Status</label>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {["all", "on-track", "at-risk", "delayed", "completed"].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setActiveFilter(s)}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border",
                                                    activeFilter === s
                                                        ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
                                                        : "bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl text-neutral-500 dark:text-neutral-400 border-black/5 dark:border-white/5"
                                                )}
                                            >
                                                {s === "all" ? "All Status" : s.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-3">Project Stage</label>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {[
                                            { id: "all", label: "All Stages", icon: Layers },
                                            { id: "SD", label: "Schematic Design", icon: FileCode2 },
                                            { id: "DD", label: "Design Development", icon: FileCode2 },
                                            { id: "CD", label: "Construction Doc", icon: FileCode2 },
                                        ].map(stg => (
                                            <button
                                                key={stg.id}
                                                onClick={() => setSelectedStage(stg.id)}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border flex items-center gap-2",
                                                    selectedStage === stg.id
                                                        ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
                                                        : "bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl text-neutral-500 dark:text-neutral-400 border-black/5 dark:border-white/5"
                                                )}
                                            >
                                                <stg.icon size={14} strokeWidth={selectedStage === stg.id ? 2.5 : 2} />
                                                {stg.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] block">Sort By</label>
                                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full border border-black/5 dark:border-white/5">
                                            <button
                                                onClick={() => setSortOrder("asc")}
                                                className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    sortOrder === "asc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-neutral-400"
                                                )}
                                            >
                                                <ArrowUp size={14} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => setSortOrder("desc")}
                                                className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    sortOrder === "desc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-neutral-400"
                                                )}
                                            >
                                                <ArrowDown size={14} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 px-1">
                                        {[
                                            { id: "recent", label: "Recently Updated", icon: History },
                                            { id: "name", label: "Project Name", icon: List },
                                            { id: "code", label: "Project Code", icon: FileCode2 },
                                            { id: "number", label: "Project Number", icon: Hash },
                                            { id: "progress", label: "Progress", icon: BarChart3 },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSortBy(opt.id)}
                                                className={clsx(
                                                    "flex items-center gap-3 px-5 py-4 rounded-full transition-all border",
                                                    sortBy === opt.id
                                                        ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-lg shadow-blue-500/20"
                                                        : "bg-white/50 dark:bg-neutral-800/50 border-black/5 dark:border-white/5 text-neutral-600 dark:text-neutral-400"
                                                )}
                                            >
                                                <opt.icon size={18} strokeWidth={sortBy === opt.id ? 2.5 : 2} />
                                                <span className="text-[14px] font-bold">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 pb-10 pt-4 relative z-10">
                                <button
                                    onClick={() => setIsFilterDrawerOpen(false)}
                                    className="w-full bg-blue-600 dark:bg-blue-500 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 border border-white/10 dark:border-black/5"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <NewProjectDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                existingProjects={projects}
                onSubmit={async (newProjectData) => {
                    const workspaceId = projects[0]?.workspaceId || "806461f9-906d-4767-9275-f850e50f37f3";

                    try {
                        const created = await createProject(workspaceId, {
                            projectName: newProjectData.projectName,
                            projectCode: newProjectData.projectCode,
                            projectNumber: newProjectData.projectNumber,
                            status: newProjectData.status as any,
                            location: newProjectData.location,
                            meta: newProjectData.meta,
                            startDate: newProjectData.startDate,
                        });

                        if (created) {
                            setProjects(prev => [created, ...prev]);
                            setIsDrawerOpen(false);
                        }
                    } catch (err) {
                        console.error("Error creating project:", err);
                    }
                }}
            />
        </div>
    );
}
