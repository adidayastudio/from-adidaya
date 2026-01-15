"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import { Check, X, Search, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar, ArrowUpDown, Filter, Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { ClockToolbar } from "./ClockToolbar";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { updateRequestStatus, RequestStatus, OvertimeLog, BusinessTrip, LeaveRequest } from "@/lib/api/clock";
import { format } from "date-fns";
import { ClockConfirmationModal } from "./ClockConfirmationModal";
import { ClockLeaveRequestDrawer } from "./ClockLeaveRequestDrawer";
import { ClockOvertimeLogDrawer } from "./ClockOvertimeLogDrawer";
import { ClockBusinessTripDrawer } from "./ClockBusinessTripDrawer";

interface ClockApprovalsProps {
    role?: UserRole;
}

// ApprovalItem type based on API mapping
interface ApprovalItem {
    id: string;
    employee: string;
    type: "Leave Request" | "Overtime" | "Business Trip";
    details: string;
    dates: string;
    submittedAt: string;
    status: RequestStatus;
    reason: string;
    rejectReason?: string;
    actualId: string; // ID for the API call
    rawStartTime?: string;
    rawEndTime?: string;
}

export function ClockApprovals({ role }: ClockApprovalsProps) {
    const { profile } = useUserProfile();
    // Approvals are always for Team view
    const isManager = true;

    // Always fetch team data for approvals (include attendance for overtime calculation)
    const { leaves, overtime, businessTrips, attendance, loading, refresh } = useClockData(profile?.id, true);

    // Constant for 8 hours in minutes
    const REGULAR_WORK_MINUTES = 8 * 60;

    // Map and combine data
    const approvals = useMemo(() => {
        const leaveItems: ApprovalItem[] = leaves.map(l => ({
            id: `leave-${l.id}`,
            actualId: l.id,
            employee: l.userName || "User",
            type: "Leave Request",
            details: l.type,
            dates: `${l.startDate} to ${l.endDate}`,
            submittedAt: l.createdAt,
            status: l.status,
            reason: l.reason,
            rejectReason: l.rejectReason
        }));

        const overtimeItems: ApprovalItem[] = overtime.map(o => {
            // Find corresponding attendance record for this user and date
            const attendanceRecord = attendance.find(a => a.userId === o.userId && a.date === o.date);

            // Calculate overtime start time: clock_in + 8 hours
            let calculatedStartTime = o.approvedStartTime || o.startTime;
            if (attendanceRecord?.clockIn) {
                const clockInTime = new Date(attendanceRecord.clockIn);
                const overtimeStart = new Date(clockInTime.getTime() + REGULAR_WORK_MINUTES * 60 * 1000);
                calculatedStartTime = overtimeStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            }

            const effectiveEndTime = o.approvedEndTime || o.endTime;

            return {
                id: `ot-${o.id}`,
                actualId: o.id,
                employee: o.userName || "User",
                type: "Overtime",
                details: o.description,
                dates: `${o.date} (${calculatedStartTime?.substring(0, 5)}-${effectiveEndTime?.substring(0, 5)})`,
                submittedAt: o.createdAt,
                status: o.status,
                reason: o.description,
                rawStartTime: calculatedStartTime?.substring(0, 5),
                rawEndTime: effectiveEndTime?.substring(0, 5)
            };
        });

        const tripItems: ApprovalItem[] = businessTrips.map(t => ({
            id: `trip-${t.id}`,
            actualId: t.id,
            employee: t.userName || "User",
            type: "Business Trip",
            details: `${t.destination} - ${t.purpose}`,
            dates: `${t.startDate} to ${t.endDate}`,
            submittedAt: t.createdAt,
            status: t.status,
            reason: t.purpose,
            rejectReason: t.rejectReason
        }));

        return [...leaveItems, ...overtimeItems, ...tripItems];
    }, [leaves, overtime, businessTrips, attendance, REGULAR_WORK_MINUTES]);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "Leave Request" | "Overtime" | "Business Trip">("all");
    const [sortBy, setSortBy] = useState<"date" | "employee" | "status">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // View Drawer State
    const [viewLeave, setViewLeave] = useState<LeaveRequest | undefined>(undefined);
    const [viewOvertime, setViewOvertime] = useState<OvertimeLog | undefined>(undefined);
    const [viewTrip, setViewTrip] = useState<BusinessTrip | undefined>(undefined);

    const handleView = (item: ApprovalItem) => {
        if (item.type === "Leave Request") {
            const leave = leaves.find(l => l.id === item.actualId);
            if (leave) setViewLeave(leave);
        } else if (item.type === "Overtime") {
            const ot = overtime.find(o => o.id === item.actualId);
            if (ot) setViewOvertime(ot);
        } else if (item.type === "Business Trip") {
            const trip = businessTrips.find(t => t.id === item.actualId);
            if (trip) setViewTrip(trip);
        }
    };

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
    };

    const formatMonthShort = (date: Date) => {
        const month = date.toLocaleDateString("en-US", { month: "short" });
        const year = date.getFullYear().toString().slice(-2);
        return `${month}-${year}`;
    };

    const filteredData = useMemo(() => {
        let data = [...approvals];

        // Filter by selected month based on submitted date
        const selectedYear = currentMonth.getFullYear();
        const selectedMonthNum = currentMonth.getMonth();
        data = data.filter(item => {
            const submittedDate = new Date(item.submittedAt);
            return submittedDate.getFullYear() === selectedYear && submittedDate.getMonth() === selectedMonthNum;
        });

        if (filterType !== "all") {
            data = data.filter(item => item.type === filterType);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(item =>
                item.employee.toLowerCase().includes(q) ||
                item.type.toLowerCase().includes(q) ||
                item.details.toLowerCase().includes(q)
            );
        }

        return data.sort((a, b) => {
            if (sortBy === "date") {
                const dateA = new Date(a.submittedAt).getTime();
                const dateB = new Date(b.submittedAt).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            } else if (sortBy === "employee") {
                return sortOrder === "asc" ? a.employee.localeCompare(b.employee) : b.employee.localeCompare(a.employee);
            } else if (sortBy === "status") {
                // Custom status sort: Pending first, then Approved/Rejected
                const statusOrder = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
                const orderA = statusOrder[a.status] ?? 99;
                const orderB = statusOrder[b.status] ?? 99;
                if (orderA !== orderB) return sortOrder === "asc" ? orderA - orderB : orderB - orderA;
                return 0;
            }
            return 0;
        });
    }, [approvals, filterType, searchQuery, sortBy, sortOrder, currentMonth]);

    // EXPORT FUNCTIONALITY
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (filteredData.length === 0) return;
        setExporting(true);

        try {
            // 1. Prepare Meta
            const documentName = "Approvals Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = format(currentMonth, "MMMM yyyy");

            // 2. Prepare Summary
            const pendingCount = filteredData.filter(a => a.status === "pending").length;
            const approvedCount = filteredData.filter(a => a.status === "approved").length;
            const rejectedCount = filteredData.filter(a => a.status === "rejected").length;

            const summaryCards = [
                { label: "Total Requests", value: filteredData.length, format: "number" as const },
                { label: "Pending", value: pendingCount, format: "number" as const, color: "orange" as const },
                { label: "Approved", value: approvedCount, format: "number" as const, color: "green" as const },
                { label: "Rejected", value: rejectedCount, format: "number" as const, color: "red" as const },
            ];

            // 3. Prepare Columns
            const columns = [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "type", label: "Type", align: "left" as const },
                { id: "details", label: "Details", align: "left" as const },
                { id: "dates", label: "Dates", align: "left" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            // 4. Prepare Data
            const rows = filteredData.map(a => ({
                employee: a.employee,
                type: a.type,
                details: a.details,
                dates: a.dates,
                status: a.status
            }));

            // 5. POST to API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "APPROVALS",
                        projectName: "Adidaya Clock Approvals",
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
            a.download = `Approvals_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
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

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    // ACTIONS
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: "approve" | "reject";
        item?: ApprovalItem;
    }>({ isOpen: false, type: "approve" });

    const handleActionClick = (item: ApprovalItem, type: "approve" | "reject") => {
        console.log("Action Click:", item); // DEBUG
        setModalConfig({
            isOpen: true,
            type,
            item
        });
    };

    const handleConfirmModal = async (reason?: string, correction?: { approvedStartTime?: string; approvedEndTime?: string }) => {
        const { item, type } = modalConfig;
        if (!item) return;

        setActionLoading(item.id);
        try {
            const apiTypeMap: Record<string, "leave" | "overtime" | "business-trip"> = {
                "Leave Request": "leave",
                "Overtime": "overtime",
                "Business Trip": "business-trip"
            };
            const apiType = apiTypeMap[item.type];
            const status: RequestStatus = type === "approve" ? "approved" : "rejected";

            // If Overtime and correction data exists, validate it (optional additional check)
            // The modal ensures values are passed if fields were used.

            await updateRequestStatus(apiType, item.actualId, status, reason, correction);
            refresh();
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update status");
        } finally {
            setActionLoading(null);
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

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
            case "pending": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100 uppercase">Pending</span>;
            case "approved": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">Approved</span>;
            case "rejected": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100 uppercase">Rejected</span>;
            case "cancelled": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 uppercase">Cancelled</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Approvals</h1>
                        <p className="text-sm text-neutral-500 mt-1">Review and manage team requests.</p>
                    </div>
                </div>

                {/* TOOLBAR */}
                <ClockToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    tabs={[
                        { id: "all", label: "All" },
                        { id: "Leave Request", label: "Leave" },
                        { id: "Overtime", label: "Overtime" },
                        { id: "Business Trip", label: "Trip" },
                    ]}
                    activeTab={filterType}
                    onTabChange={(id) => setFilterType(id as any)}
                    currentDate={currentMonth}
                    onMonthChange={handleMonthChange}
                    onSort={() => {
                        if (sortBy === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else { setSortBy("date"); setSortOrder("desc"); }
                    }}
                    sortActive={sortBy === "date"}
                    onExport={handleExport}
                    isExporting={exporting}
                />
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => handleSort("date")}>
                                    <div className="flex items-center gap-1">Submitted <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => handleSort("employee")}>
                                    <div className="flex items-center gap-1">Employee <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => handleSort("status")}>
                                    <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-neutral-600">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                                                <Clock className="w-8 h-8 text-amber-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-neutral-700">No requests to review</h3>
                                                <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                                                    No approval requests found for {formatMonthYear(currentMonth)}.
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {format(new Date(item.submittedAt), "MMM dd")}
                                            <span className="text-neutral-400 ml-1 block text-[10px]">
                                                {format(new Date(item.submittedAt), "HH:mm")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-neutral-900">{item.employee}</td>
                                        <td className="px-6 py-4">
                                            <div className={clsx("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border",
                                                item.type === "Leave Request" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                    item.type === "Overtime" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                        "bg-teal-50 text-teal-600 border-teal-100"
                                            )}>
                                                {item.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="truncate font-medium">{item.details}</div>
                                            {item.status === "rejected" && item.rejectReason && (
                                                <div className="text-[10px] text-rose-500 italic mt-0.5 truncate">
                                                    Reason: {item.rejectReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-neutral-500">
                                            {item.dates}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleView(item)}
                                                    className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {item.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleActionClick(item, "approve")}
                                                            disabled={actionLoading === item.id}
                                                            className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleActionClick(item, "reject")}
                                                            disabled={actionLoading === item.id}
                                                            className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 disabled:opacity-50 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* VIEW DRAWERS */}
            {viewLeave && (
                <ClockLeaveRequestDrawer
                    open={!!viewLeave}
                    onClose={() => setViewLeave(undefined)}
                    editData={viewLeave}
                    readOnly={true}
                />
            )}

            {viewOvertime && (
                <ClockOvertimeLogDrawer
                    open={!!viewOvertime}
                    onClose={() => setViewOvertime(undefined)}
                    editData={viewOvertime}
                    readOnly={true}
                    attendanceClockIn={attendance.find(a => a.userId === viewOvertime.userId && a.date === viewOvertime.date)?.clockIn ?? undefined}
                />
            )}

            {viewTrip && (
                <ClockBusinessTripDrawer
                    open={!!viewTrip}
                    onClose={() => setViewTrip(undefined)}
                    editData={viewTrip}
                    readOnly={true}
                />
            )}

            {/* CONFIRMATION MODAL */}
            <ClockConfirmationModal
                key={modalConfig.item?.id || (modalConfig.isOpen ? "open" : "closed")}
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmModal}
                title={modalConfig.type === "approve" ? "Approve Request" : "Reject Request"}
                description={
                    modalConfig.type === "approve"
                        ? `Are you sure you want to approve this ${modalConfig.item?.details} for ${modalConfig.item?.employee}?`
                        : `Are you sure you want to reject this request?`
                }
                variant={modalConfig.type === "approve" ? "success" : "danger"}
                confirmText={modalConfig.type === "approve" ? "Approve" : "Reject Request"}
                requireReason={modalConfig.type === "reject"}

                // Overtime Correction
                enableCorrection={modalConfig.type === "approve" && modalConfig.item?.type === "Overtime"}
                initialStartTime={modalConfig.item?.rawStartTime}
                initialEndTime={modalConfig.item?.rawEndTime}
            />
        </div>
    );
}
