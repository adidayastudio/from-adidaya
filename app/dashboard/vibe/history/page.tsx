"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useHeader } from "@/components/providers/HeaderProvider";
import { Share2 } from "lucide-react";
import {
    History,
    Zap,
    ShieldAlert,
    Activity,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    AlertTriangle,
    Flame,
    CheckCircle2,
    LucideIcon,
    ChevronLeft
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

function MetricProgressBar({ label, value, color = "#AEF182", hasData = true }: { label: string, value: number, color?: string, hasData?: boolean }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end text-[11px] font-black text-neutral-400 dark:text-white/30 tracking-[0.15em]">
                <span>{label}</span>
                <span className="text-neutral-900 dark:text-white text-[12px] font-black">{hasData ? (value >= 1 ? `${value}%` : (value === 0 ? "0%" : "None")) : "N/A"}</span>
            </div>
            <div className="h-2.5 bg-neutral-100 dark:bg-white/10 rounded-full overflow-hidden p-[2px]">
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

export default function VibeHistoryPage() {
    const router = useRouter();
    const { profile } = useUserProfile();
    const { metrics: liveMetrics, persona: livePersona } = useVibePersona();

    const [historyTab, setHistoryTab] = useState<"Weekly" | "Monthly">("Weekly");
    const [history, setHistory] = useState<VibeHistoryEntry[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<VibeHistoryEntry | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Stable dispatcher for tab changes to avoid closure issues in the header
    const dispatchTabChange = useCallback((tab: string) => {
        window.dispatchEvent(new CustomEvent('vibe-history:set-tab', { detail: tab }));
    }, []);

    // Listen for tab changes from the header or other sources
    useEffect(() => {
        const handleTabChange = (e: any) => {
            setHistoryTab(e.detail);
        };
        window.addEventListener('vibe-history:set-tab', handleTabChange);
        return () => window.removeEventListener('vibe-history:set-tab', handleTabChange);
    }, []);
    

    useEffect(() => {
        if (!profile?.id) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const historyData = await getVibeHistory(profile.id, 'weekly');
                const now = new Date();
                const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

                let processedHistory = [...historyData];

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
                    setSelectedHistory(monthlyList[0] || null);
                } else {
                    setHistory(processedHistory);
                    setSelectedHistory(processedHistory[0] || null);
                }
            } catch (err) {
                console.error("Error fetching vibe history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [profile?.id, historyTab, liveMetrics, livePersona]);

    // Helper to get week range (Mon-Sun)
    const getWeekRange = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(date.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const format = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `${format(monday)} - ${format(sunday)}`;
    };

    const handleCardClick = (item: any, e: React.MouseEvent) => {
        setSelectedHistory(item);
        const target = e.currentTarget as HTMLElement;
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    const headerContent = useMemo(() => ({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-2">
                <div className="relative flex bg-white/10 dark:bg-neutral-800/10 p-1 rounded-full border border-white/20 dark:border-neutral-700/20 backdrop-blur-xl shadow-sm mr-1 h-9 items-center pointer-events-auto">
                    <motion.div
                        className="absolute inset-1 rounded-full bg-white dark:bg-white/20 shadow-sm border border-white/50 dark:border-white/10"
                        initial={false}
                        animate={{
                            x: historyTab === "Weekly" ? 0 : "100%",
                        }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        style={{ width: "calc(50% - 4px)" }}
                    />
                    {["Weekly", "Monthly"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => dispatchTabChange(tab)}
                            className={clsx(
                                "relative z-10 px-4 h-7 rounded-full text-[10px] transition-all tracking-tight w-[70px] md:w-[80px] flex items-center justify-center",
                                historyTab === tab
                                    ? "text-neutral-900 dark:text-white font-bold"
                                    : "text-neutral-500 dark:text-white/40 hover:text-neutral-700 dark:hover:text-white/60 font-medium"
                            )}
                        >
                            <motion.span
                                whileTap={{ scale: 0.9 }}
                            >
                                {tab}
                            </motion.span>
                        </button>
                    ))}
                </div>
                <button
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 active:scale-95 transition-all text-neutral-700 dark:text-neutral-200 shadow-sm"
                    title="Share"
                >
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
            </div>
        )
    }), [historyTab]);

    useHeader(headerContent, historyTab);

    return (
        <div className="w-full h-full relative transition-colors">
            <StandardPageWrapper
                breadcrumbItems={[{ label: "Dashboard", href: "/dashboard" }, { label: "Vibe", href: "/dashboard/vibe" }, { label: "History" }]}
                isTransparent
                fullWidth
            >
                <div className="w-full pb-32">
                    <div className="hidden md:block">
                        <StandardPageHeader
                            title="Vibe History"
                            subtitle="Review your past performance and rhythm trends."
                            hideDivider
                        />
                    </div>

                    <div className="md:hidden flex items-center gap-4 mb-4 px-4 pt-4">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-full bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 flex items-center justify-center text-neutral-500 dark:text-neutral-400"
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">History</h1>
                    </div>

                    <div className="px-4 md:px-0">
                        <div className="mb-4" />

                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <Activity className="w-10 h-10 text-white/20 animate-pulse" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-dashed border-white/10">
                                    <History className="w-12 h-12 text-white/10" />
                                </div>
                                <p className="text-[13px] font-black text-white/30 tracking-[0.3em]">No historical records</p>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pt-4 pb-12 no-scrollbar snap-x px-6 scroll-pl-6">
                                {/* Padding handled by px-6 */}
                                {history.map((item, idx) => {
                                    const persona = PERSONAS[item.persona_type];
                                    const isSelected = selectedHistory?.id === item.id;
                                    const isCurrent = idx === 0 && historyTab === 'Weekly';
                                    const PIcon = (persona.icon && ICON_MAP[persona.icon as string]) || Flame;

                                    return (
                                        <motion.button
                                            key={item.id}
                                            onClick={(e) => handleCardClick(item, e)}
                                            whileTap={{ scale: 0.95 }}
                                            className={clsx(
                                                "flex-shrink-0 w-[140px] h-[170px] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all relative overflow-hidden shadow-sm border snap-start group",
                                                isSelected
                                                    ? "border-neutral-300 dark:border-white/40 bg-white dark:bg-white/15 scale-105 z-20 shadow-md"
                                                    : "border-neutral-200 dark:border-white/5 opacity-40 dark:opacity-60 hover:opacity-100 z-10 hover:border-neutral-300 dark:hover:border-white/20 bg-neutral-100/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div
                                                className={clsx(
                                                    "absolute inset-0 transition-opacity duration-500",
                                                    isSelected ? "opacity-[0.12] dark:opacity-[0.35]" : "opacity-[0.06] dark:opacity-20 group-hover:opacity-[0.1] dark:group-hover:opacity-40"
                                                )}
                                                style={{ background: `linear-gradient(135deg, ${persona.gradient[0]}, ${persona.gradient[1]})` }}
                                            />

                                            <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/80 dark:bg-white/10 flex items-center justify-center mb-1 border border-neutral-200 dark:border-white/10 transition-transform group-hover:scale-110 shadow-sm backdrop-blur-md">
                                                <PIcon className="w-6 h-6 text-neutral-900 dark:text-white" strokeWidth={2.5} />
                                            </div>

                                            <div className="text-center relative z-10">
                                                <p className="text-[12px] font-bold text-neutral-900 dark:text-white leading-tight tracking-tight">{persona.title.split(' ')[1] || persona.title}</p>
                                                <p className="text-[9px] font-bold text-neutral-400 dark:text-white/40 mt-1.5 tracking-widest whitespace-nowrap">
                                                    {historyTab === 'Monthly'
                                                        ? format(new Date(item.week_start), 'MMM yyyy')
                                                        : `${format(new Date(item.week_start), 'd')} - ${format(new Date(item.week_end), 'd MMM')}`
                                                    }
                                                </p>
                                            </div>

                                            <div className="h-4 flex items-center justify-center relative z-10">
                                                {isCurrent ? (
                                                    <div className="bg-[#AEF182]/20 dark:bg-[#AEF182]/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[7px] font-black text-[#5a8b38] dark:text-[#AEF182] tracking-[0.2em] border border-[#AEF182]/30 dark:border-[#AEF182]/20 shadow-sm">
                                                        Live
                                                    </div>
                                                ) : isSelected ? (
                                                    <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
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
                                    className="mt-4 rounded-[24px] p-6 md:p-8 relative overflow-hidden transition-all duration-500 flex-1 min-h-0 flex flex-col border border-white/20 dark:border-white/10 backdrop-blur-[40px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${PERSONAS[selectedHistory.persona_type].gradient[0]}15, ${PERSONAS[selectedHistory.persona_type].gradient[1]}08)` 
                                    }}
                                >
                                    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] blur-[120px]" style={{ background: `radial-gradient(circle at 50% 50%, ${PERSONAS[selectedHistory.persona_type].gradient[0]} 0%, transparent 100%)` }} />
                                    <div
                                        className="absolute -top-32 -right-32 w-96 h-96 opacity-[0.03] dark:opacity-[0.08] blur-[100px] rounded-full"
                                        style={{ background: PERSONAS[selectedHistory.persona_type].gradient[0] }}
                                    />

                                    <div className="relative z-10 flex flex-col h-full min-h-0">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 flex-shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-neutral-200/50 dark:bg-white/10 flex items-center justify-center border border-neutral-300 dark:border-white/10 transition-colors">
                                                    {React.createElement((PERSONAS[selectedHistory.persona_type].icon && ICON_MAP[PERSONAS[selectedHistory.persona_type].icon as string]) || Flame, { className: "w-6 h-6 text-neutral-900 dark:text-white", strokeWidth: 2 })}
                                                </div>
                                                <div>
                                                    <h4 className="text-[24px] md:text-[28px] font-black leading-tight tracking-tighter text-neutral-900 dark:text-white">
                                                        The {PERSONAS[selectedHistory.persona_type].title.split(' ')[1] || PERSONAS[selectedHistory.persona_type].title}
                                                    </h4>
                                                    <p className="text-[11px] font-bold text-neutral-400 dark:text-white/40 tracking-[0.2em] mt-1">
                                                        {format(new Date(selectedHistory.week_start), 'dd MMM')} - {format(new Date(selectedHistory.week_end), 'dd MMM')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                <div className="space-y-8">
                                                    <p className="text-[15px] text-neutral-600 dark:text-white/60 leading-relaxed font-medium tracking-tight">
                                                        Performance capture based on high-fidelity system telemetry. Total workflows tracked: <span className="text-neutral-900 dark:text-white font-bold">{selectedHistory.metrics.tasksTotal}</span>.
                                                        This state reflects a <span className="text-neutral-900 dark:text-white font-bold italic">{PERSONAS[selectedHistory.persona_type].tone}</span> operational trend.
                                                    </p>
                                                </div>

                                                <div className="space-y-8 p-8 bg-neutral-50 dark:bg-black/20 rounded-[24px] border border-neutral-100 dark:border-white/5">
                                                    <MetricProgressBar
                                                        label="Tasks"
                                                        value={selectedHistory.metrics.tasksTotal ? Math.round((selectedHistory.metrics.tasksCompleted / selectedHistory.metrics.tasksTotal) * 100) : 0}
                                                        hasData={selectedHistory.metrics.tasksTotal > 0}
                                                        color="#AEF182"
                                                    />
                                                    <MetricProgressBar label="Presence" value={selectedHistory.metrics.attendanceRate} color="#3B82F6" />
                                                    <MetricProgressBar label="Pulse" value={selectedHistory.metrics.pulseScore} color="#F59E0B" />
                                                </div>
                                            </div>

                                            <div className="pt-2 pb-4">
                                                <div className="flex justify-between items-center bg-neutral-100 dark:bg-white/5 p-5 rounded-[24px] border border-neutral-200 dark:border-white/10 group transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-rose-500/5 dark:bg-rose-500/10 flex items-center justify-center border border-rose-500/10 dark:border-rose-500/20">
                                                            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                                        </div>
                                                        <span className="text-[12px] font-bold tracking-widest text-neutral-400 dark:text-white/40">Overdue Items</span>
                                                    </div>
                                                    <span className={clsx(
                                                        "font-black text-[18px] tracking-tight",
                                                        selectedHistory.metrics.tasksOverdue > 0 ? "text-rose-400" : "text-[#AEF182]"
                                                    )}>
                                                        {selectedHistory.metrics.tasksTotal > 0 ? (selectedHistory.metrics.tasksOverdue > 0 ? selectedHistory.metrics.tasksOverdue : "None") : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </StandardPageWrapper>
        </div>
    );
}
