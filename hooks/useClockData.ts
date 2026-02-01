"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as clockApi from "@/lib/api/clock/index";
import { fetchTeamMembers, TeamMemberProfile } from "@/lib/api/clock_team";
import { AttendanceRecord, LeaveRequest, OvertimeLog, AttendanceSession, BusinessTrip, AttendanceLog } from "@/lib/api/clock/clock.types";

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

            setAttendance(bundle.attendance);
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

    return {
        attendance,
        leaves,
        overtime,
        businessTrips,
        sessions,
        logs,
        teamMembers,
        loading,
        refresh
    };
}
