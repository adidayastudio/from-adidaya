"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Sparkles,
    Activity,
    Target,
    User,
    LayoutList,
    CheckCircle2,
    Calendar,
    LucideIcon,
    History,
    AlertTriangle,
    Zap,
    ShieldAlert,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    Flame
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import MobileBottomBarV2 from "@/components/layout/MobileBottomBarV2";
import { PERSONAS, Persona, WorkMetrics, PersonaType } from "@/lib/workPersonaLogic";
import { getVibeHistory, VibeHistoryEntry } from "@/lib/api/vibe";
import useUserProfile from "@/hooks/useUserProfile";
import { useVibePersona } from "@/hooks/useVibePersona";
import { format, startOfWeek, endOfWeek } from "date-fns";

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
// Colors matching the Dashboard Activity Rings exactly
const FACTOR_COLORS = {
    tasks: { icon: "#3B82F6", bg: "bg-blue-50 dark:bg-blue-500/10" },
    presence: { icon: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-500/20" },
    pulse: { icon: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-500/20" },
    overdue: { icon: "#F43F5E", bg: "bg-rose-50 dark:bg-rose-500/10" }
};

function FactorRow({ icon: Icon, label, value, colors, isGood = true }: { icon: any, label: string, value: string, colors: { icon: string, bg: string }, isGood?: boolean }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors px-1 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center", colors.bg)}>
                    <Icon className="w-4.5 h-4.5" style={{ color: colors.icon }} strokeWidth={2.5} />
                </div>
                <span className="text-[14px] font-bold text-neutral-600">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={clsx("text-[14px] font-bold", (isGood && value !== "N/A" && value !== "None") ? "text-green-600" : "text-neutral-900")}>{value}</span>
                {isGood && value !== "N/A" && value !== "None" && <CheckCircle2 className="w-4 h-4 text-green-500" fill="currentColor" stroke="white" />}
            </div>
        </div>
    );
}

function MetricProgressBar({ label, value, color = "#AEF182", hasData = true }: { label: string, value: number, color?: string, hasData?: boolean }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[12px] font-bold text-white uppercase tracking-wider">
                <span>{label}</span>
                <span className="bg-white/10 px-2.5 py-0.5 rounded-full font-black">{hasData ? (value >= 1 ? `${value}%` : (value === 0 ? "0%" : "None")) : "N/A"}</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: hasData ? `${value}%` : 0 }}
                    transition={{ duration: 1.2, ease: "circOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    );
}

export default function VibePersonaPage() {
    const router = useRouter();
    const { profile } = useUserProfile();
    const { metrics: liveMetrics, persona: livePersona, loading: metricsLoading } = useVibePersona();

    const [historyTab, setHistoryTab] = useState<"Weekly" | "Monthly">("Weekly");
    const [history, setHistory] = useState<VibeHistoryEntry[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<VibeHistoryEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // 1. Ambil data asli dari DB
                const historyData = await getVibeHistory(profile.id, 'weekly');

                // 2. Logic: History only shows REAL data (no mocks)
                // We show current week + whatever is in DB
                const now = new Date();
                const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

                let processedHistory = [...historyData];

                // Ensure current week is in the list
                const hasCurrent = processedHistory.some(h => h.week_start === currentWeekStart);
                if (!hasCurrent) {
                    processedHistory.unshift({
                        id: 'live-now',
                        persona_type: livePersona.type,
                        week_start: currentWeekStart,
                        week_end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
                        metrics: liveMetrics,
                        is_locked: false,
                        created_at: now.toISOString()
                    });
                }

                if (historyTab === 'Monthly') {
                    // Aggregate weekly data into months
                    const monthlyMap: Record<string, VibeHistoryEntry> = {};

                    processedHistory.forEach(h => {
                        const monthKey = format(new Date(h.week_start), "MMM yyyy");
                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = {
                                ...h,
                                id: `month-${monthKey}`,
                                week_start: format(new Date(h.week_start), "yyyy-MM-01"),
                                week_end: format(new Date(new Date(h.week_start).getFullYear(), new Date(h.week_start).getMonth() + 1, 0), "yyyy-MM-dd"),
                                metrics: { ...h.metrics }
                            };
                        } else {
                            // Simple aggregation (average for rates, sum for counts)
                            const prev = monthlyMap[monthKey];
                            prev.metrics.tasksCompleted += h.metrics.tasksCompleted;
                            prev.metrics.tasksTotal += h.metrics.tasksTotal;
                            prev.metrics.tasksOverdue += h.metrics.tasksOverdue;
                            prev.metrics.attendanceRate = Math.round((prev.metrics.attendanceRate + h.metrics.attendanceRate) / 2);
                            prev.metrics.pulseScore = Math.round((prev.metrics.pulseScore + h.metrics.pulseScore) / 2);
                        }
                    });

                    const monthlyList = Object.values(monthlyMap);
                    setHistory(monthlyList);
                    if (monthlyList.length > 0 && !selectedHistory) setSelectedHistory(monthlyList[0]);
                } else {
                    setHistory(processedHistory);
                    if (processedHistory.length > 0 && !selectedHistory) {
                        setSelectedHistory(processedHistory[0]);
                    }
                }
            } catch (err) {
                console.error("Error fetching vibe history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [profile?.id, historyTab, liveMetrics, livePersona, selectedHistory]);

    // Detail section uses selected history, but HERO section ALWAYS uses live data (This Week)
    const heroPersona = livePersona;
    const HeroIcon = (heroPersona.icon && ICON_MAP[heroPersona.icon as string]) || Flame;

    // DETAIL card displays the selected history
    const detailPersonaType = selectedHistory ? selectedHistory.persona_type : livePersona.type;
    const detailPersona = PERSONAS[detailPersonaType];
    const DetailIcon = (detailPersona.icon && ICON_MAP[detailPersona.icon as string]) || Flame;

    return (
        <div className="min-h-screen pb-32 font-sans relative overflow-x-hidden">
            {/* Page Background */}
            <div className="absolute inset-0 bg-[#F4F7FA] dark:bg-neutral-950 -z-30" />

            {/* Header Background Gradient */}
            <div
                className="absolute top-0 left-0 right-0 h-[480px] transition-colors duration-1000 -z-20"
                style={{
                    background: `linear-gradient(135deg, ${heroPersona.gradient[0]} 0%, ${heroPersona.gradient[1]} 100%)`,
                    opacity: 1
                }}
            />

            <div className="relative z-10 p-6 min-h-screen pb-24">
                {/* Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        YOUR VIBE THIS WEEK <Sparkles className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="mb-12">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-[48px] font-black text-white leading-[0.9] mb-4">
                                The {heroPersona.title.split(' ')[1] || heroPersona.title}
                            </h1>
                            <p className="text-[18px] text-white/80 max-w-[280px] leading-snug font-medium">
                                {heroPersona.description}
                            </p>
                        </div>
                        <div className="w-32 h-32 relative opacity-30 flex items-center justify-center">
                            <HeroIcon className="w-24 h-24 text-white" strokeWidth={1} />
                        </div>
                    </div>
                </div>

                {/* Cards Section */}
                <div className="space-y-4 mb-10">
                    {/* What shaped this week */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-neutral-900 rounded-[28px] p-7 shadow-sm border border-neutral-100 dark:border-neutral-800"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-5 h-5 text-amber-500" fill="currentColor" />
                            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white">What shaped this week</h3>
                        </div>
                        <p className="text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
                            {metricsLoading ? "Calculating your metrics..." :
                                liveMetrics.tasksTotal > 0 ?
                                    "You completed most of your tasks on time, showed full presence this week, and responded to all actions quickly." :
                                    "No significant task activity recorded yet for this period. Keep pushing!"}
                        </p>
                    </motion.div>

                    {/* Contributing Factors */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-neutral-900 rounded-[28px] p-7 shadow-sm border border-neutral-100 dark:border-neutral-800"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <LayoutList className="w-5 h-5 text-blue-500" />
                            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white">Contributing Factors</h3>
                        </div>

                        <div className="space-y-1">
                            <FactorRow
                                icon={Target}
                                label="Tasks Completion"
                                value={liveMetrics.tasksTotal ? `${Math.round((liveMetrics.tasksCompleted / liveMetrics.tasksTotal) * 100)}%` : "N/A"}
                                colors={FACTOR_COLORS.tasks}
                            />
                            <FactorRow
                                icon={User}
                                label="Presence Rate"
                                value={`${liveMetrics.attendanceRate}%`}
                                colors={FACTOR_COLORS.presence}
                            />
                            <FactorRow
                                icon={Activity}
                                label="Pulse (Responsiveness)"
                                value={`${liveMetrics.pulseScore}%`}
                                colors={FACTOR_COLORS.pulse}
                            />
                            <FactorRow
                                icon={AlertTriangle}
                                label="Overdue Items"
                                value={liveMetrics.tasksTotal ? (liveMetrics.tasksOverdue > 0 ? `${liveMetrics.tasksOverdue}` : "None") : "N/A"}
                                colors={FACTOR_COLORS.overdue}
                                isGood={liveMetrics.tasksOverdue === 0}
                            />
                        </div>
                    </motion.div>

                    {/* Vibe History */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-7 shadow-sm border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white">Vibe History</h3>
                            </div>

                            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                                {["Weekly", "Monthly"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setHistoryTab(tab as any)}
                                        className={clsx(
                                            "px-5 py-1.5 rounded-full text-[13px] font-bold transition-all tracking-tight",
                                            historyTab === tab
                                                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                                                : "text-neutral-400 hover:text-neutral-600"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-24 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-neutral-200">
                                    <History className="w-8 h-8 text-neutral-300" />
                                </div>
                                <p className="text-[14px] font-bold text-neutral-400">No records found since Jan 2026</p>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pt-6 pb-8 no-scrollbar -mx-7 px-7">
                                {history.map((item, idx) => {
                                    const persona = PERSONAS[item.persona_type];
                                    const isSelected = selectedHistory?.id === item.id;
                                    const isCurrent = idx === 0;
                                    const PIcon = (persona.icon && ICON_MAP[persona.icon as string]) || Flame;

                                    return (
                                        <motion.button
                                            key={item.id}
                                            onClick={() => setSelectedHistory(item)}
                                            whileTap={{ scale: 0.95 }}
                                            className={clsx(
                                                "flex-shrink-0 w-[125px] h-[155px] rounded-[32px] p-4 flex flex-col items-center justify-between transition-all relative overflow-hidden shadow-xl border-[3px]",
                                                isSelected
                                                    ? "border-blue-500 scale-110 z-20 shadow-blue-500/20"
                                                    : "border-transparent opacity-60 hover:opacity-100 z-10"
                                            )}
                                            style={{ background: `linear-gradient(135deg, ${persona.gradient[0]}, ${persona.gradient[1]})` }}
                                        >
                                            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />

                                            {/* Top: Icon */}
                                            <div className="relative z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-1">
                                                <PIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
                                            </div>

                                            {/* Middle: Title */}
                                            <div className="text-center relative z-10">
                                                <p className="text-[14px] font-black text-white leading-tight uppercase tracking-tight">{persona.title.split(' ')[1] || persona.title}</p>
                                                <p className="text-[10px] font-bold text-white/70 mt-0.5">
                                                    {historyTab === 'Monthly'
                                                        ? format(new Date(item.week_start), 'MMM yyyy')
                                                        : `${format(new Date(item.week_start), 'd')} - ${format(new Date(item.week_end), 'd MMM')}`
                                                    }
                                                </p>
                                            </div>

                                            {/* Bottom: NOW Badge */}
                                            <div className="h-6 flex items-center justify-center relative z-10">
                                                {isCurrent ? (
                                                    <div className="bg-white/40 backdrop-blur-md px-3 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/30">
                                                        NOW
                                                    </div>
                                                ) : isSelected ? (
                                                    <div className="w-2 h-2 bg-white rounded-full shadow-lg shadow-white" />
                                                ) : null}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {selectedHistory && (
                                <motion.div
                                    key={selectedHistory.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-6 rounded-3xl p-7 text-white relative overflow-hidden"
                                    style={{ background: `linear-gradient(135deg, ${PERSONAS[selectedHistory.persona_type].gradient[0]}, ${PERSONAS[selectedHistory.persona_type].gradient[1]})` }}
                                >
                                    <div className="absolute inset-0 bg-white/5" />
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="flex items-center gap-2">
                                            {React.createElement((PERSONAS[selectedHistory.persona_type].icon && ICON_MAP[PERSONAS[selectedHistory.persona_type].icon as string]) || Flame, { className: "w-5 h-5 text-white" })}
                                            <span className="text-[12px] font-bold text-white/80 uppercase">
                                                {format(new Date(selectedHistory.week_start), 'dd')} - {format(new Date(selectedHistory.week_end), 'dd MMM')}
                                            </span>
                                        </div>
                                    </div>

                                    <h4 className="text-[24px] font-bold mb-3 relative z-10 italic">The {PERSONAS[selectedHistory.persona_type].title.split(' ')[1] || PERSONAS[selectedHistory.persona_type].title}</h4>

                                    <p className="text-[13px] text-white/80 leading-relaxed mb-8 relative z-10 font-medium">
                                        Performance report for this period based on real system telemetry. Total tasks tracked: {selectedHistory.metrics.tasksTotal}.
                                    </p>

                                    <div className="space-y-6 relative z-10">
                                        <MetricProgressBar
                                            label="Tasks"
                                            value={selectedHistory.metrics.tasksTotal ? Math.round((selectedHistory.metrics.tasksCompleted / selectedHistory.metrics.tasksTotal) * 100) : 0}
                                            hasData={selectedHistory.metrics.tasksTotal > 0}
                                        />
                                        <MetricProgressBar label="Presence" value={selectedHistory.metrics.attendanceRate} />
                                        <MetricProgressBar label="Pulse" value={selectedHistory.metrics.pulseScore} />
                                        <div className="flex justify-between items-center text-[12px] font-black pt-2 border-t border-white/10 uppercase tracking-widest text-white/40">
                                            <span>Overdue Items</span>
                                            <span className="text-[#AEF182]">
                                                {selectedHistory.metrics.tasksTotal > 0 ? (selectedHistory.metrics.tasksOverdue > 0 ? selectedHistory.metrics.tasksOverdue : "None") : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <MobileBottomBarV2 />
        </div>
    );
}
