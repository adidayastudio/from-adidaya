"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useHeader } from "@/components/providers/HeaderProvider";
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
    tasks: { icon: "#3B82F6", bg: "bg-blue-500/20" },
    presence: { icon: "#10B981", bg: "bg-emerald-500/20" },
    pulse: { icon: "#F59E0B", bg: "bg-amber-500/20" },
    overdue: { icon: "#F43F5E", bg: "bg-rose-500/20" }
};

function FactorRow({ icon: Icon, label, value, colors, isGood = true }: { icon: any, label: string, value: string, colors: { icon: string, bg: string }, isGood?: boolean }) {
    return (
        <div className="flex items-center justify-between py-3.5 transition-all px-2 rounded-2xl hover:bg-white/5 group">
            <div className="flex items-center gap-4">
                <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg", colors.bg)}>
                    <Icon className="w-5 h-5" style={{ color: colors.icon }} strokeWidth={2.5} />
                </div>
                <span className="text-[15px] font-bold text-white/90 tracking-tight">{label}</span>
            </div>
            <div className="flex items-center gap-2.5">
                <span className={clsx("text-[15px] font-black tracking-tighter", (isGood && value !== "N/A" && value !== "None") ? "text-[#AEF182]" : "text-white")}>{value}</span>
                {isGood && value !== "N/A" && value !== "None" && <CheckCircle2 className="w-4.5 h-4.5 text-[#AEF182]" fill="currentColor" stroke="transparent" />}
            </div>
        </div>
    );
}

function MetricProgressBar({ label, value, color = "#AEF182", hasData = true }: { label: string, value: number, color?: string, hasData?: boolean }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end text-[12px] font-black text-white/40 uppercase tracking-[0.15em]">
                <span>{label}</span>
                <span className="text-white text-[14px] font-black">{hasData ? (value >= 1 ? `${value}%` : (value === 0 ? "0%" : "None")) : "N/A"}</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden p-[2px]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: hasData ? `${value}%` : 0 }}
                    transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    className="h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"
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

    // Use header hook to set shellBackground and other content
    // V3: More vivid saturated gradients for "Full Color" immersion
    const { setHeader, clearHeader } = useHeader({
        shellBackground: `linear-gradient(165deg, ${heroPersona.gradient[0]} 0%, ${heroPersona.gradient[1]} 100%)`
    });

    return (
        <div className="min-h-screen pb-32 font-sans relative overflow-x-hidden transition-all duration-1000">
            {/* The background is now handled by the SidebarWrapper's shellBackground */}

            {/* Immersive Overlay - localized for content area */}
            <div className="absolute inset-0 bg-black/5 pointer-events-none -z-10" />

            <div className="relative z-10 p-6 min-h-screen pb-24">
                {/* Navigation */}
                <div className="flex items-center gap-4 mb-10">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-[12px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-black/5">
                        YOUR VIBE THIS WEEK <Sparkles className="w-4 h-4 text-[#AEF182]" />
                    </div>
                </div>

                <div className="mb-14 px-2">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-[52px] font-black text-white leading-[0.85] mb-6 tracking-tighter"
                            >
                                The {heroPersona.title.split(' ')[1] || heroPersona.title}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-[19px] text-white/80 max-w-[300px] leading-snug font-bold tracking-tight"
                            >
                                {heroPersona.description}
                            </motion.p>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 0.4, scale: 1, rotate: 0 }}
                            className="w-36 h-36 relative flex items-center justify-center"
                        >
                            <HeroIcon className="w-28 h-28 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" strokeWidth={0.75} />
                        </motion.div>
                    </div>
                </div>

                {/* Cards Section - REIMAGINED AS IMMERSIVE LAYERS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* What shaped this week */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-md rounded-[36px] p-8 border border-white/10 shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                <Sparkles className="w-5 h-5 text-amber-300" />
                            </div>
                            <h3 className="text-[17px] font-black text-white tracking-tight">Weekly Insight</h3>
                        </div>
                        <p className="text-[15px] leading-relaxed text-white/80 font-bold tracking-tight">
                            {metricsLoading ? "Calculating your metrics..." :
                                liveMetrics.tasksTotal > 0 ?
                                    "You've established a powerful rhythm. Most tasks are flying off the board, and your responsiveness is keeping the system fluid." :
                                    "Your canvas is still open this period. Every small action you take now starts shaping your baseline. Keep moving!"}
                        </p>
                    </motion.div>

                    {/* Contributing Factors */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 backdrop-blur-md rounded-[36px] p-8 border border-white/10 shadow-2xl overflow-hidden relative"
                    >
                        {/* Organic glow in bg */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full" />

                        <div className="flex items-center gap-3 mb-8 relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Activity className="w-5 h-5 text-blue-300" />
                            </div>
                            <h3 className="text-[17px] font-black text-white tracking-tight">Contributing Factors</h3>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <FactorRow
                                icon={Target}
                                label="Completion"
                                value={liveMetrics.tasksTotal ? `${Math.round((liveMetrics.tasksCompleted / liveMetrics.tasksTotal) * 100)}%` : "N/A"}
                                colors={FACTOR_COLORS.tasks}
                            />
                            <FactorRow
                                icon={User}
                                label="Presence"
                                value={`${liveMetrics.attendanceRate}%`}
                                colors={FACTOR_COLORS.presence}
                            />
                            <FactorRow
                                icon={Zap}
                                label="Pulse"
                                value={`${liveMetrics.pulseScore}%`}
                                colors={FACTOR_COLORS.pulse}
                            />
                            <FactorRow
                                icon={AlertTriangle}
                                label="Overdue"
                                value={liveMetrics.tasksTotal ? (liveMetrics.tasksOverdue > 0 ? `${liveMetrics.tasksOverdue}` : "None") : "N/A"}
                                colors={FACTOR_COLORS.overdue}
                                isGood={liveMetrics.tasksOverdue === 0}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Vibe History */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 backdrop-blur-md rounded-[36px] p-8 border border-white/10 shadow-2xl"
                >
                        <div className="flex items-center justify-between mb-10 overflow-x-hidden max-w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                                    <History className="w-5 h-5 text-white/60" />
                                </div>
                                <h3 className="text-[17px] font-black text-white tracking-tight">Timeline</h3>
                            </div>

                            <div className="flex bg-black/20 p-1 rounded-full border border-white/5 backdrop-blur-md">
                                {["Weekly", "Monthly"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setHistoryTab(tab as any)}
                                        className={clsx(
                                            "px-5 py-2 rounded-full text-[13px] font-black transition-all tracking-tighter",
                                            historyTab === tab
                                                ? "bg-white text-neutral-900 shadow-xl"
                                                : "text-white/40 hover:text-white/80"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-32 flex items-center justify-center">
                                <Activity className="w-8 h-8 text-white/40 animate-pulse" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dashed border-white/20">
                                    <History className="w-10 h-10 text-white/10" />
                                </div>
                                <p className="text-[15px] font-bold text-white/30 uppercase tracking-widest">No historical records</p>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pt-8 pb-10 no-scrollbar -mx-8 px-8 snap-x">
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
                                                "flex-shrink-0 w-[140px] h-[175px] rounded-[42px] p-5 flex flex-col items-center justify-between transition-all relative overflow-hidden shadow-2xl border-[3px] snap-center",
                                                isSelected
                                                    ? "border-white scale-110 z-20 shadow-white/20"
                                                    : "border-transparent opacity-60 hover:opacity-100 z-10"
                                            )}
                                            style={{ background: `linear-gradient(135deg, ${persona.gradient[0]}, ${persona.gradient[1]})` }}
                                        >
                                            <div className="absolute inset-0 bg-white/5 backdrop-blur-[4px]" />

                                            <div className="relative z-10 w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-1 shadow-lg">
                                                <PIcon className="w-6.5 h-6.5 text-white" strokeWidth={2.5} />
                                            </div>

                                            <div className="text-center relative z-10">
                                                <p className="text-[14px] font-black text-white leading-tight uppercase tracking-tighter">{persona.title.split(' ')[1] || persona.title}</p>
                                                <p className="text-[10px] font-black text-white/60 mt-1 uppercase tracking-tight">
                                                    {historyTab === 'Monthly'
                                                        ? format(new Date(item.week_start), 'MMM yyyy')
                                                        : `${format(new Date(item.week_start), 'd')} - ${format(new Date(item.week_end), 'd')}`
                                                    }
                                                </p>
                                            </div>

                                            <div className="h-6 flex items-center justify-center relative z-10">
                                                {isCurrent ? (
                                                    <div className="bg-white/30 backdrop-blur-md px-3 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-[0.2em] border border-white/30">
                                                        NOW
                                                    </div>
                                                ) : isSelected ? (
                                                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_white]" />
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
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="mt-8 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl border border-white/10"
                                    style={{ background: `linear-gradient(135deg, ${PERSONAS[selectedHistory.persona_type].gradient[0]}, ${PERSONAS[selectedHistory.persona_type].gradient[1]})` }}
                                >
                                    <div className="absolute inset-0 bg-white/5 backdrop-blur-md" />
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                {React.createElement((PERSONAS[selectedHistory.persona_type].icon && ICON_MAP[PERSONAS[selectedHistory.persona_type].icon as string]) || Flame, { className: "w-4.5 h-4.5 text-white", strokeWidth: 3 })}
                                            </div>
                                            <span className="text-[11px] font-black text-white uppercase tracking-[0.25em]">
                                                {format(new Date(selectedHistory.week_start), 'dd MMM')} - {format(new Date(selectedHistory.week_end), 'dd MMM')}
                                            </span>
                                        </div>
                                    </div>

                                    <h4 className="text-[28px] font-black mb-4 relative z-10 leading-tight tracking-tighter italic">The {PERSONAS[selectedHistory.persona_type].title.split(' ')[1] || PERSONAS[selectedHistory.persona_type].title}</h4>

                                    <p className="text-[14px] text-white/80 leading-relaxed mb-10 relative z-10 font-bold tracking-tight">
                                        Performance capture based on high-fidelity system telemetry. Total workflows tracked: {selectedHistory.metrics.tasksTotal}.
                                    </p>

                                    <div className="space-y-8 relative z-10">
                                        <MetricProgressBar
                                            label="Tasks"
                                            value={selectedHistory.metrics.tasksTotal ? Math.round((selectedHistory.metrics.tasksCompleted / selectedHistory.metrics.tasksTotal) * 100) : 0}
                                            hasData={selectedHistory.metrics.tasksTotal > 0}
                                        />
                                        <MetricProgressBar label="Presence" value={selectedHistory.metrics.attendanceRate} />
                                        <MetricProgressBar label="Pulse" value={selectedHistory.metrics.pulseScore} />

                                        <div className="pt-2 border-t border-white/20">
                                            <div className="flex justify-between items-center bg-black/20 p-3.5 rounded-2xl border border-white/5">
                                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white/40">Overdue Items</span>
                                                <span className="text-[#AEF182] font-black text-[15px]">
                                                    {selectedHistory.metrics.tasksTotal > 0 ? (selectedHistory.metrics.tasksOverdue > 0 ? selectedHistory.metrics.tasksOverdue : "None") : "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        );
}
