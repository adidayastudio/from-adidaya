
import { createClient } from "@/utils/supabase/client";
import { AttendanceRecord, LeaveRequest, OvertimeLog, BusinessTrip, AttendanceSession, AttendanceLog } from "./clock.types";
const supabase = createClient();

// Helper: Fetch all profiles and create a lookup map
async function getProfilesMap(): Promise<Map<string, { full_name: string | null; username: string | null; nickname: string | null }>> {
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, nickname");

    if (error || !profiles) return new Map();

    const map = new Map<string, { full_name: string | null; username: string | null; nickname: string | null }>();
    profiles.forEach((p: any) => {
        map.set(p.id, { full_name: p.full_name, username: p.username, nickname: p.nickname });
    });
    return map;
}

// Helper: Get userName from profile map
function getUserName(profilesMap: Map<string, any>, userId: string): string | undefined {
    const profile = profilesMap.get(userId);
    if (!profile) return undefined;
    return profile.full_name || profile.username || profile.nickname || undefined;
}

export async function fetchAttendanceRecords(userId?: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    let query = supabase.from("attendance_records").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) return [];
    // Minimal mapping for compatibility
    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        clockIn: row.clock_in,
        clockOut: row.clock_out,
        status: row.status,
        totalMinutes: row.total_minutes || 0,
        overtimeMinutes: row.overtime_minutes || 0,
        checkInLatitude: row.check_in_latitude,
        checkInLongitude: row.check_in_longitude,
        checkInLocationCode: row.check_in_location_code,
        checkInLocationType: row.check_in_location_type,
        checkInRemoteMode: row.check_in_remote_mode,
        checkInLocationStatus: row.check_in_location_status,
        notes: row.check_in_notes
    }));
}

export async function fetchLeaveRequests(userId?: string, startDate?: string, endDate?: string): Promise<LeaveRequest[]> {
    // Fetch leave requests and profiles separately to avoid join duplication
    let query = supabase.from("leave_requests").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (endDate) query = query.lte("start_date", endDate);
    if (startDate) query = query.gte("end_date", startDate);

    const [{ data, error }, profilesMap] = await Promise.all([
        query.order("created_at", { ascending: false }),
        getProfilesMap()
    ]);

    if (error) {
        console.error("Error fetching leave requests:", error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: getUserName(profilesMap, row.user_id),
        type: row.type,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        reason: row.reason,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        createdAt: row.created_at
    }));
}

export async function fetchOvertimeLogs(userId?: string, startDate?: string, endDate?: string): Promise<OvertimeLog[]> {
    // Fetch overtime logs and profiles separately to avoid join duplication
    let query = supabase.from("overtime_logs").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const [{ data, error }, profilesMap] = await Promise.all([
        query.order("date", { ascending: false }),
        getProfilesMap()
    ]);

    if (error) {
        console.error("Error fetching overtime logs:", error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: getUserName(profilesMap, row.user_id),
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        projectId: row.project_id,
        status: row.status,
        description: row.description,
        photoUrl: row.photo_url,
        createdAt: row.created_at,
        approvedStartTime: row.approved_start_time,
        approvedEndTime: row.approved_end_time,
        rejectReason: row.reject_reason
    }));
}

export async function fetchBusinessTrips(userId?: string, startDate?: string, endDate?: string): Promise<BusinessTrip[]> {
    // Fetch business trips and profiles separately to avoid join duplication
    let query = supabase.from("business_trips").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (endDate) query = query.lte("start_date", endDate);
    if (startDate) query = query.gte("end_date", startDate);

    const [{ data, error }, profilesMap] = await Promise.all([
        query.order("created_at", { ascending: false }),
        getProfilesMap()
    ]);

    if (error) {
        console.error("Error fetching business trips:", error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: getUserName(profilesMap, row.user_id),
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        purpose: row.purpose,
        projectId: row.project_id,
        transportation: row.transportation,
        accommodation: row.accommodation,
        estimatedCost: row.estimated_cost,
        status: row.status,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        notes: row.notes,
        createdAt: row.created_at
    }));
}

export async function fetchAttendanceSessions(userId?: string, startDate?: string, endDate?: string): Promise<AttendanceSession[]> {
    let query = supabase.from("attendance_sessions").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query.order("date", { ascending: false }).order("session_number", { ascending: true });

    if (error) return [];

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        sessionNumber: row.session_number,
        clockIn: row.clock_in,
        clockOut: row.clock_out,
        durationMinutes: row.duration_minutes || 0,
        isOvertime: row.is_overtime || false,
        latitude: row.latitude,
        longitude: row.longitude,
        locationCode: row.location_code,
        locationType: row.location_type,
        remoteMode: row.remote_mode,
        locationStatus: row.location_status
    }));
}

export async function fetchAttendanceLogs(userId?: string, startDate?: string, endDate?: string): Promise<AttendanceLog[]> {
    let query = supabase.from("attendance_logs").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("timestamp", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("timestamp", `${endDate}T23:59:59`);

    const { data, error } = await query.order("timestamp", { ascending: false });

    if (error) return [];

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        timestamp: row.timestamp,
        latitude: row.latitude,
        longitude: row.longitude,
        detectedLocationCode: row.detected_location_code,
        locationStatus: row.location_status,
        createdAt: row.created_at
    }));
}
