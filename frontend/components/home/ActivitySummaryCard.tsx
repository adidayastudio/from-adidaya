import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MultiProgressRing } from '../ui/MultiProgressRing';
import { useEffect, useState } from 'react';
import { useUserContext } from '@/context/UserProvider';
import { getCurrentVibe } from '@/lib/api/vibe';
import { fetchAttendanceRecords } from '@/lib/api/attendance';
import { TASKS } from '@/constants/MockData';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActivitySummaryCard() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();

    const { user, profile, attendanceStatus, todaySessions } = useUserContext();

    const [tasksProgress, setTasksProgress] = useState(75);
    const [presenceRate, setPresenceRate] = useState(88);
    const [pulseScore, setPulseScore] = useState(40);
    const [briefText, setBriefText] = useState('Loading your briefing...');

    const showRings = false; // Toggle flag to hide rings for now (set to true to show them back)

    // Load data from DB / Mock fallbacks
    useEffect(() => {
        const loadMetrics = async () => {
            if (!user?.id) return;
            
            let vibeFetched = false;
            let finalTasksProgress = 75;
            let finalPresenceRate = 88;
            let finalPulseScore = 40;

            // 1. Try fetching current vibe metrics (includes tasks, attendance, pulse)
            try {
                const vibe = await getCurrentVibe(user.id);
                if (vibe && vibe.metrics) {
                    vibeFetched = true;
                    if (vibe.metrics.tasksTotal > 0) {
                        finalTasksProgress = Math.round((vibe.metrics.tasksCompleted / vibe.metrics.tasksTotal) * 100);
                    }
                    if (vibe.metrics.attendanceRate > 0) {
                        finalPresenceRate = Math.round(vibe.metrics.attendanceRate);
                    }
                    if (vibe.metrics.pulseScore > 0) {
                        finalPulseScore = Math.round(vibe.metrics.pulseScore);
                    }
                }
            } catch (err) {
                console.error('Error loading user vibe metrics in brief card:', err);
            }

            // 2. Fallback / supplementary calculations for tasks from MockData
            if (!vibeFetched) {
                try {
                    const userName = profile?.full_name || 'Manu Travo';
                    const userTasks = TASKS.filter(t => 
                        t.assignees?.some(a => a.name === userName || a.id === user.id)
                    );
                    if (userTasks.length > 0) {
                        const completed = userTasks.filter(t => t.status === 'done').length;
                        finalTasksProgress = Math.round((completed / userTasks.length) * 100);
                    }
                } catch (err) {
                    console.error('Error mapping user tasks progress:', err);
                }
            }

            // 3. Fallback / supplementary calculations for presence rate from attendance records (past 30 days)
            if (!vibeFetched) {
                try {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    const startStr = start.toISOString().split('T')[0];
                    const endStr = end.toISOString().split('T')[0];

                    const records = await fetchAttendanceRecords(user.id, startStr, endStr);
                    if (records && records.length > 0) {
                        const presentCount = records.filter(r => 
                            ['ontime', 'intime', 'late'].includes(r.status) || r.clockIn
                        ).length;

                        let workingDays = 0;
                        let tempDate = new Date(start);
                        while (tempDate <= end) {
                            const day = tempDate.getDay();
                            if (day !== 0 && day !== 6) {
                                workingDays++;
                            }
                            tempDate.setDate(tempDate.getDate() + 1);
                        }

                        if (workingDays > 0) {
                            const calculatedRate = Math.min(100, Math.round((presentCount / workingDays) * 100));
                            if (calculatedRate > 0) {
                                finalPresenceRate = calculatedRate;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error mapping user attendance records:', err);
                }
            }

            setTasksProgress(finalTasksProgress);
            setPresenceRate(finalPresenceRate);
            setPulseScore(finalPulseScore);
        };

        loadMetrics();
    }, [user?.id, profile?.full_name]);

    // Build the dynamic Samsung Galaxy "Now Brief" narrative text
    useEffect(() => {
        const greetingName = profile?.nickname || profile?.full_name?.split(' ')[0] || 'there';
        
        let statusString = '';
        if (attendanceStatus === 'checked-in') {
            const firstSession = todaySessions[0];
            let clockTimeStr = 'earlier';
            if (firstSession && firstSession.clockIn) {
                try {
                    const date = new Date(firstSession.clockIn);
                    clockTimeStr = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                } catch (e) {}
            }
            statusString = `You clocked in at ${clockTimeStr} and are currently active.`;
        } else {
            statusString = "You haven't clocked in yet today.";
        }

        let tasksString = '';
        if (tasksProgress >= 80) {
            tasksString = `Your task completion is excellent at ${tasksProgress}%.`;
        } else if (tasksProgress >= 50) {
            tasksString = `You have completed ${tasksProgress}% of your tasks, making good progress.`;
        } else {
            tasksString = `Task completion is at ${tasksProgress}%. Try checking off some items today.`;
        }

        let pulseString = '';
        if (pulseScore >= 70) {
            pulseString = 'your workspace pulse is highly responsive.';
        } else if (pulseScore >= 40) {
            pulseString = 'your workspace pulse is steady.';
        } else {
            pulseString = 'try responding to notifications to boost your pulse score.';
        }

        const brief = `Hi ${greetingName}. ${statusString} ${tasksString} With a monthly attendance rate of ${presenceRate}%, ${pulseString}`;
        setBriefText(brief);

    }, [attendanceStatus, todaySessions, tasksProgress, presenceRate, pulseScore, profile?.nickname, profile?.full_name]);

    const ringData = [
        { label: 'Tasks', progress: tasksProgress, color: isDark ? '#007AFF' : '#32ADE6', icon: 'scope' },
        { label: 'Presence', progress: presenceRate, color: '#30D158', icon: 'person.fill.checkmark' },
        { label: 'Pulse', progress: pulseScore, color: '#FF9F0A', icon: 'waveform.path.ecg' },
    ];

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.98, {
            damping: 15,
            stiffness: 300,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 250,
        });
    };

    return (
        <View style={styles.wrapper}>
            <AnimatedPressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                    router.push('/home/activity');
                }}
                style={[styles.cardContainer, !isDark && styles.lightShadow, animatedStyle]}
            >
                <LinearGradient
                    colors={isDark ? ['#1C1C1E', '#121214'] : ['#FAFAFA', '#F0F0F5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientCard, { borderColor: isDark ? 'rgba(150,150,150,0.1)' : 'rgba(0,0,0,0.08)' }]}
                >
                    <View style={[styles.container, !showRings && { flexDirection: 'column', alignItems: 'stretch' }]}>
                        {/* Now Brief Style Layout */}
                        <View style={styles.briefContent}>
                            <View style={styles.briefHeader}>
                                <PlatformIcon name="sparkles" size={13} tintColor={isDark ? '#64B5F6' : '#007AFF'} />
                                <Text style={[styles.briefTag, { color: isDark ? '#64B5F6' : '#007AFF' }]}>NOW BRIEF</Text>
                                <Text style={[styles.briefTime, { color: Colors[resolvedTheme].icon }]}>
                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                            </View>

                            <Text style={[styles.briefText, { color: Colors[resolvedTheme].text }]} numberOfLines={4}>
                                {briefText}
                            </Text>

                            {/* Horizontal capsules for stats */}
                            <View style={styles.capsulesRow}>
                                {ringData.map((item, index) => (
                                    <View key={index} style={[styles.capsule, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <View style={[styles.miniIconCircle, { backgroundColor: item.color + '15' }]}>
                                            <PlatformIcon
                                                name={item.icon as any}
                                                size={10}
                                                tintColor={item.color}
                                            />
                                        </View>
                                        <View style={styles.capsuleTextContainer}>
                                            <Text style={[styles.capsuleLabel, { color: Colors[resolvedTheme].icon }]}>{item.label}</Text>
                                            <Text style={[styles.capsuleValue, { color: Colors[resolvedTheme].text }]}>{item.progress}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Right Side: Rings (Hidden for now, can be toggled via showRings flag) */}
                        {showRings && (
                            <View style={styles.ringsContainer}>
                                <MultiProgressRing
                                    rings={ringData.map(r => ({ progress: r.progress, color: r.color }))}
                                />
                            </View>
                        )}
                    </View>

                    {/* Footer Insight Integrated Smoothly */}
                    <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={styles.insightPill}>
                            <PlatformIcon name="sparkles" size={12} tintColor="#64B5F6" />
                        </View>
                        <Text style={[styles.footerText, { color: Colors[resolvedTheme].icon }]}>
                            You are <Text style={[styles.highlightText, { color: Colors[resolvedTheme].text }]}>15% more productive</Text> than last week
                        </Text>
                    </View>
                </LinearGradient>
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    cardContainer: {
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 0,
    },
    lightShadow: {
        shadowOpacity: 0.08,
        shadowColor: '#000',
    },
    gradientCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.1)',
    },
    container: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    briefContent: {
        flex: 1,
    },
    briefHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10,
    },
    briefTag: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    briefTime: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 'auto',
        opacity: 0.8,
    },
    briefText: {
        fontSize: 13.5,
        lineHeight: 19,
        fontWeight: '600',
        marginBottom: 16,
        letterSpacing: -0.1,
    },
    capsulesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    capsule: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 12,
        flex: 1,
        minWidth: 80,
        gap: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(150,150,150,0.08)',
    },
    miniIconCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    capsuleTextContainer: {
        flexDirection: 'column',
    },
    capsuleLabel: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    capsuleValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 1,
    },
    ringsContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        paddingHorizontal: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(150,150,150,0.03)',
        gap: 10,
    },
    insightPill: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(100, 181, 246, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    highlightText: {
        fontWeight: '700',
    },
});
