import { reconcileAttendanceSessions } from '../attendanceSessionRecords';
import { writeAdidayaClock } from './adidayaClock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "../supabase";
import { getWorkHoursConfig } from "../work-hours-utils";
import { addLocalNotification } from "./notifications";

// --- LOCAL MOCK DATABASE FOR DEVELOPMENT ---
const mockSessions: any[] = [];
const mockRecords: any[] = [];
const LOCAL_CORRECTIONS_KEY = 'adidaya_attendance_corrections_list';

export type AttendanceStatus = "present" | "ontime" | "intime" | "late" | "absent" | "sick" | "leave" | "weekend" | "holiday" | "cuti-bersama";

export interface AttendanceRecord {
    id: string;
    userId: string;
    summaryPending?: boolean;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    status: AttendanceStatus;
    totalMinutes: number;
    overtimeMinutes: number;
    userName?: string;
    userDepartment?: string;
    avatar?: string;
    checkInLatitude?: number;
    checkInLongitude?: number;
    checkInLocationCode?: string;
    checkInLocationType?: string;
    checkInRemoteMode?: string;
    checkInLocationStatus?: string;
    checkInPhotoUrl?: string;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
    checkOutLocationCode?: string;
    checkOutLocationType?: string;
    checkOutRemoteMode?: string;
    checkOutLocationStatus?: string;
    checkOutPhotoUrl?: string;
    notes?: string;
}

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
    photoUrl?: string;
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
    photoUrl?: string;
}

/**
 * Fetch attendance records for a user
 */
export async function fetchAttendanceRecords(userId?: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    if (userId === '00000000-0000-0000-0000-000000000000') {
        if (mockRecords.length === 0) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const todayDate = now.getDate();
            
            for (let d = 1; d < todayDate; d++) {
                const dateObj = new Date(year, month, d);
                const dayOfWeek = dateObj.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                mockRecords.push({
                    id: `mock-record-${d}`,
                    userId: '00000000-0000-0000-0000-000000000000',
                    date: dateStr,
                    clockIn: `${dateStr}T08:55:00.000Z`,
                    clockOut: `${dateStr}T17:05:00.000Z`,
                    status: d % 7 === 0 ? 'late' : 'ontime',
                    totalMinutes: 8 * 60 + 10,
                    overtimeMinutes: 10,
                    checkInLocationCode: d % 3 === 0 ? 'REM' : 'JPF',
                    checkInPhotoUrl: undefined,
                    checkOutPhotoUrl: undefined
                } as any);
            }
        }
        return mockRecords;
    }
    let query = supabase.from("attendance_records").select(`
        *,
        profiles:user_id (full_name, department, avatar_url, account_type, include_in_performance)
    `);

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    let { data, error } = await query.order("date", { ascending: false });

    if (error) {
        console.warn("Retrying attendance records with simple query due to:", error.message);
        let fallbackQuery = supabase.from("attendance_records").select("*");
        if (userId) fallbackQuery = fallbackQuery.eq("user_id", userId);
        if (startDate) fallbackQuery = fallbackQuery.gte("date", startDate);
        if (endDate) fallbackQuery = fallbackQuery.lte("date", endDate);
        const fallbackRes = await fallbackQuery.order("date", { ascending: false });
        data = fallbackRes.data;
        if (fallbackRes.error) {
            throw fallbackRes.error;
        }
    }

    let sessionsQuery = supabase.from('attendance_sessions').select(`
        *, profiles:user_id (full_name, department, avatar_url, account_type, include_in_performance)
    `);
    if (userId) sessionsQuery = sessionsQuery.eq('user_id', userId);
    if (startDate) sessionsQuery = sessionsQuery.gte('date', startDate);
    if (endDate) sessionsQuery = sessionsQuery.lte('date', endDate);
    let sessionsResult = await sessionsQuery;
    if (sessionsResult.error) {
        let fallback = supabase.from('attendance_sessions').select('*');
        if (userId) fallback = fallback.eq('user_id', userId);
        if (startDate) fallback = fallback.gte('date', startDate);
        if (endDate) fallback = fallback.lte('date', endDate);
        sessionsResult = await fallback;
        if (sessionsResult.error) throw sessionsResult.error;
    }
    const reconciled = reconcileAttendanceSessions(data || [], sessionsResult.data || []);
    const filteredData = reconciled.filter((row: any) => {
        if (!row.profiles) return true;
        const isHuman = (row.profiles.account_type || 'human').toLowerCase() !== 'system';
        const isIncluded = row.profiles.include_in_performance !== false;
        return isHuman && isIncluded;
    });

    return filteredData.map((row: any) => ({
        id: row.id,
        summaryPending: row.summary_pending,
        userId: row.user_id,
        date: row.date,
        clockIn: row.clock_in || row.check_in,
        clockOut: row.clock_out || row.check_out,
        status: row.status as AttendanceStatus,
        totalMinutes: row.total_minutes || 0,
        overtimeMinutes: row.overtime_minutes || 0,
        userName: row.profiles?.full_name,
        userDepartment: row.profiles?.department,
        avatar: row.profiles?.avatar_url,
        checkInLatitude: row.check_in_latitude || row.location?.latitude,
        checkInLongitude: row.check_in_longitude || row.location?.longitude,
        checkInLocationCode: row.check_in_location_code || row.location?.code,
        checkInLocationType: row.check_in_location_type || row.location?.type,
        checkInRemoteMode: row.check_in_remote_mode || row.location?.remoteMode,
        checkInLocationStatus: row.check_in_location_status || row.location?.status,
        checkInPhotoUrl: row.check_in_photo_url || row.photo_url,
        checkOutLocationCode: row.check_out_location_code || (row.clock_out || row.check_out ? (row.check_in_location_code || row.location?.code) : undefined),
        checkOutRemoteMode: row.check_out_remote_mode || (row.clock_out || row.check_out ? (row.check_in_remote_mode || row.location?.remoteMode) : undefined),
        checkOutPhotoUrl: row.check_out_photo_url,
        notes: row.check_in_notes || row.notes
    }));
}

/**
 * Fetch today's sessions
 */
export async function fetchTodaySessions(userId: string): Promise<AttendanceSession[]> {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        const today = new Date().toLocaleDateString('en-CA');
        return mockSessions.filter(s => s.userId === userId && s.date === today);
    }
    try {
        const today = new Date().toLocaleDateString('en-CA');
        const { data, error } = await supabase
            .from("attendance_sessions")
            .select("*")
            .eq("user_id", userId);

        if (error) {
            throw error;
        }

        return (data || [])
            .filter((row: any) => (row.date || row.session_date || row.created_at?.slice(0, 10)) === today)
            .map((row: any) => {
                const clockInVal = row.clock_in || row.check_in || row.created_at;
                const clockOutVal = row.clock_out || row.check_out || null;
                const calcDuration = clockInVal && clockOutVal
                    ? Math.max(0, Math.floor((new Date(clockOutVal).getTime() - new Date(clockInVal).getTime()) / 60000))
                    : 0;

                return {
                    id: row.id,
                    userId: row.user_id,
                    date: row.date || row.session_date || row.created_at?.slice(0, 10) || today,
                    sessionNumber: row.session_number || 1,
                    clockIn: clockInVal,
                    clockOut: clockOutVal,
                    durationMinutes: row.duration_minutes ?? calcDuration,
                    isOvertime: row.is_overtime || false,
                    latitude: row.latitude || row.location?.latitude,
                    longitude: row.longitude || row.location?.longitude,
                    locationCode: row.location_code || row.location?.code,
                    locationType: row.location_type || row.location?.type,
                    remoteMode: row.remote_mode || row.location?.remoteMode,
                    locationStatus: row.location_status || row.location?.status,
                    photoUrl: row.photo_url
                };
            })
            .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
    } catch (error) {
        throw error;
    }
}

/**
 * Perform Clock In or Clock Out
 */
export async function clockAction(userId: string, type: 'IN' | 'OUT', metadata?: ClockActionMetadata) {
    return writeAdidayaClock(userId, type, metadata);
}



import { decode } from 'base64-arraybuffer';

export async function uploadClockFileBase64(base64Data: string, fileExt: string, contentType: string, folder: string = 'leaves'): Promise<string> {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const binaryData = decode(base64Data);

    const candidateBuckets = ['attendance', 'chat-attachments', 'from-adidaya', 'project-files'];

    for (const bucket of candidateBuckets) {
        for (const path of [filePath, fileName]) {
            try {
                const { error } = await supabase.storage
                    .from(bucket)
                    .upload(path, binaryData, {
                        contentType,
                        upsert: true,
                    });

                if (!error) {
                    const { data: publicData } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(path);

                    if (publicData?.publicUrl) {
                        return publicData.publicUrl;
                    }
                }
            } catch (_) {}
        }
    }

    console.error("❌ Error uploading clock file: all candidate buckets failed.");
    return `data:${contentType};base64,${base64Data}`;
}

export type LeaveType = "Annual Leave" | "Sick Leave" | "Permission" | "Unpaid Leave" | "Maternity Leave";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "revision" | "need revision";

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
    subtype?: string;
    createdAt: string;
    requestNumber?: string;
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
    rejectReason?: string;
    requestNumber?: string;
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
    requestNumber?: string;
}

export type CorrectionFieldType = 'clock_in' | 'clock_out' | 'work_location' | 'attendance_status';

export interface AttendanceCorrectionRequest {
    id: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    attendanceRecordId?: string;
    attendanceDate: string;
    correctionType: CorrectionFieldType;
    originalValue: string;
    requestedValue: string;
    reason: string;
    evidenceUrl?: string;
    status: RequestStatus;
    rejectReason?: string;
    requestNumber?: string;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
}


// ============================================
// LEAVE REQUESTS
// ============================================

export async function fetchLeaveRequests(userId?: string, startDate?: string, endDate?: string): Promise<LeaveRequest[]> {
    let query = supabase.from("leave_requests").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }
    if (startDate) {
        if (endDate) {
            query = query.lte("start_date", endDate).gte("end_date", startDate);
        } else {
            query = query.gte("start_date", startDate);
        }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Error fetching leave requests:", error.message);
        return [];
    }

    return (data || []).map((row: any) => ({
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
        subtype: row.subtype,
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
        subtype: request.subtype,
        file_url: request.fileUrl,
        status: "pending"
    }).select().single();

    if (error) throw error;

    // Trigger notification asynchronously
    addLocalNotification({
        text: `Permintaan Cuti baru (${request.type}) diajukan oleh ${request.userName || 'Karyawan'} untuk tanggal ${request.startDate}.`,
        module: 'Attendance',
        user: request.userName || 'Karyawan',
        category: 'crew',
        subjectUser: request.userId,
        ref: data.id,
        action: 'submit'
    }).catch(err => console.error('Failed to create leave submission notification:', err));

    return data;
}

export async function updateLeaveRequest(id: string, updates: Partial<Omit<LeaveRequest, "id" | "createdAt">>) {
    const updateData: Record<string, unknown> = {};

    if (updates.type) updateData.type = updates.type;
    if (updates.startDate) updateData.start_date = updates.startDate;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.subtype !== undefined) updateData.subtype = updates.subtype;
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

// ============================================
// OVERTIME
// ============================================

export async function fetchOvertimeLogs(userId?: string, startDate?: string, endDate?: string): Promise<OvertimeLog[]> {
    let query = supabase.from("overtime_logs").select(`
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
        console.error("❌ Error fetching overtime logs:", error.message);
        return [];
    }

    return (data || []).map((row: any) => ({
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
        approvedEndTime: row.approved_end_time,
        rejectReason: row.reject_reason
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

    // Trigger notification asynchronously
    addLocalNotification({
        text: `Laporan Lembur baru diajukan oleh ${log.userName || 'Karyawan'} untuk tanggal ${log.date}.`,
        module: 'Attendance',
        user: log.userName || 'Karyawan',
        category: 'crew',
        subjectUser: log.userId,
        ref: data.id,
        action: 'submit'
    }).catch(err => console.error('Failed to create overtime submission notification:', err));

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

export async function syncOvertimeToAttendance(userId: string, date: string) {
    const REGULAR_WORK_MINUTES = 8 * 60;
    
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
    logs?.forEach((log: any) => {
        const start = new Date(`${date}T${log.start_time}`);
        const end = new Date(`${date}T${log.end_time}`);
        const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
        if (!isNaN(diff) && diff > 0) {
            totalMinutes += diff;
        }
    });

    // 3. Update attendance record
    const { data: existing, error: checkError } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", userId)
        .eq("date", date)
        .single();

    if (checkError && checkError.code !== "PGRST116") {
        console.error("❌ Error checking attendance record:", checkError);
        return;
    }

    if (existing) {
        await supabase
            .from("attendance_records")
            .update({ overtime_minutes: totalMinutes })
            .eq("id", existing.id);
    } else if (totalMinutes > 0) {
        await supabase
            .from("attendance_records")
            .insert({
                user_id: userId,
                date: date,
                overtime_minutes: totalMinutes,
                status: 'present',
            });
    }
}

// ============================================
// BUSINESS TRIPS
// ============================================

export async function fetchBusinessTrips(userId?: string, startDate?: string, endDate?: string): Promise<BusinessTrip[]> {
    let query = supabase.from("business_trips").select(`
        *,
        profiles:user_id (full_name)
    `);

    if (userId) {
        query = query.eq("user_id", userId);
    }
    if (startDate) {
        if (endDate) {
            query = query.lte("start_date", endDate).gte("end_date", startDate);
        } else {
            query = query.gte("start_date", startDate);
        }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Error fetching business trips:", error.message);
        return [];
    }

    return (data || []).map((row: any) => ({
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

    // Trigger notification asynchronously
    addLocalNotification({
        text: `Permintaan Dinas baru ke ${trip.destination} diajukan oleh ${trip.userName || 'Karyawan'}.`,
        module: 'Attendance',
        user: trip.userName || 'Karyawan',
        category: 'crew',
        subjectUser: trip.userId,
        ref: data.id,
        action: 'submit'
    }).catch(err => console.error('Failed to create business trip submission notification:', err));

    return data;
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

// ============================================
// ATTENDANCE CORRECTIONS
// ============================================

export async function fetchCorrectionRequests(userId?: string): Promise<AttendanceCorrectionRequest[]> {
    let corrections: AttendanceCorrectionRequest[] = [];
    try {
        const { data, error } = await supabase.from("attendance_corrections").select(`
            *,
            profiles:user_id (full_name, avatar_url)
        `);
        if (!error && data) {
            corrections = data.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                userName: row.profiles?.full_name || 'Employee',
                userAvatar: row.profiles?.avatar_url,
                attendanceRecordId: row.attendance_record_id,
                attendanceDate: row.attendance_date,
                correctionType: row.correction_type,
                originalValue: row.original_value,
                requestedValue: row.requested_value,
                reason: row.reason,
                evidenceUrl: row.evidence_url,
                status: row.status,
                rejectReason: row.reject_reason,
                createdAt: row.created_at,
                approvedAt: row.approved_at,
                approvedBy: row.approved_by,
                requestNumber: row.request_number,
            }));
        }
    } catch {
        // Handled below via fallback
    }

    // Merge with local storage fallback
    try {
        const rawLocal = await AsyncStorage.getItem(LOCAL_CORRECTIONS_KEY);
        if (rawLocal) {
            const localList: AttendanceCorrectionRequest[] = JSON.parse(rawLocal);
            localList
                .filter(localItem => !localItem.id.startsWith('corr-mock-'))
                .forEach(localItem => {
                    const idx = corrections.findIndex(c => c.id === localItem.id);
                    if (idx >= 0) {
                        corrections[idx] = { ...corrections[idx], ...localItem };
                    } else {
                        corrections.push(localItem);
                    }
                });
        }
    } catch (e) {
        console.warn('Failed to read local corrections', e);
    }

    if (userId) {
        return corrections.filter(c => c.userId === userId);
    }
    return corrections;
}

export async function createCorrectionRequest(
    payload: Omit<AttendanceCorrectionRequest, 'id' | 'createdAt' | 'status'> & { status?: RequestStatus }
): Promise<AttendanceCorrectionRequest> {
    const newRequest: AttendanceCorrectionRequest = {
        ...payload,
        id: `corr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: payload.status || 'pending',
        createdAt: new Date().toISOString(),
    };

    // Save to local storage
    try {
        const raw = await AsyncStorage.getItem(LOCAL_CORRECTIONS_KEY);
        const list: AttendanceCorrectionRequest[] = raw ? JSON.parse(raw) : [];
        list.unshift(newRequest);
        await AsyncStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save correction to local storage', e);
    }

    // Try saving to Supabase if table exists
    try {
        await supabase.from('attendance_corrections').insert({
            id: newRequest.id,
            user_id: newRequest.userId,
            attendance_record_id: newRequest.attendanceRecordId,
            attendance_date: newRequest.attendanceDate,
            correction_type: newRequest.correctionType,
            original_value: newRequest.originalValue,
            requested_value: newRequest.requestedValue,
            reason: newRequest.reason,
            evidence_url: newRequest.evidenceUrl,
            status: newRequest.status,
            created_at: newRequest.createdAt
        });
    } catch {
        // Ignored if table not created
    }

    // Notify admins / managers
    addLocalNotification({
        text: `${payload.userName || 'Employee'} mengajukan koreksi absensi tanggal ${payload.attendanceDate}`,
        module: 'Attendance',
        user: payload.userName || 'Employee',
        category: 'crew',
        subjectUser: payload.userId,
        ref: newRequest.id,
        action: 'pending'
    }).catch(err => console.error('Failed to create correction notification:', err));

    return newRequest;
}

export async function updateCorrectionRequestStatus(
    id: string,
    status: RequestStatus,
    rejectReason?: string,
    reviewerName: string = 'Admin/Manager'
): Promise<void> {
    let targetItem: AttendanceCorrectionRequest | null = null;
    try {
        const raw = await AsyncStorage.getItem(LOCAL_CORRECTIONS_KEY);
        let list: AttendanceCorrectionRequest[] = raw ? JSON.parse(raw) : [];
        list = list.map(item => {
            if (item.id === id) {
                targetItem = {
                    ...item,
                    status,
                    rejectReason,
                    approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
                    approvedBy: status === 'approved' ? reviewerName : undefined,
                };
                return targetItem;
            }
            return item;
        });
        await AsyncStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to update local correction status', e);
    }

    // Try updating Supabase
    try {
        await supabase.from('attendance_corrections').update({
            status,
            reject_reason: rejectReason,
            approved_at: status === 'approved' ? new Date().toISOString() : null,
            approved_by: status === 'approved' ? reviewerName : null,
        }).eq('id', id);
    } catch {}

    // If approved, update corresponding attendance record in database / mock records
    if (status === 'approved' && targetItem) {
        const item = targetItem as AttendanceCorrectionRequest;
        try {
            const updatePayload: Record<string, any> = {};
            if (item.correctionType === 'clock_in') {
                updatePayload.clock_in = `${item.attendanceDate}T${item.requestedValue}:00.000Z`;
            } else if (item.correctionType === 'clock_out') {
                updatePayload.clock_out = `${item.attendanceDate}T${item.requestedValue}:00.000Z`;
            } else if (item.correctionType === 'work_location') {
                updatePayload.check_in_location_code = item.requestedValue;
            } else if (item.correctionType === 'attendance_status') {
                updatePayload.status = item.requestedValue;
            }

            // Update in Supabase if record ID exists
            if (item.attendanceRecordId && !item.attendanceRecordId.startsWith('mock-')) {
                await supabase.from('attendance_records').update(updatePayload).eq('id', item.attendanceRecordId);
            }

            // Also update in-memory mock record if found
            const mockRec = mockRecords.find(r => r.id === item.attendanceRecordId || (r.userId === item.userId && r.date === item.attendanceDate));
            if (mockRec) {
                if (item.correctionType === 'clock_in') mockRec.clockIn = updatePayload.clock_in;
                if (item.correctionType === 'clock_out') mockRec.clockOut = updatePayload.clock_out;
                if (item.correctionType === 'work_location') mockRec.checkInLocationCode = item.requestedValue;
                if (item.correctionType === 'attendance_status') mockRec.status = item.requestedValue;
            }
        } catch (e) {
            console.warn('Failed to update attendance record on approval', e);
        }
    }

    // Notification to user
    if (targetItem) {
        const item = targetItem as AttendanceCorrectionRequest;
        const statusLabel = status === 'approved' ? 'DISETUJUI' : status === 'rejected' ? 'DITOLAK' : status.toUpperCase();
        addLocalNotification({
            text: `Koreksi absensi tanggal ${item.attendanceDate} Anda telah ${statusLabel}.${rejectReason ? ` Alasan: "${rejectReason}"` : ''}`,
            module: 'Attendance',
            user: reviewerName,
            category: 'crew',
            subjectUser: item.userId,
            ref: id,
            action: status
        }, [item.userId]).catch(err => console.error('Failed to notify correction status:', err));
    }
}

// ============================================
// APPROVALS (Managers Only)
// ============================================

export async function updateRequestStatus(
    type: "leave" | "overtime" | "business-trip" | "correction",
    id: string,
    status: RequestStatus,
    rejectReason?: string,
    correction?: { approvedStartTime?: string; approvedEndTime?: string }
) {
    if (type === "correction") {
        return updateCorrectionRequestStatus(id, status, rejectReason);
    }

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

    // Trigger status update database notification to user
    if (data && data.user_id) {
        const typeLabels: Record<string, string> = {
            "leave": "Cuti",
            "overtime": "Lembur",
            "business-trip": "Perjalanan Dinas"
        };
        const statusLabels: Record<string, string> = {
            "approved": "DISETUJUI",
            "rejected": "DITOLAK",
            "revision": "DIMINTA REVISI",
            "need revision": "DIMINTA REVISI"
        };
        const statusLabel = statusLabels[status.toLowerCase()] || status.toUpperCase();
        const text = `Permintaan ${typeLabels[type]} Anda telah ${statusLabel} oleh Admin/Manager.${rejectReason ? ` Alasan: "${rejectReason}"` : ''}`;
        
        addLocalNotification({
            text,
            module: 'Attendance',
            user: 'Admin/Manager',
            category: 'crew',
            subjectUser: data.user_id,
            ref: id,
            action: status
        }, [data.user_id]).catch(err => console.error('Failed to create status update notification:', err));
    }

    return data;
}

export function getProjectNumber(projectCodeOrId: string | undefined): string {
    if (!projectCodeOrId) return '000';
    const clean = projectCodeOrId.toLowerCase();
    if (clean.includes('bsi')) return '036';
    if (clean.includes('ops') || clean.includes('adidaya')) return '007';
    if (clean.includes('8012')) return '012';
    
    // Extract first 3 digits if available
    const digits = projectCodeOrId.replace(/\D/g, '');
    if (digits.length > 0) {
        return digits.substring(0, 3).padStart(3, '0');
    }
    return '000';
}

export async function fetchProjectsMap(): Promise<Record<string, { code: string, number: string }>> {
    try {
        const { data, error } = await supabase.from('projects').select('id, project_code, project_number');
        const map: Record<string, { code: string, number: string }> = {
            'ady_ops': { code: 'ADIDAYA OPS', number: '007' },
            'ADY-8012': { code: 'ADY-8012', number: '012' },
            'BSI TRIP': { code: 'BSI TRIP', number: '036' }
        };
        if (error || !data) return map;
        data.forEach((p: any) => {
            if (p.id) {
                map[p.id] = {
                    code: p.project_code || 'ADY',
                    number: p.project_number ? String(p.project_number).padStart(3, '0') : '000'
                };
            }
        });
        return map;
    } catch {
        return {
            'ady_ops': { code: 'ADIDAYA OPS', number: '007' },
            'ADY-8012': { code: 'ADY-8012', number: '012' },
            'BSI TRIP': { code: 'BSI TRIP', number: '036' }
        };
    }
}

export async function fetchAllRequestsAndRank(userId?: string): Promise<{
    leaves: LeaveRequest[];
    overtimes: OvertimeLog[];
    trips: BusinessTrip[];
    corrections: AttendanceCorrectionRequest[];
}> {
    const projectsMap = await fetchProjectsMap();

    // Fetch leaves
    let leavesQuery = supabase.from("leave_requests").select(`
        *,
        profiles:user_id (full_name, account_type, include_in_performance)
    `);
    
    // Fetch overtimes
    let overtimesQuery = supabase.from("overtime_logs").select(`
        *,
        profiles:user_id (full_name, account_type, include_in_performance)
    `);
    
    // Fetch trips
    let tripsQuery = supabase.from("business_trips").select(`
        *,
        profiles:user_id (full_name, account_type, include_in_performance)
    `);

    const [leavesRes, overtimesRes, tripsRes, correctionsData] = await Promise.all([
        leavesQuery,
        overtimesQuery,
        tripsQuery,
        fetchCorrectionRequests(userId)
    ]);

    const filterValid = (row: any) => {
        if (!row.profiles) return true;
        const isHuman = (row.profiles.account_type || 'human').toLowerCase() !== 'system';
        const isIncluded = row.profiles.include_in_performance !== false;
        return isHuman && isIncluded;
    };

    const leaves: LeaveRequest[] = (leavesRes.data || []).filter(filterValid).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.profiles?.full_name,
        type: row.type,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        reason: row.reason,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        subtype: row.subtype,
        createdAt: row.created_at
    }));

    const overtimes: OvertimeLog[] = (overtimesRes.data || []).filter(filterValid).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.profiles?.full_name,
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

    const trips: BusinessTrip[] = (tripsRes.data || []).filter(filterValid).map((row: any) => ({
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
        status: row.status,
        rejectReason: row.reject_reason,
        fileUrl: row.file_url,
        notes: row.notes,
        createdAt: row.created_at
    }));

    const corrections: AttendanceCorrectionRequest[] = correctionsData;

    // Combine and sort chronologically by date/createdAt to assign global aggregate rank
    const combined = [
        ...leaves.map(item => ({ item, type: 'LV' as const, date: item.createdAt || item.startDate })),
        ...overtimes.map(item => ({ item, type: 'OT' as const, date: item.createdAt || item.date })),
        ...trips.map(item => ({ item, type: 'BT' as const, date: item.createdAt || item.startDate })),
        ...corrections.map(item => ({ item, type: 'AC' as const, date: item.createdAt || item.attendanceDate }))
    ];

    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate requestNumber
    combined.forEach((entry, idx) => {
        const seq = String(idx + 1).padStart(5, '0');
        const projId = (entry.item as any).projectId;
        const projInfo = projId ? projectsMap[projId] : null;
        const projNum = projInfo ? projInfo.number : getProjectNumber(projId);

        entry.item.requestNumber = `${entry.type}-${projNum}-${seq}`;
    });

    // If userId is passed, filter lists accordingly to return only that user's items (but retaining their computed rank)
    if (userId) {
        return {
            leaves: leaves.filter(l => l.userId === userId),
            overtimes: overtimes.filter(o => o.userId === userId),
            trips: trips.filter(t => t.userId === userId),
            corrections: corrections.filter(c => c.userId === userId)
        };
    }

    return { leaves, overtimes, trips, corrections };
}

export async function uploadCrewFileBase64(base64Data: string, fileExt: string, contentType: string, folder: string = 'reimbursements'): Promise<string> {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const binaryData = decode(base64Data);

    const { error } = await supabase.storage.from('crew-documents').upload(filePath, binaryData, {
        contentType,
        upsert: false,
    });
    if (!error) {
        const { data } = supabase.storage.from('crew-documents').getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
    }

    throw new Error("Attachment upload failed. Please try again before saving the request.");
}
