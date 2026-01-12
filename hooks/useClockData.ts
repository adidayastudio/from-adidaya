"use client";

import { useState, useCallback, useEffect } from "react";
import * as clockApi from "@/lib/api/clock";
import { AttendanceRecord, LeaveRequest, OvertimeLog, AttendanceSession, BusinessTrip } from "@/lib/api/clock";

export function useClockData(userId?: string, isTeam: boolean = false) {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [overtime, setOvertime] = useState<OvertimeLog[]>([]);
    const [businessTrips, setBusinessTrips] = useState<BusinessTrip[]>([]);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // If isTeam is true, we pass undefined as userId to fetch all (RLS will filter if not admin)
            const targetId = isTeam ? undefined : userId;

            const [attData, leaveData, otData, tripData] = await Promise.all([
                clockApi.fetchAttendanceRecords(targetId),
                clockApi.fetchLeaveRequests(targetId),
                clockApi.fetchOvertimeLogs(targetId),
                clockApi.fetchBusinessTrips(targetId)
            ]);

            setAttendance(attData);
            setLeaves(leaveData);
            setOvertime(otData);
            setBusinessTrips(tripData);

            // Fetch sessions separately (table might not exist yet)
            try {
                const sessionsData = await clockApi.fetchAttendanceSessions(targetId);
                setSessions(sessionsData);
            } catch (e) {
                console.warn("⚠️ Could not fetch sessions (table may not exist):", e);
            }
        } catch (error) {
            console.error("❌ Error fetching clock module data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, isTeam]);

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
        loading,
        refresh: fetchData
    };
}
