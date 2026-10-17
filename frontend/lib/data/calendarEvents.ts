import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOLIDAYS_2026 } from '@/lib/constants/holidays';

export type CalendarEventType =
    | 'public_holiday'
    | 'joint_leave'
    | 'company_special'
    | 'birthday'
    | 'work_exception';

export type CalendarEventSource = 'forma' | 'company' | 'people';

export type JointLeaveStatus = 'applied' | 'ignored' | 'overridden';

export interface CalendarEventItem {
    id: string;
    title: string; // English / Primary name
    subtitleId?: string; // Indonesian name
    date: string; // YYYY-MM-DD
    originalDate?: string; // Original input date (e.g. birth date with real birth year)
    endDate?: string; // for multi-day events
    type: CalendarEventType;
    source: CalendarEventSource;
    jointLeaveStatus?: JointLeaveStatus;
    isRecurring?: boolean;
    description?: string;
    timeOverride?: {
        startTime: string; // HH:mm
        endTime: string;   // HH:mm
        breakMinutes?: number;
    };
    personName?: string;
    personId?: string;
    personAvatar?: string;
    personRole?: string;
    createdAt?: string;
    color?: string;
}

// Indicator colors
export const CALENDAR_CATEGORY_COLORS: Record<CalendarEventType, string> = {
    public_holiday: '#FF3B30',  // Red
    joint_leave: '#AF52DE',     // Purple
    company_special: '#30B0C7', // Fallback Teal (overridden by tenant brand color)
    birthday: '#007AFF',        // Brand Blue
    work_exception: '#FF9500',  // Amber
};

export function getCalendarCategoryColor(type: CalendarEventType, tenantBrandColor?: string | null): string {
    if (type === 'company_special' && tenantBrandColor) {
        return tenantBrandColor;
    }
    return CALENDAR_CATEGORY_COLORS[type] || '#007AFF';
}

export const CALENDAR_CATEGORY_LABELS: Record<CalendarEventType, string> = {
    public_holiday: 'Public Holiday',
    joint_leave: 'Joint Leave',
    company_special: 'Company Special',
    birthday: 'Birthday',
    work_exception: 'Work Exception',
};

export const CALENDAR_CATEGORY_ICONS: Record<CalendarEventType, string> = {
    public_holiday: 'flag.fill',
    joint_leave: 'calendar.badge.clock',
    company_special: 'building.2.fill',
    birthday: 'gift.fill',
    work_exception: 'clock.fill',
};

export const CALENDAR_SOURCE_LABELS: Record<CalendarEventSource, string> = {
    forma: 'Managed by Forma',
    company: 'Company Created',
    people: 'From People',
};

export function formatFullCalendarDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${day} ${MONTHS[month - 1]} ${year}`;
}

// Seed Forma Master Calendar from HOLIDAYS_2026
export function getFormaMasterEvents(): CalendarEventItem[] {
    return HOLIDAYS_2026.map((h, index) => {
        const isJoint = h.type === 'collective_leave';
        const cleanNameId = h.nameId
            .replace(/^Libur Nasional:\s*/i, '')
            .replace(/^Cuti Bersama:\s*/i, '');

        return {
            id: `forma-${h.date}-${index}`,
            title: h.nameEn,
            subtitleId: cleanNameId,
            date: h.date,
            type: isJoint ? 'joint_leave' : 'public_holiday',
            source: 'forma',
            jointLeaveStatus: isJoint ? 'applied' : undefined,
            isRecurring: h.date === '2026-01-01' || h.date === '2026-05-01' || h.date === '2026-08-17' || h.date === '2026-12-25',
        };
    });
}

// Default Company Special Dates Sample
// Empty by default (no mockup data)
export const DEFAULT_COMPANY_SPECIAL_DATES: CalendarEventItem[] = [];

const STORAGE_KEYS = {
    COMPANY_EVENTS: 'calendar_company_custom_events_v2',
    JOINT_LEAVE_OVERRIDES: 'calendar_joint_leave_overrides_v2',
};

// Storage getters and setters
export async function getCompanyCalendarEvents(): Promise<CalendarEventItem[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPANY_EVENTS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('[CalendarEvents] Failed to load company events', e);
    }
    return DEFAULT_COMPANY_SPECIAL_DATES;
}

export async function saveCompanyCalendarEvents(events: CalendarEventItem[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.COMPANY_EVENTS, JSON.stringify(events));
    } catch (e) {
        console.error('[CalendarEvents] Failed to save company events', e);
        throw e;
    }
}

export async function getJointLeaveOverrides(): Promise<Record<string, JointLeaveStatus>> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.JOINT_LEAVE_OVERRIDES);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('[CalendarEvents] Failed to load joint leave overrides', e);
    }
    return {};
}

export async function saveJointLeaveOverrides(overrides: Record<string, JointLeaveStatus>): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.JOINT_LEAVE_OVERRIDES, JSON.stringify(overrides));
    } catch (e) {
        console.error('[CalendarEvents] Failed to save joint leave overrides', e);
        throw e;
    }
}

// Convert People Directory Profiles into Birthday Events with age calculation for the target year (e.g. 2026)
export function getBirthdaysFromProfiles(profiles: any[], year: number = 2026): CalendarEventItem[] {
    const events: CalendarEventItem[] = [];

    profiles.forEach((p) => {
        const rawDob = p.birth_date || p.birthday || p.date_of_birth || p.dob;
        if (!rawDob) return;

        let birthYear = 0;
        let month = 0;
        let day = 0;

        if (rawDob instanceof Date && !isNaN(rawDob.getTime())) {
            birthYear = rawDob.getFullYear();
            month = rawDob.getMonth() + 1;
            day = rawDob.getDate();
        } else if (typeof rawDob === 'string') {
            const cleanStr = rawDob.trim().split('T')[0]; // strip time if ISO
            const parts = cleanStr.split(/[-/.]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    birthYear = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                    day = parseInt(parts[2], 10);
                } else if (parts[2].length === 4) {
                    // DD-MM-YYYY
                    birthYear = parseInt(parts[2], 10);
                    month = parseInt(parts[1], 10);
                    day = parseInt(parts[0], 10);
                }
            } else if (parts.length === 2) {
                month = parseInt(parts[0], 10);
                day = parseInt(parts[1], 10);
            }
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const cleanMonth = String(month).padStart(2, '0');
            const cleanDay = String(day).padStart(2, '0');
            const eventDate = `${year}-${cleanMonth}-${cleanDay}`;
            const age = birthYear > 0 ? year - birthYear : null;
            const ageSubtitle = age !== null && age > 0 ? `Turning ${age} years old` : undefined;

            events.push({
                id: `birthday-profile-${p.id || p.email || Math.random()}`,
                title: `${p.full_name || p.name || 'Team Member'}'s Birthday`,
                subtitleId: ageSubtitle,
                date: eventDate,
                type: 'birthday',
                source: 'people',
                isRecurring: true,
                personId: p.id,
                personName: p.full_name || p.name || 'Team Member',
                personAvatar: p.avatar_url,
                personRole: p.job_title || p.role || 'Member',
            });
        }
    });

    return events;
}
