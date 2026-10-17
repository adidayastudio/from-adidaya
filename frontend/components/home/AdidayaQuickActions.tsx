import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useUserContext } from '@/context/UserProvider';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface AdidayaQuickActionsProps {
    onClockPress: () => void;
}

export function AdidayaQuickActions({ onClockPress }: AdidayaQuickActionsProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    const { attendanceStatus, todaySessions } = useUserContext();
    const isClockedIn = attendanceStatus === 'checked-in';
    
    // Formatting clock-in time for subtext
    let clockSubtext = 'Not Checked In';
    if (isClockedIn) {
        const firstSession = todaySessions[0];
        if (firstSession && firstSession.clockIn) {
            try {
                const date = new Date(firstSession.clockIn);
                clockSubtext = `Active since ${date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })}`;
            } catch (e) {}
        } else {
            clockSubtext = 'Checked In';
        }
    }

    const actions = [
        {
            id: 'clock',
            title: isClockedIn ? 'Clock Out' : 'Clock In',
            subtext: clockSubtext,
            icon: isClockedIn ? 'clock.fill' : 'clock',
            iconColor: isClockedIn ? '#30D158' : '#E53935',
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClockPress();
            }
        },
        {
            id: 'finance',
            title: 'Finance',
            subtext: 'Claims & Purchases',
            icon: 'creditcard.fill',
            iconColor: '#5BA4E5',
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/home/finance');
            }
        },
        {
            id: 'approvals',
            title: 'Approvals',
            subtext: '2 PENDING',
            subtextColor: '#E53935',
            icon: 'checkmark.seal.fill',
            iconColor: '#E53935',
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/tasks');
            }
        },
        {
            id: 'attendance',
            title: 'Attendance',
            subtext: '18/25 Checked In',
            icon: 'person.3.fill',
            iconColor: '#30D158',
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/home/clock-module');
            }
        }
    ];

    return (
        <View style={styles.wrapper}>
            <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.4)' : '#6e6e73' }]}>
                QUICK ACTIONS
            </Text>

            <View style={styles.grid}>
                {actions.map(action => (
                    <Pressable
                        key={action.id}
                        onPress={action.onPress}
                        style={({ pressed }) => [
                            styles.tile,
                            { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' },
                            pressed && styles.tilePressed
                        ]}
                    >
                        <View style={styles.tileHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                                <PlatformIcon 
                                    name={action.icon as any} 
                                    size={20} 
                                    tintColor={action.iconColor} 
                                />
                            </View>
                            {action.id === 'clock' && isClockedIn && (
                                <View style={styles.activeDot} />
                            )}
                        </View>
                        <Text style={[styles.tileTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                            {action.title}
                        </Text>
                        <Text 
                            style={[
                                styles.tileSubtext, 
                                { color: action.subtextColor || (isDark ? 'rgba(255,255,255,0.45)' : '#6e6e73') }
                            ]}
                        >
                            {action.subtext}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    tile: {
        width: '48%',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        minHeight: 110,
        justifyContent: 'space-between',
    },
    tilePressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    tileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#30D158',
    },
    tileTitle: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.2,
        marginBottom: 2,
    },
    tileSubtext: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    }
});
