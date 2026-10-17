import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
    DateTimePicker,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
    DEFAULT_PERMISSION_SUBTYPES,
    PermissionSubtypeItem,
    LeaveTypeCategory,
    LeaveTargetType,
    EvidenceAttachmentMode,
    AdvanceNoticeOption,
    FirstYearEntitlementMode,
    RoundingRule,
} from '@/lib/api/leavePolicies';

export type SetupModuleType =
    | 'departments'
    | 'positions'
    | 'levels'
    | 'contract_types'
    | 'work_statuses'
    | 'work_schedules'
    | 'employment_policies'
    | 'leave_policies';

const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'] as const;
const VISIBILITY_OPTIONS = ['Public', 'Team Only', 'Private'] as const;
const STATUS_COLOR_OPTIONS = [
    { label: 'Emerald Green', hex: '#10B981' },
    { label: 'Mint Teal', hex: '#14B8A6' },
    { label: 'Cyan', hex: '#06B6D4' },
    { label: 'Sky Blue', hex: '#0EA5E9' },
    { label: 'Royal Blue', hex: '#3B82F6' },
    { label: 'Indigo', hex: '#6366F1' },
    { label: 'Violet', hex: '#8B5CF6' },
    { label: 'Purple', hex: '#A855F7' },
    { label: 'Fuchsia', hex: '#D946EF' },
    { label: 'Pink', hex: '#EC4899' },
    { label: 'Rose', hex: '#F43F5E' },
    { label: 'Crimson Red', hex: '#EF4444' },
    { label: 'Coral Orange', hex: '#F97316' },
    { label: 'Amber', hex: '#F59E0B' },
    { label: 'Yellow', hex: '#EAB308' },
    { label: 'Lime', hex: '#84CC16' },
    { label: 'Slate Gray', hex: '#64748B' },
    { label: 'Neutral Gray', hex: '#6B7280' },
] as const;

const SCHEDULE_TYPE_OPTIONS = [
    { key: 'Fixed', label: 'Fixed (Same Hours Every Day)' },
    { key: 'Custom', label: 'Custom (Flexible Hours Per Day)' },
    { key: 'Flexible', label: 'Flexible (Days per Week)' },
    { key: 'Shift', label: 'Shift-Based' },
] as const;

const TIMEZONE_OPTIONS = [
    { key: 'Asia/Jakarta', label: 'Asia/Jakarta (GMT+7 • WIB)' },
    { key: 'Asia/Makassar', label: 'Asia/Makassar (GMT+8 • WITA)' },
    { key: 'Asia/Jayapura', label: 'Asia/Jayapura (GMT+9 • WIT)' },
    { key: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8 • SGT)' },
    { key: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7 • ICT)' },
    { key: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9 • JST)' },
    { key: 'UTC', label: 'UTC (GMT+0 • Universal Time)' },
    { key: 'Europe/London', label: 'Europe/London (GMT+0/+1 • BST/GMT)' },
    { key: 'America/New_York', label: 'America/New_York (GMT-5/-4 • EST/EDT)' },
    { key: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8/-7 • PST/PDT)' },
    { key: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10/+11 • AEST)' },
] as const;

const WEEKDAYS = [
    { key: 'Mon', short: 'Mon', label: 'Monday' },
    { key: 'Tue', short: 'Tue', label: 'Tuesday' },
    { key: 'Wed', short: 'Wed', label: 'Wednesday' },
    { key: 'Thu', short: 'Thu', label: 'Thursday' },
    { key: 'Fri', short: 'Fri', label: 'Friday' },
    { key: 'Sat', short: 'Sat', label: 'Saturday' },
    { key: 'Sun', short: 'Sun', label: 'Sunday' },
] as const;

const BREAK_OPTIONS = ['0', '15', '30', '45', '60', '90', '120'] as const;
const DAYS_PER_WEEK_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'] as const;
const LEVEL_NUMBER_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8'] as const;
const CLUSTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
const ACCRUAL_TYPE_OPTIONS = [
    { key: 'annual', label: 'Yearly Reset (Per Year)' },
    { key: 'monthly', label: 'Monthly Accrual (Per Month)' },
] as const;

export const LEAVE_TYPE_OPTIONS = [
    { key: 'annual', label: 'Annual Leave' },
    { key: 'sick', label: 'Sick Leave' },
    { key: 'permission', label: 'Permission' },
    { key: 'unpaid', label: 'Unpaid Leave' },
    { key: 'maternity_paternity', label: 'Maternity / Paternity' },
    { key: 'custom', label: 'Custom Policy' },
] as const;

export const LEAVE_APPLIES_TO_OPTIONS: { key: LeaveTargetType; label: string }[] = [
    { key: 'all', label: 'All Employees' },
    { key: 'employment_type', label: 'Employment Type' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'level', label: 'Level / Grade' },
];

export const EVIDENCE_MODE_OPTIONS = [
    { key: 'disabled', label: 'Disabled (No attachment)' },
    { key: 'optional', label: 'Optional Supporting Document' },
    { key: 'required', label: 'Required (Mandatory Attachment)' },
] as const;

export const ADVANCE_NOTICE_OPTIONS = [
    { key: 'immediate', label: 'Immediate / Same Day', days: 0 },
    { key: '1_day', label: '1 Day Before', days: 1 },
    { key: '3_days', label: '3 Days Before', days: 3 },
    { key: '7_days', label: '7 Days Before', days: 7 },
    { key: 'custom', label: 'Custom Notice Days', days: 0 },
] as const;

export const FIRST_YEAR_ENTITLEMENT_OPTIONS = [
    { key: 'prorated', label: 'Prorated (Monthly Basis)' },
    { key: 'full', label: 'Full Entitlement' },
] as const;

export const ROUNDING_RULE_OPTIONS = [
    { key: 'round_down', label: 'Round Down (Floor)' },
    { key: 'nearest', label: 'Nearest Whole Number' },
    { key: 'round_up', label: 'Round Up (Ceil)' },
] as const;

export const SUBTYPE_DAY_OPTIONS = [
    { label: '0.5 Day (Half Day)', value: 0.5 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '3 Days', value: 3 },
    { label: '4 Days', value: 4 },
    { label: '5 Days', value: 5 },
    { label: '7 Days', value: 7 },
    { label: '10 Days', value: 10 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
];

export const SUBTYPE_PAID_OPTIONS = [
    { label: 'Paid Permit', value: true },
    { label: 'Unpaid (Salary Deducted)', value: false },
];

export const SUBTYPE_NOTICE_OPTIONS = [
    { label: 'Immediate (Same Day)', days: 0 },
    { label: '1 Day Advance Notice', days: 1 },
    { label: '2 Days Advance Notice', days: 2 },
    { label: '3 Days Advance Notice', days: 3 },
    { label: '7 Days Advance Notice', days: 7 },
    { label: '14 Days Advance Notice', days: 14 },
];

export type DaySchedule = {
    enabled: boolean;
    start: string;
    end: string;
};

export function timeStringToIso(timeStr: string): string {
    const [h, m] = (timeStr || '09:00').split(':').map((v) => parseInt(v, 10) || 0);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
}

export function dateToTimeString(d: Date): string {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export function toRomanNumeral(num: number): string {
    if (isNaN(num) || num <= 0) return '0';
    const lookup: [number, string][] = [
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
    ];
    let roman = '';
    let n = num;
    for (const [val, str] of lookup) {
        while (n >= val) {
            roman += str;
            n -= val;
        }
    }
    return roman;
}

export interface SwiftUISetupItemSheetProps {
    isOpened: boolean;
    onClose: () => void;
    moduleType: SetupModuleType;
    editingItem?: any | null;
    departmentsList?: { id: string; name: string; code?: string; cluster_code?: number }[];
    positionsList?: any[];
    levelsList?: any[];
    contractTypesList?: any[];
    workStatusesList?: any[];
    onSubmit: (payload: any) => Promise<void>;
    isSubmitting: boolean;
    customTitle?: string;
    customSubmitLabel?: string;
}

export const SwiftUISetupItemSheet: React.FC<SwiftUISetupItemSheetProps> = ({
    isOpened,
    onClose,
    moduleType,
    editingItem = null,
    departmentsList = [],
    positionsList = [],
    levelsList = [],
    contractTypesList = [],
    workStatusesList = [],
    onSubmit,
    isSubmitting,
    customTitle,
    customSubmitLabel,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isEditMode = !!editingItem?.id;

    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#007AFF' : '#1C1C1E')];
    const textFieldModifiers = [tint('#007AFF')];

    // Form states
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [clusterCode, setClusterCode] = useState('1');
    const [orderIndex, setOrderIndex] = useState('1');
    const [departmentId, setDepartmentId] = useState('');
    const [categoryCode, setCategoryCode] = useState('1');
    const [levelCode, setLevelCode] = useState('0');
    const [romanCode, setRomanCode] = useState('I');
    const [minLevelCode, setMinLevelCode] = useState('0');
    const [maxLevelCode, setMaxLevelCode] = useState('8');
    const [isDefault, setIsDefault] = useState(false);
    const [statusColor, setStatusColor] = useState('#10B981');
    const [visibility, setVisibility] = useState<typeof VISIBILITY_OPTIONS[number]>('Public');
    const [scheduleType, setScheduleType] = useState<string>('Fixed');
    const [timezone, setTimezone] = useState('Asia/Jakarta');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [breakDuration, setBreakDuration] = useState('60');
    const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [daySchedules, setDaySchedules] = useState<Record<string, DaySchedule>>({
        Mon: { enabled: true, start: '09:00', end: '17:00' },
        Tue: { enabled: true, start: '09:00', end: '17:00' },
        Wed: { enabled: true, start: '09:00', end: '17:00' },
        Thu: { enabled: true, start: '09:00', end: '17:00' },
        Fri: { enabled: true, start: '09:00', end: '17:00' },
        Sat: { enabled: false, start: '09:00', end: '17:00' },
        Sun: { enabled: false, start: '09:00', end: '17:00' },
    });
    const [daysPerWeek, setDaysPerWeek] = useState('5');
    const [policyContractTypeId, setPolicyContractTypeId] = useState('');
    const [policyDefaultHours, setPolicyDefaultHours] = useState('40');
    const [policyOvertimeEligible, setPolicyOvertimeEligible] = useState(true);
    const [policyBenefitsEligible, setPolicyBenefitsEligible] = useState(true);
    const [policyNotes, setPolicyNotes] = useState('');
    const [leaveType, setLeaveType] = useState<LeaveTypeCategory>('annual');
    const [leaveAppliesTo, setLeaveAppliesTo] = useState<LeaveTargetType>('all');
    const [leaveContractType, setLeaveContractType] = useState('All');
    const [leaveTargetDeptId, setLeaveTargetDeptId] = useState('');
    const [leaveTargetPosId, setLeaveTargetPosId] = useState('');
    const [leaveTargetLevelId, setLeaveTargetLevelId] = useState('');
    const [leaveQuotaCycle, setLeaveQuotaCycle] = useState<'yearly' | 'monthly'>('yearly');
    const [leaveMaxDaysPerMonthMode, setLeaveMaxDaysPerMonthMode] = useState<'unlimited' | 'limited'>('unlimited');
    const [leaveMaxDaysPerMonth, setLeaveMaxDaysPerMonth] = useState('2');
    const [leaveRequireApproval, setLeaveRequireApproval] = useState(true);
    const [leaveRequireReason, setLeaveRequireReason] = useState(true);
    const [leaveEvidenceMode, setLeaveEvidenceMode] = useState<EvidenceAttachmentMode>('disabled');
    const [leaveMinNoticePreset, setLeaveMinNoticePreset] = useState<AdvanceNoticeOption>('7_days');
    const [leaveMinNoticeDays, setLeaveMinNoticeDays] = useState('7');
    const [leaveEffectiveMonths, setLeaveEffectiveMonths] = useState('12');
    const [leaveFirstYearEntitlement, setLeaveFirstYearEntitlement] = useState<FirstYearEntitlementMode>('prorated');
    const [leaveRoundingRule, setLeaveRoundingRule] = useState<RoundingRule>('round_down');
    const [permissionSubtypes, setPermissionSubtypes] = useState<PermissionSubtypeItem[]>([...DEFAULT_PERMISSION_SUBTYPES]);
    const [selectedSubtypeConfigIdx, setSelectedSubtypeConfigIdx] = useState(0);
    const [leaveDescription, setLeaveDescription] = useState('');
    const [leaveAnnualQuota, setLeaveAnnualQuota] = useState('12');
    const [leaveSickQuota, setLeaveSickQuota] = useState('0');
    const [leavePermissionQuota, setLeavePermissionQuota] = useState('0');
    const [leaveAccrualType, setLeaveAccrualType] = useState('annual');
    const [leaveCarryOverAllowed, setLeaveCarryOverAllowed] = useState(false);
    const [leaveIsPaid, setLeaveIsPaid] = useState(true);
    const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>('Active');

    const deptCodeRef = React.useRef<any>(null);
    const posCodeRef = React.useRef<any>(null);
    const romanCodeRef = React.useRef<any>(null);
    const lvlCodeRef = React.useRef<any>(null);

    // Computed next available cluster number for departments
    const computedNextCluster = React.useMemo(() => {
        const usedClusters = departmentsList
            .map((d: any) => {
                const c = d.cluster_code !== undefined && d.cluster_code !== null
                    ? parseInt(String(d.cluster_code), 10)
                    : (d.code && String(d.code).includes('-') ? parseInt(String(d.code).split('-')[0], 10) : 0);
                return c;
            })
            .filter((n: number) => !isNaN(n) && n > 0);
        const maxCluster = usedClusters.length > 0 ? Math.max(...usedClusters) : 0;
        return String(maxCluster + 1);
    }, [departmentsList]);

    // Check duplicate cluster number in real-time (Global uniqueness across departments)
    const duplicateClusterDept = React.useMemo(() => {
        if (moduleType !== 'departments' || !clusterCode.trim()) return null;
        const num = parseInt(clusterCode, 10);
        if (isNaN(num)) return null;
        return departmentsList.find(
            (d: any) => d.id !== editingItem?.id && (
                parseInt(String(d.cluster_code ?? 0), 10) === num ||
                (d.code && String(d.code).includes('-') && parseInt(String(d.code).split('-')[0], 10) === num)
            )
        );
    }, [moduleType, clusterCode, departmentsList, editingItem]);

    // Computed next available position category number (1-99) within the selected department
    const computedNextPositionCategory = React.useMemo(() => {
        const targetDeptId = departmentId || (departmentsList[0]?.id ?? '');
        if (!targetDeptId) return '1';
        const deptPositions = positionsList.filter((p: any) => p.department_id === targetDeptId);
        const usedCategories = deptPositions
            .map((p: any) => parseInt(String(p.category_code ?? 0), 10))
            .filter((n: number) => !isNaN(n) && n > 0);
        const maxCat = usedCategories.length > 0 ? Math.max(...usedCategories) : 0;
        return String(maxCat + 1);
    }, [departmentId, positionsList, departmentsList]);

    // Check duplicate position number in real-time within the SAME department only
    const duplicatePositionInDept = React.useMemo(() => {
        if (moduleType !== 'positions' || !categoryCode.trim()) return null;
        const targetDeptId = departmentId || (departmentsList[0]?.id ?? '');
        if (!targetDeptId) return null;
        const num = parseInt(categoryCode, 10);
        if (isNaN(num)) return null;
        return positionsList.find(
            (p: any) =>
                p.id !== editingItem?.id &&
                p.department_id === targetDeptId &&
                parseInt(String(p.category_code ?? 0), 10) === num
        );
    }, [moduleType, categoryCode, departmentId, departmentsList, positionsList, editingItem]);

    // Computed next available level grade (0-99)
    const computedNextLevelGrade = React.useMemo(() => {
        if (!levelsList || levelsList.length === 0) return '0';
        const usedGrades = levelsList
            .map((l: any) => parseInt(String(l.level_code ?? 0), 10))
            .filter((n: number) => !isNaN(n));
        const maxGrade = usedGrades.length > 0 ? Math.max(...usedGrades) : -1;
        return String(maxGrade + 1);
    }, [levelsList]);

    // Check duplicate level grade in real-time (0-99)
    const duplicateLevelGrade = React.useMemo(() => {
        if (moduleType !== 'levels' || !levelCode.trim()) return null;
        const num = parseInt(levelCode, 10);
        if (isNaN(num)) return null;
        return levelsList.find(
            (l: any) => l.id !== editingItem?.id && parseInt(String(l.level_code ?? 0), 10) === num
        );
    }, [moduleType, levelCode, levelsList, editingItem]);

    useEffect(() => {
        if (editingItem) {
            setName(editingItem.name || '');
            // Strip any prefix like "1-" or digits before hyphen so only the code is edited
            const rawCode = String(editingItem.code || '');
            const strippedCode = (rawCode.includes('-') ? rawCode.split('-')[1] : rawCode)
                .replace(/[^A-Za-z]/g, '')
                .slice(0, 5)
                .toUpperCase();
            const extractedCluster = editingItem.cluster_code !== undefined && editingItem.cluster_code !== null
                ? String(editingItem.cluster_code)
                : (rawCode.includes('-') ? rawCode.split('-')[0] : '1');

            setCode(strippedCode);
            setClusterCode(extractedCluster);
            setOrderIndex(String(editingItem.order_index ?? extractedCluster));
            setDepartmentId(editingItem.department_id || (departmentsList[0]?.id ?? ''));
            setCategoryCode(String(editingItem.category_code ?? '1'));
            setLevelCode(String(editingItem.level_code ?? '0'));
            setRomanCode(editingItem.roman_code || 'I');
            setMinLevelCode(String(editingItem.min_level_code ?? '0'));
            setMaxLevelCode(String(editingItem.max_level_code ?? '8'));
            setIsDefault(Boolean(editingItem.is_default));
            setStatusColor(editingItem.color || '#10B981');
            const curVis = editingItem.visibility || 'Public';
            const matchedVis = VISIBILITY_OPTIONS.find((v) => v.toLowerCase() === curVis.toLowerCase());
            setVisibility(matchedVis || 'Public');

            const cfg = editingItem.days_config || {};
            const workingDaysList = Array.isArray(cfg.working_days) ? cfg.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            const custom = cfg.custom_hours || {};
            const hasCustomHours = Object.keys(custom).length > 0;
            const defaultStart = editingItem.start_time?.substring(0, 5) || '09:00';
            const defaultEnd = editingItem.end_time?.substring(0, 5) || '17:00';

            if (editingItem.type === 'Fixed' && hasCustomHours) {
                setScheduleType('Custom');
            } else {
                setScheduleType(editingItem.type || 'Fixed');
            }

            setTimezone(editingItem.timezone || 'Asia/Jakarta');
            setStartTime(defaultStart);
            setEndTime(defaultEnd);
            setBreakDuration(String(editingItem.break_duration_minutes ?? '60'));
            setWorkingDays(workingDaysList);

            const initialDaySchedules: Record<string, DaySchedule> = {};
            WEEKDAYS.forEach((d) => {
                const isEnabled = workingDaysList.includes(d.key);
                const dayCustom = custom[d.key];
                initialDaySchedules[d.key] = {
                    enabled: isEnabled,
                    start: dayCustom?.start || defaultStart,
                    end: dayCustom?.end || defaultEnd,
                };
            });
            setDaySchedules(initialDaySchedules);

            if (cfg.days_per_week) {
                setDaysPerWeek(String(cfg.days_per_week));
            } else {
                setDaysPerWeek('5');
            }

            setPolicyContractTypeId(editingItem.employment_type_id || contractTypesList[0]?.id || '');
            setPolicyDefaultHours(String(editingItem.default_hours || editingItem.min_hours_per_week || '40'));
            setPolicyOvertimeEligible(editingItem.overtime_eligible !== false);
            setPolicyBenefitsEligible(editingItem.benefits_eligible !== false);
            setPolicyNotes(editingItem.notes || '');

            const contractMatch = editingItem.description?.match(/\[Contract:\s*([^\]]+)\]/i) || editingItem.description?.match(/\[Status:\s*([^\]]+)\]/i);
            const monthsMatch = editingItem.description?.match(/\[Effective:\s*(\d+)m\]/i);
            const cleanDesc = editingItem.description
                ? editingItem.description.replace(/\[Contract:[^\]]+\]\s*/i, '').replace(/\[Status:[^\]]+\]\s*/i, '').replace(/\[Effective:[^\]]+\]\s*/i, '').trim()
                : '';

            // Derive leave type
            const rawType = editingItem.leave_type || (
                (editingItem.name || '').toLowerCase().includes('sick') ? 'sick'
                : (editingItem.name || '').toLowerCase().includes('permission') ? 'permission'
                : (editingItem.name || '').toLowerCase().includes('unpaid') ? 'unpaid'
                : (editingItem.name || '').toLowerCase().includes('maternity') || (editingItem.name || '').toLowerCase().includes('paternity') ? 'maternity_paternity'
                : 'annual'
            );
            setLeaveType(rawType);

            // Applies to
            if (editingItem.applies_to) {
                setLeaveAppliesTo(editingItem.applies_to);
            } else if (contractMatch && contractMatch[1] !== 'All' && contractMatch[1] !== 'All Contract Types') {
                setLeaveAppliesTo('employment_type');
            } else {
                setLeaveAppliesTo('all');
            }

            const ctVal = contractMatch ? contractMatch[1] : (editingItem.target_employment_types?.[0] || 'All');
            setLeaveContractType(ctVal);
            setLeaveTargetDeptId(editingItem.target_department_ids?.[0] || '');
            setLeaveTargetPosId(editingItem.target_position_ids?.[0] || '');
            setLeaveTargetLevelId(editingItem.target_level_ids?.[0] || '');
            setLeaveQuotaCycle(editingItem.quota_cycle || 'yearly');
            setLeaveMaxDaysPerMonthMode(editingItem.max_days_per_month_mode || (editingItem.max_days_per_month ? 'limited' : 'unlimited'));
            setLeaveMaxDaysPerMonth(editingItem.max_days_per_month !== undefined && editingItem.max_days_per_month !== null ? String(editingItem.max_days_per_month) : '2');

            setLeaveRequireApproval(editingItem.require_approval !== false);
            setLeaveRequireReason(editingItem.require_reason !== false);
            setLeaveEvidenceMode(editingItem.evidence_mode || (rawType === 'maternity_paternity' ? 'required' : rawType === 'sick' ? 'optional' : 'disabled'));

            const noticeDays = editingItem.min_notice_days !== undefined ? Number(editingItem.min_notice_days) : (rawType === 'annual' ? 7 : rawType === 'sick' ? 0 : 1);
            setLeaveMinNoticeDays(String(noticeDays));
            setLeaveMinNoticePreset(editingItem.min_notice_preset || (noticeDays === 0 ? 'immediate' : noticeDays === 1 ? '1_day' : noticeDays === 3 ? '3_days' : noticeDays === 7 ? '7_days' : 'custom'));

            const effMonths = editingItem.eligibility_waiting_period_months ?? (monthsMatch ? parseInt(monthsMatch[1], 10) : (editingItem.effective_after_months ?? (rawType === 'annual' ? 12 : 0)));
            setLeaveEffectiveMonths(String(effMonths));
            setLeaveFirstYearEntitlement(editingItem.first_year_entitlement || 'prorated');
            setLeaveRoundingRule(editingItem.rounding_rule || 'round_down');

            if (Array.isArray(editingItem.permission_subtypes) && editingItem.permission_subtypes.length > 0) {
                setPermissionSubtypes(editingItem.permission_subtypes);
            } else {
                setPermissionSubtypes([...DEFAULT_PERMISSION_SUBTYPES]);
            }

            setLeaveDescription(cleanDesc);
            setLeaveAnnualQuota(String(editingItem.entitlement_days ?? editingItem.annual_leave_quota ?? 12));
            setLeaveSickQuota(String(editingItem.sick_leave_quota ?? 0));
            setLeavePermissionQuota(String(editingItem.permission_quota ?? 0));
            setLeaveAccrualType(editingItem.accrual_type || 'annual');
            setLeaveCarryOverAllowed(editingItem.carry_over_allowed === true);
            setLeaveIsPaid(editingItem.is_paid !== false);

            const curStatus = editingItem.status || 'Active';
            const matchedStatus = STATUS_OPTIONS.find(
                (s) => s.toLowerCase() === curStatus.toLowerCase()
            );
            setStatus(matchedStatus || 'Active');
        } else {
            setName('');
            setCode('');
            setClusterCode(computedNextCluster);
            setOrderIndex(computedNextCluster);
            const initialDeptId = departmentsList[0]?.id ?? '';
            setDepartmentId(initialDeptId);

            // Compute next category for positions
            if (moduleType === 'positions' && initialDeptId) {
                const deptPositions = (positionsList || []).filter((p: any) => p.department_id === initialDeptId);
                const usedCategories = deptPositions
                    .map((p: any) => parseInt(String(p.category_code ?? 0), 10))
                    .filter((n: number) => !isNaN(n) && n > 0);
                const maxCat = usedCategories.length > 0 ? Math.max(...usedCategories) : 0;
                setCategoryCode(String(maxCat + 1));
            } else {
                setCategoryCode('1');
            }

            // Compute next grade for levels
            if (moduleType === 'levels') {
                setLevelCode(computedNextLevelGrade);
                setRomanCode(computedNextLevelGrade === '0' ? '0' : 'I');
            } else {
                setLevelCode('0');
                setRomanCode('I');
            }

            setMinLevelCode('0');
            setMaxLevelCode('8');
            setIsDefault(false);
            setStatusColor('#10B981');
            setVisibility('Public');
            setScheduleType('Fixed');
            setTimezone('Asia/Jakarta');
            setStartTime('09:00');
            setEndTime('17:00');
            setBreakDuration('60');
            setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setDaySchedules({
                Mon: { enabled: true, start: '09:00', end: '17:00' },
                Tue: { enabled: true, start: '09:00', end: '17:00' },
                Wed: { enabled: true, start: '09:00', end: '17:00' },
                Thu: { enabled: true, start: '09:00', end: '17:00' },
                Fri: { enabled: true, start: '09:00', end: '17:00' },
                Sat: { enabled: false, start: '09:00', end: '17:00' },
                Sun: { enabled: false, start: '09:00', end: '17:00' },
            });
            setDaysPerWeek('5');
            setPolicyContractTypeId(contractTypesList[0]?.id || '');
            setPolicyDefaultHours('40');
            setPolicyOvertimeEligible(true);
            setPolicyBenefitsEligible(true);
            setPolicyNotes('');
            setLeaveType('annual');
            setLeaveAppliesTo('all');
            setLeaveContractType('All');
            setLeaveTargetDeptId('');
            setLeaveTargetPosId('');
            setLeaveTargetLevelId('');
            setLeaveQuotaCycle('yearly');
            setLeaveMaxDaysPerMonthMode('unlimited');
            setLeaveMaxDaysPerMonth('2');
            setLeaveRequireApproval(true);
            setLeaveRequireReason(true);
            setLeaveEvidenceMode('disabled');
            setLeaveMinNoticePreset('7_days');
            setLeaveMinNoticeDays('7');
            setLeaveEffectiveMonths('12');
            setLeaveFirstYearEntitlement('prorated');
            setLeaveRoundingRule('round_down');
            setPermissionSubtypes([...DEFAULT_PERMISSION_SUBTYPES]);
            setLeaveDescription('');
            setLeaveAnnualQuota('12');
            setLeaveSickQuota('0');
            setLeavePermissionQuota('0');
            setLeaveAccrualType('annual');
            setLeaveCarryOverAllowed(false);
            setLeaveIsPaid(true);
            setStatus('Active');
        }
    }, [editingItem, isOpened, departmentsList, computedNextCluster, computedNextLevelGrade, moduleType]);

    // Computed labels
    const moduleTitle = (() => {
        switch (moduleType) {
            case 'departments': return 'Department';
            case 'positions': return 'Position';
            case 'levels': return 'Level';
            case 'contract_types': return 'Contract Type';
            case 'work_statuses': return 'Work Status';
            case 'work_schedules': return 'Work Schedule';
            case 'employment_policies': return 'Employment Policy';
            case 'leave_policies': return 'Leave Policy';
            default: return 'Record';
        }
    })();

    const levelOptions = React.useMemo(() => {
        if (!levelsList || levelsList.length === 0) {
            return [
                { code: 0, label: '0 - Internship' },
                { code: 1, label: 'I - Probation' },
                { code: 2, label: 'II - Junior Staff' },
                { code: 3, label: 'III - Middle Staff' },
                { code: 4, label: 'IV - Senior Staff' },
                { code: 5, label: 'V - Leader' },
                { code: 6, label: 'VI - Head' },
                { code: 7, label: 'VII - Chief Executive Officer' },
                { code: 8, label: 'VIII - Owner' },
            ];
        }
        const sorted = [...levelsList].sort((a, b) => {
            const lvlA = parseInt(String(a.level_code ?? 0), 10);
            const lvlB = parseInt(String(b.level_code ?? 0), 10);
            return lvlA - lvlB;
        });
        return sorted.map((l) => {
            const codeNum = parseInt(String(l.level_code ?? 0), 10);
            const roman = l.roman_code || toRomanNumeral(codeNum);
            const label = `${roman} - ${l.name}`;
            return { code: codeNum, label };
        });
    }, [levelsList]);

    const statusIndex = Math.max(0, STATUS_OPTIONS.indexOf(status));
    const clusterIndex = Math.max(0, CLUSTER_OPTIONS.indexOf(clusterCode as any));
    const scheduleTypeIndex = Math.max(0, SCHEDULE_TYPE_OPTIONS.findIndex((t) => t.key === scheduleType));
    const timezoneIndex = Math.max(0, TIMEZONE_OPTIONS.findIndex((tz) => tz.key.toLowerCase() === timezone.toLowerCase()));
    const breakDurationIndex = Math.max(0, BREAK_OPTIONS.indexOf(breakDuration as any));
    const daysPerWeekIndex = Math.max(0, DAYS_PER_WEEK_OPTIONS.indexOf(daysPerWeek as any));
    const policyContractTypeIndex = Math.max(0, contractTypesList.findIndex((c: any) => c.id === policyContractTypeId));
    const accrualTypeIndex = Math.max(0, ACCRUAL_TYPE_OPTIONS.findIndex((o) => o.key === leaveAccrualType));
    const leaveContractTypeOptions = React.useMemo(() => {
        return ['All Contract Types', ...(contractTypesList || []).map((c: any) => c.name || c.code)];
    }, [contractTypesList]);
    const selectedLeaveContractTypeIndex = Math.max(
        0,
        leaveContractTypeOptions.findIndex((opt) => opt.toLowerCase() === (leaveContractType === 'All' ? 'all contract types' : leaveContractType.toLowerCase()))
    );
    const minLevelIndex = Math.max(0, levelOptions.findIndex((opt) => opt.code === parseInt(minLevelCode, 10)));
    const maxLevelIndex = Math.max(0, levelOptions.findIndex((opt) => opt.code === parseInt(maxLevelCode, 10)));
    const statusColorIndex = Math.max(0, STATUS_COLOR_OPTIONS.findIndex((c) => c.hex.toLowerCase() === statusColor.toLowerCase()));
    const visibilityIndex = Math.max(0, VISIBILITY_OPTIONS.indexOf(visibility as any));

    const departmentNames = departmentsList.map((d) => d.name || d.code || 'Dept');
    const selectedDeptIndex = Math.max(
        0,
        departmentsList.findIndex((d) => d.id === departmentId)
    );

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Required Field', `Please enter a valid ${moduleTitle.toLowerCase()} name.`);
            return;
        }

        if (moduleType === 'departments') {
            const clusterNum = parseInt(clusterCode, 10);
            if (isNaN(clusterNum) || clusterNum < 1 || clusterNum > 99) {
                Alert.alert('Invalid Cluster Number', 'Cluster number must be a number between 1 and 99.');
                return;
            }

            // Check if cluster code is already used by another department (MUST BE STRICTLY UNIQUE)
            if (duplicateClusterDept) {
                Alert.alert(
                    'Cluster Number Already Taken',
                    `Cluster "${clusterNum}" is already taken by "${duplicateClusterDept.name || duplicateClusterDept.code}". Every department must have a unique cluster number.`
                );
                return;
            }

            const cleanCode = code.trim().toUpperCase();
            if (cleanCode.length !== 3 || !/^[A-Z]{3}$/.test(cleanCode)) {
                Alert.alert(
                    'Invalid Department Code',
                    'Department code must be exactly 3 letters (e.g. FIN, SLS, HRD).'
                );
                return;
            }
        } else if (moduleType === 'positions') {
            if (!departmentId) {
                Alert.alert('Department Required', 'Please select a department for this position.');
                return;
            }

            const catNum = parseInt(categoryCode, 10);
            if (isNaN(catNum) || catNum < 1 || catNum > 99) {
                Alert.alert('Invalid Position Number', 'Position number must be a number between 1 and 99.');
                return;
            }

            if (duplicatePositionInDept) {
                Alert.alert(
                    'Position Number Already Taken',
                    `Position number "${catNum}" is already taken by "${duplicatePositionInDept.name || duplicatePositionInDept.code}" in this department.`
                );
                return;
            }

            const cleanCode = code.trim().toUpperCase();
            if (cleanCode.length !== 2 || !/^[A-Z]{2}$/.test(cleanCode)) {
                Alert.alert(
                    'Invalid Position Code',
                    'Position code must be exactly 2 letters (e.g. FA, HR).'
                );
                return;
            }
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const payload: Record<string, any> = {};
        if (moduleType !== 'employment_policies') {
            payload.name = name.trim();
            payload.status = status;
        }

        if (moduleType === 'departments') {
            const clusterNum = parseInt(clusterCode, 10) || 1;
            const cleanCode = code.replace(/^[0-9]+-/, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
            payload.code = cleanCode;
            payload.cluster_code = clusterNum;
            payload.order_index = clusterNum; // Automatically derived from cluster code
        } else if (moduleType === 'positions') {
            const cleanCode = code.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
            payload.code = cleanCode;
            payload.department_id = departmentId || (departmentsList[0]?.id ?? null);
            payload.category_code = parseInt(categoryCode, 10) || 1;
        } else if (moduleType === 'levels') {
            const gradeNum = parseInt(levelCode, 10);
            if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 99) {
                Alert.alert('Invalid Level Grade', 'Level grade must be a number between 0 and 99.');
                return;
            }

            if (duplicateLevelGrade) {
                Alert.alert(
                    'Level Grade Already Taken',
                    `Level grade "${gradeNum}" is already taken by "${duplicateLevelGrade.name || duplicateLevelGrade.code}". Every level must have a unique grade number.`
                );
                return;
            }

            const cleanCode = code.trim().toUpperCase();
            if (!cleanCode) {
                Alert.alert(
                    'Level Code Required',
                    'Please enter a valid level code (e.g. IN, PB, JR, SR).'
                );
                return;
            }

            payload.code = cleanCode;
            payload.level_code = gradeNum;
            payload.roman_code = toRomanNumeral(gradeNum);
            payload.order_index = gradeNum + 1;
        } else if (moduleType === 'contract_types') {
            payload.min_level_code = parseInt(minLevelCode, 10) || 0;
            payload.max_level_code = parseInt(maxLevelCode, 10) || (levelOptions[levelOptions.length - 1]?.code ?? 8);
            payload.is_default = isDefault;
        } else if (moduleType === 'work_statuses') {
            payload.color = statusColor;
            payload.visibility = visibility;
            payload.order_index = editingItem?.order_index || (workStatusesList.length + 1);
        } else if (moduleType === 'work_schedules') {
            payload.type = scheduleType === 'Custom' ? 'Fixed' : scheduleType;
            payload.start_time = startTime.includes(':') ? (startTime.length === 5 ? `${startTime}:00` : startTime) : `${startTime}:00:00`;
            payload.end_time = endTime.includes(':') ? (endTime.length === 5 ? `${endTime}:00` : endTime) : `${endTime}:00:00`;
            payload.break_duration_minutes = parseInt(breakDuration, 10) || 60;
            payload.timezone = timezone.trim() || 'Asia/Jakarta';

            if (scheduleType === 'Fixed') {
                const enabledDays = WEEKDAYS.filter((d) => daySchedules[d.key]?.enabled).map((d) => d.key);
                payload.days_config = {
                    working_days: enabledDays,
                };
            } else if (scheduleType === 'Custom') {
                const enabledDays = WEEKDAYS.filter((d) => daySchedules[d.key]?.enabled).map((d) => d.key);
                const customHours: Record<string, any> = {};
                WEEKDAYS.forEach((d) => {
                    const sched = daySchedules[d.key];
                    if (sched?.enabled) {
                        customHours[d.key] = {
                            start: sched.start,
                            end: sched.end,
                        };
                    }
                });

                payload.days_config = {
                    working_days: enabledDays,
                    custom_hours: customHours,
                };
            } else if (scheduleType === 'Flexible') {
                payload.days_config = {
                    days_per_week: parseInt(daysPerWeek, 10) || 5,
                    flexible_selection: true,
                };
            } else if (scheduleType === 'Shift') {
                payload.days_config = {
                    shifts: ['morning', 'evening', 'night'],
                };
            }
        } else if (moduleType === 'employment_policies') {
            delete payload.name;
            delete payload.status;
            payload.employment_type_id = policyContractTypeId || contractTypesList[0]?.id;
            payload.overtime_eligible = policyOvertimeEligible;
            payload.benefits_eligible = policyBenefitsEligible;

            const hoursVal = policyDefaultHours.trim() || '40';
            const hoursPrefix = `[${hoursVal} hrs/week]`;
            const cleanUserNotes = policyNotes.replace(/\[\d+(?:\.\d+)?\s*(?:hrs|hours)?\/week\]\s*/i, '').trim();
            payload.notes = cleanUserNotes ? `${hoursPrefix} ${cleanUserNotes}` : hoursPrefix;
        } else if (moduleType === 'leave_policies') {
            payload.name = name.trim();
            payload.leave_type = leaveType;
            payload.applies_to = leaveAppliesTo;

            if (leaveAppliesTo === 'employment_type') {
                payload.target_employment_types = leaveContractType && leaveContractType !== 'All' && leaveContractType !== 'All Contract Types'
                    ? [leaveContractType]
                    : [];
            } else {
                payload.target_employment_types = [];
            }

            if (leaveAppliesTo === 'department' && leaveTargetDeptId) {
                payload.target_department_ids = [leaveTargetDeptId];
            } else {
                payload.target_department_ids = [];
            }

            if (leaveAppliesTo === 'position' && leaveTargetPosId) {
                payload.target_position_ids = [leaveTargetPosId];
            } else {
                payload.target_position_ids = [];
            }

            if (leaveAppliesTo === 'level' && leaveTargetLevelId) {
                payload.target_level_ids = [leaveTargetLevelId];
            } else {
                payload.target_level_ids = [];
            }

            const contractTag = payload.target_employment_types?.length ? `[Contract: ${payload.target_employment_types[0]}]` : '';
            const monthsVal = parseInt(leaveEffectiveMonths, 10) || 0;
            const monthsTag = `[Effective: ${monthsVal}m]`;
            const cleanDesc = leaveDescription.replace(/\[Contract:[^\]]+\]\s*/i, '').replace(/\[Status:[^\]]+\]\s*/i, '').replace(/\[Effective:[^\]]+\]\s*/i, '').trim();
            payload.description = [contractTag, monthsTag, cleanDesc].filter(Boolean).join(' ');

            const entitlementNum = parseInt(leaveAnnualQuota, 10) || 12;
            payload.entitlement_days = entitlementNum;
            payload.quota_cycle = leaveQuotaCycle;
            payload.max_days_per_month_mode = leaveMaxDaysPerMonthMode;
            payload.max_days_per_month = leaveMaxDaysPerMonthMode === 'limited' ? (parseInt(leaveMaxDaysPerMonth, 10) || null) : null;
            payload.annual_leave_quota = entitlementNum;
            payload.sick_leave_quota = leaveType === 'sick' ? entitlementNum : (parseInt(leaveSickQuota, 10) || 0);
            payload.permission_quota = leaveType === 'permission' ? entitlementNum : (parseInt(leavePermissionQuota, 10) || 0);
            payload.require_approval = leaveRequireApproval;
            payload.require_reason = leaveRequireReason;
            payload.evidence_mode = leaveEvidenceMode;

            let noticeDaysNum = 0;
            if (leaveMinNoticePreset === 'immediate') noticeDaysNum = 0;
            else if (leaveMinNoticePreset === '1_day') noticeDaysNum = 1;
            else if (leaveMinNoticePreset === '3_days') noticeDaysNum = 3;
            else if (leaveMinNoticePreset === '7_days') noticeDaysNum = 7;
            else noticeDaysNum = parseInt(leaveMinNoticeDays, 10) || 0;

            payload.min_notice_days = noticeDaysNum;
            payload.min_notice_preset = leaveMinNoticePreset;
            payload.eligibility_waiting_period_months = monthsVal;
            payload.first_year_entitlement = leaveFirstYearEntitlement;
            payload.rounding_rule = leaveRoundingRule;

            if (leaveType === 'permission') {
                payload.permission_subtypes = permissionSubtypes;
            }

            payload.accrual_type = leaveFirstYearEntitlement === 'prorated' ? 'monthly' : 'annual';
            payload.carry_over_allowed = leaveCarryOverAllowed;
            payload.is_paid = leaveIsPaid;
            payload.status = status;
        }

        onSubmit(payload);
    };

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened && !isSubmitting) {
                        onClose();
                    }
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 20, leading: 20, trailing: 20, bottom: 10 }),
                        ]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {customTitle || (isEditMode ? `Edit ${moduleTitle}` : `Add ${moduleTitle}`)}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[background(sheetBg)]}>
                        {/* 1. DEPARTMENTS */}
                        {moduleType === 'departments' && (
                            <>
                                <Section title="Department Identification">
                                    <TextField
                                        key={`dept-cluster-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Cluster Number (1 - 99)"
                                        defaultValue={
                                            isEditMode
                                                ? (editingItem.cluster_code !== undefined && editingItem.cluster_code !== null
                                                    ? String(editingItem.cluster_code)
                                                    : (editingItem.code?.includes('-') ? editingItem.code.split('-')[0] : '1'))
                                                : computedNextCluster
                                        }
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 99) {
                                                setClusterCode(filtered);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        modifiers={textFieldModifiers}
                                    />
                                    {duplicateClusterDept && (
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color="#FF3B30">
                                                {`Cluster ${clusterCode} is already taken by ${duplicateClusterDept.name || duplicateClusterDept.code || 'another department'}`}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                    <TextField
                                        ref={deptCodeRef}
                                        key={`dept-code-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Department Code (3 Letters)"
                                        defaultValue={
                                            isEditMode
                                                ? (editingItem.code
                                                    ? (editingItem.code.includes('-') ? editingItem.code.split('-')[1] : editingItem.code)
                                                        .replace(/[^A-Za-z]/g, '')
                                                        .slice(0, 3)
                                                        .toUpperCase()
                                                    : '')
                                                : ''
                                        }
                                        onChangeText={(val) => {
                                            const lettersOnly = val.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
                                            setCode(lettersOnly);
                                            if (deptCodeRef.current && val !== lettersOnly) {
                                                deptCodeRef.current.setText(lettersOnly);
                                            }
                                        }}
                                        autocorrection={false}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>

                                <Section title="Department Details">
                                    <TextField
                                        key={`dept-name-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Department Name"
                                        defaultValue={isEditMode ? (editingItem.name || '') : ''}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>
                            </>
                        )}

                        {/* 2. POSITIONS */}
                        {moduleType === 'positions' && (
                            <>
                                <Section title="Department Assignment">
                                    {departmentsList.length > 0 ? (
                                        <Picker
                                            label="Department"
                                            options={departmentNames as any}
                                            selectedIndex={selectedDeptIndex}
                                            onOptionSelected={(e) => {
                                                const sel = departmentsList[e.nativeEvent.index];
                                                if (sel) {
                                                    setDepartmentId(sel.id);
                                                    if (!isEditMode) {
                                                        const deptPositions = (positionsList || []).filter((p: any) => p.department_id === sel.id);
                                                        const usedCats = deptPositions
                                                            .map((p: any) => parseInt(String(p.category_code ?? 0), 10))
                                                            .filter((n: number) => !isNaN(n) && n > 0);
                                                        const nextCat = usedCats.length > 0 ? Math.max(...usedCats) : 0;
                                                        setCategoryCode(String(nextCat + 1));
                                                    }
                                                }
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    ) : (
                                        <SwiftUIText size={14} color={subtextColor}>
                                            No departments available. Please create a department first.
                                        </SwiftUIText>
                                    )}
                                </Section>

                                <Section title="Position Identification">
                                    <TextField
                                        key={`pos-category-${editingItem?.id || 'new'}-${departmentId}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Position Number (1 - 99)"
                                        defaultValue={
                                            isEditMode
                                                ? String(editingItem.category_code ?? '1')
                                                : computedNextPositionCategory
                                        }
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 99) {
                                                setCategoryCode(filtered);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        modifiers={textFieldModifiers}
                                    />
                                    {duplicatePositionInDept && (
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color="#FF3B30">
                                                {`Number ${categoryCode} is already taken by ${duplicatePositionInDept.name || duplicatePositionInDept.code || 'another position'} in this department`}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                    <TextField
                                        ref={posCodeRef}
                                        key={`pos-code-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Position Code (2 Letters)"
                                        defaultValue={
                                            isEditMode
                                                ? (editingItem.code ? String(editingItem.code).toUpperCase() : '')
                                                : ''
                                        }
                                        onChangeText={(val) => {
                                            const lettersOnly = val.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
                                            setCode(lettersOnly);
                                            if (posCodeRef.current && val !== lettersOnly) {
                                                posCodeRef.current.setText(lettersOnly);
                                            }
                                        }}
                                        autocorrection={false}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>

                                <Section title="Position Details">
                                    <TextField
                                        key={`pos-name-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Position Name"
                                        defaultValue={isEditMode ? (editingItem.name || '') : ''}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>
                            </>
                        )}

                        {/* 3. LEVELS */}
                        {moduleType === 'levels' && (
                            <>
                                <Section title="Level Hierarchy">
                                    <TextField
                                        key={`lvl-grade-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Level Grade (0 - 99)"
                                        defaultValue={
                                            isEditMode
                                                ? String(editingItem.level_code ?? '0')
                                                : computedNextLevelGrade
                                        }
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 99) {
                                                setLevelCode(filtered);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        modifiers={textFieldModifiers}
                                    />
                                    {duplicateLevelGrade && (
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color="#FF3B30">
                                                {`Level grade ${levelCode} is already taken by ${duplicateLevelGrade.name || duplicateLevelGrade.code || 'another level'}`}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                    <HStack modifiers={[padding({ top: 4, bottom: 4 })]}>
                                        <SwiftUIText size={13} color={isDark ? '#8E8E93' : '#636366'}>
                                            Standard Roman:
                                        </SwiftUIText>
                                        <SwiftUIText size={13} weight="semibold" color={isDark ? '#FFFFFF' : '#000000'}>
                                            {` ${toRomanNumeral(parseInt(levelCode || '0', 10))}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <TextField
                                        ref={lvlCodeRef}
                                        key={`lvl-code-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Level Code (2-4 Letters)"
                                        defaultValue={
                                            isEditMode
                                                ? (editingItem.code ? String(editingItem.code).toUpperCase() : '')
                                                : ''
                                        }
                                        onChangeText={(val) => {
                                            const lettersOnly = val.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
                                            setCode(lettersOnly);
                                            if (lvlCodeRef.current && val !== lettersOnly) {
                                                lvlCodeRef.current.setText(lettersOnly);
                                            }
                                        }}
                                        autocorrection={false}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>

                                <Section title="Level Details">
                                    <TextField
                                        key={`lvl-name-${editingItem?.id || 'new'}-${isOpened ? 'opened' : 'closed'}`}
                                        placeholder="Level Name"
                                        defaultValue={isEditMode ? (editingItem.name || '') : ''}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>
                            </>
                        )}

                        {/* 4. CONTRACT TYPES */}
                        {moduleType === 'contract_types' && (
                            <>
                                <Section title="Contract Information">
                                    <TextField
                                        key={`contract-name-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Contract Name"
                                        defaultValue={name}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            e.g. Permanent, PKWT, Internship, Freelance
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Eligible Hierarchy Range">
                                    <Picker
                                        label="Minimum Level"
                                        options={levelOptions.map((o) => o.label) as any}
                                        selectedIndex={minLevelIndex !== -1 ? minLevelIndex : 0}
                                        onOptionSelected={(e) => {
                                            const selected = levelOptions[e.nativeEvent.index];
                                            if (selected) {
                                                setMinLevelCode(String(selected.code));
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <Picker
                                        label="Maximum Level"
                                        options={levelOptions.map((o) => o.label) as any}
                                        selectedIndex={maxLevelIndex !== -1 ? maxLevelIndex : Math.max(0, levelOptions.length - 1)}
                                        onOptionSelected={(e) => {
                                            const selected = levelOptions[e.nativeEvent.index];
                                            if (selected) {
                                                setMaxLevelCode(String(selected.code));
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                <Section title="Default Setting">
                                    <Switch
                                        label="Set as Default Contract Type"
                                        value={isDefault}
                                        onValueChange={setIsDefault}
                                        variant="switch"
                                    />
                                </Section>
                            </>
                        )}

                        {/* 5. WORK STATUSES */}
                        {moduleType === 'work_statuses' && (
                            <>
                                <Section title="Status Information">
                                    <TextField
                                        key={`wst-name-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Status Name"
                                        defaultValue={name}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            e.g. Active, On Leave, Remote, Resigned
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Color Preset">
                                    <Picker
                                        key={`wst-color-${editingItem?.id || 'new'}-${statusColor}-${isOpened}`}
                                        label="Badge Color"
                                        options={STATUS_COLOR_OPTIONS.map((c) => c.label) as any}
                                        selectedIndex={statusColorIndex !== -1 ? statusColorIndex : 0}
                                        onOptionSelected={(e) => {
                                            const selected = STATUS_COLOR_OPTIONS[e.nativeEvent.index];
                                            if (selected) {
                                                setStatusColor(selected.hex);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                <Section title="Visibility">
                                    <Picker
                                        key={`wst-vis-${editingItem?.id || 'new'}-${visibility}-${isOpened}`}
                                        label="Visibility Scope"
                                        options={VISIBILITY_OPTIONS as any}
                                        selectedIndex={visibilityIndex !== -1 ? visibilityIndex : 0}
                                        onOptionSelected={(e) => {
                                            const selected = VISIBILITY_OPTIONS[e.nativeEvent.index];
                                            if (selected) {
                                                setVisibility(selected);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>
                            </>
                        )}

                        {/* 6. WORK SCHEDULES */}
                        {moduleType === 'work_schedules' && (
                            <>
                                <Section title="Schedule Name">
                                    <TextField
                                        key={`ws-name-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Schedule Name"
                                        defaultValue={name}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            e.g. Headquarters Office, Warehouse Shift
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Schedule Type & Timezone">
                                    <Picker
                                        key={`ws-type-${editingItem?.id || 'new'}-${scheduleType}-${isOpened}`}
                                        label="Schedule Type"
                                        options={SCHEDULE_TYPE_OPTIONS.map((t) => t.label) as any}
                                        selectedIndex={scheduleTypeIndex !== -1 ? scheduleTypeIndex : 0}
                                        onOptionSelected={(e) => {
                                            const sel = SCHEDULE_TYPE_OPTIONS[e.nativeEvent.index];
                                            if (sel) {
                                                setScheduleType(sel.key);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <Picker
                                        key={`ws-tz-${editingItem?.id || 'new'}-${timezone}-${isOpened}`}
                                        label="Timezone"
                                        options={TIMEZONE_OPTIONS.map((t) => t.label) as any}
                                        selectedIndex={timezoneIndex !== -1 ? timezoneIndex : 0}
                                        onOptionSelected={(e) => {
                                            const sel = TIMEZONE_OPTIONS[e.nativeEvent.index];
                                            if (sel) {
                                                setTimezone(sel.key);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                <Section title="Default Hours & Breaks">
                                    <DateTimePicker
                                        key={`ws-start-picker-${startTime}-${isOpened}`}
                                        title="Default Start Time"
                                        displayedComponents="hourAndMinute"
                                        variant="compact"
                                        initialDate={timeStringToIso(startTime)}
                                        onDateSelected={(date) => {
                                            const timeStr = dateToTimeString(date);
                                            setStartTime(timeStr);
                                            setDaySchedules((prev) => {
                                                const next = { ...prev };
                                                WEEKDAYS.forEach((d) => {
                                                    if (next[d.key] && (scheduleType === 'Fixed' || next[d.key].start === startTime)) {
                                                        next[d.key] = { ...next[d.key], start: timeStr };
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                    />
                                    <DateTimePicker
                                        key={`ws-end-picker-${endTime}-${isOpened}`}
                                        title="Default End Time"
                                        displayedComponents="hourAndMinute"
                                        variant="compact"
                                        initialDate={timeStringToIso(endTime)}
                                        onDateSelected={(date) => {
                                            const timeStr = dateToTimeString(date);
                                            setEndTime(timeStr);
                                            setDaySchedules((prev) => {
                                                const next = { ...prev };
                                                WEEKDAYS.forEach((d) => {
                                                    if (next[d.key] && (scheduleType === 'Fixed' || next[d.key].end === endTime)) {
                                                        next[d.key] = { ...next[d.key], end: timeStr };
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                    />
                                    <Picker
                                        key={`ws-break-${editingItem?.id || 'new'}-${breakDuration}-${isOpened}`}
                                        label="Break Duration"
                                        options={BREAK_OPTIONS.map((b) => `${b} min`) as any}
                                        selectedIndex={breakDurationIndex !== -1 ? breakDurationIndex : 4}
                                        onOptionSelected={(e) => {
                                            const sel = BREAK_OPTIONS[e.nativeEvent.index];
                                            if (sel) {
                                                setBreakDuration(sel);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                {/* 1. FIXED: WORKING DAYS WITH UNIFORM HOURS */}
                                {scheduleType === 'Fixed' && (
                                    <Section title="Weekly Working Days">
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                                {`Select working days (applies ${startTime} - ${endTime})`}
                                            </SwiftUIText>
                                        </HStack>
                                        {WEEKDAYS.map((day) => {
                                            const sched = daySchedules[day.key] || { enabled: false, start: startTime, end: endTime };
                                            return (
                                                <Switch
                                                    key={`ws-fixed-day-${day.key}-${sched.enabled}`}
                                                    label={day.label}
                                                    value={sched.enabled}
                                                    onValueChange={(val) => {
                                                        setDaySchedules((prev) => ({
                                                            ...prev,
                                                            [day.key]: {
                                                                ...(prev[day.key] || { start: startTime, end: endTime }),
                                                                enabled: val,
                                                            },
                                                        }));
                                                    }}
                                                    variant="switch"
                                                />
                                            );
                                        })}
                                    </Section>
                                )}

                                {/* 2. CUSTOM: PER-DAY WORKING DAYS & INDIVIDUAL CLOCK PICKERS */}
                                {scheduleType === 'Custom' && (
                                    <Section title="Custom Daily Schedule">
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                                Toggle working days and customize start & end times for each day
                                            </SwiftUIText>
                                        </HStack>
                                        {WEEKDAYS.map((day) => {
                                            const sched = daySchedules[day.key] || { enabled: false, start: startTime, end: endTime };
                                            return (
                                                <React.Fragment key={`custom-day-block-${day.key}`}>
                                                    <Switch
                                                        key={`ws-cust-day-${day.key}-${sched.enabled}`}
                                                        label={day.label}
                                                        value={sched.enabled}
                                                        onValueChange={(val) => {
                                                            setDaySchedules((prev) => ({
                                                                ...prev,
                                                                [day.key]: {
                                                                    ...(prev[day.key] || { start: startTime, end: endTime }),
                                                                    enabled: val,
                                                                },
                                                            }));
                                                        }}
                                                        variant="switch"
                                                    />
                                                    {sched.enabled && (
                                                        <>
                                                            <DateTimePicker
                                                                key={`ws-cust-${day.key}-start-${sched.start}`}
                                                                title="   ↳ Start Time"
                                                                displayedComponents="hourAndMinute"
                                                                variant="compact"
                                                                initialDate={timeStringToIso(sched.start)}
                                                                onDateSelected={(date) => {
                                                                    const timeStr = dateToTimeString(date);
                                                                    setDaySchedules((prev) => ({
                                                                        ...prev,
                                                                        [day.key]: {
                                                                            ...prev[day.key],
                                                                            start: timeStr,
                                                                        },
                                                                    }));
                                                                }}
                                                            />
                                                            <DateTimePicker
                                                                key={`ws-cust-${day.key}-end-${sched.end}`}
                                                                title="   ↳ End Time"
                                                                displayedComponents="hourAndMinute"
                                                                variant="compact"
                                                                initialDate={timeStringToIso(sched.end)}
                                                                onDateSelected={(date) => {
                                                                    const timeStr = dateToTimeString(date);
                                                                    setDaySchedules((prev) => ({
                                                                        ...prev,
                                                                        [day.key]: {
                                                                            ...prev[day.key],
                                                                            end: timeStr,
                                                                        },
                                                                    }));
                                                                }}
                                                            />
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </Section>
                                )}

                                {/* 3. FLEXIBLE: DAYS PER WEEK */}
                                {scheduleType === 'Flexible' && (
                                    <Section title="Weekly Commitment">
                                        <Picker
                                            key={`ws-dpw-${editingItem?.id || 'new'}-${daysPerWeek}-${isOpened}`}
                                            label="Days per Week"
                                            options={DAYS_PER_WEEK_OPTIONS.map((d) => `${d} Days / Week`) as any}
                                            selectedIndex={daysPerWeekIndex !== -1 ? daysPerWeekIndex : 4}
                                            onOptionSelected={(e) => {
                                                const sel = DAYS_PER_WEEK_OPTIONS[e.nativeEvent.index];
                                                if (sel) {
                                                    setDaysPerWeek(sel);
                                                }
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    </Section>
                                )}
                            </>
                        )}

                        {/* 6. POLICIES & LEAVE */}
                        {/* 7. EMPLOYMENT POLICIES */}
                        {moduleType === 'employment_policies' && (
                            <>
                                <Section title="Contract Type">
                                    <Picker
                                        key={`pol-ct-${editingItem?.id || 'new'}-${policyContractTypeId}-${isOpened}`}
                                        label="Contract Type"
                                        options={contractTypesList.map((c: any) => c.name) as any}
                                        selectedIndex={policyContractTypeIndex !== -1 ? policyContractTypeIndex : 0}
                                        onOptionSelected={(e) => {
                                            const sel = contractTypesList[e.nativeEvent.index];
                                            if (sel) {
                                                setPolicyContractTypeId(sel.id);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            Select the contract type this policy rule applies to
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Standard Work Hours">
                                    <TextField
                                        key={`pol-hours-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Weekly Hours (e.g. 40, 28)"
                                        defaultValue={policyDefaultHours}
                                        onChangeText={setPolicyDefaultHours}
                                        keyboardType="numeric"
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            Determines baseline work commitment matched with assigned work schedules
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Overtime Policy">
                                    <Switch
                                        key={`pol-ot-${policyOvertimeEligible}`}
                                        label="Eligible for Overtime"
                                        value={policyOvertimeEligible}
                                        onValueChange={setPolicyOvertimeEligible}
                                        variant="switch"
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            Enables automated overtime tracking & compensation calculated from clock timestamps
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Benefits & Allowances Policy">
                                    <Switch
                                        key={`pol-ben-${policyBenefitsEligible}`}
                                        label="Eligible for Benefits & Allowances"
                                        value={policyBenefitsEligible}
                                        onValueChange={setPolicyBenefitsEligible}
                                        variant="switch"
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            Directly impacts and links allowance disbursements to monthly KPI evaluation
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Policy Notes">
                                    <TextField
                                        key={`pol-notes-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Add policy notes or compliance remarks..."
                                        defaultValue={policyNotes}
                                        onChangeText={setPolicyNotes}
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            Specific terms, regulatory compliance guidelines, or special conditions
                                        </SwiftUIText>
                                    </HStack>
                                </Section>
                            </>
                        )}

                        {/* 8. LEAVE POLICIES */}
                        {moduleType === 'leave_policies' && (
                            <>
                                <Section title="Policy Name & Leave Type">
                                    <TextField
                                        key={`lp-name-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="e.g. Annual Leave — Full-time, Sick Leave..."
                                        defaultValue={name}
                                        onChangeText={setName}
                                        modifiers={textFieldModifiers}
                                    />
                                    <Picker
                                        key={`lp-type-${editingItem?.id || 'new'}-${leaveType}-${isOpened}`}
                                        label="Leave Type"
                                        options={LEAVE_TYPE_OPTIONS.map((o) => o.label) as any}
                                        selectedIndex={Math.max(0, LEAVE_TYPE_OPTIONS.findIndex((o) => o.key === leaveType))}
                                        onOptionSelected={(e) => {
                                            const opt = LEAVE_TYPE_OPTIONS[e.nativeEvent.index];
                                            if (opt) {
                                                setLeaveType(opt.key);
                                                if (opt.key === 'sick') {
                                                    setLeaveEvidenceMode('optional');
                                                    setLeaveMinNoticePreset('immediate');
                                                    setLeaveMinNoticeDays('0');
                                                } else if (opt.key === 'maternity_paternity') {
                                                    setLeaveEvidenceMode('required');
                                                    setLeaveMinNoticePreset('7_days');
                                                    setLeaveMinNoticeDays('7');
                                                } else if (opt.key === 'annual') {
                                                    setLeaveEvidenceMode('disabled');
                                                    setLeaveMinNoticePreset('7_days');
                                                    setLeaveMinNoticeDays('7');
                                                }
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <Switch
                                        key={`lp-paid-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.is_paid}` : leaveIsPaid}-${isOpened}`}
                                        label="Paid Leave (Compensated)"
                                        value={leaveType === 'permission' ? Boolean(permissionSubtypes[selectedSubtypeConfigIdx]?.is_paid ?? true) : leaveIsPaid}
                                        onValueChange={(val) => {
                                            if (leaveType === 'permission') {
                                                const updated = [...permissionSubtypes];
                                                const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                if (updated[idx]) {
                                                    updated[idx] = { ...updated[idx], is_paid: val };
                                                    setPermissionSubtypes(updated);
                                                }
                                            } else {
                                                setLeaveIsPaid(val);
                                            }
                                        }}
                                        variant="switch"
                                    />
                                </Section>

                                {leaveType === 'permission' && (
                                    <Section title="Permission Subtype Selection">
                                        <Picker
                                            label="Subtype to Configure"
                                            options={permissionSubtypes.map((st) => `${st.name} ${st.is_enabled ? '• Active' : '• Disabled'}`)}
                                            selectedIndex={selectedSubtypeConfigIdx}
                                            onOptionSelected={(e) => setSelectedSubtypeConfigIdx(e.nativeEvent.index)}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />

                                        {(() => {
                                            const st = permissionSubtypes[selectedSubtypeConfigIdx] || permissionSubtypes[0];
                                            if (!st) return null;
                                            const idx = selectedSubtypeConfigIdx;

                                            return (
                                                <HStack alignment="center" modifiers={[padding({ vertical: 2 })]}>
                                                    <VStack alignment="leading" spacing={2}>
                                                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                            {`Enable ${st.name}`}
                                                        </SwiftUIText>
                                                        <SwiftUIText size={12} color={st.is_enabled ? (st.is_paid ? '#34C759' : '#FF9500') : subtextColor}>
                                                            {st.is_enabled
                                                                ? `Active in employee requests • Max ${st.max_days} ${st.max_days === 1 ? 'day' : 'days'} • ${st.is_paid ? 'Paid' : 'Unpaid'}`
                                                                : 'Disabled in employee request options'}
                                                        </SwiftUIText>
                                                    </VStack>
                                                    <Spacer />
                                                    <Switch
                                                        label=""
                                                        value={st.is_enabled}
                                                        onValueChange={(val) => {
                                                            const updated = [...permissionSubtypes];
                                                            if (updated[idx]) {
                                                                updated[idx] = { ...updated[idx], is_enabled: val };
                                                                setPermissionSubtypes(updated);
                                                            }
                                                        }}
                                                        variant="switch"
                                                    />
                                                </HStack>
                                            );
                                        })()}
                                    </Section>
                                )}

                                <Section title="Entitlement Quota & Cycle">
                                    <Picker
                                        key={`lp-cycle-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.quota_cycle || 'yearly'}` : leaveQuotaCycle}-${isOpened}`}
                                        label="Quota Cycle"
                                        options={['Yearly Cycle (per year)', 'Monthly Cycle (per month)'] as any}
                                        selectedIndex={(leaveType === 'permission' ? (permissionSubtypes[selectedSubtypeConfigIdx]?.quota_cycle === 'monthly') : (leaveQuotaCycle === 'monthly')) ? 1 : 0}
                                        onOptionSelected={(e) => {
                                            const cycle = e.nativeEvent.index === 1 ? 'monthly' : 'yearly';
                                            if (leaveType === 'permission') {
                                                const updated = [...permissionSubtypes];
                                                const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                if (updated[idx]) {
                                                    updated[idx] = { ...updated[idx], quota_cycle: cycle };
                                                    setPermissionSubtypes(updated);
                                                }
                                            } else {
                                                setLeaveQuotaCycle(cycle);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <TextField
                                        key={`lp-ann-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.max_days}` : leaveAnnualQuota}-${isOpened}`}
                                        placeholder={(leaveType === 'permission' ? (permissionSubtypes[selectedSubtypeConfigIdx]?.quota_cycle === 'monthly') : (leaveQuotaCycle === 'monthly')) ? '1' : '12'}
                                        defaultValue={leaveType === 'permission' ? String(permissionSubtypes[selectedSubtypeConfigIdx]?.max_days ?? 1) : leaveAnnualQuota}
                                        onChangeText={(text) => {
                                            if (leaveType === 'permission') {
                                                const updated = [...permissionSubtypes];
                                                const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                if (updated[idx]) {
                                                    updated[idx] = { ...updated[idx], max_days: parseFloat(text) || 0 };
                                                    setPermissionSubtypes(updated);
                                                }
                                            } else {
                                                setLeaveAnnualQuota(text);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        modifiers={textFieldModifiers}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                            {(leaveType === 'permission' ? (permissionSubtypes[selectedSubtypeConfigIdx]?.quota_cycle === 'monthly') : (leaveQuotaCycle === 'monthly')) ? 'Total allocated days per monthly cycle' : 'Total allocated days per yearly cycle'}
                                        </SwiftUIText>
                                    </HStack>

                                    <Picker
                                        key={`lp-maxmo-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.max_days_per_month_mode || 'unlimited'}` : leaveMaxDaysPerMonthMode}-${isOpened}`}
                                        label="Monthly Usage Limit"
                                        options={['Unlimited (No monthly cap)', 'Limited (Custom max days/month)'] as any}
                                        selectedIndex={(leaveType === 'permission' ? (permissionSubtypes[selectedSubtypeConfigIdx]?.max_days_per_month_mode === 'limited') : (leaveMaxDaysPerMonthMode === 'limited')) ? 1 : 0}
                                        onOptionSelected={(e) => {
                                            const mode = e.nativeEvent.index === 1 ? 'limited' : 'unlimited';
                                            if (leaveType === 'permission') {
                                                const updated = [...permissionSubtypes];
                                                const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                if (updated[idx]) {
                                                    updated[idx] = { ...updated[idx], max_days_per_month_mode: mode };
                                                    setPermissionSubtypes(updated);
                                                }
                                            } else {
                                                setLeaveMaxDaysPerMonthMode(mode);
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />

                                    {((leaveType === 'permission' ? permissionSubtypes[selectedSubtypeConfigIdx]?.max_days_per_month_mode : leaveMaxDaysPerMonthMode) === 'limited') && (
                                        <>
                                            <TextField
                                                key={`lp-maxmodays-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.max_days_per_month ?? ''}` : leaveMaxDaysPerMonth}-${isOpened}`}
                                                placeholder="2"
                                                defaultValue={leaveType === 'permission' ? String(permissionSubtypes[selectedSubtypeConfigIdx]?.max_days_per_month ?? '') : leaveMaxDaysPerMonth}
                                                onChangeText={(text) => {
                                                    if (leaveType === 'permission') {
                                                        const updated = [...permissionSubtypes];
                                                        const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                        if (updated[idx]) {
                                                            updated[idx] = { ...updated[idx], max_days_per_month: parseInt(text, 10) || null };
                                                            setPermissionSubtypes(updated);
                                                        }
                                                    } else {
                                                        setLeaveMaxDaysPerMonth(text);
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                modifiers={textFieldModifiers}
                                            />
                                            <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                                <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                                    Maximum leave days allowed to be taken in a single month
                                                </SwiftUIText>
                                            </HStack>
                                        </>
                                    )}
                                </Section>

                                <Section title="Eligibility / Applies To">
                                    <Picker
                                        key={`lp-appliesto-${editingItem?.id || 'new'}-${leaveAppliesTo}-${isOpened}`}
                                        label="Applies To"
                                        options={LEAVE_APPLIES_TO_OPTIONS.map((o) => o.label) as any}
                                        selectedIndex={Math.max(0, LEAVE_APPLIES_TO_OPTIONS.findIndex((o) => o.key === leaveAppliesTo))}
                                        onOptionSelected={(e) => {
                                            const opt = LEAVE_APPLIES_TO_OPTIONS[e.nativeEvent.index];
                                            if (opt) setLeaveAppliesTo(opt.key);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />

                                    {leaveAppliesTo === 'employment_type' && (
                                        <Picker
                                            key={`lp-ct-${editingItem?.id || 'new'}-${leaveContractType}-${isOpened}`}
                                            label="Target Contract"
                                            options={['All Contract Types', ...(contractTypesList || []).map((c: any) => c.name || 'Contract')] as any}
                                            selectedIndex={(() => {
                                                const opts = ['All Contract Types', ...(contractTypesList || []).map((c: any) => c.name || 'Contract')];
                                                const idx = opts.findIndex((o) => o.toLowerCase() === (leaveContractType || '').toLowerCase());
                                                return idx !== -1 ? idx : 0;
                                            })()}
                                            onOptionSelected={(e) => {
                                                const opts = ['All Contract Types', ...(contractTypesList || []).map((c: any) => c.name || 'Contract')];
                                                const sel = opts[e.nativeEvent.index];
                                                setLeaveContractType(sel === 'All Contract Types' ? 'All' : sel);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}

                                    {leaveAppliesTo === 'department' && (
                                        <Picker
                                            key={`lp-dept-${editingItem?.id || 'new'}-${leaveTargetDeptId}-${isOpened}`}
                                            label="Target Department"
                                            options={['Select Department', ...(departmentsList || []).map((d: any) => d.name || 'Dept')] as any}
                                            selectedIndex={leaveTargetDeptId ? Math.max(1, (departmentsList || []).findIndex((d: any) => d.id === leaveTargetDeptId) + 1) : 0}
                                            onOptionSelected={(e) => {
                                                const idx = e.nativeEvent.index;
                                                if (idx === 0) setLeaveTargetDeptId('');
                                                else setLeaveTargetDeptId(departmentsList[idx - 1]?.id || '');
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}

                                    {leaveAppliesTo === 'position' && (
                                        <Picker
                                            key={`lp-pos-${editingItem?.id || 'new'}-${leaveTargetPosId}-${isOpened}`}
                                            label="Target Position"
                                            options={['Select Position', ...(positionsList || []).map((p: any) => {
                                                const parentDept = (departmentsList || []).find((d: any) => d.id === p.department_id);
                                                return parentDept ? `${p.name} (${parentDept.name})` : (p.name || 'Position');
                                            })] as any}
                                            selectedIndex={leaveTargetPosId ? Math.max(1, (positionsList || []).findIndex((p: any) => p.id === leaveTargetPosId) + 1) : 0}
                                            onOptionSelected={(e) => {
                                                const idx = e.nativeEvent.index;
                                                if (idx === 0) setLeaveTargetPosId('');
                                                else setLeaveTargetPosId(positionsList[idx - 1]?.id || '');
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}

                                    {leaveAppliesTo === 'level' && (
                                        <Picker
                                            key={`lp-lvl-${editingItem?.id || 'new'}-${leaveTargetLevelId}-${isOpened}`}
                                            label="Target Level"
                                            options={['Select Level', ...(levelsList || []).map((l: any) => `Level ${l.level_code !== undefined ? l.level_code : ''} ${l.name ? `- ${l.name}` : ''}`.trim())] as any}
                                            selectedIndex={leaveTargetLevelId ? Math.max(1, (levelsList || []).findIndex((l: any) => l.id === leaveTargetLevelId) + 1) : 0}
                                            onOptionSelected={(e) => {
                                                const idx = e.nativeEvent.index;
                                                if (idx === 0) setLeaveTargetLevelId('');
                                                else setLeaveTargetLevelId(levelsList[idx - 1]?.id || '');
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}
                                </Section>

                                <Section title="Approval & Reason Requirements">
                                    <Switch
                                        key={`lp-appr-${leaveRequireApproval}`}
                                        label="Require Manager / HR Approval"
                                        value={leaveRequireApproval}
                                        onValueChange={setLeaveRequireApproval}
                                        variant="switch"
                                    />
                                    <Switch
                                        key={`lp-reas-${leaveRequireReason}`}
                                        label="Require Submission Reason"
                                        value={leaveRequireReason}
                                        onValueChange={setLeaveRequireReason}
                                        variant="switch"
                                    />
                                    <Picker
                                        key={`lp-evid-${editingItem?.id || 'new'}-${leaveEvidenceMode}-${isOpened}`}
                                        label="Evidence Attachment"
                                        options={EVIDENCE_MODE_OPTIONS.map((o) => o.label) as any}
                                        selectedIndex={Math.max(0, EVIDENCE_MODE_OPTIONS.findIndex((o) => o.key === leaveEvidenceMode))}
                                        onOptionSelected={(e) => {
                                            const opt = EVIDENCE_MODE_OPTIONS[e.nativeEvent.index];
                                            if (opt) setLeaveEvidenceMode(opt.key);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                <Section title="Minimum Advance Notice">
                                    <Picker
                                        key={`lp-notice-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_preset || 'immediate'}-${permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days}` : `${leaveMinNoticePreset}-${leaveMinNoticeDays}`}-${isOpened}`}
                                        label="Notice Timing"
                                        options={ADVANCE_NOTICE_OPTIONS.map((o) => o.label) as any}
                                        selectedIndex={(() => {
                                            const currentPreset = leaveType === 'permission'
                                                ? (permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_preset || (permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days ? (permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days === 1 ? '1_day' : permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days === 3 ? '3_days' : permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days === 7 ? '7_days' : 'custom') : 'immediate'))
                                                : leaveMinNoticePreset;
                                            return Math.max(0, ADVANCE_NOTICE_OPTIONS.findIndex((o) => o.key === currentPreset));
                                        })()}
                                        onOptionSelected={(e) => {
                                            const opt = ADVANCE_NOTICE_OPTIONS[e.nativeEvent.index];
                                            if (opt) {
                                                if (leaveType === 'permission') {
                                                    const updated = [...permissionSubtypes];
                                                    const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                    if (updated[idx]) {
                                                        updated[idx] = {
                                                            ...updated[idx],
                                                            min_notice_preset: opt.key,
                                                            min_notice_days: opt.key !== 'custom' ? opt.days : (updated[idx]?.min_notice_days ?? 0),
                                                        };
                                                        setPermissionSubtypes(updated);
                                                    }
                                                } else {
                                                    setLeaveMinNoticePreset(opt.key);
                                                    if (opt.key !== 'custom') {
                                                        setLeaveMinNoticeDays(String(opt.days));
                                                    }
                                                }
                                            }
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    {((leaveType === 'permission' ? (permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_preset || (permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days ? 'custom' : 'immediate')) : leaveMinNoticePreset) === 'custom') && (
                                        <TextField
                                            key={`lp-noticenum-${editingItem?.id || 'new'}-${leaveType === 'permission' ? `${permissionSubtypes[selectedSubtypeConfigIdx]?.id}-${permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days}` : leaveMinNoticeDays}-${isOpened}`}
                                            placeholder="Days in advance (e.g. 5)"
                                            defaultValue={leaveType === 'permission' ? String(permissionSubtypes[selectedSubtypeConfigIdx]?.min_notice_days ?? 0) : leaveMinNoticeDays}
                                            onChangeText={(text) => {
                                                if (leaveType === 'permission') {
                                                    const updated = [...permissionSubtypes];
                                                    const idx = selectedSubtypeConfigIdx >= 0 && selectedSubtypeConfigIdx < updated.length ? selectedSubtypeConfigIdx : 0;
                                                    if (updated[idx]) {
                                                        updated[idx] = { ...updated[idx], min_notice_days: parseInt(text, 10) || 0 };
                                                        setPermissionSubtypes(updated);
                                                    }
                                                } else {
                                                    setLeaveMinNoticeDays(text);
                                                }
                                            }}
                                            keyboardType="numeric"
                                            modifiers={textFieldModifiers}
                                        />
                                    )}
                                </Section>

                                {leaveType === 'annual' && (
                                    <Section title="Annual Leave & Proration Rules">
                                        <TextField
                                            key={`lp-eff-${editingItem?.id || 'new'}-${isOpened}`}
                                            placeholder="e.g. 12 (months)"
                                            defaultValue={leaveEffectiveMonths}
                                            onChangeText={setLeaveEffectiveMonths}
                                            keyboardType="numeric"
                                            modifiers={textFieldModifiers}
                                        />
                                        <HStack modifiers={[padding({ top: 2, bottom: 2 })]}>
                                            <SwiftUIText size={12} color={isDark ? '#8E8E93' : '#636366'}>
                                                Eligibility Waiting Period (months before entitlement activates)
                                            </SwiftUIText>
                                        </HStack>

                                        <Picker
                                            key={`lp-fye-${editingItem?.id || 'new'}-${leaveFirstYearEntitlement}-${isOpened}`}
                                            label="First-Year Entitlement"
                                            options={FIRST_YEAR_ENTITLEMENT_OPTIONS.map((o) => o.label) as any}
                                            selectedIndex={Math.max(0, FIRST_YEAR_ENTITLEMENT_OPTIONS.findIndex((o) => o.key === leaveFirstYearEntitlement))}
                                            onOptionSelected={(e) => {
                                                const opt = FIRST_YEAR_ENTITLEMENT_OPTIONS[e.nativeEvent.index];
                                                if (opt) setLeaveFirstYearEntitlement(opt.key);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />

                                        {leaveFirstYearEntitlement === 'prorated' && (
                                            <Picker
                                                key={`lp-round-${editingItem?.id || 'new'}-${leaveRoundingRule}-${isOpened}`}
                                                label="Rounding Rule"
                                                options={ROUNDING_RULE_OPTIONS.map((o) => o.label) as any}
                                                selectedIndex={Math.max(0, ROUNDING_RULE_OPTIONS.findIndex((o) => o.key === leaveRoundingRule))}
                                                onOptionSelected={(e) => {
                                                    const opt = ROUNDING_RULE_OPTIONS[e.nativeEvent.index];
                                                    if (opt) setLeaveRoundingRule(opt.key);
                                                }}
                                                variant="menu"
                                                color={nativeControlTextColor}
                                                modifiers={menuControlModifiers}
                                            />
                                        )}
                                    </Section>
                                )}

                                <Section title="Description & Policy Notes">
                                    <TextField
                                        key={`lp-desc-${editingItem?.id || 'new'}-${isOpened}`}
                                        placeholder="Add policy remarks, guidelines, or conditions..."
                                        defaultValue={leaveDescription}
                                        onChangeText={setLeaveDescription}
                                        modifiers={textFieldModifiers}
                                    />
                                </Section>
                            </>
                        )}

                        {/* STATUS PICKER */}
                        <Section title="Status">
                            <Picker
                                key={`common-status-${editingItem?.id || 'new'}-${status}-${isOpened}`}
                                label="Status"
                                options={STATUS_OPTIONS as any}
                                selectedIndex={statusIndex}
                                onOptionSelected={(e) => {
                                    setStatus(STATUS_OPTIONS[e.nativeEvent.index] || 'Active');
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>
                    </Form>

                    {/* Footer Action Buttons */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background(sheetBg),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        <Button
                            variant="glass"
                            color="gray"
                            onPress={onClose}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17}>
                                    Cancel
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSave}
                            disabled={isSubmitting}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSubmitting
                                        ? 'Saving...'
                                        : customSubmitLabel || (isEditMode ? 'Save Changes' : 'Save')}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
