"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { fetchAllProjects, createProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import ProjectCard from "@/components/project/ProjectCard";
import CompactProjectCard from "@/components/project/CompactProjectCard";
import { Plus, ChevronRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import NewProjectDrawer from "@/components/project/NewProjectDrawer";

import PageWrapper from "@/components/layout/PageWrapper";
import TabSidebar, { TabItem } from "@/components/sidebar/TabSidebar";
import { Folder, Flame, Activity, Clock, Server, CheckSquare, Archive } from "lucide-react";
import { motion } from "framer-motion";

const PROJECT_TABS = [
    { id: "all", label: "All Projects", icon: <Folder size={16} /> },
    { id: "focused", label: "Focused", icon: <Flame size={16} /> },
    { id: "active", label: "Active", icon: <Activity size={16} /> },
    { id: "recent", label: "Recent", icon: <Clock size={16} /> },
    { id: "completed", label: "Completed", icon: <CheckSquare size={16} /> },
    { id: "archived", label: "Archived", icon: <Archive size={16} /> },
];

export default function ProjectPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent pb-[100px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    // Advanced filtering based on tabs
    const filteredProjects = projects.filter(p => {
        if (activeTab === "all") return true;
        if (activeTab === "focused") return p.meta?.isFavorite === true || (p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40 || p.status === "at-risk";
        if (activeTab === "active") return p.status === "active";
        if (activeTab === "completed") return p.status === "completed";
        if (activeTab === "archived") return p.status === "archived";
        if (activeTab === "recent") {
            // mock: created in last 7 days or recently modified
            return new Date(p.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
        }
        return true;
    });

    // Tier 1: Favorites
    const favorites = filteredProjects.filter(p => p.meta?.isFavorite === true);

    // Tier 2: Recently Accessed (Top 5 updated, excluding favs)
    const recentlyAccessed = [...filteredProjects]
        .filter(p => !favorites.some(f => f.id === p.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    // Tier 3: Risky (Progress 1-39% or status at-risk/delayed) - excluding favs and recently accessed
    const risky = filteredProjects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        ((p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40 || p.status === "at-risk" || p.status === "delayed")
    ).sort((a, b) => (a.meta?.progress || 0) - (b.meta?.progress || 0)); // Most risky first

    // Tier 4: Recently Added (Top 5 created, excluding previous)
    const recentlyAdded = filteredProjects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !p.projectCode.includes("ADY")
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Tier 5: Others
    const others = filteredProjects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !recentlyAdded.some(ra => ra.id === p.id)
    );

    // Combine into full prioritized list (still using tiers for ordering within tabs)
    const prioritizedList = [
        ...favorites,
        ...recentlyAccessed,
        ...risky,
        ...recentlyAdded,
        ...others
    ];

    // Main Section Splits (only show focused section prominently if in "all" or "focused" tab)
    const showFocusedSection = activeTab === "all" || activeTab === "focused";
    const focusedCount = showFocusedSection ? 5 : 0;
    
    const focusedProjects = prioritizedList.slice(0, focusedCount);

    // Active Projects: Max items not in Focused
    const activeProjects = prioritizedList
        .filter(p => !focusedProjects.find(fp => fp.id === p.id))
        .slice(0, activeTab === "all" ? 10 : undefined); // Paginate "all" slightly, show all in specific tabs

    const scrollableActiveProjects = activeProjects;

    return (
        <div className="bg-transparent p-0 transition-colors">
            <PageWrapper
                sidebar={
                    <TabSidebar
                        items={PROJECT_TABS}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
                isTransparent
                header={
                    <div className="hidden lg:block mb-0">
                        <div className="flex items-center justify-between gap-4 pt-0">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                                    {PROJECT_TABS.find(t => t.id === activeTab)?.label || "Projects"}
                                </h1>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                    Manage and track all ongoing project developments and milestones.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 active:scale-95 transition-all"
                                >
                                    <Plus size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={() => router.push("/flow/projects/settings")}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 active:scale-95 transition-all"
                                >
                                    <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5 hidden lg:block" />
                    </div>
                }
            >
                <div 
                    className="h-full space-y-10 animate-in fade-in duration-500"
                    onScroll={handleScroll}
                >
                    {/* Mobile Header - Only visible on small screens */}
                    <div className="lg:hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-[32px] font-bold text-neutral-900 dark:text-white tracking-tight">
                                Projects
                            </h1>
                            <div className="flex items-center gap-1 p-1 rounded-full bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                                >
                                    <Plus size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={() => router.push("/flow/projects/settings")}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                                >
                                    <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        {/* Mobile Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-6">
                            {PROJECT_TABS.map((tab) => {
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgeProjects"
                                                className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-2">
                                            <span className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"}>{tab.icon}</span>
                                            <span className="text-[14px]">{tab.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {prioritizedList.length > 0 ? (
                        <>
                            {/* Focused Projects */}
                            {showFocusedSection && focusedProjects.length > 0 && (
                                <section>
                                    <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">
                                        Focused Projects
                                    </h2>
                                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
                                        {focusedProjects.map((p) => (
                                            <div key={p.id} className="snap-center">
                                                <ProjectCard
                                                    project={p}
                                                    onClick={() => router.push(`/project/${p.id}`)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Active Projects */}
                            {scrollableActiveProjects.length > 0 && (
                                <section>
                                    <div
                                        className="flex items-center gap-1 mb-5 cursor-pointer active:opacity-70 transition-opacity"
                                        onClick={() => activeTab === "all" && router.push('/project/all')}
                                    >
                                        <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white tracking-tight">
                                            {showFocusedSection ? "Other Active Projects" : "Projects"}
                                        </h2>
                                        {activeTab === "all" && <ChevronRight size={22} className="text-neutral-400 dark:text-neutral-500 mt-0.5" />}
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        {scrollableActiveProjects.map((p) => (
                                            <CompactProjectCard
                                                key={p.id}
                                                project={p}
                                                onClick={() => router.push(`/project/${p.id.replace('-copy1', '').replace('-copy2', '')}`)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    ) : (
                        <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                                <Folder className="w-8 h-8 text-neutral-400 opacity-80" />
                            </div>
                            <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white mb-2">No projects found</h2>
                            <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400 max-w-[240px] leading-relaxed opacity-80">
                                There are no projects matching your current filter criteria.
                            </p>
                        </div>
                    )}
                </div>
            </PageWrapper>

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
