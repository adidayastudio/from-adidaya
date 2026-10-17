import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    TouchableWithoutFeedback,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import * as Haptics from 'expo-haptics';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';

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
    { key: 'UTC', label: 'UTC (GMT+0)' },
] as const;

const WEEKDAYS = [
    { key: 'Mon', label: 'Mon' },
    { key: 'Tue', label: 'Tue' },
    { key: 'Wed', label: 'Wed' },
    { key: 'Thu', label: 'Thu' },
    { key: 'Fri', label: 'Fri' },
    { key: 'Sat', label: 'Sat' },
    { key: 'Sun', label: 'Sun' },
] as const;

const LEAVE_TYPE_OPTIONS = [
    { key: 'annual', label: 'Annual Leave' },
    { key: 'sick', label: 'Sick Leave' },
    { key: 'permission', label: 'Permission' },
    { key: 'unpaid', label: 'Unpaid Leave' },
    { key: 'maternity_paternity', label: 'Maternity / Paternity' },
    { key: 'custom', label: 'Custom Policy' },
] as const;

const QUOTA_CYCLE_OPTIONS = [
    { key: 'yearly', label: 'Yearly Cycle (Per Year)' },
    { key: 'monthly', label: 'Monthly Cycle (Per Month)' },
] as const;

const EVIDENCE_OPTIONS = [
    { key: 'disabled', label: 'Disabled (No Attachment)' },
    { key: 'optional', label: 'Optional Supporting Document' },
    { key: 'required', label: 'Required (Mandatory)' },
] as const;

const NOTICE_OPTIONS = [
    { key: 'immediate', label: 'Immediate / Same Day' },
    { key: '1_day', label: '1 Day in Advance' },
    { key: '3_days', label: '3 Days in Advance' },
    { key: '7_days', label: '7 Days in Advance' },
    { key: 'custom', label: 'Custom Days' },
] as const;

const APPLIES_TO_OPTIONS = [
    { key: 'all', label: 'All Company Employees' },
    { key: 'employment_type', label: 'Specific Contract Type' },
] as const;

export const STATUS_COLOR_OPTIONS = [
    { label: 'Emerald Green', hex: '#10B981' },
    { label: 'Mint Teal', hex: '#14B8A6' },
    { label: 'Cyan', hex: '#06B6D4' },
    { label: 'Sky Blue', hex: '#0EA5E9' },
    { label: 'Royal Blue', hex: '#3B82F6' },
    { label: 'Indigo', hex: '#6366F1' },
    { label: 'Violet', hex: '#8B5CF6' },
    { label: 'Purple', hex: '#A855F7' },
    { label: 'Pink', hex: '#EC4899' },
    { label: 'Rose', hex: '#F43F5E' },
    { label: 'Crimson Red', hex: '#EF4444' },
    { label: 'Coral Orange', hex: '#F97316' },
    { label: 'Amber', hex: '#F59E0B' },
    { label: 'Lime', hex: '#84CC16' },
    { label: 'Slate Gray', hex: '#64748B' },
    { label: 'Neutral Gray', hex: '#6B7280' },
] as const;

export const VISIBILITY_OPTIONS = ['Public', 'Team Only', 'Private'] as const;
export const BREAK_OPTIONS = ['0', '15', '30', '45', '60', '90', '120'] as const;

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
    onDelete?: (item: any) => Promise<void> | void;
    isSubmitting?: boolean;
    customTitle?: string;
    customSubmitLabel?: string;
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

export const SwiftUISetupItemSheet: React.FC<SwiftUISetupItemSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUISetupItemSheet.ios').SwiftUISetupItemSheet;
        return <Comp {...props} />;
    }

    const {
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
        onDelete,
        isSubmitting = false,
        customTitle,
        customSubmitLabel,
    } = props;

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isEditMode = !!editingItem?.id;

    const { width: screenWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && screenWidth >= 768;

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const accentColor = '#007AFF'; // People / Forma Blue

    // Floating side slide transition
    const slideOffset = isDesktop ? 520 : 600;
    const slideProgress = useSharedValue(slideOffset);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (isOpened) {
            slideProgress.value = withTiming(0, {
                duration: 250,
                easing: Easing.out(Easing.cubic),
            });
            backdropOpacity.value = withTiming(1, { duration: 200 });
        } else {
            slideProgress.value = slideOffset;
            backdropOpacity.value = 0;
        }
    }, [isOpened, isDesktop, slideOffset]);

    const handleClose = useCallback(() => {
        backdropOpacity.value = withTiming(0, { duration: 160 });
        slideProgress.value = withTiming(slideOffset, {
            duration: 200,
            easing: Easing.in(Easing.cubic),
        });
        setTimeout(() => {
            onClose();
        }, 200);
    }, [slideOffset, onClose]);

    const animatedDrawerStyle = useAnimatedStyle(() => {
        if (isDesktop) {
            return {
                transform: [{ translateX: slideProgress.value }],
            };
        }
        return {
            transform: [{ translateY: slideProgress.value }],
        };
    });

    const animatedBackdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    // Form states
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<string>('Active');

    // Department & Position specifics
    const [clusterCode, setClusterCode] = useState('1');
    const [departmentId, setDepartmentId] = useState('');
    const [categoryCode, setCategoryCode] = useState('1');
    const [levelCode, setLevelCode] = useState('0');

    // Work Schedules specifics
    const [scheduleType, setScheduleType] = useState<string>('Fixed');
    const [timezone, setTimezone] = useState<string>('Asia/Jakarta');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [breakDuration, setBreakDuration] = useState('60');
    const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [daysPerWeek, setDaysPerWeek] = useState('5');
    const [daySchedules, setDaySchedules] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
        Mon: { enabled: true, start: '09:00', end: '17:00' },
        Tue: { enabled: true, start: '09:00', end: '17:00' },
        Wed: { enabled: true, start: '09:00', end: '17:00' },
        Thu: { enabled: true, start: '09:00', end: '17:00' },
        Fri: { enabled: true, start: '09:00', end: '17:00' },
        Sat: { enabled: false, start: '09:00', end: '17:00' },
        Sun: { enabled: false, start: '09:00', end: '17:00' },
    });

    // Leave Policies specifics
    const [leaveType, setLeaveType] = useState('annual');
    const [leaveAnnualQuota, setLeaveAnnualQuota] = useState('12');
    const [leaveQuotaCycle, setLeaveQuotaCycle] = useState<'yearly' | 'monthly'>('yearly');
    const [leaveAppliesTo, setLeaveAppliesTo] = useState<'all' | 'employment_type'>('all');
    const [leaveContractType, setLeaveContractType] = useState('All');
    const [leaveRequireApproval, setLeaveRequireApproval] = useState(true);
    const [leaveEvidenceMode, setLeaveEvidenceMode] = useState<'disabled' | 'optional' | 'required'>('disabled');
    const [leaveMinNoticePreset, setLeaveMinNoticePreset] = useState<'immediate' | '1_day' | '3_days' | '7_days' | 'custom'>('7_days');
    const [leaveMinNoticeDays, setLeaveMinNoticeDays] = useState('7');
    const [leaveEffectiveMonths, setLeaveEffectiveMonths] = useState('0');
    const [leaveCarryOverAllowed, setLeaveCarryOverAllowed] = useState(false);
    const [leaveIsPaid, setLeaveIsPaid] = useState(true);

    // Employment Policies specifics
    const [policyContractTypeId, setPolicyContractTypeId] = useState('');
    const [policyDefaultHours, setPolicyDefaultHours] = useState('40');
    const [policyOvertimeEligible, setPolicyOvertimeEligible] = useState(true);
    const [policyBenefitsEligible, setPolicyBenefitsEligible] = useState(true);
    const [policyNotes, setPolicyNotes] = useState('');

    // Contract Types specifics
    const [minLevelCode, setMinLevelCode] = useState('0');
    const [maxLevelCode, setMaxLevelCode] = useState('8');
    const [isDefault, setIsDefault] = useState(false);

    // Work Statuses specifics
    const [statusColor, setStatusColor] = useState<string>('#10B981');
    const [visibility, setVisibility] = useState<typeof VISIBILITY_OPTIONS[number]>('Public');

    // Computed next available cluster number (1-99)
    const computedNextCluster = useMemo(() => {
        if (!departmentsList || departmentsList.length === 0) return '1';
        const usedClusters = departmentsList
            .map((d: any) => parseInt(String(d.cluster_code ?? d.order_index ?? 0), 10))
            .filter((n: number) => !isNaN(n) && n > 0);
        const maxCluster = usedClusters.length > 0 ? Math.max(...usedClusters) : 0;
        return String(maxCluster + 1);
    }, [departmentsList]);

    // Check duplicate cluster number in real-time
    const duplicateClusterDept = useMemo(() => {
        if (moduleType !== 'departments' || !clusterCode.trim()) return null;
        const num = parseInt(clusterCode, 10);
        if (isNaN(num)) return null;
        return (departmentsList || []).find(
            (d: any) =>
                d.id !== editingItem?.id &&
                parseInt(String(d.cluster_code ?? d.order_index ?? 0), 10) === num
        );
    }, [moduleType, clusterCode, departmentsList, editingItem]);

    // Active departments list for positions department assignment
    const activeDepartmentsList = useMemo(() => {
        return departmentsList.filter((d: any) => {
            const st = String(d.status || 'Active').toLowerCase();
            return st === 'active' || d.id === departmentId;
        });
    }, [departmentsList, departmentId]);

    const selectedDept = useMemo(() => {
        return (
            activeDepartmentsList.find((d: any) => d.id === departmentId) ||
            activeDepartmentsList[0] ||
            null
        );
    }, [activeDepartmentsList, departmentId]);

    const departmentActions: ContextMenuAction[] = useMemo(() => {
        return activeDepartmentsList.map((d: any) => ({
            title: d.name,
            state: (selectedDept?.id === d.id ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [activeDepartmentsList, selectedDept]);

    const handleDeptSelect = (index: number) => {
        const selected = activeDepartmentsList[index];
        if (!selected) return;
        setDepartmentId(selected.id);
        if (!isEditMode) {
            const deptPositions = (positionsList || []).filter((p: any) => p.department_id === selected.id);
            const usedCats = deptPositions
                .map((p: any) => parseInt(String(p.category_code ?? 0), 10))
                .filter((n: number) => !isNaN(n) && n > 0);
            const nextCat = usedCats.length > 0 ? Math.max(...usedCats) : 0;
            setCategoryCode(String(nextCat + 1));
        }
    };

    // Computed next available position category within selected department (1-99)
    const computedNextPositionCategory = useMemo(() => {
        if (!positionsList || positionsList.length === 0) return '1';
        const targetDeptId = departmentId || (departmentsList[0]?.id ?? '');
        const deptPositions = positionsList.filter((p: any) => p.department_id === targetDeptId);
        const usedCats = deptPositions
            .map((p: any) => parseInt(String(p.category_code ?? 0), 10))
            .filter((n: number) => !isNaN(n) && n > 0);
        const maxCat = usedCats.length > 0 ? Math.max(...usedCats) : 0;
        return String(maxCat + 1);
    }, [positionsList, departmentId, departmentsList]);

    // Check duplicate position number in real-time within the SAME department only
    const duplicatePositionInDept = useMemo(() => {
        if (moduleType !== 'positions' || !categoryCode.trim()) return null;
        const targetDeptId = departmentId || (departmentsList[0]?.id ?? '');
        if (!targetDeptId) return null;
        const num = parseInt(categoryCode, 10);
        if (isNaN(num)) return null;
        return (positionsList || []).find(
            (p: any) =>
                p.id !== editingItem?.id &&
                p.department_id === targetDeptId &&
                parseInt(String(p.category_code ?? 0), 10) === num
        );
    }, [moduleType, categoryCode, departmentId, departmentsList, positionsList, editingItem]);

    // Computed next available level grade (0-20)
    const computedNextLevelGrade = useMemo(() => {
        if (!levelsList || levelsList.length === 0) return '0';
        const usedGrades = levelsList
            .map((l: any) => parseInt(String(l.level_code ?? 0), 10))
            .filter((n: number) => !isNaN(n) && n >= 0);
        const maxGrade = usedGrades.length > 0 ? Math.max(...usedGrades) : -1;
        const nextGrade = maxGrade + 1;
        return String(nextGrade <= 20 ? nextGrade : 20);
    }, [levelsList]);

    // Check duplicate level grade in real-time
    const duplicateLevelGrade = useMemo(() => {
        if (moduleType !== 'levels' || !levelCode.trim()) return null;
        const num = parseInt(levelCode, 10);
        if (isNaN(num)) return null;
        return (levelsList || []).find(
            (l: any) => l.id !== editingItem?.id && parseInt(String(l.level_code ?? -1), 10) === num
        );
    }, [moduleType, levelCode, levelsList, editingItem]);

    // Level options for contract types eligible range
    const levelOptions = useMemo(() => {
        if (!levelsList || levelsList.length === 0) {
            return [
                { code: 0, label: 'Lv 0 • Internship' },
                { code: 1, label: 'Lv 1 • Probation' },
                { code: 2, label: 'Lv 2 • Junior Staff' },
                { code: 3, label: 'Lv 3 • Middle Staff' },
                { code: 4, label: 'Lv 4 • Senior Staff' },
                { code: 5, label: 'Lv 5 • Leader' },
                { code: 6, label: 'Lv 6 • Head' },
                { code: 7, label: 'Lv 7 • Chief Executive Officer' },
                { code: 8, label: 'Lv 8 • Owner' },
            ];
        }
        const sorted = [...levelsList].sort((a, b) => {
            const lvlA = parseInt(String(a.level_code ?? 0), 10);
            const lvlB = parseInt(String(b.level_code ?? 0), 10);
            return lvlA - lvlB;
        });
        return sorted.map((l) => {
            const codeNum = parseInt(String(l.level_code ?? 0), 10);
            const label = `Lv ${codeNum} • ${l.name}`;
            return { code: codeNum, label };
        });
    }, [levelsList]);

    const selectedMinLevel = useMemo(() => {
        const parsed = parseInt(minLevelCode, 10);
        return levelOptions.find((o) => o.code === parsed) || levelOptions[0];
    }, [levelOptions, minLevelCode]);

    const selectedMaxLevel = useMemo(() => {
        const parsed = parseInt(maxLevelCode, 10);
        return levelOptions.find((o) => o.code === parsed) || levelOptions[levelOptions.length - 1];
    }, [levelOptions, maxLevelCode]);

    const minLevelActions: ContextMenuAction[] = useMemo(() => {
        return levelOptions.map((opt) => ({
            title: opt.label,
            state: (selectedMinLevel?.code === opt.code ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [levelOptions, selectedMinLevel]);

    const maxLevelActions: ContextMenuAction[] = useMemo(() => {
        return levelOptions.map((opt) => ({
            title: opt.label,
            state: (selectedMaxLevel?.code === opt.code ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [levelOptions, selectedMaxLevel]);

    const visibilityActions: ContextMenuAction[] = useMemo(() => {
        return VISIBILITY_OPTIONS.map((opt) => ({
            title: opt,
            state: (visibility === opt ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [visibility]);

    const scheduleTypeActions: ContextMenuAction[] = useMemo(() => {
        return SCHEDULE_TYPE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (scheduleType === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [scheduleType]);

    const selectedScheduleTypeLabel = useMemo(() => {
        return SCHEDULE_TYPE_OPTIONS.find((t) => t.key === scheduleType)?.label || scheduleType;
    }, [scheduleType]);

    const timezoneActions: ContextMenuAction[] = useMemo(() => {
        return TIMEZONE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (timezone.toLowerCase() === opt.key.toLowerCase() ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [timezone]);

    const selectedTimezoneLabel = useMemo(() => {
        return TIMEZONE_OPTIONS.find((t) => t.key.toLowerCase() === timezone.toLowerCase())?.label || timezone;
    }, [timezone]);

    const breakDurationActions: ContextMenuAction[] = useMemo(() => {
        return BREAK_OPTIONS.map((opt) => ({
            title: `${opt} min`,
            state: (String(breakDuration) === opt ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [breakDuration]);

    const selectedPolicyContractType = useMemo(() => {
        return (
            contractTypesList.find((c: any) => c.id === policyContractTypeId) ||
            contractTypesList[0] ||
            null
        );
    }, [contractTypesList, policyContractTypeId]);

    const policyContractTypeActions: ContextMenuAction[] = useMemo(() => {
        return contractTypesList.map((c: any) => ({
            title: c.name,
            state: (selectedPolicyContractType?.id === c.id ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [contractTypesList, selectedPolicyContractType]);

    const leaveTypeActions: ContextMenuAction[] = useMemo(() => {
        return LEAVE_TYPE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (leaveType === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveType]);

    const selectedLeaveTypeLabel = useMemo(() => {
        return LEAVE_TYPE_OPTIONS.find((t) => t.key === leaveType)?.label || leaveType;
    }, [leaveType]);

    const quotaCycleActions: ContextMenuAction[] = useMemo(() => {
        return QUOTA_CYCLE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (leaveQuotaCycle === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveQuotaCycle]);

    const leaveAppliesToActions: ContextMenuAction[] = useMemo(() => {
        return APPLIES_TO_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (leaveAppliesTo === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveAppliesTo]);

    const leaveTargetContractOptions = useMemo(() => {
        return ['All Contract Types', ...(contractTypesList || []).map((c: any) => c.name || 'Contract')];
    }, [contractTypesList]);

    const leaveContractTypeActions: ContextMenuAction[] = useMemo(() => {
        return leaveTargetContractOptions.map((opt) => ({
            title: opt,
            state: ((leaveContractType === opt || (leaveContractType === 'All' && opt === 'All Contract Types')) ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveTargetContractOptions, leaveContractType]);

    const evidenceModeActions: ContextMenuAction[] = useMemo(() => {
        return EVIDENCE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (leaveEvidenceMode === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveEvidenceMode]);

    const noticeActions: ContextMenuAction[] = useMemo(() => {
        return NOTICE_OPTIONS.map((opt) => ({
            title: opt.label,
            state: (leaveMinNoticePreset === opt.key ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [leaveMinNoticePreset]);

    useEffect(() => {
        if (editingItem) {
            setName(editingItem.name || '');
            const rawCode = editingItem.code || '';
            const cleanCode = rawCode.includes('-')
                ? rawCode.split('-')[1]
                : rawCode;
            setCode(cleanCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase());

            const rawCluster = editingItem.cluster_code !== undefined && editingItem.cluster_code !== null
                ? String(editingItem.cluster_code)
                : (rawCode.includes('-') ? rawCode.split('-')[0] : '1');
            setClusterCode(rawCluster);

            setStatus(editingItem.status || 'Active');
            setTimezone(editingItem.timezone || 'Asia/Jakarta');
            const defaultStart = editingItem.start_time ? editingItem.start_time.substring(0, 5) : '09:00';
            const defaultEnd = editingItem.end_time ? editingItem.end_time.substring(0, 5) : '17:00';
            setStartTime(defaultStart);
            setEndTime(defaultEnd);
            setBreakDuration(String(editingItem.break_duration_minutes ?? '60'));

            let cfg = editingItem.days_config || {};
            if (typeof cfg === 'string') {
                try {
                    cfg = JSON.parse(cfg);
                } catch {
                    cfg = {};
                }
            }
            const workingDaysList = Array.isArray(cfg.working_days) ? cfg.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            const custom = cfg.custom_hours || {};
            const hasCustomHours = Object.keys(custom).length > 0;

            if (editingItem.type === 'Custom' || (editingItem.type === 'Fixed' && hasCustomHours)) {
                setScheduleType('Custom');
            } else {
                setScheduleType(editingItem.type || 'Fixed');
            }

            setWorkingDays(workingDaysList);
            const initialDaySchedules: Record<string, { enabled: boolean; start: string; end: string }> = {};
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
            setDaysPerWeek(String(cfg.days_per_week || '5'));

            setPolicyContractTypeId(editingItem.employment_type_id || contractTypesList[0]?.id || '');
            setPolicyDefaultHours(String(editingItem.default_hours || editingItem.min_hours_per_week || '40'));
            setPolicyOvertimeEligible(editingItem.overtime_eligible !== false);
            setPolicyBenefitsEligible(editingItem.benefits_eligible !== false);
            setPolicyNotes(editingItem.notes || '');

            const contractMatch = editingItem.description?.match(/\[Contract:\s*([^\]]+)\]/i) || editingItem.description?.match(/\[Status:\s*([^\]]+)\]/i);
            const monthsMatch = editingItem.description?.match(/\[Effective:\s*(\d+)m\]/i);

            const rawType = editingItem.leave_type || (
                (editingItem.name || '').toLowerCase().includes('sick') ? 'sick'
                : (editingItem.name || '').toLowerCase().includes('permission') ? 'permission'
                : (editingItem.name || '').toLowerCase().includes('unpaid') ? 'unpaid'
                : (editingItem.name || '').toLowerCase().includes('maternity') || (editingItem.name || '').toLowerCase().includes('paternity') ? 'maternity_paternity'
                : 'annual'
            );
            setLeaveType(rawType);

            if (editingItem.applies_to) {
                setLeaveAppliesTo(editingItem.applies_to === 'employment_type' ? 'employment_type' : 'all');
            } else if (contractMatch && contractMatch[1] !== 'All' && contractMatch[1] !== 'All Contract Types') {
                setLeaveAppliesTo('employment_type');
            } else {
                setLeaveAppliesTo('all');
            }

            const ctVal = contractMatch ? contractMatch[1] : (editingItem.target_employment_types?.[0] || 'All');
            setLeaveContractType(ctVal);

            setLeaveQuotaCycle(editingItem.quota_cycle || 'yearly');
            setLeaveAnnualQuota(String(editingItem.entitlement_days ?? editingItem.annual_quota ?? editingItem.annual_leave_quota ?? 12));
            setLeaveCarryOverAllowed(Boolean(editingItem.carry_over_allowed));
            setLeaveIsPaid(editingItem.is_paid !== false);

            setLeaveRequireApproval(editingItem.require_approval !== false);
            setLeaveEvidenceMode(editingItem.evidence_mode || (rawType === 'maternity_paternity' ? 'required' : rawType === 'sick' ? 'optional' : 'disabled'));

            const noticeDays = editingItem.min_notice_days !== undefined ? Number(editingItem.min_notice_days) : (rawType === 'annual' ? 7 : rawType === 'sick' ? 0 : 1);
            setLeaveMinNoticeDays(String(noticeDays));
            setLeaveMinNoticePreset(editingItem.min_notice_preset || (noticeDays === 0 ? 'immediate' : noticeDays === 1 ? '1_day' : noticeDays === 3 ? '3_days' : noticeDays === 7 ? '7_days' : 'custom'));
            setLeaveEffectiveMonths(String(editingItem.eligibility_waiting_period_months ?? (monthsMatch ? parseInt(monthsMatch[1], 10) : 0)));

            setDepartmentId(editingItem.department_id || (departmentsList[0]?.id ?? ''));
            setCategoryCode(String(editingItem.category_code || '1'));
            setLevelCode(String(editingItem.level_code || '0'));
            setMinLevelCode(String(editingItem.min_level_code ?? '0'));
            setMaxLevelCode(String(editingItem.max_level_code ?? (levelOptions[levelOptions.length - 1]?.code ?? '8')));
            setIsDefault(Boolean(editingItem.is_default));
            setStatusColor(editingItem.color || '#10B981');
            const curVis = editingItem.visibility || 'Public';
            const matchedVis = VISIBILITY_OPTIONS.find((v) => v.toLowerCase() === curVis.toLowerCase());
            setVisibility(matchedVis || 'Public');
        } else {
            setName('');
            setCode('');
            setStatus('Active');
            setScheduleType('Fixed');
            setTimezone('Asia/Jakarta');
            setStartTime('09:00');
            setEndTime('17:00');
            setBreakDuration('60');
            setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            const defaultDaySchedules: Record<string, { enabled: boolean; start: string; end: string }> = {};
            WEEKDAYS.forEach((d) => {
                defaultDaySchedules[d.key] = {
                    enabled: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.key),
                    start: '09:00',
                    end: '17:00',
                };
            });
            setDaySchedules(defaultDaySchedules);
            setDaysPerWeek('5');

            setPolicyContractTypeId(contractTypesList[0]?.id || '');
            setPolicyDefaultHours('40');
            setPolicyOvertimeEligible(true);
            setPolicyBenefitsEligible(true);
            setPolicyNotes('');

            setLeaveType('annual');
            setLeaveAnnualQuota('12');
            setLeaveQuotaCycle('yearly');
            setLeaveAppliesTo('all');
            setLeaveContractType('All');
            setLeaveRequireApproval(true);
            setLeaveEvidenceMode('disabled');
            setLeaveMinNoticePreset('7_days');
            setLeaveMinNoticeDays('7');
            setLeaveEffectiveMonths('0');
            setLeaveCarryOverAllowed(false);
            setLeaveIsPaid(true);

            setClusterCode(computedNextCluster);
            setDepartmentId(departmentsList[0]?.id ?? '');
            setCategoryCode(computedNextPositionCategory);
            setLevelCode(computedNextLevelGrade);
            setMinLevelCode('0');
            setMaxLevelCode(String(levelOptions[levelOptions.length - 1]?.code ?? '8'));
            setIsDefault(false);
            setStatusColor('#10B981');
            setVisibility('Public');
        }
    }, [editingItem, isOpened, computedNextCluster, computedNextPositionCategory, computedNextLevelGrade, levelOptions, contractTypesList]);

    const modalTitle = useMemo(() => {
        if (customTitle) return customTitle;
        const prefix = isEditMode ? 'Edit' : 'New';
        switch (moduleType) {
            case 'work_schedules': return `${prefix} Work Schedule`;
            case 'leave_policies': return `${prefix} Leave Policy`;
            case 'departments': return `${prefix} Department`;
            case 'positions': return `${prefix} Position`;
            case 'levels': return `${prefix} Level`;
            case 'contract_types': return `${prefix} Contract Type`;
            case 'work_statuses': return `${prefix} Work Status`;
            case 'employment_policies': return `${prefix} Employment Policy`;
            default: return `${prefix} Record`;
        }
    }, [customTitle, isEditMode, moduleType]);

    const toggleWorkingDay = (day: string) => {
        Haptics.selectionAsync();
        if (workingDays.includes(day)) {
            if (workingDays.length > 1) {
                setWorkingDays(workingDays.filter((d) => d !== day));
            }
        } else {
            setWorkingDays([...workingDays, day]);
        }
    };

    const handleDelete = () => {
        const itemType = modalTitle.replace(/^(Edit|New)\s+/, '');
        confirmDestructiveAction({
            title: `Delete ${itemType}`,
            message: `Are you sure you want to delete "${name || code}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            onConfirm: async () => {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    if (!onDelete) throw new Error('Delete is unavailable for this setup.');
                    await onDelete(editingItem);
                    handleClose();
                } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to delete record.');
                }
            },
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter a name.');
            return;
        }

        const payload: Record<string, any> = {
            name: name.trim(),
            status,
        };

        if (moduleType === 'departments') {
            const clusterNum = parseInt(clusterCode, 10);
            if (isNaN(clusterNum) || clusterNum < 1 || clusterNum > 99) {
                Alert.alert('Invalid Cluster Number', 'Cluster number must be a number between 1 and 99.');
                return;
            }
            if (duplicateClusterDept) {
                Alert.alert(
                    'Cluster Number Already Taken',
                    `Cluster "${clusterNum}" is already taken by "${duplicateClusterDept.name || duplicateClusterDept.code}". Every department must have a unique cluster number.`
                );
                return;
            }
            const cleanCode = code.replace(/^[0-9]+-/, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
            if (cleanCode.length !== 3 || !/^[A-Z]{3}$/.test(cleanCode)) {
                Alert.alert(
                    'Invalid Department Code',
                    'Department code must be exactly 3 letters (e.g. FIN, SLS, BOD).'
                );
                return;
            }
            payload.code = cleanCode;
            payload.cluster_code = clusterNum;
            payload.order_index = clusterNum;
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
                    `Position number "${catNum}" is already taken within this department.`
                );
                return;
            }
            const cleanCode = code.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
            if (cleanCode.length !== 2) {
                Alert.alert('Invalid Position Code', 'Position code must be exactly 2 letters (e.g. FA, SP, VP).');
                return;
            }
            payload.code = cleanCode;
            payload.category_code = catNum;
            payload.department_id = departmentId;
        } else if (moduleType === 'levels') {
            const gradeNum = parseInt(levelCode, 10);
            if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 20) {
                Alert.alert('Invalid Level Grade', 'Level grade must be a number between 0 and 20.');
                return;
            }
            if (duplicateLevelGrade) {
                Alert.alert(
                    'Level Grade Already Taken',
                    `Level grade "${gradeNum}" is already taken by "${duplicateLevelGrade.name || duplicateLevelGrade.code}".`
                );
                return;
            }
            const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
            if (cleanCode.length < 2) {
                Alert.alert('Invalid Level Code', 'Level code must be 2 to 4 characters (e.g. IC1, M1, JR, SR).');
                return;
            }
            payload.code = cleanCode;
            payload.level_code = gradeNum;
            payload.roman_code = toRomanNumeral(gradeNum);
            payload.order_index = gradeNum + 1;
        } else if (moduleType === 'contract_types') {
            const minL = parseInt(minLevelCode, 10) || 0;
            const maxL = parseInt(maxLevelCode, 10) || (levelOptions[levelOptions.length - 1]?.code ?? 8);
            if (minL > maxL) {
                Alert.alert('Invalid Level Range', 'Minimum level cannot be greater than maximum level.');
                return;
            }
            payload.min_level_code = minL;
            payload.max_level_code = maxL;
            payload.is_default = isDefault;
        } else if (moduleType === 'work_statuses') {
            payload.color = statusColor;
            payload.visibility = visibility;
            payload.order_index = editingItem?.order_index || (workStatusesList.length + 1);
        } else if (moduleType === 'work_schedules') {
            payload.type = scheduleType === 'Custom' ? 'Fixed' : scheduleType;
            payload.start_time = startTime.length === 5 ? `${startTime}:00` : startTime;
            payload.end_time = endTime.length === 5 ? `${endTime}:00` : endTime;
            payload.break_duration_minutes = parseInt(breakDuration, 10) || 60;
            payload.timezone = timezone.trim() || 'Asia/Jakarta';

            if (scheduleType === 'Fixed') {
                payload.days_config = { working_days: workingDays };
            } else if (scheduleType === 'Custom') {
                const enabledDays = WEEKDAYS.filter((d) => daySchedules[d.key]?.enabled).map((d) => d.key);
                const customHours: Record<string, any> = {};
                WEEKDAYS.forEach((d) => {
                    const sched = daySchedules[d.key];
                    if (sched?.enabled) {
                        customHours[d.key] = {
                            start: sched.start || startTime,
                            end: sched.end || endTime,
                            break: parseInt(breakDuration, 10) || 60,
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
                    working_days: workingDays,
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
            payload.code = code.trim().toUpperCase() || name.slice(0, 4).toUpperCase();
            payload.leave_type = leaveType;
            payload.applies_to = leaveAppliesTo;

            if (leaveAppliesTo === 'employment_type') {
                payload.target_employment_types = leaveContractType && leaveContractType !== 'All' && leaveContractType !== 'All Contract Types'
                    ? [leaveContractType]
                    : [];
            } else {
                payload.target_employment_types = [];
            }

            const contractTag = payload.target_employment_types?.length ? `[Contract: ${payload.target_employment_types[0]}]` : '';
            const monthsVal = parseInt(leaveEffectiveMonths, 10) || 0;
            const monthsTag = monthsVal > 0 ? `[Effective: ${monthsVal}m]` : '';
            payload.description = [contractTag, monthsTag].filter(Boolean).join(' ');

            const entitlementNum = parseInt(leaveAnnualQuota, 10) || 12;
            payload.entitlement_days = entitlementNum;
            payload.annual_quota = entitlementNum;
            payload.annual_leave_quota = entitlementNum;
            payload.sick_leave_quota = leaveType === 'sick' ? entitlementNum : 0;
            payload.permission_quota = leaveType === 'permission' ? entitlementNum : 0;
            payload.quota_cycle = leaveQuotaCycle;
            payload.carry_over_allowed = leaveCarryOverAllowed;
            payload.is_paid = leaveIsPaid;
            payload.require_approval = leaveRequireApproval;
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
            payload.effective_after_months = monthsVal;
        }

        await onSubmit(payload);
    };

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="none"
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <View style={[s.overlay, isDesktop ? s.overlayDesktop : s.overlayMobile]}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <Animated.View style={[s.backdrop, animatedBackdropStyle]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        s.dialogCard,
                        isDesktop ? s.dialogCardDesktop : s.dialogCardMobile,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: cardBorder,
                        },
                        animatedDrawerStyle,
                    ]}
                >
                    {/* Header */}
                    <View style={s.headerRow}>
                        <View style={s.headerLeft}>
                            <Text style={[s.titleText, { color: textColor }]}>
                                {modalTitle}
                            </Text>
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={[
                                s.headerIconBtn,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.05)',
                                },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable Form Fields */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.formContent}
                    >
                        {/* 1. DEPARTMENTS */}
                        {moduleType === 'departments' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Cluster Number (1 - 99)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: duplicateClusterDept ? '#FF3B30' : cardBorder }]}
                                        placeholder="e.g. 1"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={clusterCode}
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 99) {
                                                setClusterCode(filtered);
                                            }
                                        }}
                                    />
                                    {duplicateClusterDept && (
                                        <Text style={s.warningText}>
                                            Cluster {clusterCode} is already taken by {duplicateClusterDept.name || duplicateClusterDept.code || 'another department'}
                                        </Text>
                                    )}
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Department Code (3 Letters)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. BOD"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="characters"
                                        maxLength={3}
                                        value={code}
                                        onChangeText={(val) => {
                                            const letters = val.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
                                            setCode(letters);
                                        }}
                                    />
                                </View>

                                {/* Live ID Code Preview */}
                                <View style={[s.codePreviewBox, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)', borderColor: isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)' }]}>
                                    <PlatformIcon name="checkmark.seal" size={15} tintColor="#007AFF" />
                                    <Text style={[s.codePreviewLabel, { color: subtextColor }]}>Generated ID:</Text>
                                    <Text style={[s.codePreviewBadge, { color: '#007AFF' }]}>
                                        {clusterCode || '?'}-{code || '???'}
                                    </Text>
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Department Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Board of Directors"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </>
                        )}

                        {/* 2. POSITIONS */}
                        {moduleType === 'positions' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Department Assignment</Text>
                                    <ContextMenu
                                        actions={departmentActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            handleDeptSelect(e.nativeEvent.index);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View
                                            style={[
                                                s.pickerBtn,
                                                {
                                                    backgroundColor: inputBg,
                                                    borderColor: cardBorder,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[s.pickerBtnText, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                {selectedDept?.name || 'Select Department'}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Position Number (1 - 99)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: duplicatePositionInDept ? '#FF3B30' : cardBorder }]}
                                        placeholder="e.g. 1"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={categoryCode}
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 99) {
                                                setCategoryCode(filtered);
                                            }
                                        }}
                                    />
                                    {duplicatePositionInDept && (
                                        <Text style={s.warningText}>
                                            Number {categoryCode} is already taken in this department
                                        </Text>
                                    )}
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Position Code (2 Letters)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. FA"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="characters"
                                        maxLength={2}
                                        value={code}
                                        onChangeText={(val) => {
                                            const letters = val.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
                                            setCode(letters);
                                        }}
                                    />
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Position Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Financial Analyst"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </>
                        )}

                        {/* 3. LEVELS */}
                        {moduleType === 'levels' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Level Grade (0 - 20)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: duplicateLevelGrade ? '#FF3B30' : cardBorder }]}
                                        placeholder="e.g. 1"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={levelCode}
                                        onChangeText={(val) => {
                                            const filtered = val.replace(/[^0-9]/g, '');
                                            if (filtered === '' || parseInt(filtered, 10) <= 20) {
                                                setLevelCode(filtered);
                                            }
                                        }}
                                    />
                                    {duplicateLevelGrade && (
                                        <Text style={s.warningText}>
                                            Level grade {levelCode} is already taken
                                        </Text>
                                    )}
                                </View>

                                <View style={[s.codePreviewBox, { backgroundColor: isDark ? 'rgba(50, 173, 230, 0.12)' : 'rgba(50, 173, 230, 0.08)', borderColor: isDark ? 'rgba(50, 173, 230, 0.25)' : 'rgba(50, 173, 230, 0.15)' }]}>
                                    <PlatformIcon name="checkmark.seal" size={15} tintColor="#32ADE6" />
                                    <Text style={[s.codePreviewLabel, { color: subtextColor }]}>Standard Roman:</Text>
                                    <Text style={[s.codePreviewBadge, { color: '#32ADE6' }]}>
                                        {toRomanNumeral(parseInt(levelCode || '0', 10))}
                                    </Text>
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Level Code (2-4 Letters)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. JR"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="characters"
                                        maxLength={4}
                                        value={code}
                                        onChangeText={(val) => {
                                            const letters = val.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
                                            setCode(letters);
                                        }}
                                    />
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Level Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Junior Specialist"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </>
                        )}

                        {/* 4. CONTRACT TYPES */}
                        {moduleType === 'contract_types' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Contract Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Permanent Full-Time"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                <View style={s.twoColRow}>
                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Min Level</Text>
                                        <ContextMenu
                                            actions={minLevelActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const selected = levelOptions[e.nativeEvent.index];
                                                if (selected) {
                                                    setMinLevelCode(String(selected.code));
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View
                                                style={[
                                                    s.pickerBtn,
                                                    {
                                                        backgroundColor: inputBg,
                                                        borderColor: cardBorder,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[s.pickerBtnText, { color: textColor }]}
                                                    numberOfLines={1}
                                                >
                                                    {selectedMinLevel?.label || 'Select'}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>

                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Max Level</Text>
                                        <ContextMenu
                                            actions={maxLevelActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const selected = levelOptions[e.nativeEvent.index];
                                                if (selected) {
                                                    setMaxLevelCode(String(selected.code));
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View
                                                style={[
                                                    s.pickerBtn,
                                                    {
                                                        backgroundColor: inputBg,
                                                        borderColor: cardBorder,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[s.pickerBtnText, { color: textColor }]}
                                                    numberOfLines={1}
                                                >
                                                    {selectedMaxLevel?.label || 'Select'}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>
                                </View>

                                <View style={[s.switchRow, { borderBottomColor: cardBorder, marginTop: 4 }]}>
                                    <View style={{ flex: 1, paddingRight: 12 }}>
                                        <Text style={[s.switchLabel, { color: textColor }]}>Set as Default Contract Type</Text>
                                    </View>
                                    <IOSSwitch
                                        value={isDefault}
                                        onValueChange={setIsDefault}
                                    />
                                </View>
                            </>
                        )}

                        {/* 4b. WORK STATUSES */}
                        {moduleType === 'work_statuses' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Status Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Active, Remote, Resigned"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                {/* Color Picker Swatches */}
                                <View style={s.fieldGroup}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Badge Color</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
                                            <Text style={{ fontSize: 12, color: subtextColor, fontWeight: '500' }}>
                                                {STATUS_COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === statusColor.toLowerCase())?.label || statusColor}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.colorSwatchesContainer}>
                                        {STATUS_COLOR_OPTIONS.map((c) => {
                                            const isSelected = statusColor.toLowerCase() === c.hex.toLowerCase();
                                            return (
                                                <TouchableOpacity
                                                    key={c.hex}
                                                    activeOpacity={0.8}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setStatusColor(c.hex);
                                                    }}
                                                    style={[
                                                        s.colorCircleWrap,
                                                        isSelected && { borderColor: c.hex },
                                                    ]}
                                                >
                                                    <View
                                                        style={[
                                                            s.colorCircleInner,
                                                            {
                                                                backgroundColor: c.hex,
                                                                width: isSelected ? 22 : 28,
                                                                height: isSelected ? 22 : 28,
                                                                borderRadius: isSelected ? 11 : 14,
                                                            },
                                                        ]}
                                                    >
                                                        {isSelected && (
                                                            <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Visibility Scope */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Visibility Scope</Text>
                                    <ContextMenu
                                        actions={visibilityActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const selected = VISIBILITY_OPTIONS[e.nativeEvent.index];
                                            if (selected) {
                                                setVisibility(selected);
                                            }
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View
                                            style={[
                                                s.pickerBtn,
                                                {
                                                    backgroundColor: inputBg,
                                                    borderColor: cardBorder,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[s.pickerBtnText, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                {visibility}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>
                            </>
                        )}

                        {/* 4c. EMPLOYMENT POLICIES */}
                        {moduleType === 'employment_policies' && (
                            <>
                                {/* Contract Type */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Contract Type</Text>
                                    <ContextMenu
                                        actions={policyContractTypeActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = contractTypesList[e.nativeEvent.index];
                                            if (sel) setPolicyContractTypeId(sel.id);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {selectedPolicyContractType?.name || 'Select Contract Type'}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                    <Text style={{ fontSize: 12, color: subtextColor, marginTop: 4 }}>
                                        Select the contract type this policy rule applies to
                                    </Text>
                                </View>

                                {/* Standard Work Hours */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Standard Work Hours (Weekly)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="Weekly Hours (e.g. 40, 28)"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={policyDefaultHours}
                                        onChangeText={setPolicyDefaultHours}
                                    />
                                    <Text style={{ fontSize: 12, color: subtextColor, marginTop: 4 }}>
                                        Determines baseline work commitment matched with assigned work schedules
                                    </Text>
                                </View>

                                {/* Overtime Policy */}
                                <View style={s.fieldGroup}>
                                    <View
                                        style={{
                                            backgroundColor: inputBg,
                                            borderRadius: 12,
                                            padding: 14,
                                            borderWidth: 1,
                                            borderColor: cardBorder,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                                Eligible for Overtime
                                            </Text>
                                            <IOSSwitch
                                                value={policyOvertimeEligible}
                                                onValueChange={setPolicyOvertimeEligible}
                                            />
                                        </View>
                                        <Text style={{ fontSize: 12, color: subtextColor, marginTop: 6 }}>
                                            Enables automated overtime tracking & compensation calculated from clock timestamps
                                        </Text>
                                    </View>
                                </View>

                                {/* Benefits & Allowances Policy */}
                                <View style={s.fieldGroup}>
                                    <View
                                        style={{
                                            backgroundColor: inputBg,
                                            borderRadius: 12,
                                            padding: 14,
                                            borderWidth: 1,
                                            borderColor: cardBorder,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                                Eligible for Benefits & Allowances
                                            </Text>
                                            <IOSSwitch
                                                value={policyBenefitsEligible}
                                                onValueChange={setPolicyBenefitsEligible}
                                            />
                                        </View>
                                        <Text style={{ fontSize: 12, color: subtextColor, marginTop: 6 }}>
                                            Directly impacts and links allowance disbursements to monthly KPI evaluation
                                        </Text>
                                    </View>
                                </View>

                                {/* Policy Notes */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Policy Notes</Text>
                                    <TextInput
                                        style={[
                                            s.textInput,
                                            {
                                                backgroundColor: inputBg,
                                                color: textColor,
                                                borderColor: cardBorder,
                                                borderRadius: 14,
                                                height: 'auto',
                                                minHeight: 84,
                                                paddingHorizontal: 14,
                                                paddingTop: 12,
                                                paddingBottom: 12,
                                                textAlignVertical: 'top',
                                            },
                                        ]}
                                        placeholder="Add policy notes or compliance remarks..."
                                        placeholderTextColor={subtextColor}
                                        multiline
                                        numberOfLines={3}
                                        value={policyNotes}
                                        onChangeText={setPolicyNotes}
                                    />
                                    <Text style={{ fontSize: 12, color: subtextColor, marginTop: 4 }}>
                                        Specific terms, regulatory compliance guidelines, or special conditions
                                    </Text>
                                </View>
                            </>
                        )}

                        {/* 5. WORK SCHEDULES */}
                        {moduleType === 'work_schedules' && (
                            <>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Schedule Name</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. Standard 5-Day Schedule"
                                        placeholderTextColor={subtextColor}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                {/* Schedule Type & Timezone Dropdowns */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Schedule Type</Text>
                                    <ContextMenu
                                        actions={scheduleTypeActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = SCHEDULE_TYPE_OPTIONS[e.nativeEvent.index];
                                            if (sel) setScheduleType(sel.key);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {selectedScheduleTypeLabel}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Timezone</Text>
                                    <ContextMenu
                                        actions={timezoneActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = TIMEZONE_OPTIONS[e.nativeEvent.index];
                                            if (sel) setTimezone(sel.key);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {selectedTimezoneLabel}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                {/* Default Hours & Breaks (Fixed, Shift, Flexible) */}
                                {scheduleType !== 'Custom' && (
                                    <View style={s.twoColRow}>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Start Time</Text>
                                            <TextInput
                                                style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                placeholder="09:00"
                                                placeholderTextColor={subtextColor}
                                                value={startTime}
                                                onChangeText={setStartTime}
                                            />
                                        </View>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>End Time</Text>
                                            <TextInput
                                                style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                placeholder="17:00"
                                                placeholderTextColor={subtextColor}
                                                value={endTime}
                                                onChangeText={setEndTime}
                                            />
                                        </View>
                                    </View>
                                )}

                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Break Duration</Text>
                                    <ContextMenu
                                        actions={breakDurationActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = BREAK_OPTIONS[e.nativeEvent.index];
                                            if (sel) setBreakDuration(sel);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {breakDuration} min
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                {/* 1. FIXED & SHIFT: WORKING DAYS */}
                                {(scheduleType === 'Fixed' || scheduleType === 'Shift') && (
                                    <View style={s.fieldGroup}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Working Days</Text>
                                        <View style={s.daysRow}>
                                            {WEEKDAYS.map((day) => {
                                                const isSel = workingDays.includes(day.key);
                                                return (
                                                    <TouchableOpacity
                                                        key={day.key}
                                                        activeOpacity={0.7}
                                                        onPress={() => toggleWorkingDay(day.key)}
                                                        style={[
                                                            s.dayPill,
                                                            {
                                                                backgroundColor: isSel ? accentColor : inputBg,
                                                                borderColor: isSel ? accentColor : cardBorder,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                s.dayPillText,
                                                                { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' },
                                                            ]}
                                                        >
                                                            {day.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* 2. CUSTOM: PER-DAY WORKING DAYS & INDIVIDUAL TIME INPUTS */}
                                {scheduleType === 'Custom' && (
                                    <View style={s.fieldGroup}>
                                        <Text style={[s.fieldLabel, { color: subtextColor, marginBottom: 4 }]}>
                                            Custom Daily Schedule
                                        </Text>
                                        <Text style={{ fontSize: 12, color: subtextColor, marginBottom: 12 }}>
                                            Toggle working days and customize start & end times for each day
                                        </Text>
                                        <View style={{ gap: 10 }}>
                                            {WEEKDAYS.map((day) => {
                                                const sched = daySchedules[day.key] || { enabled: false, start: startTime, end: endTime };
                                                return (
                                                    <View
                                                        key={`custom-day-row-${day.key}`}
                                                        style={{
                                                             backgroundColor: inputBg,
                                                             borderRadius: 12,
                                                             padding: 12,
                                                             borderWidth: 1,
                                                             borderColor: cardBorder,
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                                                {day.label}
                                                            </Text>
                                                            <IOSSwitch
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
                                                            />
                                                        </View>
                                                        {sched.enabled && (
                                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 11, color: subtextColor, marginBottom: 4 }}>Start Time</Text>
                                                                    <TextInput
                                                                        style={[
                                                                            s.textInput,
                                                                            {
                                                                                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                                                color: textColor,
                                                                                borderColor: cardBorder,
                                                                                height: 38,
                                                                                fontSize: 13,
                                                                            },
                                                                        ]}
                                                                        placeholder="09:00"
                                                                        placeholderTextColor={subtextColor}
                                                                        value={sched.start}
                                                                        onChangeText={(t) => {
                                                                            setDaySchedules((prev) => ({
                                                                                ...prev,
                                                                                [day.key]: {
                                                                                    ...prev[day.key],
                                                                                    start: t,
                                                                                },
                                                                            }));
                                                                        }}
                                                                    />
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 11, color: subtextColor, marginBottom: 4 }}>End Time</Text>
                                                                    <TextInput
                                                                        style={[
                                                                            s.textInput,
                                                                            {
                                                                                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                                                color: textColor,
                                                                                borderColor: cardBorder,
                                                                                height: 38,
                                                                                fontSize: 13,
                                                                            },
                                                                        ]}
                                                                        placeholder="17:00"
                                                                        placeholderTextColor={subtextColor}
                                                                        value={sched.end}
                                                                        onChangeText={(t) => {
                                                                            setDaySchedules((prev) => ({
                                                                                ...prev,
                                                                                [day.key]: {
                                                                                    ...prev[day.key],
                                                                                    end: t,
                                                                                },
                                                                            }));
                                                                        }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* 3. FLEXIBLE: DAYS PER WEEK */}
                                {scheduleType === 'Flexible' && (
                                    <View style={s.fieldGroup}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Days / Week (1 - 7)</Text>
                                        <TextInput
                                            style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="5"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="numeric"
                                            value={daysPerWeek}
                                            onChangeText={setDaysPerWeek}
                                        />
                                    </View>
                                )}
                            </>
                        )}

                        {/* 6. LEAVE POLICIES NAME INPUT */}
                        {moduleType === 'leave_policies' && (
                            <View style={s.fieldGroup}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Policy Name</Text>
                                <TextInput
                                    style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                    placeholder="e.g. Annual Leave Policy"
                                    placeholderTextColor={subtextColor}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        )}

                        {moduleType === 'leave_policies' && (
                            <>
                                {/* Leave Type (Dropdown) */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Leave Type</Text>
                                    <ContextMenu
                                        actions={leaveTypeActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = LEAVE_TYPE_OPTIONS[e.nativeEvent.index];
                                            if (sel) {
                                                setLeaveType(sel.key);
                                                if (sel.key === 'unpaid') setLeaveIsPaid(false);
                                                else if (sel.key === 'annual') {
                                                    setLeaveIsPaid(true);
                                                    setLeaveEvidenceMode('disabled');
                                                    setLeaveMinNoticePreset('7_days');
                                                    setLeaveMinNoticeDays('7');
                                                } else if (sel.key === 'sick') {
                                                    setLeaveIsPaid(true);
                                                    setLeaveEvidenceMode('optional');
                                                    setLeaveMinNoticePreset('immediate');
                                                    setLeaveMinNoticeDays('0');
                                                } else if (sel.key === 'maternity_paternity') {
                                                    setLeaveIsPaid(true);
                                                    setLeaveEvidenceMode('required');
                                                    setLeaveMinNoticePreset('7_days');
                                                    setLeaveMinNoticeDays('7');
                                                }
                                            }
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {selectedLeaveTypeLabel}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                {/* Quota & Quota Cycle */}
                                <View style={s.twoColRow}>
                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Quota (Days)</Text>
                                        <TextInput
                                            style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="12"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="numeric"
                                            value={leaveAnnualQuota}
                                            onChangeText={setLeaveAnnualQuota}
                                        />
                                    </View>
                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Quota Cycle</Text>
                                        <ContextMenu
                                            actions={quotaCycleActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const sel = QUOTA_CYCLE_OPTIONS[e.nativeEvent.index];
                                                if (sel) setLeaveQuotaCycle(sel.key);
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                                <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                    {QUOTA_CYCLE_OPTIONS.find((c) => c.key === leaveQuotaCycle)?.label || 'Yearly'}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>
                                </View>

                                {/* Eligibility / Target Contract */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Applies To</Text>
                                    <ContextMenu
                                        actions={leaveAppliesToActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            Haptics.selectionAsync();
                                            const sel = APPLIES_TO_OPTIONS[e.nativeEvent.index];
                                            if (sel) setLeaveAppliesTo(sel.key);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                            <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                {APPLIES_TO_OPTIONS.find((a) => a.key === leaveAppliesTo)?.label || 'All Employees'}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                {leaveAppliesTo === 'employment_type' && (
                                    <View style={s.fieldGroup}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Target Contract Type</Text>
                                        <ContextMenu
                                            actions={leaveContractTypeActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const sel = leaveTargetContractOptions[e.nativeEvent.index];
                                                if (sel) setLeaveContractType(sel === 'All Contract Types' ? 'All' : sel);
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                                <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                    {leaveContractType === 'All' ? 'All Contract Types' : leaveContractType}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>
                                )}

                                {/* Approval & Evidence Requirements */}
                                <View style={s.twoColRow}>
                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Advance Notice</Text>
                                        <ContextMenu
                                            actions={noticeActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const sel = NOTICE_OPTIONS[e.nativeEvent.index];
                                                if (sel) setLeaveMinNoticePreset(sel.key);
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                                <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                    {NOTICE_OPTIONS.find((n) => n.key === leaveMinNoticePreset)?.label || '7 Days in Advance'}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>
                                    <View style={[s.fieldGroup, { flex: 1 }]}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Evidence Mode</Text>
                                        <ContextMenu
                                            actions={evidenceModeActions}
                                            dropdownMenuMode={true}
                                            onPress={(e) => {
                                                Haptics.selectionAsync();
                                                const sel = EVIDENCE_OPTIONS[e.nativeEvent.index];
                                                if (sel) setLeaveEvidenceMode(sel.key);
                                            }}
                                            style={{ width: '100%' }}
                                        >
                                            <View style={[s.pickerBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                                <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                                    {EVIDENCE_OPTIONS.find((ev) => ev.key === leaveEvidenceMode)?.label.split(' ')[0] || 'Disabled'}
                                                </Text>
                                                <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>
                                </View>

                                {leaveMinNoticePreset === 'custom' && (
                                    <View style={s.fieldGroup}>
                                        <Text style={[s.fieldLabel, { color: subtextColor }]}>Notice Days (In Advance)</Text>
                                        <TextInput
                                            style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="e.g. 14"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="numeric"
                                            value={leaveMinNoticeDays}
                                            onChangeText={setLeaveMinNoticeDays}
                                        />
                                    </View>
                                )}

                                <View style={[s.switchRow, { borderBottomColor: cardBorder }]}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Require Manager / HR Approval</Text>
                                    <IOSSwitch
                                        value={leaveRequireApproval}
                                        onValueChange={setLeaveRequireApproval}
                                    />
                                </View>

                                <View style={[s.switchRow, { borderBottomColor: cardBorder }]}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Carry Over Allowed</Text>
                                    <IOSSwitch
                                        value={leaveCarryOverAllowed}
                                        onValueChange={setLeaveCarryOverAllowed}
                                    />
                                </View>

                                <View style={[s.switchRow, { borderBottomColor: cardBorder }]}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Paid Leave (Compensated)</Text>
                                    <IOSSwitch
                                        value={leaveIsPaid}
                                        onValueChange={setLeaveIsPaid}
                                    />
                                </View>
                            </>
                        )}

                        {/* Status Selection (All Modules except employment_policies) */}
                        {moduleType !== 'employment_policies' && (
                            <View style={s.fieldGroup}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Status</Text>
                                <View style={s.typePillRow}>
                                    {STATUS_OPTIONS.map((st) => {
                                        const isSel = status === st;
                                        return (
                                            <TouchableOpacity
                                                key={st}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setStatus(st);
                                                }}
                                                style={[
                                                    s.typePill,
                                                    {
                                                        backgroundColor: isSel ? (st === 'Active' ? '#34C759' : '#8E8E93') : inputBg,
                                                        borderColor: isSel ? (st === 'Active' ? '#34C759' : '#8E8E93') : cardBorder,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        s.typePillText,
                                                        { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' },
                                                    ]}
                                                >
                                                    {st}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom Action Row: Delete on Left (if edit mode), Save Changes on Right */}
                    <View style={s.bottomActionRow}>
                        {isEditMode && (
                            <TouchableOpacity
                                style={[
                                    s.bottomDeleteBtn,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255, 59, 48, 0.12)'
                                            : 'rgba(255, 59, 48, 0.08)',
                                        borderColor: isDark
                                            ? 'rgba(255, 59, 48, 0.25)'
                                            : 'rgba(255, 59, 48, 0.2)',
                                    },
                                ]}
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="trash" size={15} tintColor="#FF3B30" />
                                <Text style={s.bottomDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                s.bottomSaveBtn,
                                {
                                    backgroundColor: accentColor,
                                    opacity: isSubmitting ? 0.7 : 1,
                                },
                            ]}
                            onPress={handleSave}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={s.bottomSaveBtnText}>
                                    {customSubmitLabel || (isEditMode ? 'Save Changes' : 'Create')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    overlayDesktop: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        padding: 16,
    },
    overlayMobile: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 0,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    dialogCard: {
        borderWidth: 1,
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 22,
        gap: 16,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
    },
    dialogCardDesktop: {
        width: 480,
        maxWidth: '92%',
        height: '100%',
        borderRadius: 24,
    },
    dialogCardMobile: {
        width: '100%',
        maxWidth: 540,
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 6,
        gap: 12,
    },
    headerLeft: {
        flex: 1,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formContent: {
        flex: 1,
        gap: 16,
        paddingVertical: 6,
        paddingBottom: 16,
    },
    fieldGroup: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    warningText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 2,
        paddingLeft: 4,
    },
    codePreviewBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        gap: 8,
    },
    codePreviewLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    codePreviewBadge: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textInput: {
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        fontSize: 14,
    },
    pickerBtn: {
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        ...(Platform.OS === 'web'
            ? ({
                  cursor: 'pointer',
                  userSelect: 'none',
              } as any)
            : {}),
    },
    pickerBtnText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 12,
    },
    typePillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    typePillText: {
        fontSize: 12,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    dayPill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    dayPillText: {
        fontSize: 12,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    bottomActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingTop: 12,
    },
    bottomDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 46,
        paddingHorizontal: 20,
        borderRadius: 999,
        borderWidth: 1,
    },
    bottomDeleteBtnText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomSaveBtn: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    bottomSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    colorSwatchesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingVertical: 2,
    },
    colorCircleWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorCircleInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SwiftUISetupItemSheet;
