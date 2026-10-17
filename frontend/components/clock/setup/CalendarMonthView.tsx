import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { MonthYearWheelPicker } from '@/components/clock/setup/MonthYearWheelPicker';
import {
    CalendarEventItem,
    getCalendarCategoryColor,
} from '@/lib/data/calendarEvents';

interface CalendarMonthViewProps {
    events: CalendarEventItem[];
    selectedDate: string | null; // YYYY-MM-DD
    onSelectDate: (dateStr: string | null) => void;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    tenantBrandColor?: string | null;
    viewYear?: number;
    viewMonth?: number; // 0-11
    onMonthChange?: (year: number, month: number) => void;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarMonthView({
    events,
    selectedDate,
    onSelectDate,
    isDark,
    textColor,
    subtextColor,
    tenantBrandColor,
    viewYear: controlledYear,
    viewMonth: controlledMonth,
    onMonthChange,
}: CalendarMonthViewProps) {
    const [internalYear, setInternalYear] = useState(() => new Date().getFullYear());
    const [internalMonth, setInternalMonth] = useState(() => new Date().getMonth());

    const [isWheelPickerVisible, setIsWheelPickerVisible] = useState(false);

    const activeYear = controlledYear !== undefined ? controlledYear : internalYear;
    const activeMonth = controlledMonth !== undefined ? controlledMonth : internalMonth;

    const setMonthAndYear = (year: number, month: number) => {
        if (onMonthChange) {
            onMonthChange(year, month);
        } else {
            setInternalYear(year);
            setInternalMonth(month);
        }
    };

    // Map events by date (YYYY-MM-DD -> list of all event colors on that date)
    const eventDotsMap = useMemo(() => {
        const map = new Map<string, string[]>();
        events.forEach((ev) => {
            const dateKey = ev.date;
            const color = ev.color || getCalendarCategoryColor(ev.type, tenantBrandColor);
            const currentColors = map.get(dateKey) || [];
            currentColors.push(color);
            map.set(dateKey, currentColors);
        });
        return map;
    }, [events, tenantBrandColor]);

    const handlePrevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeMonth === 0) {
            setMonthAndYear(activeYear - 1, 11);
        } else {
            setMonthAndYear(activeYear, activeMonth - 1);
        }
    };

    const handleNextMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeMonth === 11) {
            setMonthAndYear(activeYear + 1, 0);
        } else {
            setMonthAndYear(activeYear, activeMonth + 1);
        }
    };

    const handleJumpToday = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const now = new Date();
        setMonthAndYear(now.getFullYear(), now.getMonth());
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        onSelectDate(todayStr);
    };

    const handleOpenMonthPicker = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsWheelPickerVisible(true);
    };

    // Build calendar grid days
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(activeYear, activeMonth, 1);
        const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();

        // 0 = Sunday, 1 = Monday ... 6 = Saturday
        // We want Monday = 0, Sunday = 6
        let firstDayIndex = firstDayOfMonth.getDay() - 1;
        if (firstDayIndex < 0) firstDayIndex = 6;

        const days: Array<{
            dayNum: number;
            dateStr: string;
            isCurrentMonth: boolean;
            isToday: boolean;
            isSelected: boolean;
            dots: string[];
        }> = [];

        // Previous month days
        const prevMonthDays = new Date(activeYear, activeMonth, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const prevMonth = activeMonth === 0 ? 11 : activeMonth - 1;
            const prevYear = activeMonth === 0 ? activeYear - 1 : activeYear;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            days.push({
                dayNum,
                dateStr,
                isCurrentMonth: false,
                isToday: false,
                isSelected: false,
                dots: [],
            });
        }

        // Current month days
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dots = eventDotsMap.get(dateStr) || [];
            days.push({
                dayNum,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                isSelected: selectedDate === dateStr,
                dots,
            });
        }

        // Next month trailing days to complete grid (multiples of 7)
        const totalSlots = Math.ceil(days.length / 7) * 7;
        const nextMonthPadding = totalSlots - days.length;
        for (let i = 1; i <= nextMonthPadding; i++) {
            const nextMonth = activeMonth === 11 ? 0 : activeMonth + 1;
            const nextYear = activeMonth === 11 ? activeYear + 1 : activeYear;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                dayNum: i,
                dateStr,
                isCurrentMonth: false,
                isToday: false,
                isSelected: false,
                dots: [],
            });
        }

        return days;
    }, [activeYear, activeMonth, selectedDate, eventDotsMap]);

    return (
        <GlassView
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.75)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
            ]}
        >
            {/* Header: <  Month Year ▾   Today  > */}
            <View style={styles.headerRow}>
                <View style={styles.leftNavGroup}>
                    <BouncyGlassButton
                        isGlass
                        isDark={isDark}
                        onPress={handlePrevMonth}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                        }}
                    >
                        <PlatformIcon name="chevron.left" size={13} tintColor={textColor} />
                    </BouncyGlassButton>

                    <TouchableOpacity
                        onPress={handleOpenMonthPicker}
                        activeOpacity={0.7}
                        style={styles.monthPickerBtn}
                    >
                        <Text style={[styles.monthTitle, { color: textColor }]}>
                            {MONTH_NAMES[activeMonth]} {activeYear}
                        </Text>
                        <PlatformIcon name="chevron.down" size={11} tintColor={subtextColor} style={{ marginTop: 2 }} />
                    </TouchableOpacity>
                </View>

                <View style={styles.rightNavGroup}>
                    <BouncyGlassButton
                        isPill
                        isGlass
                        isDark={isDark}
                        textColor={textColor}
                        onPress={handleJumpToday}
                        style={{
                            height: 30,
                            borderRadius: 15,
                            paddingHorizontal: 12,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                        }}
                    >
                        <Text style={[styles.todayBtnText, { color: textColor }]}>Today</Text>
                    </BouncyGlassButton>

                    <BouncyGlassButton
                        isGlass
                        isDark={isDark}
                        onPress={handleNextMonth}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                        }}
                    >
                        <PlatformIcon name="chevron.right" size={13} tintColor={textColor} />
                    </BouncyGlassButton>
                </View>
            </View>

            {/* Days of Week Row (Clean Titlecase, not capslock, Sun softer gray, Sat normal) */}
            <View style={styles.daysHeaderRow}>
                {DAYS_HEADER.map((day, idx) => {
                    const isSunday = idx === 6;
                    return (
                        <View key={day} style={styles.dayHeaderCell}>
                            <Text
                                style={[
                                    styles.dayHeaderText,
                                    {
                                        color: subtextColor,
                                        opacity: isSunday ? 0.55 : 0.85,
                                    },
                                ]}
                            >
                                {day}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Calendar Grid */}
            <View style={styles.grid}>
                {calendarDays.map((item, idx) => {
                    if (!item.isCurrentMonth) {
                        return (
                            <View key={`pad-${idx}`} style={styles.dayCell}>
                                <Text
                                    style={[
                                        styles.dayNumberText,
                                        {
                                            color: isDark
                                                ? 'rgba(255,255,255,0.18)'
                                                : 'rgba(0,0,0,0.18)',
                                        },
                                    ]}
                                >
                                    {item.dayNum}
                                </Text>
                            </View>
                        );
                    }

                    // Clean Selection Logic:
                    // If selected: Solid Neutral Black (light) / White (dark)
                    // If today & not selected: Solid Blue #007AFF
                    // Otherwise: Transparent
                    const isSelected = item.isSelected;
                    const isToday = item.isToday;

                    const circleBg = isSelected
                        ? (isDark ? '#FFFFFF' : '#1C1C1E')
                        : isToday
                        ? '#007AFF'
                        : 'transparent';

                    const circleTextColor = isSelected
                        ? (isDark ? '#000000' : '#FFFFFF')
                        : isToday
                        ? '#FFFFFF'
                        : textColor;

                    return (
                        <TouchableOpacity
                            key={item.dateStr}
                            activeOpacity={0.65}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (item.isSelected) {
                                    onSelectDate(null); // toggle off
                                } else {
                                    onSelectDate(item.dateStr);
                                }
                            }}
                            style={styles.dayCell}
                        >
                            <View
                                style={[
                                    styles.dayNumberCircle,
                                    {
                                        backgroundColor: circleBg,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dayNumberText,
                                        {
                                            color: circleTextColor,
                                            fontWeight: isSelected || isToday ? '700' : '400',
                                        },
                                    ]}
                                >
                                    {item.dayNum}
                                </Text>
                            </View>

                            {/* Event Dots (Up to 3 dots side by side) */}
                            <View style={styles.dotsRow}>
                                {item.dots.slice(0, 3).map((dotColor, dIdx) => (
                                    <View
                                        key={dIdx}
                                        style={[
                                            styles.dot,
                                            {
                                                backgroundColor: dotColor,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* iOS Dual-Wheel Month & Year Roller Sheet */}
            <MonthYearWheelPicker
                visible={isWheelPickerVisible}
                onClose={() => setIsWheelPickerVisible(false)}
                onConfirm={(year, month) => {
                    setMonthAndYear(year, month);
                }}
                initialYear={activeYear}
                initialMonth={activeMonth}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
            />
        </GlassView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    leftNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rightNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    monthPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    todayBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    daysHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(120, 120, 128, 0.15)',
        marginBottom: 6,
    },
    dayHeaderCell: {
        flex: 1,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
    },
    dayNumberCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNumberText: {
        fontSize: 13,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        height: 5,
        marginTop: 1,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});
