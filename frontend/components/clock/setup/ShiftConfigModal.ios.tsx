import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    ShiftPatternItem,
    ShiftMode,
    ShiftRotation,
    ShiftAppliesTo,
} from '@/lib/api/clockSetup';

export interface ShiftConfigModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (item: ShiftPatternItem) => void;
    onDelete?: (item: ShiftPatternItem) => void;
    shiftItem: ShiftPatternItem | null;
    initialMode?: ShiftMode;
    workSchedules?: any[];
    departments?: any[];
    positions?: any[];
    levels?: any[];
    contractTypes?: any[];
    employees?: any[];
}

const SHIFT_MODE_OPTIONS: Array<{ key: ShiftMode; label: string; defaultName: string }> = [
    { key: 'no_shift', label: 'No Shift (Standard)', defaultName: 'No Shift' },
    { key: '2_shift', label: '2-Shift Rotation', defaultName: '2-Shift Rotation' },
    { key: '3_shift', label: '3-Shift Rotation', defaultName: '3-Shift Rotation' },
    { key: 'custom', label: 'Custom Shift Pattern', defaultName: 'Custom Shift' },
];

const ROTATION_OPTIONS: Array<{ key: ShiftRotation; label: string }> = [
    { key: 'weekly', label: 'Weekly Rotation' },
    { key: 'biweekly', label: 'Bi-Weekly (Every 2 Weeks)' },
    { key: 'monthly', label: 'Monthly Rotation' },
    { key: 'custom_days', label: 'Custom Days Interval' },
];

const APPLIES_TO_OPTIONS: Array<{ key: ShiftAppliesTo; label: string }> = [
    { key: 'all_employees', label: 'All Employees' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'level', label: 'Level / Grade' },
    { key: 'employment_type', label: 'Employment Type' },
    { key: 'specific_employees', label: 'Specific Employees' },
];

const SHIFT_COLORS = ['#007AFF', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#30B0C7'];

function timeStringToIso(timeStr: string): string {
    const [h, m] = (timeStr || '06:00').split(':').map((v) => parseInt(v, 10));
    const d = new Date();
    d.setHours(isNaN(h) ? 6 : h, isNaN(m) ? 0 : m, 0, 0);
    return d.toISOString();
}

function dateToTimeString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export function ShiftConfigModal({
    visible,
    onClose,
    onSave,
    onDelete,
    shiftItem,
    initialMode = 'no_shift',
    workSchedules = [],
    departments = [],
    positions = [],
    levels = [],
    contractTypes = [],
    employees = [],
}: ShiftConfigModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const isEditMode = Boolean(shiftItem);

    // Form states
    const [modeIndex, setModeIndex] = useState(0);
    const [name, setName] = useState('');
    const nameRef = useRef('');

    // Schedule: 0 = "Not Specified (Standalone)", 1..N = actual schedules
    const [schedulePickerIndex, setSchedulePickerIndex] = useState(0);

    const [rotationIndex, setRotationIndex] = useState(0);
    const [customRotationDays, setCustomRotationDays] = useState('4');
    const customRotationDaysRef = useRef('4');

    const [appliesToIndex, setAppliesToIndex] = useState(0);

    // Cascading Department -> Position -> Employee indices
    const [selectedDeptIndex, setSelectedDeptIndex] = useState(0); // 0 = All Departments
    const [selectedPosIndex, setSelectedPosIndex] = useState(0);   // 0 = All Positions (in Dept)
    const [selectedEmpIndex, setSelectedEmpIndex] = useState(0);   // 0 = All Employees (in Selection)

    const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
    const [selectedContractIndex, setSelectedContractIndex] = useState(0);
    const [selectedDirectEmpIndex, setSelectedDirectEmpIndex] = useState(0);

    const [isActive, setIsActive] = useState(true);

    // Editable Shift Slots State
    const [customShifts, setCustomShifts] = useState<Array<{
        name: string;
        startTime: string;
        endTime: string;
        crossesMidnight: boolean;
        color: string;
    }>>([]);

    const wasVisibleRef = useRef(false);

    // Schedule options: [ "Not Specified (Standalone Shift)", ...workSchedules ]
    const scheduleDropdownOptions = useMemo(() => {
        const list = ['Not Specified (Standalone Shift)'];
        workSchedules.forEach((ws: any) => {
            const typeLabel = ws.type ? ` (${ws.type})` : '';
            list.push(`${ws.name || 'Schedule'}${typeLabel}`);
        });
        return list;
    }, [workSchedules]);

    // Currently selected WorkSchedule object (null if index === 0)
    const currentLinkedSchedule = schedulePickerIndex > 0 ? workSchedules[schedulePickerIndex - 1] : null;

    // Helper to generate default shift slots for a mode and schedule
    const generateDefaultSlots = (mode: ShiftMode, sched: any) => {
        // 1. If schedule has explicit shifts configured in days_config.shifts
        if (sched?.days_config?.shifts && Array.isArray(sched.days_config.shifts) && sched.days_config.shifts.length > 0) {
            return sched.days_config.shifts.map((sh: any, idx: number) => {
                const startStr = (sh.start || '06:00').substring(0, 5);
                const endStr = (sh.end || '14:00').substring(0, 5);
                const startH = parseInt(startStr.split(':')[0] || '0', 10);
                const endH = parseInt(endStr.split(':')[0] || '0', 10);
                return {
                    name: sh.name || `Shift ${idx + 1}`,
                    startTime: startStr,
                    endTime: endStr,
                    crossesMidnight: endH < startH,
                    color: SHIFT_COLORS[idx % SHIFT_COLORS.length],
                };
            });
        }

        // 2. Fallbacks based on mode
        if (mode === '2_shift') {
            const schedStart = sched?.start_time ? sched.start_time.substring(0, 5) : '06:00';
            const schedEnd = sched?.end_time ? sched.end_time.substring(0, 5) : '14:00';
            return [
                { name: 'Shift 1 (Morning)', startTime: schedStart || '06:00', endTime: schedEnd || '14:00', crossesMidnight: false, color: '#007AFF' },
                { name: 'Shift 2 (Afternoon)', startTime: schedEnd || '14:00', endTime: '22:00', crossesMidnight: false, color: '#FF9500' },
            ];
        }

        if (mode === '3_shift') {
            return [
                { name: 'Shift 1 (Morning)', startTime: '06:00', endTime: '14:00', crossesMidnight: false, color: '#007AFF' },
                { name: 'Shift 2 (Afternoon)', startTime: '14:00', endTime: '22:00', crossesMidnight: false, color: '#FF9500' },
                { name: 'Shift 3 (Night)', startTime: '22:00', endTime: '06:00', crossesMidnight: true, color: '#5856D6' },
            ];
        }

        if (mode === 'custom') {
            return [
                { name: 'Shift 1', startTime: '08:00', endTime: '16:00', crossesMidnight: false, color: '#007AFF' },
                { name: 'Shift 2', startTime: '16:00', endTime: '00:00', crossesMidnight: false, color: '#FF9500' },
            ];
        }

        return [];
    };

    // ----------------------------------------------------
    // CASCADING (BERJENJANG) FILTERING LOGIC
    // ----------------------------------------------------
    // 1. Department List: ["All Departments", ...departments]
    const deptDropdownOptions = useMemo(() => {
        return ['All Departments', ...departments.map((d: any) => d.name || 'Department')];
    }, [departments]);

    const activeSelectedDept = selectedDeptIndex > 0 ? departments[selectedDeptIndex - 1] : null;

    // 2. Positions Filtered by Department:
    const filteredPositions = useMemo(() => {
        if (!activeSelectedDept) return positions;
        return positions.filter((p: any) => p.department_id === activeSelectedDept.id);
    }, [positions, activeSelectedDept]);

    const posDropdownOptions = useMemo(() => {
        const prefix = activeSelectedDept ? `All Positions in ${activeSelectedDept.name}` : 'All Positions';
        return [prefix, ...filteredPositions.map((p: any) => p.name || 'Position')];
    }, [filteredPositions, activeSelectedDept]);

    const activeSelectedPos = selectedPosIndex > 0 ? filteredPositions[selectedPosIndex - 1] : null;

    // 3. Employees Filtered by Department & Position:
    const filteredEmployees = useMemo(() => {
        let list = employees;
        if (activeSelectedDept) {
            list = list.filter((e: any) =>
                e.department_id === activeSelectedDept.id ||
                e.department?.toLowerCase() === activeSelectedDept.name?.toLowerCase()
            );
        }
        if (activeSelectedPos) {
            list = list.filter((e: any) =>
                e.position_id === activeSelectedPos.id ||
                e.job_title?.toLowerCase() === activeSelectedPos.name?.toLowerCase() ||
                e.position?.toLowerCase() === activeSelectedPos.name?.toLowerCase()
            );
        }
        return list;
    }, [employees, activeSelectedDept, activeSelectedPos]);

    const empDropdownOptions = useMemo(() => {
        return ['All Employees in Scope', ...filteredEmployees.map((e: any) => e.full_name || e.name || 'Employee')];
    }, [filteredEmployees]);

    const levelDropdownOptions = useMemo(() => {
        return levels.length > 0 ? levels.map((l: any) => l.name || `Level ${l.level_code || ''}`) : ['Level 1 - Staff', 'Level 2 - Supervisor', 'Level 3 - Manager'];
    }, [levels]);

    const contractDropdownOptions = useMemo(() => {
        return contractTypes.length > 0 ? contractTypes.map((c: any) => c.name || 'Contract') : ['Full-Time', 'Contract', 'Shift Worker', 'Daily Worker'];
    }, [contractTypes]);

    const directEmpDropdownOptions = useMemo(() => {
        return employees.length > 0 ? employees.map((e: any) => e.full_name || e.name || 'Employee') : ['John Doe', 'Jane Smith'];
    }, [employees]);

    // Initialize data when modal opens
    useEffect(() => {
        if (visible && !wasVisibleRef.current) {
            if (shiftItem) {
                // Editing existing shift
                const mIdx = SHIFT_MODE_OPTIONS.findIndex((o) => o.key === shiftItem.mode);
                setModeIndex(mIdx >= 0 ? mIdx : 0);

                const n = shiftItem.name || '';
                setName(n);
                nameRef.current = n;

                const rIdx = ROTATION_OPTIONS.findIndex((o) => o.key === shiftItem.rotation);
                setRotationIndex(rIdx >= 0 ? rIdx : 0);

                const rDays = String(shiftItem.rotationDays || 4);
                setCustomRotationDays(rDays);
                customRotationDaysRef.current = rDays;

                const aIdx = APPLIES_TO_OPTIONS.findIndex((o) => o.key === shiftItem.appliesTo);
                setAppliesToIndex(aIdx >= 0 ? aIdx : 0);

                // Schedule index
                if (shiftItem.sourceScheduleId && workSchedules.length > 0) {
                    const wsIdx = workSchedules.findIndex((ws: any) => ws.id === shiftItem.sourceScheduleId);
                    setSchedulePickerIndex(wsIdx >= 0 ? wsIdx + 1 : 0);
                } else {
                    setSchedulePickerIndex(0); // Not Specified
                }

                // Department / Cascading
                if (shiftItem.appliesTo === 'department' && shiftItem.appliesToValues?.[0]) {
                    const dIdx = departments.findIndex((d: any) => d.id === shiftItem.appliesToValues[0] || d.name === shiftItem.appliesToValues[0]);
                    setSelectedDeptIndex(dIdx >= 0 ? dIdx + 1 : 0);
                } else {
                    setSelectedDeptIndex(0);
                }
                setSelectedPosIndex(0);
                setSelectedEmpIndex(0);

                // Position
                if (shiftItem.appliesTo === 'position' && shiftItem.appliesToValues?.[0]) {
                    const pIdx = positions.findIndex((p: any) => p.id === shiftItem.appliesToValues[0] || p.name === shiftItem.appliesToValues[0]);
                    setSelectedPosIndex(pIdx >= 0 ? pIdx + 1 : 0);
                }

                // Level
                if (shiftItem.appliesTo === 'level' && shiftItem.appliesToValues?.[0]) {
                    const lIdx = levels.findIndex((l: any) => l.id === shiftItem.appliesToValues[0] || l.name === shiftItem.appliesToValues[0]);
                    setSelectedLevelIndex(lIdx >= 0 ? lIdx : 0);
                } else {
                    setSelectedLevelIndex(0);
                }

                // Contract
                if (shiftItem.appliesTo === 'employment_type' && shiftItem.appliesToValues?.[0]) {
                    const cIdx = contractTypes.findIndex((c: any) => c.id === shiftItem.appliesToValues[0] || c.name === shiftItem.appliesToValues[0]);
                    setSelectedContractIndex(cIdx >= 0 ? cIdx : 0);
                } else {
                    setSelectedContractIndex(0);
                }

                // Employee
                if (shiftItem.appliesTo === 'specific_employees' && shiftItem.appliesToValues?.[0]) {
                    const eIdx = employees.findIndex((e: any) => e.id === shiftItem.appliesToValues[0] || e.name === shiftItem.appliesToValues[0]);
                    setSelectedDirectEmpIndex(eIdx >= 0 ? eIdx : 0);
                } else {
                    setSelectedDirectEmpIndex(0);
                }

                setIsActive(shiftItem.isActive ?? true);

                // Initialize shift slots from item
                if (shiftItem.shifts && shiftItem.shifts.length > 0) {
                    setCustomShifts([...shiftItem.shifts]);
                } else {
                    const matchedSched = workSchedules.find((ws: any) => ws.id === shiftItem.sourceScheduleId) || null;
                    setCustomShifts(generateDefaultSlots(shiftItem.mode, matchedSched));
                }
            } else {
                // Creating new from preset
                const targetMode = initialMode || 'no_shift';
                const mIdx = SHIFT_MODE_OPTIONS.findIndex((o) => o.key === targetMode);
                const safeIdx = mIdx >= 0 ? mIdx : 0;
                setModeIndex(safeIdx);

                const defaultName = SHIFT_MODE_OPTIONS[safeIdx]?.defaultName || 'No Shift';
                setName(defaultName);
                nameRef.current = defaultName;

                setRotationIndex(0);
                setCustomRotationDays('4');
                customRotationDaysRef.current = '4';

                // Find matching schedule for this mode if exists
                let initialSchedPickerIdx = 0; // default Not Specified
                if (targetMode === '2_shift') {
                    const s2Idx = workSchedules.findIndex((ws: any) =>
                        (ws.name || '').toLowerCase().includes('2-shift') || (ws.days_config?.shifts?.length === 2)
                    );
                    if (s2Idx >= 0) initialSchedPickerIdx = s2Idx + 1;
                } else if (targetMode === '3_shift') {
                    const s3Idx = workSchedules.findIndex((ws: any) =>
                        (ws.name || '').toLowerCase().includes('3-shift') || (ws.days_config?.shifts?.length === 3)
                    );
                    if (s3Idx >= 0) initialSchedPickerIdx = s3Idx + 1;
                }

                setSchedulePickerIndex(initialSchedPickerIdx);

                // Default applies to department if 2/3 shift, or all if no shift
                if (targetMode === '2_shift' || targetMode === '3_shift') {
                    setAppliesToIndex(1); // Department
                } else {
                    setAppliesToIndex(0); // All employees
                }

                setSelectedDeptIndex(0);
                setSelectedPosIndex(0);
                setSelectedEmpIndex(0);
                setSelectedLevelIndex(0);
                setSelectedContractIndex(0);
                setSelectedDirectEmpIndex(0);
                setIsActive(true);

                // Generate default slots
                const targetSched = initialSchedPickerIdx > 0 ? workSchedules[initialSchedPickerIdx - 1] : null;
                setCustomShifts(generateDefaultSlots(targetMode, targetSched));
            }
        }
        wasVisibleRef.current = visible;
    }, [visible, shiftItem, initialMode, workSchedules, departments, positions, levels, contractTypes, employees]);

    const currentMode = SHIFT_MODE_OPTIONS[modeIndex]?.key || 'no_shift';

    // Slot update handlers
    const updateSlotName = (slotIdx: number, newName: string) => {
        setCustomShifts((prev) => {
            const next = [...prev];
            if (next[slotIdx]) {
                next[slotIdx] = { ...next[slotIdx], name: newName };
            }
            return next;
        });
    };

    const updateSlotStartTime = (slotIdx: number, newTime: string) => {
        setCustomShifts((prev) => {
            const next = [...prev];
            if (next[slotIdx]) {
                const startH = parseInt(newTime.split(':')[0] || '0', 10);
                const endH = parseInt(next[slotIdx].endTime.split(':')[0] || '0', 10);
                next[slotIdx] = {
                    ...next[slotIdx],
                    startTime: newTime,
                    crossesMidnight: endH < startH,
                };
            }
            return next;
        });
    };

    const updateSlotEndTime = (slotIdx: number, newTime: string) => {
        setCustomShifts((prev) => {
            const next = [...prev];
            if (next[slotIdx]) {
                const startH = parseInt(next[slotIdx].startTime.split(':')[0] || '0', 10);
                const endH = parseInt(newTime.split(':')[0] || '0', 10);
                next[slotIdx] = {
                    ...next[slotIdx],
                    endTime: newTime,
                    crossesMidnight: endH < startH,
                };
            }
            return next;
        });
    };

    const addShiftSlot = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomShifts((prev) => {
            const count = prev.length + 1;
            const newSlot = {
                name: `Shift ${count}`,
                startTime: '08:00',
                endTime: '16:00',
                crossesMidnight: false,
                color: SHIFT_COLORS[(count - 1) % SHIFT_COLORS.length],
            };
            return [...prev, newSlot];
        });
    };

    const removeShiftSlot = (slotIdx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCustomShifts((prev) => prev.filter((_, idx) => idx !== slotIdx));
    };

    // Calculate dynamic summary of who this shift applies to
    const appliesToSummary = useMemo(() => {
        const scope = APPLIES_TO_OPTIONS[appliesToIndex]?.key || 'all_employees';
        if (scope === 'all_employees') return 'All Employees (Entire Organization)';

        if (scope === 'department' || scope === 'position') {
            const deptText = activeSelectedDept ? activeSelectedDept.name : 'All Departments';
            const posText = activeSelectedPos ? activeSelectedPos.name : 'All Positions';
            const empText = selectedEmpIndex > 0 && filteredEmployees[selectedEmpIndex - 1]
                ? filteredEmployees[selectedEmpIndex - 1].full_name || filteredEmployees[selectedEmpIndex - 1].name
                : null;

            if (empText) {
                return `Specific Member: ${empText} (${deptText} · ${posText})`;
            }
            if (activeSelectedPos) {
                return `${deptText} · ${posText} (All Staff)`;
            }
            if (activeSelectedDept) {
                return `Department: ${deptText} (All Positions)`;
            }
            return 'All Departments & Positions';
        }

        if (scope === 'level') {
            const lvl = levels[selectedLevelIndex];
            return lvl ? `Level: ${lvl.name || `Level ${lvl.level_code}`}` : 'All Levels';
        }

        if (scope === 'employment_type') {
            const ct = contractTypes[selectedContractIndex];
            return ct ? `Contract: ${ct.name}` : 'All Contract Types';
        }

        if (scope === 'specific_employees') {
            const emp = employees[selectedDirectEmpIndex];
            return emp ? `Specific Employee: ${emp.full_name || emp.name}` : 'Selected Employees';
        }

        return 'All Employees';
    }, [appliesToIndex, activeSelectedDept, activeSelectedPos, selectedEmpIndex, filteredEmployees, levels, selectedLevelIndex, contractTypes, selectedContractIndex, employees, selectedDirectEmpIndex]);

    // Validation & Save
    const handleSave = () => {
        const finalName = (nameRef.current || name).trim();
        if (!finalName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Missing Field', 'Please enter a Shift Name.');
            return;
        }

        const modeKey = SHIFT_MODE_OPTIONS[modeIndex]?.key || 'no_shift';
        const rotKey = ROTATION_OPTIONS[rotationIndex]?.key || 'weekly';
        const appliesKey = APPLIES_TO_OPTIONS[appliesToIndex]?.key || 'all_employees';

        let targetValues: string[] = [];

        if (appliesKey === 'department' || appliesKey === 'position') {
            // Save hierarchy values
            if (selectedEmpIndex > 0 && filteredEmployees[selectedEmpIndex - 1]) {
                targetValues = [filteredEmployees[selectedEmpIndex - 1].id];
            } else if (activeSelectedPos) {
                targetValues = [activeSelectedPos.id || activeSelectedPos.name];
            } else if (activeSelectedDept) {
                targetValues = [activeSelectedDept.id || activeSelectedDept.name];
            }
        } else if (appliesKey === 'level') {
            const lvl = levels[selectedLevelIndex];
            if (lvl) targetValues = [lvl.id || String(lvl.level_code)];
        } else if (appliesKey === 'employment_type') {
            const ct = contractTypes[selectedContractIndex];
            if (ct) targetValues = [ct.id || ct.name];
        } else if (appliesKey === 'specific_employees') {
            const emp = employees[selectedDirectEmpIndex];
            if (emp) targetValues = [emp.id || emp.name];
        }

        const rotDaysVal = parseInt(customRotationDaysRef.current || customRotationDays, 10) || 4;

        const workingDays = currentLinkedSchedule?.days_config?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const restDays = allDays.filter((d: string) => !workingDays.includes(d));

        const payload: ShiftPatternItem = {
            id: shiftItem?.id || `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: finalName,
            mode: modeKey,
            sourceScheduleId: (modeKey !== 'no_shift' && currentLinkedSchedule) ? currentLinkedSchedule.id : undefined,
            sourceScheduleName: (modeKey !== 'no_shift' && currentLinkedSchedule) ? currentLinkedSchedule.name : undefined,
            shifts: modeKey !== 'no_shift' ? customShifts : [],
            rotation: rotKey,
            rotationDays: rotKey === 'custom_days' ? rotDaysVal : undefined,
            workDays: workingDays,
            restDays: restDays.length > 0 ? restDays : ['Sun'],
            appliesTo: appliesKey,
            appliesToValues: targetValues,
            appliesToDisplay: appliesToSummary,
            isActive: isActive,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(payload);
        onClose();
    };

    const handleDelete = () => {
        if (!shiftItem || !onDelete) return;
        Alert.alert('Delete Shift Pattern', `Are you sure you want to remove "${shiftItem.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onDelete(shiftItem);
                    onClose();
                },
            },
        ]);
    };

    const appliesToKey = APPLIES_TO_OPTIONS[appliesToIndex]?.key || 'all_employees';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.92]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Shift Pattern' : 'New Shift Pattern'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear')]}>
                        {/* 1. Shift Pattern Preset Menu Dropdown */}
                        <Section title="Shift Pattern">
                            <Picker
                                label="Preset / Mode"
                                options={SHIFT_MODE_OPTIONS.map((o) => o.label)}
                                selectedIndex={modeIndex}
                                onOptionSelected={(e) => {
                                    const newIdx = e.nativeEvent.index;
                                    setModeIndex(newIdx);
                                    Haptics.selectionAsync();

                                    const targetPreset = SHIFT_MODE_OPTIONS[newIdx];
                                    const presetName = targetPreset?.defaultName || 'Shift Pattern';
                                    setName(presetName);
                                    nameRef.current = presetName;

                                    // Find suitable schedule for new mode if exists
                                    let bestSchedIdx = 0; // Not Specified
                                    if (targetPreset?.key === '2_shift') {
                                        const s2Idx = workSchedules.findIndex((ws: any) =>
                                            (ws.name || '').toLowerCase().includes('2-shift') || (ws.days_config?.shifts?.length === 2)
                                        );
                                        if (s2Idx >= 0) bestSchedIdx = s2Idx + 1;
                                        setAppliesToIndex(1); // Department
                                    } else if (targetPreset?.key === '3_shift') {
                                        const s3Idx = workSchedules.findIndex((ws: any) =>
                                            (ws.name || '').toLowerCase().includes('3-shift') || (ws.days_config?.shifts?.length === 3)
                                        );
                                        if (s3Idx >= 0) bestSchedIdx = s3Idx + 1;
                                        setAppliesToIndex(1); // Department
                                    } else if (targetPreset?.key === 'no_shift') {
                                        setAppliesToIndex(0); // All Employees
                                    }

                                    setSchedulePickerIndex(bestSchedIdx);
                                    const targetSched = bestSchedIdx > 0 ? workSchedules[bestSchedIdx - 1] : null;
                                    setCustomShifts(generateDefaultSlots(targetPreset?.key || 'no_shift', targetSched));
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />

                            <HStack alignment="center">
                                <SwiftUIText size={15} color={subtextColor}>
                                    Pattern Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    key={`shift-name-${shiftItem?.id || modeIndex}-${name}`}
                                    placeholder="e.g. 2-Shift Rotation"
                                    defaultValue={nameRef.current || name}
                                    onChangeText={(txt) => {
                                        setName(txt);
                                        nameRef.current = txt;
                                    }}
                                />
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText size={15} color={textColor}>
                                    Active Pattern
                                </SwiftUIText>
                                <Spacer />
                                <Switch
                                    value={isActive}
                                    onValueChange={(val: boolean) => {
                                        setIsActive(val);
                                        Haptics.selectionAsync();
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* 2. Source Work Schedule (if not No Shift) */}
                        {currentMode === 'no_shift' ? (
                            <Section title="Regular Schedule">
                                <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                        Standard Regular Working Hours
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        Assigned employees follow their standard work schedule without shift rotation. Department or team members not in shift rotation stay on No Shift.
                                    </SwiftUIText>
                                </VStack>
                            </Section>
                        ) : (
                            <Section title="Source Work Schedule">
                                <Picker
                                    label="Linked Schedule"
                                    options={scheduleDropdownOptions}
                                    selectedIndex={schedulePickerIndex}
                                    onOptionSelected={(e) => {
                                        const sIdx = e.nativeEvent.index;
                                        setSchedulePickerIndex(sIdx);
                                        Haptics.selectionAsync();

                                        if (sIdx > 0) {
                                            const sch = workSchedules[sIdx - 1];
                                            if (sch) {
                                                const newSlots = generateDefaultSlots(currentMode, sch);
                                                if (newSlots.length > 0) {
                                                    setCustomShifts(newSlots);
                                                }
                                            }
                                        }
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />

                                {/* Linked status note */}
                                <VStack spacing={2} alignment="leading" modifiers={[padding({ vertical: 2 })]}>
                                    {schedulePickerIndex === 0 ? (
                                        <SwiftUIText size={12} color="#007AFF">
                                            Standalone Shift: Shift slots are configured directly below without linking to a master schedule.
                                        </SwiftUIText>
                                    ) : (
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {`Linked to: ${currentLinkedSchedule?.name || 'Schedule'}. Any master schedule changes will sync here.`}
                                        </SwiftUIText>
                                    )}
                                </VStack>
                            </Section>
                        )}

                        {/* 3. Editable Shift Hours & Slots */}
                        {currentMode !== 'no_shift' && (
                            <>
                                <Section title={`Shift Hours & Slots (${customShifts.length})`}>
                                    <VStack spacing={2} alignment="leading" modifiers={[padding({ vertical: 2 })]}>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            Adjust start and end times for each shift rotation slot.
                                        </SwiftUIText>
                                    </VStack>

                                    {customShifts.map((slot: any, idx: number) => (
                                        <React.Fragment key={`slot-item-${idx}`}>
                                            {/* Shift Slot Header / Name Field */}
                                            <HStack alignment="center">
                                                <SwiftUIText size={14} weight="bold" color={slot.color || '#007AFF'}>
                                                    {`Shift ${idx + 1}`}
                                                </SwiftUIText>
                                                <Spacer />
                                                <TextField
                                                    key={`slot-name-${idx}-${slot.name}`}
                                                    placeholder={`Shift ${idx + 1}`}
                                                    defaultValue={slot.name}
                                                    onChangeText={(txt) => updateSlotName(idx, txt)}
                                                />
                                            </HStack>

                                            {/* Start Time Picker */}
                                            <DateTimePicker
                                                key={`slot-${idx}-start-${slot.startTime}`}
                                                title="   ↳ Start Time"
                                                displayedComponents="hourAndMinute"
                                                variant="compact"
                                                initialDate={timeStringToIso(slot.startTime)}
                                                onDateSelected={(date) => {
                                                    const timeStr = dateToTimeString(date);
                                                    updateSlotStartTime(idx, timeStr);
                                                }}
                                            />

                                            {/* End Time Picker */}
                                            <DateTimePicker
                                                key={`slot-${idx}-end-${slot.endTime}`}
                                                title={slot.crossesMidnight ? '   ↳ End Time (+1 day)' : '   ↳ End Time'}
                                                displayedComponents="hourAndMinute"
                                                variant="compact"
                                                initialDate={timeStringToIso(slot.endTime)}
                                                onDateSelected={(date) => {
                                                    const timeStr = dateToTimeString(date);
                                                    updateSlotEndTime(idx, timeStr);
                                                }}
                                            />

                                            {/* Delete Slot Button (Custom mode & > 1 slot) */}
                                            {currentMode === 'custom' && customShifts.length > 1 && (
                                                <Button
                                                    role="destructive"
                                                    color="#FF3B30"
                                                    onPress={() => removeShiftSlot(idx)}
                                                >
                                                    <SwiftUIText size={13} color="#FF3B30">
                                                        {`Remove Shift ${idx + 1}`}
                                                    </SwiftUIText>
                                                </Button>
                                            )}
                                        </React.Fragment>
                                    ))}

                                    {/* Add Shift Slot Button */}
                                    {currentMode === 'custom' && (
                                        <Button
                                            color="#007AFF"
                                            onPress={addShiftSlot}
                                        >
                                            <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                                + Add Shift Slot
                                            </SwiftUIText>
                                        </Button>
                                    )}
                                </Section>
                            </>
                        )}

                        {/* 4. Rotation Pattern (if Shift mode) */}
                        {currentMode !== 'no_shift' && (
                            <Section title="Rotation Rules">
                                <Picker
                                    label="Rotation Cycle"
                                    options={ROTATION_OPTIONS.map((r) => r.label)}
                                    selectedIndex={rotationIndex}
                                    onOptionSelected={(e) => {
                                        setRotationIndex(e.nativeEvent.index);
                                        Haptics.selectionAsync();
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />

                                {ROTATION_OPTIONS[rotationIndex]?.key === 'custom_days' && (
                                    <HStack alignment="center">
                                        <SwiftUIText size={15} color={subtextColor}>
                                            Rotate Every (Days)
                                        </SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            key={`rot-days-${shiftItem?.id || modeIndex}`}
                                            placeholder="4"
                                            defaultValue={customRotationDaysRef.current || customRotationDays}
                                            onChangeText={(txt) => {
                                                const digits = txt.replace(/[^0-9]/g, '');
                                                setCustomRotationDays(digits);
                                                customRotationDaysRef.current = digits;
                                            }}
                                        />
                                    </HStack>
                                )}
                            </Section>
                        )}

                        {/* 5. Cascading / Berjenjang Targeting Section */}
                        <Section title="Targeting & Scope (Applies To)">
                            {/* Primary Scope Selector */}
                            <Picker
                                label="Applies To Scope"
                                options={APPLIES_TO_OPTIONS.map((a) => a.label)}
                                selectedIndex={appliesToIndex}
                                onOptionSelected={(e) => {
                                    setAppliesToIndex(e.nativeEvent.index);
                                    Haptics.selectionAsync();
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />

                            {/* CASCADING: Department -> Position -> Employee */}
                            {(appliesToKey === 'department' || appliesToKey === 'position') && (
                                <>
                                    {/* 1. Target Department */}
                                    <Picker
                                        label="Target Department"
                                        options={deptDropdownOptions}
                                        selectedIndex={selectedDeptIndex}
                                        onOptionSelected={(e) => {
                                            setSelectedDeptIndex(e.nativeEvent.index);
                                            setSelectedPosIndex(0); // reset sub-position
                                            setSelectedEmpIndex(0); // reset sub-employee
                                            Haptics.selectionAsync();
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />

                                    {/* 2. Target Position (Cascading from Dept) */}
                                    <Picker
                                        label="Target Position"
                                        options={posDropdownOptions}
                                        selectedIndex={selectedPosIndex}
                                        onOptionSelected={(e) => {
                                            setSelectedPosIndex(e.nativeEvent.index);
                                            setSelectedEmpIndex(0); // reset sub-employee
                                            Haptics.selectionAsync();
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />

                                    {/* 3. Target Employee (Cascading from Dept & Pos) */}
                                    <Picker
                                        label="Target Employee"
                                        options={empDropdownOptions}
                                        selectedIndex={selectedEmpIndex}
                                        onOptionSelected={(e) => {
                                            setSelectedEmpIndex(e.nativeEvent.index);
                                            Haptics.selectionAsync();
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                </>
                            )}

                            {/* Level / Grade Selection */}
                            {appliesToKey === 'level' && (
                                <Picker
                                    label="Target Level / Grade"
                                    options={levelDropdownOptions}
                                    selectedIndex={selectedLevelIndex}
                                    onOptionSelected={(e) => {
                                        setSelectedLevelIndex(e.nativeEvent.index);
                                        Haptics.selectionAsync();
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />
                            )}

                            {/* Employment Type Selection */}
                            {appliesToKey === 'employment_type' && (
                                <Picker
                                    label="Target Type"
                                    options={contractDropdownOptions}
                                    selectedIndex={selectedContractIndex}
                                    onOptionSelected={(e) => {
                                        setSelectedContractIndex(e.nativeEvent.index);
                                        Haptics.selectionAsync();
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />
                            )}

                            {/* Direct Specific Employee Selection */}
                            {appliesToKey === 'specific_employees' && (
                                <Picker
                                    label="Target Employee"
                                    options={directEmpDropdownOptions}
                                    selectedIndex={selectedDirectEmpIndex}
                                    onOptionSelected={(e) => {
                                        setSelectedDirectEmpIndex(e.nativeEvent.index);
                                        Haptics.selectionAsync();
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />
                            )}

                            {/* Live Cascading Summary */}
                            <VStack spacing={2} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} weight="semibold" color="#007AFF">
                                    {appliesToSummary}
                                </SwiftUIText>
                                <SwiftUIText size={11.5} color={subtextColor}>
                                    Only employees matching this target filter will be assigned to this shift pattern. Others will follow their respective defaults.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>

                    {/* Bottom Actions */}
                    <VStack
                        spacing={10}
                        modifiers={[
                            background('clear'),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 28 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSave}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isEditMode ? 'Save Shift Changes' : 'Create Shift Pattern'}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>

                        {isEditMode && onDelete && (
                            <Button
                                role="destructive"
                                color="#FF3B30"
                                onPress={handleDelete}
                            >
                                <HStack
                                    modifiers={[
                                        frame({ maxWidth: Infinity }),
                                        frame({ height: 36 }),
                                    ]}
                                >
                                    <Spacer />
                                    <SwiftUIText weight="medium" size={15} color="#FF3B30">
                                        Delete Shift Pattern
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
