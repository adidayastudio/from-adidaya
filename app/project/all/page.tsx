"use client";

import { useEffect, useState } from "react";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import CompactProjectCard from "@/components/project/CompactProjectCard";
import { Plus, Menu, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AllProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const data = await fetchAllProjects();
            setProjects(data);
            setLoading(false);
        }
        load();
    }, []);

    const filters = [
        { id: "all", label: `All Projects (${projects.length})` },
        { id: "my", label: "My Projects (9)" },
        { id: "track", label: "On Track (5)" },
        { id: "risky", label: "Risky (2)" },
        { id: "completed", label: "Completed (0)" },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F6F6] dark:bg-black pb-[100px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-black pb-[120px]">
            {/* Header */}
            <div className="px-6 pt-[64px] pb-2 flex items-center justify-between sticky top-0 z-10 bg-[#F6F6F6]/90 dark:bg-black/90 backdrop-blur-md">
                <button
                    onClick={() => router.back()}
                    className="w-[42px] h-[42px] rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-neutral-200/50 dark:border-white/10 active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} className="text-neutral-900 dark:text-white mr-1" strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 rounded-full shadow-sm border border-neutral-200/50 dark:border-white/10 px-1 py-1">
                    <button className="w-9 h-9 rounded-full flex items-center justify-center active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors">
                        <Plus size={20} className="text-neutral-900 dark:text-white" strokeWidth={2} />
                    </button>
                    <div className="w-[1px] h-[18px] bg-neutral-200 dark:bg-neutral-700" />
                    <button className="w-9 h-9 rounded-full flex items-center justify-center active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors">
                        <Menu size={20} className="text-neutral-900 dark:text-white" strokeWidth={2} />
                    </button>
                </div>
            </div>

            <div className="mt-4">
                <h1 className="px-6 text-[36px] font-[800] text-neutral-900 dark:text-white tracking-tight mb-5">
                    All Projects
                </h1>

                {/* Filter Pills */}
                <div className="flex overflow-x-auto px-6 gap-2.5 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-[14px] font-bold transition-all shadow-sm active:scale-[0.98] ${activeFilter === filter.id
                                ? "bg-neutral-800 dark:bg-neutral-700 text-white dark:text-white"
                                : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-300/30 dark:border-neutral-700/50"
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="px-6 flex flex-col gap-0.5 mt-2">
                    {projects.map((p) => (
                        <CompactProjectCard
                            key={p.id}
                            project={p}
                            onClick={() => router.push(`/project/${p.id}`)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
