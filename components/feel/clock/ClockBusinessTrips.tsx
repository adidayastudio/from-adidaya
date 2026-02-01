"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { Briefcase, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, List, Grid3X3, Calendar as CalendarIcon, Download, Check, X, Ban, Edit, Trash, Eye, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { ClockConfirmationModal } from "./ClockConfirmationModal";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import {
    BusinessTrip,
    updateBusinessTrip, deleteBusinessTrip,
    updateRequestStatus,
    createTripAttendanceRecords, deleteTripAttendanceRecords
} from "@/lib/api/clock";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

interface ClockBusinessTripsProps {
    role?: UserRole;
    userName?: string;
    viewMode: "personal" | "team";
    onNewTrip?: () => void;
    onEditTrip?: (trip: BusinessTrip) => void;
    onViewTrip?: (trip: BusinessTrip) => void;
}

export function ClockBusinessTrips({ role, userName = "Staff Member", viewMode, onNewTrip, onEditTrip, onViewTrip }: ClockBusinessTripsProps) {
    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "employee" | "status">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Month Navigation - declare before useClockData
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Mobile search toggle
    const [showSearchInput, setShowSearchInput] = useState(false);

    const { businessTrips, loading, refresh } = useClockData(profile?.id, viewMode === "team", currentMonth);

    // Map fetched data to UI format
    const rawData = useMemo(() => {
        return businessTrips.map(t => ({
            id: t.id,
            userId: t.userId,
            employee: t.userName || userName,
            destination: t.destination,
            purpose: t.purpose,
            from: t.startDate,
            to: t.endDate,
            days: differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1,
            status: t.status,
            rejectReason: t.rejectReason,
            transportation: t.transportation,
            estimatedCost: t.estimatedCost,
            original: t // Keep for edit
        }));
    }, [businessTrips, userName]);

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

        // Filter by selected month - check if trip overlaps with selected month
        const selectedYear = currentMonth.getFullYear();
        const selectedMonthNum = currentMonth.getMonth();
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        data = data.filter(d => {
            const tripStart = parseISO(d.from);
            const tripEnd = parseISO(d.to);
            // Trip overlaps with selected month if trip starts before month end AND trip ends after month start
            return tripStart <= monthEnd && tripEnd >= monthStart;
        });

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(d =>
                d.employee.toLowerCase().includes(query) ||
                d.destination.toLowerCase().includes(query) ||
                d.purpose.toLowerCase().includes(query)
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
    const handleApprove = (trip: typeof rawData[0]) => {
        setConfirmConfig({
            isOpen: true,
            title: "Approve Business Trip",
            description: `Are you sure you want to approve the business trip for ${trip.employee} to ${trip.destination}?`,
            variant: "success",
            requireReason: false,
            onConfirm: async () => {
                setActionLoading(trip.id);
                try {
                    await updateRequestStatus("business-trip", trip.id, "approved");
                    await createTripAttendanceRecords(trip.userId, trip.from, trip.to);
                    refresh();
                } catch (e) {
                    console.error(e);
                    alert("Failed to approve");
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleReject = (id: string, userId: string, startDate: string, endDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Reject Business Trip",
            description: "Please provide a reason for rejecting this request.",
            variant: "danger",
            requireReason: true,
            onConfirm: async (reason) => {
                setActionLoading(id);
                try {
                    await updateRequestStatus("business-trip", id, "rejected", reason);
                    await deleteTripAttendanceRecords(userId, startDate, endDate);
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

    const handleCancel = (id: string, userId: string, startDate: string, endDate: string, status: string) => {
        const isApproved = status === "approved";
        setConfirmConfig({
            isOpen: true,
            title: isApproved ? "Cancel Approved Trip" : "Cancel Trip Request",
            description: isApproved
                ? "This trip is already approved. Cancelling it will remove associated attendance records. Reason is required."
                : "Are you sure you want to cancel this trip request?",
            variant: "warning",
            requireReason: isApproved,
            onConfirm: async (reason) => {
                setActionLoading(id);
                try {
                    await updateRequestStatus("business-trip", id, "cancelled", reason);
                    await deleteTripAttendanceRecords(userId, startDate, endDate);
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

    const handleDelete = (id: string, userId: string, startDate: string, endDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Trip Request",
            description: "Are you sure you want to permanently delete this trip request? This action cannot be undone.",
            variant: "danger",
            requireReason: false,
            onConfirm: async () => {
                setActionLoading(id);
                try {
                    await deleteBusinessTrip(id);
                    await deleteTripAttendanceRecords(userId, startDate, endDate);
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

    const handleEdit = (trip: typeof rawData[0]) => {
        if (onEditTrip && trip.original) {
            onEditTrip(trip.original);
        }
    };

    // EXPORT FUNCTIONALITY
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (filteredData.length === 0) return;
        setExporting(true);

        try {
            const formatMonthYearFn = (date: Date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const documentName = viewMode === "team" ? "Team Business Trips Report" : "My Business Trips Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = formatMonthYearFn(currentMonth);

            const pendingCount = filteredData.filter(a => a.status === "pending").length;
            const approvedCount = filteredData.filter(a => a.status === "approved").length;
            const totalDays = filteredData.reduce((acc, curr) => acc + curr.days, 0);

            const summaryCards = [
                { label: "Total Trips", value: filteredData.length, format: "number" as const },
                { label: "Total Days", value: totalDays, format: "number" as const },
                { label: "Approved", value: approvedCount, format: "number" as const, color: "green" as const },
                { label: "Pending", value: pendingCount, format: "number" as const, color: "orange" as const },
            ];

            const columns = viewMode === "team" ? [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "destination", label: "Destination", align: "left" as const },
                { id: "purpose", label: "Purpose", align: "left" as const },
                { id: "dates", label: "Dates", align: "left" as const },
                { id: "days", label: "Days", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ] : [
                { id: "destination", label: "Destination", align: "left" as const },
                { id: "purpose", label: "Purpose", align: "left" as const },
                { id: "dates", label: "Dates", align: "left" as const },
                { id: "days", label: "Days", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = filteredData.map(r => ({
                employee: r.employee,
                destination: r.destination,
                purpose: r.purpose,
                dates: `${format(parseISO(r.from), "MMM dd")} - ${format(parseISO(r.to), "MMM dd")}`,
                days: r.days,
                status: r.status
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "TRIPS",
                        projectName: "Adidaya Clock Business Trips",
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
            a.download = `BusinessTrips_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
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

    const getTripForDay = (date: Date) => {
        return filteredData.filter(trip =>
            isWithinInterval(date, { start: parseISO(trip.from), end: parseISO(trip.to) })
        );
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER REMOVED - Using Global PageHeader */}

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* LEFT GROUP: Search (Team only) + Month Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
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

                {/* RIGHT GROUP */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                        title="Export"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <Button variant="secondary" onClick={handleExport} disabled={exporting} className="!rounded-full !py-1.5 !px-3 hidden md:flex" icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}>{exporting ? "Exporting..." : "Export"}</Button>

                    <button
                        onClick={onNewTrip}
                        className="md:hidden p-2 rounded-full bg-action-primary text-white hover:bg-action-primary-hover transition-colors"
                        title="New Trip"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <Button
                        variant="primary"
                        className="!rounded-full !py-1.5 !px-3 hidden md:flex"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={onNewTrip}
                    >
                        New Trip
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

            {/* Expandable Search Input for mobile */}
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
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Destination</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Purpose</th>
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
                                    <th
                                        className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSort("status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredData.map((row) => (
                                    <tr key={row.id} className="hover:bg-neutral-50/50 transition-colors">
                                        {isManager && viewMode === "team" && <td className="px-6 py-4 font-medium text-neutral-900">{row.employee}</td>}
                                        <td className="px-6 py-4 text-neutral-900 font-medium">{row.destination}</td>
                                        <td className="px-6 py-4 text-neutral-600">{row.purpose}</td>
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
                                                {isManager && viewMode === "team" ? (
                                                    <>
                                                        <button
                                                            onClick={() => onViewTrip?.(row.original)}
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
                                                                    title="Approve"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(row.id, row.userId, row.from, row.to)}
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
                                                                onClick={() => handleEdit(row)}
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
                                                                onClick={() => handleCancel(row.id, row.userId, row.from, row.to, row.status)}
                                                                disabled={actionLoading === row.id}
                                                                className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50"
                                                                title={row.status === "approved" ? "Cancel Approved Trip" : "Cancel Request"}
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {/* Delete: Rejected or Cancelled (Not Approved/Pending) */}
                                                        {(row.status === "rejected" || row.status === "cancelled") && (
                                                            <button
                                                                onClick={() => handleDelete(row.id, row.userId, row.from, row.to)}
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
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            {loading ? (
                                                <GlobalLoading />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-4">
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                                                        <Briefcase className="w-8 h-8 text-teal-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-semibold text-neutral-700">No business trips this month</h3>
                                                        <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                                                            {viewMode === "team"
                                                                ? `No trips scheduled by your team in ${formatMonthYear(currentMonth)}.`
                                                                : `You don't have any business trips in ${formatMonthYear(currentMonth)}.`
                                                            }
                                                        </p>
                                                    </div>
                                                    {viewMode === "personal" && onNewTrip && (
                                                        <Button
                                                            variant="secondary"
                                                            className="!rounded-full mt-2"
                                                            icon={<Plus className="w-4 h-4" />}
                                                            onClick={onNewTrip}
                                                        >
                                                            New Trip
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
                        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] bg-neutral-50/30 rounded-lg" />
                        ))}

                        {daysInMonth.map((day, idx) => {
                            const trips = getTripForDay(day);
                            return (
                                <div key={idx} className="min-h-[100px] border border-neutral-100 rounded-lg p-2 hover:border-neutral-300 transition-colors">
                                    <div className={clsx("text-sm font-medium mb-1", isSameDay(day, new Date()) ? "text-action-primary" : "text-neutral-700")}>
                                        {format(day, "d")}
                                    </div>
                                    <div className="space-y-1">
                                        {trips.map(trip => (
                                            <div key={trip.id}
                                                className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded truncate",
                                                    trip.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                                                        trip.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-neutral-600"
                                                )}
                                                title={`${trip.employee} - ${trip.destination}`}
                                            >
                                                {viewMode === "team" ? trip.employee.split(' ').map(n => n[0]).join('') : trip.destination}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* CONFIRMATION MODAL */}
            <ClockConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                variant={confirmConfig.variant}
                requireReason={confirmConfig.requireReason}
                confirmText={confirmConfig.variant === "danger" ? "Yes, I'm sure" : "Confirm"}
            />
        </div>
    );
}
