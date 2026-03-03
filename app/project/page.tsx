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

export default function ProjectPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const router = useRouter();

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 20);
    };

    useEffect(() => {
        async function load() {
            const data = await fetchAllProjects();
            // Sort to ensure consistent order, or simply use as is since it orders by project_number
            setProjects(data);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F6F6] dark:bg-[#121212] pb-[100px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    // Tier 1: Favorites
    const favorites = projects.filter(p => p.meta?.isFavorite === true);

    // Tier 2: Recently Accessed (Top 5 updated, excluding favs)
    const recentlyAccessed = [...projects]
        .filter(p => !favorites.some(f => f.id === p.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    // Tier 3: Risky (Progress 1-39% or status at-risk/delayed) - excluding favs and recently accessed
    const risky = projects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        ((p.meta?.progress || 0) > 0 && (p.meta?.progress || 0) < 40 || p.status === "at-risk" || p.status === "delayed")
    ).sort((a, b) => (a.meta?.progress || 0) - (b.meta?.progress || 0)); // Most risky first

    // Tier 4: Recently Added (Top 5 created, excluding previous)
    const recentlyAdded = projects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !p.projectCode.includes("ADY")
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Tier 5: Others
    const others = projects.filter(p =>
        !favorites.some(f => f.id === p.id) &&
        !recentlyAccessed.some(r => r.id === p.id) &&
        !risky.some(ri => ri.id === p.id) &&
        !recentlyAdded.some(ra => ra.id === p.id)
    );

    // Combine into full prioritized list
    const prioritizedList = [
        ...favorites,
        ...recentlyAccessed,
        ...risky,
        ...recentlyAdded,
        ...others
    ];

    // Main Section Splits
    const focusedProjects = prioritizedList.slice(0, 5);

    // Active Projects: Max 10 items not in Focused
    const activeProjects = prioritizedList
        .filter(p => !focusedProjects.find(fp => fp.id === p.id))
        .slice(0, 10);

    const scrollableActiveProjects = activeProjects;

    return (
        <div
            className="h-[100dvh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F6F6F6] dark:bg-[#000000] pb-24 relative"
            onScroll={handleScroll}
        >
            {/* Extended Blur Mask for Mobile top area - Matched to Finance Benchmark */}
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

            {/* Header - Matched to Finance Benchmark */}
            <div
                className={clsx(
                    "sticky top-0 z-50 transition-all duration-300 px-5 flex flex-col",
                    isScrolled ? "h-[80px] pt-6" : "pt-8"
                )}
            >
                {/* Glassy Background */}
                {isScrolled && (
                    <div
                        className="absolute inset-0 z-[-1] bg-white/60 dark:bg-neutral-900/60 backdrop-blur-2xl"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        }}
                    />
                )}

                {/* Top Header Row - Keep z-index high */}
                <div className={clsx(
                    "flex items-center transition-all duration-300 relative z-[51]",
                    isScrolled ? "mb-1" : "mb-2"
                )}>
                    <h1
                        className={clsx(
                            "font-bold text-neutral-900 dark:text-white tracking-tight leading-none transition-all duration-300 ease-in-out origin-left",
                            isScrolled
                                ? "text-[18px] absolute left-1/2 -translate-x-1/2"
                                : "text-[32px] relative"
                        )}
                    >
                        Projects
                    </h1>

                    <div className="flex-1" />

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] dark:border-white/[0.05] transition-all duration-300 z-[52]",
                        isScrolled ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md scale-90" : "bg-white dark:bg-neutral-900"
                    )}>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Plus size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => router.push("/flow/projects/settings")}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all shrink-0"
                        >
                            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-10 mt-1">
                {/* Focused Projects */}
                <section>
                    <h2 className="px-5 text-[20px] font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">
                        Focused Projects
                    </h2>
                    <div className="flex overflow-x-auto px-5 gap-4 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

                {/* Active Projects */}
                <section className="px-5">
                    <div
                        className="flex items-center gap-1 mb-5 cursor-pointer active:opacity-70 transition-opacity"
                        onClick={() => router.push('/project/all')}
                    >
                        <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white tracking-tight">
                            Active Projects
                        </h2>
                        <ChevronRight size={22} className="text-neutral-400 dark:text-neutral-500 mt-0.5" />
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
            </div>

            <NewProjectDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                existingProjects={projects}
                onSubmit={async (newProjectData) => {
                    // 1. Determine Workspace ID (Ideally get from current context/session)
                    const workspaceId = projects[0]?.workspaceId || "806461f9-906d-4767-9275-f850e50f37f3"; // Fallback to a known valid one if possible

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
                        } else {
                            console.error("Failed to create project in Supabase");
                            // Optionally show a toast/error here
                        }
                    } catch (err) {
                        console.error("Error creating project:", err);
                    }
                }}
            />
        </div>
    );
}
