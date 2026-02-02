import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { CalendarRange, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, List, Grid3X3, ArrowUpDown, Calendar as CalendarIcon, Filter, X, Download, Check, Ban, Edit, Trash, Eye, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, differenceInDays, isBefore, isAfter } from "date-fns";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import {
    LeaveType, LeaveRequest,
    updateLeaveRequest, deleteLeaveRequest,
    createLeaveAttendanceRecords, deleteLeaveAttendanceRecords,
    updateRequestStatus
} from "@/lib/api/clock";
import { ClockConfirmationModal } from "./ClockConfirmationModal";

interface ClockLeaveRequestsProps {
    role?: UserRole;
    userName?: string;
    viewMode: "personal" | "team";
    onNewRequest?: () => void;
    onEditRequest?: (leave: LeaveRequest) => void;
    onViewRequest?: (leave: LeaveRequest) => void;
}

export function ClockLeaveRequests({ role, userName = "Staff Member", viewMode, onNewRequest, onEditRequest, onViewRequest }: ClockLeaveRequestsProps) {
    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "employee" | "status">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Month Navigation - declare before useClockData
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { leaves, loading, refresh, updateLeaveOptimistic, deleteLeaveOptimistic } = useClockData(profile?.id, viewMode === "team", currentMonth);

    // Map fetched data to UI format
    const rawData = useMemo(() => {
        return leaves.map(l => ({
            id: l.id,
            userId: l.userId,
            employee: l.userName || userName,
            type: l.type,
            from: l.startDate,
            to: l.endDate,
            days: differenceInDays(new Date(l.endDate), new Date(l.startDate)) + 1,
            status: l.status,
            reason: l.reason,
            rejectReason: l.rejectReason,
            original: l // Keep original for edit
        }));
    }, [leaves, userName]);

    // Mobile search toggle
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

    // isManager removed here as it is declared above

    const filteredData = useMemo(() => {
        let data = [...rawData];

        // Filter by selected month - include records that overlap with current month
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        data = data.filter(d => {
            const startDate = parseISO(d.from);
            const endDate = parseISO(d.to);
            // Include if any part of the leave overlaps with the selected month
            return isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
                isWithinInterval(endDate, { start: monthStart, end: monthEnd }) ||
                (isBefore(startDate, monthStart) && isAfter(endDate, monthEnd));
        });

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(d =>
                d.employee.toLowerCase().includes(query) ||
                d.type.toLowerCase().includes(query)
            );
        }

        return [...data].sort((a, b) => {
            if (sortBy === "date") {
                const dateA = new Date(a.from).getTime();
                const dateB = new Date(b.from).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            } else if (sortBy === "employee") {
                return sortOrder === "asc" ? a.employee.localeCompare(b.employee) : b.employee.localeCompare(a.employee);
            } else if (sortBy === "status") {
                return sortOrder === "asc" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
            }
            return 0;
        });
    }, [rawData, searchQuery, sortBy, sortOrder, currentMonth]);

    const handleSort = (column: "date" | "employee" | "status") => {
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
        onConfirm: (reason?: string) => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        variant: "default",
        requireReason: false,
        onConfirm: async () => { },
    });

    // ACTION HANDLERS
    const handleApprove = (id: string, userId: string, startDate: string, endDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Approve Leave Request",
            description: "Are you sure you want to approve this leave request? This will generate attendance records.",
            variant: "success",
            requireReason: false,
            onConfirm: async () => {
                updateLeaveOptimistic(id, "approved");
                toast.success("✓ Leave request approved");
                try {
                    await updateRequestStatus("leave", id, "approved");
                    await createLeaveAttendanceRecords(userId, startDate, endDate);
                } catch (e) {
                    console.error(e);
                    updateLeaveOptimistic(id, "pending");
                    toast.error("Failed to approve");
                }
            }
        });
    };

    const handleReject = (id: string, userId: string, startDate: string, endDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Reject Leave Request",
            description: "Please provide a reason for rejecting this request.",
            variant: "danger",
            requireReason: true,
            onConfirm: async (reason) => {
                updateLeaveOptimistic(id, "rejected", reason);
                toast.success("Request rejected");
                try {
                    await updateRequestStatus("leave", id, "rejected", reason);
                    await deleteLeaveAttendanceRecords(userId, startDate, endDate);
                } catch (e) {
                    console.error(e);
                    updateLeaveOptimistic(id, "pending");
                    toast.error("Failed to reject");
                }
            }
        });
    };

    const handleCancel = (id: string, userId: string, startDate: string, endDate: string, status: string) => {
        const isApproved = status === "approved";
        const previousStatus = status as "pending" | "approved";
        setConfirmConfig({
            isOpen: true,
            title: isApproved ? "Cancel Approved Request" : "Cancel Request",
            description: isApproved
                ? "This request is already approved. cancelling it will revert the attendance records. A reason is required."
                : "Are you sure you want to cancel this request?",
            variant: "warning",
            requireReason: isApproved,
            onConfirm: async (reason) => {
                updateLeaveOptimistic(id, "cancelled", reason);
                toast.success("Request cancelled");
                try {
                    await updateRequestStatus("leave", id, "cancelled", reason);
                    await deleteLeaveAttendanceRecords(userId, startDate, endDate);
                } catch (e) {
                    console.error(e);
                    updateLeaveOptimistic(id, previousStatus);
                    toast.error("Failed to cancel");
                }
            }
        });
    };

    const handleDelete = (id: string, userId: string, startDate: string, endDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Request",
            description: "Are you sure you want to permanently delete this request? This action cannot be undone.",
            variant: "danger",
            requireReason: false,
            onConfirm: async () => {
                deleteLeaveOptimistic(id);
                toast.success("Request deleted");
                try {
                    await deleteLeaveAttendanceRecords(userId, startDate, endDate);
                    await deleteLeaveRequest(id);
                } catch (e) {
                    console.error(e);
                    refresh(); // Restore on error
                    toast.error("Failed to delete");
                }
            }
        });
    };

    const handleEdit = (leave: typeof rawData[0]) => {
        if (onEditRequest && leave.original) {
            onEditRequest(leave.original);
        }
    };

    const handleView = (leave: typeof rawData[0]) => {
        if (onViewRequest && leave.original) {
            onViewRequest(leave.original);
        }
    };

    // EXPORT FUNCTIONALITY
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (filteredData.length === 0) return;
        setExporting(true);

        try {
            const documentName = viewMode === "team" ? "Team Leave Report" : "My Leave Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = formatMonthYear(currentMonth);

            const pendingCount = filteredData.filter(a => a.status === "pending").length;
            const approvedCount = filteredData.filter(a => a.status === "approved").length;
            const rejectedCount = filteredData.filter(a => a.status === "rejected").length;

            const summaryCards = [
                { label: "Total Requests", value: filteredData.length, format: "number" as const },
                { label: "Pending", value: pendingCount, format: "number" as const, color: "orange" as const },
                { label: "Approved", value: approvedCount, format: "number" as const, color: "green" as const },
                { label: "Rejected", value: rejectedCount, format: "number" as const, color: "red" as const },
            ];

            const columns = viewMode === "team" ? [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "type", label: "Type", align: "left" as const },
                { id: "from", label: "From", align: "left" as const },
                { id: "to", label: "To", align: "left" as const },
                { id: "days", label: "Days", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ] : [
                { id: "type", label: "Type", align: "left" as const },
                { id: "from", label: "From", align: "left" as const },
                { id: "to", label: "To", align: "left" as const },
                { id: "days", label: "Days", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = filteredData.map(r => ({
                employee: r.employee,
                type: r.type,
                from: r.from,
                to: r.to,
                days: r.days,
                status: r.status
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "LEAVES",
                        projectName: "Adidaya Clock Leaves",
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
            a.download = `Leave_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
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

    // Calendar Helper Functions
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getLeaveForDay = (date: Date) => {
        return filteredData.filter(leave =>
            isWithinInterval(date, { start: parseISO(leave.from), end: parseISO(leave.to) }) &&
            (leave.status === "approved" || leave.status === "pending")
        );
    };

    // Helper to get initials from name
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    // Helper to shorten leave type for calendar display
    const shortenLeaveType = (type: string) => {
        const typeMap: Record<string, string> = {
            "Annual Leave": "Annual",
            "Sick Leave": "Sick",
            "Permission": "Perm",
            "Unpaid Leave": "Unpaid",
            "Maternity Leave": "Maternity"
        };
        return typeMap[type] || type;
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER REMOVED - Using Global PageHeader */}

            {/* TOOLBAR - SUPER COMPACT */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* LEFT GROUP: Search (Team only) + Month Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search: Icon on tiny, Input on sm+ */}
                    {isManager && viewMode === "team" && (
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

                {/* RIGHT GROUP: Export + New Request + View Toggle */}
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

                    {/* New Request: Icon only on tiny, full on sm+ */}
                    <button
                        onClick={onNewRequest}
                        className="md:hidden p-2 rounded-full bg-action-primary text-white hover:bg-action-primary-hover transition-colors"
                        title="New Request"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <Button
                        variant="primary"
                        className="!rounded-full !py-1.5 !px-3 hidden md:flex"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={onNewRequest}
                    >
                        New Request
                    </Button>

                    {/* Display Mode Toggle */}
                    <div className="flex items-center bg-neutral-100 rounded-full p-1">
                        <button
                            onClick={() => setDisplayMode("list")}
                            className={clsx("p-2 rounded-full transition-colors", displayMode === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDisplayMode("calendar")}
                            className={clsx("p-2 rounded-full transition-colors", displayMode === "calendar" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                            title="Calendar View"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Search Input for tiny screens */}
            {isManager && viewMode === "team" && showSearchInput && (
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

            {displayMode === "list" ? (
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
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Type</th>
                                    <th
                                        className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSort("date")}
                                    >
                                        <div className="flex items-center gap-1">
                                            From
                                            {sortBy === "date" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </div>
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">To</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Days</th>
                                    <th
                                        className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSort("status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </div>
                                    </th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredData.map((row) => (
                                    <tr key={row.id} className="hover:bg-neutral-50/50 transition-colors">
                                        {isManager && viewMode === "team" && <td className="px-6 py-4 font-medium text-neutral-900">{row.employee}</td>}
                                        <td className="px-6 py-4 text-neutral-700">{row.type}</td>
                                        <td className="px-6 py-4 text-neutral-700 font-mono text-xs">{format(parseISO(row.from), "MMM dd, yyyy")}</td>
                                        <td className="px-6 py-4 text-neutral-700 font-mono text-xs">{format(parseISO(row.to), "MMM dd, yyyy")}</td>
                                        <td className="px-6 py-4 font-medium text-neutral-900">{row.days}</td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(row.status)}
                                            {row.status === "rejected" && row.rejectReason && (
                                                <div className="text-[10px] text-rose-500 italic mt-0.5 truncate max-w-[150px]" title={row.rejectReason}>
                                                    {row.rejectReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">

                                                {/* TEAM VIEW ACTIONS */}
                                                {viewMode === "team" && (
                                                    <>
                                                        {/* View Details (Always) */}
                                                        <button
                                                            onClick={() => handleView(row)}
                                                            className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Manager: Approve/Reject (Pending only) */}
                                                        {isManager && row.status === "pending" && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(row.id, row.userId, row.from, row.to)}
                                                                    disabled={actionLoading === row.id}
                                                                    className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                                                                    title="Approve"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(row.id, row.userId, row.from, row.to)}
                                                                    disabled={actionLoading === row.id}
                                                                    className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 disabled:opacity-50 transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                {/* PERSONAL VIEW ACTIONS */}
                                                {viewMode === "personal" && row.userId === profile?.id && (
                                                    <>
                                                        {/* Edit (Pending only) */}
                                                        {row.status === "pending" && (
                                                            <button
                                                                onClick={() => handleEdit(row)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Cancel (Pending or Approved) */}
                                                        {(row.status === "pending" || row.status === "approved") && (
                                                            <button
                                                                onClick={() => handleCancel(row.id, row.userId, row.from, row.to, row.status)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                                                                title={row.status === "approved" ? "Cancel Approved Request" : "Cancel Request"}
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Delete (Pending, Rejected, or Cancelled) - Not Approved */}
                                                        {row.status !== "approved" && (
                                                            <button
                                                                onClick={() => handleDelete(row.id, row.userId, row.from, row.to)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors"
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
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            {loading ? (
                                                <div className="text-neutral-500">Loading...</div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                                                        <CalendarRange className="w-8 h-8 text-neutral-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-neutral-700 font-medium">
                                                            {viewMode === "team"
                                                                ? `No team leave requests for ${formatMonthYear(currentMonth)}`
                                                                : `No leave requests in ${formatMonthYear(currentMonth)}`
                                                            }
                                                        </p>
                                                        <p className="text-sm text-neutral-500">
                                                            {viewMode === "team"
                                                                ? "Everyone's present and accounted for! 📋"
                                                                : "Need time off? Submit a new request and take a well-deserved break! 🌴"
                                                            }
                                                        </p>
                                                    </div>
                                                    {viewMode === "personal" && (
                                                        <Button
                                                            variant="primary"
                                                            className="!rounded-full mt-2"
                                                            icon={<Plus className="w-4 h-4" />}
                                                            onClick={onNewRequest}
                                                        >
                                                            New Request
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* CALENDAR VIEW */
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" className="!p-2" onClick={() => setCurrentMonth(prev => addDays(prev, -30))} icon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
                            <Button variant="secondary" className="!p-2" onClick={() => setCurrentMonth(prev => addDays(prev, 30))} icon={<ChevronRight className="w-4 h-4" />}>Next</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-neutral-200 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold uppercase text-neutral-500">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr gap-2">
                        {/* Empty cells for start of month offset (simplified) */}
                        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] bg-neutral-50/30 rounded-lg" />
                        ))}

                        {daysInMonth.map((day, idx) => {
                            const leaves = getLeaveForDay(day);
                            return (
                                <div key={idx} className="min-h-[100px] border border-neutral-100 rounded-lg p-2 hover:border-neutral-300 transition-colors">
                                    <div className={clsx("text-sm font-medium mb-1", isSameDay(day, new Date()) ? "text-action-primary" : "text-neutral-700")}>
                                        {format(day, "d")}
                                    </div>
                                    <div className="space-y-1">
                                        {leaves.map(leave => (
                                            <div key={leave.id}
                                                className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded truncate",
                                                    leave.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                                                        leave.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-neutral-600"
                                                )}
                                                title={`${leave.employee} - ${leave.type} (${leave.status})`}
                                            >
                                                {viewMode === "team"
                                                    ? `${getInitials(leave.employee)} - ${shortenLeaveType(leave.type)}`
                                                    : leave.type
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
            }

            <ClockConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                variant={confirmConfig.variant}
                requireReason={confirmConfig.requireReason}
            />
        </div >
    );
}
