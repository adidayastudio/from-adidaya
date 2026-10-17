import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { GlassView } from './GlassView';
import { PillButton } from './PillButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const toLocalYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface LiquidDatePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: string, time?: string) => void;
    currentDate?: string;
    currentTime?: string;
    title?: string;
}

export function LiquidDatePicker({
    visible,
    onClose,
    onSelect,
    currentDate = toLocalYYYYMMDD(new Date()),
    currentTime = '',
    title = "Select Date & Time"
}: LiquidDatePickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const parseSafeDate = (d?: string) => {
        if (!d || typeof d !== 'string') return new Date();
        const parts = d.split('T')[0].split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
                const dateObj = new Date(y, m, day);
                if (!isNaN(dateObj.getTime())) return dateObj;
            }
        }
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    // Parse current date
    const [viewDate, setViewDate] = useState<Date>(() => parseSafeDate(currentDate));
    const [selectedDate, setSelectedDate] = useState(() => {
        const safe = parseSafeDate(currentDate);
        return toLocalYYYYMMDD(safe);
    });

    React.useEffect(() => {
        if (visible) {
            const safe = parseSafeDate(currentDate);
            setViewDate(safe);
            setSelectedDate(toLocalYYYYMMDD(safe));
        }
    }, [visible, currentDate]);

    // Time State (24-hour, HH:mm)
    const parseInitialTime = (t?: string) => {
        if (!t) return { h: '14', m: '00' };
        const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!match) return { h: '14', m: '00' };
        let h = parseInt(match[1], 10);
        const period = match[3]?.toUpperCase();
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return { h: String(Math.min(h, 23)).padStart(2, '0'), m: match[2] };
    };
    const initialTime = parseInitialTime(currentTime);

    const [timeH, setTimeH] = useState(initialTime.h);
    const [timeM, setTimeM] = useState(initialTime.m);

    const fullTime = `${timeH}:${timeM}`;

    // Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const days = [];
        // Pad for start day (Sunday = 0)
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [viewDate]);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (date: Date) => {
        const dateString = toLocalYYYYMMDD(date);
        setSelectedDate(dateString);
    };

    const confirmSelection = () => {
        onSelect(selectedDate, fullTime);
        onClose();
    };

    const incrementTime = (type: 'h' | 'm') => {
        if (type === 'h') {
            const h = parseInt(timeH);
            const next = h >= 23 ? 0 : h + 1;
            setTimeH(next.toString().padStart(2, '0'));
        } else {
            const m = parseInt(timeM);
            const next = m >= 55 ? 0 : m + 5;
            setTimeM(next.toString().padStart(2, '0'));
        }
    };

    const decrementTime = (type: 'h' | 'm') => {
        if (type === 'h') {
            const h = parseInt(timeH);
            const next = h <= 0 ? 23 : h - 1;
            setTimeH(next.toString().padStart(2, '0'));
        } else {
            const m = parseInt(timeM);
            const next = m <= 0 ? 55 : m - 5;
            setTimeM(next.toString().padStart(2, '0'));
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.container}
                >
                    <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 18 }}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={17} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={handlePrevMonth} style={[styles.navButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                <Ionicons name="chevron-back" size={16} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.monthYear, { color: textColor }]}>
                                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </Text>
                            <TouchableOpacity onPress={handleNextMonth} style={[styles.navButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                <Ionicons name="chevron-forward" size={16} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekDaysRow}>
                            {weekDays.map(day => (
                                <Text key={day} style={[styles.weekDayText, { color: subtextColor }]}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {calendarDays.map((date, index) => {
                                if (date === null) return <View key={`empty-${index}`} style={styles.dayCell} />;

                                const isSelected = toLocalYYYYMMDD(date) === selectedDate;
                                const isToday = toLocalYYYYMMDD(date) === toLocalYYYYMMDD(new Date());

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.selectedDayCell
                                        ]}
                                        onPress={() => handleDateSelect(date)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            { color: isSelected ? '#FFFFFF' : textColor },
                                            isToday && !isSelected && { color: '#007AFF', fontWeight: 'bold' }
                                        ]}>
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.timeSection}>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                            <View style={styles.timeRow}>
                                <Text style={[styles.timeLabel, { color: textColor }]}>Time</Text>
                                <View style={styles.timeControls}>
                                    {/* Hours */}
                                    <View style={styles.timePart}>
                                        <TouchableOpacity onPress={() => incrementTime('h')} style={styles.timeNav}>
                                            <Ionicons name="chevron-up" size={13} color={textColor} />
                                        </TouchableOpacity>
                                        <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                            <Text style={[styles.timeValue, { color: textColor }]}>{timeH}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => decrementTime('h')} style={styles.timeNav}>
                                            <Ionicons name="chevron-down" size={13} color={textColor} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={{ color: subtextColor, fontWeight: '700', marginTop: 2 }}>:</Text>

                                    {/* Minutes */}
                                    <View style={styles.timePart}>
                                        <TouchableOpacity onPress={() => incrementTime('m')} style={styles.timeNav}>
                                            <Ionicons name="chevron-up" size={13} color={textColor} />
                                        </TouchableOpacity>
                                        <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                            <Text style={[styles.timeValue, { color: textColor }]}>{timeM}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => decrementTime('m')} style={styles.timeNav}>
                                            <Ionicons name="chevron-down" size={13} color={textColor} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={confirmSelection}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 16.5,
        fontWeight: '700',
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    monthYear: {
        fontSize: 14.5,
        fontWeight: '600',
    },
    navButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    weekDayText: {
        width: '14.28%',
        textAlign: 'center',
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: '14.28%',
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        marginVertical: 1,
    },
    selectedDayCell: {
        backgroundColor: '#007AFF',
    },
    dayText: {
        fontSize: 13.5,
        fontWeight: '500',
    },
    timeSection: {
        marginTop: 12,
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    timeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timePart: {
        alignItems: 'center',
        gap: 2,
    },
    timeNav: {
        width: 20,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePill: {
        width: 38,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeValue: {
        fontSize: 14.5,
        fontWeight: '700',
    },
    periodPill: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 2,
    },
    periodText: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    footer: {
        marginTop: 16,
    },
    confirmBtn: {
        width: '100%',
        height: 42,
        borderRadius: 21,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '700',
    },
});
