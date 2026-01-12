"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Download, ArrowUpDown, Users } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { CREW_ROLE_LABELS, CrewRole } from "@/lib/api/crew";

interface CrewPerformanceProps { role?: string; }

type PerformanceRating = "UNGGUL" | "SANGAT_BAIK" | "BAIK" | "CUKUP" | "KURANG";
type FilterCard = "ALL" | "KEEP" | "MONITOR" | "REPLACE";

interface PerformanceEntry {
    id: string; crewName: string; crewRole: CrewRole; projectCode: string;
    attendance: number; rating: PerformanceRating; score: number; status: "KEEP" | "MONITOR" | "REPLACE";
}

const RATING_LABELS: Record<PerformanceRating, string> = { UNGGUL: "Unggul", SANGAT_BAIK: "Sangat Baik", BAIK: "Baik", CUKUP: "Cukup", KURANG: "Kurang" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getInitials = (n: string) => { const w = n.trim().split(/\s+/); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : w[0].substring(0, 2).toUpperCase(); };

export function CrewPerformance({ role }: CrewPerformanceProps) {
    const [data, setData] = useState<PerformanceEntry[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedProject, setSelectedProject] = useState("ALL");
    const [activeCard, setActiveCard] = useState<FilterCard>("ALL");
    const [sortBy, setSortBy] = useState<"name" | "score" | "status">("score");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const handleSort = (c: "name" | "score" | "status") => { if (sortBy === c) setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy(c); setSortOrder(c === "score" ? "desc" : "asc"); } };
    const SortIcon = ({ c }: { c: "name" | "score" | "status" }) => sortBy !== c ? <ArrowUpDown className="w-3 h-3 text-neutral-400" /> : sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;

    const filtered = useMemo(() => {
        let d = data; if (activeCard !== "ALL") d = d.filter(p => p.status === activeCard); if (selectedProject !== "ALL") d = d.filter(p => p.projectCode === selectedProject);
        return [...d].sort((a, b) => { const cmp = sortBy === "name" ? a.crewName.localeCompare(b.crewName) : sortBy === "score" ? a.score - b.score : a.status.localeCompare(b.status); return sortOrder === "asc" ? cmp : -cmp; });
    }, [data, activeCard, selectedProject, sortBy, sortOrder]);

    const stats = useMemo(() => ({ avg: data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0, keep: data.filter(p => p.status === "KEEP").length, monitor: data.filter(p => p.status === "MONITOR").length, replace: data.filter(p => p.status === "REPLACE").length }), [data]);
    const getScoreColor = (s: number) => s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600";
    const getStatusBadge = (s: string) => s === "KEEP" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle className="w-3 h-3" /> Keep</span> : s === "MONITOR" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><AlertCircle className="w-3 h-3" /> Monitor</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"><XCircle className="w-3 h-3" /> Replace</span>;
    const getRatingColor = (r: PerformanceRating) => ({ UNGGUL: "bg-purple-100 text-purple-700", SANGAT_BAIK: "bg-emerald-100 text-emerald-700", BAIK: "bg-blue-100 text-blue-700", CUKUP: "bg-amber-100 text-amber-700", KURANG: "bg-red-100 text-red-700" })[r];

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            <div className="space-y-4"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-neutral-900">Performance & KPI</h1><p className="text-sm text-neutral-500 mt-1">60% Attendance + 40% Rating.</p></div></div><div className="border-b border-neutral-200" /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveCard("ALL")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ALL" ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "ALL" ? "text-blue-100" : "text-neutral-500")}>Avg Score</div><div className={clsx("text-2xl font-bold", activeCard === "ALL" ? "text-white" : "text-blue-600")}>{stats.avg}</div></button>
                <button onClick={() => setActiveCard("KEEP")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "KEEP" ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "KEEP" ? "text-emerald-100" : "text-neutral-500")}>Keep</div><div className={clsx("text-2xl font-bold", activeCard === "KEEP" ? "text-white" : "text-emerald-600")}>{stats.keep}</div></button>
                <button onClick={() => setActiveCard("MONITOR")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "MONITOR" ? "bg-amber-500 border-amber-500" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "MONITOR" ? "text-amber-100" : "text-neutral-500")}>Monitor</div><div className={clsx("text-2xl font-bold", activeCard === "MONITOR" ? "text-white" : "text-amber-600")}>{stats.monitor}</div></button>
                <button onClick={() => setActiveCard("REPLACE")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "REPLACE" ? "bg-red-600 border-red-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "REPLACE" ? "text-red-100" : "text-neutral-500")}>Replace</div><div className={clsx("text-2xl font-bold", activeCard === "REPLACE" ? "text-white" : "text-red-600")}>{stats.replace}</div></button>
            </div>
            <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <div className="relative flex-shrink-0"><select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="appearance-none pl-3 pr-7 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">{MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" /></div>
                    <div className="relative flex-shrink-0"><select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="appearance-none pl-3 pr-7 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"><option value={2025}>2025</option><option value={2024}>2024</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" /></div>
                </div>
                <Button variant="secondary" className="!rounded-full !py-1.5 !px-3" icon={<Download className="w-4 h-4" />}>Export</Button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700"><strong>Status:</strong> Keep ≥70 • Monitor 50-69 • Replace &lt;50</div>
            {data.length === 0 && <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center"><Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" /><h3 className="font-medium text-neutral-600 mb-2">No performance data</h3><p className="text-sm text-neutral-400">Performance metrics will appear after daily logs are recorded.</p></div>}
            {filtered.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-50 border-b border-neutral-200"><tr><th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon c="name" /></div></th><th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden sm:table-cell">Project</th><th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">Attendance</th><th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">Rating</th><th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("score")}><div className="flex items-center justify-center gap-1">Score <SortIcon c="score" /></div></th><th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("status")}><div className="flex items-center justify-center gap-1">Status <SortIcon c="status" /></div></th></tr></thead><tbody className="divide-y divide-neutral-100">{filtered.map(e => (<tr key={e.id} className="hover:bg-neutral-50 transition-colors"><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{getInitials(e.crewName)}</div><div><div className="font-medium text-neutral-900">{e.crewName}</div><div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[e.crewRole]?.id || e.crewRole}</div></div></div></td><td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{e.projectCode}</span></td><td className="px-4 py-3 text-center hidden md:table-cell"><span className={clsx("font-medium", getScoreColor(e.attendance))}>{e.attendance}</span></td><td className="px-4 py-3 text-center hidden md:table-cell"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", getRatingColor(e.rating))}>{RATING_LABELS[e.rating]}</span></td><td className="px-4 py-3 text-center"><span className={clsx("text-lg font-bold", getScoreColor(e.score))}>{e.score}</span></td><td className="px-4 py-3 text-center">{getStatusBadge(e.status)}</td></tr>))}</tbody></table></div></div>
            )}
        </div>
    );
}
