"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useHeader } from "@/components/providers/HeaderProvider";
import {
    Target,
    User,
    CheckCircle2,
    LucideIcon,
    AlertTriangle,
    Zap,
    ShieldAlert,
    Activity,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    Flame,
    ChevronLeft,
    Sparkles
} from "lucide-react";
import clsx from "clsx";
import { PERSONAS, Persona, WorkMetrics, PersonaType } from "@/lib/workPersonaLogic";
import { getVibeHistory, VibeHistoryEntry } from "@/lib/api/vibe";
import useUserProfile from "@/hooks/useUserProfile";
import { useVibePersona } from "@/hooks/useVibePersona";
import { format, startOfWeek, endOfWeek } from "date-fns";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

const ICON_MAP: Record<string, LucideIcon> = {
    Zap,
    ShieldAlert,
    Activity,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    AlertTriangle,
};

const FACTOR_COLORS = {
    tasks: { icon: "#3B82F6", bg: "bg-blue-500/20" },
    presence: { icon: "#10B981", bg: "bg-emerald-500/20" },
    pulse: { icon: "#F59E0B", bg: "bg-amber-500/20" },
    overdue: { icon: "#F43F5E", bg: "bg-rose-500/20" }
};

function FactorRow({ icon: Icon, label, value, colors, isGood = true }: { icon: any, label: string, value: string, colors: { icon: string, bg: string }, isGood?: boolean }) {
    return (
        <div className="flex items-center justify-between py-1.5 transition-all group">
            <div className="flex items-center gap-3">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105", colors.bg)}>
                    <Icon className="w-3.5 h-3.5 opacity-90" style={{ color: colors.icon }} strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-bold text-neutral-500 dark:text-white/50 tracking-tight group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={clsx("text-[13px] font-black tracking-tight", (isGood && value !== "N/A" && value !== "None") ? "text-[#AEF182]" : "text-neutral-300 dark:text-white/30")}>{value}</span>
                {isGood && value !== "N/A" && value !== "None" && <CheckCircle2 className="w-3.5 h-3.5 text-[#AEF182] opacity-70" fill="currentColor" stroke="transparent" />}
            </div>
        </div>
    );
}

export default function VibePersonaPage() {
    const router = useRouter();
    const { profile } = useUserProfile();
    const { metrics: liveMetrics, persona: livePersona, loading: metricsLoading } = useVibePersona();

    const [history, setHistory] = useState<VibeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const historyData = await getVibeHistory(profile.id, 'weekly');
                setHistory(historyData);
            } catch (err) {
                console.error("Error fetching vibe history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [profile?.id]);

    const heroPersona = livePersona;
    const HeroIcon = (heroPersona.icon && ICON_MAP[heroPersona.icon as string]) || Flame;
    const personaGradient = heroPersona.gradient;

    const headerContent = useMemo(() => ({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => router.push("/dashboard/vibe/history")}
                    className="h-9 px-4 rounded-full bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 active:scale-95 transition-all text-[11px] font-medium text-neutral-700 dark:text-neutral-200 shadow-sm flex items-center justify-center"
                >
                    History
                </button>
            </div>
        )
    }), [router]);

    useHeader(headerContent);

    return (
        <div className="w-full h-full relative transition-colors">
            <StandardPageWrapper
                breadcrumbItems={[{ label: "Dashboard", href: "/dashboard" }, { label: "Vibe" }]}
                isTransparent
                fullWidth
            >
                <div className="w-full pb-32">
                    {/* MOBILE CONTENT */}
                    <div className="md:hidden">
                        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-transparent pointer-events-none">
                            <div className="flex items-center justify-between pointer-events-auto w-full">
                                <button
                                    onClick={() => router.back()}
                                    className="w-9 h-9 rounded-full bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white active:scale-95 transition-all shadow-sm"
                                >
                                    <ChevronLeft size={18} strokeWidth={1.5} />
                                </button>
                                <div className="text-center">
                                    <h1 className="text-[17px] font-medium text-neutral-900 dark:text-white">
                                        Your Vibe
                                    </h1>
                                </div>
                                <button
                                    onClick={() => router.push("/dashboard/vibe/history")}
                                    className="h-9 px-4 rounded-full bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 active:scale-95 transition-all text-[12px] font-medium text-neutral-700 dark:text-neutral-200 shadow-sm flex items-center justify-center"
                                >
                                    History
                                </button>
                            </div>
                        </div>

                        {/* Mobile Header Spacer */}
                        <div className="h-[70px]" />
                        
                        <div className="px-4 space-y-8">
                             <div className="rounded-[24px] p-8 text-neutral-900 dark:text-white relative overflow-hidden transition-all duration-500 border border-neutral-200/50 dark:border-white/10 bg-white dark:bg-[#0A0A0B]">
                                <div className="absolute inset-0 opacity-[0.1] dark:opacity-30 blur-[60px]" style={{ background: `linear-gradient(135deg, ${personaGradient[0]}, ${personaGradient[1] || personaGradient[0]})` }}></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <HeroIcon className="w-12 h-12" style={{ color: personaGradient[0] }} strokeWidth={2} />
                                        <h2 className="text-[42px] font-black tracking-tight leading-none">The {heroPersona.title.split(' ')[1] || heroPersona.title}<span style={{ color: personaGradient[0] }}>.</span></h2>
                                    </div>
                                    <p className="text-[17px] font-medium text-neutral-500 dark:text-white/50 leading-relaxed">{heroPersona.description}</p>
                                </div>
                             </div>

                             {/* Mobile Sections */}
                             <div className="space-y-4">
                                <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white px-1 tracking-tight">Weekly Insight</h2>
                                <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[24px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
                                    <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-white/70 font-medium">
                                        {metricsLoading ? "Calculating..." :
                                            liveMetrics.tasksTotal > 0 ?
                                                "You've established a powerful rhythm. Most tasks are flying off the board, and your responsiveness is keeping the system fluid." :
                                                "Your canvas is still open this period. Every small action you take now starts shaping your baseline."}
                                    </p>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white px-1 tracking-tight">Contributing Factors</h2>
                                <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[24px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
                                    <div className="space-y-4">
                                        <FactorRow icon={Target} label="Completion" value={liveMetrics.tasksTotal ? `${Math.round((liveMetrics.tasksCompleted / liveMetrics.tasksTotal) * 100)}%` : "N/A"} colors={FACTOR_COLORS.tasks} />
                                        <FactorRow icon={User} label="Presence" value={`${liveMetrics.attendanceRate}%`} colors={FACTOR_COLORS.presence} />
                                        <FactorRow icon={Zap} label="Pulse" value={`${liveMetrics.pulseScore}%`} colors={FACTOR_COLORS.pulse} />
                                        <FactorRow icon={AlertTriangle} label="Overdue" value={liveMetrics.tasksTotal ? (liveMetrics.tasksOverdue > 0 ? `${liveMetrics.tasksOverdue}` : "None") : "N/A"} colors={FACTOR_COLORS.overdue} isGood={liveMetrics.tasksOverdue === 0} />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* DESKTOP CONTENT */}
                    <div className="hidden md:block">
                        {/* Hero Section */}
                        <div className="rounded-[24px] p-6 lg:p-12 text-neutral-900 dark:text-white relative overflow-hidden transition-all duration-500 border border-neutral-200/50 dark:border-white/10 bg-white dark:bg-[#0A0A0B]">
                            <div className="absolute inset-0 opacity-[0.05] dark:opacity-20 blur-[80px]" style={{ background: `radial-gradient(circle at 100% 100%, ${personaGradient[0]} 0%, ${personaGradient[1] || personaGradient[0]} 100%)` }}></div>
                            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 blur-[40px] opacity-[0.15] dark:opacity-25 rounded-full scale-125" style={{ background: personaGradient[0] }} />
                                    <HeroIcon className="w-20 h-20 lg:w-32 lg:h-32 relative z-10" style={{ color: personaGradient[0] }} strokeWidth={1.5} />
                                </div>
                                <div className="text-center lg:text-left min-w-0">
                                    <h2 className="text-[clamp(32px,5vw,72px)] font-black tracking-tighter mb-4 leading-[0.95] lg:leading-[0.85] break-words">
                                        The {heroPersona.title.split(' ')[1] || heroPersona.title}<span style={{ color: personaGradient[0] }}>.</span>
                                    </h2>
                                    <p className="text-[16px] lg:text-[20px] font-medium text-neutral-500 dark:text-white/40 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                        {heroPersona.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12 items-start">
                             {/* Weekly Insight Section */}
                             <div className="space-y-6">
                                <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">Weekly Insight</h2>
                                <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[24px] p-7 shadow-sm border border-neutral-100 dark:border-neutral-800 min-h-[160px]">
                                    <p className="text-[18px] leading-relaxed text-neutral-600 dark:text-white/70 font-medium tracking-tight">
                                        {metricsLoading ? "Calculating..." :
                                            liveMetrics.tasksTotal > 0 ?
                                                "You've established a powerful rhythm. Most tasks are flying off the board, and your responsiveness is keeping the system fluid." :
                                                "Your canvas is still open this period. Every small action you take now starts shaping your baseline."}
                                    </p>
                                </div>
                             </div>

                             {/* Contributing Factors Section */}
                             <div className="space-y-6">
                                <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">Contributing Factors</h2>
                                <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[24px] p-7 shadow-sm border border-neutral-100 dark:border-neutral-800 min-h-[160px]">
                                    <div className="space-y-4">
                                        <FactorRow icon={Target} label="Completion" value={liveMetrics.tasksTotal ? `${Math.round((liveMetrics.tasksCompleted / liveMetrics.tasksTotal) * 100)}%` : "N/A"} colors={FACTOR_COLORS.tasks} />
                                        <FactorRow icon={User} label="Presence" value={`${liveMetrics.attendanceRate}%`} colors={FACTOR_COLORS.presence} />
                                        <FactorRow icon={Zap} label="Pulse" value={`${liveMetrics.pulseScore}%`} colors={FACTOR_COLORS.pulse} />
                                        <FactorRow icon={AlertTriangle} label="Overdue" value={liveMetrics.tasksTotal ? (liveMetrics.tasksOverdue > 0 ? `${liveMetrics.tasksOverdue}` : "None") : "N/A"} colors={FACTOR_COLORS.overdue} isGood={liveMetrics.tasksOverdue === 0} />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </StandardPageWrapper>
        </div>
    );
}
