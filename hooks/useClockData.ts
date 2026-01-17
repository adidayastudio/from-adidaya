"use client";

import { useState, useCallback, useEffect } from "react";
import * as clockApi from "@/lib/api/clock";
import { fetchTeamMembers, TeamMemberProfile } from "@/lib/api/clock_team";
import { AttendanceRecord, LeaveRequest, OvertimeLog, AttendanceSession, BusinessTrip } from "@/lib/api/clock";

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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate date range for the target month
            const { start: startDate, end: endDate } = getMonthRange(targetDate);

            // If isTeam is true, we pass undefined as userId to fetch all (RLS will filter if not admin)
            const targetId = isTeam ? undefined : userId;

            // Fetch independent data streams
            // 1. Core clock data (critical) - Now filtered by DATE RANGE
            const targetDateStr = targetDate.toISOString().split('T')[0]; // For sessions (single day)

            const clockPromise = Promise.all([
                clockApi.fetchAttendanceRecords(targetId, startDate, endDate),
                clockApi.fetchLeaveRequests(targetId, startDate, endDate),
                clockApi.fetchOvertimeLogs(targetId, startDate, endDate),
                clockApi.fetchBusinessTrips(targetId, startDate, endDate),
                // Fetch sessions in parallel (usually for single day context)
                clockApi.fetchAttendanceSessions(targetId, targetDateStr).catch(e => {
                    console.warn("⚠️ Independent session fetch failed", e);
                    return [];
                }),
                // Fetch raw logs
                clockApi.fetchAttendanceLogs(targetId, startDate, endDate)
            ]);

            // 2. Team data (optional/conditional)
            const teamPromise = isTeam ? fetchTeamMembers() : Promise.resolve([]);

            // Execute
            const [clockResults, teamResult] = await Promise.allSettled([clockPromise, teamPromise]);

            // Handle Core Data
            if (clockResults.status === 'fulfilled') {
                const [attData, leaveData, otData, tripData, sessionsData, logsData] = clockResults.value;
                setAttendance(attData);
                setLeaves(leaveData);
                setOvertime(otData);
                setBusinessTrips(tripData);
                setSessions(sessionsData);
                setLogs(logsData);
            } else {
                console.error("❌ Critical: Failed to fetch clock data", clockResults.reason);
            }

            // Handle Team Data
            if (teamResult.status === 'fulfilled') {
                setTeamMembers(teamResult.value as TeamMemberProfile[]);
            } else {
                console.error("⚠️ Failed to fetch team members", teamResult.reason);
                setTeamMembers([]);
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
    }, [userId, isTeam, fetchData]);

    return {
        attendance,
        leaves,
        overtime,
        businessTrips,
        sessions,
        logs,
        teamMembers,
        loading,
        refresh: fetchData
    };
}
