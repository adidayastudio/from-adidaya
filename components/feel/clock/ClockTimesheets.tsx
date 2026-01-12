"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { format, startOfWeek } from "date-fns";
import { Download, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, Search, List, Grid3X3, ArrowUpDown, BarChart3, Calendar, User, Users, ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "./ViewToggle";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { calculateStats, formatMinutes, ClockStats } from "@/lib/clock-data-logic";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { AttendanceRecord } from "@/lib/api/clock";

interface ClockTimesheetsProps {
    role?: UserRole;
    userName?: string;
}

const ITEMS_PER_PAGE = 25;

export function ClockTimesheets({ role, userName = "Staff Member" }: ClockTimesheetsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "grid" | "chart">("list");
    const [personalTeamView, setPersonalTeamView] = useState<"personal" | "team">("personal");
    const [sortBy, setSortBy] = useState<"date" | "employee">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Advanced filters
    const [selectedPerson, setSelectedPerson] = useState<string>("all");
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    // Month Navigation
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
        setCurrentPage(1);
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const formatMonthShort = (date: Date) => {
        const month = date.toLocaleDateString("en-US", { month: "short" });
        const year = date.getFullYear().toString().slice(-2);
        return `${month}-${year}`;
    };

    // Mobile search toggle
    const [showSearchInput, setShowSearchInput] = useState(false);

    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const { attendance, leaves, loading } = useClockData(profile?.id, personalTeamView === "team");

    // -- MAP DATA TO UI FORMAT --
    const rawData = useMemo(() => {
        return attendance.map(r => ({
            ...r,
            employee: r.userName || "Unknown",
            day: format(new Date(r.date), "EEE"),
            schedule: "-", // We could derive this from shift settings later
            duration: r.totalMinutes ? formatMinutes(r.totalMinutes) : "-",
            overtime: r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "-",
            clockIn: r.clockIn ? format(new Date(r.clockIn), "HH:mm") : "-",
            clockOut: r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "-",
        }));
    }, [attendance]);

    // -- STATS CALCULATION --
    const [stats, setStats] = useState<ClockStats | null>(null);
    const [weeklyLateCount, setWeeklyLateCount] = useState(0);

    // Get unique list of employees
    const uniqueEmployees = useMemo(() => {
        return Array.from(new Set(rawData.map(d => d.employee).filter(Boolean)));
    }, [rawData]);

    const handleSort = (column: "date" | "employee") => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("desc");
        }
    };

    const filteredData = useMemo(() => {
        let data = [...rawData];

        // Filter by selected person
        if (selectedPerson !== "all") {
            data = data.filter(d => d.employee === selectedPerson);
        }

        // Filter by date range
        if (dateFrom) {
            data = data.filter(d => new Date(d.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            data = data.filter(d => new Date(d.date) <= new Date(dateTo));
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(d =>
                d.employee?.toLowerCase().includes(query) ||
                d.date.includes(query) ||
                d.status.toLowerCase().includes(query)
            );
        }

        return data.sort((a, b) => {
            if (sortBy === "date") {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            } else if (sortBy === "employee") {
                const nameA = a.employee || "";
                const nameB = b.employee || "";
                return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
            return 0;
        });
    }, [rawData, sortBy, sortOrder, selectedPerson, dateFrom, dateTo, searchQuery]);

    // Update stats when filtered data changes
    useEffect(() => {
        // cast because of slight type mismatch (mapped fields above make it compatible)
        setStats(calculateStats(filteredData as any));
        if (personalTeamView === "personal") {
            const today = new Date();
            const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
            const lateCount = filteredData.filter(r => r.status === "late" && new Date(r.date) >= startOfCurrentWeek).length;
            setWeeklyLateCount(lateCount);
        }
    }, [filteredData, personalTeamView]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // EXPORT FUNCTIONALITY
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (filteredData.length === 0) return;
        setExporting(true);

        try {
            const documentName = personalTeamView === "team" ? "Team Timesheets Report" : "My Timesheets Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = formatMonthYear(currentMonth);

            const ontimeCount = filteredData.filter(d => d.status === "ontime").length;
            const lateCount = filteredData.filter(d => d.status === "late").length;
            const absentCount = filteredData.filter(d => d.status === "absent").length;

            const summaryCards = [
                { label: "Total Records", value: filteredData.length, format: "number" as const },
                { label: "On Time", value: ontimeCount, format: "number" as const, color: "green" as const },
                { label: "Late", value: lateCount, format: "number" as const, color: "red" as const },
                { label: "Absent", value: absentCount, format: "number" as const, color: "orange" as const },
            ];

            const columns = personalTeamView === "team" ? [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "date", label: "Date", align: "left" as const },
                { id: "clockIn", label: "Clock In", align: "center" as const },
                { id: "clockOut", label: "Clock Out", align: "center" as const },
                { id: "totalHours", label: "Total Hours", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ] : [
                { id: "date", label: "Date", align: "left" as const },
                { id: "clockIn", label: "Clock In", align: "center" as const },
                { id: "clockOut", label: "Clock Out", align: "center" as const },
                { id: "totalHours", label: "Total Hours", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = filteredData.map(r => ({
                employee: r.employee,
                date: r.date,
                clockIn: r.clockIn || "-",
                clockOut: r.clockOut || "-",
                totalHours: r.duration || "-",
                status: r.status
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "TIMESHEETS",
                        projectName: "Adidaya Clock Timesheets",
                        documentName,
                        periodText,
                        generatedAt,
                    },
                    summary: summaryCards,
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Timesheets_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const getStatusBadge = (status: string, iconOnly = false) => {
        if (iconOnly) {
            switch (status) {
                case "ontime": return <div className="p-1 rounded-full bg-emerald-100 text-emerald-600" title="On Time"><Check className="w-3 h-3" /></div>;
                case "late": return <div className="p-1 rounded-full bg-rose-100 text-rose-600" title="Late"><AlertCircle className="w-3 h-3" /></div>;
                case "weekend": return <div className="p-1 rounded-full bg-neutral-100 text-neutral-500" title="Weekend"><Clock className="w-3 h-3" /></div>;
                case "holiday": return <div className="p-1 rounded-full bg-blue-100 text-blue-600" title="Holiday"><Calendar className="w-3 h-3" /></div>;
                case "absent": return <div className="p-1 rounded-full bg-red-100 text-red-600" title="Absent"><AlertTriangle className="w-3 h-3" /></div>;
                case "sick": return <div className="p-1 rounded-full bg-orange-100 text-orange-600" title="Sick"><AlertCircle className="w-3 h-3" /></div>;
                case "leave": return <div className="p-1 rounded-full bg-purple-100 text-purple-600" title="Leave"><Calendar className="w-3 h-3" /></div>;
                default: return <div className="w-5 h-5" />;
            }
        }
        switch (status) {
            case "ontime": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle className="w-3 h-3" /> On Time</span>;
            case "late": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700"><AlertCircle className="w-3 h-3" /> Late</span>;
            case "weekend": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">Weekend</span>;
            case "holiday": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Holiday</span>;
            case "absent": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"><AlertTriangle className="w-3 h-3" /> Absent</span>;
            case "sick": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">Sick</span>;
            case "leave": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">Leave</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Timesheets</h1>
                        <p className="text-sm text-neutral-500 mt-1">Daily entry logs and attendance records.</p>
                    </div>
                    <ViewToggle viewMode={personalTeamView} onViewChange={(v) => { setPersonalTeamView(v); setCurrentPage(1); }} role={role} />
                </div>

                {/* LATE ALERT (Personal) */}
                {personalTeamView === "personal" && weeklyLateCount > 3 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-rose-800">Attendance Alert</h4>
                            <p className="text-sm text-rose-700 mt-1">
                                You have been late <span className="font-bold">{weeklyLateCount} times</span> this week.
                                Please ensure punctuality to maintain your KPI score. Frequent lateness (3+ times/week) may impact your performance review.
                            </p>
                        </div>
                    </div>
                )}

                <div className="border-b border-neutral-200" />

                {/* SUMMARY STATS (Payroll / KPI Logic) */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">Days Present</div>
                            <div className="text-xl font-bold text-neutral-900 mt-1">{stats.totalDaysPresent}</div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">Late Arrivals</div>
                            <div className={clsx("text-xl font-bold mt-1", stats.totalDaysLate > 0 ? "text-rose-600" : "text-neutral-900")}>
                                {stats.totalDaysLate}
                            </div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">Absent/Leave</div>
                            <div className="text-xl font-bold text-neutral-900 mt-1">
                                {stats.totalDaysAbsent + stats.totalDaysLeave + stats.totalDaysSick}
                            </div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">Overtime Hours</div>
                            <div className="text-xl font-bold text-emerald-600 mt-1">
                                {formatMinutes(stats.totalOvertimeMinutes)}
                            </div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">Attendance Score</div>
                            <div className={clsx(
                                "text-xl font-bold mt-1",
                                stats.attendanceScore >= 90 ? "text-emerald-600" :
                                    stats.attendanceScore >= 75 ? "text-yellow-600" : "text-rose-600"
                            )}>
                                {stats.attendanceScore}%
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* TOOLBAR - SUPER COMPACT */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* LEFT GROUP: Search (Team only) + Month Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Team Search: Icon on tiny, Input on sm+ */}
                    {isManager && personalTeamView === "team" && (
                        <>
                            {/* Icon-only button for tiny screens */}
                            <button
                                onClick={() => setShowSearchInput(!showSearchInput)}
                                className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
                                title="Search"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                            {/* Full input for md+ */}
                            <div className="relative hidden md:block flex-shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-action-primary w-36"
                                />
                            </div>
                        </>
                    )}

                    {/* Month Picker: Short on tiny, Full on md+ */}
                    <div className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-full px-1 py-1 shadow-sm flex-shrink-0">
                        <button
                            onClick={() => handleMonthChange("prev")}
                            className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {/* Short format on small, full on md+ */}
                        <span className="text-xs font-medium text-neutral-700 text-center select-none px-1 md:hidden min-w-[50px]">
                            {formatMonthShort(currentMonth)}
                        </span>
                        <span className="text-sm font-medium text-neutral-700 text-center select-none px-1 hidden md:block min-w-[90px]">
                            {formatMonthYear(currentMonth)}
                        </span>
                        <button
                            onClick={() => handleMonthChange("next")}
                            className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* RIGHT GROUP: Export + View Toggle */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Export: Icon only on tiny, full on sm+ */}
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                        title="Export"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <Button variant="secondary" onClick={handleExport} disabled={exporting} className="!rounded-full !py-1.5 !px-3 hidden md:flex" icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}>{exporting ? "Exporting..." : "Export"}</Button>

                    {/* View Toggle - same size as other pages */}
                    <div className="flex items-center bg-neutral-100 rounded-full p-1">
                        <button
                            onClick={() => setViewMode("list")}
                            className={clsx("p-2 rounded-full transition-colors", viewMode === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={clsx("p-2 rounded-full transition-colors", viewMode === "grid" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                            title="Grid View"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("chart")}
                            className={clsx("p-2 rounded-full transition-colors", viewMode === "chart" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                            title="Chart View"
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Search Input for tiny screens */}
            {isManager && personalTeamView === "team" && showSearchInput && (
                <div className="sm:hidden relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-action-primary w-full"
                        autoFocus
                    />
                </div>
            )}

            {/* LIST VIEW (TABLE) */}

            {/* LIST VIEW (TABLE) */}


            {viewMode === "list" && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    {isManager && personalTeamView === "team" && (
                                        <th
                                            className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100 transition-colors select-none"
                                            onClick={() => handleSort("employee")}
                                        >
                                            <span className="flex items-center gap-1">
                                                Employee
                                                {sortBy === "employee" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ArrowUpDown className="w-4 h-4 text-neutral-400" />
                                                )}
                                            </span>
                                        </th>
                                    )}
                                    <th
                                        className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100 transition-colors select-none"
                                        onClick={() => handleSort("date")}
                                    >
                                        <span className="flex items-center gap-1">
                                            Date
                                            {sortBy === "date" ? (
                                                sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ArrowUpDown className="w-4 h-4 text-neutral-400" />
                                            )}
                                        </span>
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Schedule</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Clock In</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Location</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Clock Out</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Duration</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Overtime</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {paginatedData.map((row, idx) => {
                                    // Get location label
                                    const getLocationLabel = () => {
                                        const mode = row.checkInRemoteMode;
                                        const locType = row.checkInLocationType;
                                        const locCode = row.checkInLocationCode;
                                        const status = row.checkInLocationStatus;

                                        if (status === "inside" && locType === "office") {
                                            return { label: `WFO`, code: locCode, color: "text-blue-600" };
                                        }
                                        if (status === "inside" && locType === "project") {
                                            return { label: `Project`, code: locCode, color: "text-emerald-600" };
                                        }
                                        if (mode === "WFH") return { label: "WFH", code: null, color: "text-purple-600" };
                                        if (mode === "WFA") return { label: "WFA", code: null, color: "text-indigo-600" };
                                        if (mode === "business_trip") return { label: "BST", code: null, color: "text-orange-600" };
                                        if (mode === "other") return { label: "Other", code: null, color: "text-neutral-500" };
                                        return null;
                                    };

                                    const mapsUrl = (row.checkInLatitude && row.checkInLongitude)
                                        ? `https://maps.google.com/?q=${row.checkInLatitude},${row.checkInLongitude}`
                                        : null;
                                    const locInfo = getLocationLabel();

                                    return (
                                        <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                            {isManager && personalTeamView === "team" && <td className="px-6 py-4 font-medium text-neutral-900">{row.employee}</td>}
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-neutral-900">{row.day}</div>
                                                <div className="text-xs text-neutral-500">{new Date(row.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-700">{row.schedule}</td>
                                            <td className="px-6 py-4 font-mono text-neutral-900">{row.clockIn}</td>
                                            <td className="px-6 py-4">
                                                {locInfo ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={clsx("text-xs font-bold", locInfo.color)}>
                                                            {locInfo.label}{locInfo.code && ` (${locInfo.code})`}
                                                        </span>
                                                        {mapsUrl && (
                                                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-blue-600 transition-colors" title="Open in Maps">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-neutral-900">{row.clockOut}</td>
                                            <td className="px-6 py-4 font-medium text-neutral-900">{row.duration}</td>
                                            <td className="px-6 py-4">
                                                {row.overtime !== "-" ? (
                                                    <span className="text-emerald-600 font-medium">+{row.overtime}</span>
                                                ) : (
                                                    <span className="text-neutral-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                        </tr>
                                    );
                                })}
                                {paginatedData.length === 0 && (
                                    <tr>
                                        <td colSpan={isManager && personalTeamView === "team" ? 10 : 9} className="px-6 py-8 text-center text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft className="w-4 h-4 text-neutral-500" />
                            </button>
                            <span className="text-sm text-neutral-600">Page {currentPage} of {totalPages}</span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                                <ChevronRight className="w-4 h-4 text-neutral-500" />
                            </button>
                        </div>
                    )}
                </div>
            )
            }

            {/* GRID VIEW */}
            {
                viewMode === "grid" && (
                    <>
                        {/* PERSONAL: Calendar-style grid */}
                        {personalTeamView === "personal" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="text-center text-xs font-semibold text-neutral-500 uppercase py-2 hidden md:block">{day}</div>
                                ))}
                                {filteredData.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "bg-white rounded-xl border p-3 min-h-[100px] transition-all hover:shadow-md",
                                            row.status === "ontime" && "border-emerald-200 hover:border-emerald-300",
                                            row.status === "late" && "border-rose-200 hover:border-rose-300",
                                            row.status === "weekend" && "border-neutral-100 bg-neutral-50",
                                            row.status === "holiday" && "border-blue-200 bg-blue-50/50",
                                            row.status === "absent" && "border-red-200 bg-red-50/30",
                                            row.status === "sick" && "border-orange-200 bg-orange-50/30",
                                            row.status === "leave" && "border-purple-200 bg-purple-50/30",
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-neutral-500">{new Date(row.date).getDate()}</div>
                                            <div className="text-xs font-medium text-neutral-900">{row.day}</div>
                                        </div>
                                        {(row.status === "ontime" || row.status === "late") && (
                                            <>
                                                <div className="mt-2 text-xs text-neutral-600 flex flex-col gap-0.5">
                                                    <span className="font-mono text-[10px]">{row.clockIn}</span>
                                                    <span className="font-mono text-[10px]">{row.clockOut}</span>
                                                </div>
                                                <div className="mt-2 flex justify-end">{getStatusBadge(row.status, true)}</div>
                                            </>
                                        )}
                                        {/* Handle other statuses */}
                                        {(row.status !== "ontime" && row.status !== "late") && (
                                            <div className="mt-4 flex justify-center">
                                                {getStatusBadge(row.status, true)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TEAM: Employee cards grid */}
                        {isManager && personalTeamView === "team" && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {/* Group by unique employees */}
                                {Array.from(new Set(filteredData.map(d => d.employee).filter(Boolean))).map((employee, idx) => {
                                    const latestRecord = filteredData.find(d => d.employee === employee);
                                    if (!latestRecord) return null;
                                    return (
                                        <div
                                            key={idx}
                                            className={clsx(
                                                "bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer",
                                                latestRecord.status === "ontime" && "border-emerald-200 hover:border-emerald-400",
                                                latestRecord.status === "late" && "border-rose-200 hover:border-rose-400",
                                                latestRecord.status === "weekend" && "border-neutral-200",
                                                latestRecord.status === "holiday" && "border-blue-200"
                                            )}
                                        >
                                            {/* Avatar/Initials */}
                                            <div className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3",
                                                latestRecord.status === "ontime" && "bg-emerald-100 text-emerald-700",
                                                latestRecord.status === "late" && "bg-rose-100 text-rose-700",
                                                (latestRecord.status === "weekend" || latestRecord.status === "holiday") && "bg-neutral-100 text-neutral-500"
                                            )}>
                                                {employee?.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            {/* Name */}
                                            <div className="font-semibold text-neutral-900 text-sm truncate">{employee}</div>
                                            {/* Date */}
                                            <div className="text-xs text-neutral-400 mt-0.5">
                                                {new Date(latestRecord.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>

                                            {/* Time & Status Compact */}
                                            <div className="mt-3 flex items-center justify-between">
                                                {latestRecord.status !== "weekend" && latestRecord.status !== "holiday" ? (
                                                    <div className="text-xs text-neutral-500 font-mono">
                                                        {latestRecord.clockIn}
                                                    </div>
                                                ) : <span></span>}
                                                <div>{getStatusBadge(latestRecord.status, true)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )
            }

            {/* CHART VIEW */}
            {
                viewMode === "chart" && (
                    <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-neutral-900">Attendance Overview</h3>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-neutral-600">On Time</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <span className="text-neutral-600">Late</span>
                                </div>
                            </div>
                        </div>

                        {/* Bar Chart - Grouped by Employee */}
                        <div className="space-y-4">
                            {Array.from(new Set(filteredData.map(d => d.employee).filter(Boolean))).map((employee, idx) => {
                                const employeeRecords = filteredData.filter(d => d.employee === employee);
                                const onTimeCount = employeeRecords.filter(d => d.status === "ontime").length;
                                const lateCount = employeeRecords.filter(d => d.status === "late").length;
                                const totalWork = onTimeCount + lateCount;
                                const onTimePercent = totalWork > 0 ? (onTimeCount / totalWork) * 100 : 0;
                                const latePercent = totalWork > 0 ? (lateCount / totalWork) * 100 : 0;

                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-neutral-900 truncate w-32">{employee}</span>
                                            <span className="text-xs text-neutral-500">{onTimeCount} on time, {lateCount} late</span>
                                        </div>
                                        <div className="flex h-6 rounded-full overflow-hidden bg-neutral-100">
                                            {onTimePercent > 0 && (
                                                <div
                                                    className="bg-emerald-500 h-full flex items-center justify-center text-xs text-white font-medium"
                                                    style={{ width: `${onTimePercent}%` }}
                                                >
                                                    {onTimePercent > 20 && `${Math.round(onTimePercent)}%`}
                                                </div>
                                            )}
                                            {latePercent > 0 && (
                                                <div
                                                    className="bg-rose-500 h-full flex items-center justify-center text-xs text-white font-medium"
                                                    style={{ width: `${latePercent}%` }}
                                                >
                                                    {latePercent > 20 && `${Math.round(latePercent)}%`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Stats */}
                        {stats && (
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600">
                                        {stats.totalDaysPresent - stats.totalDaysLate}
                                    </div>
                                    <div className="text-xs text-neutral-500">Pure On Time</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-rose-600">
                                        {stats.totalDaysLate}
                                    </div>
                                    <div className="text-xs text-neutral-500">Late Days</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-action-primary">
                                        {stats.attendanceScore}%
                                    </div>
                                    <div className="text-xs text-neutral-500">Score</div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* SUMMARY FOOTER */}
            <div className="flex items-center justify-between text-sm text-neutral-500 px-2">
                <span>
                    Showing {paginatedData.length} records
                    {dateFrom || dateTo ? ` (${dateFrom || 'Start'} to ${dateTo || 'Now'})` : ''}
                </span>
                {stats && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Total Overtime: {formatMinutes(stats.totalOvertimeMinutes)}
                    </span>
                )}
            </div>
        </div >
    );
}
