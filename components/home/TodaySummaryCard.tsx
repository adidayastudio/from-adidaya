import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LiquidCard } from '../ui/LiquidCard';

interface StatItem {
    label: string;
    value: number;
    icon: string;
    color: string;
}

const MOCK_STATS: StatItem[] = [
    { label: 'Tasks Due', value: 5, icon: 'checkmark.circle', color: '#34C759' },
    { label: 'Actions', value: 3, icon: 'bolt.circle', color: '#007AFF' },
    { label: 'Overdue', value: 1, icon: 'exclamationmark.triangle', color: '#FF3B30' },
];

const TOTAL_TASKS = 12;
const COMPLETED_TASKS = 7;

export function TodaySummaryCard() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const progress = COMPLETED_TASKS / TOTAL_TASKS;

    return (
        <View style={styles.wrapper}>
            <LiquidCard
                variant="tinted"
                tintColor={isDark ? '#007AFF' : '#007AFF'}
                style={styles.card}
                contentStyle={styles.cardContent}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.titleRow}>
                        <PlatformIcon
                            name="chart.bar.fill"
                            size={16}
                            tintColor={isDark ? '#64B5F6' : '#007AFF'}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.title, { color: Colors[resolvedTheme].text }]}>
                            Today's Summary
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => router.push('/tasks')}
                        hitSlop={8}
                    >
                        <PlatformIcon
                            name="arrow.right.circle.fill"
                            size={22}
                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}
                        />
                    </Pressable>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {MOCK_STATS.map((stat, index) => (
                        <View key={stat.label} style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: stat.color + '1A' }]}>
                                <PlatformIcon
                                    name={stat.icon as any}
                                    size={18}
                                    tintColor={stat.color}
                                />
                            </View>
                            <Text style={[styles.statValue, { color: Colors[resolvedTheme].text }]}>
                                {stat.value}
                            </Text>
                            <Text style={[styles.statLabel, { color: Colors[resolvedTheme].icon }]}>
                                {stat.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={[styles.progressLabel, { color: Colors[resolvedTheme].icon }]}>
                            Daily Progress
                        </Text>
                        <Text style={[styles.progressValue, { color: Colors[resolvedTheme].text }]}>
                            {COMPLETED_TASKS}/{TOTAL_TASKS}
                        </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progress * 100}%`,
                                    backgroundColor: progress >= 0.8 ? '#34C759' : '#007AFF',
                                },
                            ]}
                        />
                    </View>
                </View>
            </LiquidCard>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    card: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
    },
    cardContent: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    progressSection: {
        marginTop: 4,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    progressValue: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
