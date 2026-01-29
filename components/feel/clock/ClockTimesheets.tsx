"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, startOfMonth, endOfMonth, isSunday, isSaturday, min, isWeekend } from "date-fns";
import { HOLIDAYS_2026 } from "@/lib/constants/holidays";
import { Download, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, Search, List, Grid3X3, ArrowUpDown, BarChart3, Calendar, User, Users, ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2, X, MapPin } from "lucide-react";
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
    viewMode: "personal" | "team";
}

const ITEMS_PER_PAGE = 25;

export function ClockTimesheets({ role, userName = "Staff Member", viewMode: personalTeamView }: ClockTimesheetsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "grid" | "chart">("list");
    const [sortBy, setSortBy] = useState<"date" | "employee">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
    // -- DATA FETCHING --
    // Now receiving currentMonth to filter fetching by month
    const { attendance, leaves, overtime: otLogs, businessTrips: trips, teamMembers, sessions, logs, loading: loadingData, refresh } = useClockData(profile?.id, personalTeamView === "team", currentMonth);

    // -- MAP DATA TO UI FORMAT --
    const rawData = useMemo(() => {
        const base = attendance.map(r => ({
            ...r,
            employee: r.userName || "Unknown",
            day: format(new Date(r.date), "EEE"),
            schedule: "-", // We could derive this from shift settings later
            duration: r.totalMinutes ? formatMinutes(r.totalMinutes) : "-",
            overtime: r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "-",
            clockIn: r.clockIn ? format(new Date(r.clockIn), "HH:mm") : "-",
            clockOut: r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "-",
        }));

        // Find sessions that don't have a matching record in 'attendance'
        const orphanedSessions = (sessions || []).filter(s =>
            !attendance.some(a => a.userId === s.userId && a.date === s.date)
        );

        // Group sessions by userId and date to avoid multiple entries per day in the same view
        const groupedOrphans: Record<string, any> = {};
        orphanedSessions.forEach(s => {
            const key = `${s.userId}-${s.date}`;
            if (!groupedOrphans[key]) {
                const member = teamMembers.find(m => m.id === s.userId);
                groupedOrphans[key] = {
                    id: `orphan-s-${s.id}`,
                    userId: s.userId,
                    date: s.date,
                    employee: member?.username || s.userName || "Unknown",
                    day: format(new Date(s.date), "EEE"),
                    clockIn: s.clockIn ? format(new Date(s.clockIn), "HH:mm") : "-",
                    clockOut: s.clockOut ? format(new Date(s.clockOut), "HH:mm") : "-",
                    duration: s.durationMinutes ? formatMinutes(s.durationMinutes) : "-",
                    status: "intime" as any, // Fallback status
                    overtime: "-",
                    notes: "Raw Activity (Record Missing)"
                };
            } else if (s.clockOut) {
                // If we found another session for same day, try to update clockOut if it has one
                groupedOrphans[key].clockOut = format(new Date(s.clockOut), "HH:mm");
                // Note: duration calculation for orphans is simplified here
            }
        });

        return [...base, ...Object.values(groupedOrphans)];
    }, [attendance, sessions, teamMembers]);

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

    const EXCLUDED_USERS = ["Adidaya Admin", "Adidaya IT", "Adidaya Finance", "Adidaya Staff", "harryadin", "Adidaya Studio", "Harryadin Mahardika"];

    const filteredData = useMemo(() => {
        let baseData = [...rawData];

        // EXCLUDE SYSTEM ACCOUNTS - ONLY FOR TEAM VIEW
        if (personalTeamView === "team") {
            baseData = baseData.filter(d => !EXCLUDED_USERS.includes(d.employee || ""));
        }

        // DENSE DATA GENERATION (Personal View Only)
        if (personalTeamView === "personal") {
            // 1. Find the earliest date from Records OR Sessions OR Logs to start the view from
            const allSourceDates = [
                ...baseData.map(r => r.date),
                ...((sessions || []).map(s => s.date)),
                ...((logs || []).map(l => l.timestamp.split('T')[0]))
            ].filter(Boolean).sort();

            if (allSourceDates.length > 0) {
                const firstActivityDate = new Date(allSourceDates[0]);

                // 2. Define the End Boundary: Min(Today, EndOfCurrentMonth)
                const today = new Date();
                const endMonth = endOfMonth(currentMonth);
                const endDate = today < endMonth ? today : endMonth;

                // Only generate if firstActivityDate <= endDate
                if (firstActivityDate <= endDate) {
                    const denseData: any[] = [];
                    const allDays = eachDayOfInterval({ start: firstActivityDate, end: endDate });

                    allDays.forEach(dayObj => {
                        const dayStr = format(dayObj, "yyyy-MM-dd");
                        const existingRecord = baseData.find(r => r.date === dayStr);

                        if (existingRecord) {
                            denseData.push(existingRecord);
                        } else {
                            // FALLBACK: Check Sessions or Logs if no record exists
                            const daySession = (sessions || []).find(s => s.date === dayStr);
                            const dayLog = (logs || []).find(l => l.timestamp.startsWith(dayStr) && l.type === 'IN');

                            if (daySession || dayLog) {
                                denseData.push({
                                    id: `fallback-${dayStr}`,
                                    date: dayStr,
                                    clockIn: daySession?.clockIn ? format(new Date(daySession.clockIn), "HH:mm") : (dayLog ? format(new Date(dayLog.timestamp), "HH:mm") : "-"),
                                    clockOut: daySession?.clockOut ? format(new Date(daySession.clockOut), "HH:mm") : "-",
                                    duration: daySession?.durationMinutes ? formatMinutes(daySession.durationMinutes) : "-",
                                    status: "intime" as any, // Use intime as a fallback indicator
                                    overtime: "-",
                                    employee: userName,
                                    day: format(dayObj, "EEE"),
                                    userId: profile?.id,
                                    notes: "Raw Activity (Record Missing)"
                                });
                            } else {
                                // GAP FILLING (Standard Absent/Holiday)
                                const isSun = isSunday(dayObj);
                                const holidayInfo = HOLIDAYS_2026.find(h => h.date === dayStr);

                                let status = "absent";
                                let notes: string | undefined;

                                if (holidayInfo) {
                                    status = holidayInfo.type === "collective_leave" ? "leave" : "holiday";
                                    notes = holidayInfo.nameEn;
                                } else if (isSun) {
                                    status = "holiday";
                                    notes = "Weekend";
                                }

                                denseData.push({
                                    id: `gen-${dayStr}`,
                                    date: dayStr,
                                    clockIn: "-",
                                    clockOut: "-",
                                    duration: "0h 0m",
                                    status: status as any,
                                    overtime: "-",
                                    employee: userName,
                                    day: format(dayObj, "EEE"),
                                    userId: profile?.id,
                                    totalMinutes: 0,
                                    notes: notes
                                });
                            }
                        }
                    });
                    baseData = denseData;
                }
            }
        }

        // Filter by selected person (Team View)
        if (selectedPerson !== "all") {
            baseData = baseData.filter(d => d.employee === selectedPerson);
        }

        // Filter by date range
        if (dateFrom) {
            baseData = baseData.filter(d => new Date(d.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            baseData = baseData.filter(d => new Date(d.date) <= new Date(dateTo));
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            baseData = baseData.filter(d =>
                d.employee?.toLowerCase().includes(query) ||
                d.date.includes(query) ||
                d.status.toLowerCase().includes(query)
            );
        }

        return baseData.sort((a, b) => {
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
    }, [rawData, sessions, logs, sortBy, sortOrder, selectedPerson, dateFrom, dateTo, searchQuery, personalTeamView, currentMonth, userName, profile]);

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

    // -- PAGINATION LOGIC --
    // For Team List View: We paginate by DATE (Day), not by items.
    // 1 Page = 1 Day (All employees for that day).
    const uniqueDates = useMemo(() => {
        if (personalTeamView === "team" && viewMode === "list") {
            // Generate all days for the current month UP TO TODAY
            const start = startOfMonth(currentMonth);
            let end = endOfMonth(currentMonth);
            const today = new Date();

            // If end of month is in the future, cap it at Today
            if (end > today) {
                end = today;
            }

            // If start is also in future (future month), return empty
            if (start > today) return [];

            const days = eachDayOfInterval({ start, end });
            // Sort Latest First
            return days.map(d => format(d, "yyyy-MM-dd")).reverse();
        }
        return [];
    }, [currentMonth, personalTeamView, viewMode]);

    const totalPages = useMemo(() => {
        if (personalTeamView === "team" && viewMode === "list") {
            return uniqueDates.length || 1;
        }
        return Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
    }, [filteredData.length, uniqueDates.length, personalTeamView, viewMode]);

    const paginatedData = useMemo(() => {
        if (personalTeamView === "team" && viewMode === "list") {
            // Logic: Show all records for the specific date at 'currentPage' index
            const dateToShow = uniqueDates[currentPage - 1];
            if (!dateToShow) return [];

            // 1. Get existing records for this day
            const dayRecords = filteredData.filter(d => d.date === dateToShow);

            // 2. Hydrate with ALL team members (Excluding System Accounts)
            const validMembers = teamMembers.filter(m => !EXCLUDED_USERS.includes(m.username));

            // 3. Find "Ghost" Members: Users who have a record but are NOT in the validMembers list
            // (e.g. Raka, or new users not yet synchronized to profiles, or permission issues)
            const ghostMembersFromRecords = dayRecords.reduce((acc: any[], record) => {
                const isInData = validMembers.some(m => m.id === record.userId || m.username === record.employee);
                const isAlreadyAdded = acc.some(m => m.id === record.userId);

                if (!isInData && !isAlreadyAdded && !EXCLUDED_USERS.includes(record.employee || "")) {
                    acc.push({
                        id: record.userId || `ghost-${record.employee}`,
                        username: record.employee || "Unknown User",
                        avatar_url: record.avatar, // Use avatar from record if available
                        department: record.userDepartment, // Use dept from record if available
                        role: record.userRole || "staff"
                    });
                }
                return acc;
            }, []);

            // 4. Find "Ghost" Members from LOGS (Fallback)
            const dayLogs = logs?.filter(l => l.timestamp.startsWith(dateToShow) && l.type === "IN") || [];
            const ghostMembersFromLogs = dayLogs.reduce((acc: any[], log) => {
                const hasRecord = dayRecords.some(r => r.userId === log.userId);
                const isInData = validMembers.some(m => m.id === log.userId);
                const isInGhostRecords = ghostMembersFromRecords.some(m => m.id === log.userId);
                const isAlreadyAdded = acc.some(m => m.id === log.userId);

                if (!hasRecord && !isAlreadyAdded) {
                    if (!isInData && !isInGhostRecords && !EXCLUDED_USERS.includes(log.userName || "")) {
                        acc.push({
                            id: log.userId,
                            username: log.userName || "Unknown User",
                            avatar_url: log.avatar,
                            department: "Unknown",
                            role: "staff"
                        });
                    }
                }
                return acc;
            }, []);

            // Combine valid members and ghosts
            const allMembersToDisplay = [...validMembers, ...ghostMembersFromRecords, ...ghostMembersFromLogs];

            const fullList = allMembersToDisplay.map(member => {
                // Try to match by userId first, then username fallback
                const record = dayRecords.find(r => r.userId === member.id || r.employee === member.username);
                if (record) return record;

                // FALLBACK: Check Logs if no record exists
                const userLog = dayLogs.find(l => l.userId === member.id && l.type === 'IN');
                if (userLog) {
                    return {
                        id: `log-${member.id}-${dateToShow}`,
                        date: dateToShow,
                        employee: member.username || "Unknown",
                        userId: member.id,
                        clockIn: format(new Date(userLog.timestamp), "HH:mm"),
                        clockOut: "-",
                        duration: "-",
                        status: "intime" as any, // Visual indicator
                        overtime: "-",
                        day: format(new Date(dateToShow), "EEE"),
                        notes: "Raw Log (Record Missing)"
                    };
                }

                // Create Mock Absent Record
                return {
                    id: `absent-${member.id}-${dateToShow}`,
                    date: dateToShow,
                    employee: member.username || "Unknown",
                    userId: member.id,
                    clockIn: "-",
                    clockOut: "-",
                    duration: "0h 0m",
                    status: "absent" as any,
                    overtime: "-",
                    day: format(new Date(dateToShow), "EEE"),
                };
            });

            // 4. Sort by Clock-In Time (Ascending), then Name
            return fullList.sort((a, b) => {
                const timeA = (a.clockIn && a.clockIn !== '-') ? a.clockIn : "23:59"; // Push absent to end
                const timeB = (b.clockIn && b.clockIn !== '-') ? b.clockIn : "23:59";
                if (timeA !== timeB) return timeA.localeCompare(timeB);
                return (a.employee || "").localeCompare(b.employee || "");
            });
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage, uniqueDates, personalTeamView, viewMode, teamMembers]);

    // Reset page on month/view change
    useEffect(() => {
        setCurrentPage(1);
    }, [currentMonth, personalTeamView, viewMode, searchQuery]);

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
            const intimeCount = filteredData.filter(d => d.status === "intime").length;
            const lateCount = filteredData.filter(d => d.status === "late").length;
            const absentCount = filteredData.filter(d => d.status === "absent").length;

            const summaryCards = [
                { label: "Total Records", value: filteredData.length, format: "number" as const },
                { label: "On Time", value: ontimeCount, format: "number" as const, color: "green" as const },
                { label: "In Time", value: intimeCount, format: "number" as const, color: "orange" as const },
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
                case "intime": return <div className="p-1 rounded-full bg-orange-100 text-orange-600" title="In Time"><AlertCircle className="w-3 h-3" /></div>;
                case "late": return <div className="p-1 rounded-full bg-rose-100 text-rose-600" title="Late"><AlertTriangle className="w-3 h-3" /></div>;
                case "weekend": return <div className="p-1 rounded-full bg-neutral-100 text-neutral-500" title="Weekend"><span className="text-[10px] font-bold px-0.5">W</span></div>;
                case "holiday": return <div className="p-1 rounded-full bg-orange-100 text-orange-600" title="Holiday"><Calendar className="w-3 h-3" /></div>;
                case "absent": return <div className="p-1 rounded-full bg-neutral-100 text-neutral-400" title="Absent"><X className="w-3 h-3" /></div>;
                case "sick": return <div className="p-1 rounded-full bg-orange-100 text-orange-600" title="Sick"><AlertCircle className="w-3 h-3" /></div>;
                case "leave": return <div className="p-1 rounded-full bg-purple-100 text-purple-600" title="Leave"><span className="text-[10px] font-bold px-0.5">C</span></div>;
                default: return <div className="w-5 h-5" />;
            }
        }
        switch (status) {
            case "ontime": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle className="w-3 h-3" /> On Time</span>;
            case "intime": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700"><AlertCircle className="w-3 h-3" /> In Time</span>;
            case "late": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700"><AlertTriangle className="w-3 h-3" /> Late</span>;
            case "weekend": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500"><span className="font-bold text-[10px]">W</span> Weekend</span>;
            case "holiday": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700"><Calendar className="w-3 h-3" /> Holiday</span>;
            case "absent": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500"><X className="w-3 h-3" /> Absent</span>;
            case "sick": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700"><AlertCircle className="w-3 h-3" /> Sick</span>;
            case "leave": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700"><span className="font-bold text-[10px]">C</span> Leave</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            {/* HEADER REMOVED - Using Global PageHeader */}


            {/* ATTENDANCE ALERT (Personal) - Only show if there is data for the current month */}
            {personalTeamView === "personal" && filteredData.length > 0 && (
                <>
                    {weeklyLateCount === 0 ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-emerald-800">Perfect Attendance!</h4>
                                <p className="text-sm text-emerald-700 mt-1">
                                    Congrats! Maintain your discipline by never being late this week.
                                </p>
                            </div>
                        </div>
                    ) : weeklyLateCount <= 3 ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-orange-800">Attendance Alert</h4>
                                <p className="text-sm text-orange-700 mt-1">
                                    You have been late <span className="font-bold">{weeklyLateCount} times</span> this week. Please pay attention to your punctuality.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-rose-800">Critical Attendance Alert</h4>
                                <p className="text-sm text-rose-700 mt-1">
                                    You have been late <span className="font-bold">{weeklyLateCount} times</span> this week. Your KPI score will decrease. Frequent lateness impacts your performance review.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* SUMMARY STATS (Payroll / KPI Logic) */}
            {stats && (() => {
                // For Team View: Calculate AVERAGES across all team members from Jan 12
                if (personalTeamView === "team" && isManager) {
                    const activeMembers = teamMembers.filter(m => !EXCLUDED_USERS.includes(m.username));
                    const memberCount = activeMembers.length || 1;

                    // Filter data from Jan 12 onwards (first clock-in date)
                    const startDate = "2026-01-12";
                    const today = new Date();
                    const allDays = eachDayOfInterval({
                        start: new Date(startDate),
                        end: min([today, endOfMonth(currentMonth)])
                    });
                    const workDayDates = allDays.filter(d => !isSunday(d) && !HOLIDAYS_2026.find(h => h.date === format(d, "yyyy-MM-dd")));

                    const teamData = filteredData.filter(d => d.date >= startDate);

                    // Calculate totals across all team members
                    const totalPresent = teamData.filter(d => d.status === "ontime" || d.status === "intime" || d.status === "late").length;
                    const totalLate = teamData.filter(d => d.status === "late").length;
                    const totalOT = teamData.reduce((sum, d) => sum + (d.overtimeMinutes || 0), 0);

                    // Calculate ABSENT: For each workday, count members who have NO record
                    let totalAbsent = 0;
                    workDayDates.forEach(dayDate => {
                        const dateStr = format(dayDate, "yyyy-MM-dd");
                        activeMembers.forEach(member => {
                            const hasRecord = teamData.some(d => d.date === dateStr && (d.userId === member.id || d.employee === member.username));
                            if (!hasRecord) totalAbsent++;
                        });
                    });

                    // Calculate averages (round up to 1 decimal)
                    const avgPresent = Math.ceil((totalPresent / memberCount) * 10) / 10;
                    const avgLate = Math.ceil((totalLate / memberCount) * 10) / 10;
                    const avgAbsent = Math.ceil((totalAbsent / memberCount) * 10) / 10;
                    const avgOTMinutes = Math.round(totalOT / memberCount);

                    // Format overtime as Xh Ym
                    const otHours = Math.floor(avgOTMinutes / 60);
                    const otMins = Math.round(avgOTMinutes % 60);
                    const avgOTFormatted = otHours > 0 ? `${otHours}h ${otMins}m` : `${otMins}m`;

                    // Attendance Score
                    const workDays = workDayDates.length;
                    const avgScore = workDays > 0 ? Math.round((totalPresent / (workDays * memberCount)) * 100) : 0;

                    return (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                            <div className="bg-white border rounded-xl p-3 shadow-sm">
                                <div className="text-xs text-neutral-500">Avg Days Present</div>
                                <div className="text-xl font-bold text-neutral-900 mt-1">{avgPresent.toFixed(1)}</div>
                            </div>
                            <div className="bg-white border rounded-xl p-3 shadow-sm">
                                <div className="text-xs text-neutral-500">Avg Late Arrivals</div>
                                <div className={clsx("text-xl font-bold mt-1", avgLate > 0 ? "text-rose-600" : "text-neutral-900")}>
                                    {avgLate.toFixed(1)}
                                </div>
                            </div>
                            <div className="bg-white border rounded-xl p-3 shadow-sm">
                                <div className="text-xs text-neutral-500">Avg Absent/Leave</div>
                                <div className={clsx("text-xl font-bold mt-1", avgAbsent > 0 ? "text-rose-600" : "text-neutral-900")}>
                                    {avgAbsent.toFixed(1)}
                                </div>
                            </div>
                            <div className="bg-white border rounded-xl p-3 shadow-sm">
                                <div className="text-xs text-neutral-500">Avg Overtime</div>
                                <div className="text-xl font-bold text-emerald-600 mt-1">
                                    {avgOTFormatted}
                                </div>
                            </div>
                            <div className="bg-white border rounded-xl p-3 shadow-sm">
                                <div className="text-xs text-neutral-500">Avg Attendance Score</div>
                                <div className={clsx(
                                    "text-xl font-bold mt-1",
                                    avgScore >= 90 ? "text-emerald-600" :
                                        avgScore >= 75 ? "text-yellow-600" : "text-rose-600"
                                )}>
                                    {avgScore}%
                                </div>
                            </div>
                        </div>
                    );
                }

                // Personal View: Show individual totals (existing logic)
                return (
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
                );
            })()}



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
            {
                isManager && personalTeamView === "team" && showSearchInput && (
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
                )
            }

            {/* LIST VIEW (TABLE) */}

            {/* LIST VIEW (TABLE) */}


            {
                viewMode === "list" && (
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
                                            const r = row as any;
                                            const mode = r.checkInRemoteMode;
                                            const locType = r.checkInLocationType;
                                            const locCode = r.checkInLocationCode;
                                            const status = r.checkInLocationStatus;

                                            if (status === "inside" && locType === "office") {
                                                return { label: `WFO`, code: locCode, color: "text-blue-600" };
                                            }
                                            if (status === "inside" && locType === "project") {
                                                return { label: `Project`, code: locCode, color: "text-emerald-600" };
                                            }
                                            // Handle Remote / Other
                                            if (mode === 'business_trip') return { label: 'BST', code: null, color: "text-purple-600" };
                                            if (mode && mode !== '-') return { label: mode, code: null, color: "text-purple-600" };

                                            // Default fallback
                                            return { label: "-", code: null, color: "text-neutral-400" };
                                        };

                                        const locInfo = getLocationLabel();
                                        const mapsUrl = (row as any).checkInLatitude
                                            ? `https://www.google.com/maps?q=${(row as any).checkInLatitude},${(row as any).checkInLongitude}`
                                            : "#";

                                        return (
                                            <tr key={row.id} className="group hover:bg-neutral-50 transition-colors">
                                                {isManager && personalTeamView === "team" && (
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-500">
                                                                {row.employee?.split(' ').map((n: string) => n[0]).join('')}
                                                            </div>
                                                            {row.employee}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 whitespace-nowrap text-neutral-500">{format(new Date(row.date), "EEE, dd MMM")}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-neutral-900 font-mono text-xs">{row.clockIn}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <a
                                                            href={mapsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={clsx("flex items-center gap-1.5 hover:underline decoration-neutral-300 underline-offset-2", locInfo.color)}
                                                        >
                                                            {/* Icon: Map Pin */}
                                                            <MapPin className="w-3.5 h-3.5" />

                                                            <span className="font-medium text-xs">
                                                                {locInfo.label}{locInfo.code && ` (${locInfo.code})`}
                                                            </span>
                                                        </a>
                                                        {/* NOTES DISPLAY - Only show if exists */}
                                                        {(row as any).notes && (
                                                            <span className="text-[10px] text-neutral-500 max-w-[200px] truncate leading-tight ml-5" title={(row as any).notes}>
                                                                <span className="font-medium text-neutral-400">Note: </span>
                                                                {(row as any).notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-neutral-900 font-mono text-xs">{row.clockOut}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-neutral-500 text-xs">{row.duration}</td>
                                                <td className="px-6 py-4">
                                                    {row.overtime !== "-" ? (
                                                        <span className="text-emerald-600 font-medium">+{row.overtime}</span>
                                                    ) : (
                                                        <span className="text-neutral-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(row.status || "absent", false)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={isManager && personalTeamView === "team" ? 10 : 9} className="px-6 py-12 text-center text-neutral-500">
                                                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                                                        <Calendar className="w-8 h-8 text-neutral-400" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">No Records Found</h3>
                                                    <p className="text-neutral-500 text-sm">
                                                        Looks like there are no attendance records for <span className="font-medium text-neutral-700">{formatMonthYear(currentMonth)}</span>.
                                                        {personalTeamView === "personal" ? " Enjoy the quiet time or check a different month!" : " Your team was either very quiet or on break."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* PAGINATION - Hide if no data */}
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
                                {/* Empty cells for start of month offset if needed, but since this is list-based, we likely need to fill gaps. 
                                    However, the user wants calendar alignment. 
                                    If we are showing a specific month, we should generate the days of that month.
                                    If we are showing a filtered list, grid might be confusing if not complete.
                                    Assuming we show the 'currentMonth' fully. 
                                */}
                                {(() => {
                                    // Generate all days for the current month view
                                    const year = currentMonth.getFullYear();
                                    const month = currentMonth.getMonth(); // 0-indexed
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

                                    const calendarDays = [];

                                    // Padding for previous month
                                    for (let i = 0; i < firstDayOfMonth; i++) {
                                        calendarDays.push(<div key={`pad-${i}`} className="hidden md:block"></div>);
                                    }

                                    // Days
                                    // Determine Start Date from filteredData (which contains dense data starting from first check-in)
                                    // Use rawData or filteredData? filteredData aligns with what's shown in table.
                                    // FilteredData might be sorted DESC. Find min date.
                                    const allDates = filteredData.map(d => new Date(d.date).getTime());
                                    const firstCheckInTime = allDates.length > 0 ? Math.min(...allDates) : 0;
                                    const firstCheckInDate = firstCheckInTime ? new Date(firstCheckInTime) : null;

                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const dateObj = new Date(year, month, d);
                                        const dayName = format(dateObj, "EEE");
                                        const dateStr = format(dateObj, "yyyy-MM-dd");
                                        const record = filteredData.find((r) => r.date === dateStr);

                                        calendarDays.push(
                                            (() => {
                                                const isToday = isSameDay(dateObj, new Date());
                                                const isPast = dateObj < new Date() && !isToday;
                                                const status = record?.status;
                                                const isWeekend = dateObj.getDay() === 0; // Only Sunday is "Weekend/Holiday" for visual purposes

                                                // Check if date is before the first check-in of the month
                                                // If no data exists (firstCheckInDate is null), treat all as "before start" (no Absent marks)
                                                // Note: set hours to 0 to compare dates accurately
                                                const dateObjTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
                                                const startTime = firstCheckInDate ? new Date(firstCheckInDate.getFullYear(), firstCheckInDate.getMonth(), firstCheckInDate.getDate()).getTime() : null;
                                                const isBeforeStart = startTime ? dateObjTime < startTime : true;

                                                // Holiday / Leave Lookup (Global, outside of record existence)
                                                // This ensures future holidays or past holidays (before start) are visible
                                                const holidayInfo = HOLIDAYS_2026.find(h => h.date === dateStr);
                                                const isGlobalHoliday = !!holidayInfo && holidayInfo.type === 'holiday';
                                                const isGlobalCollectiveLeave = !!holidayInfo && holidayInfo.type === 'collective_leave';

                                                // Effectively Absent: Past + Workday + Started + No Record + Not a Holiday
                                                const isAbsent = isPast && !isWeekend && !isBeforeStart && !record && !isGlobalHoliday && !isGlobalCollectiveLeave;

                                                let cardClasses = "bg-white border-neutral-100";

                                                // CARD STYLING
                                                if (isToday) {
                                                    if (status === "ontime") cardClasses = "bg-emerald-100 border-emerald-200";
                                                    else if (status === "intime") cardClasses = "bg-orange-100 border-orange-200";
                                                    else if (status === "late") cardClasses = "bg-rose-100 border-rose-200";
                                                    else if (status === "leave" || isGlobalCollectiveLeave) cardClasses = "bg-purple-100 border-purple-200";
                                                    else if (status === "holiday" || isGlobalHoliday) cardClasses = "bg-orange-100 border-orange-200";
                                                    else cardClasses = "bg-blue-50 border-blue-100";
                                                } else if (isPast) {
                                                    if (status === "ontime") cardClasses = "bg-white border-emerald-500";
                                                    else if (status === "intime") cardClasses = "bg-white border-orange-500";
                                                    else if (status === "late") cardClasses = "bg-white border-rose-500";
                                                    else if (status === "leave" || isGlobalCollectiveLeave) cardClasses = "bg-white border-purple-500";
                                                    else if (status === "holiday" || isGlobalHoliday) {
                                                        // Holiday: Orange if Mon-Sat, Neutral if Sunday (unless specialized holiday overrides)
                                                        // User preference: Public Holiday -> Orange.
                                                        // If it's a Sunday but also a Public Holiday (e.g. Easter), use Orange.
                                                        // Only use weekend style if it's a JUST a Sunday (no holiday info).
                                                        if (isGlobalHoliday) cardClasses = "bg-white border-orange-500";
                                                        else if (isWeekend) cardClasses = "bg-neutral-50 border-neutral-100";
                                                        else cardClasses = "bg-white border-orange-500";
                                                    }
                                                    else if (isAbsent) cardClasses = "bg-neutral-50/50 border-neutral-200";
                                                    else if (isWeekend) cardClasses = "bg-neutral-50 border-neutral-100";
                                                } else {
                                                    // FUTURE
                                                    if (isGlobalCollectiveLeave) cardClasses = "bg-white border-purple-500";
                                                    else if (isGlobalHoliday) cardClasses = "bg-white border-orange-500";
                                                    else if (isWeekend) cardClasses = "bg-neutral-50 border-neutral-100";
                                                    else cardClasses = "bg-white border-neutral-100";
                                                }

                                                const displayNotes = (record as any)?.notes || (holidayInfo ? holidayInfo.nameEn : null);

                                                return (
                                                    <div
                                                        key={d}
                                                        className={clsx(
                                                            "rounded-xl border p-3 min-h-[100px] transition-all hover:shadow-md relative",
                                                            cardClasses
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className={clsx("text-xs", (!record && !isAbsent && !isGlobalHoliday && !isGlobalCollectiveLeave) ? "text-neutral-300" : "text-neutral-500")}>{d}</div>
                                                            <div className={clsx("text-xs font-medium md:hidden", !record && "text-neutral-300", record && "text-neutral-900")}>{dayName}</div>
                                                        </div>

                                                        {record ? (
                                                            <>
                                                                {(record.status === "ontime" || record.status === "intime" || record.status === "late" || record.status === "leave" || record.status === "holiday") && (
                                                                    <>
                                                                        <div className="mt-2 text-xs text-neutral-600 flex flex-col gap-0.5">
                                                                            {record.clockIn && record.clockIn !== "-" && <span className="font-mono text-[10px]">{record.clockIn}</span>}
                                                                            {record.clockOut && record.clockOut !== "-" && <span className="font-mono text-[10px]">{record.clockOut}</span>}

                                                                            {displayNotes && (
                                                                                <span className="text-[9px] leading-tight text-neutral-400 mt-1 line-clamp-2">{displayNotes}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-2 flex justify-end">{getStatusBadge(record.status, true)}</div>
                                                                    </>
                                                                )}
                                                                {(record.status !== "ontime" && record.status !== "intime" && record.status !== "late" && record.status !== "leave" && (record.status as string) !== "holiday") && (
                                                                    <div className="mt-4 flex justify-center">
                                                                        {getStatusBadge(record.status, true)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {isAbsent ? (
                                                                    <div className="mt-4 flex justify-center animate-in fade-in">
                                                                        {getStatusBadge("absent", true)}
                                                                    </div>
                                                                ) : (isGlobalHoliday || isGlobalCollectiveLeave) ? (
                                                                    // Render Holiday/Leave Card for Future/No-Record days
                                                                    <>
                                                                        <div className="mt-2 text-xs text-neutral-600 flex flex-col gap-0.5">
                                                                            {displayNotes && (
                                                                                <span className="text-[9px] leading-tight text-neutral-400 mt-1 line-clamp-2">{displayNotes}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-2 flex justify-end">
                                                                            {getStatusBadge(isGlobalCollectiveLeave ? "leave" : "holiday", true)}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    // Future / Weekend Empty
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100"></div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        );
                                    }
                                    return calendarDays;
                                })()}
                            </div>
                        )}

                        {/* TEAM: Team Calendar Grid View */}
                        {isManager && personalTeamView === "team" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {(() => {
                                    // Generate all days for the month (Up to today if current month)
                                    const today = new Date();
                                    const end = min([today, endOfMonth(currentMonth)]);
                                    const days = eachDayOfInterval({
                                        start: startOfMonth(currentMonth),
                                        end: end
                                    }).reverse(); // Latest first

                                    const activeMembers = teamMembers.filter(m => !EXCLUDED_USERS.includes(m.username)).sort((a, b) => (a.username || "").localeCompare(b.username || ""));

                                    return days.map(dayDate => {
                                        const dateStr = format(dayDate, "yyyy-MM-dd");
                                        const isToday = isSameDay(dayDate, today);
                                        const isSundayDay = isSunday(dayDate);

                                        // Check for Public Holidays and Collective Leaves
                                        const holidayInfo = HOLIDAYS_2026.find(h => h.date === dateStr);
                                        const isGlobalHoliday = holidayInfo?.type === "holiday";
                                        const isGlobalCollectiveLeave = holidayInfo?.type === "collective_leave";

                                        // Determine card styling based on day type
                                        let cardClasses = "bg-white border-neutral-200";
                                        let headerClasses = "text-neutral-700";
                                        let badgeElement: React.ReactNode = null;
                                        let showAvatars = true;

                                        if (isToday) {
                                            cardClasses = "bg-blue-50 border-blue-500 ring-1 ring-blue-500";
                                            headerClasses = "text-blue-600";
                                        } else if (isGlobalCollectiveLeave) {
                                            cardClasses = "bg-purple-50 border-purple-300";
                                            headerClasses = "text-purple-700";
                                            badgeElement = <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">{holidayInfo?.nameEn || "Collective Leave"}</span>;
                                            showAvatars = false;
                                        } else if (isGlobalHoliday) {
                                            cardClasses = "bg-orange-50 border-orange-300";
                                            headerClasses = "text-orange-700";
                                            badgeElement = <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">{holidayInfo?.nameEn || "Holiday"}</span>;
                                            showAvatars = false;
                                        } else if (isSundayDay) {
                                            cardClasses = "bg-neutral-50 border-neutral-200";
                                            headerClasses = "text-neutral-400";
                                            badgeElement = <span className="text-[10px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded font-medium">Weekend</span>;
                                            showAvatars = false;
                                        }

                                        return (
                                            <div key={dateStr} className={clsx("rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow", cardClasses)}>
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                                    <span className={clsx("font-bold text-sm", headerClasses)}>
                                                        {format(dayDate, "EEE, dd MMM")}
                                                    </span>
                                                    {isToday && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">TODAY</span>}
                                                    {!isToday && badgeElement}
                                                </div>

                                                {/* Holiday/Leave/Sunday Message */}
                                                {!showAvatars && (
                                                    <div className="flex items-center justify-center py-4">
                                                        {isGlobalCollectiveLeave && (
                                                            <div className="text-center">
                                                                <Calendar className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                                                                <div className="text-xs text-purple-600 font-medium">Collective Leave</div>
                                                            </div>
                                                        )}
                                                        {isGlobalHoliday && !isGlobalCollectiveLeave && (
                                                            <div className="text-center">
                                                                <Calendar className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                                                                <div className="text-xs text-orange-600 font-medium">Public Holiday</div>
                                                            </div>
                                                        )}
                                                        {isSundayDay && !isGlobalHoliday && !isGlobalCollectiveLeave && (
                                                            <div className="text-center">
                                                                <div className="w-8 h-8 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 font-bold text-sm mb-2">W</div>
                                                                <div className="text-xs text-neutral-400 font-medium">Weekend</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Avatars Grid - Only show on workdays */}
                                                {showAvatars && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {activeMembers.map(member => {
                                                            const record = filteredData.find(d => d.date === dateStr && (d.userId === member.id || d.employee === member.username));

                                                            let status = record?.status || "absent";
                                                            if (!record) status = "absent";

                                                            let borderColor = "border-neutral-200";
                                                            let textColor = "text-neutral-600";
                                                            let initials = member.username?.split(' ').map((n: any) => n[0]).slice(0, 2).join('') || "??";

                                                            if (status === "ontime") { borderColor = "border-emerald-500"; textColor = "text-emerald-700"; }
                                                            else if (status === "intime") { borderColor = "border-orange-500"; textColor = "text-orange-700"; }
                                                            else if (status === "late") { borderColor = "border-rose-500"; textColor = "text-rose-700"; }
                                                            else if (status === "leave") { borderColor = "border-purple-500"; textColor = "text-purple-700"; }
                                                            else if (status === "sick") { borderColor = "border-orange-500"; textColor = "text-orange-700"; }

                                                            return (
                                                                <div key={member.id} className="group relative">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold bg-white cursor-help transition-transform hover:scale-110 shadow-sm",
                                                                        borderColor, textColor
                                                                    )}>
                                                                        {record?.avatar ? (
                                                                            <img src={record.avatar} alt={member.username} className="w-full h-full rounded-full object-cover" />
                                                                        ) : (
                                                                            <span>{initials}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* HOVER TOOLTIP */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl pointer-events-none">
                                                                        <div className="font-bold text-sm mb-1">{member.username}</div>
                                                                        <div className="bg-white/10 h-px w-full my-1.5" />
                                                                        <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-gray-300">
                                                                            <span>Status:</span>
                                                                            <span className="capitalize text-white font-medium">{getStatusBadge(status, false)}</span>

                                                                            <span>Clock In:</span>
                                                                            <span className="font-mono text-white">{record?.clockIn || "--:--"}</span>

                                                                            <span>Clock Out:</span>
                                                                            <span className="font-mono text-white">{record?.clockOut || "--:--"}</span>

                                                                            {record?.notes && (
                                                                                <>
                                                                                    <span className="col-span-2 pt-1 text-gray-400 italic">"{record.notes}"</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-gray-900" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Summary Footer for Day - Only show on workdays */}
                                                {showAvatars && (
                                                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-3 text-[10px] text-neutral-400">
                                                        <div className="flex -space-x-1">
                                                            {activeMembers.slice(0, 3).map(m => (
                                                                <div key={m.id} className="w-4 h-4 rounded-full bg-neutral-200 border border-white" />
                                                            ))}
                                                            {activeMembers.length > 3 && (
                                                                <div className="w-4 h-4 rounded-full bg-neutral-100 border border-white flex items-center justify-center text-[8px] font-bold">+{activeMembers.length - 3}</div>
                                                            )}
                                                        </div>
                                                        <span>{activeMembers.length} Members</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
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
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span className="text-neutral-600">In Time</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <span className="text-neutral-600">Late</span>
                                </div>
                            </div>
                        </div>

                        {/* Bar Chart - Grouped by Employee */}
                        <div className="space-y-4">
                            {teamMembers
                                .filter(m => !EXCLUDED_USERS.includes(m.username))
                                .sort((a, b) => (a.username || "").localeCompare(b.username || ""))
                                .map((member, idx) => {
                                    const employeeRecords = filteredData.filter(d => d.userId === member.id || d.employee === member.username);
                                    const onTimeCount = employeeRecords.filter(d => d.status === "ontime").length;
                                    const intimeCount = employeeRecords.filter(d => d.status === "intime").length;
                                    const lateCount = employeeRecords.filter(d => d.status === "late").length;
                                    const totalWork = onTimeCount + intimeCount + lateCount;
                                    const onTimePercent = totalWork > 0 ? (onTimeCount / totalWork) * 100 : 0;
                                    const intimePercent = totalWork > 0 ? (intimeCount / totalWork) * 100 : 0;
                                    const latePercent = totalWork > 0 ? (lateCount / totalWork) * 100 : 0;

                                    return (
                                        <div key={member.id || idx} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">{member.username}</span>
                                                <span className="text-xs text-neutral-500">{totalWork > 0 ? `${onTimeCount} on time, ${lateCount} late` : "No records"}</span>
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
                                                {intimePercent > 0 && (
                                                    <div
                                                        className="bg-orange-500 h-full flex items-center justify-center text-xs text-white font-medium"
                                                        style={{ width: `${intimePercent}%` }}
                                                    >
                                                        {intimePercent > 20 && `${Math.round(intimePercent)}%`}
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
                                    <div className={clsx(
                                        "text-2xl font-bold",
                                        stats.attendanceScore < 50 ? "text-rose-600" :
                                            stats.attendanceScore < 80 ? "text-orange-600" : "text-emerald-600"
                                    )}>
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
