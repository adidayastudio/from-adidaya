import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { MultiProgressRing } from '@/components/ui/MultiProgressRing';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useRef, useState } from 'react';
import {  Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View , Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TODAY_DAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Generate mock week data for any weekOffset (0 = current, -1 = last, etc.)
function getWeekData(weekOffset: number) {
    const rng = (base: number) => {
        const v = base + weekOffset * 11;
        return Math.max(0, Math.min(100, v));
    };
    return [
        { tasks: rng(80), presence: rng(85), pulse: rng(60) },
        { tasks: rng(40), presence: rng(90), pulse: rng(70) },
        { tasks: rng(95), presence: rng(75), pulse: rng(55) },
        { tasks: rng(75), presence: rng(80), pulse: rng(40) },
        { tasks: weekOffset < 0 ? rng(50) : 0, presence: weekOffset < 0 ? rng(60) : 0, pulse: weekOffset < 0 ? rng(35) : 0 },
        { tasks: weekOffset < 0 ? rng(20) : 0, presence: weekOffset < 0 ? rng(40) : 0, pulse: weekOffset < 0 ? rng(10) : 0 },
        { tasks: 0, presence: 0, pulse: 0 },
    ];
}

const HOURLY_DATA = {
    tasks: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 5, 4, 0, 6, 7, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    presence: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    pulse: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 1, 0, 2, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0],
};



function BarChart({ data, color }: { data: number[], color: string }) {
    const max = Math.max(...data, 1);
    return (
        <View style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', height: 52, alignItems: 'flex-end', gap: 2 }}>
                {data.map((val, i) => (
                    <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                        <View style={{ height: `${(val / max) * 100}%`, backgroundColor: val > 0 ? color : 'transparent', borderRadius: 20, minHeight: val > 0 ? 4 : 0 }} />
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {['00', '06', '12', '18', '24'].map(h => <Text key={h} style={{ fontSize: 10, color: '#8E8E93', fontWeight: '500' }}>{h}</Text>)}
            </View>
        </View>
    );
}

// Weeks available: 8 past weeks + current
const TOTAL_WEEKS = 8;
const INITIAL_WEEK_IDX = TOTAL_WEEKS - 1; // start at current week (last item)

export default function ActivityDetailScreen() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const insets = useSafeAreaInsets();

    const [selectedDay, setSelectedDay] = useState(TODAY_DAY_INDEX);
    const [weekIdx, setWeekIdx] = useState(INITIAL_WEEK_IDX);
    const flatListRef = useRef<FlatList>(null);

    // weekIdx 0 = 8 weeks ago, INITIAL_WEEK_IDX = current week
    const weekOffset = weekIdx - INITIAL_WEEK_IDX; // always <= 0
    const weekData = getWeekData(weekOffset);
    const maxDayIndex = weekOffset === 0 ? TODAY_DAY_INDEX : 6;

    const dayData = weekData[selectedDay];
    const rings = [
        { progress: dayData.tasks, color: isDark ? '#007AFF' : '#32ADE6' },
        { progress: dayData.presence, color: '#30D158' },
        { progress: dayData.pulse, color: '#FF9F0A' },
    ];

    // Compute selected date for header (timezone-safe using milliseconds)
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const mondayOfSelectedWeek = new Date(today.getTime() - (todayDayIndex - weekOffset * 7) * 24 * 60 * 60 * 1000);
    const selectedDate = new Date(mondayOfSelectedWeek.getTime() + selectedDay * 24 * 60 * 60 * 1000);
    const headerTitle = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

    const ringMeta = [
        { label: 'Tasks', key: 'tasks', color: isDark ? '#007AFF' : '#32ADE6', icon: 'scope', value: dayData.tasks, total: '24 TASKS TODAY', unit: 'completed today' },
        { label: 'Presence', key: 'presence', color: '#30D158', icon: 'person.fill.checkmark', value: dayData.presence, total: '7.5H LOGGED', unit: 'attendance rate' },
        { label: 'Pulse', key: 'pulse', color: '#FF9F0A', icon: 'waveform.path.ecg', value: dayData.pulse, total: '6 ACTIONS HANDLED', unit: 'responsiveness' },
    ];

    const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i);

    const handleWeekScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const newIdx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
        if (newIdx !== weekIdx) {
            setWeekIdx(newIdx);
            const newOffset = newIdx - INITIAL_WEEK_IDX;
            const newMax = newOffset === 0 ? TODAY_DAY_INDEX : 6;
            setSelectedDay(Math.min(selectedDay, newMax));
        }
    };

    const WeekStrip = ({ wOffset }: { wOffset: number }) => {
        const wData = getWeekData(wOffset);
        const wMaxDay = wOffset === 0 ? TODAY_DAY_INDEX : 6;

        return (
            <View style={styles.weekStrip}>
                {WEEK_DAYS.map((day, i) => {
                    const d = wData[i];
                    const isSelected = i === selectedDay && wOffset === weekOffset;
                    const isFuture = i > wMaxDay;
                    const isToday = wOffset === 0 && i === TODAY_DAY_INDEX;

                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => !isFuture && setSelectedDay(i)}
                            style={styles.dayCell}
                            activeOpacity={isFuture ? 1 : 0.7}
                        >
                            {/* Full circle for selected */}
                            <View style={[styles.dayLabelCircle, isSelected && {
                                backgroundColor: isDark ? '#FFFFFF' : '#1C1C1E',
                            }]}>
                                <Text style={[styles.dayLabel, {
                                    color: isSelected
                                        ? (isDark ? '#000000' : '#FFFFFF')
                                        : isFuture
                                            ? (isDark ? '#4A4A4E' : '#C7C7CC')
                                            : textColor,
                                    fontWeight: isSelected || isToday ? '800' : '500',
                                }]}>
                                    {day}
                                </Text>
                                {/* Today dot — only if not selected */}
                                {isToday && !isSelected && (
                                    <View style={[styles.todayDot, { backgroundColor: isDark ? '#007AFF' : '#32ADE6' }]} />
                                )}
                            </View>

                            <View style={{ opacity: isFuture ? 0.15 : 1 }}>
                                <MultiProgressRing
                                    rings={[
                                        { progress: d.tasks, color: isDark ? '#007AFF' : '#32ADE6' },
                                        { progress: d.presence, color: '#30D158' },
                                        { progress: d.pulse, color: '#FF9F0A' },
                                    ]}
                                    size={40}
                                    strokeWidth={4}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen options={{
                title: headerTitle,
                headerLargeTitle: false,
                headerTransparent: Platform.OS === 'ios',
                headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                headerTintColor: textColor,
                headerBackTitle: '',
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedDay(TODAY_DAY_INDEX);
                            setWeekIdx(INITIAL_WEEK_IDX);
                            flatListRef.current?.scrollToIndex({ index: INITIAL_WEEK_IDX, animated: true });
                        }}
                        style={{
                            opacity: weekIdx === INITIAL_WEEK_IDX && selectedDay === TODAY_DAY_INDEX ? 0.3 : 1,
                            paddingHorizontal: 4,
                            paddingVertical: 4,
                        }}
                    >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>Today</Text>
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingTop: Platform.OS === 'ios' ? insets.top + 56 : 0, paddingBottom: insets.bottom + 130 }]}
            >
                {/* ── Swipeable Week Strip ── */}
                <FlatList
                    ref={flatListRef}
                    data={weeks}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={INITIAL_WEEK_IDX}
                    getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                    onMomentumScrollEnd={handleWeekScroll}
                    keyExtractor={(item) => item.toString()}
                    scrollEventThrottle={16}
                    renderItem={({ item }) => (
                        <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
                            <WeekStrip wOffset={item - INITIAL_WEEK_IDX} />
                        </View>
                    )}
                    style={{ marginHorizontal: -20 }}
                />

                {/* ── Big Ring ── */}
                <View style={styles.bigRingContainer}>
                    <MultiProgressRing rings={rings} size={220} />
                </View>

                {/* ── Per Stat Breakdown ── */}
                {ringMeta.map((meta) => (
                    <GlassView
                        key={meta.key}
                        intensity={40}
                        style={[
                            styles.statSection,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.75)',
                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                borderWidth: 1,
                            }
                        ]}
                    >
                        {/* Header: icon + label (left) — total (right) */}
                        <View style={styles.statHeader}>
                            <View style={styles.statLabelRow}>
                                <PlatformIcon name={meta.icon as any} size={13} tintColor={meta.color} />
                                <Text style={[styles.statLabel, { color: textColor }]}>{meta.label}</Text>
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color, opacity: 0.7 }}>{meta.total}</Text>
                        </View>

                        {/* Big number + unit on same line */}
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                            <Text style={[styles.statBigNumber, { color: meta.color }]}>
                                {meta.value}
                                <Text style={{ fontSize: 20, fontWeight: '400', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>/100%</Text>
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#8E8E93' : '#6E6E73', marginBottom: 2 }}>
                                {meta.unit}
                            </Text>
                        </View>

                        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', marginTop: 10, marginBottom: 10 }} />
                        <BarChart data={HOURLY_DATA[meta.key as keyof typeof HOURLY_DATA]} color={meta.color} />
                    </GlassView>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    weekStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    dayCell: {
        alignItems: 'center',
        gap: 6,
    },
    dayLabelCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 11,
        letterSpacing: 0.2,
    },
    todayDot: {
        position: 'absolute',
        bottom: -5,
        width: 4,
        height: 4,
        borderRadius: 2,
    },

    bigRingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },

    statSection: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statBigNumber: {
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: 46,
    },
});
