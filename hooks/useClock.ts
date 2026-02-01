import { useState, useEffect, useCallback, useMemo } from "react";
import useUserProfile from "./useUserProfile";
import { createClient } from "@/utils/supabase/client";
import * as clockApi from "@/lib/api/clock";
import { isOvertime as isOvertimeCheck } from "@/lib/work-hours-utils";

export function useClock() {
    const { profile } = useUserProfile();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    const checkActiveSession = useCallback(async () => {
        if (!profile?.id) {
            // If we don't have a profile yet, we can't check session.
            // But if useUserProfile is loading, we should probably stay loading.
            // However, useUserProfile is now optimistic, so we should have an ID fast.
            // If ID is missing after load, it means not logged in or error.
            return;
        }

        try {
            // Use local YYYY-MM-DD to match api/clock.ts logic and avoid UTC mismatch around midnight
            const dateStr = new Date().toLocaleDateString('en-CA');

            // Try new sessions table first, fallback to old records table
            let { data, error } = await supabase
                .from("attendance_sessions")
                .select("id, clock_in, clock_out, session_number")
                .eq("user_id", profile.id)
                .eq("date", dateStr)
                .is("clock_out", null)
                .maybeSingle();

            // Fallback to attendance_records if sessions table doesn't exist
            if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
                const fallback = await supabase
                    .from("attendance_records")
                    .select("clock_in, clock_out")
                    .eq("user_id", profile.id)
                    .eq("date", dateStr)
                    .maybeSingle();

                if (fallback.data && fallback.data.clock_in && !fallback.data.clock_out) {
                    setIsCheckedIn(true);
                    setStartTime(new Date(fallback.data.clock_in));
                } else {
                    setIsCheckedIn(false);
                    setStartTime(null);
                }
                return;
            }

            if (error) {
                console.error("❌ Error checking active session:", error.message);
                return;
            }

            if (data && data.clock_in) {
                setIsCheckedIn(true);
                setStartTime(new Date(data.clock_in));
            } else {
                setIsCheckedIn(false);
                setStartTime(null);
            }
        } catch (error) {
            console.error("Error in checkActiveSession:", error);
        } finally {
            setLoading(false);
        }
    }, [profile?.id, supabase]);

    useEffect(() => {
        checkActiveSession();
    }, [checkActiveSession]);

    const handleClock = useCallback(async (metadata?: clockApi.ClockActionMetadata) => {
        if (!profile?.id) return;

        setLoading(true);
        try {
            const type = isCheckedIn ? "OUT" : "IN";
            await clockApi.clockAction(profile.id, type, metadata);
            // Refresh state
            await checkActiveSession();
        } catch (error) {
            console.error("Error toggling clock:", error);
            setLoading(false); // Ensure we stop loading on error
        }
    }, [profile?.id, isCheckedIn, checkActiveSession]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isCheckedIn && startTime) {
            const updateElapsed = () => {
                const now = new Date();
                setElapsed(Math.floor((now.getTime() - startTime.getTime()) / 1000));
            };

            updateElapsed();
            interval = setInterval(updateElapsed, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [isCheckedIn, startTime]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getStatus = () => {
        if (!startTime) return "on-time";

        const now = new Date();

        // Check arrival status first
        const limitOnTime = new Date(startTime);
        limitOnTime.setHours(9, 1, 0, 0); // 09:01:00

        const limitInTime = new Date(startTime);
        limitInTime.setHours(9, 16, 0, 0); // 09:16:00

        // Check for overtime using dynamic calculation based on day of week
        // Uses work-hours-utils: Mon-Fri target = MAX(startTime+8h, 17:00), Sat target = MAX(startTime+5h, 14:00)
        if (isOvertimeCheck(now, startTime)) {
            return "overtime";
        }

        // Check arrival status
        if (startTime < limitOnTime) return "on-time";
        if (startTime < limitInTime) return "intime";
        return "late";
    }

    const status = getStatus();

    return { isCheckedIn, startTime, elapsed, toggleClock: handleClock, formatTime, status, refresh: checkActiveSession, loading };
}

