"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as clockApi from "@/lib/api/clock/index";
import { fetchTeamMembers, TeamMemberProfile } from "@/lib/api/clock_team";
import { formatMinutes } from "@/lib/clock-data-logic";
import { AttendanceRecord, LeaveRequest, OvertimeLog, AttendanceSession, BusinessTrip, AttendanceLog, RequestStatus, AttendanceStatus } from "@/lib/api/clock/clock.types";

// Helper to get start/end of month
const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    // Format as YYYY-MM-DD
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    return { start: formatDate(start), end: formatDate(end) };
};

export function useClockData(userId?: string, isTeam: boolean = false, targetDate: Date = new Date()) {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [overtime, setOvertime] = useState<OvertimeLog[]>([]);
    const [businessTrips, setBusinessTrips] = useState<BusinessTrip[]>([]);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [logs, setLogs] = useState<clockApi.AttendanceLog[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Use ref to track if we've already fetched for this key
    const lastFetchKey = useRef<string>("");

    const fetchData = useCallback(async () => {
        // Create a stable key for the current fetch parameters
        const fetchKey = `${userId}-${isTeam}-${targetDate.getFullYear()}-${targetDate.getMonth()}`;

        // Skip if we already fetched for this key
        if (fetchKey === lastFetchKey.current) {
            return;
        }
        lastFetchKey.current = fetchKey;

        setLoading(true);
        try {
            // Calculate date range for the target month
            const { start: startDate, end: endDate } = getMonthRange(targetDate);

            // If isTeam is true, we pass undefined as userId to fetch all (RLS will filter if not admin)
            const targetId = isTeam ? undefined : userId;

            // USE BUNDLE FETCH
            const bundle = await clockApi.fetchClockBundle(targetId, startDate, endDate);

            // --- CENTRALIZED DATA PATCHING ---
            // 1. Patch Existing Records (if missing time but has session/log)
            let patchedAttendance = bundle.attendance.map(record => {
                const dayStr = record.date; // already YYYY-MM-DD
                const isMissingTime = !record.clockIn || record.clockIn === "-";

                if (isMissingTime) {
                    const session = bundle.sessions.find(s => s.date === dayStr && s.userId === record.userId);
                    const log = bundle.logs.find(l => {
                        // Log timestamp is ISO, need to check date match
                        if (l.type !== 'IN' || l.userId !== record.userId) return false;
                        const logDate = new Date(l.timestamp);
                        const y = logDate.getFullYear();
                        const m = String(logDate.getMonth() + 1).padStart(2, '0');
                        const d = String(logDate.getDate()).padStart(2, '0');
                        return `${y}-${m}-${d}` === dayStr;
                    });

                    if (session?.clockIn) {
                        return {
                            ...record,
                            clockIn: session.clockIn, // RETURN ISO
                            clockOut: session.clockOut ? session.clockOut : record.clockOut, // RETURN ISO
                            status: "intime" as AttendanceStatus
                        };
                    } else if (log?.timestamp) {
                        return {
                            ...record,
                            clockIn: log.timestamp, // RETURN ISO
                            status: "intime" as AttendanceStatus
                        };
                    }
                }
                return record;
            });

            // 2. Inject Missing Records (from Sessions that have no Attendance Record)
            bundle.sessions.forEach(session => {
                const dayStr = session.date;
                const exists = patchedAttendance.some(r => r.userId === session.userId && r.date === dayStr);

                if (!exists) {
                    patchedAttendance.push({
                        id: `fallback-session-${session.id}`,
                        userId: session.userId,
                        date: dayStr,
                        day: new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' }),
                        employee: session.userName || "Unknown",
                        schedule: "09:00 - 18:00", // Default assumption
                        clockIn: session.clockIn, // RETURN ISO
                        clockOut: session.clockOut ? session.clockOut : null, // RETURN ISO
                        duration: session.durationMinutes ? formatMinutes(session.durationMinutes) : "-", // Keep formatted or number?
                        // AttendanceRecord expects "duration" as string.
                        overtime: "-",
                        status: "intime" as AttendanceStatus,
                        totalMinutes: session.durationMinutes || 0,
                        overtimeMinutes: 0,
                        avatar: session.avatar
                    });
                }
            });

            setAttendance(patchedAttendance);
            setLeaves(bundle.leaves);
            setOvertime(bundle.overtime);
            setBusinessTrips(bundle.trips);
            setSessions(bundle.sessions);
            setLogs(bundle.logs);

            // Team members still separate if needed or can be added to bundle if pure fetch
            if (isTeam) {
                const members = await fetchTeamMembers();
                setTeamMembers(members);
            }

        } catch (error) {
            console.error("❌ Error fetching clock module data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, isTeam, targetDate]);

    useEffect(() => {
        if (userId || isTeam) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isTeam, targetDate.getTime()]);

    const refresh = useCallback(() => {
        // Force refresh by clearing the key
        lastFetchKey.current = "";
        fetchData();
    }, [fetchData]);

    // ==========================================
    // OPTIMISTIC UPDATE FUNCTIONS
    // These update local state INSTANTLY for better UX
    // ==========================================

    // Update leave request status optimistically
    const updateLeaveOptimistic = useCallback((id: string, newStatus: RequestStatus, rejectReason?: string) => {
        setLeaves(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: newStatus, rejectReason: rejectReason || item.rejectReason }
                : item
        ));
    }, []);

    // Update overtime log status optimistically
    const updateOvertimeOptimistic = useCallback((id: string, newStatus: RequestStatus, rejectReason?: string) => {
        setOvertime(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: newStatus, rejectReason: rejectReason || item.rejectReason }
                : item
        ));
    }, []);

    // Update business trip status optimistically
    const updateBusinessTripOptimistic = useCallback((id: string, newStatus: RequestStatus, rejectReason?: string) => {
        setBusinessTrips(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: newStatus, rejectReason: rejectReason || item.rejectReason }
                : item
        ));
    }, []);

    // Delete item optimistically
    const deleteLeaveOptimistic = useCallback((id: string) => {
        setLeaves(prev => prev.filter(item => item.id !== id));
    }, []);

    const deleteOvertimeOptimistic = useCallback((id: string) => {
        setOvertime(prev => prev.filter(item => item.id !== id));
    }, []);

    const deleteBusinessTripOptimistic = useCallback((id: string) => {
        setBusinessTrips(prev => prev.filter(item => item.id !== id));
    }, []);

    return {
        attendance,
        leaves,
        overtime,
        businessTrips,
        sessions,
        logs,
        teamMembers,
        loading,
        refresh,
        // Optimistic update functions
        updateLeaveOptimistic,
        updateOvertimeOptimistic,
        updateBusinessTripOptimistic,
        deleteLeaveOptimistic,
        deleteOvertimeOptimistic,
        deleteBusinessTripOptimistic
    };
}

