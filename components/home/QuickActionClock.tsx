import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import { PillButton } from '@/components/ui/PillButton';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, Pressable } from 'react-native';
import { parseIsoDate } from '@/lib/work-hours-utils';

interface QuickActionClockProps {
    isClockedIn: boolean;
    clockInTime?: Date | string | null;
    locationCode?: string;
    onToggle: () => void;
    variant?: 'floating' | 'card';
}

export function QuickActionClock({ isClockedIn, clockInTime, locationCode, onToggle, variant = 'floating' }: QuickActionClockProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const parsedClockIn = useMemo(() => parseIsoDate(clockInTime), [clockInTime]);
    const clockInTimestamp = parsedClockIn ? parsedClockIn.getTime() : null;

    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: any;
        if (isClockedIn && clockInTimestamp) {
            const calculateElapsed = () => {
                const diffMs = Date.now() - clockInTimestamp;
                return Math.max(0, Math.floor(diffMs / 1000));
            };

            setElapsed(calculateElapsed());

            interval = setInterval(() => {
                setElapsed(calculateElapsed());
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [isClockedIn, clockInTimestamp]);

    const formatElapsed = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatTimeSimple = (date: Date) => {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}.${m}`;
    };

    const getTargetTime = (start: Date) => {
        const target = new Date(start.getTime());
        const day = start.getDay();
        if (day === 6) target.setHours(target.getHours() + 5);
        else target.setHours(target.getHours() + 8);
        return target;
    };

    const handleToggle = () => {
        Haptics.impactAsync(isClockedIn ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
        onToggle();
    };

    const startedAt = parsedClockIn ? formatTimeSimple(parsedClockIn) : '--.--';
    const targetAt = parsedClockIn ? formatTimeSimple(getTargetTime(parsedClockIn)) : '--.--';

    const isAndroid = Platform.OS === 'android';
    const isWeb = Platform.OS === 'web';

    const innerContent = (
        <>
            <View style={styles.leftContent}>
                <View style={[
                    styles.statusDot,
                    {
                        backgroundColor: isClockedIn ? '#34C759' : isDark ? '#48484A' : '#C7C7CC',
                        shadowColor: isClockedIn ? '#34C759' : 'transparent',
                        shadowOpacity: isClockedIn ? 0.5 : 0,
                    }
                ]} />

                <View style={styles.textBlock}>
                    {/* Top Row: Timer + Location Tag (conditional) */}
                    <View style={styles.topRow}>
                        <Text style={[styles.mainTimer, { color: Colors[resolvedTheme].text }, variant === 'card' && { fontSize: 22 }]}> 
                            {formatElapsed(elapsed)}
                        </Text>

                        {isClockedIn && locationCode && (
                            <View style={styles.locationTag}>
                                <PlatformIcon name="location.fill" size={10} tintColor={Colors[resolvedTheme].icon} />
                                <Text style={[styles.locationCode, { color: Colors[resolvedTheme].icon }]}>
                                    {locationCode}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom Row: Start & Target */}
                    <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                            {isWeb || isAndroid ? (
                                <Text style={[styles.inOutLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>IN</Text>
                            ) : (
                                <PlatformIcon name="arrow.up.forward" size={10} tintColor={Colors[resolvedTheme].text} />
                            )}
                            <Text style={[styles.timeLabel, { color: Colors[resolvedTheme].text }]}>
                                <Text style={styles.timeValue}>{startedAt}</Text>
                            </Text>
                        </View>

                        <View style={[styles.separator, { backgroundColor: Colors[resolvedTheme].icon + '30' }]} />

                        <View style={styles.timeItem}>
                            {isWeb || isAndroid ? (
                                <Text style={[styles.inOutLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>OUT</Text>
                            ) : (
                                <PlatformIcon name="arrow.down.forward" size={10} tintColor={Colors[resolvedTheme].text} />
                            )}
                            <Text style={[styles.timeLabel, { color: Colors[resolvedTheme].text }]}>
                                <Text style={styles.timeValue}>{targetAt}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {isWeb ? (
                <Pressable
                    onPress={handleToggle}
                    style={[
                        styles.actionButton,
                        styles.webActionButton,
                        { backgroundColor: isClockedIn ? '#FF3B30' : '#0036F8' }
                    ]}
                >
                    <Text style={styles.webActionText}>
                        {isClockedIn ? "Clock Out" : "Clock In"}
                    </Text>
                </Pressable>
            ) : (
                <PillButton
                    label={isClockedIn ? "Clock Out" : "Clock In"}
                    onPress={handleToggle}
                    color={isClockedIn ? "red" : "blue"}
                    variant="tinted"
                    style={styles.actionButton}
                />
            )}
        </>
    );

    if (variant === 'card') {
        return (
            <View style={[styles.glassWrapper, {
                maxWidth: '100%', borderRadius: 20,
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderWidth: isAndroid ? 0 : 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
                <View style={[styles.container, { borderRadius: 20, minHeight: 66, paddingVertical: 10, paddingHorizontal: 15 }]}>
                    {innerContent}
                </View>
            </View>
        );
    }

    return (
        <GlassEffectContainer borderRadius={999} style={styles.glassWrapper}>
            <View style={styles.container}>
                {innerContent}
            </View>
        </GlassEffectContainer>
    );
}

const styles = StyleSheet.create({
    glassWrapper: {
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
        borderRadius: 999,
        overflow: 'hidden',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 18,
        width: '100%',
        borderRadius: 999,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
    },
    textBlock: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mainTimer: {
        fontSize: 24,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.8,
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(142,142,147,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    locationCode: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    timeLabelPrefix: {
        opacity: 0.6,
        fontWeight: '600',
    },
    timeValue: {
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    separator: {
        width: 1,
        height: 10,
    },
    actionButton: {
        minWidth: 100,
    },
    webActionButton: {
        height: 38,
        paddingHorizontal: 20,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
            default: {},
        }),
    },
    webActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    androidContainer: {
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.2)',
    },
    inOutLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
