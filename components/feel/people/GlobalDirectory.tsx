"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import clsx from "clsx";
import {
    Search, Filter, Download, List, LayoutGrid,
    MoreVertical, ChevronRight, Users, UserCheck,
    Shield, Briefcase, Star, Clock, AlertCircle,
    UserX, Trophy, ChevronDown, ChevronUp, ArrowUpDown, X, Loader2
} from "lucide-react";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
import { Button } from "@/shared/ui/primitives/button/button";
import GlobalDirectoryCard from "./GlobalDirectoryCard";
import { Person } from "./types";

interface GlobalDirectoryProps {
    className?: string;
    people: Person[];
    role: string;
    triggerAddPerson: number;
}

type ViewMode = "list" | "grid";
type FilterCard = "all" | "active" | "inactive" | "system" | "top_performer" | "requires_review";

export default function GlobalDirectory({ className, people, role }: GlobalDirectoryProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "list");
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [summaryFilter, setSummaryFilter] = useState<FilterCard>((searchParams.get("filter") as FilterCard) || "all");
    const [sortBy, setSortBy] = useState<"name" | "department" | "status">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Filter Logic
    const filteredPeople = useMemo(() => {
        let data = [...people];

        // 1. Text Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            data = data.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                (p.id_code || p.display_id)?.toLowerCase().includes(lower) ||
                (p.id_number || p.system_id)?.toLowerCase().includes(lower) ||
                p.title.toLowerCase().includes(lower)
            );
        }

        // 2. Summary Card Filters
        if (summaryFilter === "active") data = data.filter(p => p.status === "Active" && p.account_type === "human_account");
        if (summaryFilter === "inactive") data = data.filter(p => p.status !== "Active" && p.account_type === "human_account");
        if (summaryFilter === "system") data = data.filter(p => p.account_type === "system_account");
        if (summaryFilter === "top_performer") data = data.filter(p => (p.performance?.performanceScore || 0) >= 90 && p.account_type === "human_account");
        if (summaryFilter === "requires_review") data = data.filter(p => (p.attendance?.attendanceRate || 100) < 80 && p.account_type === "human_account");
        // "all" typically shows all HUMANS or EVERYTHING? 
        // Prompt says "Total (human accounts only)" for Total card. 
        if (summaryFilter === "all") data = data.filter(p => p.account_type === "human_account");

        return data.sort((a, b) => {
            // First sort by performance inclusion: Included (true/undefined) first, Excluded (false) last
            const aExcluded = a.include_in_performance === false;
            const bExcluded = b.include_in_performance === false;

            if (aExcluded !== bExcluded) {
                return aExcluded ? 1 : -1;
            }

            // Then by the selected column
            if (sortBy === "name") {
                return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
            if (sortBy === "department") {
                return sortOrder === "asc" ? a.department.localeCompare(b.department) : b.department.localeCompare(a.department);
            }
            if (sortBy === "status") {
                return sortOrder === "asc" ? (a.status || "").localeCompare(b.status || "") : (b.status || "").localeCompare(a.status || "");
            }
            return 0;
        });
    }, [people, searchQuery, summaryFilter, sortBy, sortOrder]);

    const handleSort = (col: "name" | "department" | "status") => {
        if (sortBy === col) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(col);
            setSortOrder("asc");
        }
    };

    // Calculate Stats
    const stats = useMemo(() => {
        const humans = people.filter(p => p.account_type === "human_account");
        const system = people.filter(p => p.account_type === "system_account");
        return {
            total: humans.length,
            active: humans.filter(p => p.status === "Active").length,
            inactive: humans.filter(p => p.status !== "Active").length,
            top: humans.filter(p => (p.performance?.performanceScore || 0) >= 90).length,
            review: humans.filter(p => (p.attendance?.attendanceRate || 100) < 80).length,
            system: system.length
        };
    }, [people]);

    // Helper for Status Badge
    const getStatusBadge = (status: string, type: string) => {
        if (type === "system_account") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">SYSTEM</span>;
        switch (status) {
            case "Active": return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">ACTIVE</span>;
            case "On Leave": return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">ON LEAVE</span>;
            case "Probation": return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">PROBATION</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-50 text-neutral-500 border border-neutral-100">{status?.toUpperCase() || "INACTIVE"}</span>;
        }
    };

    return (
        <div className={clsx("space-y-6 w-full animate-in fade-in duration-500", className)}>

            {/* 1. SUMMARY CARDS */}
            <SummaryCardsRow className="lg:grid-cols-6">
                <SummaryCard
                    label="Total Staff"
                    value={stats.total}
                    subtext="Human accounts"
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    isActive={summaryFilter === "all"}
                    onClick={() => setSummaryFilter("all")}
                    activeColor="ring-blue-500 border-blue-200"
                />
                <SummaryCard
                    label="Active"
                    value={stats.active}
                    subtext="Currently working"
                    icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                    isActive={summaryFilter === "active"}
                    onClick={() => setSummaryFilter("active")}
                    activeColor="ring-emerald-500 border-emerald-200"
                />
                <SummaryCard
                    label="Not Active"
                    value={stats.inactive}
                    subtext="Leave / Inactive"
                    icon={<UserX className="w-5 h-5 text-orange-600" />}
                    iconBg="bg-orange-50"
                    isActive={summaryFilter === "inactive"}
                    onClick={() => setSummaryFilter("inactive")}
                    activeColor="ring-orange-500 border-orange-200"
                />
                <SummaryCard
                    label="Top Performer"
                    value={stats.top}
                    subtext="Score > 90"
                    icon={<Trophy className="w-5 h-5 text-amber-600" />}
                    iconBg="bg-amber-50"
                    isActive={summaryFilter === "top_performer"}
                    onClick={() => setSummaryFilter("top_performer")}
                    activeColor="ring-amber-500 border-amber-200"
                />
                <SummaryCard
                    label="Requires Review"
                    value={stats.review}
                    subtext="Attendance < 80%"
                    icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
                    iconBg="bg-rose-50"
                    isActive={summaryFilter === "requires_review"}
                    onClick={() => setSummaryFilter("requires_review")}
                    activeColor="ring-rose-500 border-rose-200"
                />
                <SummaryCard
                    label="System Accounts"
                    value={stats.system}
                    subtext="Service users"
                    icon={<Shield className="w-5 h-5 text-neutral-600" />}
                    iconBg="bg-neutral-100"
                    isActive={summaryFilter === "system"}
                    onClick={() => setSummaryFilter("system")}
                    activeColor="ring-neutral-500 border-neutral-200"
                />
            </SummaryCardsRow>

            {/* 2. TOOLBAR ROW (Copied from Crew/Clock) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 w-full">
                {/* Search */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-full sm:w-48 transition-all"
                        />
                    </div>
                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilterPopup(!showFilterPopup)}
                        className={clsx(
                            "p-2.5 rounded-full border transition-colors flex items-center gap-1.5 flex-none",
                            "border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="secondary"
                        className="!rounded-full !py-1.5 !px-3 flex-1 sm:flex-none justify-center"
                        icon={isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={() => setIsExporting(true)}
                        disabled={isExporting}
                    >
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                    <div className="flex items-center bg-neutral-100 rounded-full p-1 flex-none">
                        <button
                            onClick={() => setViewMode("list")}
                            className={clsx("p-2 rounded-full transition-colors", viewMode === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={clsx("p-2 rounded-full transition-colors", viewMode === "grid" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. CONTENT AREA */}

            {/* GRID VIEW (Desktop Only typically, but handled responsively in GlobalDirectoryCard) */}
            {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPeople.map(person => (
                        <GlobalDirectoryCard key={person.id} person={person} />
                    ))}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === "list" && (
                <>
                    {/* 3a. MOBILE LIST (Clock-style Compact Cards using inline div) */}
                    <div className="md:hidden space-y-3">
                        {filteredPeople.map((person) => {
                            const isSystem = person.account_type === "system_account";
                            return (
                                <div
                                    key={person.id}
                                    className={clsx(
                                        "rounded-2xl border p-3.5 shadow-sm transition-all active:scale-[0.98]",
                                        isSystem ? "border-neutral-200 bg-neutral-50/50" :
                                            (person.include_in_performance === false ? "bg-neutral-50/80 border-neutral-100 opacity-80" : "bg-white border-neutral-200")
                                    )}
                                    onClick={() => router.push(`/feel/people/profile/${person.id}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Left: Avatar */}
                                        <div className="shrink-0">
                                            <div className={clsx(
                                                "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm",
                                                isSystem ? "bg-neutral-200 text-neutral-500" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                                            )}>
                                                {person.avatarUrl ? (
                                                    <img src={person.avatarUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    person.initials
                                                )}
                                            </div>
                                        </div>

                                        {/* Middle: Content */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-neutral-900 truncate">
                                                    {person.name}
                                                </span>
                                                {isSystem && <Shield className="w-3 h-3 text-neutral-400" />}
                                            </div>
                                            <div className="text-xs text-neutral-500 truncate">
                                                {person.title}
                                            </div>
                                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                                {person.id_code || person.display_id || person.id_number || person.system_id}
                                            </div>
                                        </div>

                                        {/* Right: Status / Performance */}
                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                            {getStatusBadge(person.status, person.account_type)}
                                            {!isSystem && person.performance && (
                                                <div className="flex items-center gap-1 text-xs font-medium text-neutral-600">
                                                    <Star className={clsx("w-3 h-3", (person.performance.performanceScore || 0) >= 90 ? "text-amber-400 fill-amber-400" : "text-neutral-300")} />
                                                    {person.performance.performanceScore || "-"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 3b. DESKTOP TABLE (Crew-style) */}
                    <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th
                                            className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                            onClick={() => handleSort("name")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Employee
                                                <ArrowUpDown className={clsx("w-3 h-3", sortBy === "name" ? "text-neutral-600" : "text-neutral-400")} />
                                            </div>
                                        </th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">ID</th>
                                        <th
                                            className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                            onClick={() => handleSort("department")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Role
                                                <ArrowUpDown className={clsx("w-3 h-3", sortBy === "department" ? "text-neutral-600" : "text-neutral-400")} />
                                            </div>
                                        </th>
                                        <th
                                            className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                            onClick={() => handleSort("status")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Status
                                                <ArrowUpDown className={clsx("w-3 h-3", sortBy === "status" ? "text-neutral-600" : "text-neutral-400")} />
                                            </div>
                                        </th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Performance</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredPeople.map(person => {
                                        const isSystem = person.account_type === "system_account";
                                        return (
                                            <tr
                                                key={person.id}
                                                className={clsx(
                                                    "group hover:bg-neutral-50 transition-colors cursor-pointer",
                                                    person.include_in_performance === false ? "bg-orange-50/40 text-orange-900/60" : "bg-white text-neutral-900"
                                                )}
                                                onClick={() => router.push(`/feel/people/profile/${person.id}`)}
                                            >
                                                {/* 1. Employee */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx(
                                                            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm",
                                                            isSystem ? "bg-neutral-200 text-neutral-500" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                                                        )}>
                                                            {person.avatarUrl ? <img src={person.avatarUrl} className="w-full h-full rounded-full object-cover" /> : person.initials}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                                                                {person.name}
                                                                {isSystem && <Shield className="w-3 h-3 text-neutral-400" />}
                                                            </div>
                                                            <div className="text-xs text-neutral-500">{person.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* 2. ID */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-mono text-xs text-neutral-700">{person.id_code || person.display_id || "-"}</span>
                                                        <span className="font-mono text-[10px] text-neutral-400">{person.id_number || person.system_id}</span>
                                                    </div>
                                                </td>
                                                {/* 3. Role */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm text-neutral-900">{person.title}</span>
                                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                            {person.department}
                                                            <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                                            {person.level}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* 4. Status */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(person.status, person.account_type)}
                                                </td>
                                                {/* 5. Performance */}
                                                <td className="px-6 py-4">
                                                    {!isSystem ? (
                                                        <div className="flex items-center gap-2 group/perf relative">
                                                            <div className={clsx(
                                                                "px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1",
                                                                (person.performance?.performanceScore || 0) >= 90 ? "bg-amber-50 text-amber-700" :
                                                                    (person.performance?.performanceScore || 0) >= 75 ? "bg-emerald-50 text-emerald-700" :
                                                                        "bg-red-50 text-red-700"
                                                            )}>
                                                                {(person.performance?.performanceScore || 0) >= 90 && <Star className="w-3 h-3 fill-current" />}
                                                                {person.performance?.performanceScore || 0}
                                                            </div>
                                                            <span className="text-xs text-neutral-500 truncate max-w-[100px]">
                                                                {person.performance?.performanceStatus}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-neutral-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                {/* 6. Action */}
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
