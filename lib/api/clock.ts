import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// ============================================
// TYPES
// ============================================

export type AttendanceStatus = "ontime" | "late" | "absent" | "sick" | "leave" | "weekend" | "holiday";

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    status: AttendanceStatus;
    totalMinutes: number;
    overtimeMinutes: number;
    userName?: string; // For team view
    // Location fields for check-in
    checkInLatitude?: number;
    checkInLongitude?: number;
    checkInLocationCode?: string;
    checkInLocationType?: string;
    checkInRemoteMode?: string;
    checkInLocationStatus?: string;
}

export type LeaveType = "Annual Leave" | "Sick Leave" | "Permission" | "Unpaid Leave" | "Maternity Leave";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
    id: string;
    userId: string;
    userName?: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    status: RequestStatus;
    reason: string;
    rejectReason?: string;
    fileUrl?: string;
    createdAt: string;
}

export interface OvertimeLog {
    id: string;
    userId: string;
    userName?: string;
    date: string;
    startTime: string;
    endTime: string;
    projectId?: string;
    status: RequestStatus;
    description: string;
    photoUrl?: string;
    createdAt: string;
    approvedStartTime?: string;
    approvedEndTime?: string;
}

export interface BusinessTrip {
    id: string;
    userId: string;
    userName?: string;
    destination: string;
    startDate: string;
    endDate: string;
    purpose: string;
    projectId?: string;
    transportation?: string;
    accommodation?: string;
    estimatedCost?: number;
    status: RequestStatus;
    rejectReason?: string;
    fileUrl?: string;
    notes?: string;
    createdAt: string;
}

// ============================================
// ATTENDANCE
// ============================================

export async function fetchAttendanceRecords(userId?: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    let query = supabase.from("attendance_records").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }
    if (startDate) {
        query = query.gte("date", startDate);
    }
    if (endDate) {
        query = query.lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
        console.error("❌ Error fetching attendance:", error.message, error.details);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        clockIn: row.clock_in,
        clockOut: row.clock_out,
        status: row.status as AttendanceStatus,
        totalMinutes: row.total_minutes || 0,
        overtimeMinutes: row.overtime_minutes || 0,
        userName: row.profiles?.full_name,
        checkInLatitude: row.check_in_latitude,
        checkInLongitude: row.check_in_longitude,
        checkInLocationCode: row.check_in_location_code,
        checkInLocationType: row.check_in_location_type,
        checkInRemoteMode: row.check_in_remote_mode,
        checkInLocationStatus: row.check_in_location_status
    }));
}

// ============================================
// ATTENDANCE SESSIONS
// ============================================

export interface AttendanceSession {
    id: string;
    userId: string;
    date: string;
    sessionNumber: number;
    clockIn: string;
    clockOut: string | null;
    durationMinutes: number;
    isOvertime: boolean;
    latitude?: number;
    longitude?: number;
    locationCode?: string;
    locationType?: string;
    remoteMode?: string;
    locationStatus?: string;
}

export async function fetchAttendanceSessions(userId?: string, date?: string): Promise<AttendanceSession[]> {
    let query = supabase.from("attendance_sessions").select("*");

    if (userId) {
        query = query.eq("user_id", userId);
    }
    if (date) {
        query = query.eq("date", date);
    }

    const { data, error } = await query.order("date", { ascending: false }).order("session_number", { ascending: true });

    if (error) {
        console.error("❌ Error fetching sessions:", error.message);
        return [];
    }

    return (data || []).map(row => ({
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

export interface ClockActionMetadata {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    detectedLocationId?: string;
    detectedLocationCode?: string;
    detectedLocationType?: string;
    distanceMeters?: number;
    locationStatus?: "inside" | "outside" | "unknown";
    overrideReason?: string;
    remoteMode?: string;
}

export async function clockAction(userId: string, type: "IN" | "OUT", metadata?: ClockActionMetadata) {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const OVERTIME_HOUR = 17;
    const REGULAR_WORK_MINUTES = 8 * 60;

    // 1. Always log the event
    const { error: logError } = await supabase.from("attendance_logs").insert({
        user_id: userId,
        type: type,
        timestamp: now.toISOString(),
        latitude: metadata?.latitude,
        longitude: metadata?.longitude,
        accuracy: metadata?.accuracy,
        detected_location_id: metadata?.detectedLocationId,
        detected_location_code: metadata?.detectedLocationCode,
        detected_location_type: metadata?.detectedLocationType,
        distance_meters: metadata?.distanceMeters,
        location_status: metadata?.locationStatus || "unknown",
        override_reason: metadata?.overrideReason,
        remote_mode: metadata?.remoteMode
    });
    if (logError) console.error("❌ Error inserting attendance log:", logError.message);

    // 2. Get existing sessions for today
    const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", dateStr)
        .order("session_number", { ascending: true });

    const existingSessions = sessions || [];
    const lastSession = existingSessions[existingSessions.length - 1];

    if (type === "IN") {
        // Determine if this is overtime or regular
        const isOvertime = currentHour >= OVERTIME_HOUR;
        const nextSessionNumber = existingSessions.length + 1;

        // Check if there's an unclosed session
        if (lastSession && !lastSession.clock_out) {
            console.warn("⚠️ Cannot clock IN: previous session is still open.");
            return { error: "You must clock OUT before clocking IN again." };
        }

        // Insert new session
        const { error: sessionError } = await supabase.from("attendance_sessions").insert({
            user_id: userId,
            date: dateStr,
            session_number: nextSessionNumber,
            clock_in: now.toISOString(),
            is_overtime: isOvertime,
            latitude: metadata?.latitude,
            longitude: metadata?.longitude,
            location_code: metadata?.detectedLocationCode,
            location_type: metadata?.detectedLocationType,
            remote_mode: metadata?.remoteMode,
            location_status: metadata?.locationStatus
        });
        if (sessionError) console.error("❌ Error inserting session:", sessionError.message);

        // Update/Insert attendance_records (first clock in of the day)
        if (nextSessionNumber === 1) {
            const { error: upsertError } = await supabase.from("attendance_records").upsert({
                user_id: userId,
                date: dateStr,
                clock_in: now.toISOString(),
                status: "ontime",
                check_in_latitude: metadata?.latitude,
                check_in_longitude: metadata?.longitude,
                check_in_location_code: metadata?.detectedLocationCode,
                check_in_location_type: metadata?.detectedLocationType,
                check_in_remote_mode: metadata?.remoteMode,
                check_in_location_status: metadata?.locationStatus
            }, { onConflict: "user_id, date" });
            if (upsertError) console.error("❌ Error upserting attendance record:", upsertError.message);
        }

    } else {
        // CLOCK OUT
        if (!lastSession || lastSession.clock_out) {
            console.warn("⚠️ Cannot clock OUT: no open session found.");
            return { error: "You must clock IN before clocking OUT." };
        }

        // Validate time
        const clockInTime = new Date(lastSession.clock_in);
        if (now < clockInTime) {
            return { error: "Clock OUT time cannot be before Clock IN time." };
        }

        // Calculate duration for this session
        const sessionDuration = Math.floor((now.getTime() - clockInTime.getTime()) / 60000);

        // Update session
        const { error: updateSessionError } = await supabase.from("attendance_sessions").update({
            clock_out: now.toISOString(),
            duration_minutes: sessionDuration,
            updated_at: now.toISOString()
        }).eq("id", lastSession.id);
        if (updateSessionError) console.error("❌ Error closing session:", updateSessionError.message);

        // Aggregate total duration (excluding gaps)
        const { data: allSessions } = await supabase
            .from("attendance_sessions")
            .select("duration_minutes, is_overtime")
            .eq("user_id", userId)
            .eq("date", dateStr);

        let totalRegularMinutes = 0;
        let totalOvertimeMinutes = 0;
        (allSessions || []).forEach(s => {
            if (s.is_overtime) {
                totalOvertimeMinutes += s.duration_minutes || 0;
            } else {
                totalRegularMinutes += s.duration_minutes || 0;
            }
        });

        // If regular exceeds 8 hours, move excess to overtime
        if (totalRegularMinutes > REGULAR_WORK_MINUTES) {
            const excess = totalRegularMinutes - REGULAR_WORK_MINUTES;
            totalOvertimeMinutes += excess;
            totalRegularMinutes = REGULAR_WORK_MINUTES;
        }

        // Update attendance_records
        const { error: updateRecordError } = await supabase.from("attendance_records").update({
            clock_out: now.toISOString(),
            total_minutes: totalRegularMinutes,
            overtime_minutes: totalOvertimeMinutes
        }).eq("user_id", userId).eq("date", dateStr);
        if (updateRecordError) console.error("❌ Error updating attendance record:", updateRecordError.message);

        // If overtime detected, also log to overtime_logs for visibility
        if (totalOvertimeMinutes > 0) {
            const existingOT = await supabase.from("overtime_logs")
                .select("id")
                .eq("user_id", userId)
                .eq("date", dateStr)
                .maybeSingle();

            if (!existingOT.data) {
                await supabase.from("overtime_logs").insert({
                    user_id: userId,
                    date: dateStr,
                    start_time: "17:00",
                    end_time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                    description: "Auto-logged from clock session",
                    status: "approved"
                });
            }
        }
    }

    return { success: true };
}

// ============================================
// LEAVE REQUESTS
// ============================================

export async function fetchLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    let query = supabase.from("leave_requests").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Error fetching leave requests:", error.message, error.details);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.profiles?.full_name,
        type: row.type as LeaveType,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status as RequestStatus,
        reason: row.reason,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        createdAt: row.created_at
    }));
}

export async function submitLeaveRequest(request: Omit<LeaveRequest, "id" | "status" | "createdAt">) {
    const { data, error } = await supabase.from("leave_requests").insert({
        user_id: request.userId,
        type: request.type,
        start_date: request.startDate,
        end_date: request.endDate,
        reason: request.reason,
        file_url: request.fileUrl,
        status: "pending"
    }).select().single();

    if (error) throw error;
    return data;
}

export async function updateLeaveRequest(id: string, updates: Partial<Omit<LeaveRequest, "id" | "createdAt">>) {
    const updateData: Record<string, unknown> = {};

    if (updates.type) updateData.type = updates.type;
    if (updates.startDate) updateData.start_date = updates.startDate;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.fileUrl !== undefined) updateData.file_url = updates.fileUrl;
    if (updates.status) updateData.status = updates.status;
    if (updates.rejectReason !== undefined) updateData.reject_reason = updates.rejectReason;

    const { data, error } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteLeaveRequest(id: string) {
    const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// Create attendance records for approved leave days (marks as 'leave' status)
export async function createLeaveAttendanceRecords(
    userId: string,
    startDate: string,
    endDate: string
) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const records = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        records.push({
            user_id: userId,
            date: dateStr,
            status: 'leave',
            clock_in: null,
            clock_out: null,
            total_minutes: 0,
            overtime_minutes: 0
        });
    }

    // Upsert to handle if record already exists
    const { error } = await supabase
        .from("attendance_records")
        .upsert(records, {
            onConflict: 'user_id,date',
            ignoreDuplicates: false
        });

    if (error) {
        console.error("❌ Error creating leave attendance records:", error);
        throw error;
    }
}

// Delete attendance records for leave days (when leave is cancelled/rejected)
export async function deleteLeaveAttendanceRecords(
    userId: string,
    startDate: string,
    endDate: string
) {
    const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("user_id", userId)
        .eq("status", "leave")
        .gte("date", startDate)
        .lte("date", endDate);

    if (error) {
        console.error("❌ Error deleting leave attendance records:", error);
        throw error;
    }
}

// ============================================
// OVERTIME
// ============================================

export async function fetchOvertimeLogs(userId?: string): Promise<OvertimeLog[]> {
    let query = supabase.from("overtime_logs").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
        console.error("❌ Error fetching overtime logs:", error.message, error.details);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.profiles?.full_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        projectId: row.project_id,
        status: row.status as RequestStatus,
        description: row.description,
        photoUrl: row.photo_url,
        createdAt: row.created_at,
        approvedStartTime: row.approved_start_time,
        approvedEndTime: row.approved_end_time
    }));
}

export async function submitOvertimeLog(log: Omit<OvertimeLog, "id" | "status" | "createdAt">) {
    const { data, error } = await supabase.from("overtime_logs").insert({
        user_id: log.userId,
        date: log.date,
        start_time: log.startTime,
        end_time: log.endTime,
        project_id: log.projectId,
        description: log.description,
        photo_url: log.photoUrl,
        status: "pending"
    }).select().single();

    if (error) throw error;
    return data;
}

export async function updateOvertimeLog(id: string, updates: Partial<Omit<OvertimeLog, "id" | "createdAt">>) {
    const updateData: Record<string, unknown> = {};

    if (updates.date) updateData.date = updates.date;
    if (updates.startTime) updateData.start_time = updates.startTime;
    if (updates.endTime) updateData.end_time = updates.endTime;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;
    if (updates.status) updateData.status = updates.status;

    const { data, error } = await supabase
        .from("overtime_logs")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteOvertimeLog(id: string) {
    const { error } = await supabase
        .from("overtime_logs")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// Recalculate and update attendance record overtime minutes for a specific date
// Should be called after any overtime request status change (approve/reject/cancel/delete)
export async function syncOvertimeToAttendance(userId: string, date: string) {
    // 1. Fetch all APPROVED overtime logs for this user and date
    const { data: logs, error: fetchError } = await supabase
        .from("overtime_logs")
        .select("start_time, end_time")
        .eq("user_id", userId)
        .eq("date", date)
        .eq("status", "approved");

    if (fetchError) {
        console.error("❌ Error fetching approved overtime logs:", fetchError);
        return;
    }

    // 2. Calculate total minutes
    let totalMinutes = 0;
    logs?.forEach(log => {
        const start = new Date(`${date}T${log.start_time}`);
        const end = new Date(`${date}T${log.end_time}`);
        const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
        if (!isNaN(diff) && diff > 0) {
            totalMinutes += diff;
        }
    });

    // 3. Update attendance record
    // We only update if record exists, or we could insert if missing.
    // Usually attendance exists if they clocked in. If they only did OT, maybe we should check.
    // For now, let's try to update, and if it doesn't exist, we might need to create it (unlikely for OT without attendance but possible on off days)

    // Check if record exists
    const { data: existing, error: checkError } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", userId)
        .eq("date", date)
        .single();

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 is not found
        console.error("❌ Error checking attendance record:", checkError);
        return;
    }

    if (existing) {
        await supabase
            .from("attendance_records")
            .update({ overtime_minutes: totalMinutes })
            .eq("id", existing.id);
    } else if (totalMinutes > 0) {
        // Create new record only if there is OT (e.g. weekend OT without clock in?)
        // Assuming strict foreign key to profiles exists
        await supabase
            .from("attendance_records")
            .insert({
                user_id: userId,
                date: date,
                overtime_minutes: totalMinutes,
                status: 'present', // Default to present if they have OT? Or maybe 'off' but with OT? Let's use present for now or maybe just leave it null if allowed?
                // Actually database probably has defaults. Let's try minimal insert.
            });
    }
}

export async function updateBusinessTrip(id: string, updates: Partial<Omit<BusinessTrip, "id" | "createdAt">>) {
    const updateData: Record<string, unknown> = {};

    if (updates.destination) updateData.destination = updates.destination;
    if (updates.startDate) updateData.start_date = updates.startDate;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.purpose) updateData.purpose = updates.purpose;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.transportation !== undefined) updateData.transportation = updates.transportation;
    if (updates.accommodation !== undefined) updateData.accommodation = updates.accommodation;
    if (updates.estimatedCost !== undefined) updateData.estimated_cost = updates.estimatedCost;
    if (updates.status) updateData.status = updates.status;
    if (updates.rejectReason !== undefined) updateData.reject_reason = updates.rejectReason;

    const { data, error } = await supabase
        .from("business_trips")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteBusinessTrip(id: string) {
    const { error } = await supabase
        .from("business_trips")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// Create attendance records for approved business trips (marks as 'business_trip' status)
export async function createTripAttendanceRecords(
    userId: string,
    startDate: string,
    endDate: string
) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const records = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        records.push({
            user_id: userId,
            date: dateStr,
            status: 'business_trip',
            clock_in: null,
            clock_out: null,
            total_minutes: 480, // Assume full day (8h) for trip
            overtime_minutes: 0
        });
    }

    // Upsert to handle if record already exists
    const { error } = await supabase
        .from("attendance_records")
        .upsert(records, {
            onConflict: 'user_id,date',
            ignoreDuplicates: false
        });

    if (error) {
        console.error("❌ Error creating trip attendance records:", error);
        throw error;
    }
}

// Delete attendance records for business trips (when cancelled/rejected)
export async function deleteTripAttendanceRecords(
    userId: string,
    startDate: string,
    endDate: string
) {
    const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("user_id", userId)
        .eq("status", "business_trip")
        .gte("date", startDate)
        .lte("date", endDate);

    if (error) {
        console.error("❌ Error deleting trip attendance records:", error);
        throw error;
    }
}

// ============================================
// BUSINESS TRIPS
// ============================================

export async function fetchBusinessTrips(userId?: string): Promise<BusinessTrip[]> {
    let query = supabase.from("business_trips").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Error fetching business trips:", error.message, error.details);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.profiles?.full_name,
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        purpose: row.purpose,
        projectId: row.project_id,
        transportation: row.transportation,
        accommodation: row.accommodation,
        estimatedCost: row.estimated_cost,
        status: row.status as RequestStatus,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        notes: row.notes,
        createdAt: row.created_at
    }));
}

export async function submitBusinessTrip(trip: Omit<BusinessTrip, "id" | "status" | "createdAt">) {
    const { data, error } = await supabase.from("business_trips").insert({
        user_id: trip.userId,
        destination: trip.destination,
        start_date: trip.startDate,
        end_date: trip.endDate,
        purpose: trip.purpose,
        project_id: trip.projectId,
        transportation: trip.transportation,
        accommodation: trip.accommodation,
        estimated_cost: trip.estimatedCost,
        file_url: trip.fileUrl,
        notes: trip.notes,
        status: "pending"
    }).select().single();

    if (error) throw error;
    return data;
}

// ============================================
// APPROVALS (Managers Only)
// ============================================

export async function updateRequestStatus(
    type: "leave" | "overtime" | "business-trip",
    id: string,
    status: RequestStatus,
    rejectReason?: string,
    correction?: { approvedStartTime?: string; approvedEndTime?: string }
) {
    const tableMap: Record<string, string> = {
        "leave": "leave_requests",
        "overtime": "overtime_logs",
        "business-trip": "business_trips"
    };

    const table = tableMap[type];

    const updateData: any = {
        status: status,
        reject_reason: rejectReason
    };

    if (type === "overtime" && correction) {
        if (correction.approvedStartTime) updateData.approved_start_time = correction.approvedStartTime;
        if (correction.approvedEndTime) updateData.approved_end_time = correction.approvedEndTime;
    }

    const { data, error } = await supabase.from(table).update(updateData).eq("id", id).select().single();

    if (error) throw error;
    return data;
}
