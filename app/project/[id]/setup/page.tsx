"use client";

import { useEffect, useState, use } from "react";
import { fetchProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import {
    ChevronLeft,
    ChevronRight,
    Info,
    Layers,
    Grid3X3,
    DollarSign,
    Calendar,
    ShieldCheck,
    Hash
} from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

const SETUP_ITEMS = [
    { id: "info", label: "Project Information", icon: Info, href: "/info" },
    { id: "stages", label: "Stages & Tasks", icon: Layers, href: "/stages" },
    { id: "wbs", label: "Work Breakdown Structure", icon: Grid3X3, href: "/wbs" },
    { id: "rab", label: "RAB", icon: DollarSign, href: "/rab" },
    { id: "schedule", label: "Schedule", icon: Calendar, href: "/schedule" },
    { id: "rules", label: "Rules", icon: ShieldCheck, href: "/rules" },
    { id: "index", label: "Index", icon: Hash, href: "/index" },
];

export default function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const data = await fetchProject(id);
            setProject(data);
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F6F6F6] dark:bg-[#000000] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-neutral-200 border-t-brand-red rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-[#000000] pb-20">
            {/* Header */}
            <div className="fixed top-0 inset-x-0 z-50 bg-[#F6F6F6]/60 dark:bg-[#121212]/60 backdrop-blur-2xl h-[100px] pt-8 px-5 border-b border-black/[0.03] dark:border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/50 backdrop-blur-md border border-white/40 dark:border-white/10 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} className="text-neutral-900 dark:text-white" strokeWidth={1.5} />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-[800] text-neutral-900 dark:text-white tracking-tight leading-none">
                            Project Setup
                        </h1>
                        <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400 mt-1">
                            {project.projectName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Menu List */}
            <div className="pt-[120px] px-5 space-y-4">
                <div className="bg-white/60 dark:bg-neutral-900/40 backdrop-blur-xl rounded-[28px] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                    {SETUP_ITEMS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => router.push(`/flow/projects/${id}/setup${item.href}`)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-5 transition-all active:bg-black/5 dark:active:bg-white/5",
                                    idx !== SETUP_ITEMS.length - 1 && "border-b border-black/[0.03] dark:border-white/[0.03]"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
                                        <Icon size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">
                                        {item.label}
                                    </span>
                                </div>
                                <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600" />
                            </button>
                        );
                    })}
                </div>

                <p className="px-4 text-[12px] font-medium text-neutral-400 dark:text-neutral-500 italic">
                    Configure project foundations, scope, and commercial settings.
                </p>
            </div>
        </div>
    );
}
