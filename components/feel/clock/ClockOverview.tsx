"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInMinutes, isSaturday, isSunday, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay } from "date-fns";
import { calculateStats, formatMinutes, calculateMonthlySummaryMetrics } from "@/lib/clock-data-logic";
import clsx from "clsx";
import { Play, Square, Clock, AlertCircle, CheckCircle2, Calendar, Users, User, Sun, Moon, Sunrise, Sunset, Briefcase, CheckCircle, List, Grid as GridIcon, XCircle, LogOut, CloudSun, CalendarDays, Key, Plane, ClipboardList, AlertTriangle, UserCheck, UserX, ArrowUpRight, ArrowDownRight, MapPin, Loader2, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/primitives/button/button";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { isOvertime as isOvertimeCheck, getShiftSchedule, getWorkHoursConfig, getStandardEndTime, formatTargetTime } from "@/lib/work-hours-utils";
import { LiquidSummaryCard } from "@/components/shared/liquid/LiquidSummaryCard";
import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";
import { fetchLeavePolicies } from "@/lib/api/employment";
import { LeavePolicy } from "@/lib/types/organization";
import { createClient } from "@/utils/supabase/client";

interface ClockOverviewProps {
    full_name?: string;
    nickname?: string;
    role?: UserRole;
    isCheckedIn?: boolean;
    startTime?: Date | null;
    elapsed?: number;
    onClockAction?: () => void;
    joinDate?: string;
    viewMode?: "personal" | "team";
    locationCode?: string | null;
    remoteMode?: string | null;
}

export function ClockOverview({
    full_name,
    nickname,
    role,
    isCheckedIn = false,
    startTime = null,
    locationCode,
    remoteMode,
    elapsed = 0,
    onClockAction,
    joinDate,
    viewMode = "personal"
}: ClockOverviewProps) {
    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const [currentTime, setCurrentTime] = useState(new Date());

    const { attendance, leaves, overtime, loading, teamMembers } = useClockData(profile?.id, viewMode === "team");
    
    // --- Leave Policy Data ---
    const [leavePolicy, setLeavePolicy] = useState<LeavePolicy | null>(null);
    const [loadingPolicy, setLoadingPolicy] = useState(false);

    useEffect(() => {
        if (profile?.leave_policy_id) {
            setLoadingPolicy(true);
            fetchLeavePolicies().then(policies => {
                const myPolicy = policies.find(p => p.id === profile.leave_policy_id);
                if (myPolicy) setLeavePolicy(myPolicy);
                setLoadingPolicy(false);
            }).catch(() => setLoadingPolicy(false));
        }
    }, [profile?.leave_policy_id]);

    const [yearlyUsedAnnualLeave, setYearlyUsedAnnualLeave] = useState(0);

    useEffect(() => {
        if (!profile?.id) return;
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;

        const fetchYearlyLeaves = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('leave_requests')
                .select('start_date, end_date, type')
                .eq('user_id', profile.id)
                .eq('status', 'approved')
                .gte('end_date', startOfYear)
                .lte('start_date', endOfYear);

            if (data) {
                const annual = data.filter((l: any) => !l.type || l.type.toLowerCase().includes('annual') || l.type.toLowerCase().includes('cuti tahunan'));
                const used = annual.reduce((sum: number, r: any) => {
                    const start = new Date(r.start_date);
                    const end = new Date(r.end_date);
                    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return sum + diffDays;
                }, 0);
                setYearlyUsedAnnualLeave(used);
            }
        };
        fetchYearlyLeaves();
    }, [profile?.id]);

    // Time Phase Logic (Synchronized with Dashboard)
    const getPhase = (date: Date) => {
        const hours = date.getHours();
        if (isCheckedIn && hours >= 18) return "overtime";
        if (hours >= 5 && hours < 11) return "morning";
        if (hours >= 11 && hours < 15) return "afternoon";
        if (hours >= 15 && hours < 18) return "late-afternoon";
        return "night";
    };

    const phases = {
        morning: {
            greeting: "Good Morning",
            message: "Wishing you a productive and smooth day ahead.",
            color: "text-amber-600",
            bg: "bg-gradient-to-br from-amber-50/80 to-white/60",
            border: "border-amber-100/50",
            icon: Sunrise
        },
        afternoon: {
            greeting: "Good Afternoon",
            message: "How’s today going so far? A quick update helps keep things moving.",
            color: "text-blue-600",
            bg: "bg-gradient-to-br from-blue-50/80 to-white/60",
            border: "border-blue-100/50",
            icon: Sun
        },
        "late-afternoon": {
            greeting: "Good Afternoon",
            message: "As the day winds down, focus on what truly matters.",
            color: "text-orange-600",
            bg: "bg-gradient-to-br from-orange-50/80 to-white/60",
            border: "border-orange-100/50",
            icon: Sunset
        },
        overtime: {
            greeting: "Working Late",
            message: "You’re still working. Remember to take care of yourself.",
            color: "text-rose-600",
            bg: "bg-gradient-to-br from-rose-50/50 to-white/40",
            border: "border-rose-100/30",
            icon: Clock
        },
        night: {
            greeting: "Good Night",
            message: "It’s been a long day. Time to recharge for tomorrow.",
            color: "text-indigo-900",
            bg: "bg-gradient-to-br from-indigo-50/80 to-white/60",
            border: "border-indigo-100/50",
            icon: Moon
        },
    };

    const currentPhaseKey = getPhase(currentTime);
    const phase = phases[currentPhaseKey];
    const PhaseIcon = phase.icon;

    // UPDATE CURRENT TIME
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate Working Days Elapsed (Mon-Sat) for Late Percentage
    const calculateLatePercentage = () => {
        if (!attendance || attendance.length === 0) return { percent: 0, color: "text-neutral-700", bg: "bg-emerald-50", lateCount: 0, workingDaysElapsed: 0 };

        const now = new Date();
        const start = startOfMonth(now);
        // Elapsed days up to yesterday (or today)
        // Actually, we should count days that HAVE passed or are today
        // Filter attendance records in current month
        const currentMonthRecords = attendance.filter(r => new Date(r.date) >= start && new Date(r.date) <= now);

        // Count working days elapsed in the month (Mon-Sat)
        // We can approximate by checking the dates in attendance?
        // Or generate days from start of month to today.
        const daysElapsed = eachDayOfInterval({ start: start, end: now });
        const workingDaysElapsed = daysElapsed.filter(d => !isSunday(d)).length;

        if (workingDaysElapsed === 0) return { percent: 0, color: "text-emerald-700", bg: "bg-emerald-50", lateCount: 0, workingDaysElapsed: 0 };

        const lateCount = currentMonthRecords.filter(r => r.status === 'late').length;
        const percent = (lateCount / workingDaysElapsed) * 100;

        let color = "text-emerald-700";
        let bg = "bg-emerald-50";

        if (percent > 50) {
            color = "text-red-700";
            bg = "bg-red-50";
        } else if (percent > 25) {
            color = "text-orange-700";
            bg = "bg-orange-50";
        }

        return { percent, color, bg, lateCount, workingDaysElapsed };
    }

    const lateStats = calculateLatePercentage();

    const excludedRoles = ['admin', 'finance', 'superadmin'];
    const excludedUsers = ['harryadin', 'adidaya staff', 'adidaya it']; // username or part of name
    const excludedDepts = ['IT', 'Finance']; // Helper in case role is missing but dept is set

    // Combine team members with today's attendance
    const combinedTeam = useMemo(() => {
        if (!teamMembers || teamMembers.length === 0) return [];

        const todayStr = new Date().toISOString().split('T')[0];

        return teamMembers.map(member => {
            // Find attendance for today
            const record = attendance.find(r => r.userId === member.id && r.date === todayStr);

            // Find active leave
            const activeLeave = leaves.find(l => {
                const now = new Date();
                return l.userId === member.id && l.status === 'approved' && now >= new Date(l.startDate) && now <= new Date(l.endDate);
            });

            const status = activeLeave ? 'on-leave' : (record ? record.status : 'not-in');

            return {
                ...member,
                clockIn: record?.clockIn,
                clockOut: record?.clockOut,
                status: status,
                attendanceRecord: record
            };
        }).filter(m => {
            // Exclude by Role
            if (m.role && excludedRoles.includes(m.role)) return false;

            // Exclude by Name
            if (m.username && excludedUsers.some(u => m.username?.toLowerCase().includes(u.toLowerCase()))) return false;

            // Exclude by Department
            if (m.department && excludedDepts.includes(m.department)) return false;

            return true;
        }).sort((a, b) => (a.username || "").localeCompare(b.username || ""));
    }, [teamMembers, attendance, leaves]);

    const [exporting, setExporting] = useState(false);
    const handleExport = async () => {
        if (combinedTeam.length === 0) return;
        setExporting(true);

        try {
            const documentName = "Today's Presence";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const summaryCards = [
                { label: "Total Team", value: combinedTeam.length, format: "number" as const },
                { label: "Checked In", value: teamCheckedIn, format: "number" as const, color: "green" as const },
                { label: "Late Today", value: teamLate, format: "number" as const, color: "orange" as const },
                { label: "On Leave", value: teamOnLeave, format: "number" as const, color: "blue" as const },
            ];

            const columns = [
                { id: "employee", label: "Employee", align: "left" as const },
                { id: "clockIn", label: "Clock In", align: "center" as const },
                { id: "clockOut", label: "Clock Out", align: "center" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = combinedTeam.map(member => {
                const clockInTime = member.clockIn ? new Date(member.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
                const clockOutTime = member.clockOut ? new Date(member.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
                
                let displayStatus = member.status;
                if (member.status === "on-leave") displayStatus = "On Leave";
                else if (member.status === "not-in") displayStatus = "Not In";

                return {
                    employee: member.username,
                    clockIn: clockInTime,
                    clockOut: clockOutTime,
                    status: displayStatus
                };
            });

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "CLOCK",
                        projectName: "Adidaya Studio (PT Mahardika Adidaya) - Clock",
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
            a.download = `Todays_Presence_${format(new Date(), "yyyy_MM_dd")}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
        } finally {
            setExporting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatHour = (date: Date) => {
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    };

    const getStatus = () => {
        if (!startTime) return null;

        const config = getWorkHoursConfig(startTime);
        const startHour = config.startHour; // Dynamic: 8 or 9

        const limitOnTime = new Date(startTime);
        limitOnTime.setHours(startHour, 1, 0, 0);

        const limitInTime = new Date(startTime);
        limitInTime.setHours(startHour, 16, 0, 0); // 15 min tolerance

        const diffMsLate = startTime.getTime() - limitInTime.getTime();
        const isLate = startTime >= limitInTime;

        const diffMsInTime = startTime.getTime() - limitOnTime.getTime();
        const isInTime = startTime >= limitOnTime && startTime < limitInTime;

        const lateMinutes = isLate ? Math.floor(diffMsLate / 60000) : 0;

        const now = new Date();
        const isOvertime = isOvertimeCheck(now, startTime) && isCheckedIn;

        return { isLate, isInTime, lateMinutes, isOvertime, config };
    };

    const status = getStatus();
    const today = new Date();
    
    // Team Stats logic
    const teamCheckedIn = attendance.filter(t => t.date === new Date().toISOString().split('T')[0] && t.clockIn && t.clockIn !== "-" && !t.clockOut || t.clockOut === "-").length;
    const teamLate = attendance.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === "late").length;
    const teamOnLeave = leaves.filter(l => {
        const now = new Date();
        const dateStr = format(now, "yyyy-MM-dd");
        return l.status === "approved" && dateStr >= l.startDate && dateStr <= l.endDate;
    }).length;

    // Personal Stats logic enhanced with Monthly Summary Metrics
    const personalStats = useMemo(() => {
        const thisMonth = new Date().getMonth();
        const monthlyRecords = attendance.filter(r => new Date(r.date).getMonth() === thisMonth);
        
        const summary = calculateMonthlySummaryMetrics(monthlyRecords as any, new Date());
        
        const lateCount = monthlyRecords.filter(r => r.status === "late").length;
        const approvedLeaves = leaves.filter(l => l.status === "approved" && new Date(l.startDate).getMonth() === thisMonth).length;
        
        const quota = leavePolicy?.annual_leave_quota || 0;
        const balance = Math.max(0, quota - yearlyUsedAnnualLeave);

        return {
            workingHours: summary.actualAccumulatedHours.toFixed(1),
            requiredHours: summary.totalRequiredHours.toFixed(1),
            percentage: summary.completionPercentage.toFixed(0),
            pacePercentage: summary.currentPacePercentage.toFixed(0),
            difference: summary.difference.toFixed(1),
            summaryStatus: summary.status,
            lateCount,
            approvedLeaves,
            annualLeaveBalance: balance,
            annualLeaveQuota: quota
        };
    }, [attendance, leaves, leavePolicy, joinDate, yearlyUsedAnnualLeave]);

    return (
        <div className="space-y-8 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            {/* HEADER REMOVED - Using Global PageHeader */}

            {/* PERSONAL VIEW */}
            {viewMode === "personal" && (
                <>
                    {/* DYNAMIC WELCOME BANNER (Soft Minimalist Glass) */}
                    <div className={clsx(
                        "rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all duration-700 mb-6 md:mb-10 backdrop-blur-xl shadow-sm border",
                        phase.bg,
                        phase.border
                    )}>
                        <div className="flex items-center gap-4 md:gap-5">
                            <div className={clsx("w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center bg-white shadow-sm border border-neutral-100/50", phase.color)}>
                                <PhaseIcon className="w-6 h-6 md:w-8 md:h-8 opacity-90" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className={clsx("text-lg sm:text-xl font-bold tracking-tight transition-colors duration-500", phase.color)}>
                                    {phase.greeting}, <span className="hidden sm:inline">{profile?.full_name || full_name}</span>
                                    <span className="sm:hidden">{profile?.nickname || nickname || full_name?.split(' ')[0]}</span>
                                </h2>
                                <div className="flex items-center gap-2 text-neutral-500 font-medium text-xs md:text-sm">
                                    {phase.message}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8 border-neutral-900/5 transition-all">
                            <div className={clsx("text-2xl md:text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500", phase.color)}>
                                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-[10px] md:text-xs font-semibold text-neutral-400 uppercase tracking-widest md:mt-1">
                                {currentTime.toLocaleDateString("en-US", { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                        </div>
                    </div>

                    {/* MOBILE CONDENSED STATUS (Only visible on mobile) */}
                    <div className="lg:hidden mb-6 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", isCheckedIn ? "bg-green-50 text-green-600" : "bg-neutral-50 text-neutral-400")}>
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider leading-none mb-1">Status</div>
                                    <div className="text-sm font-bold text-neutral-900">{isCheckedIn ? "Currently Working" : "Not Clocked In"}</div>
                                </div>
                            </div>
                            {isCheckedIn && (
                                <div className="text-right">
                                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider leading-none mb-1">Elapsed</div>
                                    <div className="text-lg font-bold text-green-600 tabular-nums leading-none">{formatTime(elapsed)}</div>
                                </div>
                            )}
                        </div>
                        {isCheckedIn && startTime && (
                            <div className="pt-3 border-t border-neutral-50 flex items-center justify-between text-[11px] font-medium text-neutral-400">
                                <div className="flex flex-col gap-0.5">
                                    <span>Started at {formatHour(startTime)}</span>
                                    <span className="text-neutral-500 font-normal">Target: <span className="font-semibold text-neutral-900">{formatTargetTime(startTime)}</span></span>
                                </div>
                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live Tracking</span>
                            </div>
                        )}
                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CLOCK ACTION CARD - HIDDEN ON MOBILE */}
                        <div className="hidden lg:flex bg-white rounded-[2.5rem] border border-neutral-200/60 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex-col items-center justify-center text-center space-y-8 min-h-[420px] relative overflow-hidden group transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.08)] hover:border-neutral-300/80">
                            {/* Premium Glass Orbs */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl group-hover:bg-blue-400/10 transition-colors duration-1000" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl group-hover:bg-emerald-400/10 transition-colors duration-1000" />

                            <div className="relative">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className={clsx(
                                        "w-44 h-44 rounded-[3.5rem] flex items-center justify-center transition-all duration-700 relative z-10",
                                        isCheckedIn
                                            ? "bg-gradient-to-br from-emerald-50/80 to-teal-50/50 text-emerald-600 ring-1 ring-emerald-200/50 shadow-[0_15px_40px_rgba(16,185,129,0.12)]"
                                            : "bg-gradient-to-br from-neutral-50 to-neutral-100/50 text-neutral-400 ring-1 ring-neutral-200 shadow-sm"
                                    )}
                                >
                                    <Clock className={clsx("w-20 h-20 transition-all duration-700", isCheckedIn ? "scale-110" : "scale-100")} strokeWidth={1.5} />

                                    {isCheckedIn && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.4)] border-2 border-white z-20 flex items-center gap-1.5"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            ON DUTY
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <div className="flex flex-col items-center">
                                    <div className={clsx(
                                        "text-6xl font-black tracking-tighter tabular-nums leading-none transition-all duration-700 font-mono",
                                        isCheckedIn ? "text-neutral-900" : "text-neutral-300"
                                    )}>
                                        {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] leading-none mb-0.5">
                                            {isCheckedIn ? "Total Session Duration" : "Session not started"}
                                        </div>
                                        {isCheckedIn && (locationCode || remoteMode) && (
                                            <>
                                                <div className="w-[1px] h-3 bg-neutral-200" />
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 shadow-sm">
                                                    <MapPin className="w-3 h-3 text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-600 uppercase">
                                                        {locationCode ||
                                                            (remoteMode === "business_trip" ? "BST" :
                                                                remoteMode === "other" ? "OTH" :
                                                                    remoteMode)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 w-full px-6 py-6 rounded-3xl bg-neutral-50/50 border border-neutral-100/50 relative z-10">
                                <div className="flex-1 flex flex-col items-center gap-1.5 group/stat">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover/stat:text-blue-500 transition-colors">
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>Started</span>
                                    </div>
                                    <span className="text-lg font-black text-neutral-800 tabular-nums">
                                        {startTime ? formatHour(startTime) : "--:--"}
                                    </span>
                                </div>
                                <div className="w-[1px] h-10 bg-neutral-200/60" />
                                <div className="flex-1 flex flex-col items-center gap-1.5 group/stat">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover/stat:text-rose-500 transition-colors">
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                        <span>Target</span>
                                    </div>
                                    <span className="text-lg font-black text-neutral-800 tabular-nums">
                                        {startTime ? formatTargetTime(startTime) : "--:--"}
                                    </span>
                                </div>
                            </div>

                            <div className="relative z-10 w-full pt-2">
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={onClockAction}
                                    className={clsx(
                                        "w-full h-16 rounded-[2rem] text-lg font-black flex items-center justify-center gap-3 transition-all duration-500 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)]",
                                        isCheckedIn
                                            ? "bg-gradient-to-b from-rose-500 to-rose-600 text-white hover:shadow-rose-500/25 ring-4 ring-rose-50"
                                            : "bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:shadow-blue-500/25 ring-4 ring-blue-50"
                                    )}
                                >
                                    {isCheckedIn ? <Square className="w-5 h-5 fill-current" strokeWidth={0} /> : <Play className="w-5 h-5 fill-current" strokeWidth={0} />}
                                    {isCheckedIn ? "Clock Out" : "Clock In Now"}
                                </motion.button>
                            </div>
                        </div>

                        {/* TODAY'S OVERVIEW */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 shadow-sm flex flex-col justify-center h-full lg:min-h-[400px]">
                            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-6">Today's Overview</h3>
                            <div className="space-y-6 md:space-y-8">
                                <OverviewRow icon={<Calendar className="w-5 h-5" />} iconBg="bg-blue-50 text-blue-600" title="Shift Schedule" subtitle={getWorkHoursConfig(new Date()).dayName} value={getShiftSchedule()} />
                                <div className="border-b border-neutral-100/80" />
                                <OverviewRow
                                    icon={<AlertCircle className="w-5 h-5" />}
                                    iconBg={status?.isLate ? "bg-red-50 text-red-600" : status?.isInTime ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}
                                    title="Arrival Status"
                                    subtitle={`Based on ${status?.config?.startHour?.toString().padStart(2, '0')}:00 entry`}
                                    value={startTime ? (status?.isLate ? "Late Arrival" : status?.isInTime ? "In Time" : "On Time") : "--"}
                                    valueClass={startTime ? (status?.isLate ? "bg-red-50 text-red-700" : status?.isInTime ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700") : ""}
                                    extra={status?.isLate ? `${status.lateMinutes} mins late` : undefined}
                                />
                                <div className="border-b border-neutral-100/80" />
                                <OverviewRow icon={<Clock className="w-5 h-5" />} iconBg="bg-teal-50 text-teal-600" title="Hours Worked" subtitle="Today's total duration" value={isCheckedIn ? formatTime(elapsed) : "--"} />
                                <div className="border-b border-neutral-100/80" />
                                <OverviewRow icon={<CheckCircle2 className="w-5 h-5" />} iconBg="bg-purple-50 text-purple-600" title="Overtime" subtitle={`Work past ${getStandardEndTime(new Date())}`} value={status?.isOvertime ? "Active" : "None"} valueClass={status?.isOvertime ? "text-green-600" : ""} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-neutral-900">Monthly Summary <span className="text-neutral-400 font-normal text-sm ml-2">({format(new Date(), "MMMM yyyy")})</span></h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <LiquidSummaryCard
                                icon={<Clock className="w-5 h-5 text-blue-600" />}
                                iconBg="bg-blue-50"
                                label="Working Hours"
                                value={`${personalStats.workingHours} / ${personalStats.requiredHours}`}
                                subtext={
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-neutral-400 uppercase tracking-tighter">Progress</span>
                                            <span className={`${parseFloat(personalStats.pacePercentage) >= 100 ? 'text-emerald-500' : 'text-neutral-500'}`}>{personalStats.percentage}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                                            <div 
                                                className={clsx(
                                                    "h-full transition-all duration-1000",
                                                    personalStats.summaryStatus === "ahead" ? "bg-emerald-500" : 
                                                    personalStats.summaryStatus === "behind" ? "bg-amber-500" : "bg-blue-500"
                                                )} 
                                                style={{ width: `${Math.min(100, parseFloat(personalStats.percentage))}%` }} 
                                            />
                                        </div>
                                        <div className="text-[10px] font-medium text-neutral-400 italic">
                                            {personalStats.summaryStatus === "ahead" ? `+${personalStats.difference} hrs ahead` : 
                                             personalStats.summaryStatus === "behind" ? `${personalStats.difference} hrs behind` : 
                                             "On track with schedule"}
                                        </div>
                                    </div>
                                }
                            />
                            <LiquidSummaryCard
                                icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="Late Arrivals"
                                value={`${personalStats.lateCount}`}
                                subtext="Total this month"
                                className={personalStats.lateCount > 0 ? "ring-2 ring-red-500 border-red-200 bg-red-50/10" : ""}
                            />
                            <LiquidSummaryCard
                                icon={<CalendarDays className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="Leave History"
                                value={`${personalStats.approvedLeaves}`}
                                subtext="Approved this month"
                            />
                            <LiquidSummaryCard
                                icon={loadingPolicy ? <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" /> : <Plane className="w-5 h-5 text-emerald-600" />}
                                iconBg="bg-emerald-50"
                                label="Annual Leave"
                                value={personalStats.annualLeaveQuota > 0 ? `${personalStats.annualLeaveBalance} / ${personalStats.annualLeaveQuota}` : "0"}
                                subtext="Days left"
                                className={personalStats.annualLeaveBalance <= 2 ? "ring-2 ring-orange-500 border-orange-200 bg-orange-50/5" : ""}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* TEAM VIEW */}
            {viewMode === "team" && (
                <>
                    {/* TEAM STATS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                        <LiquidSummaryCard
                            icon={<UserCheck className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Checked In"
                            value={teamCheckedIn}
                            subtext="Currently working"
                        />
                        <LiquidSummaryCard
                            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                            iconBg="bg-orange-50"
                            label="Late Today"
                            value={teamLate}
                            subtext="Arrived after 09:00"
                            className={teamLate > 0 ? "ring-2 ring-orange-500 border-orange-200 bg-orange-50/10" : ""}
                        />
                        <LiquidSummaryCard
                            icon={<UserX className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="On Leave"
                            value={teamOnLeave}
                            subtext="Approved leave"
                        />
                        <LiquidSummaryCard
                            icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
                            iconBg="bg-amber-50"
                            label="Pending"
                            value={leaves.filter(l => l.status === "pending").length}
                            subtext="Awaiting review"
                        />
                    </div>

                    {/* TEAM LIST */}
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="font-semibold text-neutral-900">Today's Activity</h4>
                            <Button variant="secondary" onClick={handleExport} disabled={exporting} className="!rounded-full !py-1.5 !px-3" icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}>
                                {exporting ? "Exporting..." : "Export"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10 pb-10">
                            {combinedTeam.map((member, idx) => {
                                const statusText = getStatusText(member);
                                const isNotChecked = statusText.includes("Not yet");

                                return (
                                    <LiquidItemCard
                                        key={member.id || idx}
                                        leftAvatar={
                                            member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.username} className="w-10 h-10 rounded-full object-cover border border-neutral-200/50" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-medium text-sm border border-neutral-200/50">
                                                    {member.username?.split(' ').map((n: string) => n[0]).join('') || "U"}
                                                </div>
                                            )
                                        }
                                        title={member.username}
                                        subtitle={<span className={clsx(isNotChecked ? "text-orange-500 font-medium" : "text-neutral-500")}>{statusText}</span>}
                                        rightTop={<StatusBadge status={member.status} />}
                                    />
                                )
                            })}
                            {combinedTeam.length === 0 && (
                                <div className="col-span-1 md:col-span-2 py-12 text-center text-neutral-500 bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No attendance logs for today yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper for Status Text
function getStatusText(member: any) {
    // Assuming member object has clockIn and clockOut properties as Date objects or ISO strings
    const clockInTime = member.clockIn ? new Date(member.clockIn) : null;
    const clockOutTime = member.clockOut ? new Date(member.clockOut) : null;

    if (member.status === 'on-leave' || member.status === 'leave') return "On leave";

    if (clockInTime && clockOutTime) {
        return `Checked in at ${clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Checked out at ${clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (clockInTime && !clockOutTime) {
        return `Checked in at ${clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Not yet checked out`;
    }

    return "Not yet checked in";
}

function OverviewRow({ icon, iconBg, title, subtitle, value, valueClass, extra }: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; value: React.ReactNode; valueClass?: string; extra?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between group">
            <div className="flex gap-4">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform", iconBg)}>{icon}</div>
                <div>
                    <div className="text-base font-semibold text-neutral-900">{title}</div>
                    <div className="text-sm text-neutral-500">{subtitle}</div>
                </div>
            </div>
            <div className={clsx("text-sm font-bold px-3 py-1.5 rounded-lg flex flex-col items-end", valueClass || "bg-neutral-50 text-neutral-900")}>
                <span>{value}</span>
                {extra && <span className="text-[10px] font-normal opacity-80">{extra}</span>}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "checked-in": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">Checked In</span>;
        case "ontime": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">On Time</span>;
        case "intime": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">In Time</span>;
        case "late": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">Late</span>;
        case "on-leave": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">On Leave</span>;
        case "not-in": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">Not In</span>;
        default: return null;
    }
}


