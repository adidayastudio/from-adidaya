"use client";

import { useEffect, useState } from "react";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import ProjectCard from "@/components/project/ProjectCard";
import CompactProjectCard from "@/components/project/CompactProjectCard";
import { Plus, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
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

    // Mock "Focused" projects by taking first 2
    const focusedProjects = projects.slice(0, 2);
    // Mock "Active" projects by taking next items (up to 5 for main screen)
    const activeProjects = projects.slice(2, 7);

    // Duplicate active projects if there aren't enough to make the page scrollable for testing
    const scrollableActiveProjects = [
        ...activeProjects,
        ...activeProjects.map(p => ({ ...p, id: p.id + '-copy1' })),
        ...activeProjects.map(p => ({ ...p, id: p.id + '-copy2' }))
    ];

    return (
        <div
            className="h-[100dvh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F6F6F6] dark:bg-[#000000] pb-[120px] relative"
            onScroll={handleScroll}
        >
            {/* Header */}
            <div
                className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
                    ? "bg-[#F6F6F6]/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05] pt-14 pb-3"
                    : "bg-[#F6F6F6] dark:bg-[#000000] pt-[72px] pb-4"
                    } px-6 flex items-center relative mb-2`}
            >
                <h1
                    className={`font-[800] text-neutral-900 dark:text-white tracking-tight leading-none transition-all duration-300 origin-left ${isScrolled
                        ? "text-[18px] absolute left-1/2 -translate-x-1/2"
                        : "text-[34px] relative"
                        }`}
                >
                    Projects
                </h1>

                {/* Spacer */}
                {!isScrolled && <div className="flex-1" />}

                <button
                    className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shadow-sm border border-neutral-200/50 dark:border-white/10 active:scale-95 transition-all shrink-0 ${isScrolled ? "ml-auto bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md" : "bg-white dark:bg-neutral-800"
                        }`}
                >
                    <Plus size={22} className="text-[#0A84FF]" strokeWidth={2.5} />
                </button>
            </div>

            <div className="space-y-10 mt-2">
                {/* Focused Projects */}
                <section>
                    <h2 className="px-6 text-[20px] font-bold text-neutral-900 dark:text-white mb-5 tracking-tight">
                        Focused Projects
                    </h2>
                    <div className="flex overflow-x-auto px-6 gap-4 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                <section className="px-6">
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
        </div>
    );
}
