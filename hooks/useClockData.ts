"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as clockApi from "@/lib/api/clock/index";
import { fetchTeamMembers, TeamMemberProfile } from "@/lib/api/clock_team";
import { formatMinutes } from "@/lib/clock-data-logic";
import { AttendanceRecord, LeaveRequest, OvertimeLog, AttendanceSession, BusinessTrip, AttendanceLog, RequestStatus, AttendanceStatus } from "@/lib/api/clock/clock.types";
import { format, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSunday } from "date-fns";
import { HOLIDAYS_2026 } from "@/lib/constants/holidays";

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

export function useClockData(userId: string | undefined, isTeam: boolean = false, targetDate: Date = new Date()) {
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
        const fetchKey = `${userId}-${isTeam}-${targetDate.getFullYear()}-${targetDate.getMonth()}`;
        if (fetchKey === lastFetchKey.current) return;
        lastFetchKey.current = fetchKey;

        setLoading(true);
        try {
            const { start: startDate, end: endDate } = getMonthRange(targetDate);
            const targetId = isTeam ? undefined : userId;

            // USE BUNDLE FETCH
            if (isTeam) {
                const cacheModule = await import("@/lib/api/clock/clock.cache");
                cacheModule.clearClockCache();
            }
            
            const members = isTeam ? await fetchTeamMembers() : [];

            // Fetch
            const [bundleAll, bundleMe] = await Promise.all([
                clockApi.fetchClockBundle(targetId, startDate, endDate),
                isTeam && userId ? clockApi.fetchClockBundle(userId, startDate, endDate) : Promise.resolve(null)
            ]);

            // Merge Personal data with Team data for current user consistency
            const attendance = [...(bundleMe?.attendance || []), ...bundleAll.attendance.filter((r: AttendanceRecord) => !bundleMe?.attendance.some((mr: AttendanceRecord) => mr.id === r.id))];
            const sessions = [...(bundleMe?.sessions || []), ...bundleAll.sessions.filter((s: AttendanceSession) => !bundleMe?.sessions.some((ms: AttendanceSession) => ms.id === s.id))];
            const leaves = [...(bundleMe?.leaves || []), ...bundleAll.leaves.filter((l: LeaveRequest) => !bundleMe?.leaves.some((ml: LeaveRequest) => ml.id === l.id))];
            const overtime = [...(bundleMe?.overtime || []), ...bundleAll.overtime.filter((o: OvertimeLog) => !bundleMe?.overtime.some((mo: OvertimeLog) => mo.id === o.id))];
            const trips = [...(bundleMe?.trips || []), ...bundleAll.trips.filter((t: BusinessTrip) => !bundleMe?.trips.some((mt: BusinessTrip) => mt.id === t.id))];
            const logs = [...(bundleMe?.logs || []), ...bundleAll.logs.filter((l: AttendanceLog) => !bundleMe?.logs.some((ml: AttendanceLog) => ml.id === l.id))];

            const bundle = { attendance, sessions, leaves, overtime, trips, logs };

            // --- ULTIMATE MULTI-SESSION AGGREGATOR ---
            const toYYYYMMDD = (d: any) => {
                if (!d) return "";
                const s = String(d);
                if (/^\d{13}$/.test(s)) return format(new Date(parseInt(s)), "yyyy-MM-dd");
                if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
                try {
                    const date = d instanceof Date ? d : new Date(d);
                    return isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd");
                } catch { return ""; }
            };

            const dayEntries = new Map<string, AttendanceRecord[]>();
            const recordEntry = (uid: string, date: string, rec: AttendanceRecord) => {
                const k = `${String(uid).toLowerCase().trim()}_${date}`;
                const current = dayEntries.get(k) || [];
                dayEntries.set(k, [...current, rec]);
            };

            // 1. Add Official Attendance Records FIRST
            bundle.attendance.forEach(r => {
                const dateStr = toYYYYMMDD(r.date);
                
                // Enhance record with photo/location from session IF missing
                // This guarantees the official record gets the richest possible metadata
                let { checkInPhotoUrl, checkOutPhotoUrl, checkInLocationCode, checkInLocationType, checkInLocationStatus, checkInRemoteMode, notes } = r;

                if (!checkInPhotoUrl || !checkOutPhotoUrl || !checkInLocationCode || !notes) {
                    const matchedSession = bundle.sessions.find(s => 
                        String(s.userId).toLowerCase().trim() === String(r.userId).toLowerCase().trim() &&
                        toYYYYMMDD(s.date) === dateStr &&
                        (s.clockIn === r.clockIn || Math.abs((s.durationMinutes || 0) - (r.totalMinutes || 0)) < 15)
                    );
                    
                    if (matchedSession) {
                        checkInPhotoUrl = checkInPhotoUrl || matchedSession.photoUrl || undefined;
                        checkOutPhotoUrl = checkOutPhotoUrl || (matchedSession.clockOut ? matchedSession.photoUrl : undefined);
                        checkInLocationCode = checkInLocationCode || matchedSession.locationCode;
                        checkInLocationType = checkInLocationType || matchedSession.locationType;
                        checkInLocationStatus = checkInLocationStatus || matchedSession.locationStatus;
                        checkInRemoteMode = checkInRemoteMode || matchedSession.remoteMode;
                        notes = notes || matchedSession.notes;
                    }

                    if (!notes) {
                        const matchedLog = bundle.logs.find(l => 
                            String(l.userId).toLowerCase().trim() === String(r.userId).toLowerCase().trim() && 
                            toYYYYMMDD(l.timestamp) === dateStr && 
                            l.notes && l.notes !== "Active Session"
                        );
                        if (matchedLog) {
                            notes = matchedLog.notes;
                        }
                    }
                }
                
                recordEntry(r.userId, dateStr, {
                    ...r,
                    date: dateStr,
                    checkInPhotoUrl,
                    checkOutPhotoUrl,
                    checkInLocationCode,
                    checkInLocationType,
                    checkInLocationStatus,
                    checkInRemoteMode,
                    notes: notes || ""
                });
            });

            // 2. Add Sessions ONLY IF there are NO records for this user on this date
            // This catches people who just clocked in but haven't clocked out, or if the record failed to create.
            bundle.sessions.forEach(s => {
                const dateStr = toYYYYMMDD(s.date);
                const uid = String(s.userId).toLowerCase().trim();
                const k = `${uid}_${dateStr}`;
                
                if (!dayEntries.has(k) || dayEntries.get(k)!.length === 0) {
                    recordEntry(s.userId, dateStr, {
                        id: `sess-${s.id}`,
                        userId: s.userId,
                        date: dateStr,
                        clockIn: s.clockIn || "-",
                        clockOut: s.clockOut || "-",
                        status: "intime",
                        totalMinutes: s.durationMinutes || 0,
                        overtimeMinutes: 0,
                        checkInPhotoUrl: s.photoUrl || undefined,
                        checkOutPhotoUrl: s.clockOut ? s.photoUrl : undefined,
                        checkInLatitude: s.latitude,
                        checkInLongitude: s.longitude,
                        checkInLocationCode: s.locationCode,
                        checkInLocationType: s.locationType as any,
                        checkInLocationStatus: s.locationStatus,
                        checkInRemoteMode: s.remoteMode,
                        notes: s.notes || "Raw Session (Record Missing)"
                    });
                }
            });

            // 3. Add Logs ONLY IF there are NO records and NO sessions for this user on this date
            bundle.logs.forEach(l => {
                if (l.type !== 'clock_in' && l.type !== 'IN') return;
                const dateStr = toYYYYMMDD(l.timestamp);
                const uid = String(l.userId).toLowerCase().trim();
                const k = `${uid}_${dateStr}`;

                if (!dayEntries.has(k) || dayEntries.get(k)!.length === 0) {
                     recordEntry(l.userId, dateStr, {
                        id: `log-${l.id}`,
                        userId: l.userId,
                        date: dateStr,
                        clockIn: l.timestamp,
                        clockOut: "-",
                        status: "intime",
                        totalMinutes: 0,
                        overtimeMinutes: 0,
                        checkInPhotoUrl: l.photoUrl || (l as any).photo_url,
                        checkInLocationCode: (l as any).detectedLocationCode || (l as any).location_uid,
                        checkInLocationStatus: (l as any).locationStatus || "inside", // Fallback for logs
                        checkInLocationType: (l as any).locationType || "office", // Fallback for logs
                        notes: l.notes || "Raw Log (Record Missing)"
                    } as any);
                }
            });

            // --- GAP FILLING ---
            const today = new Date();
            const isViewingCurrentMonth = targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear();
            const startDateObj = startOfMonth(targetDate);
            const endDateObj = isViewingCurrentMonth ? today : endOfMonth(targetDate);
            
            const allDays = eachDayOfInterval({ start: startDateObj, end: endDateObj });
            const denseAttendance: AttendanceRecord[] = [];
            const targets = isTeam ? (members.length > 0 ? members : [{ id: userId, username: "Me", avatar_url: null }]) : [{ id: userId, username: "Me", avatar_url: null }];

            allDays.forEach(day => {
                const dayStr = format(day, "yyyy-MM-dd");
                const isSun = isSunday(day);
                const holiday = HOLIDAYS_2026.find(h => h.date === dayStr);

                targets.forEach(member => {
                    const uid = String(member.id).toLowerCase().trim();
                    const key = `${uid}_${dayStr}`;
                    const existingRecords = dayEntries.get(key);
                    
                    const leave = bundle.leaves.find(l => String(l.userId).toLowerCase() === uid && dayStr >= l.startDate && dayStr <= l.endDate && l.status === "approved");
                    const trip = bundle.trips.find(t => String(t.userId).toLowerCase() === uid && dayStr >= t.startDate && dayStr <= t.endDate && t.status === "approved");

                    if (existingRecords && existingRecords.length > 0) {
                        existingRecords.forEach(rec => {
                            denseAttendance.push({
                                ...rec,
                                userName: (member as any).username || (member as any).full_name || rec.userName,
                                avatar: (member as any).avatar_url || rec.avatar,
                                status: leave ? "leave" : (trip ? "intime" : rec.status),
                                notes: (leave ? `Leave: ${leave.type}` : (trip ? `Business Trip: ${trip.destination}` : rec.notes))
                            });
                        });
                    } else {
                        let status: AttendanceStatus = "absent";
                        let notes = "";
                        if (leave) { status = "leave"; notes = `Leave: ${leave.type}`; }
                        else if (trip) { status = "intime"; notes = `Business Trip: ${trip.destination}`; }
                        else if (holiday) { status = holiday.type === "collective_leave" ? "leave" : "holiday"; notes = holiday.nameEn; }
                        else if (isSun) { status = "holiday"; notes = "Weekend"; }

                        denseAttendance.push({
                            id: `gap-${key}`,
                            userId: member.id,
                            date: dayStr,
                            clockIn: "-", clockOut: "-",
                            status: status,
                            totalMinutes: 0, overtimeMinutes: 0,
                            userName: (member as any).username || (member as any).full_name,
                            avatar: (member as any).avatar_url,
                            notes: notes
                        } as any);
                    }
                });
            });

            setAttendance(denseAttendance);
            setLeaves(bundle.leaves);
            setOvertime(bundle.overtime);
            setBusinessTrips(bundle.trips);
            setSessions(bundle.sessions);
            setLogs(bundle.logs);
            if (isTeam) setTeamMembers(members);

        } catch (error) {
            console.error("❌ Error fetching clock data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, isTeam, targetDate]);

    useEffect(() => {
        if (userId || isTeam) fetchData();
    }, [userId, isTeam, targetDate.getTime(), fetchData]);

    useEffect(() => {
        const handleRefresh = () => {
            lastFetchKey.current = "";
            fetchData();
        };
        window.addEventListener("clock-action-success", handleRefresh);
        return () => window.removeEventListener("clock-action-success", handleRefresh);
    }, [fetchData]);

    const refresh = useCallback(() => {
        lastFetchKey.current = "";
        fetchData();
    }, [fetchData]);

    return {
        attendance, leaves, overtime, businessTrips, sessions, logs, teamMembers, loading, refresh,
        updateLeaveOptimistic: (id: string, s: RequestStatus) => setLeaves(pv => pv.map(i => i.id === id ? { ...i, status: s } : i)),
        updateOvertimeOptimistic: (id: string, s: RequestStatus) => setOvertime(pv => pv.map(i => i.id === id ? { ...i, status: s } : i)),
        updateBusinessTripOptimistic: (id: string, s: RequestStatus) => setBusinessTrips(pv => pv.map(i => i.id === id ? { ...i, status: s } : i)),
        deleteLeaveOptimistic: (id: string) => setLeaves(pv => pv.filter(i => i.id !== id)),
        deleteOvertimeOptimistic: (id: string) => setOvertime(pv => pv.filter(i => i.id !== id)),
        deleteBusinessTripOptimistic: (id: string) => setBusinessTrips(pv => pv.filter(i => i.id !== id))
    };
}
