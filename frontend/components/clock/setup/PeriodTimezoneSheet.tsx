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
import * as Haptics from 'expo-haptics';
import {
    AttendancePeriodConfig,
    AttendancePeriodMode,
    PayrollCycleType,
    WeekdayName,
} from '@/lib/api/clockSetup';

export type PeriodSettingTarget = 'cutoff' | 'timezone' | 'calculation_mode';

export interface PeriodTimezoneSheetProps {
    visible?: boolean;
    isOpened?: boolean;
    isOpen?: boolean;
    onClose: () => void;
    target?: PeriodSettingTarget;
    config?: AttendancePeriodConfig;
    onSave?: (data: any) => void;
    [key: string]: any;
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
    { key: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (GMT+8 • MYT)', short: 'MYT' },
    { key: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9 • JST)', short: 'JST' },
    { key: 'Australia/Perth', label: 'Australia/Perth (GMT+8 • AWST)', short: 'AWST' },
    { key: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10/11 • AEST)', short: 'AEST' },
    { key: 'Europe/London', label: 'Europe/London (GMT+0/1 • BST)', short: 'BST' },
    { key: 'America/New_York', label: 'America/New_York (GMT-5/4 • EST)', short: 'EST' },
    { key: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8/7 • PST)', short: 'PST' },
    { key: 'UTC', label: 'UTC (Coordinated Universal Time)', short: 'UTC' },
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

export const PeriodTimezoneSheet: React.FC<PeriodTimezoneSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./PeriodTimezoneSheet.ios').PeriodTimezoneSheet;
        return <Comp {...props} />;
    }

    const {
        visible,
        isOpened,
        isOpen,
        onClose,
        target = 'cutoff',
        config = {
            cutoffDayStart: 21,
            cutoffDayEnd: 20,
            timezone: 'Asia/Jakarta',
            calculationMode: 'cutoff',
            cycleType: 'monthly',
            startWeekday: 'Monday',
            endWeekday: 'Sunday',
        },
        onSave,
    } = props;

    const isShown = visible || isOpened || isOpen || false;

    const { resolvedTheme } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && screenWidth >= 768;

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const accentColor = '#0EA5E9'; // Clock Cyan Blue

    // Slide transition for right floating panel
    const slideOffset = isDesktop ? 520 : 600;
    const slideProgress = useSharedValue(slideOffset);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (isShown) {
            slideProgress.value = withTiming(0, {
                duration: 250,
                easing: Easing.out(Easing.cubic),
            });
            backdropOpacity.value = withTiming(1, { duration: 200 });
        } else {
            slideProgress.value = slideOffset;
            backdropOpacity.value = 0;
        }
    }, [isShown, isDesktop, slideOffset]);

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
        if (isShown) {
            setCycleType(config.cycleType || 'monthly');
            setStartDay(config.cutoffDayStart || 21);
            setEndDay(config.cutoffDayEnd || 20);
            setStartWeekday(config.startWeekday || 'Monday');
            setEndWeekday(config.endWeekday || 'Sunday');
            setTimezone(config.timezone || 'Asia/Jakarta');
            setCalcMode(config.calculationMode || 'cutoff');
            setTzSearchQuery('');
        }
    }, [isShown, config]);

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
            return 3;
        }
        if (cycleType === 'semimonthly') return 4;
        if (cycleType === 'weekly') {
            if (startWeekday === 'Monday' && endWeekday === 'Sunday') return 5;
            return 6;
        }
        if (cycleType === 'biweekly') return 7;
        return 3;
    }, [cycleType, startDay, endDay, startWeekday, endWeekday]);

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated: AttendancePeriodConfig = {
            ...config,
            cutoffDayStart: startDay,
            cutoffDayEnd: endDay,
            timezone,
            calculationMode: calcMode,
            cycleType,
            startWeekday,
            endWeekday,
        };
        onSave?.(updated);
        handleClose();
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

    if (!isShown) return null;

    return (
        <Modal
            visible={isShown}
            transparent
            animationType="none"
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
                        animatedDrawerStyle,
                        {
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={s.headerRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={[s.titleText, { color: textColor }]}>
                                {sheetTitle}
                            </Text>
                            <Text style={[s.subtitleText, { color: subtextColor }]}>
                                {target === 'cutoff'
                                    ? 'Configure your payroll recurring calculation cycle'
                                    : target === 'timezone'
                                    ? 'Select timestamp and reporting timezone standard'
                                    : 'Choose attendance aggregation interval'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={s.closeButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <PlatformIcon name="xmark.circle.fill" size={22} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollContent}
                        style={{ flex: 1 }}
                    >
                        {/* 1. PAYROLL CUT-OFF TARGET */}
                        {target === 'cutoff' && (
                            <View style={s.sectionGap}>
                                {/* Presets */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Quick Preset Cycles</Text>
                                    <View style={s.pillWrapRow}>
                                        {PRESET_OPTIONS.map((preset, idx) => {
                                            const isSel = presetSelectedIndex === idx;
                                            return (
                                                <TouchableOpacity
                                                    key={preset}
                                                    activeOpacity={0.7}
                                                    onPress={() => handleApplyPreset(idx)}
                                                    style={[
                                                        s.pillOption,
                                                        {
                                                            backgroundColor: isSel ? accentColor : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.pillText,
                                                            {
                                                                color: isSel ? '#FFFFFF' : textColor,
                                                                fontWeight: isSel ? '700' : '500',
                                                            },
                                                        ]}
                                                    >
                                                        {preset}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Frequency Selector */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Frequency</Text>
                                    <View style={s.pillWrapRow}>
                                        {CYCLE_TYPE_OPTIONS.map((c) => {
                                            const isSel = cycleType === c.key;
                                            return (
                                                <TouchableOpacity
                                                    key={c.key}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setCycleType(c.key);
                                                    }}
                                                    style={[
                                                        s.pillOption,
                                                        {
                                                            backgroundColor: isSel ? accentColor : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.pillText,
                                                            {
                                                                color: isSel ? '#FFFFFF' : textColor,
                                                                fontWeight: isSel ? '700' : '500',
                                                            },
                                                        ]}
                                                    >
                                                        {c.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Day Selection for Monthly */}
                                {cycleType === 'monthly' && (
                                    <View style={s.twoColRow}>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Cycle Start Day</Text>
                                            <TextInput
                                                style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                keyboardType="numeric"
                                                value={String(startDay)}
                                                onChangeText={(txt) => {
                                                    const val = parseInt(txt, 10);
                                                    if (!isNaN(val) && val >= 1 && val <= 31) {
                                                        setStartDay(val);
                                                    } else if (txt === '') {
                                                        setStartDay(1);
                                                    }
                                                }}
                                                placeholder="1"
                                                placeholderTextColor={subtextColor}
                                            />
                                            <Text style={[s.helperText, { color: subtextColor }]}>
                                                Every {startDay}{getDayOrdinal(startDay)}
                                            </Text>
                                        </View>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Cycle End Day</Text>
                                            <TextInput
                                                style={[s.textInput, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                keyboardType="numeric"
                                                value={String(endDay)}
                                                onChangeText={(txt) => {
                                                    const val = parseInt(txt, 10);
                                                    if (!isNaN(val) && val >= 1 && val <= 31) {
                                                        setEndDay(val);
                                                    } else if (txt === '') {
                                                        setEndDay(31);
                                                    }
                                                }}
                                                placeholder="31"
                                                placeholderTextColor={subtextColor}
                                            />
                                            <Text style={[s.helperText, { color: subtextColor }]}>
                                                Every {endDay}{getDayOrdinal(endDay)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Weekday Selection for Weekly / Bi-weekly */}
                                {(cycleType === 'weekly' || cycleType === 'biweekly') && (
                                    <View style={s.twoColRow}>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Start Weekday</Text>
                                            <View style={s.pillWrapRow}>
                                                {WEEKDAY_OPTIONS.map((w) => {
                                                    const isSel = startWeekday === w;
                                                    return (
                                                        <TouchableOpacity
                                                            key={w}
                                                            activeOpacity={0.7}
                                                            onPress={() => {
                                                                Haptics.selectionAsync();
                                                                setStartWeekday(w);
                                                            }}
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
                                                                    {
                                                                        color: isSel ? '#FFFFFF' : textColor,
                                                                        fontWeight: isSel ? '700' : '500',
                                                                    },
                                                                ]}
                                                            >
                                                                {w.slice(0, 3)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                        <View style={[s.fieldGroup, { flex: 1 }]}>
                                            <Text style={[s.fieldLabel, { color: subtextColor }]}>End Weekday</Text>
                                            <View style={s.pillWrapRow}>
                                                {WEEKDAY_OPTIONS.map((w) => {
                                                    const isSel = endWeekday === w;
                                                    return (
                                                        <TouchableOpacity
                                                            key={w}
                                                            activeOpacity={0.7}
                                                            onPress={() => {
                                                                Haptics.selectionAsync();
                                                                setEndWeekday(w);
                                                            }}
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
                                                                    {
                                                                        color: isSel ? '#FFFFFF' : textColor,
                                                                        fontWeight: isSel ? '700' : '500',
                                                                    },
                                                                ]}
                                                            >
                                                                {w.slice(0, 3)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Preview Card */}
                                <View
                                    style={[
                                        s.previewCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                            borderColor: cardBorder,
                                        },
                                    ]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <PlatformIcon name="calendar" size={14} tintColor={accentColor} />
                                        <Text style={[s.previewTitle, { color: textColor }]}>Cycle Preview</Text>
                                    </View>
                                    <Text style={[s.previewBody, { color: subtextColor }]}>
                                        {cyclePreviewText}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* 2. TIMEZONE STANDARD TARGET */}
                        {target === 'timezone' && (
                            <View style={s.sectionGap}>
                                {/* Search input */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Search Timezone</Text>
                                    <View style={[s.searchBar, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                        <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                                        <TextInput
                                            style={[s.searchInput, { color: textColor }]}
                                            placeholder="Search city, region, or GMT offset..."
                                            placeholderTextColor={subtextColor}
                                            value={tzSearchQuery}
                                            onChangeText={setTzSearchQuery}
                                        />
                                    </View>
                                </View>

                                {/* Timezone list */}
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Standard Timezones</Text>
                                    <View style={s.tzListContainer}>
                                        {filteredTimezones.map((tz) => {
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
                                                        s.tzItem,
                                                        {
                                                            backgroundColor: isSel
                                                                ? isDark
                                                                    ? 'rgba(14, 165, 233, 0.15)'
                                                                    : 'rgba(14, 165, 233, 0.08)'
                                                                : 'transparent',
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={[
                                                                s.tzItemTitle,
                                                                {
                                                                    color: isSel ? accentColor : textColor,
                                                                    fontWeight: isSel ? '700' : '500',
                                                                },
                                                            ]}
                                                        >
                                                            {tz.label}
                                                        </Text>
                                                        <Text style={[s.tzItemKey, { color: subtextColor }]}>
                                                            {tz.key}
                                                        </Text>
                                                    </View>
                                                    {isSel && (
                                                        <PlatformIcon
                                                            name="checkmark.circle.fill"
                                                            size={18}
                                                            tintColor={accentColor}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <Text style={[s.footerNote, { color: subtextColor }]}>
                                    All mobile clock-ins, geofence radius checks, and report schedules will synchronize to{' '}
                                    <Text style={{ fontWeight: '600', color: textColor }}>
                                        {TIMEZONE_OPTIONS.find((t) => t.key === timezone)?.label || timezone}
                                    </Text>
                                    .
                                </Text>
                            </View>
                        )}

                        {/* 3. CALCULATION MODE TARGET */}
                        {target === 'calculation_mode' && (
                            <View style={s.sectionGap}>
                                <View style={s.fieldGroup}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>Aggregation Mode</Text>
                                    <View style={{ gap: 10 }}>
                                        {CALCULATION_MODES.map((item) => {
                                            const isSel = calcMode === item.mode;
                                            return (
                                                <TouchableOpacity
                                                    key={item.mode}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setCalcMode(item.mode);
                                                    }}
                                                    style={[
                                                        s.calcModeCard,
                                                        {
                                                            backgroundColor: isSel
                                                                ? isDark
                                                                    ? 'rgba(14, 165, 233, 0.12)'
                                                                    : 'rgba(14, 165, 233, 0.06)'
                                                                : inputBg,
                                                            borderColor: isSel ? accentColor : cardBorder,
                                                        },
                                                    ]}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Text
                                                            style={[
                                                                s.calcModeTitle,
                                                                {
                                                                    color: isSel ? accentColor : textColor,
                                                                    fontWeight: isSel ? '700' : '600',
                                                                },
                                                            ]}
                                                        >
                                                            {item.title}
                                                        </Text>
                                                        {isSel && (
                                                            <PlatformIcon
                                                                name="checkmark.circle.fill"
                                                                size={18}
                                                                tintColor={accentColor}
                                                            />
                                                        )}
                                                    </View>
                                                    <Text style={[s.calcModeDesc, { color: subtextColor }]}>
                                                        {item.description(startDay, endDay)}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Actions: Cancel & Save Settings */}
                    <View style={s.actionRow}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleClose}
                            style={[
                                s.cancelBtn,
                                {
                                    borderColor: cardBorder,
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                },
                            ]}
                        >
                            <Text style={[s.cancelBtnText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleSave}
                            style={[s.saveBtn, { backgroundColor: accentColor }]}
                        >
                            <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />
                            <Text style={s.saveBtnText}>Save Settings</Text>
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
        padding: 24,
        gap: 16,
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
    },
    dialogCardDesktop: {
        width: 500,
        maxWidth: '90%',
        height: '100%',
        borderRadius: 20,
    },
    dialogCardMobile: {
        width: '100%',
        maxWidth: 540,
        maxHeight: '88%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    titleText: {
        fontSize: 19,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        paddingVertical: 6,
        paddingBottom: 16,
    },
    sectionGap: {
        gap: 14,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 12,
    },
    pillWrapRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pillOption: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 9,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 12,
    },
    dayPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    dayPillText: {
        fontSize: 12,
    },
    textInput: {
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    helperText: {
        fontSize: 12,
        marginTop: 2,
    },
    previewCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    previewTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    previewBody: {
        fontSize: 12,
        lineHeight: 17,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        height: '100%',
    },
    tzListContainer: {
        gap: 6,
    },
    tzItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    tzItemTitle: {
        fontSize: 13,
    },
    tzItemKey: {
        fontSize: 11,
        marginTop: 1,
    },
    footerNote: {
        fontSize: 12,
        lineHeight: 16,
    },
    calcModeCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    calcModeTitle: {
        fontSize: 14,
    },
    calcModeDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    saveBtn: {
        flex: 1.2,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 999,
        boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default PeriodTimezoneSheet;
