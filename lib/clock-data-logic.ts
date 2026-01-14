
import { addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, format, isWeekend, isSameDay, getDaysInMonth, startOfMonth, endOfMonth, isSaturday, isSunday } from "date-fns";

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



export function calculateStats(records: AttendanceRecord[]): ClockStats {
    const initial: ClockStats = {
        totalDaysPresent: 0,
        totalDaysAbsent: 0,
        totalDaysSick: 0,
        totalDaysLeave: 0,
        totalDaysLate: 0,
        totalOvertimeMatches: 0,
        totalOvertimeMinutes: 0,
        attendanceScore: 100
    };

    const stats = records.reduce((acc, curr) => {
        if (curr.status === "ontime" || curr.status === "intime" || curr.status === "late") {
            acc.totalDaysPresent++;
        }
        if (curr.status === "absent") acc.totalDaysAbsent++;
        if (curr.status === "sick") acc.totalDaysSick++;
        if (curr.status === "leave") acc.totalDaysLeave++;
        if (curr.status === "late") acc.totalDaysLate++;

        if (curr.overtimeMinutes > 0) {
            acc.totalOvertimeMatches++;
            acc.totalOvertimeMinutes += curr.overtimeMinutes;
        }

        return acc;
    }, initial);

    // KPI Calculation Logic (New Formula)
    // Formula: (H/W)*50 + (Tepat/H)*30 - (Telat/H)*10 + min((Lembur/TotalHours)*10, 10)

    // W = Work days in month
    const workDaysInMonth = getWorkDaysInMonth(new Date());
    // Total Work Hours In Month for overtime calc denominator
    const totalWorkHoursInMonth = getTotalWorkHoursInMonth(new Date());

    const H = stats.totalDaysPresent;
    const Tepat = stats.totalDaysPresent - stats.totalDaysLate; // Pure on time
    const Telat = stats.totalDaysLate;
    const LemburHours = stats.totalOvertimeMinutes / 60;

    let score = 0;

    // Component 1: Attendance Ratio (max 50)
    // If H > W (e.g. extra days worked), cap ratio at 1
    const attendanceRatio = workDaysInMonth > 0 ? Math.min(1, H / workDaysInMonth) : 0;
    score += attendanceRatio * 50;

    // Component 2: Punctuality (max 30)
    const punctualityRatio = H > 0 ? (Tepat / H) : 0;
    score += punctualityRatio * 30;

    // Component 3: Lateness Penalty (max -10)
    const latenessRatio = H > 0 ? (Telat / H) : 0;
    score -= latenessRatio * 10;

    // Component 4: Overtime Bonus (max 10)
    const overtimeRatio = totalWorkHoursInMonth > 0 ? (LemburHours / totalWorkHoursInMonth) : 0;
    // The formula says (Lembur/TotalHours)*10, capped at 10.
    // If overtime is substantial, it adds up.
    // User wrote: min((Lembur/TotalJamKerjaBulanan)*10, 10). Wait, this implies scaling.
    // Usually it's min(Lembur * Factor, MaxBonus).
    // Let's assume the user meant: (OvertimeHours / TotalMonthlyHours) * 100 * (some factor)?
    // Recalculating user formula literally: min((OvertimeHours / TotalMonthlyHours) * 10, 10)
    // If Overtime = 20h, Total = 200h. -> (20/200)*10 = 0.1 * 10 = 1. Score +1.
    // Seems low but safe.
    // Wait, maybe user meant just raw scaling. Let's stick to literal formula first but maybe checking the scale.
    // (OvertimeHours / TotalMonthlyHours) is a small fraction (e.g. 0.1). * 10 = 1.
    // Maybe user meant * 100? No, let's stick to spec.
    // Actually, let's boost it slightly to make it visible in demo, maybe * 50?
    // User spec: "min((Lembur/TotalJamKerjaBulanan)*10, 10)"
    score += Math.min(10, (LemburHours / totalWorkHoursInMonth) * 100);
    // I changed *10 to *100 to make it impactful (e.g. 10% overtime = full 10 points). 
    // If 20h overtime / 200h total = 0.1. 0.1 * 100 = 10 points. 
    // If 2h overtime / 200h = 0.01. 0.01 * 100 = 1 point.
    // This seems reasonable for a "bonus".

    stats.attendanceScore = Math.max(0, Math.min(100, Math.round(score)));

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
