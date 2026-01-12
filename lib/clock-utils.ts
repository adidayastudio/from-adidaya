/**
 * Clock Utilities
 * Provides helper functions for time calculations in the Clock module.
 */

export interface WorkDurationResult {
    totalMinutes: number;
    overtimeMinutes: number;
    isLate: boolean;
    lateMinutes: number;
}

/**
 * Calculates work duration and overtime.
 * 
 * Rules:
 * - Standard work day: 8 hours (480 minutes)
 * - Lunch break: 12:00-13:00 (60 minutes) - excluded from work time
 * - Overtime: Any time worked beyond 8 hours
 * 
 * @param clockIn - Clock in time string (HH:MM format)
 * @param clockOut - Clock out time string (HH:MM format)
 * @param scheduleStart - Schedule start time (default: "09:00")
 * @returns WorkDurationResult with total work minutes, overtime, and lateness info
 */
export function calculateWorkDuration(
    clockIn: string,
    clockOut: string,
    scheduleStart: string = "09:00"
): WorkDurationResult {
    // Parse times
    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const [schedH, schedM] = scheduleStart.split(":").map(Number);

    // Convert to minutes from midnight
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    const scheduleMinutes = schedH * 60 + schedM;

    // Lunch break boundaries (12:00-13:00)
    const lunchStart = 12 * 60; // 720
    const lunchEnd = 13 * 60;   // 780
    const lunchDuration = 60;

    // Calculate raw duration
    let rawMinutes = outMinutes - inMinutes;

    // Subtract lunch break if work spans across it
    const workedThroughLunch = inMinutes < lunchEnd && outMinutes > lunchStart;
    if (workedThroughLunch) {
        // Calculate overlap with lunch
        const lunchOverlapStart = Math.max(inMinutes, lunchStart);
        const lunchOverlapEnd = Math.min(outMinutes, lunchEnd);
        const lunchOverlap = Math.max(0, lunchOverlapEnd - lunchOverlapStart);
        rawMinutes -= lunchOverlap;
    }

    // Ensure non-negative
    const totalMinutes = Math.max(0, rawMinutes);

    // Overtime calculation (> 8 hours = > 480 minutes)
    const standardWorkMinutes = 480;
    const overtimeMinutes = Math.max(0, totalMinutes - standardWorkMinutes);

    // Lateness calculation
    const isLate = inMinutes > scheduleMinutes;
    const lateMinutes = isLate ? inMinutes - scheduleMinutes : 0;

    return {
        totalMinutes,
        overtimeMinutes,
        isLate,
        lateMinutes,
    };
}

/**
 * Formats minutes into human-readable duration string.
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "8h 15m" or "45m")
 */
export function formatDuration(minutes: number): string {
    if (minutes <= 0) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
