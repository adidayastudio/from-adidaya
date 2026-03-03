"use client";

import { useEffect, useState, use } from "react";
import { fetchProject, updateProject } from "@/lib/api/projects";
import { Project } from "@/types/project";
import ProgressRing from "@/components/project/ProgressRing";
import { ChevronLeft, Star, Pencil, Settings, FileText, Activity, MapPin, Target, Plus, CheckCircle2, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [perfPeriod, setPerfPeriod] = useState("W");
    const [isFav, setIsFav] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isTabsSticky, setIsTabsSticky] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            const scroll = window.scrollY;
            setIsScrolled(scroll > 40);
            // Threshold for tabs to reach top bar (80px)
            // Image (320) + Title Area shift (-48) + some buffer
            setIsTabsSticky(scroll > 260);
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

    // Progress color logic
    let progressColor = "#0A84FF";
    if (progress > 0) {
        if (progress < 40) progressColor = "#FF3B30";
        else if (progress < 60) progressColor = "#FF9500";
        else if (progress >= 80) progressColor = "#34C759";
    } else {
        progressColor = "#A1A1AA";
    }

    const innerTabs = [
        { id: "overview", label: "Overview", icon: FileText },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "tracking", label: "Tracking", icon: Target },
    ];

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-[#000000] pb-24">
            {/* Top Navigation Bar - Fixed */}
            <div
                className={clsx(
                    "fixed top-0 inset-x-0 z-50 transition-all duration-300 px-5 flex flex-col",
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

            {/* Image Header Background */}
            <div className={clsx(
                "relative w-full h-[320px] transition-all duration-500 z-0",
                isScrolled ? "blur-sm opacity-50 scale-110" : ""
            )}>
                <img
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80"
                    alt={project.projectName}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#F6F6F6] via-[#F6F6F6]/95 to-transparent dark:from-black dark:via-black/95 dark:to-transparent pointer-events-none" />
            </div>

            {/* Project Title Area */}
            <div className={clsx(
                "relative px-5 -mt-12 z-10 mb-6 flex justify-between items-end transition-all duration-300",
                isScrolled ? "opacity-0 invisible scale-95" : "opacity-100 visible"
            )}>
                <div>
                    <span className="inline-block px-2.5 py-1 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-xl text-[11px] font-bold tracking-wider text-neutral-800 dark:text-neutral-200 rounded-full shadow-sm mb-1.5 border border-neutral-100/30 dark:border-neutral-700/30 uppercase">
                        {project.projectCode}
                    </span>
                    <h1 className="text-[28px] font-[800] text-neutral-900 dark:text-white tracking-tight leading-tight">
                        {project.projectName}
                    </h1>
                    <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400 mt-1">
                        {locationText} • {stageCode}
                    </p>
                </div>

                <div className="shrink-0 mb-1 ml-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-full p-1 shadow-sm border border-white/20 dark:border-neutral-800">
                    <ProgressRing progress={progress} size={68} strokeWidth={5} color={progressColor} />
                </div>
            </div>

            {/* Sticky Inner Tabs - Matched to Finance Benchmark */}
            <div className={clsx(
                "z-[60] transition-all duration-300 flex overflow-x-auto hide-scrollbar",
                isTabsSticky
                    ? "fixed top-[80px] left-5 right-5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] dark:border-white/[0.05] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] dark:shadow-none"
                    : "relative mx-5 mb-8 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl p-[2px] border border-white/20 dark:border-white/5 shadow-md rounded-[24px]"
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

            {/* Content Body */}
            <div className="px-5 space-y-6">
                {activeTab === "overview" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-10 pt-4">
                        {/* 1. DAY SNAPSHOT */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white leading-none">Day Snapshot</h3>
                                <div className="text-[11px] font-medium text-neutral-400">March 3, 2026</div>
                            </div>

                            <div className="p-6 bg-white dark:bg-neutral-900 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />

                                {/* HERO STATUS - PROMINENT badge at top center of card */}
                                <div className="flex flex-col items-center justify-center py-2 space-y-2 border-b border-black/[0.03] dark:border-white/[0.03] pb-6">
                                    <div className="px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[14px] font-bold flex items-center gap-2 shadow-sm border border-green-500/10">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Project is On Track
                                    </div>
                                    <p className="text-[11px] text-neutral-400 font-medium text-center max-w-[200px]">
                                        Efficiency is up by 4% compared to last week. Keep it up!
                                    </p>
                                </div>

                                {/* SYMMETRICAL METRICS GRID (2x2) */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-2">
                                    {/* Execution */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-neutral-400">Execution</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[28px] font-bold leading-none">1</span>
                                            <span className="text-[13px] font-medium text-neutral-400">/ 6 tasks</span>
                                        </div>
                                        <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-3 overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: '16.6%' }} />
                                        </div>
                                    </div>

                                    {/* Progress Today */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-neutral-400">Daily Progress</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[28px] font-bold leading-none">2.6%</span>
                                            <span className="text-[13px] font-bold text-green-500">↑</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-400 font-medium">0.4% above avg</p>
                                    </div>

                                    {/* Cost Today */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-neutral-400">Spend Today</p>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-[14px] font-bold text-neutral-400">Rp</span>
                                            <span className="text-[28px] font-bold leading-none">4.5M</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-400 font-medium">92% within budget</p>
                                    </div>

                                    {/* Transactions Today */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-neutral-400">Transactions</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[28px] font-bold leading-none">5</span>
                                            <span className="text-[13px] font-bold text-blue-500">Verified</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-400 font-medium">2 pending approval</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. PERFORMANCE SUMMARY */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white leading-none">Performance</h3>
                                {/* W M A Toggle Pill */}
                                <div className="flex p-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg">
                                    {['W', 'M', 'A'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPerfPeriod(p)}
                                            className={clsx(
                                                "w-7 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-all",
                                                perfPeriod === p
                                                    ? "bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-sm"
                                                    : "text-neutral-500 hover:text-neutral-600"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-neutral-900 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                                {/* Periodic Progress */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[11px] font-bold text-neutral-400">{perfPeriod === 'W' ? 'Weekly' : perfPeriod === 'M' ? 'Monthly' : 'All-time'} Progress</span>
                                        <span className="text-[18px] font-bold text-neutral-900 dark:text-white">10.2% <span className="text-red-500 text-[11px] ml-1 font-bold">-2.3%</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full animate-all transition-all duration-1000" style={{ width: '40%' }} />
                                    </div>
                                </div>

                                {/* Financial Status Stack */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] space-y-1">
                                        <p className="text-[10px] font-bold text-neutral-400">Budget Used</p>
                                        <p className="text-[20px] font-bold text-green-600 dark:text-green-400 leading-tight">90.1%</p>
                                    </div>
                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] space-y-1 border-l-2 border-l-purple-500/20">
                                        <p className="text-[10px] font-bold text-neutral-400">Efficiency</p>
                                        <p className="text-[20px] font-bold text-neutral-900 dark:text-white leading-tight">A+ <span className="text-[10px] text-neutral-400 ml-1">Rating</span></p>
                                    </div>
                                </div>

                                {/* Overall Breakdown */}
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                        <span className="text-[11px] font-bold text-neutral-400">Weightage Breakdown</span>
                                    </div>
                                    <div className="space-y-5 px-1">
                                        {[
                                            { label: "Design", val: "85%", color: "amber" },
                                            { label: "Build", val: "42%", color: "blue" },
                                            { label: "RAB", val: "95%", color: "green" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-semibold text-neutral-500">{item.label}</span>
                                                    <span className="text-[13px] font-bold text-neutral-900 dark:text-white">{item.val}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all duration-700",
                                                            item.color === 'amber' ? "bg-amber-500" :
                                                                item.color === 'blue' ? "bg-blue-500" : "bg-green-500"
                                                        )}
                                                        style={{ width: item.val }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. ACTIVE ALERTS */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white leading-none">Active Alerts</h3>
                                <div className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider">2 NEW</div>
                            </div>
                            <div className="p-6 bg-white dark:bg-neutral-900 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start bg-red-50 dark:bg-red-500/5 p-4 rounded-2xl border border-red-100 dark:border-red-500/10">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                            <Activity size={18} className="text-red-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider leading-none">Timeline Risk</p>
                                            <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug">Schedule delayed by <span className="font-bold text-red-600">11.8%</span> due to structural delay.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                            <CreditCard size={18} className="text-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none">Budget Conflict</p>
                                            <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug">Cost exceeded expected by <span className="font-bold text-amber-600">8.4%</span> in 'RAB Maintenance'.</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full py-4 text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                                    View Alert History
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "activity" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
                        <div className="flex items-center justify-between mt-2">
                            <h2 className="text-[18px] font-[800] text-neutral-900 dark:text-white tracking-tight">Log Feed</h2>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-all">
                                <Plus size={12} strokeWidth={3} />
                                New Log
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {/* COMPACT ACTIVITY ITEMS */}
                            {[
                                { title: "Verify Foundation Progress", meta: "WBS 3.1 • Site", time: "Tomw", status: "Not Started", color: "blue" },
                                { title: "Finalize Schematic Design", meta: "Stage 02-SD • Design", time: "Today", status: "In Progress", color: "blue" }
                            ].map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[18px] border border-white dark:border-white/5 shadow-sm flex items-center gap-3.5">
                                    <div className={clsx(
                                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                                        item.color === 'blue' ? "bg-blue-500/10" : "bg-neutral-500/10"
                                    )}>
                                        <CheckCircle2 size={18} className={item.color === 'blue' ? "text-blue-600" : "text-neutral-600"} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-tight truncate">{item.title}</h4>
                                        <p className="text-[10px] font-medium text-neutral-500 mt-0.5 truncate">{item.meta} • <span className="text-neutral-400">{item.time}</span></p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className={clsx(
                                            "block text-[8px] font-[900] uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded-full",
                                            item.status === "In Progress" ? "bg-amber-500/10 text-amber-600" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                                        )}>
                                            {item.status}
                                        </span>
                                        <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 float-right flex items-center justify-center text-[9px] font-bold text-neutral-500 uppercase">ME</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "tracking" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
                        <div className="flex items-center justify-between mt-2">
                            <h2 className="text-[18px] font-[800] text-neutral-900 dark:text-white tracking-tight">Tracking</h2>
                            <button className="px-3 py-1.5 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-black/[0.04] dark:border-white/5 text-neutral-900 dark:text-white rounded-lg text-[11px] font-bold active:scale-95 transition-all">
                                Update
                            </button>
                        </div>

                        {/* COMPACT STAGE PROGRESS */}
                        <div className="p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[24px] border border-white dark:border-white/5 shadow-sm space-y-6">
                            <div className="space-y-6">
                                {[
                                    { label: "03-DD (Design Dev)", sub: "Detailed Engineering", val: "65%", status: "In Progress", color: "red" },
                                    { label: "02-SD (Schematic)", sub: "Floor Plans & Elevations", val: "100%", status: "Done", color: "red" },
                                    { label: "01-KO (Kickoff)", sub: "Initial Meeting", val: "100%", status: "Done", color: "red" }
                                ].map((stage, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex-1">
                                                <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white truncate">{stage.label}</h4>
                                                <p className="text-[10px] text-neutral-500 truncate">{stage.sub}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] font-bold text-neutral-900 dark:text-white">{stage.val}</span>
                                                <span className={clsx(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                                    stage.status === "Done" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                                                )}>{stage.status}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                            <div className={clsx(
                                                "h-full rounded-full transition-all duration-700",
                                                stage.color === 'red' ? "bg-red-600" : "bg-blue-600"
                                            )} style={{ width: stage.val }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
