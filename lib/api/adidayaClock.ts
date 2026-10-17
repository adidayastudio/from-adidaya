// Preserved Adidaya clock write behavior; no Forma schema fallback or demo identity.
import { supabase } from '@/lib/supabase';
import type { ClockActionMetadata, AttendanceStatus } from './attendance';
async function legacyClockAction(userId: string, type: "IN" | "OUT", metadata?: ClockActionMetadata) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-CA");

    // --- DYNAMIC WORK RULES ---
    // Fetch user profile and schedule
    const { data: profile } = await supabase
        .from("profiles")
        .select(`
            id,
            schedule_id,
            work_schedules (
                start_time,
                end_time,
                break_duration_minutes
            )
        `)
        .eq("id", userId)
        .single();

    const schedule = profile?.work_schedules as any;
    
    // Default Fallbacks (Office Hours 09:00 - 18:00)
    let regularWorkMinutes = 8 * 60;
    let lateThresholdHour = 9;
    let lateThresholdMinute = 1;
    let intimeThresholdHour = 9;
    let intimeThresholdMinute = 16;

    if (schedule && schedule.start_time && schedule.end_time) {
        const [hStart, mStart] = schedule.start_time.split(':').map(Number);
        const [hEnd, mEnd] = schedule.end_time.split(':').map(Number);
        
        // Calculate daily regular minutes
        const startMins = hStart * 60 + mStart;
        let endMins = hEnd * 60 + mEnd;
        if (endMins < startMins) endMins += 1440; // overnight
        
        regularWorkMinutes = (endMins - startMins) - (schedule.break_duration_minutes || 60);
        
        // Late thresholds relative to start time
        lateThresholdHour = hStart;
        lateThresholdMinute = mStart + 1;
        intimeThresholdHour = hStart;
        intimeThresholdMinute = mStart + 16;
        
        // Handle minute overflow
        if (lateThresholdMinute >= 60) { lateThresholdHour++; lateThresholdMinute -= 60; }
        if (intimeThresholdMinute >= 60) { intimeThresholdHour++; intimeThresholdMinute -= 60; }
    }

    const currentHour = now.getHours();
    const OVERTIME_HOUR = 17;

    // 1. Start logging with photo URL
    const logPromise = supabase.from("attendance_logs").insert({
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
        remote_mode: metadata?.remoteMode,
        photo_url: metadata?.photoUrl || null
    });

    // 2. Get existing sessions for today
    const { data: sessions, error: sessionsError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", dateStr)
        .order("session_number", { ascending: true });

    if (sessionsError) throw sessionsError;
    const existingSessions = sessions || [];
    const lastSession = existingSessions[existingSessions.length - 1];

    // Array to hold critical operation promises
    const criticalPromises: PromiseLike<any>[] = [];

    if (type === "IN") {
        // Determine if this is overtime or regular
        const isOvertime = currentHour >= OVERTIME_HOUR;
        const nextSessionNumber = existingSessions.length + 1;

        // Check if there's an unclosed session (Blocking check)
        if (lastSession && !lastSession.clock_out) {
            console.warn("⚠️ Cannot clock IN: previous session is still open.");
            return { error: "You must clock OUT before clocking IN again." };
        }

        // Insert new session with photo URL (Critical)
        const sessionPromise = supabase.from("attendance_sessions").insert({
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
            location_status: metadata?.locationStatus,
            photo_url: metadata?.photoUrl || null
        });
        criticalPromises.push(sessionPromise);

        // Ensure attendance_record exists (Parallel Critical)
        // We do logic here to verify if we need to fetch -> upsert or just upsert
        const recordPromise = (async () => {
            const { data: existingRecord } = await supabase.from("attendance_records")
                .select("id, clock_in, status")
                .eq("user_id", userId)
                .eq("date", dateStr)
                .maybeSingle();

            if (!existingRecord) {
                // Determine clock_in and status for the summary record
                const firstSess = nextSessionNumber === 1 ? { clock_in: now.toISOString() } : (existingSessions[0] || { clock_in: now.toISOString() });
                const checkInTime = new Date(firstSess.clock_in);

                const limitOnTime = new Date(checkInTime);
                limitOnTime.setHours(lateThresholdHour, lateThresholdMinute, 0, 0);
                const limitInTime = new Date(checkInTime);
                limitInTime.setHours(intimeThresholdHour, intimeThresholdMinute, 0, 0);

                let status: AttendanceStatus = "late";
                if (checkInTime < limitOnTime) status = "ontime";
                else if (checkInTime < limitInTime) status = "intime";

                const { error: recordError } = await (supabase.from("attendance_records") as any).upsert({
                    user_id: userId,
                    date: dateStr,
                    clock_in: checkInTime.toISOString(),
                    status: status,
                    check_in_latitude: metadata?.latitude,
                    check_in_longitude: metadata?.longitude,
                    check_in_location_code: metadata?.detectedLocationCode,
                    check_in_location_type: metadata?.detectedLocationType,
                    check_in_remote_mode: metadata?.remoteMode,
                    check_in_location_status: metadata?.locationStatus,
                    check_in_notes: metadata?.overrideReason,
                    check_in_photo_url: metadata?.photoUrl || null
                }, { onConflict: "user_id, date" });
                if (recordError) throw recordError;
            } else if (nextSessionNumber === 1) {
                // Update existing record if needed
                const { error: recordError } = await (supabase.from("attendance_records") as any).update({
                    clock_in: now.toISOString(),
                    status: (now.getHours() < lateThresholdHour || (now.getHours() === lateThresholdHour && now.getMinutes() < lateThresholdMinute)) ? "ontime" : (now.getHours() < intimeThresholdHour || (now.getHours() === intimeThresholdHour && now.getMinutes() < intimeThresholdMinute)) ? "intime" : "late"
                }).eq("user_id", userId).eq("date", dateStr);
                if (recordError) throw recordError;
            }
        })();
        criticalPromises.push(recordPromise);

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

        // Update session with clock_out and optional checkout photo (Critical)
        const sessionPromise = supabase.from("attendance_sessions").update({
            clock_out: now.toISOString(),
            duration_minutes: sessionDuration,
            updated_at: now.toISOString()
        }).eq("id", lastSession.id);
        criticalPromises.push(sessionPromise);

        // Update Aggregate record (Parallel Critical)
        const recordPromise = (async () => {
            let totalRegularMinutes = 0;
            let totalOvertimeMinutes = 0;

            // Process previous sessions
            existingSessions.forEach((s: any) => {
                // Skip the current session (lastSession) as we rely on the new values
                if (s.id === lastSession.id) return;

                if (s.is_overtime) {
                    totalOvertimeMinutes += s.duration_minutes || 0;
                } else {
                    totalRegularMinutes += s.duration_minutes || 0;
                }
            });

            // Add current session values
            // lastSession.is_overtime check
            const isLastSessionOvertime = lastSession.is_overtime; // Use original value
            if (isLastSessionOvertime) {
                totalOvertimeMinutes += sessionDuration;
            } else {
                totalRegularMinutes += sessionDuration;
            }

            // If regular exceeds dynamic limit, move excess to overtime
            if (totalRegularMinutes > regularWorkMinutes) {
                const excess = totalRegularMinutes - regularWorkMinutes;
                totalOvertimeMinutes += excess;
                totalRegularMinutes = regularWorkMinutes;
            }

            // Update / Upsert attendance_records
            const firstSess = existingSessions[0] || lastSession;
            const checkInTime = new Date(firstSess.clock_in);

            // Recalculate status for aggregate record
            const limitOnTime = new Date(checkInTime);
            limitOnTime.setHours(lateThresholdHour, lateThresholdMinute, 0, 0);
            const limitInTime = new Date(checkInTime);
            limitInTime.setHours(intimeThresholdHour, intimeThresholdMinute, 0, 0);
            let status: AttendanceStatus = "late";
            if (checkInTime < limitOnTime) status = "ontime";
            else if (checkInTime < limitInTime) status = "intime";

            // Fetch current record to preserve check-in data
            const { data: currentRecord } = await supabase.from("attendance_records")
                .select("check_in_photo_url, check_in_latitude, check_in_longitude, check_in_location_code, check_in_location_type, check_in_remote_mode, check_in_location_status, check_in_notes")
                .eq("user_id", userId)
                .eq("date", dateStr)
                .maybeSingle();

            const upsertData: any = {
                user_id: userId,
                date: dateStr,
                clock_in: checkInTime.toISOString(),
                clock_out: now.toISOString(),
                status: status,
                total_minutes: totalRegularMinutes,
                overtime_minutes: totalOvertimeMinutes,
                // Preserve check-in data
                check_in_photo_url: currentRecord?.check_in_photo_url || (firstSess.id === lastSession.id ? metadata?.photoUrl : null),
                check_in_latitude: currentRecord?.check_in_latitude,
                check_in_longitude: currentRecord?.check_in_longitude,
                check_in_location_code: currentRecord?.check_in_location_code,
                check_in_location_type: currentRecord?.check_in_location_type,
                check_in_remote_mode: currentRecord?.check_in_remote_mode,
                check_in_location_status: currentRecord?.check_in_location_status,
                check_in_notes: currentRecord?.check_in_notes,
            };

            if (metadata?.photoUrl) {
                upsertData.check_out_photo_url = metadata.photoUrl;
            }

            const { error: recordError } = await (supabase.from("attendance_records") as any).upsert(upsertData, { onConflict: "user_id, date" });
            if (recordError) throw recordError;

            // If overtime detected, also log to overtime_logs for visibility
            if (totalOvertimeMinutes > 0) {
                const existingOT = await supabase.from("overtime_logs")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("date", dateStr)
                    .maybeSingle();

                if (!existingOT.data) {
                    // Calculate overtime start time = clock_in + 8 hours
                    let overtimeStartTime = "17:00";
                    const overtimeStart = new Date(checkInTime.getTime() + regularWorkMinutes * 60 * 1000);
                    overtimeStartTime = overtimeStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

                    await supabase.from("overtime_logs").insert({
                        user_id: userId,
                        date: dateStr,
                        start_time: overtimeStartTime,
                        end_time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                        description: "Auto-logged from clock session",
                        status: "pending"
                    });
                }
            }
        })();
        criticalPromises.push(recordPromise);
    }

    // Await all critical operations and the log
    // We prioritize session/record integrity, log is side effect but we await it so function doesn't return with error swallowed
    const results = await Promise.all([logPromise, ...criticalPromises]);
    for (const result of results) {
        if (result?.error) throw result.error;
    }

    return { success: true };
}

const inFlight = new Set<string>();
export async function writeAdidayaClock(userId: string, type: 'IN' | 'OUT', metadata?: ClockActionMetadata) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.id !== userId) return { error: 'Please sign in to record your own attendance.' };
    if (inFlight.has(userId)) return { error: 'Attendance is being saved. Please wait.' };
    if (!metadata?.photoUrl || !Number.isFinite(metadata.latitude) || !Number.isFinite(metadata.longitude)) return { error: 'A photo and valid location are required.' };
    inFlight.add(userId);
    try { return await legacyClockAction(userId, type, metadata); }
    catch (e) { return { error: 'Attendance could not be fully saved. Refresh your attendance before retrying. ' + (e instanceof Error ? e.message : '') }; }
    finally { inFlight.delete(userId); }
}
