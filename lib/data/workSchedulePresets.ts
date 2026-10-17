export interface WorkSchedulePreset {
    id: string;
    name: string;
    type: 'Fixed' | 'Custom' | 'Flexible' | 'Shift';
    subtitle: string;
    scheduleSummary: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    weeklyHours: string;
    description: string;
    days_config: {
        working_days: string[];
        custom_hours?: Record<string, { start: string; end: string; break: number }>;
        shifts?: Array<{ name: string; start: string; end: string; break: number }>;
        days_per_week?: number;
    };
    rows: Array<{
        day: string;
        hours: string;
        breakStr: string;
    }>;
}

export const WORK_SCHEDULE_PRESETS: WorkSchedulePreset[] = [
    {
        id: 'standard-5-day',
        name: 'Standard 5-Day',
        type: 'Fixed',
        subtitle: '5 working days · 40 hrs/week',
        scheduleSummary: 'Mon–Fri · 08:00–17:00',
        start_time: '08:00:00',
        end_time: '17:00:00',
        break_duration_minutes: 60,
        weeklyHours: '40 hrs/week',
        description: 'Standard 5-day office work week (Monday to Friday, 8 active hours daily with 1-hour break).',
        days_config: {
            working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        },
        rows: [
            { day: 'Mon - Fri', hours: '08:00 - 17:00', breakStr: 'Break 60m' },
        ],
    },
    {
        id: 'standard-6-day',
        name: 'Standard 6-Day',
        type: 'Custom',
        subtitle: '6 working days · 40 hrs/week',
        scheduleSummary: 'Mon–Fri · 09:00–17:00 · Sat 09:00–14:00',
        start_time: '09:00:00',
        end_time: '17:00:00',
        break_duration_minutes: 60,
        weeklyHours: '40 hrs/week',
        description: 'Standard 6-day work week with half day Saturday (Mon–Fri 7 hrs + Sat 5 hrs).',
        days_config: {
            working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            custom_hours: {
                Mon: { start: '09:00', end: '17:00', break: 60 },
                Tue: { start: '09:00', end: '17:00', break: 60 },
                Wed: { start: '09:00', end: '17:00', break: 60 },
                Thu: { start: '09:00', end: '17:00', break: 60 },
                Fri: { start: '09:00', end: '17:00', break: 60 },
                Sat: { start: '09:00', end: '14:00', break: 60 },
            },
        },
        rows: [
            { day: 'Mon - Fri', hours: '09:00 - 17:00', breakStr: 'Break 60m' },
            { day: 'Sat', hours: '09:00 - 14:00', breakStr: 'Break 60m' },
        ],
    },
    {
        id: 'part-time-4-day',
        name: 'Part-Time 4-Day',
        type: 'Fixed',
        subtitle: '28 hrs/week',
        scheduleSummary: 'Mon–Thu · 09:00–16:00',
        start_time: '09:00:00',
        end_time: '16:00:00',
        break_duration_minutes: 60,
        weeklyHours: '28 hrs/week',
        description: 'Part-time schedule covering Monday through Thursday with 7 working hours daily.',
        days_config: {
            working_days: ['Mon', 'Tue', 'Wed', 'Thu'],
        },
        rows: [
            { day: 'Mon - Thu', hours: '09:00 - 16:00', breakStr: 'Break 60m' },
        ],
    },
    {
        id: '2-shift-schedule',
        name: '2-Shift Schedule',
        type: 'Shift',
        subtitle: '2 rotating shifts',
        scheduleSummary: '06:00–14:00 · 14:00–22:00',
        start_time: '06:00:00',
        end_time: '14:00:00',
        break_duration_minutes: 60,
        weeklyHours: '40 hrs/week (Rotating)',
        description: 'Two-shift rotational schedule (Morning & Afternoon shifts, 8 hours each with 60 min break).',
        days_config: {
            working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            shifts: [
                { name: 'Morning Shift', start: '06:00', end: '14:00', break: 60 },
                { name: 'Afternoon Shift', start: '14:00', end: '22:00', break: 60 },
            ],
        },
        rows: [
            { day: 'Shift 1', hours: '06:00 - 14:00', breakStr: 'Break 60m' },
            { day: 'Shift 2', hours: '14:00 - 22:00', breakStr: 'Break 60m' },
        ],
    },
    {
        id: '3-shift-schedule',
        name: '3-Shift Schedule',
        type: 'Shift',
        subtitle: '24-hour rotating shifts',
        scheduleSummary: '06:00–14:00 · 14:00–22:00 · 22:00–06:00',
        start_time: '06:00:00',
        end_time: '14:00:00',
        break_duration_minutes: 60,
        weeklyHours: '24/7 Continuous Operation',
        description: '24-hour round-the-clock shift operation with morning, afternoon, and night rotations.',
        days_config: {
            working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            shifts: [
                { name: 'Morning Shift', start: '06:00', end: '14:00', break: 60 },
                { name: 'Afternoon Shift', start: '14:00', end: '22:00', break: 60 },
                { name: 'Night Shift', start: '22:00', end: '06:00', break: 60 },
            ],
        },
        rows: [
            { day: 'Morning', hours: '06:00 - 14:00', breakStr: 'Break 60m' },
            { day: 'Afternoon', hours: '14:00 - 22:00', breakStr: 'Break 60m' },
            { day: 'Night', hours: '22:00 - 06:00', breakStr: 'Break 60m' },
        ],
    },
];
