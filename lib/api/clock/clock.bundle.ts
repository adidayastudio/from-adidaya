
import {
    fetchAttendanceRecords,
    fetchLeaveRequests,
    fetchOvertimeLogs,
    fetchBusinessTrips,
    fetchAttendanceSessions,
    fetchAttendanceLogs
} from "./clock.read";
import { getClockCache, setClockCache } from "./clock.cache";

export async function fetchClockBundle(userId?: string, startDate?: string, endDate?: string) {
    const cacheKey = `clock:${userId}:${startDate}:${endDate}`;
    const cached = getClockCache(cacheKey);
    if (cached) return cached;

    // Execute all fetches in parallel
    const [
        attendance,
        leaves,
        overtime,
        trips,
        sessions,
        logs
    ] = await Promise.all([
        fetchAttendanceRecords(userId, startDate, endDate),
        fetchLeaveRequests(userId, startDate, endDate),
        fetchOvertimeLogs(userId, startDate, endDate),
        fetchBusinessTrips(userId, startDate, endDate),
        fetchAttendanceSessions(userId, startDate, endDate),
        fetchAttendanceLogs(userId, startDate, endDate)
    ]);

    const bundle = {
        attendance,
        leaves,
        overtime,
        trips,
        sessions,
        logs,
        fetchedAt: Date.now()
    };

    setClockCache(cacheKey, bundle, 60);
    return bundle;
}
