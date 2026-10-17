import React, { useState, useEffect, useMemo } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

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
    isSubmitting?: boolean;
    customTitle?: string;
    customSubmitLabel?: string;
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
        isSubmitting = false,
        customTitle,
        customSubmitLabel,
    } = props;

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isEditMode = !!editingItem?.id;

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const accentColor = '#0EA5E9'; // Clock accent cyan-blue

    // Form states
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<string>('Active');
    const [scheduleType, setScheduleType] = useState<string>('Fixed');
    const [timezone, setTimezone] = useState('Asia/Jakarta');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [breakDuration, setBreakDuration] = useState('60');
    const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [daysPerWeek, setDaysPerWeek] = useState('5');

    // Leave policy states
    const [leaveType, setLeaveType] = useState<string>('annual');
    const [leaveAnnualQuota, setLeaveAnnualQuota] = useState('12');
    const [leaveCarryOverAllowed, setLeaveCarryOverAllowed] = useState(false);
    const [leaveIsPaid, setLeaveIsPaid] = useState(true);

    // Department/Position states
    const [clusterCode, setClusterCode] = useState('1');
    const [departmentId, setDepartmentId] = useState('');
    const [categoryCode, setCategoryCode] = useState('1');
    const [levelCode, setLevelCode] = useState('0');

    useEffect(() => {
        if (editingItem) {
            setName(editingItem.name || '');
            setCode(editingItem.code || '');
            setStatus(editingItem.status || 'Active');
            setScheduleType(editingItem.type || 'Fixed');
            setTimezone(editingItem.timezone || 'Asia/Jakarta');
            setStartTime(editingItem.start_time ? editingItem.start_time.substring(0, 5) : '09:00');
            setEndTime(editingItem.end_time ? editingItem.end_time.substring(0, 5) : '17:00');
            setBreakDuration(String(editingItem.break_duration_minutes ?? '60'));

            const cfg = editingItem.days_config || {};
            setWorkingDays(Array.isArray(cfg.working_days) ? cfg.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setDaysPerWeek(String(cfg.days_per_week || '5'));

            setLeaveType(editingItem.leave_type || 'annual');
            setLeaveAnnualQuota(String(editingItem.annual_quota || editingItem.entitlement_days || '12'));
            setLeaveCarryOverAllowed(Boolean(editingItem.carry_over_allowed));
            setLeaveIsPaid(editingItem.is_paid !== false);

            setClusterCode(String(editingItem.cluster_code || '1'));
            setDepartmentId(editingItem.department_id || (departmentsList[0]?.id ?? ''));
            setCategoryCode(String(editingItem.category_code || '1'));
            setLevelCode(String(editingItem.level_code || '0'));
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
            setDaysPerWeek('5');
            setLeaveType('annual');
            setLeaveAnnualQuota('12');
            setLeaveCarryOverAllowed(false);
            setLeaveIsPaid(true);
            setClusterCode('1');
            setDepartmentId(departmentsList[0]?.id ?? '');
            setCategoryCode('1');
            setLevelCode('0');
        }
    }, [editingItem, isOpened]);

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

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter a name.');
            return;
        }

        const payload: Record<string, any> = {
            name: name.trim(),
            status,
        };

        if (moduleType === 'work_schedules') {
            payload.type = scheduleType;
            payload.start_time = startTime.length === 5 ? `${startTime}:00` : startTime;
            payload.end_time = endTime.length === 5 ? `${endTime}:00` : endTime;
            payload.break_duration_minutes = parseInt(breakDuration, 10) || 60;
            payload.timezone = timezone;
            payload.days_config = {
                working_days: workingDays,
                days_per_week: parseInt(daysPerWeek, 10) || 5,
            };
        } else if (moduleType === 'leave_policies') {
            payload.code = code.trim().toUpperCase() || name.slice(0, 4).toUpperCase();
            payload.leave_type = leaveType;
            payload.annual_quota = parseInt(leaveAnnualQuota, 10) || 12;
            payload.entitlement_days = parseInt(leaveAnnualQuota, 10) || 12;
            payload.carry_over_allowed = leaveCarryOverAllowed;
            payload.is_paid = leaveIsPaid;
            payload.applies_to = 'all';
        } else if (moduleType === 'departments') {
            payload.code = code.trim().toUpperCase();
            payload.cluster_code = parseInt(clusterCode, 10) || 1;
            payload.order_index = parseInt(clusterCode, 10) || 1;
        } else if (moduleType === 'positions') {
            payload.code = code.trim().toUpperCase();
            payload.department_id = departmentId;
            payload.category_code = parseInt(categoryCode, 10) || 1;
        } else if (moduleType === 'levels') {
            payload.code = code.trim().toUpperCase();
            payload.level_code = parseInt(levelCode, 10) || 0;
            payload.order_index = (parseInt(levelCode, 10) || 0) + 1;
        }

        await onSubmit(payload);
    };

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        s.dialogCard,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: cardBorder,
                        },
                    ]}
                >
                    {/* Drawer Handle */}
                    <View
                        style={[
                            s.dragHandle,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)' },
                        ]}
                    />

                    {/* Header */}
                    <View style={s.headerRow}>
                        <Text style={[s.titleText, { color: textColor }]}>
                            {modalTitle}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={s.closeButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <PlatformIcon name="xmark.circle.fill" size={22} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.formContent}
                    >
                        {/* Name Input */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Name</Text>
                            <TextInput
                                style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                placeholder="e.g. Standard 5-Day Schedule"
                                placeholderTextColor={subtextColor}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Module-Specific Form Content */}
                        {moduleType === 'work_schedules' && (
                            <>
                                {/* Schedule Type Selector */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Schedule Type</Text>
                                    <View style={s.typePillRow}>
                                        {SCHEDULE_TYPE_OPTIONS.map((opt) => {
                                            const isSel = scheduleType === opt.key;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.key}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setScheduleType(opt.key);
                                                    }}
                                                    style={[
                                                        s.typePill,
                                                        {
                                                            backgroundColor: isSel ? accentColor : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.typePillText,
                                                            { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' },
                                                        ]}
                                                    >
                                                        {opt.key}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Timezone Selector */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Timezone</Text>
                                    <View style={s.typePillRow}>
                                        {TIMEZONE_OPTIONS.map((tz) => {
                                            const isSel = timezone === tz.key;
                                            return (
                                                <TouchableOpacity
                                                    key={tz.key}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setTimezone(tz.key);
                                                    }}
                                                    style={[
                                                        s.typePill,
                                                        {
                                                            backgroundColor: isSel ? accentColor : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.typePillText,
                                                            { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' },
                                                        ]}
                                                    >
                                                        {tz.key}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Work Hours */}
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

                                {/* Break Duration */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Break Duration (Minutes)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="60"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={breakDuration}
                                        onChangeText={setBreakDuration}
                                    />
                                </View>

                                {/* Working Days Toggles */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Working Days</Text>
                                    <View style={s.daysRow}>
                                        {WEEKDAYS.map((day) => {
                                            const isSelected = workingDays.includes(day.key);
                                            return (
                                                <TouchableOpacity
                                                    key={day.key}
                                                    activeOpacity={0.7}
                                                    onPress={() => toggleWorkingDay(day.key)}
                                                    style={[
                                                        s.dayPill,
                                                        {
                                                            backgroundColor: isSelected ? accentColor : inputBg,
                                                            borderColor: isSelected ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.dayPillText,
                                                            { color: isSelected ? '#FFFFFF' : textColor, fontWeight: isSelected ? '700' : '500' },
                                                        ]}
                                                    >
                                                        {day.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </>
                        )}

                        {moduleType === 'leave_policies' && (
                            <>
                                {/* Code Input */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Policy Code</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="e.g. ANN-01"
                                        placeholderTextColor={subtextColor}
                                        value={code}
                                        onChangeText={setCode}
                                    />
                                </View>

                                {/* Leave Category Selector */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Leave Type Category</Text>
                                    <View style={s.typePillRow}>
                                        {LEAVE_TYPE_OPTIONS.map((lt) => {
                                            const isSel = leaveType === lt.key;
                                            return (
                                                <TouchableOpacity
                                                    key={lt.key}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setLeaveType(lt.key);
                                                    }}
                                                    style={[
                                                        s.typePill,
                                                        {
                                                            backgroundColor: isSel ? accentColor : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.typePillText,
                                                            { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' },
                                                        ]}
                                                    >
                                                        {lt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Annual Quota */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Annual Quota (Days / Year)</Text>
                                    <TextInput
                                        style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                        placeholder="12"
                                        placeholderTextColor={subtextColor}
                                        keyboardType="numeric"
                                        value={leaveAnnualQuota}
                                        onChangeText={setLeaveAnnualQuota}
                                    />
                                </View>

                                {/* Switch Options */}
                                <View style={[s.switchRow, { borderColor: cardBorder }]}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Paid Leave</Text>
                                    <Switch
                                        value={leaveIsPaid}
                                        onValueChange={setLeaveIsPaid}
                                        trackColor={{ false: '#767577', true: accentColor }}
                                    />
                                </View>
                                <View style={[s.switchRow, { borderColor: cardBorder }]}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Allow Carry-Over</Text>
                                    <Switch
                                        value={leaveCarryOverAllowed}
                                        onValueChange={setLeaveCarryOverAllowed}
                                        trackColor={{ false: '#767577', true: accentColor }}
                                    />
                                </View>
                            </>
                        )}

                        {/* Status Toggle */}
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
                    </ScrollView>

                    {/* Actions */}
                    <View style={[s.actionRow, { borderTopColor: cardBorder }]}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={onClose}
                            style={[s.cancelBtn, { borderColor: cardBorder }]}
                        >
                            <Text style={[s.cancelBtnText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleSave}
                            disabled={isSubmitting}
                            style={[s.submitBtn, { backgroundColor: accentColor }]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={s.submitBtnText}>
                                    {customSubmitLabel || (isEditMode ? 'Save Changes' : 'Create')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    dialogCard: {
        width: '100%',
        maxWidth: 580,
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 16,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
    },
    dragHandle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    closeButton: {
        padding: 4,
    },
    formContent: {
        gap: 14,
        paddingVertical: 4,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    textInput: {
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
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
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 9,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
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
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    submitBtn: {
        flex: 1.2,
        height: 46,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default SwiftUISetupItemSheet;
