"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInMinutes, isSaturday, isSunday, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay } from "date-fns";
import { formatMinutes } from "@/lib/clock-data-logic";
import clsx from "clsx";
import { Play, Square, Clock, AlertCircle, CheckCircle2, Calendar, Users, User, Sun, Moon, Sunrise, Sunset, Briefcase, CheckCircle, List, Grid as GridIcon, XCircle, LogOut, CloudSun, CalendarDays, Key, Plane, ClipboardList, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import { useClockData } from "@/hooks/useClockData";
import useUserProfile from "@/hooks/useUserProfile";
import { ViewToggle } from "./ViewToggle";
import { isOvertime as isOvertimeCheck, getShiftSchedule, getWorkHoursConfig, getStandardEndTime } from "@/lib/work-hours-utils";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";

interface ClockOverviewProps {
    userName: string;
    role?: UserRole;
    isCheckedIn?: boolean;
    startTime?: Date | null;
    elapsed?: number;
    onClockAction?: () => void;
    joinDate?: string;
}

// Mock Team Data removed in favor of real database records

export function ClockOverview({ userName, role, isCheckedIn = false, startTime = null, elapsed = 0, onClockAction, joinDate }: ClockOverviewProps) {
    const { profile } = useUserProfile();
    const isManager = canViewTeamData(role || profile?.role);
    const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
    const [currentTime, setCurrentTime] = useState(new Date());

    const { attendance, leaves, overtime, loading, teamMembers } = useClockData(profile?.id, viewMode === "team");

    // Time Phase Logic
    const getPhase = (date: Date) => {
        const hours = date.getHours();
        if (hours >= 5 && hours < 11) return "morning";
        if (hours >= 11 && hours < 15) return "afternoon";
        if (hours >= 15 && hours < 18) return "late-afternoon";
        if (hours >= 18 && hours < 21) return "evening";
        return "night"; // 21 - 5
    };

    const phases = {
        morning: { greeting: "Good Morning", color: "text-amber-600", bg: "bg-gradient-to-br from-amber-50/80 to-white/60", border: "border-amber-100/50", icon: Sunrise },
        afternoon: { greeting: "Good Afternoon", color: "text-blue-600", bg: "bg-gradient-to-br from-blue-50/80 to-white/60", border: "border-blue-100/50", icon: Sun },
        "late-afternoon": { greeting: "Good Afternoon", color: "text-orange-600", bg: "bg-gradient-to-br from-orange-50/80 to-white/60", border: "border-orange-100/50", icon: Sunset },
        evening: { greeting: "Good Evening", color: "text-purple-600", bg: "bg-gradient-to-br from-purple-50/80 to-white/60", border: "border-purple-100/50", icon: CloudSun },
        night: { greeting: "Good Night", color: "text-indigo-900", bg: "bg-gradient-to-br from-indigo-50/80 to-white/60", border: "border-indigo-100/50", icon: Moon },
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

        const limitOnTime = new Date(startTime);
        limitOnTime.setHours(9, 1, 0, 0);

        const limitInTime = new Date(startTime);
        limitInTime.setHours(9, 16, 0, 0);

        const diffMsLate = startTime.getTime() - limitInTime.getTime();
        const isLate = startTime >= limitInTime;

        const diffMsInTime = startTime.getTime() - limitOnTime.getTime();
        const isInTime = startTime >= limitOnTime && startTime < limitInTime;

        const lateMinutes = isLate ? Math.floor(diffMsLate / 60000) : 0;

        const now = new Date();
        // Use dynamic overtime detection: Mon-Fri after 17:00 or startTime+8h, Sat after 14:00 or startTime+5h
        const isOvertime = isOvertimeCheck(now, startTime) && isCheckedIn;

        return { isLate, isInTime, lateMinutes, isOvertime };
    };

    const status = getStatus();
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const joinDateObj = joinDate ? new Date(joinDate) : new Date();
    const hasAnnualLeave = joinDateObj <= oneYearAgo;

    // Team Stats logic
    const teamCheckedIn = attendance.filter(t => t.date === new Date().toISOString().split('T')[0] && t.clockIn && !t.clockOut).length;
    const teamLate = attendance.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === "late").length;
    const teamOnLeave = leaves.filter(l => {
        const now = new Date();
        return l.status === "approved" && now >= new Date(l.startDate) && now <= new Date(l.endDate);
    }).length;

    // Personal Stats logic
    const personalStats = useMemo(() => {
        const thisMonth = new Date().getMonth();
        const monthlyRecords = attendance.filter(r => new Date(r.date).getMonth() === thisMonth);
        const totalWorkMinutes = monthlyRecords.reduce((acc, r) => acc + r.totalMinutes, 0);
        const lateCount = monthlyRecords.filter(r => r.status === "late").length;
        const approvedLeaves = leaves.filter(l => l.status === "approved").length;

        return {
            workingHours: (totalWorkMinutes / 60).toFixed(1), // Display as decimal hours
            lateCount,
            approvedLeaves,
        };
    }, [attendance, leaves]);

    return (
        <div className="space-y-8 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Clock</h1>
                        <p className="text-sm text-neutral-500 mt-1">Time tracking, leaves, and attendance records.</p>
                    </div>

                    {/* VIEW MODE TOGGLE (Manager Only) - Responsive */}
                    {isManager && (
                        <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                            <button
                                onClick={() => setViewMode("personal")}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <User className="w-4 h-4" /> Personal
                            </button>
                            <button
                                onClick={() => setViewMode("team")}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <Users className="w-4 h-4" /> Team
                            </button>
                        </div>
                    )}
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* PERSONAL VIEW */}
            {viewMode === "personal" && (
                <>
                    {/* DYNAMIC WELCOME BANNER (Soft Minimalist Glass) */}
                    <div className={clsx(
                        "rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-700 mb-10 backdrop-blur-xl shadow-sm border",
                        phase.bg,
                        phase.border
                    )}>
                        <div className="flex items-center gap-5">
                            <div className={clsx("w-16 h-16 rounded-xl flex items-center justify-center bg-white shadow-sm border border-neutral-100/50", phase.color)}>
                                <PhaseIcon className="w-8 h-8 opacity-90" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className={clsx("text-xl font-bold tracking-tight transition-colors duration-500", phase.color)}>
                                    {phase.greeting}, {userName}
                                </h2>
                                <div className="flex items-center gap-2 text-neutral-500 font-medium text-sm">
                                    Have a productive day ahead
                                </div>
                            </div>
                        </div>
                        <div className="text-left md:text-right flex flex-col items-start md:items-end border-l pl-8 border-neutral-900/5 md:border-l-0 md:pl-0 md:border-none">
                            <div className={clsx("text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500", phase.color)}>
                                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
                                {currentTime.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CLOCK ACTION CARD */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-10 shadow-sm flex flex-col items-center justify-center text-center space-y-8 min-h-[400px]">
                            <div className="relative">
                                <div className={clsx("w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300", isCheckedIn ? "bg-green-50 text-green-600 ring-8 ring-green-50/50" : "bg-neutral-50 text-neutral-400 ring-8 ring-neutral-50/50")}>
                                    <Clock className="w-16 h-16" />
                                </div>
                                {isCheckedIn && <span className="absolute bottom-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm animate-pulse border-2 border-white">LIVE</span>}
                            </div>
                            <div className="space-y-2">
                                <div className="text-5xl font-bold tracking-tighter text-neutral-900 tabular-nums">{isCheckedIn ? formatTime(elapsed) : "00:00:00"}</div>
                                <div className="text-sm font-medium text-neutral-500">{isCheckedIn ? "Running time" : "Ready to start"}</div>
                            </div>
                            <Button onClick={onClockAction} className={clsx("w-56 h-14 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1", isCheckedIn ? "bg-red-500 hover:bg-red-600 border-red-500 text-white" : "bg-action-primary hover:bg-action-primary-hover border-action-primary text-white")} icon={isCheckedIn ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}>
                                {isCheckedIn ? "Clock Out" : "Clock In"}
                            </Button>
                            {isCheckedIn && startTime && <div className="text-xs text-neutral-400 font-medium">Started at {formatHour(startTime)}</div>}
                        </div>

                        {/* TODAY'S OVERVIEW */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm flex flex-col justify-center h-full min-h-[400px]">
                            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-6">Today's Overview</h3>
                            <div className="space-y-8">
                                <OverviewRow icon={<Calendar className="w-5 h-5" />} iconBg="bg-blue-50 text-blue-600" title="Shift Schedule" subtitle={getWorkHoursConfig(new Date()).dayName} value={getShiftSchedule()} />
                                <div className="border-b border-neutral-100/80" />
                                <OverviewRow
                                    icon={<AlertCircle className="w-5 h-5" />}
                                    iconBg={status?.isLate ? "bg-red-50 text-red-600" : status?.isInTime ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}
                                    title="Arrival Status"
                                    subtitle="Based on 09:00 entry"
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

                    {/* MONTHLY SUMMARY */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-neutral-900">Monthly Summary <span className="text-neutral-400 font-normal text-sm ml-2">(January 2025)</span></h3>
                        <h3 className="text-lg font-bold text-neutral-900">Monthly Summary <span className="text-neutral-400 font-normal text-sm ml-2">(January 2025)</span></h3>
                        <SummaryCardsRow>
                            <SummaryCard
                                icon={<Clock className="w-5 h-5 text-blue-600" />}
                                iconBg="bg-blue-50"
                                label="Working Hours"
                                value={`${personalStats.workingHours} Hours`}
                                subtext="Total this month"
                            />
                            <SummaryCard
                                icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="Late Arrivals"
                                value={`${personalStats.lateCount} Days`}
                                subtext="Month to date"
                                isActive={personalStats.lateCount > 0}
                                activeColor="ring-red-500 border-red-200 bg-red-50/10"
                            />
                            <SummaryCard
                                icon={<CalendarDays className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="Leave History"
                                value={`${personalStats.approvedLeaves} Days`}
                                subtext="Total approved"
                            />
                            <SummaryCard
                                icon={<Plane className="w-5 h-5 text-emerald-600" />}
                                iconBg="bg-emerald-50"
                                label="Annual Leave"
                                value={hasAnnualLeave ? "12 Days" : "0 Days"}
                                subtext={hasAnnualLeave ? "Available balance" : "No balance yet"}
                                isActive={!hasAnnualLeave}
                                activeColor="ring-orange-500 border-orange-200"
                            />
                        </SummaryCardsRow>
                    </div>
                </>
            )}

            {/* TEAM VIEW */}
            {viewMode === "team" && (
                <>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-neutral-900">Team Overview</h2>
                        <p className="text-neutral-500 text-sm">Today's attendance status for your team.</p>
                    </div>

                    {/* TEAM STATS */}
                    <SummaryCardsRow>
                        <SummaryCard
                            icon={<UserCheck className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Checked In"
                            value={`${teamCheckedIn} Active`}
                            subtext="Currently working"
                        />
                        <SummaryCard
                            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                            iconBg="bg-orange-50"
                            label="Late Today"
                            value={`${teamLate} Members`}
                            subtext="Arrived after 09:00"
                            isActive={teamLate > 0}
                            activeColor="ring-orange-500 border-orange-200 bg-orange-50/10"
                        />
                        <SummaryCard
                            icon={<UserX className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="On Leave"
                            value={`${teamOnLeave} Members`}
                            subtext="Approved leave"
                        />
                        <SummaryCard
                            icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
                            iconBg="bg-amber-50"
                            label="Pending"
                            value={`${leaves.filter(l => l.status === "pending").length} Requests`}
                            subtext="Awaiting review"
                            trend="up"
                        />
                    </SummaryCardsRow>

                    {/* TEAM LIST */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm mt-6">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h4 className="font-semibold text-neutral-900">Today's Activity</h4>
                        </div>
                        <div className="divide-y divide-neutral-100">
                            {combinedTeam.map((member, idx) => {
                                const statusText = getStatusText(member);
                                const isNotChecked = statusText.includes("Not yet");

                                return (
                                    <div key={member.id || idx} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Assuming member has an avatar property, otherwise fallback to initials */}
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.username} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-medium text-sm">
                                                    {member.username?.split(' ').map((n: string) => n[0]).join('') || "U"}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-neutral-900">{member.username}</div>
                                                <div className={clsx("text-xs", isNotChecked ? "text-orange-500 font-medium" : "text-neutral-500")}>
                                                    {statusText}
                                                </div>
                                            </div>
                                        </div>
                                        <StatusBadge status={member.status} />
                                    </div>
                                )
                            })}
                            {combinedTeam.length === 0 && (
                                <div className="p-12 text-center text-neutral-400">
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


