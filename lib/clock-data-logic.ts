import { addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, format, isWeekend, isSameDay, getDaysInMonth, startOfMonth, endOfMonth, isSaturday, isSunday } from "date-fns";
import { HOLIDAYS_2026 } from "./constants/holidays";

export type AttendanceStatus = "ontime" | "intime" | "late" | "absent" | "sick" | "leave" | "weekend" | "holiday";

export interface AttendanceRecord {
    id: string;
    date: string;
    day: string;
    employee: string;
    schedule: string;
    clockIn: string;
    clockOut: string;
    duration: string;
    overtime: string;
    status: AttendanceStatus;
    totalMinutes: number; // For calculation
    overtimeMinutes: number; // For calculation
}

export interface ClockStats {
    totalDaysPresent: number;
    totalDaysAbsent: number;
    totalDaysSick: number;
    totalDaysLeave: number;
    totalDaysLate: number;
    totalOvertimeMatches: number; // Count of days with overtime
    totalOvertimeMinutes: number;
    attendanceScore: number; // KPI 0-100
}



// Helper to format minutes to "8h 30m"
export function formatMinutes(mins: number): string {
    if (mins <= 0) return "-";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}



// Calculate Total Work Days (W) in the current month (excluding Sundays, including Saturdays for now)
function getWorkDaysInMonth(date: Date): number {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    // Filter out Sundays (assuming Mon-Sat work week as per user request)
    // Saturdays ARE included. Sundays are NOT.
    return days.filter(d => !isSunday(d)).length;
}

// Calculate Total Work Hours in Month (Mon-Fri 8h, Sat 5h)
function getTotalWorkHoursInMonth(date: Date): number {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    return days.reduce((acc, d) => {
        if (isSunday(d)) return acc;
        if (isSaturday(d)) return acc + 5;
        return acc + 8;
    }, 0);
}




export interface AdidayaScoreResult {
    attendance_score: number;
    attendance_raw_score: number;
    attendance_quality_category: "Excellent" | "Perfect" | "Very Good" | "Good" | "Fair" | "Poor";
    total_days: number;
    days_present: number;
    late_arrivals: number;
    overtime_hours: number;
    present_points: number;
    late_penalty: number;
    ot_bonus: number;
}

export interface AttendanceConfig {
    late_penalty_per: number;
    late_penalty_cap: number;
    ot_bonus_cap: number;
    ot_target_value: number; // Monthly target OTC hours, e.g. 20h
}

/**
 * Calculates workdays passed so far in the month associated with 'date'.
 * EXCLUDES Sundays and Holidays from the 100% denominator.
 */
export function getWorkDaysPassed(date: Date): number {
    const now = new Date();
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth();

    // Determine the last day to count
    // If current month: count up to today
    // If past month: count up to last day of that month
    // Handle edge case where "now" is in same month
    const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();

    // Last day of the target month
    const daysInMonth = getDaysInMonth(date);

    // Limit is today (if current) or end of month (if past)
    const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;

    let workDays = 0;

    for (let day = 1; day <= limitDay; day++) {
        // Create date object for this specific day
        // Note: Months are 0-indexed in JS Date
        const currentHook = new Date(targetYear, targetMonth, day);

        // 1. Exclude Sundays (0)
        if (currentHook.getDay() === 0) continue;

        // 2. Exclude Holidays
        const dateStr = format(currentHook, "yyyy-MM-dd");
        // Check if this date strings exists in HOLIDAYS_2026 array
        const isHoliday = HOLIDAYS_2026.some(h => h.date === dateStr);

        if (isHoliday) continue;

        workDays++;
    }

    console.log("DEBUG getWorkDaysPassed (Iterative):", {
        targetMonth: `${targetYear}-${targetMonth + 1}`,
        limitDay,
        finalWorkDays: workDays
    });

    return workDays;
}

export function getQualityCategory(rawScore: number): AdidayaScoreResult["attendance_quality_category"] {
    if (rawScore > 100) return "Excellent";
    if (rawScore === 100) return "Perfect";
    if (rawScore >= 85) return "Very Good";
    if (rawScore >= 75) return "Good";
    if (rawScore >= 65) return "Fair";
    return "Poor";
}

export function calculateAdidayaScore(
    records: AttendanceRecord[],
    config: AttendanceConfig,
    referenceDate: Date = new Date(),
    overrideTotalDays?: number
): AdidayaScoreResult {
    // 1. Core Inputs
    const days_present = records.filter(r => ["ontime", "intime", "late"].includes(r.status)).length;
    const late_arrivals = records.filter(r => r.status === "late").length;
    const total_overtime_minutes = records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
    const overtime_hours = total_overtime_minutes / 60;

    // 2. Total Days (Based on days passed OR override)
    const total_days = overrideTotalDays !== undefined ? overrideTotalDays : getWorkDaysPassed(referenceDate);

    // 3. Formula Components
    // A. Present Points
    const present_points = total_days > 0 ? (days_present / total_days) * 100 : 0;

    // B. Late Penalty
    const late_penalty = Math.min(late_arrivals * config.late_penalty_per, config.late_penalty_cap);

    // C. Overtime Bonus
    const ot_bonus = config.ot_target_value > 0
        ? Math.min((overtime_hours / config.ot_target_value) * config.ot_bonus_cap, config.ot_bonus_cap)
        : 0;

    // 4. Raw Score
    const attendance_raw_score = present_points - late_penalty + ot_bonus;

    // 5. Displayed Score (Clamped)
    const attendance_score = Math.max(0, Math.min(100, Math.round(attendance_raw_score)));

    // 6. Quality Category (Derived from RAW)
    const attendance_quality_category = getQualityCategory(attendance_raw_score);

    return {
        attendance_score,
        attendance_raw_score,
        attendance_quality_category,
        total_days,
        days_present,
        late_arrivals,
        overtime_hours,
        present_points: Math.round(present_points * 10) / 10,
        late_penalty: Math.round(late_penalty * 10) / 10,
        ot_bonus: Math.round(ot_bonus * 10) / 10
    };
}

// Keep legacy for compatibility during migration if needed, but we should update callers
export function calculateStats(records: AttendanceRecord[], referenceDate: Date = new Date()): ClockStats {
    // Default config fallback if not provided
    const defaultConfig: AttendanceConfig = {
        late_penalty_per: 2,
        late_penalty_cap: 20,
        ot_bonus_cap: 10,
        ot_target_value: 40 // Default 40h monthly overtime target
    };

    const adidaya = calculateAdidayaScore(records, defaultConfig, referenceDate);

    const stats: ClockStats = {
        totalDaysPresent: adidaya.days_present,
        totalDaysAbsent: Math.max(0, adidaya.total_days - adidaya.days_present),
        totalDaysSick: records.filter(r => r.status === "sick").length,
        totalDaysLeave: records.filter(r => r.status === "leave").length,
        totalDaysLate: adidaya.late_arrivals,
        totalOvertimeMatches: records.filter(r => r.overtimeMinutes > 0).length,
        totalOvertimeMinutes: Math.round(adidaya.overtime_hours * 60),
        attendanceScore: adidaya.attendance_score
    };

    return stats;
}

export function getWeeklyLateCount(records: AttendanceRecord[], employee: string): number {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday

    return records.filter(r => {
        const rDate = new Date(r.date);
        return r.employee === employee &&
            r.status === "late" &&
            rDate >= startOfCurrentWeek;
    }).length;
}
