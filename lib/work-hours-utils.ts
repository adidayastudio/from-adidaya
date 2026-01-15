/**
 * Work Hours Utility Functions
 * 
 * Centralized logic for calculating work hours, overtime, and targets
 * based on day of week:
 * - Monday-Friday: 09:00 - 17:00 (8 hours)
 * - Saturday: 09:00 - 14:00 (5 hours)
 */

export interface WorkHoursConfig {
    startHour: number;      // e.g., 9 (09:00)
    endHour: number;        // e.g., 17 (17:00)
    workMinutes: number;    // e.g., 480 (8 hours)
    isWorkDay: boolean;     // Sunday = false
    dayName: string;
}

/**
 * Get work hours configuration for a given date
 */
export function getWorkHoursConfig(date: Date | string): WorkHoursConfig {
    const d = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

    // Sunday
    if (dayOfWeek === 0) {
        return {
            startHour: 9,
            endHour: 17,
            workMinutes: 0,
            isWorkDay: false,
            dayName: 'Sunday'
        };
    }

    // Saturday
    if (dayOfWeek === 6) {
        return {
            startHour: 9,
            endHour: 14,
            workMinutes: 5 * 60, // 5 hours = 300 minutes
            isWorkDay: true,
            dayName: 'Saturday'
        };
    }

    // Monday - Friday
    return {
        startHour: 9,
        endHour: 17,
        workMinutes: 8 * 60, // 8 hours = 480 minutes
        isWorkDay: true,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
    };
}

/**
 * Calculate target clock-out time based on clock-in time and date
 * Returns MAX(clockIn + workHours, standardEndTime)
 * 
 * Examples for weekdays (8h, end 17:00):
 * - Clock in 08:00 → Target 17:00 (08:00 + 8h = 16:00, but min is 17:00)
 * - Clock in 09:30 → Target 17:30 (09:30 + 8h = 17:30)
 * - Clock in 10:00 → Target 18:00 (10:00 + 8h = 18:00)
 * 
 * Examples for Saturday (5h, end 14:00):
 * - Clock in 09:00 → Target 14:00 (09:00 + 5h = 14:00)
 * - Clock in 10:00 → Target 15:00 (10:00 + 5h = 15:00)
 */
export function calculateTargetTime(clockInTime: Date | string, date?: Date | string): Date {
    const clockIn = typeof clockInTime === 'string' ? new Date(clockInTime) : clockInTime;
    const dateForConfig = date || clockIn;
    const config = getWorkHoursConfig(dateForConfig);

    // Calculate clockIn + workHours
    const clockInPlusWork = new Date(clockIn.getTime() + config.workMinutes * 60 * 1000);

    // Create standard end time for that day
    const standardEnd = new Date(clockIn);
    standardEnd.setHours(config.endHour, 0, 0, 0);

    // Return MAX of the two
    return clockInPlusWork > standardEnd ? clockInPlusWork : standardEnd;
}

/**
 * Format target time as HH:MM string
 */
export function formatTargetTime(clockInTime: Date | string | null, date?: Date | string): string {
    if (!clockInTime) return "--:--";
    const target = calculateTargetTime(clockInTime, date);
    return target.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Check if current time is in overtime period
 */
export function isOvertime(currentTime: Date, startTime: Date | null): boolean {
    if (!startTime) return false;
    const target = calculateTargetTime(startTime, currentTime);
    return currentTime > target;
}

/**
 * Calculate overtime start time (when overtime begins)
 * This is the same as target time
 */
export function getOvertimeStart(clockInTime: Date | string, date?: Date | string): Date {
    return calculateTargetTime(clockInTime, date);
}

/**
 * Format overtime start time as HH:MM string
 */
export function formatOvertimeStart(clockInTime: Date | string | null, date?: Date | string): string {
    return formatTargetTime(clockInTime, date);
}

/**
 * Get the standard end time for a given date (17:00 for weekdays, 14:00 for Saturday)
 */
export function getStandardEndTime(date: Date | string): string {
    const config = getWorkHoursConfig(date);
    return `${config.endHour.toString().padStart(2, '0')}:00`;
}

/**
 * Get work minutes for a given date
 */
export function getWorkMinutes(date: Date | string): number {
    return getWorkHoursConfig(date).workMinutes;
}

/**
 * Check if a date is Saturday
 */
export function isSaturday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getDay() === 6;
}

/**
 * Check if a date is Sunday
 */
export function isSundayDay(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getDay() === 0;
}

/**
 * Get shift schedule display string for a given date
 */
export function getShiftSchedule(date?: Date | string): string {
    const d = date || new Date();
    const config = getWorkHoursConfig(d);

    if (!config.isWorkDay) {
        return "Off Day";
    }

    return `09:00 - ${config.endHour.toString().padStart(2, '0')}:00`;
}
