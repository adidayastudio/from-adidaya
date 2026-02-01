
import { createClient } from "@/utils/supabase/client";
import { AttendanceRecord, LeaveRequest, OvertimeLog, BusinessTrip, AttendanceSession, AttendanceLog } from "./clock.types";
const supabase = createClient();

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
    let query = supabase.from("leave_requests").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (endDate) query = query.lte("start_date", endDate);
    if (startDate) query = query.gte("end_date", startDate);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
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
    let query = supabase.from("overtime_logs").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
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
    let query = supabase.from("business_trips").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (endDate) query = query.lte("start_date", endDate);
    if (startDate) query = query.gte("end_date", startDate);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
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
