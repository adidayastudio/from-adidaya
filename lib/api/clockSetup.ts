import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type EndTimeBehavior = 'fixed_schedule' | 'extend_duration' | 'flexible_duration';

export interface AttendanceRuleConfig {
    onTimeAllowanceMinutes: number;      // default: 5 min
    lateToleranceMinutes: number;         // default: 15 min
    earlyLeaveToleranceMinutes: number;   // default: 10 min
    halfDayMinHours: number;              // default: 4 (hours)
    halfDayMinMinutes: number;           // default: 0 (minutes)
    clockInBeforeScheduleMinutes: number;// default: 60 min
    endTimeBehavior: EndTimeBehavior;    // 'fixed_schedule' | 'extend_duration' | 'flexible_duration'
    fullDayMinHours: number;             // default: 8
    breakDurationMinutes?: number;       // default: 60 min (break does not count as working hours)
    timeRoundingMinutes: number;
    requireClockInSelfie: boolean;
    requireClockOutSelfie: boolean;
    requireLocationVerification: boolean;// default: true
    allowManualTimeAdjustment: boolean;
    maxAdjustmentDays: number;
    missingClockInPolicy: 'half_day' | 'absent' | 'manager_approval';
    missingClockOutAction: 'incomplete' | 'auto_shift_end' | 'mark_absent'; // default: 'incomplete'
    earlyLeaveAction: 'mark_auto' | 'require_reason' | 'ignore';           // default: 'mark_auto'
    insufficientHoursAction: 'half_day' | 'incomplete';                   // default: 'half_day'
}

export interface WorkLocationItem {
    id: string;
    name: string;
    type: 'headquarters' | 'branch' | 'project_site' | 'client_office' | 'warehouse' | 'remote_hub' | string;
    code: string; // 3-letter uppercase Location Code e.g. HQ1, SBY, PSA
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isActive: boolean;
    isDefault?: boolean;
    gmapsUrl?: string;
}

export interface CompanyHolidayItem {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    type: 'national' | 'collective' | 'company';
    isRecurring: boolean;
}

export type ShiftMode = 'no_shift' | '2_shift' | '3_shift' | 'custom';
export type ShiftRotation = 'weekly' | 'biweekly' | 'monthly' | 'custom_days';
export type ShiftAppliesTo = 'all_employees' | 'department' | 'position' | 'level' | 'employment_type' | 'specific_employees';

export interface ShiftPatternItem {
    id: string;
    name: string;
    mode: ShiftMode;
    sourceScheduleId?: string; // FK → work_schedules.id
    sourceScheduleName?: string; // denormalized for display
    shifts: Array<{
        name: string;
        startTime: string; // HH:mm
        endTime: string;   // HH:mm
        crossesMidnight: boolean;
        color: string;
    }>;
    rotation: ShiftRotation;
    rotationDays?: number; // for custom_days
    workDays: string[]; // ['Mon','Tue',...]
    restDays: string[]; // ['Sat','Sun',...]
    appliesTo: ShiftAppliesTo;
    appliesToValues: string[]; // dept IDs, position IDs, employee IDs, etc
    appliesToDisplay: string; // e.g. "Operations, Security"
    isActive: boolean;
}

export interface OvertimeConfig {
    maxDailyOvertimeHours: number;
    maxDailyOvertimeMinutes: number;
    maxWeeklyOvertimeHours: number;
    maxWeeklyOvertimeMinutes: number;
    minOvertimeThresholdMinutes: number;
    rateMultiplierFirstHour: number;
    rateMultiplierSubsequent: number;
    holidayRateMultiplier: number;
    requireOvertimeRequest: boolean;
    requireApproval: boolean;
    requireSplDocument?: boolean;
    splAttachmentMode?: 'required' | 'optional' | 'disabled';
}

export interface TransportFlightPolicy {
    enabled: boolean;
    minDistanceKm: number; // e.g. 150 km, 0 for any, 9999 for inter-island
    classAllowance: 'economy' | 'premium_economy' | 'business';
    receiptMode: 'required' | 'optional' | 'disabled';
}

export interface TransportTrainPolicy {
    enabled: boolean;
    classAllowance: 'executive_economy' | 'economy_only' | 'any';
    receiptMode: 'required' | 'optional' | 'disabled';
}

export interface TransportCarPolicy {
    enabled: boolean;
    reimbursementModel: 'mileage' | 'at_cost';
    mileageRatePerKm: number; // e.g. 2500 IDR/km
    tollParkingReimbursable: boolean;
    receiptMode: 'required' | 'optional' | 'disabled';
}

export interface TransportMotorPolicy {
    enabled: boolean;
    mileageRatePerKm: number; // e.g. 1200 IDR/km
    receiptMode: 'required' | 'optional' | 'disabled';
}

export interface TransportRideHailingPolicy {
    enabled: boolean;
    dailyCap: number; // e.g. 150000 IDR/day, 0 for no cap
    receiptMode: 'required' | 'optional' | 'disabled';
}

export interface TransportModesConfig {
    flight: TransportFlightPolicy;
    train: TransportTrainPolicy;
    car: TransportCarPolicy;
    motorcycle: TransportMotorPolicy;
    rideHailing: TransportRideHailingPolicy;
}

export interface BusinessTripConfig {
    // 1. Trip Request
    requireTripRequest: boolean;
    requireApproval: boolean;
    minAdvanceNoticeDays: number;

    // 2. Daily Allowance
    enableDailyAllowance: boolean;
    perDiemDailyRate: number;
    requireDailyAllowanceApproval: boolean;
    dailyAllowanceClaimMode?: 'automatic' | 'separate_claim' | 'manager_discretion';

    // 3. Transportation Modes & Finance Rules
    allowedTransportModes: 'all' | 'land_only' | 'public_flight' | 'company_fleet' | 'custom';
    transportModes: TransportModesConfig;
    minFlightDistanceKm: number;
    mileageRatePerKm: number;
    transportReceiptMode: 'required' | 'optional' | 'disabled';
    requireReceipt?: boolean;

    // 4. Lodging / Accommodation
    maxLodgingRatePerNight: number;
    lodgingReceiptMode: 'required' | 'optional' | 'disabled';
    requireTicketAttachment: boolean;
    requireHotelAttachment: boolean;
    allowCashAdvance: boolean;
    advanceMaxPercentage: number;

    // 5. Attendance During Trip
    allowOutsideGeofence: boolean;
    useDestinationAsValidLocation: boolean;
    requireGpsVerification: boolean;
    requireSelfie: boolean;
}

export interface AntiFraudConfig {
    blockMockGps: boolean;
    minGpsAccuracyMeters: number; // e.g. 20, 50, 100, 200, 0 (disabled)
    validateGeofence: boolean;
    enableFaceVerification: boolean; // Face liveness check
    faceMatchVerification: boolean;  // Match selfie with profile photo
    preventRepeatedSelfie: boolean;  // Repeated selfie detection
    enforceDeviceBinding: boolean;   // Limit to registered devices
    maxRegisteredDevicesPerUser: number; // e.g. 1, 2, 3, 0 (unlimited)
    requireNewDeviceVerification: boolean;
    logGpsOutOfRange: boolean;
}

export type AttendancePeriodMode = 'cutoff' | 'calendar_month' | 'workday';
export type PayrollCycleType = 'monthly' | 'weekly' | 'biweekly' | 'semimonthly';
export type WeekdayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AttendancePeriodConfig {
    cutoffDayStart: number; // e.g. 21
    cutoffDayEnd: number;   // e.g. 20
    timezone: string;       // Asia/Jakarta, Asia/Makassar, Asia/Jayapura, etc.
    calculationMode?: AttendancePeriodMode; // 'cutoff' | 'calendar_month' | 'workday'
    cycleType?: PayrollCycleType;           // 'monthly' | 'weekly' | 'biweekly' | 'semimonthly'
    startWeekday?: WeekdayName;             // for weekly / biweekly
    endWeekday?: WeekdayName;               // for weekly / biweekly
}

export interface NotificationSettingsConfig {
    clockInReminderMinutesBefore: number;
    clockOutReminderMinutesAfter: number;
    notifyManagerOnLate: boolean;
    notifyManagerOnOutOfRange: boolean;
    weeklyDigestEnabled: boolean;
}

export type RetentionPreset =
    | '7_days'
    | '30_days'
    | '90_days'
    | '180_days'
    | '1_year'
    | 'custom'
    | 'never';

export type RetentionUnit = 'days' | 'months' | 'years';

export interface RetentionSetting {
    preset: RetentionPreset;
    customValue?: number;
    customUnit?: RetentionUnit;
}

export interface PrivacyRetentionConfig {
    locationRetention: RetentionSetting;
    photoRetention: RetentionSetting;
    auditLogRetention: RetentionSetting;
    purgeGpsAfterDays?: number;
    anonymizeLocationHistory?: boolean;
    retentionAuditLogDays?: number;
}

export function formatRetentionSettingDisplay(setting?: RetentionSetting): string {
    if (!setting) return '90 Days';
    switch (setting.preset) {
        case '7_days':
            return '7 Days';
        case '30_days':
            return '30 Days';
        case '90_days':
            return '90 Days';
        case '180_days':
            return '180 Days';
        case '1_year':
            return '1 Year';
        case 'never':
            return 'Never Delete';
        case 'custom': {
            const val = setting.customValue || 1;
            const unit = setting.customUnit || 'days';
            if (unit === 'years') return `${val} ${val === 1 ? 'Year' : 'Years'}`;
            if (unit === 'months') return `${val} ${val === 1 ? 'Month' : 'Months'}`;
            return `${val} ${val === 1 ? 'Day' : 'Days'}`;
        }
        default:
            return '90 Days';
    }
}


// ==========================================
// Approval Flows Types & Defaults
// ==========================================
export type ApprovalRequestType = 'all' | 'leave' | 'overtime' | 'business_trip' | 'attendance_correction';

export type ApproverType = 'role' | 'position' | 'employee';

export type RoleApproverKey = 'direct_manager' | 'department_head' | 'owner';

export interface ApprovalStep {
    id: string;
    level: number;
    type: ApproverType;
    roleKey?: RoleApproverKey;
    positionId?: string;
    positionName?: string;
    userId?: string;
    userName?: string;
    userAvatar?: string;
    label: string;
}

export interface ApprovalOverride {
    id: string;
    departmentId: string;
    targetType: 'position' | 'employee';
    targetId: string; // positionId or userId
    targetName: string; // position name or employee full name
    targetAvatar?: string;
    requestType: ApprovalRequestType;
    chain: ApprovalStep[];
    createdAt?: string;
    updatedAt?: string;
}

export interface DepartmentApprovalFlow {
    id: string;
    departmentId: string;
    departmentName: string;
    requestType?: ApprovalRequestType;
    chain: ApprovalStep[];
    overrides: ApprovalOverride[];
}

export interface ApprovalWorkflowsConfig {
    departments: DepartmentApprovalFlow[];
    defaultChain: ApprovalStep[];
}

export const DEFAULT_APPROVAL_STEPS: ApprovalStep[] = [
    {
        id: 'step-role-dm',
        level: 1,
        type: 'role',
        roleKey: 'direct_manager',
        label: 'Direct Manager',
    },
    {
        id: 'step-role-dh',
        level: 2,
        type: 'role',
        roleKey: 'department_head',
        label: 'Department Head',
    },
];

export const DEFAULT_APPROVAL_WORKFLOWS: ApprovalWorkflowsConfig = {
    departments: [],
    defaultChain: DEFAULT_APPROVAL_STEPS,
};

// Default states
export const DEFAULT_ATTENDANCE_RULES: AttendanceRuleConfig = {
    onTimeAllowanceMinutes: 5,
    lateToleranceMinutes: 15,
    earlyLeaveToleranceMinutes: 10,
    halfDayMinHours: 4,
    halfDayMinMinutes: 0,
    clockInBeforeScheduleMinutes: 60,
    endTimeBehavior: 'fixed_schedule',
    fullDayMinHours: 8,
    breakDurationMinutes: 60,
    timeRoundingMinutes: 0,
    requireClockInSelfie: true,
    requireClockOutSelfie: false,
    requireLocationVerification: true,
    allowManualTimeAdjustment: true,
    maxAdjustmentDays: 3,
    missingClockInPolicy: 'manager_approval',
    missingClockOutAction: 'incomplete',
    earlyLeaveAction: 'mark_auto',
    insufficientHoursAction: 'half_day',
};

export const DEFAULT_WORK_LOCATIONS: WorkLocationItem[] = [
    {
        id: 'loc-hq-jakarta',
        name: 'Headquarters Jakarta',
        type: 'headquarters',
        code: 'HQ1',
        address: 'Jl. Sudirman Kav. 52-53, SCBD, Jakarta Selatan',
        latitude: -6.2088,
        longitude: 106.8456,
        radiusMeters: 150,
        isActive: true,
        isDefault: true,
    },
    {
        id: 'loc-branch-sby',
        name: 'Surabaya Branch Office',
        type: 'branch',
        code: 'SBY',
        address: 'Jl. Pemuda No. 33-37, Embong Kaliasin, Surabaya',
        latitude: -7.2622,
        longitude: 112.7483,
        radiusMeters: 100,
        isActive: true,
    },
    {
        id: 'loc-site-project-a',
        name: 'Project Site Alpha',
        type: 'project_site',
        code: 'PSA',
        address: 'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
        latitude: -6.3129,
        longitude: 107.0984,
        radiusMeters: 300,
        isActive: true,
    },
];

export const DEFAULT_HOLIDAYS: CompanyHolidayItem[] = [
    { id: 'hol-1', name: 'Tahun Baru Masehi', date: '2026-01-01', type: 'national', isRecurring: true },
    { id: 'hol-2', name: 'Tahun Baru Imlek 2577', date: '2026-02-17', type: 'national', isRecurring: false },
    { id: 'hol-3', name: 'Hari Raya Nyepi', date: '2026-03-19', type: 'national', isRecurring: false },
    { id: 'hol-4', name: 'Hari Raya Idul Fitri 1447 H', date: '2026-03-20', type: 'national', isRecurring: false },
    { id: 'hol-5', name: 'Cuti Bersama Idul Fitri', date: '2026-03-23', type: 'collective', isRecurring: false },
    { id: 'hol-6', name: 'Hari Buruh Internasional', date: '2026-05-01', type: 'national', isRecurring: true },
    { id: 'hol-7', name: 'Hari Kemerdekaan RI', date: '2026-08-17', type: 'national', isRecurring: true },
];

export const DEFAULT_SHIFTS: ShiftPatternItem[] = [];

export const DEFAULT_OVERTIME: OvertimeConfig = {
    maxDailyOvertimeHours: 4,
    maxDailyOvertimeMinutes: 0,
    maxWeeklyOvertimeHours: 18,
    maxWeeklyOvertimeMinutes: 0,
    minOvertimeThresholdMinutes: 30,
    rateMultiplierFirstHour: 1.5,
    rateMultiplierSubsequent: 2.0,
    holidayRateMultiplier: 2.0,
    requireOvertimeRequest: true,
    requireApproval: true,
    requireSplDocument: true,
    splAttachmentMode: 'required',
};

export const DEFAULT_BUSINESS_TRIP: BusinessTripConfig = {
    requireTripRequest: true,
    requireApproval: true,
    minAdvanceNoticeDays: 2,
    enableDailyAllowance: true,
    perDiemDailyRate: 350000,
    requireDailyAllowanceApproval: true,
    dailyAllowanceClaimMode: 'automatic',
    allowedTransportModes: 'all',
    transportModes: {
        flight: {
            enabled: true,
            minDistanceKm: 150,
            classAllowance: 'economy',
            receiptMode: 'required',
        },
        train: {
            enabled: true,
            classAllowance: 'executive_economy',
            receiptMode: 'required',
        },
        car: {
            enabled: true,
            reimbursementModel: 'mileage',
            mileageRatePerKm: 2500,
            tollParkingReimbursable: true,
            receiptMode: 'required',
        },
        motorcycle: {
            enabled: true,
            mileageRatePerKm: 1200,
            receiptMode: 'required',
        },
        rideHailing: {
            enabled: true,
            dailyCap: 150000,
            receiptMode: 'required',
        },
    },
    minFlightDistanceKm: 150,
    mileageRatePerKm: 2500,
    transportReceiptMode: 'required',
    maxLodgingRatePerNight: 750000,
    lodgingReceiptMode: 'required',
    requireTicketAttachment: true,
    requireHotelAttachment: true,
    allowCashAdvance: true,
    advanceMaxPercentage: 80,
    allowOutsideGeofence: true,
    useDestinationAsValidLocation: true,
    requireGpsVerification: true,
    requireSelfie: true,
};

export const DEFAULT_ANTI_FRAUD: AntiFraudConfig = {
    blockMockGps: true,
    minGpsAccuracyMeters: 50,
    validateGeofence: true,
    enableFaceVerification: true,
    faceMatchVerification: false,
    preventRepeatedSelfie: true,
    enforceDeviceBinding: true,
    maxRegisteredDevicesPerUser: 1,
    requireNewDeviceVerification: true,
    logGpsOutOfRange: true,
};

export const DEFAULT_ATTENDANCE_PERIOD: AttendancePeriodConfig = {
    cutoffDayStart: 21,
    cutoffDayEnd: 20,
    timezone: 'Asia/Jakarta',
    calculationMode: 'cutoff',
};

export const DEFAULT_NOTIFICATIONS: NotificationSettingsConfig = {
    clockInReminderMinutesBefore: 15,
    clockOutReminderMinutesAfter: 5,
    notifyManagerOnLate: true,
    notifyManagerOnOutOfRange: true,
    weeklyDigestEnabled: true,
};

export type CorrectionFieldType = 'clock_in' | 'clock_out' | 'work_location' | 'attendance_status';

export interface AttendanceCorrectionConfig {
    allowAttendanceCorrection: boolean;          // Allow users to request attendance edits
    requireApproval: boolean;                    // Require approval before changes are applied
    maxBackdateDays: number;                     // Max number of days users can submit corrections (e.g. 3 days)
    requireReason: boolean;                      // Require correction reason
    evidenceAttachment: 'optional' | 'required'; // Supporting file/photo requirement
    allowedCorrectionTypes: CorrectionFieldType[]; // Multi-select allowed fields
}

export const DEFAULT_ATTENDANCE_CORRECTION: AttendanceCorrectionConfig = {
    allowAttendanceCorrection: true,
    requireApproval: true,
    maxBackdateDays: 3,
    requireReason: true,
    evidenceAttachment: 'optional',
    allowedCorrectionTypes: ['clock_in', 'clock_out', 'work_location', 'attendance_status'],
};

export type RemoteWorkModeKey = 'wfo' | 'wfh' | 'wfa' | 'business_trip';

export type AllowedLocationScope =
    | 'registered_geofence'
    | 'registered_home'
    | 'anywhere_gps'
    | 'trip_destination';

export interface RemoteWorkPolicyItem {
    id: RemoteWorkModeKey;
    name: string;
    description: string;
    policyBadge: string;
    icon: string;
    color: string;
    isEnabled: boolean;
    requireApproval: boolean;
    requireLocationVerification: boolean;
    requireSelfie: boolean;
    requireGpsLogging: boolean;
    allowedLocationScope: AllowedLocationScope;
    allowedLocationLabel: string;
    durationLimit: string;
    // Business trip specific options
    requireTripRequest?: boolean;
    useTripDestinationLocation?: boolean;
    allowOutsideGeofence?: boolean;
}

export type RemoteWorkConfig = Record<RemoteWorkModeKey, RemoteWorkPolicyItem>;

export const DEFAULT_REMOTE_WORK: RemoteWorkConfig = {
    wfo: {
        id: 'wfo',
        name: 'WFO (On-Site)',
        description: 'Work from registered company locations',
        policyBadge: 'Geofence Required',
        icon: 'building.2.fill',
        color: '#007AFF',
        isEnabled: true,
        requireApproval: false,
        requireLocationVerification: true,
        requireSelfie: false,
        requireGpsLogging: true,
        allowedLocationScope: 'registered_geofence',
        allowedLocationLabel: 'Company Geofence',
        durationLimit: 'Unlimited (Standard Workday)',
    },
    wfh: {
        id: 'wfh',
        name: 'WFH (Work From Home)',
        description: 'Work from registered home location',
        policyBadge: 'Approval Required',
        icon: 'house.fill',
        color: '#34C759',
        isEnabled: true,
        requireApproval: true,
        requireLocationVerification: true,
        requireSelfie: true,
        requireGpsLogging: true,
        allowedLocationScope: 'registered_home',
        allowedLocationLabel: 'Registered Home Address',
        durationLimit: '2 Days / Week',
    },
    wfa: {
        id: 'wfa',
        name: 'WFA (Work From Anywhere)',
        description: 'Work outside registered locations',
        policyBadge: 'Selfie + GPS Required',
        icon: 'globe.americas.fill',
        color: '#FF9500',
        isEnabled: true,
        requireApproval: true,
        requireLocationVerification: false,
        requireSelfie: true,
        requireGpsLogging: true,
        allowedLocationScope: 'anywhere_gps',
        allowedLocationLabel: 'Any Location (GPS Logged)',
        durationLimit: 'Flexible / On Request',
    },
    business_trip: {
        id: 'business_trip',
        name: 'Business Trip',
        description: 'Temporary work outside normal location',
        policyBadge: 'Trip Request Required',
        icon: 'airplane',
        color: '#30B0C7',
        isEnabled: true,
        requireApproval: true,
        requireLocationVerification: true,
        requireSelfie: true,
        requireGpsLogging: true,
        allowedLocationScope: 'trip_destination',
        allowedLocationLabel: 'Approved Trip Destination',
        durationLimit: 'Trip Schedule Validity',
        requireTripRequest: true,
        useTripDestinationLocation: true,
        allowOutsideGeofence: true,
    },
};

export const DEFAULT_PRIVACY: PrivacyRetentionConfig = {
    locationRetention: { preset: '90_days' },
    photoRetention: { preset: '90_days' },
    auditLogRetention: { preset: '1_year' },
    purgeGpsAfterDays: 90,
    anonymizeLocationHistory: false,
    retentionAuditLogDays: 365,
};


// Storage Keys
const STORAGE_KEYS = {
    ATTENDANCE_RULES: 'clock_setup_attendance_rules',
    WORK_LOCATIONS: 'clock_setup_work_locations',
    HOLIDAYS: 'clock_setup_holidays',
    SHIFTS: 'clock_setup_shifts',
    OVERTIME: 'clock_setup_overtime',
    BUSINESS_TRIP: 'clock_setup_business_trip',
    ANTI_FRAUD: 'clock_setup_anti_fraud',
    ATTENDANCE_PERIOD: 'clock_setup_attendance_period',
    ATTENDANCE_CORRECTIONS: 'clock_setup_attendance_corrections',
    REMOTE_WORK: 'clock_setup_remote_work',
    APPROVAL_WORKFLOWS: 'clock_setup_approval_workflows',
    NOTIFICATIONS: 'clock_setup_notifications',
    PRIVACY: 'clock_setup_privacy',
    EXCLUDED_MEMBERS: 'clock_setup_excluded_member_ids',
};

// Generic storage getters and setters with universal tenant cloud sync
export async function getClockSetting<T>(key: keyof typeof STORAGE_KEYS, defaultValue: T, tenantId?: string): Promise<T> {
    const storageKey = tenantId ? `${STORAGE_KEYS[key]}_${tenantId}` : STORAGE_KEYS[key];
    try {
        const raw = await AsyncStorage.getItem(storageKey);
        let cachedVal: T | null = raw ? JSON.parse(raw) : null;

        if (tenantId) {
            try {
                const configId = `tenant-clock-config-${tenantId}`;
                const { data } = await supabase
                    .from('chat_channels')
                    .select('meta')
                    .eq('id', configId)
                    .maybeSingle();

                if (data?.meta && data.meta[key] !== undefined) {
                    const cloudVal = data.meta[key] as T;
                    await AsyncStorage.setItem(storageKey, JSON.stringify(cloudVal));
                    return cloudVal;
                }
            } catch (cloudErr) {
                console.warn(`[ClockSetup] Cloud sync read failed for ${key}:`, cloudErr);
            }
        }

        if (cachedVal !== null) return cachedVal;

        if (tenantId) {
            const rawGlobal = await AsyncStorage.getItem(STORAGE_KEYS[key]);
            if (rawGlobal) return JSON.parse(rawGlobal);
        }
    } catch (e) {
        console.warn(`[ClockSetup] Failed to read ${key}`, e);
    }
    return defaultValue;
}

export async function saveClockSetting<T>(key: keyof typeof STORAGE_KEYS, value: T, tenantId?: string): Promise<void> {
    const storageKey = tenantId ? `${STORAGE_KEYS[key]}_${tenantId}` : STORAGE_KEYS[key];
    try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(value));
        await AsyncStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));

        if (tenantId) {
            try {
                const configId = `tenant-clock-config-${tenantId}`;
                const { data } = await supabase
                    .from('chat_channels')
                    .select('meta')
                    .eq('id', configId)
                    .maybeSingle();

                const currentMeta = data?.meta || {};
                const updatedMeta = { ...currentMeta, [key]: value };

                await supabase.from('chat_channels').upsert({
                    id: configId,
                    code: `#cfg-clock-${tenantId.slice(0, 6)}`,
                    name: 'Tenant Clock Settings',
                    category: 'general',
                    tenant_id: tenantId,
                    meta: updatedMeta,
                    is_archived: true,
                });
            } catch (cloudErr) {
                console.warn(`[ClockSetup] Cloud sync save failed for ${key}:`, cloudErr);
            }
        }
    } catch (e) {
        console.error(`[ClockSetup] Failed to save ${key}`, e);
        throw e;
    }
}

/**
 * Calculate expected clock-out time based on clock-in, schedule, and EndTimeBehavior
 * Note: Break duration does NOT count as working hours.
 */
export function calculateExpectedClockOut(params: {
    clockInTime: Date | string;
    scheduleStartTime?: string; // HH:mm, default "08:00"
    scheduleEndTime?: string;   // HH:mm, default "17:00"
    requiredWorkHours?: number; // default 8
    breakDurationMinutes?: number; // default 60 min (break doesn't count as working hours)
    behavior?: EndTimeBehavior; // default 'fixed_schedule'
}): Date {
    const {
        clockInTime,
        scheduleStartTime = '08:00',
        scheduleEndTime = '17:00',
        requiredWorkHours = 8,
        breakDurationMinutes = 60,
        behavior = 'fixed_schedule',
    } = params;

    const clockIn = typeof clockInTime === 'string' ? new Date(clockInTime) : new Date(clockInTime);
    const [endH, endM] = scheduleEndTime.split(':').map(Number);
    const scheduledEnd = new Date(clockIn);
    scheduledEnd.setHours(endH, endM, 0, 0);

    // Total required elapsed time = working hours + break duration
    const requiredElapsedMinutes = requiredWorkHours * 60 + breakDurationMinutes;
    const durationTarget = new Date(clockIn.getTime() + requiredElapsedMinutes * 60 * 1000);

    switch (behavior) {
        case 'fixed_schedule':
            // Clock-out target always follows scheduled end time
            return scheduledEnd;
        case 'extend_duration':
            // Expected clock-out moves based on clock-in so required duration is completed
            // If arrived late, target moves out; if arrived early or on-time, target is at least scheduledEnd
            return durationTarget > scheduledEnd ? durationTarget : scheduledEnd;
        case 'flexible_duration':
            // No fixed end time; employee only needs to complete required work duration (+ break)
            return durationTarget;
        default:
            return scheduledEnd;
    }
}

/**
 * Calculate if early leave occurs based on clock-out, expected clock-out, and tolerance
 */
export function calculateEarlyLeave(params: {
    clockOutTime: Date | string;
    expectedClockOut: Date | string;
    earlyLeaveToleranceMinutes?: number; // default 10
}): { isEarlyLeave: boolean; earlyMinutes: number } {
    const {
        clockOutTime,
        expectedClockOut,
        earlyLeaveToleranceMinutes = 10,
    } = params;

    const clockOut = typeof clockOutTime === 'string' ? new Date(clockOutTime) : new Date(clockOutTime);
    const expected = typeof expectedClockOut === 'string' ? new Date(expectedClockOut) : new Date(expectedClockOut);

    const diffMs = expected.getTime() - clockOut.getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));

    if (diffMinutes > earlyLeaveToleranceMinutes) {
        return { isEarlyLeave: true, earlyMinutes: diffMinutes };
    }
    return { isEarlyLeave: false, earlyMinutes: Math.max(0, diffMinutes) };
}

/**
 * Calculate overtime start time based on clock-in and EndTimeBehavior
 */
export function calculateOvertimeStart(params: {
    clockInTime: Date | string;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    requiredWorkHours?: number;
    breakDurationMinutes?: number;
    behavior?: EndTimeBehavior;
}): Date {
    return calculateExpectedClockOut(params);
}

