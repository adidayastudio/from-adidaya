import React, { useState, useEffect, useMemo } from 'react';
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
    AttendancePeriodConfig,
    AttendancePeriodMode,
    PayrollCycleType,
    WeekdayName,
} from '@/lib/api/clockSetup';

export type PeriodSettingTarget = 'cutoff' | 'timezone' | 'calculation_mode';

export interface PeriodTimezoneSheetProps {
    visible: boolean;
    onClose: () => void;
    target: PeriodSettingTarget;
    config: AttendancePeriodConfig;
    onSave: (updated: AttendancePeriodConfig) => void;
}

export const getDayOrdinal = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
};

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    return `Every ${d}${getDayOrdinal(d)}`;
});

export const WEEKDAY_OPTIONS: WeekdayName[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

export const CYCLE_TYPE_OPTIONS: Array<{ key: PayrollCycleType; label: string }> = [
    { key: 'monthly', label: 'Monthly (Days of Month)' },
    { key: 'weekly', label: 'Weekly (Every 7 Days)' },
    { key: 'biweekly', label: 'Bi-weekly (Every 14 Days)' },
    { key: 'semimonthly', label: 'Semi-monthly (Twice a Month)' },
];

export const PRESET_OPTIONS = [
    '1st to End of Month',
    '21st to 20th (Standard)',
    '26th to 25th (Mid-Month)',
    'Custom (Monthly)',
    'Semi-monthly (1st-15th & 16th-End)',
    'Weekly (Monday – Sunday)',
    'Weekly (Custom)',
    'Bi-weekly (Every 2 Wks, Mon – Sun)',
];

export const getDynamicCutoffExample = (start: number, end: number) => {
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    if (start <= end) {
        const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
        const actualStart = Math.min(start, daysInMonth);
        const actualEnd = Math.min(end, daysInMonth);
        const d1 = new Date(currentYear, currentMonthIdx, actualStart);
        const mName = d1.toLocaleString('en', { month: 'short' });
        return `${actualStart} ${mName} – ${actualEnd} ${mName}`;
    }

    let startYear = currentYear;
    let startMonthIdx = currentMonthIdx;
    let endYear = currentYear;
    let endMonthIdx = currentMonthIdx;

    if (now.getDate() >= start) {
        startMonthIdx = currentMonthIdx;
        endMonthIdx = currentMonthIdx + 1;
        if (endMonthIdx > 11) {
            endMonthIdx = 0;
            endYear += 1;
        }
    } else {
        startMonthIdx = currentMonthIdx - 1;
        if (startMonthIdx < 0) {
            startMonthIdx = 11;
            startYear -= 1;
        }
        endMonthIdx = currentMonthIdx;
    }

    const daysInStartMonth = new Date(startYear, startMonthIdx + 1, 0).getDate();
    const daysInEndMonth = new Date(endYear, endMonthIdx + 1, 0).getDate();
    const actualStart = Math.min(start, daysInStartMonth);
    const actualEnd = Math.min(end, daysInEndMonth);

    const startMonthDate = new Date(startYear, startMonthIdx, actualStart);
    const endMonthDate = new Date(endYear, endMonthIdx, actualEnd);

    const startM = startMonthDate.toLocaleString('en', { month: 'short' });
    const endM = endMonthDate.toLocaleString('en', { month: 'short' });
    return `${actualStart} ${startM} – ${actualEnd} ${endM}`;
};

export const TIMEZONE_OPTIONS = [
    { key: 'Asia/Jakarta', label: 'Asia/Jakarta (GMT+7 • WIB)', short: 'WIB' },
    { key: 'Asia/Makassar', label: 'Asia/Makassar (GMT+8 • WITA)', short: 'WITA' },
    { key: 'Asia/Jayapura', label: 'Asia/Jayapura (GMT+9 • WIT)', short: 'WIT' },
    { key: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8 • SGT)', short: 'SGT' },
    { key: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7 • ICT)', short: 'ICT' },
    { key: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9 • JST)', short: 'JST' },
    { key: 'UTC', label: 'UTC (GMT+0 • Universal Time)', short: 'UTC' },
    { key: 'Europe/London', label: 'Europe/London (GMT+0/+1 • BST/GMT)', short: 'BST/GMT' },
    { key: 'America/New_York', label: 'America/New_York (GMT-5/-4 • EST/EDT)', short: 'EST' },
    { key: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8/-7 • PST/PDT)', short: 'PST' },
    { key: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10/+11 • AEST)', short: 'AEST' },
];

export const CALCULATION_MODES: Array<{
    mode: AttendancePeriodMode;
    title: string;
    description: (start: number, end: number) => string;
}> = [
    {
        mode: 'cutoff',
        title: 'Per Cut-off Period',
        description: (s, e) => {
            const example = getDynamicCutoffExample(s, e);
            return `Aggregated between day ${s} and day ${e} of each cycle (e.g. ${example}).`;
        },
    },
    {
        mode: 'calendar_month',
        title: 'Per Calendar Month',
        description: () => {
            const now = new Date();
            const mName = now.toLocaleString('en', { month: 'short' });
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return `Aggregated from the 1st to the last day of each calendar month (e.g. 1 ${mName} – ${lastDay} ${mName}).`;
        },
    },
    {
        mode: 'workday',
        title: 'Per Workday',
        description: () => 'Evaluated independently per daily shift (resets each morning at shift start).',
    },
];

export function PeriodTimezoneSheet({
    visible,
    onClose,
    target,
    config,
    onSave,
}: PeriodTimezoneSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    // Local form state
    const [cycleType, setCycleType] = useState<PayrollCycleType>(config.cycleType || 'monthly');
    const [startDay, setStartDay] = useState(config.cutoffDayStart || 21);
    const [endDay, setEndDay] = useState(config.cutoffDayEnd || 20);
    const [startWeekday, setStartWeekday] = useState<WeekdayName>(config.startWeekday || 'Monday');
    const [endWeekday, setEndWeekday] = useState<WeekdayName>(config.endWeekday || 'Sunday');
    const [timezone, setTimezone] = useState(config.timezone || 'Asia/Jakarta');
    const [calcMode, setCalcMode] = useState<AttendancePeriodMode>(config.calculationMode || 'cutoff');
    const [tzSearchQuery, setTzSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            setCycleType(config.cycleType || 'monthly');
            setStartDay(config.cutoffDayStart || 21);
            setEndDay(config.cutoffDayEnd || 20);
            setStartWeekday(config.startWeekday || 'Monday');
            setEndWeekday(config.endWeekday || 'Sunday');
            setTimezone(config.timezone || 'Asia/Jakarta');
            setCalcMode(config.calculationMode || 'cutoff');
            setTzSearchQuery('');
        }
    }, [visible, config]);

    const filteredTimezones = useMemo(() => {
        if (!tzSearchQuery.trim()) return TIMEZONE_OPTIONS;
        const q = tzSearchQuery.toLowerCase();
        return TIMEZONE_OPTIONS.filter(
            (tz) =>
                tz.key.toLowerCase().includes(q) ||
                tz.label.toLowerCase().includes(q) ||
                tz.short.toLowerCase().includes(q)
        );
    }, [tzSearchQuery]);

    const handleApplyPreset = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (index === 0) {
            setCycleType('monthly');
            setStartDay(1);
            setEndDay(31);
        } else if (index === 1) {
            setCycleType('monthly');
            setStartDay(21);
            setEndDay(20);
        } else if (index === 2) {
            setCycleType('monthly');
            setStartDay(26);
            setEndDay(25);
        } else if (index === 3) {
            setCycleType('monthly');
        } else if (index === 4) {
            setCycleType('semimonthly');
            setStartDay(1);
            setEndDay(15);
        } else if (index === 5) {
            setCycleType('weekly');
            setStartWeekday('Monday');
            setEndWeekday('Sunday');
        } else if (index === 6) {
            setCycleType('weekly');
        } else if (index === 7) {
            setCycleType('biweekly');
            setStartWeekday('Monday');
            setEndWeekday('Sunday');
        }
    };

    const presetSelectedIndex = useMemo(() => {
        if (cycleType === 'monthly') {
            if (startDay === 1 && (endDay === 30 || endDay === 31 || endDay === 28)) return 0;
            if (startDay === 21 && endDay === 20) return 1;
            if (startDay === 26 && endDay === 25) return 2;
            return 3; // Custom (Monthly)
        }
        if (cycleType === 'semimonthly') return 4;
        if (cycleType === 'weekly') {
            if (startWeekday === 'Monday' && endWeekday === 'Sunday') return 5;
            return 6; // Weekly (Custom)
        }
        if (cycleType === 'biweekly') return 7;
        return 3;
    }, [cycleType, startDay, endDay, startWeekday, endWeekday]);

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated: AttendancePeriodConfig = {
            cutoffDayStart: startDay,
            cutoffDayEnd: endDay,
            timezone,
            calculationMode: calcMode,
            cycleType,
            startWeekday,
            endWeekday,
        };
        onSave(updated);
        onClose();
    };

    const sheetTitle =
        target === 'cutoff'
            ? 'Payroll Cut-off Cycle'
            : target === 'timezone'
            ? 'Timezone Standard'
            : 'Attendance Period';

    const cyclePreviewText = useMemo(() => {
        if (cycleType === 'weekly') {
            return `Attendance & overtime will be aggregated weekly from every ${startWeekday} to ${endWeekday}.`;
        }
        if (cycleType === 'biweekly') {
            return `Attendance & overtime will be aggregated every 2 weeks (14 days), starting every alternate ${startWeekday} through ${endWeekday}.`;
        }
        if (cycleType === 'semimonthly') {
            return `Attendance & overtime will be calculated twice a month: 1st to 15th, and 16th to the last day of each month.`;
        }
        const example = getDynamicCutoffExample(startDay, endDay);
        return `Attendance & overtime will be calculated from every ${startDay}${getDayOrdinal(startDay)} to ${endDay}${getDayOrdinal(endDay)} (e.g. ${example}).`;
    }, [cycleType, startDay, endDay, startWeekday, endWeekday]);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.88]}
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
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {sheetTitle}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Content */}
                    <Form modifiers={[background('clear')]}>
                        {/* 1. PAYROLL CUT-OFF TARGET */}
                        {target === 'cutoff' && (
                            <>
                                <Section title="Quick Preset Cycles">
                                    <Picker
                                        label="Cycle Preset"
                                        options={PRESET_OPTIONS}
                                        selectedIndex={presetSelectedIndex}
                                        onOptionSelected={(e) => {
                                            handleApplyPreset(e.nativeEvent.index);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                </Section>

                                <Section title="Cycle Frequency">
                                    <Picker
                                        label="Frequency"
                                        options={CYCLE_TYPE_OPTIONS.map((c) => c.label)}
                                        selectedIndex={Math.max(
                                            0,
                                            CYCLE_TYPE_OPTIONS.findIndex((c) => c.key === cycleType)
                                        )}
                                        onOptionSelected={(e) => {
                                            Haptics.selectionAsync();
                                            const chosen = CYCLE_TYPE_OPTIONS[e.nativeEvent.index];
                                            if (chosen) setCycleType(chosen.key);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                </Section>

                                {cycleType === 'monthly' && (
                                    <Section title="Custom Recurring Cycle Days">
                                        <Picker
                                            label="Cycle Start Day"
                                            options={DAY_OPTIONS}
                                            selectedIndex={Math.min(30, Math.max(0, startDay - 1))}
                                            onOptionSelected={(e) => {
                                                Haptics.selectionAsync();
                                                setStartDay(e.nativeEvent.index + 1);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                        />
                                        <Picker
                                            label="Cycle End Day"
                                            options={DAY_OPTIONS}
                                            selectedIndex={Math.min(30, Math.max(0, endDay - 1))}
                                            onOptionSelected={(e) => {
                                                Haptics.selectionAsync();
                                                setEndDay(e.nativeEvent.index + 1);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                        />
                                    </Section>
                                )}

                                {(cycleType === 'weekly' || cycleType === 'biweekly') && (
                                    <Section title={cycleType === 'weekly' ? 'Weekly Cut-off Range' : 'Bi-weekly Cut-off Range'}>
                                        <Picker
                                            label="Start Weekday"
                                            options={WEEKDAY_OPTIONS}
                                            selectedIndex={Math.max(
                                                0,
                                                WEEKDAY_OPTIONS.findIndex((w) => w === startWeekday)
                                            )}
                                            onOptionSelected={(e) => {
                                                Haptics.selectionAsync();
                                                const w = WEEKDAY_OPTIONS[e.nativeEvent.index];
                                                if (w) setStartWeekday(w);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                        />
                                        <Picker
                                            label="End Weekday"
                                            options={WEEKDAY_OPTIONS}
                                            selectedIndex={Math.max(
                                                0,
                                                WEEKDAY_OPTIONS.findIndex((w) => w === endWeekday)
                                            )}
                                            onOptionSelected={(e) => {
                                                Haptics.selectionAsync();
                                                const w = WEEKDAY_OPTIONS[e.nativeEvent.index];
                                                if (w) setEndWeekday(w);
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                        />
                                    </Section>
                                )}

                                {cycleType === 'semimonthly' && (
                                    <Section title="Semi-monthly Schedule">
                                        <HStack modifiers={[padding({ vertical: 4 })]}>
                                            <SwiftUIText size={14} color={textColor}>
                                                Period 1: 1st to 15th
                                            </SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 4 })]}>
                                            <SwiftUIText size={14} color={textColor}>
                                                Period 2: 16th to End of Month
                                            </SwiftUIText>
                                        </HStack>
                                    </Section>
                                )}

                                <Section title="Cycle Preview">
                                    <HStack modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            {cyclePreviewText}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>
                            </>
                        )}

                        {/* 2. TIMEZONE STANDARD TARGET */}
                        {target === 'timezone' && (
                            <>
                                <Section title="Search Timezone">
                                    <TextField
                                        placeholder="Search city, country, or code (e.g. WIB)..."
                                        defaultValue={tzSearchQuery}
                                        onChangeText={setTzSearchQuery}
                                    />
                                </Section>

                                <Section title="Select Standard Timezone">
                                    <Picker
                                        label="Timezone"
                                        options={filteredTimezones.map((t) => t.label)}
                                        selectedIndex={Math.max(
                                            0,
                                            filteredTimezones.findIndex(
                                                (t) => t.key.toLowerCase() === timezone.toLowerCase()
                                            )
                                        )}
                                        onOptionSelected={(e) => {
                                            Haptics.selectionAsync();
                                            const chosen = filteredTimezones[e.nativeEvent.index];
                                            if (chosen) setTimezone(chosen.key);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                </Section>

                                <Section title="Timezone Reference">
                                    <HStack modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            {`All attendance timestamps, geofence validations, and cut-off triggers will synchronize to ${
                                                TIMEZONE_OPTIONS.find((t) => t.key === timezone)?.label || timezone
                                            }.`}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>
                            </>
                        )}

                        {/* 3. CALCULATION MODE TARGET */}
                        {target === 'calculation_mode' && (
                            <>
                                <Section title="Calculation Frequency">
                                    <Picker
                                        label="Calculation Mode"
                                        options={CALCULATION_MODES.map((m) => m.title)}
                                        selectedIndex={CALCULATION_MODES.findIndex((m) => m.mode === calcMode)}
                                        onOptionSelected={(e) => {
                                            Haptics.selectionAsync();
                                            const chosen = CALCULATION_MODES[e.nativeEvent.index];
                                            if (chosen) setCalcMode(chosen.mode);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                </Section>

                                <Section title="Mode Explanation">
                                    <HStack modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            {CALCULATION_MODES.find((m) => m.mode === calcMode)?.description(
                                                startDay,
                                                endDay
                                            ) || ''}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Footer Actions */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background('clear'),
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
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    Save Settings
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
