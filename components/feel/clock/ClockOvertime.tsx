import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { Hourglass, Plus, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, Download, X, Check, Ban, Edit, Trash, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "./ViewToggle";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { formatDuration } from "@/lib/clock-utils";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { formatMinutes } from "@/lib/clock-data-logic";
import {
    OvertimeLog,
    updateOvertimeLog, deleteOvertimeLog,
    updateRequestStatus,
    syncOvertimeToAttendance
} from "@/lib/api/clock";
import { ClockConfirmationModal } from "./ClockConfirmationModal";

interface ClockOvertimeProps {
    role?: UserRole;
    userName?: string;
    onLogOvertime?: () => void;
    onEditLog?: (overtime: OvertimeLog) => void;
    onViewLog?: (overtime: OvertimeLog) => void;
}

export function ClockOvertime({ role, userName = "Staff Member", onLogOvertime, onEditLog, onViewLog }: ClockOvertimeProps) {
    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "employee" | "overtime">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { overtime, loading, refresh } = useClockData(profile?.id, viewMode === "team");

    // Map fetched data to UI format
    const rawData = useMemo(() => {
        return overtime.map(o => {
            // Use approved times if available, otherwise original
            const effectiveStartTime = o.approvedStartTime || o.startTime;
            const effectiveEndTime = o.approvedEndTime || o.endTime;

            const start = new Date(`${o.date}T${effectiveStartTime}`);
            const end = new Date(`${o.date}T${effectiveEndTime}`);
            const diff = Math.floor((end.getTime() - start.getTime()) / 60000);

            return {
                id: o.id,
                userId: o.userId,
                employee: o.userName || userName,
                date: o.date,
                clockIn: effectiveStartTime?.substring(0, 5), // Ensure HH:mm format
                clockOut: effectiveEndTime?.substring(0, 5),   // Ensure HH:mm format
                totalMinutes: diff + 480, // Assuming 8h work + OT
                overtimeMinutes: diff,
                status: o.status,
                reason: o.description,
                original: o // Keep for edit
            };
        });
    }, [overtime, userName]);

    // Month Navigation
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showSearchInput, setShowSearchInput] = useState(false);

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const formatMonthShort = (date: Date) => {
        const month = date.toLocaleDateString("en-US", { month: "short" });
        const year = date.getFullYear().toString().slice(-2);
        return `${month}-${year}`;
    };

    const filteredData = useMemo(() => {
        let data = [...rawData];

        // Filter by selected month
        const selectedYear = currentMonth.getFullYear();
        const selectedMonthNum = currentMonth.getMonth();
        data = data.filter(d => {
            const recordDate = new Date(d.date);
            return recordDate.getFullYear() === selectedYear && recordDate.getMonth() === selectedMonthNum;
        });

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(d =>
                d.employee.toLowerCase().includes(query) ||
                d.date.includes(query)
            );
        }

        return [...data].sort((a, b) => {
            if (sortBy === "date") {
                return sortOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
            } else if (sortBy === "employee") {
                return sortOrder === "asc" ? a.employee.localeCompare(b.employee) : b.employee.localeCompare(a.employee);
            } else if (sortBy === "overtime") {
                return sortOrder === "asc" ? a.overtimeMinutes - b.overtimeMinutes : b.overtimeMinutes - a.overtimeMinutes;
            }
            return 0;
        });
    }, [rawData, searchQuery, sortBy, sortOrder, currentMonth]);

    const handleSort = (column: "date" | "employee" | "overtime") => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("desc");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Pending</span>;
            case "approved": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Approved</span>;
            case "rejected": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">Rejected</span>;
            case "cancelled": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">Cancelled</span>;
            default: return null;
        }
    };

    // Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant: "default" | "danger" | "warning" | "success";
        requireReason: boolean;
        enableCorrection?: boolean;
        initialStartTime?: string;
        initialEndTime?: string;
        onConfirm: (reason?: string, correction?: { approvedStartTime?: string; approvedEndTime?: string }) => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        variant: "default",
        requireReason: false,
        enableCorrection: false,
        onConfirm: async () => { },
    });

    // ACTION HANDLERS
    const handleApprove = (row: typeof rawData[0]) => {
        setConfirmConfig({
            isOpen: true,
            title: "Approve Overtime Request",
            description: "Are you sure you want to approve this overtime request? You can adjust the start/end time if needed.",
            variant: "success",
            requireReason: false,
            enableCorrection: true,
            initialStartTime: row.clockIn?.substring(0, 5),
            initialEndTime: row.clockOut?.substring(0, 5),
            onConfirm: async (reason, correction) => {
                setActionLoading(row.id);
                try {
                    // Pass correction object if provided
                    await updateRequestStatus("overtime", row.id, "approved", reason, correction);
                    await syncOvertimeToAttendance(row.userId, row.date);
                    refresh();
                } catch (e: any) {
                    console.error("Approval Error:", e);
                    alert(`Failed to approve: ${e.message || "Unknown error"}`);
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleReject = (id: string, userId: string, date: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Reject Overtime Request",
            description: "Please provide a reason for rejecting this request.",
            variant: "danger",
            requireReason: true,
            onConfirm: async (reason) => {
                setActionLoading(id);
                try {
                    await updateRequestStatus("overtime", id, "rejected", reason);
                    await syncOvertimeToAttendance(userId, date);
                    refresh();
                } catch (e) {
                    console.error(e);
                    alert("Failed to reject");
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleCancel = (id: string, userId: string, date: string, status: string) => {
        const isApproved = status === "approved";
        setConfirmConfig({
            isOpen: true,
            title: isApproved ? "Cancel Approved Request" : "Cancel Request",
            description: isApproved
                ? "This request is already approved. Cancelling it will revert the attendance record. A reason is required."
                : "Are you sure you want to cancel this request?",
            variant: "warning",
            requireReason: isApproved,
            onConfirm: async (reason) => {
                setActionLoading(id);
                try {
                    await updateRequestStatus("overtime", id, "cancelled", reason);
                    await syncOvertimeToAttendance(userId, date);
                    refresh();
                } catch (e) {
                    console.error(e);
                    alert("Failed to cancel");
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleDelete = (id: string, userId: string, date: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Request",
            description: "Are you sure you want to permanently delete this request? This action cannot be undone.",
            variant: "danger",
            requireReason: false,
            onConfirm: async () => {
                setActionLoading(id);
                try {
                    await deleteOvertimeLog(id);
                    await syncOvertimeToAttendance(userId, date);
                    refresh();
                } catch (e) {
                    console.error(e);
                    alert("Failed to delete");
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleEdit = (ot: typeof rawData[0]) => {
        if (onEditLog && ot.original) {
            onEditLog(ot.original);
        }
    };

    // EXPORT FUNCTIONALITY
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (filteredData.length === 0) return;
        setExporting(true);

        try {
            const documentName = viewMode === "team" ? "Team Overtime Report" : "My Overtime Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = formatMonthYear(currentMonth);

            const totalMinutes = filteredData.reduce((acc, curr) => acc + curr.overtimeMinutes, 0);
            const approvedMinutes = filteredData.filter(d => d.status === "approved").reduce((acc, curr) => acc + curr.overtimeMinutes, 0);
            const pendingCount = filteredData.filter(d => d.status === "pending").length;

            const summaryCards = [
                { label: "Total Logs", value: filteredData.length, format: "number" as const },
                { label: "Total Hours", value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, format: "text" as const },
                { label: "Approved Hours", value: `${Math.floor(approvedMinutes / 60)}h ${approvedMinutes % 60}m`, format: "text" as const, color: "green" as const },
                { label: "Pending", value: pendingCount, format: "number" as const, color: "orange" as const },
            ];

            const columns = viewMode === "team" ? [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "date", label: "Date", align: "left" as const },
                { id: "time", label: "Time", align: "left" as const },
                { id: "duration", label: "Duration", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ] : [
                { id: "date", label: "Date", align: "left" as const },
                { id: "time", label: "Time", align: "left" as const },
                { id: "duration", label: "Duration", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = filteredData.map(r => ({
                employee: r.employee,
                date: r.date,
                time: `${r.clockIn} - ${r.clockOut}`,
                duration: `${Math.floor(r.overtimeMinutes / 60)}h ${r.overtimeMinutes % 60}m`,
                status: r.status
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "OVERTIME",
                        projectName: "Adidaya Clock Overtime",
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
            a.download = `Overtime_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
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

    // Calculate Montly Stats
    const stats = useMemo(() => {
        const totalOvertime = filteredData.reduce((acc: number, curr) => acc + curr.overtimeMinutes, 0);
        const approvedOvertime = filteredData.filter(d => d.status === "approved").reduce((acc: number, curr) => acc + curr.overtimeMinutes, 0);
        const pendingRequests = filteredData.filter(d => d.status === "pending").length;

        return { totalOvertime, approvedOvertime, pendingRequests };
    }, [filteredData]);

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Overtime</h1>
                        <p className="text-sm text-neutral-500 mt-1">Overtime hours validation and tracking.</p>
                    </div>
                    <ViewToggle viewMode={viewMode} onViewChange={setViewMode} role={role} />
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* MONTHLY RECAP CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-sm text-neutral-500 mb-1">Total Overtime (This Month)</div>
                    <div className="text-2xl font-bold text-neutral-900">{formatDuration(stats.totalOvertime)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-sm text-neutral-500 mb-1">Approved Hours</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatDuration(stats.approvedOvertime)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-sm text-neutral-500 mb-1">Pending Requests</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</div>
                </div>
            </div>

            {/* TOOLBAR - SUPER COMPACT */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* LEFT GROUP: Search + Month Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search: Icon on small, Input on md+ */}
                    {isManager && viewMode === "team" && (
                        <>
                            <button
                                onClick={() => setShowSearchInput(!showSearchInput)}
                                className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
                                title="Search"
                            >
                                <Search className="w-4 h-4" />
                            </button>
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

                    {/* Month Picker */}
                    <div className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-full px-1 py-1 shadow-sm flex-shrink-0">
                        <button
                            onClick={() => handleMonthChange("prev")}
                            className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
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

                {/* RIGHT GROUP: Export + Log Overtime */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Export: Icon only on small, full on md+ */}
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                        title="Export"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <Button variant="secondary" onClick={handleExport} disabled={exporting} className="!rounded-full !py-1.5 !px-3 hidden md:flex" icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}>{exporting ? "Exporting..." : "Export"}</Button>

                    {/* Log Overtime: Icon only on small, full on md+ */}
                    <button
                        onClick={onLogOvertime}
                        className="md:hidden p-2 rounded-full bg-action-primary text-white hover:bg-action-primary-hover transition-colors"
                        title="Log Overtime"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <Button
                        variant="primary"
                        className="!rounded-full !py-1.5 !px-3 hidden md:flex"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={onLogOvertime}
                    >
                        Log Overtime
                    </Button>
                </div>
            </div>

            {/* Expandable Search Input for small screens */}
            {isManager && viewMode === "team" && showSearchInput && (
                <div className="md:hidden relative w-full">
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

            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                {isManager && viewMode === "team" && (
                                    <th
                                        className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSort("employee")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Employee
                                            {sortBy === "employee" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </div>
                                    </th>
                                )}
                                <th
                                    className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                    onClick={() => handleSort("date")}
                                >
                                    <div className="flex items-center gap-1">
                                        Date
                                        {sortBy === "date" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Start Time</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">End Time</th>
                                <th
                                    className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                    onClick={() => handleSort("overtime")}
                                >
                                    <div className="flex items-center gap-1">
                                        Duration
                                        {sortBy === "overtime" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-neutral-50/50 transition-colors">
                                    {isManager && viewMode === "team" && <td className="px-6 py-4 font-medium text-neutral-900">{row.employee}</td>}
                                    <td className="px-6 py-4 text-neutral-700 font-mono text-xs">{row.date}</td>
                                    <td className="px-6 py-4 font-mono text-neutral-900">{row.clockIn}</td>
                                    <td className="px-6 py-4 font-mono text-neutral-900">{row.clockOut}</td>
                                    <td className="px-6 py-4 text-emerald-600 font-medium">+{formatDuration(row.overtimeMinutes)}</td>
                                    <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* TEAM VIEW ACTIONS */}
                                            {isManager && viewMode === "team" ? (
                                                <>
                                                    <button
                                                        onClick={() => onViewLog?.(row.original)}
                                                        className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {row.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(row)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50"
                                                                title="Approve (with Correction)"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(row.id, row.userId, row.date)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                /* PERSONAL VIEW ACTIONS */
                                                <>
                                                    {/* Edit: Pending Only */}
                                                    {row.status === "pending" && (
                                                        <button
                                                            onClick={() => onEditLog?.(row.original)}
                                                            disabled={actionLoading === row.id}
                                                            className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {/* Cancel: Pending or Approved */}
                                                    {(row.status === "pending" || row.status === "approved") && (
                                                        <button
                                                            onClick={() => handleCancel(row.id, row.userId, row.date, row.status)}
                                                            disabled={actionLoading === row.id}
                                                            className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50"
                                                            title={row.status === "approved" ? "Cancel Approved Request" : "Cancel Request"}
                                                        >
                                                            <Ban className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {/* Delete: Rejected or Cancelled (Not Approved/Pending) */}
                                                    {(row.status === "rejected" || row.status === "cancelled") && (
                                                        <button
                                                            onClick={() => handleDelete(row.id, row.userId, row.date)}
                                                            disabled={actionLoading === row.id}
                                                            className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50"
                                                            title="Delete"
                                                        >
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isManager && viewMode === "team" ? 8 : 7} className="px-6 py-16 text-center">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="w-8 h-8 text-action-primary animate-spin" />
                                                <p className="text-neutral-500">Loading overtime records...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                                                    <Hourglass className="w-8 h-8 text-purple-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-neutral-700">No overtime records this month</h3>
                                                    <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                                                        {viewMode === "team"
                                                            ? `No overtime logged by your team in ${formatMonthYear(currentMonth)}.`
                                                            : `You haven't logged any overtime in ${formatMonthYear(currentMonth)}.`
                                                        }
                                                    </p>
                                                </div>
                                                {viewMode === "personal" && onLogOvertime && (
                                                    <Button
                                                        variant="secondary"
                                                        className="!rounded-full mt-2"
                                                        icon={<Plus className="w-4 h-4" />}
                                                        onClick={onLogOvertime}
                                                    >
                                                        Log Overtime
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div >
            </div >

            <ClockConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                variant={confirmConfig.variant}
                requireReason={confirmConfig.requireReason}
                enableCorrection={confirmConfig.enableCorrection}
                initialStartTime={confirmConfig.initialStartTime}
                initialEndTime={confirmConfig.initialEndTime}
            />
        </div>
    );
}
