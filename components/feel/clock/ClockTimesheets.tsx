"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, startOfMonth, endOfMonth, isSunday, isSaturday, min, isWeekend, subMonths } from "date-fns";
import { HOLIDAYS_2026 } from "@/lib/constants/holidays";
import { Download, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, Search, List, Grid3X3, ArrowUpDown, BarChart3, Calendar, User, Users, ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2, X, MapPin } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ReferenceLine, ReferenceArea, ComposedChart, Line, Bar, BarChart, LabelList } from "recharts";
import { Button } from "@/shared/ui/primitives/button/button";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { calculateStats, formatMinutes, ClockStats, calculateAdidayaScore, getWorkDaysPassed } from "@/lib/clock-data-logic";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { AttendanceRecord, AttendanceStatus, AttendanceSession } from "@/lib/api/clock/clock.types";
import { clearClockCache } from "@/lib/api/clock/clock.cache";
import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";
import { PhotoPreviewModal } from "./PhotoPreviewModal";
import { Camera } from "lucide-react";
import { toast } from "react-hot-toast";

interface TimesheetRow extends Omit<AttendanceRecord, 'clockIn' | 'clockOut'> {
    clockIn: string | null;
    clockOut: string | null;
    employee: string;
    day: string;
    schedule: string;
    duration: string;
    overtime: string;
    isAbsent: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isLeave: boolean;
    avatar?: string;
}

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
    
    // Photo Preview Modal
    const [previewPhoto, setPreviewPhoto] = useState<{ url: string, userName: string, date: string } | null>(null);

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

    const [rule, setRule] = useState<any>(null);
    const [lastMonthStats, setLastMonthStats] = useState<any>(null);

    // -- DATA FETCHING --
    const { attendance, leaves, overtime: otLogs, businessTrips: trips, teamMembers, schedules, sessions, logs, loading: loadingData, refresh } = useClockData(profile?.id, personalTeamView === "team", currentMonth);

    // Fetch Rule and Last Month Data
    useEffect(() => {
        const loadHistory = async () => {
            try {
                // Determine previous month string (YYYY-MM-01)
                const prevMonthDate = subMonths(currentMonth, 1);
                const prevMonthStr = format(prevMonthDate, "yyyy-MM-01");

                // 1. Fetch Performance Rule (Always needed)
                const activeRule = await import("@/lib/api/performance").then(m => m.fetchCurrentPerformanceRule());

                // Update Rule State
                setRule((prev: any) => {
                    if (JSON.stringify(prev) === JSON.stringify(activeRule)) return prev;
                    return activeRule;
                });

                let finalStats = null;

                // 2. BRANCH LOGIC: Personal vs Team
                if (personalTeamView === "team") {
                    // --- TEAM VIEW: USE SNAPSHOTS ---
                    const teamSnaps = await import("@/lib/api/people").then(m => m.fetchTeamPerformance(profile?.department || "General", prevMonthStr));
                    finalStats = teamSnaps?.[0] || null;
                    console.log("DEBUG TEAM HISTORY (Snapshot):", finalStats);

                } else {
                    // --- PERSONAL VIEW: ALWAYS CALCULATE DYNAMICALLY ---
                    // CRITICAL: Ignore stored snapshots. Calculate fresh from raw data.
                    if (profile?.id) {
                        try {
                            const { start, end } = {
                                start: format(startOfMonth(prevMonthDate), "yyyy-MM-dd"),
                                end: format(endOfMonth(prevMonthDate), "yyyy-MM-dd")
                            };

                            const [clockData, logic] = await Promise.all([
                                import("@/lib/api/clock/index").then(m => m.fetchClockBundle(profile.id, start, end)),
                                import("@/lib/clock-data-logic")
                            ]);

                            // NOTE: We no longer use fallbackData directly.
                            // Instead, we build densePrevMonthData below which fills all gaps.

                            // DEBUG: Log raw fetched records
                            console.log("🔍 DEBUG RAW FETCH:", {
                                dateRange: { start, end },
                                rawRecordCount: clockData.attendance.length,
                                rawRecordDates: clockData.attendance.map((r: any) => r.date),
                                sessionCount: clockData.sessions?.length || 0,
                                sessionDates: clockData.sessions?.map((s: any) => s.date) || [],
                                logCount: clockData.logs?.length || 0,
                                clockInLogs: clockData.logs?.filter((l: any) => l.type === "clock_in").map((l: any) => l.timestamp?.substring(0, 10)) || []
                            });

                                // Config
                                const workDaysInMonth = getWorkDaysPassed(prevMonthDate);
                                const fallbackOTTarget = Math.max(20, workDaysInMonth * 1); // fallback 1h/day, min 20h

                                const config = {
                                    late_penalty_per: activeRule?.scoring_params?.attendance?.late_penalty || 2,
                                    late_penalty_cap: activeRule?.scoring_params?.attendance?.max_late_penalty || 20,
                                    ot_bonus_cap: activeRule?.overtime_max_bonus || 10,
                                    ot_target_value: activeRule?.ot_target_hours || fallbackOTTarget
                                };

                            // --- BUILD DENSE DATA FOR SCORING ---
                            // We must replicate the exact "dense" logic used in the main view
                            // merging holidays, absences, and logs to ensure the denominator matches.
                            const densePrevMonthData = (() => {
                                const start = startOfMonth(prevMonthDate);
                                const end = endOfMonth(prevMonthDate);
                                const days = eachDayOfInterval({ start, end });

                                return days.map(day => {
                                    const dateStr = format(day, "yyyy-MM-dd");

                                    // 1. Check for valid attendance record
                                    const record = clockData.attendance.find((r: any) => r.date === dateStr);
                                    if (record) return record;

                                    // 2. Check for Sessions (clock-in without finalized record)
                                    // If there's a session with clock_in, treat as "intime" (present)
                                    const session = clockData.sessions?.find((s: any) => s.date === dateStr);
                                    if (session && session.clockIn) {
                                        console.log("🎯 FOUND SESSION FOR:", dateStr, session);
                                        return {
                                            id: `session-${dateStr}`,
                                            userId: profile.id,
                                            date: dateStr,
                                            status: "intime", // Has clock-in = present
                                            clockIn: session.clockIn,
                                            clockOut: session.clockOut || null,
                                            totalMinutes: session.durationMinutes || 0,
                                            overtimeMinutes: 0
                                        };
                                    }

                                    // 2b. Check for Logs (clock_in event without session/record)
                                    // This catches "Raw Activity" cases like 29 Jan
                                    const clockInLog = clockData.logs?.find((l: any) =>
                                        l.type === "clock_in" &&
                                        l.timestamp?.startsWith(dateStr)
                                    );
                                    if (clockInLog) {
                                        console.log("🎯 FOUND LOG FOR:", dateStr, clockInLog);
                                        return {
                                            id: `log-${dateStr}`,
                                            userId: profile.id,
                                            date: dateStr,
                                            status: "intime", // Has clock-in log = present
                                            clockIn: clockInLog.timestamp,
                                            clockOut: null,
                                            totalMinutes: 0,
                                            overtimeMinutes: 0
                                        };
                                    }

                                    // 3. Check for Holidays
                                    const holiday = HOLIDAYS_2026.find(h => h.date === dateStr);
                                    if (holiday) {
                                        return {
                                            id: `holiday-${dateStr}`,
                                            userId: profile.id,
                                            date: dateStr,
                                            status: holiday.type === "collective_leave" ? "leave" : "holiday",
                                            clockIn: null,
                                            clockOut: null,
                                            totalMinutes: 0,
                                            overtimeMinutes: 0
                                        };
                                    }

                                    // 4. Check for Sunday (Normalized Weekend)
                                    if (isSunday(day)) {
                                        return {
                                            id: `sunday-${dateStr}`,
                                            userId: profile.id,
                                            date: dateStr,
                                            status: "holiday", // Treat as holiday/off
                                            clockIn: null,
                                            clockOut: null,
                                            totalMinutes: 0,
                                            overtimeMinutes: 0
                                        };
                                    }

                                    // 5. Default: ABSENT
                                    return {
                                        id: `absent-${dateStr}`,
                                        userId: profile.id,
                                        date: dateStr,
                                        status: "absent",
                                        clockIn: null,
                                        clockOut: null,
                                        totalMinutes: 0,
                                        overtimeMinutes: 0
                                    };
                                });
                            })();

                            // Calculate Score using DENSE data
                            // Now the denominator is naturally correct because we supply 31 rows of data (some holes filled as absent/holiday)
                            const calculatedScore = logic.calculateAdidayaScore(densePrevMonthData as any, config, prevMonthDate);

                            finalStats = {
                                user_id: profile.id,
                                period: prevMonthStr,
                                attendance_score: calculatedScore.attendance_score,
                                avg_attendance_rate: 0,
                                final_rating: "CALCULATED",
                                debug_days: null
                            };
                            console.log("✅ Personal History Calculated (DENSE):", {
                                score: finalStats.attendance_score,
                                denseRecords: densePrevMonthData.length,
                                presentDays: densePrevMonthData.filter(r => ["ontime", "intime", "late"].includes(r.status)).length
                            });

                        } catch (err) {
                            console.error("Failed to calculate personal history:", err);
                        }
                    }
                }

                setLastMonthStats((prev: any) => {
                    if (JSON.stringify(prev) === JSON.stringify(finalStats)) return prev;
                    return finalStats;
                });

            } catch (e) {
                console.warn("Failed to load history", e);
            }
        };
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [personalTeamView, profile?.id, profile?.department, currentMonth.getTime()]);

    // -- MAP DATA TO UI FORMAT --
    const rawData = useMemo(() => {
        // Safe time formatter to prevent Invalid Date crash
        const safeFormatTime = (timeStr: string | null | undefined) => {
            if (!timeStr || timeStr === "-") return "-";
            // If already HH:mm, return as is
            if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
            
            try {
                // Handle HH:mm:ss from DB time columns
                if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
                    return timeStr.substring(0, 5);
                }
                
                const date = new Date(timeStr);
                if (isNaN(date.getTime())) return "-";
                return format(date, "HH:mm");
            } catch (e) {
                return "-";
            }
        };

        const base: TimesheetRow[] = (attendance as AttendanceRecord[]).map(r => {
            const member = teamMembers.find(m => String(m.id).toLowerCase() === String(r.userId).toLowerCase());
            const employeeName = member?.username || (member as any)?.full_name || r.userName || "Unknown";
            
            // Get schedule string
            const schedule = schedules.find(s => s.id === member?.schedule_id);
            const scheduleStr = schedule ? `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}` : "09:00 - 18:00";

            return {
                ...r,
                employee: employeeName,
                day: r.date ? format(new Date(r.date), "EEE") : "-",
                schedule: scheduleStr, 
                duration: r.totalMinutes ? formatMinutes(r.totalMinutes) : "-",
                overtime: r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "-",
                clockIn: r.clockIn ? safeFormatTime(r.clockIn) : "-",
                clockOut: r.clockOut ? safeFormatTime(r.clockOut) : "-",
                isAbsent: (r as any).isAbsent || false,
                isHoliday: (r as any).isHoliday || false,
                holidayName: (r as any).holidayName,
                isLeave: r.status === "leave",
                avatar: r.avatar || member?.avatar_url || undefined,
                checkInPhotoUrl: r.checkInPhotoUrl,
                checkOutPhotoUrl: r.checkOutPhotoUrl
            } as TimesheetRow;
        });

        return base.filter(row => row.employee !== "Unknown");
    }, [attendance, teamMembers, schedules]);

    // -- STATS CALCULATION --
    const [stats, setStats] = useState<ClockStats | null>(null);
    const [weeklyLateCount, setWeeklyLateCount] = useState(0);
    const [adidayaResult, setAdidayaResult] = useState<any>(null);
    const [teamAverageStats, setTeamAverageStats] = useState<any>(null);

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

    // const EXCLUDED_USERS = ["Adidaya Admin", "Adidaya IT", "Adidaya Finance", "Adidaya Staff", "harryadin", "Adidaya Studio", "Harryadin Mahardika"];
    
    const filteredData = useMemo(() => {
        let baseData = [...(rawData as TimesheetRow[])];

        // 1. Filter by Person (Team View)
        if (personalTeamView === "team") {
            // Exclude system accounts
            const excludedIds = teamMembers
                .filter(m => m.account_type !== 'human_account' || m.include_in_performance === false)
                .map(m => m.id);
            baseData = baseData.filter(d => !excludedIds.includes(d.userId));

            if (selectedPerson !== "all") {
                baseData = baseData.filter(d => d.employee === selectedPerson);
            }
        }

        // 2. Filter by Date Range
        if (dateFrom) {
            baseData = baseData.filter(d => d.date >= dateFrom);
        }
        if (dateTo) {
            baseData = baseData.filter(d => d.date <= dateTo);
        }

        // 3. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            baseData = baseData.filter(d =>
                d.employee?.toLowerCase().includes(query) ||
                d.date.includes(query) ||
                d.status.toLowerCase().includes(query) ||
                (d.notes || "").toLowerCase().includes(query)
            );
        }

        // 4. Sort
        return baseData.sort((a, b) => {
            if (sortBy === "date") {
                return sortOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
            } else if (sortBy === "employee") {
                const nameA = a.employee || "";
                const nameB = b.employee || "";
                return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
            return 0;
        });
    }, [rawData, teamMembers, personalTeamView, selectedPerson, dateFrom, dateTo, searchQuery, sortBy, sortOrder]);


    useEffect(() => {
        const workDaysInMonth = getWorkDaysPassed(currentMonth);
        const fallbackOTTarget = Math.max(20, workDaysInMonth * 1); // fallback 1h/day, min 20h

        const config = {
            late_penalty_per: rule?.scoring_params?.attendance?.late_penalty || 2,
            late_penalty_cap: rule?.scoring_params?.attendance?.max_late_penalty || 20,
            ot_bonus_cap: rule?.overtime_max_bonus || 10,
            ot_target_value: rule?.ot_target_hours || fallbackOTTarget // DYNAMIC TARGET FROM SETUP
        };

        import("@/lib/clock-data-logic").then(m => {
            const res = m.calculateAdidayaScore(filteredData as any, config, currentMonth);
            setAdidayaResult((prev: any) => {
                if (JSON.stringify(prev) === JSON.stringify(res)) return prev;
                return res;
            });

            const newStats = m.calculateStats(filteredData as any, currentMonth);
            setStats((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(newStats)) return prev;
                return newStats;
            });
        });

        if (personalTeamView === "personal") {
            const today = new Date();
            const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
            const lateCount = filteredData.filter(r => r.status === "late" && new Date(r.date) >= startOfCurrentWeek).length;
            setWeeklyLateCount(prev => prev === lateCount ? prev : lateCount);
        }

        // Calculate TEAM AVERAGE stats (for team view)
        if (personalTeamView === "team" && teamMembers.length > 0) {
            import("@/lib/clock-data-logic").then(m => {
                const validMembers = teamMembers.filter(mem =>
                    mem.account_type === 'human_account' &&
                    mem.include_in_performance !== false
                );

                if (validMembers.length === 0) {
                    setTeamAverageStats(null);
                    return;
                }

                const config = {
                    late_penalty_per: rule?.scoring_params?.attendance?.late_penalty || 2,
                    late_penalty_cap: rule?.scoring_params?.attendance?.max_late_penalty || 20,
                    ot_bonus_cap: rule?.overtime_max_bonus || 10,
                    ot_target_value: rule?.ot_target_hours || 40
                };

                // Calculate individual scores for each member
                const memberResults = validMembers.map(member => {
                    const memberData = rawData.filter(d =>
                        d.userId === member.id || d.employee === member.username
                    );
                    return m.calculateAdidayaScore(memberData as any, config, currentMonth);
                }).filter(r => r && r.total_days > 0); // Only include members with data

                if (memberResults.length === 0) {
                    setTeamAverageStats(null);
                    return;
                }

                // Calculate averages
                const avgStats = {
                    days_present: Math.round(memberResults.reduce((sum, r) => sum + r.days_present, 0) / memberResults.length * 10) / 10,
                    total_days: Math.round(memberResults.reduce((sum, r) => sum + r.total_days, 0) / memberResults.length * 10) / 10,
                    late_arrivals: Math.round(memberResults.reduce((sum, r) => sum + r.late_arrivals, 0) / memberResults.length * 10) / 10,
                    late_penalty: Math.round(memberResults.reduce((sum, r) => sum + r.late_penalty, 0) / memberResults.length * 10) / 10,
                    overtime_hours: Math.round(memberResults.reduce((sum, r) => sum + r.overtime_hours, 0) / memberResults.length * 10) / 10,
                    ot_bonus: Math.round(memberResults.reduce((sum, r) => sum + r.ot_bonus, 0) / memberResults.length * 10) / 10,
                    present_points: Math.round(memberResults.reduce((sum, r) => sum + r.present_points, 0) / memberResults.length * 10) / 10,
                    attendance_raw_score: Math.round(memberResults.reduce((sum, r) => sum + r.attendance_raw_score, 0) / memberResults.length * 10) / 10,
                    attendance_score: Math.round(memberResults.reduce((sum, r) => sum + r.attendance_score, 0) / memberResults.length),
                    attendance_quality_category: "",
                    member_count: validMembers.length,
                    members_with_data: memberResults.length
                };

                // Determine quality category from average score
                const avgScore = avgStats.attendance_score;
                avgStats.attendance_quality_category =
                    avgScore >= 95 ? "Perfect" :
                        avgScore >= 90 ? "Excellent" :
                            avgScore >= 80 ? "Very Good" :
                                avgScore >= 70 ? "Good" :
                                    avgScore >= 60 ? "Fair" : "Poor";

                setTeamAverageStats((prev: any) => {
                    if (JSON.stringify(prev) === JSON.stringify(avgStats)) return prev;
                    return avgStats;
                });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredData, personalTeamView, currentMonth.getTime(), rule, teamMembers, rawData]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonth.getTime(), personalTeamView, viewMode]);

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

            // 2. Hydrate with ALL team members: Only HUMAN + INCLUDED
            // 2. Hydrate with ALL team members: Exclude System & Explicitly Excluded
            const validMembers = teamMembers.filter(m =>
                m.account_type !== 'system' &&
                m.status !== 'terminated' &&
                m.include_in_performance !== false
            );

            // 3. Find "Ghost" Members: Users who have a record but are NOT in the validMembers list
            // (e.g. users not yet synchronized to profiles, or users with permission issues)
            const ghostMembersFromRecords = dayRecords.reduce((acc: any[], record) => {
                const mid = String(record.userId).toLowerCase().trim();
                const isInValidMembers = validMembers.some(m =>
                    String(m.id).toLowerCase().trim() === mid ||
                    String(m.username).toLowerCase().trim() === String(record.employee).toLowerCase().trim()
                );
                const isAlreadyAdded = acc.some(m => String(m.id).toLowerCase().trim() === mid);

                if (!isInValidMembers && !isAlreadyAdded && record.employee && record.employee !== "Unknown") {
                    // Look up in full teamMembers to check if this person should be excluded
                    const memberProfile = teamMembers.find(m =>
                        String(m.id).toLowerCase().trim() === mid ||
                        String(m.username).toLowerCase().trim() === String(record.employee).toLowerCase().trim()
                    );
                    // Skip if explicitly excluded or non-human
                    const shouldExclude = memberProfile && (
                        memberProfile.include_in_performance === false ||
                        memberProfile.account_type === 'system'
                    );

                    if (!shouldExclude) {
                        acc.push({
                            id: record.userId || `ghost-${record.employee}`,
                            username: record.employee,
                            avatar_url: record.avatar,
                            department: (record as any).userDepartment,
                            role: (record as any).userRole || "staff"
                        });
                    }
                }
                return acc;
            }, []);

            // 4. Combine members
            const allMembersToDisplay = Array.from(new Map(
                [...validMembers, ...ghostMembersFromRecords]
                    .map(m => [String(m.id).toLowerCase().trim(), m])
            ).values());

            const fullList: any[] = [];
            
            allMembersToDisplay.forEach(member => {
                const mid = String(member.id).toLowerCase().trim();
                const mName = String(member.username).toLowerCase().trim();
                
                // Find ALL records for this member on this day from useClockData
                const recordsForMember = dayRecords.filter(r => 
                    String(r.userId).toLowerCase().trim() === mid || 
                    String(r.employee).toLowerCase().trim() === mName
                );

                if (recordsForMember.length > 0) {
                    // Add all session records for this member
                    recordsForMember.forEach(r => fullList.push(r));
                } else {
                    // Add synthetic "Absent" record — only for real members with a known name
                    const displayName = member.username || member.full_name;
                    if (!displayName) return; // Skip ghost members with no name
                    fullList.push({
                        id: `absent-${member.id}-${dateToShow}`,
                        date: dateToShow,
                        employee: displayName,
                        userId: member.id,
                        clockIn: "-",
                        clockOut: "-",
                        duration: "0h 0m",
                        status: "absent" as any,
                        overtime: "-",
                        day: format(new Date(dateToShow), "EEE"),
                        avatar: member.avatar_url,
                    });
                }
            });

            // Handle Sorting: Latest Clock In first, then Name
            return fullList.sort((a, b) => {
                const timeA = (a.clockIn && a.clockIn !== '-') ? a.clockIn : "23:59";
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonth.getTime(), personalTeamView, viewMode, searchQuery]);

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
                        projectName: "Adidaya Studio (PT Mahardika Adidaya) - Clock Timesheets",
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
            toast.error("Failed to export PDF. Please try again.");
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

            {/* SUMMARY STATS (Adidaya OS Specs) */}
            {(() => {
                // Use team average stats for team view, personal stats for personal view
                const displayStats = personalTeamView === "team" ? teamAverageStats : adidayaResult;
                if (!displayStats) return null;

                const lastScore = Number(lastMonthStats?.attendance_score || lastMonthStats?.avg_attendance_rate || 0);
                const delta = displayStats.attendance_score - lastScore;
                const isTeamView = personalTeamView === "team";

                return (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                        <div className="bg-white border rounded-xl p-3 shadow-sm relative overflow-hidden">
                            <div className="text-xs text-neutral-500">{isTeamView ? "Avg Days Present" : "Days Present"}</div>
                            <div className="text-xl font-bold text-neutral-900 mt-1">{displayStats.days_present} <span className="text-xs font-normal text-neutral-400">/ {displayStats.total_days}</span></div>
                            <div className="text-[10px] text-neutral-400 mt-1">
                                {isTeamView ? `${displayStats.members_with_data} members` : `Present Points: ${displayStats.present_points}`}
                            </div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">{isTeamView ? "Avg Late Arrivals" : "Late Arrivals"}</div>
                            <div className={clsx("text-xl font-bold mt-1", displayStats.late_arrivals > 0 ? "text-rose-600" : "text-neutral-900")}>
                                {displayStats.late_arrivals}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">Penalty: -{displayStats.late_penalty}</div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-neutral-500">{isTeamView ? "Avg Overtime" : "Overtime"}</div>
                            <div className="text-xl font-bold text-emerald-600 mt-1">
                                {displayStats.overtime_hours.toFixed(1)}h
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">Bonus: +{displayStats.ot_bonus}</div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="text-xs text-neutral-500">{isTeamView ? "Team Quality" : "Quality Category"}</div>
                                <div className={clsx(
                                    "mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit",
                                    displayStats.attendance_quality_category === "Excellent" || displayStats.attendance_quality_category === "Perfect" ? "bg-emerald-100 text-emerald-700" :
                                        displayStats.attendance_quality_category === "Very Good" || displayStats.attendance_quality_category === "Good" ? "bg-blue-100 text-blue-700" :
                                            displayStats.attendance_quality_category === "Fair" ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"
                                )}>
                                    {displayStats.attendance_quality_category}
                                </div>
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">Raw: {displayStats.attendance_raw_score.toFixed(1)}</div>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm relative">
                            <div className="text-xs text-neutral-500">{isTeamView ? "Team Avg Score" : "Attendance Score"}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={clsx(
                                    "text-2xl font-black tracking-tight",
                                    displayStats.attendance_score >= 90 ? "text-emerald-600" :
                                        displayStats.attendance_score >= 75 ? "text-blue-600" : "text-rose-600"
                                )}>
                                    {displayStats.attendance_score}%
                                </div>
                                {!isTeamView && lastScore > 0 && (
                                    <div className={clsx(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                                        delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}>
                                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">
                                {isTeamView
                                    ? `${displayStats.member_count} team members`
                                    : `Last Month: ${lastScore}%`}
                                {!isTeamView && (
                                    <span className="ml-1 opacity-70">
                                        (calculated)
                                    </span>
                                )}
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
                    <>
                        {/* MOBILE LIST VIEW (Cards) */}
                        <div className="md:hidden space-y-4">
                            {paginatedData.map((row: any) => {
                                const statusColor = row.status === 'late' ? 'bg-rose-50 border-rose-100' :
                                    row.status === 'ontime' ? 'bg-emerald-50 border-emerald-100' :
                                        'bg-white border-neutral-200';
                                return (
                                    <LiquidItemCard
                                        key={`${(row as TimesheetRow).id}-${(row as TimesheetRow).date}-${row.userId}`}
                                        className={statusColor}
                                        leftAvatar={
                                            <div className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full bg-neutral-100/80 border border-neutral-200/60 shrink-0">
                                                <span className="text-base font-bold text-neutral-900 leading-none tracking-tight">
                                                    {format(new Date((row as TimesheetRow).date), "dd")}
                                                </span>
                                                <span className="text-[9px] font-bold text-neutral-500 uppercase leading-none mt-0.5 tracking-wide">
                                                    {format(new Date((row as TimesheetRow).date), "MMM")}
                                                </span>
                                            </div>
                                        }
                                        title={
                                            <div className="flex items-center gap-2">
                                                <span className={clsx("text-sm font-bold text-neutral-900 leading-none", (personalTeamView === "team" && isManager) && "truncate max-w-[120px]")}>
                                                    {(personalTeamView === "team" && isManager) ? (row as TimesheetRow).employee : format(new Date((row as TimesheetRow).date), "EEEE")}
                                                </span>
                                                {(() => {
                                                    const r = row as any;
                                                    const mode = r.checkInRemoteMode;
                                                    const locType = r.checkInLocationType;
                                                    const locCode = r.checkInLocationCode;
                                                    
                                                    let label = "-";
                                                    let badgeColor = "text-neutral-500 bg-neutral-100 ring-neutral-200/50";
                                                    
                                                    if (locType === "office") { label = "WFO"; badgeColor = "text-blue-700 bg-blue-50 ring-blue-200/50 border-blue-100"; }
                                                    else if (locType === "project" || locCode?.startsWith("PRJ")) { label = locCode && locCode !== "-" ? locCode : "Project"; badgeColor = "text-emerald-700 bg-emerald-50 ring-emerald-200/50 border-emerald-100"; }
                                                    else if (mode === 'business_trip') { label = "BST"; badgeColor = "text-purple-700 bg-purple-50 ring-purple-200/50 border-purple-100"; }
                                                    else if (mode && mode !== '-') { label = mode; badgeColor = "text-purple-700 bg-purple-50 ring-purple-200/50 border-purple-100"; }
                                                    else if (locCode && locCode !== '-') { label = locType || 'LOC'; badgeColor = "text-neutral-700 bg-neutral-50 ring-neutral-200/50 border-neutral-200"; }

                                                    if (label === "-" && (!locCode || locCode === '-')) return null;

                                                    return (
                                                        <a
                                                            href={r.checkInLatitude ? `https://www.google.com/maps?q=${r.checkInLatitude},${r.checkInLongitude}` : "#"}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={clsx(
                                                                "flex items-center gap-1 min-w-0 max-w-[120px]",
                                                                "px-2 pl-1.5 py-0.5 rounded-md border ring-1 ring-inset shadow-sm",
                                                                badgeColor,
                                                                r.checkInLatitude && "hover:opacity-80 transition-opacity cursor-pointer"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!r.checkInLatitude) e.preventDefault();
                                                            }}
                                                        >
                                                            <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="text-[10px] font-bold tracking-wide uppercase leading-none mt-0.5">{label}</span>
                                                                {locCode && locCode !== '-' && locCode !== label && (
                                                                    <>
                                                                        <div className="w-0.5 h-2.5 bg-current opacity-30 shrink-0" />
                                                                        <span className="text-[9px] font-medium opacity-90 truncate leading-none mt-0.5">{locCode}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </a>
                                                    );
                                                })()}
                                            </div>
                                        }
                                        subtitle={
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-3 text-xs leading-none">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-semibold text-neutral-400 uppercase">In</span>
                                                        {(row as TimesheetRow).checkInPhotoUrl ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                     setPreviewPhoto({
                                                                        url: (row as TimesheetRow).checkInPhotoUrl || "",
                                                                        userName: (row as TimesheetRow).employee || userName || "",
                                                                        date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                    });
                                                                }}
                                                                className="font-mono font-medium text-blue-600 hover:underline flex items-center gap-0.5"
                                                            >
                                                                {row.clockIn}
                                                                <Camera className="w-2.5 h-2.5 opacity-50" />
                                                            </button>
                                                        ) : (
                                                            <span className="font-mono font-medium text-neutral-700">{row.clockIn}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-semibold text-neutral-400 uppercase">Out</span>
                                                        {(row as TimesheetRow).checkOutPhotoUrl ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewPhoto({
                                                                        url: (row as TimesheetRow).checkOutPhotoUrl || "",
                                                                        userName: (row as TimesheetRow).employee || userName || "",
                                                                        date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                    });
                                                                }}
                                                                className="font-mono font-medium text-blue-600 hover:underline flex items-center gap-0.5"
                                                            >
                                                                {row.clockOut}
                                                                <Camera className="w-2.5 h-2.5 opacity-50" />
                                                            </button>
                                                        ) : (
                                                            <span className="font-mono font-medium text-neutral-700">{row.clockOut}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-semibold text-neutral-400 uppercase">Dur</span>
                                                        <span className="font-mono font-medium text-neutral-500">{row.duration.replace('h ', 'h').replace('m', 'm')}</span>
                                                    </div>
                                                </div>
                                                
                                                {row.notes && row.notes !== "Active Session" && (
                                                    <div className="text-[11px] text-neutral-500 mt-1 pt-1 italic line-clamp-2 leading-tight">
                                                        <span className="font-semibold text-neutral-400 shrink-0 not-italic mr-1 uppercase tracking-widest text-[9px]">Note</span>
                                                        {row.notes}
                                                    </div>
                                                )}
                                            </div>
                                        }
                                        rightTop={
                                            <div className="shrink-0 scale-90 origin-right">
                                                {getStatusBadge(row.status || "absent", true)}
                                            </div>
                                        }
                                    />
                                );
                            })}

                            {paginatedData.length === 0 && (
                                <div className="text-center py-10 px-4 bg-white rounded-xl border border-neutral-200 border-dashed">
                                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Calendar className="w-6 h-6 text-neutral-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-neutral-900">No Records Found</h3>
                                    <p className="text-xs text-neutral-500 mt-1">Try changing the month or filters.</p>
                                </div>
                            )}

                            {/* Mobile Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 pb-8">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="rounded-full w-10 h-10 p-0"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-medium text-neutral-600">Page {currentPage} of {totalPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="rounded-full w-10 h-10 p-0"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* DESKTOP LIST VIEW (Table) - Hidden on Mobile */}
                        <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
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
                                            <th className="text-center px-6 py-4 text-xs font-semibold text-neutral-600 uppercase">Photos</th>
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

                                                // 1. Office / WFO
                                                if (locType === "office") {
                                                    return { label: `WFO`, code: locCode, color: "text-blue-600" };
                                                }
                                                // 2. Project
                                                if (locType === "project" || locCode?.startsWith("PRJ")) {
                                                    const prjLabel = locCode && locCode !== "-" ? locCode : "Project";
                                                    return { label: prjLabel, code: null, color: "text-emerald-600" };
                                                }
                                                // 3. Remote / BST / WFA
                                                if (mode === 'business_trip') return { label: 'BST', code: null, color: "text-purple-600" };
                                                if (mode && mode !== '-') return { label: mode, code: null, color: "text-purple-600" };

                                                // 4. Fallback if we have a code but unknown type
                                                if (locCode && locCode !== '-') {
                                                    return { label: locType || 'LOC', code: locCode, color: "text-neutral-600" };
                                                }

                                                // Default fallback
                                                return { label: "-", code: null, color: "text-neutral-400" };
                                            };

                                            const locInfo = getLocationLabel();
                                            const mapsUrl = (row as any).checkInLatitude
                                                ? `https://www.google.com/maps?q=${(row as any).checkInLatitude},${(row as any).checkInLongitude}`
                                                : "#";

                                            return (
                                                <tr key={`${(row as TimesheetRow).id}-${(row as TimesheetRow).date}-${idx}`} className="group hover:bg-neutral-50 transition-colors">
                                                    {isManager && personalTeamView === "team" && (
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white shadow-sm">
                                                                    {(row as TimesheetRow).employee?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-neutral-900">{(row as TimesheetRow).employee}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap text-neutral-500">{format(new Date((row as TimesheetRow).date), "EEE, dd MMM")}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-neutral-900 font-mono text-xs">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if ((row as TimesheetRow).checkInPhotoUrl) {
                                                                    setPreviewPhoto({
                                                                        url: (row as TimesheetRow).checkInPhotoUrl || "",
                                                                        userName: (row as TimesheetRow).employee || userName || "",
                                                                        date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                    });
                                                                } else {
                                                                    toast.error("No photo and precise location data available for this record (possibly made before the mandatory update).");
                                                                }
                                                            }}
                                                            className={clsx(
                                                                "flex items-center gap-0.5 hover:underline transition-all group",
                                                                (row as TimesheetRow).checkInPhotoUrl ? "text-blue-600 hover:text-blue-800" : "text-neutral-700 opacity-80 hover:opacity-100"
                                                            )}
                                                            title={(row as TimesheetRow).checkInPhotoUrl ? "View Check-In Photo" : "No photo available"}
                                                        >
                                                            {row.clockIn}
                                                            {(row as TimesheetRow).checkInPhotoUrl && <Camera className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity ml-1" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <a
                                                                href={mapsUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
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
                                                     <td className="px-6 py-4 whitespace-nowrap text-neutral-900 font-mono text-xs">
                                                         <button 
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 if ((row as TimesheetRow).checkOutPhotoUrl) {
                                                                     setPreviewPhoto({
                                                                         url: (row as TimesheetRow).checkOutPhotoUrl || "",
                                                                         userName: (row as TimesheetRow).employee || userName || "",
                                                                         date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                     });
                                                                 } else {
                                                                     toast.error("No photo and precise location data available for this record (possibly made before the mandatory update).");
                                                                 }
                                                             }}
                                                             className={clsx(
                                                                 "flex items-center gap-0.5 hover:underline transition-all group",
                                                                 (row as TimesheetRow).checkOutPhotoUrl ? "text-blue-600 hover:text-blue-800" : "text-neutral-700 opacity-80 hover:opacity-100"
                                                             )}
                                                             title={(row as TimesheetRow).checkOutPhotoUrl ? "View Check-Out Photo" : "No photo available"}
                                                         >
                                                             {row.clockOut}
                                                             {(row as TimesheetRow).checkOutPhotoUrl && <Camera className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity ml-1" />}
                                                         </button>
                                                     </td>
                                                     
                                                     {/* NEW PHOTOS COLUMN */}
                                                     <td className="px-6 py-4 whitespace-nowrap">
                                                         <div className="flex items-center justify-center gap-3">
                                                             {/* Check-In Photo */}
                                                             <button
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     if ((row as TimesheetRow).checkInPhotoUrl) {
                                                                         setPreviewPhoto({
                                                                             url: (row as TimesheetRow).checkInPhotoUrl || "",
                                                                             userName: (row as TimesheetRow).employee || userName || "",
                                                                             date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                         });
                                                                     } else {
                                                                         toast.error("Check-in photo not available.");
                                                                     }
                                                                 }}
                                                                 disabled={!(row as TimesheetRow).checkInPhotoUrl}
                                                                 className={clsx(
                                                                     "p-2 rounded-lg transition-all",
                                                                     (row as TimesheetRow).checkInPhotoUrl 
                                                                         ? "bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-100/50 shadow-sm" 
                                                                         : "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                                                                 )}
                                                                 title="Check-In Photo"
                                                             >
                                                                 <Camera className="w-4 h-4" />
                                                             </button>

                                                             {/* Check-Out Photo */}
                                                             <button
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     if ((row as TimesheetRow).checkOutPhotoUrl) {
                                                                         setPreviewPhoto({
                                                                             url: (row as TimesheetRow).checkOutPhotoUrl || "",
                                                                             userName: (row as TimesheetRow).employee || userName || "",
                                                                             date: format(new Date((row as TimesheetRow).date), "dd MMM yyyy")
                                                                         });
                                                                     } else {
                                                                         toast.error("Check-out photo not available.");
                                                                     }
                                                                 }}
                                                                 disabled={!(row as TimesheetRow).checkOutPhotoUrl}
                                                                 className={clsx(
                                                                     "p-2 rounded-lg transition-all",
                                                                     (row as TimesheetRow).checkOutPhotoUrl 
                                                                         ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ring-1 ring-indigo-100/50 shadow-sm" 
                                                                         : "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                                                                 )}
                                                                 title="Check-Out Photo"
                                                             >
                                                                 <div className="relative">
                                                                    <Camera className="w-4 h-4" />
                                                                    {(row as TimesheetRow).checkOutPhotoUrl && (
                                                                       <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-white" />
                                                                    )}
                                                                 </div>
                                                             </button>
                                                         </div>
                                                     </td>
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
                    </>
                )
            }

            {/* Photo Preview Modal */}
            <PhotoPreviewModal
                isOpen={!!previewPhoto}
                onClose={() => setPreviewPhoto(null)}
                photoUrl={previewPhoto?.url || null}
                userName={previewPhoto?.userName}
                date={previewPhoto?.date}
            />





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

                                    // Filter active members: Only HUMAN + INCLUDED (not system, not excluded)
                                    const activeMembers = teamMembers
                                        .filter(m =>
                                            m.account_type === 'human_account' &&
                                            m.include_in_performance !== false
                                        )
                                        .sort((a, b) => (a.username || "").localeCompare(b.username || ""));

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

                                                            let gradientClass = "from-neutral-400 to-neutral-500"; // default absent
                                                            let initials = member.username?.split(' ').map((n: any) => n[0]).slice(0, 2).join('').toUpperCase() || "??";

                                                            if (status === "ontime") { gradientClass = "from-emerald-400 to-emerald-600"; }
                                                            else if (status === "intime") { gradientClass = "from-amber-400 to-amber-600"; }
                                                            else if (status === "late") { gradientClass = "from-rose-400 to-rose-600"; }
                                                            else if (status === "leave") { gradientClass = "from-purple-400 to-purple-600"; }
                                                            else if (status === "sick") { gradientClass = "from-orange-400 to-orange-600"; }

                                                            return (
                                                                <div key={member.id} className="group relative">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold cursor-help transition-transform hover:scale-110 shadow-sm",
                                                                        "bg-gradient-to-br text-white",
                                                                        gradientClass
                                                                    )}>
                                                                        {record?.avatar ? (
                                                                            <img src={record.avatar} alt={member.username} className="w-full h-full rounded-full object-cover" />
                                                                        ) : (
                                                                            <span>{initials}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* HOVER TOOLTIP - iOS Glassy Light */}
                                                                    <div
                                                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 text-xs rounded-2xl py-3 px-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none"
                                                                        style={{
                                                                            backdropFilter: 'blur(20px)',
                                                                            WebkitBackdropFilter: 'blur(20px)',
                                                                            background: 'rgba(255,255,255,0.65)',
                                                                            border: '1px solid rgba(255,255,255,0.4)',
                                                                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                                                                        }}
                                                                    >
                                                                        <div className="font-bold text-sm text-neutral-900 mb-2">{member.username}</div>
                                                                        <div className="bg-neutral-200/50 h-px w-full my-2" />
                                                                        <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1.5 text-neutral-500">
                                                                            <span>Status:</span>
                                                                            <span className="capitalize font-medium">{getStatusBadge(status, false)}</span>

                                                                            <span>Clock In:</span>
                                                                            <span className="font-mono text-neutral-900 font-medium">{record?.clockIn || "--:--"}</span>

                                                                            <span>Clock Out:</span>
                                                                            <span className="font-mono text-neutral-900 font-medium">{record?.clockOut || "--:--"}</span>

                                                                            {record?.notes && (
                                                                                <>
                                                                                    <span className="col-span-2 pt-1 text-neutral-400 italic">"{record.notes}"</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-white/80" />
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
                    <div className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/40 p-4 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                        {personalTeamView === "personal" ? (
                            // PERSONAL: LINE CHART (Clock In/Out)
                            <div className="w-full">
                                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Monthly Attendance Trends</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <ComposedChart
                                        data={filteredData.slice().reverse().map(d => {
                                            // Convert 08:30 to 8.5 for plotting
                                            const timeToFloat = (t: string | null) => {
                                                if (!t || t === "-") return null;
                                                const [h, m] = t.split(':').map(Number);
                                                return h + m / 60;
                                            };
                                            return {
                                                date: format(new Date(d.date), "d"),
                                                fullDate: format(new Date(d.date), "d MMM"),
                                                clockIn: timeToFloat(d.clockIn),
                                                clockOut: timeToFloat(d.clockOut),
                                                status: d.status
                                            };
                                        })}
                                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            domain={[6, 22]}
                                            tick={{ fontSize: 10 }}
                                            ticks={[6, 8, 10, 12, 14, 16, 18, 20, 22]}
                                            tickFormatter={(value) => `${value}`}
                                            width={25}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;
                                                const formatTime = (value: number) => {
                                                    const h = Math.floor(value);
                                                    const m = Math.round((value - h) * 60);
                                                    return `${h}:${m.toString().padStart(2, '0')}`;
                                                };
                                                const dataPoint = payload[0]?.payload;
                                                return (
                                                    <div style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>{dataPoint?.fullDate || label}</p>
                                                        {payload.map((item: any, idx: number) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                                                                <span style={{ color: '#6b7280' }}>{item.name}:</span>
                                                                <span style={{ fontWeight: 500, color: '#111827' }}>{formatTime(item.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }}
                                        />


                                        {/* Reference Areas for Shift Zones */}
                                        <ReferenceArea y1={0} y2={9} fill="#10b981" fillOpacity={0.1} label={{ position: 'insideTopLeft', value: 'On Time', fill: '#059669', fontSize: 10 }} />
                                        <ReferenceArea y1={9} y2={9.25} fill="#f59e0b" fillOpacity={0.1} label={{ position: 'insideLeft', value: 'In Time', fill: '#d97706', fontSize: 10 }} />
                                        <ReferenceArea y1={9.25} y2={24} fill="#f43f5e" fillOpacity={0.05} label={{ position: 'insideTopLeft', value: 'Late', fill: '#e11d48', fontSize: 10 }} />

                                        <Line type="monotone" dataKey="clockIn" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Clock In" connectNulls />
                                        <Line type="monotone" dataKey="clockOut" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Clock Out" connectNulls />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (() => {
                            // PRE-CALCULATE TEAM PERFORMANCE DATA FOR SYNCED AXES
                            const teamPerformanceData = teamMembers
                                .filter(m => m.account_type === 'human_account' && m.include_in_performance !== false)
                                .map(member => {
                                    const employeeRecords = filteredData.filter(d => d.userId === member.id || d.employee === member.username);
                                    const rawNickname = member.nickname || member.username.split(' ')[0] || "User";
                                    const nickname = rawNickname.charAt(0).toUpperCase() + rawNickname.slice(1).toLowerCase();
                                    const config = {
                                        late_penalty_per: rule?.scoring_params?.attendance?.late_penalty || 2,
                                        late_penalty_cap: rule?.scoring_params?.attendance?.max_late_penalty || 20,
                                        ot_bonus_cap: rule?.overtime_max_bonus || 10,
                                        ot_target_value: rule?.ot_target_hours || 40
                                    };
                                    const adidayaResult = calculateAdidayaScore(employeeRecords as any, config, currentMonth);
                                    return {
                                        name: nickname,
                                        fullName: member.username,
                                        ontime: adidayaResult.days_present - adidayaResult.late_arrivals,
                                        late: adidayaResult.late_arrivals,
                                        leave: Math.max(0, adidayaResult.total_days - adidayaResult.days_present),
                                        overtime: adidayaResult.overtime_hours,
                                        score: adidayaResult.attendance_score
                                    };
                                })
                                .sort((a, b) => b.score - a.score);

                            return (
                                // TEAM: BAR CHART (Attendance Scores)
                                <div className="w-full h-[600px] flex flex-col">
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-6 px-2">Team Attendance Performance</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={teamPerformanceData}
                                            margin={{ top: 5, right: 5, left: 15, bottom: 20 }}
                                            barSize={24}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={90}
                                                tick={{ fontSize: 11, fontWeight: 500, fill: '#737373' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                dataKey="name"
                                                type="category"
                                                orientation="right"
                                                width={35}
                                                tick={(props: any) => {
                                                    const { x, y, payload } = props;
                                                    const item = teamPerformanceData.find(s => s.name === payload.value);
                                                    if (!item) return null;
                                                    const score = item.score;
                                                    const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 25 ? '#f59e0b' : '#f43f5e';
                                                    return (
                                                        <text
                                                            x={x - 2}
                                                            y={y}
                                                            fill={color}
                                                            textAnchor="end"
                                                            dominantBaseline="middle"
                                                            style={{ fontSize: '13px', fontWeight: 900 }}
                                                        >
                                                            {score}%
                                                        </text>
                                                    );
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 12 }}
                                                content={({ active, payload, label }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                                                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginBottom: '8px' }}>{data.fullName}</p>
                                                            <div className="space-y-1.5">
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#72caaf' }} />
                                                                    <span style={{ color: '#525252', flex: 1 }}>On Time:</span>
                                                                    <span style={{ fontWeight: 600, color: '#059669' }}>{data.ontime} days</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e85d75' }} />
                                                                    <span style={{ color: '#525252', flex: 1 }}>Late:</span>
                                                                    <span style={{ fontWeight: 600, color: '#e11d48' }}>{data.late} days</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f1f5f9' }} />
                                                                    <span style={{ color: '#525252', flex: 1 }}>Leave:</span>
                                                                    <span style={{ fontWeight: 600, color: '#737373' }}>{data.leave} days</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                                                    <span style={{ color: '#525252', flex: 1 }}>Overtime:</span>
                                                                    <span style={{ fontWeight: 600, color: '#10b981' }}>{data.overtime.toFixed(1)}h</span>
                                                                </div>
                                                                <div className="pt-2 mt-2 border-t border-neutral-200/50 flex items-center justify-between">
                                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#525252' }}>Performance:</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: 800, color: data.score >= 75 ? '#059669' : data.score >= 50 ? '#2563eb' : data.score >= 25 ? '#d97706' : '#dc2626' }}>{data.score}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />

                                            <Bar
                                                dataKey="ontime"
                                                stackId="a"
                                                fill="#72caaf"
                                                name="On Time"
                                                radius={[12, 0, 0, 12]}
                                                activeBar={{ fill: '#10b981', stroke: '#059669', strokeWidth: 1.5 }}
                                            />
                                            <Bar
                                                dataKey="late"
                                                stackId="a"
                                                fill="#e85d75"
                                                name="Late"
                                                activeBar={{ fill: '#f43f5e', stroke: '#e11d48', strokeWidth: 1.5 }}
                                            />
                                            <Bar
                                                dataKey="leave"
                                                stackId="a"
                                                fill="#f8fafc"
                                                name="Leave"
                                                radius={[0, 12, 12, 0]}
                                                activeBar={{ fill: '#ffffff', stroke: '#f1f5f9', strokeWidth: 1.5 }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })()}
                    </div>
                )}

            {/* SUMMARY FOOTER */}
            <div className="flex items-center justify-between text-sm text-neutral-500 px-2 mt-4">
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
        </div>
    );
}
