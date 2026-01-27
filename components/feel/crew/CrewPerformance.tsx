"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Download, ArrowUpDown, Users, Search, Loader2, Calendar } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import {
    CREW_ROLE_LABELS,
    CrewRole,
    fetchCrewMembers,
    fetchDailyLogs,
    updateDailyRating,
    DailyLog,
    CrewMember
} from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { isHolidayOrSunday } from "@/lib/holidays";

interface CrewPerformanceProps { role?: string; }

type PerformanceRating = "UNGGUL" | "SANGAT_BAIK" | "BAIK" | "CUKUP" | "KURANG";
type FilterCard = "ALL" | "KEEP" | "MONITOR" | "REPLACE";
type ViewPeriod = "LAST_7_DAYS" | "EVALUATION_30_DAYS"; // New capability

interface PerformanceEntry {
    id: string;
    crewName: string;
    crewRole: CrewRole;
    projectCode: string;

    // Components
    attendanceScore: number; // 0-50
    overtimeScore: number;   // 0-25
    ratingScore: number;     // 0-25

    // Raw Data
    daysPresent: number;
    daysOt: number;
    avgRating: number;
    workingDays: number;

    totalScore: number;      // 0-100
    ratingLabel: PerformanceRating;
    status: "KEEP" | "MONITOR" | "REPLACE";
}

const RATING_LABELS: Record<PerformanceRating, string> = { UNGGUL: "Unggul", SANGAT_BAIK: "Sangat Baik", BAIK: "Baik", CUKUP: "Cukup", KURANG: "Kurang" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EVALUATION_START_DATE = new Date("2026-01-11"); // Fixed start date
const getInitials = (n?: string) => { if (!n) return "??"; const w = n.trim().split(/\s+/); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : w[0].substring(0, 2).toUpperCase(); };

// Helper to format project code
const formatProjectCode = (code?: string) => {
    if (!code) return "-";
    const parts = code.split("-");
    const suffix = parts.length > 1 ? parts[1] : code;
    return suffix.toUpperCase();
};

export function CrewPerformance({ role }: CrewPerformanceProps) {
    const [data, setData] = useState<PerformanceEntry[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // View State
    const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("EVALUATION_30_DAYS");
    const [selectedProject, setSelectedProject] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCard, setActiveCard] = useState<FilterCard>("ALL");

    // Sorting
    const [sortBy, setSortBy] = useState<"name" | "score" | "status">("score");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const handleSort = (c: "name" | "score" | "status") => {
        if (sortBy === c) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(c); setSortOrder(c === "score" ? "desc" : "asc"); }
    };

    const SortIcon = ({ c }: { c: "name" | "score" | "status" }) => sortBy !== c ? <ArrowUpDown className="w-3 h-3 text-neutral-400" /> : sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;

    // State for Rating Modal or inline rating
    // We'll do inline rating for "Today" or a selector?
    // User asked "masukin ratingnya manaa".
    // I will add an interactive Star Rating in the table. 
    // When clicked, it updates the rating for the *Current Date* (Today)?
    // Or maybe we need a date picker?
    // Let's assume we rate for the LATEST LOG date or TODAY.
    // Simplifying: Show "Average Rating" (Stars). Beside it, a "Rate Today" button?
    // Or just make the stars interactive and it updates "Today's" rating?
    // Let's try: "Rate Now" button opens a small popup to pick date (default today) and stars.

    // Actually, user wants "tombol bintang, trus bisa milih skala 1-5".
    // I'll add a "Rate" action column.

    const [ratingModal, setRatingModal] = useState<{ isOpen: boolean, crewId: string, crewName: string, date: string, currentRating: number } | null>(null);

    const handleRate = (crewId: string, crewName: string) => {
        // Default to today
        const todayStr = new Date().toISOString().split('T')[0];
        setRatingModal({
            isOpen: true,
            crewId,
            crewName,
            date: todayStr,
            currentRating: 0
        });
    };

    const submitRating = async (val: number) => {
        if (!ratingModal) return;
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) {
                await updateDailyRating(ratingModal.crewId, wsId, ratingModal.date, val);
                // Refresh data
                // Quick hack: toggle viewPeriod to trigger reload
                setViewPeriod(v => v);
            }
            setRatingModal(null);
        } catch (e) {
            console.error("Failed to rate", e);
            alert("Failed to save rating");
        }
    };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (!wsId) return;

                const [projs, members] = await Promise.all([
                    fetchProjectsByWorkspace(wsId),
                    fetchCrewMembers(wsId)
                ]);
                setProjects(projs.map((p: any) => ({ code: p.project_code, name: p.project_name })));

                const today = new Date();
                today.setHours(23, 59, 59, 999);

                const todayMidnight = new Date(today);
                todayMidnight.setHours(0, 0, 0, 0);

                let startDate = new Date();

                if (viewPeriod === "LAST_7_DAYS") {
                    // "Week starts Sunday"
                    startDate = new Date(todayMidnight);
                    startDate.setDate(todayMidnight.getDate() - todayMidnight.getDay()); // Go back to Sunday
                    startDate.setHours(0, 0, 0, 0);
                } else {
                    // Evaluation Mode
                    // 30 Days rolling, but capped at Jan 11
                    const thirtyDaysAgo = new Date(todayMidnight);
                    thirtyDaysAgo.setDate(todayMidnight.getDate() - 29); // 30 days inclusive

                    // Max with Jan 11, 2026
                    startDate = thirtyDaysAgo > EVALUATION_START_DATE ? thirtyDaysAgo : EVALUATION_START_DATE;
                    startDate.setHours(0, 0, 0, 0);
                }

                const allLogs = await fetchDailyLogs(wsId);

                const calculatedData: PerformanceEntry[] = members.map(m => {
                    const memberLogs = allLogs.filter(l => {
                        const ld = new Date(l.date);
                        return l.crewId === m.id && ld >= startDate && ld <= today;
                    });

                    // Elapsed Days Calculation (Calendar Days)
                    // Ensure midnight-to-midnight diff
                    const startMidnight = new Date(startDate);
                    startMidnight.setHours(0, 0, 0, 0);

                    const diffTime = Math.abs(todayMidnight.getTime() - startMidnight.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const elapsedDays = diffDays + 1; // Inclusive (e.g. 11 to 14 = 3 diff + 1 = 4)

                    // 1. Attendance (50%)
                    const daysPresent = memberLogs.filter(l => l.status === "PRESENT" || l.status === "CUTI").length;
                    const halfDays = memberLogs.filter(l => l.status === "HALF_DAY").length;
                    const effectivePresent = daysPresent + (halfDays * 0.5);
                    const attendanceRatio = Math.min(1, effectivePresent / elapsedDays);
                    const attendanceScore = attendanceRatio * 50;

                    // 2. Overtime (25%)
                    // Formula: (Total OT Hours) / (Elapsed Days * 6) * 25
                    const totalOtHours = memberLogs.reduce((sum, l) => sum + l.ot1Hours + l.ot2Hours + l.ot3Hours, 0);
                    const otBenchmark = elapsedDays * 6; // 6 hours per elapsed day benchmark
                    const otRatio = Math.min(1, totalOtHours / (otBenchmark || 1));
                    const overtimeScore = otRatio * 25;

                    // 3. Rating (25%)
                    const ratings = memberLogs.filter(l => l.rating !== undefined && l.rating > 0).map(l => l.rating!);
                    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
                    const ratingScore = (avgRating / 5) * 25;

                    const totalScore = Math.round(attendanceScore + overtimeScore + ratingScore);

                    let ratingLabel: PerformanceRating = "KURANG";
                    let status: "KEEP" | "MONITOR" | "REPLACE" = "REPLACE";

                    if (totalScore >= 80) { ratingLabel = "SANGAT_BAIK"; status = "KEEP"; }
                    else if (totalScore >= 60) { ratingLabel = "CUKUP"; status = "MONITOR"; }
                    else { ratingLabel = "KURANG"; status = "REPLACE"; }

                    return {
                        id: m.id,
                        crewName: m.name,
                        crewRole: m.role,
                        projectCode: m.currentProjectCode || "-",

                        attendanceScore: Math.round(attendanceScore),
                        overtimeScore: Math.round(overtimeScore),
                        ratingScore: Math.round(ratingScore),

                        daysPresent: effectivePresent,
                        daysOt: totalOtHours, // Storing HOURS now for display
                        avgRating: parseFloat(avgRating.toFixed(1)),
                        workingDays: elapsedDays, // Renaming or reusing field for display

                        totalScore,
                        ratingLabel,
                        status
                    };
                });

                setData(calculatedData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [viewPeriod, ratingModal]); // Reload on valid change

    const filtered = useMemo(() => {
        let d = data;

        // Filter Inactive (unless shown?)
        // Note: The calculatedData includes all fetched members.
        // We might want to filter out INACTIVE members if they have 0 attendance?
        // Current requirement doesn't specify, but usually we hide inactive.
        // Let's stick to the requested filters first.

        if (activeCard !== "ALL") d = d.filter(p => p.status === activeCard);
        if (selectedProject !== "ALL") d = d.filter(p => p.projectCode && p.projectCode.includes(selectedProject));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            d = d.filter(p => p.crewName.toLowerCase().includes(q));
        }

        return [...d].sort((a, b) => {
            const cmp = sortBy === "name" ? a.crewName.localeCompare(b.crewName) :
                sortBy === "score" ? a.totalScore - b.totalScore :
                    a.status.localeCompare(b.status);
            return sortOrder === "asc" ? cmp : -cmp;
        });
    }, [data, activeCard, selectedProject, searchQuery, sortBy, sortOrder]);

    const stats = useMemo(() => ({
        avg: data.length > 0 ? Math.round(data.reduce((s, p) => s + p.totalScore, 0) / data.length) : 0,
        keep: data.filter(p => p.status === "KEEP").length,
        monitor: data.filter(p => p.status === "MONITOR").length,
        replace: data.filter(p => p.status === "REPLACE").length
    }), [data]);

    const getScoreColor = (s: number) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-red-600";
    const getStatusBadge = (s: string) => s === "KEEP" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle className="w-3 h-3" /> Keep</span> : s === "MONITOR" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><AlertCircle className="w-3 h-3" /> Monitor</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"><XCircle className="w-3 h-3" /> Replace</span>;
    const getRatingColor = (r: PerformanceRating) => ({ UNGGUL: "bg-purple-100 text-purple-700", SANGAT_BAIK: "bg-emerald-100 text-emerald-700", BAIK: "bg-blue-100 text-blue-700", CUKUP: "bg-amber-100 text-amber-700", KURANG: "bg-red-100 text-red-700" })[r];

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500 relative">
            {/* Rating Modal */}
            {ratingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-neutral-900">Rate {ratingModal.crewName}</h3>
                            <p className="text-sm text-neutral-500">How was their performance today?</p>
                        </div>

                        <div className="flex justify-center gap-2 py-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => submitRating(star)}
                                    className="p-2 hover:scale-110 transition-transform"
                                >
                                    <svg
                                        className={clsx("w-8 h-8", star <= (ratingModal.currentRating || 0) ? "text-amber-400 fill-amber-400" : "text-neutral-300 hover:text-amber-300")}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        onMouseEnter={() => setRatingModal(prev => prev ? { ...prev, currentRating: star } : null)}
                                        onMouseLeave={() => setRatingModal(prev => prev ? { ...prev, currentRating: 0 } : null)}
                                    >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-neutral-500 justify-center bg-neutral-50 p-2 rounded-lg">
                            <span>Date:</span>
                            <input
                                type="date"
                                value={ratingModal.date}
                                onChange={e => setRatingModal(prev => prev ? { ...prev, date: e.target.value } : null)}
                                className="bg-transparent border-none p-0 focus:ring-0 text-neutral-900 font-medium cursor-pointer"
                            />
                        </div>

                        <Button variant="secondary" className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-none" onClick={() => setRatingModal(null)}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* HEADER REMOVED - Using Global PageHeader */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveCard("ALL")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ALL" ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "ALL" ? "text-blue-100" : "text-neutral-500")}>Avg Score</div><div className={clsx("text-2xl font-bold", activeCard === "ALL" ? "text-white" : "text-blue-600")}>{stats.avg}</div></button>
                <button onClick={() => setActiveCard("KEEP")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "KEEP" ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "KEEP" ? "text-emerald-100" : "text-neutral-500")}>Keep</div><div className={clsx("text-2xl font-bold", activeCard === "KEEP" ? "text-white" : "text-emerald-600")}>{stats.keep}</div></button>
                <button onClick={() => setActiveCard("MONITOR")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "MONITOR" ? "bg-amber-500 border-amber-500" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "MONITOR" ? "text-amber-100" : "text-neutral-500")}>Monitor</div><div className={clsx("text-2xl font-bold", activeCard === "MONITOR" ? "text-white" : "text-amber-600")}>{stats.monitor}</div></button>
                <button onClick={() => setActiveCard("REPLACE")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "REPLACE" ? "bg-red-600 border-red-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "REPLACE" ? "text-red-100" : "text-neutral-500")}>Replace</div><div className={clsx("text-2xl font-bold", activeCard === "REPLACE" ? "text-white" : "text-red-600")}>{stats.replace}</div></button>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full bg-neutral-50/50 p-2 rounded-2xl border border-neutral-100">

                {/* Filters */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative w-full lg:w-auto pointer-events-auto z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full lg:w-64 pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-neutral-200/50 p-1 rounded-full">
                        <button
                            onClick={() => setViewPeriod("LAST_7_DAYS")}
                            className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-all", viewPeriod === "LAST_7_DAYS" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setViewPeriod("EVALUATION_30_DAYS")}
                            className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-all", viewPeriod === "EVALUATION_30_DAYS" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}
                        >
                            Evaluation
                        </button>
                    </div>

                    {/* Project Select */}
                    <div className="flex-1 sm:flex-none sm:w-48">
                        <Select
                            value={selectedProject}
                            onChange={setSelectedProject}
                            options={[{ value: "ALL", label: "All Projects" }, ...projects.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))]}
                            placeholder="Project"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant="secondary" className="!rounded-full !py-1.5 !px-3 shadow-sm" icon={<Download className="w-4 h-4" />}>Export</Button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                    <span className="font-semibold">Evaluation Rule:</span> {viewPeriod === "LAST_7_DAYS" ? "This Week (Sun - Sat)" : "30-day rolling window (from Jan 11)"}.<br />
                    <span className="opacity-80">50% Att + 25% OT (Benchmark: 6h/day) + 25% Rating.</span>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" /><p className="text-neutral-400 text-sm mt-2">Calculating KPIs...</p></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">No data found</h3>
                    <p className="text-sm text-neutral-400">Try adjusting filters or ensure daily logs exist for this period.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon c="name" /></div></th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden sm:table-cell">Project</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell" title="Weight: 50%">Attendance</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell" title="Weight: 25%">Overtime</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell" title="Weight: 25%">Rating</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("score")}><div className="flex items-center justify-center gap-1">Total <SortIcon c="score" /></div></th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("status")}><div className="flex items-center justify-center gap-1">Status <SortIcon c="status" /></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filtered.map(e => (
                                    <tr key={e.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{getInitials(e.crewName)}</div>
                                                <div>
                                                    <div className="font-medium text-neutral-900">{e.crewName}</div>
                                                    <div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[e.crewRole]?.en || e.crewRole}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{formatProjectCode(e.projectCode)}</span></td>

                                        {/* Attendance */}
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            <div className="flex flex-col items-center">
                                                <span className={clsx("font-bold", getScoreColor(e.attendanceScore * 2))}>{e.attendanceScore}</span>
                                                <span className="text-[10px] text-neutral-400">{e.daysPresent} of {e.workingDays}d</span>
                                            </div>
                                        </td>

                                        {/* Overtime */}
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            <div className="flex flex-col items-center">
                                                <span className={clsx("font-bold", getScoreColor(e.overtimeScore * 4))}>{e.overtimeScore}</span>
                                                <span className="text-[10px] text-neutral-400">{e.daysOt}h total</span>
                                            </div>
                                        </td>

                                        {/* Rating */}
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleRate(e.id, e.crewName)}>
                                                <span className={clsx("font-bold flex items-center gap-1 group-hover:text-blue-600 transition-colors", getScoreColor(e.ratingScore * 4))}>
                                                    {e.avgRating > 0 ? e.avgRating : "-"}
                                                    <svg className="w-3 h-3 text-amber-500 fill-amber-500" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                </span>
                                                <span className="text-[10px] text-neutral-400 underline decoration-dotted group-hover:text-blue-500">{e.avgRating > 0 ? "Avg Rating" : "Rate Now"}</span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-center"><span className={clsx("text-lg font-bold", getScoreColor(e.totalScore))}>{e.totalScore}</span></td>
                                        <td className="px-4 py-3 text-center">{getStatusBadge(e.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
