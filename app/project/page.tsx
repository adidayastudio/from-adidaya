"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { fetchAllProjects, createProject } from "@/lib/api/projects";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { Project } from "@/types/project";
import ProjectCard from "@/components/project/ProjectCard";
import CompactProjectCard from "@/components/project/CompactProjectCard";
import { Folder, Flame, Activity, Clock, CheckSquare, Archive, Plus, ChevronRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import NewProjectDrawer from "@/components/project/NewProjectDrawer";

import PageWrapper from "@/components/layout/PageWrapper";
import TabSidebar, { TabItem } from "@/components/sidebar/TabSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useHeader } from "@/components/providers/HeaderProvider";

const PROJECT_TABS = [
    { id: "all", label: "All Projects", icon: <Folder size={16} /> },
    { id: "focused", label: "Focused", icon: <Flame size={16} /> },
    { id: "active", label: "Active", icon: <Activity size={16} /> },
    { id: "recent", label: "Recent", icon: <Clock size={16} /> },
    { id: "completed", label: "Completed", icon: <CheckSquare size={16} /> },
    { id: "archived", label: "Archived", icon: <Archive size={16} /> },
];

import ModuleMobileHeader from "@/components/layout/ModuleMobileHeader";

export default function ProjectPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [fallbackWorkspaceId, setFallbackWorkspaceId] = useState<string | null>(null);
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
            
            try {
                const wsId = await fetchDefaultWorkspaceId();
                setFallbackWorkspaceId(wsId);
            } catch (err) {
                console.error("Error fetching default workspace:", err);
            }
        }
        load();
    }, []);

    // HEADER INJECTION
    useHeader({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-2 px-0 pointer-events-auto">
                {/* Settings Bubble */}
                <div className="h-9 w-9 flex items-center justify-center rounded-full border border-white/20 dark:border-neutral-700/20 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl shadow-sm pointer-events-auto transition-all">
                    <button
                        onClick={() => router.push("/project/settings")}
                        className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all"
                    >
                        <Settings size={18} strokeWidth={1.5} />
                    </button>
                </div>
                {/* Add Bubble - Blue, No Shadow */}
                <div className="h-9 w-9 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 pointer-events-auto active:scale-95 transition-all">
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="h-7 w-7 flex items-center justify-center text-white hover:bg-white/10 rounded-full"
                        title="Add Project"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        )
    }, [loading, isAddOpen]);

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
        if (activeTab === "focused") return p.meta?.isFavorite === true || ((p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40) || p.status === "at-risk";
        if (activeTab === "active") return p.status === "active" || p.status === "on-track" || p.status === "at-risk" || p.status === "delayed" || p.status === "overloaded";
        if (activeTab === "completed") return p.status === "completed";
        if (activeTab === "archived") return p.status === "archived";
        if (activeTab === "recent") {
            return new Date(p.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
        }
        return true;
    });

    // Tier 1: Favorites
    const favorites = filteredProjects.filter(p => p.meta?.isFavorite === true);

    // Tier 2: Recently Accessed
    const recentlyAccessed = [...filteredProjects]
        .filter(p => !favorites.some(f => f.id === p.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    // Tier 3: Risky
    const risky = filteredProjects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        (((p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40) || p.status === "at-risk" || p.status === "delayed")
    ).sort((a, b) => (a.meta?.progress || 0) - (b.meta?.progress || 0));

    // Tier 4: Recently Added
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

    const prioritizedList = [...favorites, ...recentlyAccessed, ...risky, ...recentlyAdded, ...others];
    const showFocusedSection = activeTab === "all" || activeTab === "focused";
    const focusedProjects = prioritizedList.slice(0, showFocusedSection ? 5 : 0);
    const activeProjects = prioritizedList
        .filter(p => !focusedProjects.find(fp => fp.id === p.id))
        .slice(0, activeTab === "all" ? 10 : undefined);

    const scrollableActiveProjects = activeProjects;

    return (
        <div className="bg-transparent p-0 transition-colors">
            <PageWrapper
                fullWidth
                sidebar={
                    <TabSidebar
                        items={PROJECT_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
                isTransparent
                header={
                    <div className="hidden md:block mb-0">
                        {/* Desktop Title Section */}
                        <div className="flex flex-col gap-1 mb-0">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">
                                Projects
                            </h1>
                        </div>
                        {/* Desktop/iPad Pill Tabs - Hidden on Desktop (lg+) as requested because sidebar is present */}
                        <div className="flex items-center gap-2 overflow-x-auto mt-6 pb-2 hide-scrollbar lg:hidden">
                            {PROJECT_TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[13px] group",
                                            isActive
                                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.1] font-bold"
                                                : "text-neutral-500 dark:text-neutral-400 font-medium hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200"
                                        )}
                                    >
                                        <span className="relative z-10">{tab.icon}</span>
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                }
            >
                <div
                    className="space-y-4 animate-in fade-in duration-500 pb-20 mt-0 md:px-0"
                >
                    {/* Mobile Header - With Premium Scrolling Minimize behavior */}
                    <div className="md:hidden">
                        <ModuleMobileHeader
                            title="Projects"
                            tabs={PROJECT_TABS.map(t => ({ ...t, icon: (props: any) => <span {...props}>{t.icon}</span> }))}
                            activeTabId={activeTab}
                            onTabChange={setActiveTab}
                            rightToolbar={
                                <>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full border border-black/[0.03] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-sm transition-all relative">
                                        <button
                                            onClick={() => router.push("/project/settings")}
                                            className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                        </button>
                                    </div>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 shadow-sm">
                                        <button
                                            onClick={() => setIsAddOpen(true)}
                                            className="p-2 rounded-full hover:bg-white/10 text-blue-50 transition-colors"
                                        >
                                            <Plus size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </>
                            }
                        />
                    </div>

                    {prioritizedList.length > 0 ? (
                        <>
                            {/* Focused Projects */}
                            {showFocusedSection && focusedProjects.length > 0 && (
                                <section className="px-5 md:px-0">
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
                                <section className="px-5 md:px-0">
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
                        <div className="h-[40vh] flex flex-col items-center justify-center text-center px-5">
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
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                existingProjects={projects}
                onSubmit={async (newProjectData) => {
                    const workspaceId = projects[0]?.workspaceId || fallbackWorkspaceId || "f39364e8-1376-4ff7-a716-78277e8d25b3";
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
                            setIsAddOpen(false);
                        }
                    } catch (err) {
                        console.error("Error creating project:", err);
                    }
                }}
            />
        </div>
    );
}
