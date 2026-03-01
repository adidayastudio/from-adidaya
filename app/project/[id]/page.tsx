"use client";

import { useEffect, useState, use } from "react";
import { fetchProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import ProgressRing from "@/components/project/ProgressRing";
import { ChevronLeft, Star, Pencil, MoreHorizontal, FileText, Activity, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
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

    const progress = project.meta?.progress || Math.floor(Math.random() * 100);
    const locationText = project.location?.city || "Location";

    let stageCode = "SD";
    if (progress > 30) stageCode = "DD";
    if (progress > 60) stageCode = "CD";

    // Is it focused? Let's assume progress > 50 means focused for demonstration
    const isFocused = progress > 50;

    const innerTabs = [
        { id: "overview", label: "Overview", icon: FileText },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "tracking", label: "Tracking", icon: MapPin },
    ];

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-[#000000] pb-[120px]">
            {/* Image Header Background */}
            <div className="relative w-full h-[320px] bg-neutral-200 dark:bg-neutral-800">
                <img
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80"
                    alt={project.projectName}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Gradient to transition into content */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F6F6F6] via-[#F6F6F6]/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent pointer-events-none" />

                {/* Top Actions Navbar */}
                <div className="absolute top-0 inset-x-0 px-6 pt-[64px] flex items-center justify-between z-10">
                    <button
                        onClick={() => router.back()}
                        className="w-[42px] h-[42px] rounded-full bg-white/70 dark:bg-black/50 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/40 dark:border-white/10 active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={24} className="text-neutral-900 dark:text-white mr-1" strokeWidth={2.5} />
                    </button>

                    <div className="flex pl-2 items-center bg-white/70 dark:bg-black/50 backdrop-blur-md rounded-full shadow-sm border border-white/40 dark:border-white/10 px-1 py-1 gap-1">
                        <button className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white dark:active:bg-neutral-800 transition-colors">
                            <Star size={20} className="text-[#FFC107] fill-[#FFC107]" />
                        </button>
                        <div className="w-[1px] h-[18px] bg-neutral-300 dark:bg-neutral-700 mx-1" />
                        <button className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white dark:active:bg-neutral-800 transition-colors">
                            <Pencil size={18} className="text-neutral-900 dark:text-white" strokeWidth={2.5} />
                        </button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white dark:active:bg-neutral-800 transition-colors">
                            <MoreHorizontal size={20} className="text-neutral-900 dark:text-white" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Project Title Area */}
            <div className="relative px-6 -mt-16 z-10 mb-6 flex justify-between items-end">
                <div>
                    <span className="inline-block px-1.5 py-0.5 bg-neutral-200/80 dark:bg-neutral-800 backdrop-blur-md text-[11px] font-[800] tracking-wider text-neutral-600 dark:text-neutral-300 rounded-md shadow-sm mb-1.5 border border-white/50 dark:border-neutral-700">
                        {project.projectCode}
                    </span>
                    <h1 className="text-[28px] font-[800] text-neutral-900 dark:text-white tracking-tight leading-tight">
                        {project.projectName}
                    </h1>
                    <p className="text-[15px] font-medium text-neutral-600 dark:text-neutral-400 mt-1">
                        {locationText} • {stageCode}
                    </p>
                </div>

                <div className="shrink-0 mb-1 ml-4 bg-white dark:bg-neutral-900 rounded-full p-1 shadow-sm border border-neutral-100 dark:border-neutral-800">
                    <ProgressRing progress={progress} size={64} strokeWidth={5} />
                </div>
            </div>

            {/* Sticky Inner Tabs */}
            <div className="sticky top-[108px] z-20 px-6 py-2 bg-[#F6F6F6]/90 dark:bg-black/90 backdrop-blur-md border-b-[0.5px] border-neutral-200/50 dark:border-white/10 mb-6 -mx-0">
                <div className="flex bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-full p-1 border border-neutral-200/30 dark:border-white/5 shadow-sm overflow-x-auto hide-scrollbar">
                    {innerTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[14px] font-semibold transition-all ${isActive
                                        ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                                        : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                                    }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Body */}
            <div className="px-6 space-y-6">

                {/* Status Section */}
                <section>
                    <h3 className="text-[18px] font-bold text-neutral-900 dark:text-white tracking-tight mb-3">
                        Status
                    </h3>

                    <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-neutral-800/50 backdrop-blur-xl rounded-[20px] border border-white/40 dark:border-white/5 shadow-sm">
                        <span className="text-[16px] font-medium text-neutral-700 dark:text-neutral-300">
                            Focused Mode
                        </span>

                        {isFocused ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF9C4]/80 dark:bg-[#FFD54F]/20 text-[#F57F17] dark:text-[#FFD54F] rounded-lg border border-[#FFF59D] dark:border-[#FFD54F]/30">
                                <Star size={14} className="fill-current" />
                                <span className="text-[13px] font-bold">Pinned to Focused</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 rounded-lg">
                                <span className="text-[13px] font-bold">Standard Priority</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Content Blocks (dummy content for scrolling) */}
                <section>
                    <div className="p-5 bg-white/70 dark:bg-neutral-800/50 backdrop-blur-xl rounded-[20px] border border-white/40 dark:border-white/5 shadow-sm mb-4">
                        <h4 className="font-bold text-neutral-900 dark:text-white mb-2">Content Block 1</h4>
                        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                            This is a scrollable block of content to test the sticky header behavior. As you scroll, the pill tab above should stick right below the navigation header, leaving this content to scroll beneath it.
                        </p>
                    </div>

                    <div className="p-5 bg-white/70 dark:bg-neutral-800/50 backdrop-blur-xl rounded-[20px] border border-white/40 dark:border-white/5 shadow-sm mb-4">
                        <h4 className="font-bold text-neutral-900 dark:text-white mb-2">Content Block 2</h4>
                        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                            This is a scrollable block of content to test the sticky header behavior. As you scroll, the pill tab above should stick right below the navigation header, leaving this content to scroll beneath it.
                        </p>
                    </div>
                </section>

            </div>
        </div>
    );
}
