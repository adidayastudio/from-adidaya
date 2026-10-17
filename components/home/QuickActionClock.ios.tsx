import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { 
    Host,
    HStack, 
    VStack, 
    Spacer, 
    Button,
    Text as SwiftUIText,
    GlassEffectContainer,
    Circle,
    Image
} from '@expo/ui/swift-ui';
import { padding, frame, background, cornerRadius, tint, glassEffect, buttonStyle, shadow, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { parseIsoDate } from '@/lib/work-hours-utils';

interface QuickActionClockProps {
    isClockedIn: boolean;
    clockInTime?: Date | string | null;
    locationCode?: string;
    onToggle: () => void;
}

export function QuickActionClock({ isClockedIn, clockInTime, locationCode, onToggle }: QuickActionClockProps) {
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

    return (
        <View style={{ width: '100%', maxWidth: 480, height: 72, alignSelf: 'center' }}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ maxWidth: 480, height: 72 }),
                    cornerRadius(36)
                ]}>
                <HStack alignment="center" spacing={16} modifiers={[
                    padding({ top: 12, bottom: 12, leading: 20, trailing: 20 }),
                    glassEffect({ shape: 'capsule' })
                ]}>
                    {/* Left side: Status dot + Timer info */}
                    <HStack alignment="center" spacing={10}>
                        <Circle modifiers={[
                            frame({ width: 8, height: 8 }),
                            foregroundStyle(isClockedIn ? '#34C759' : '#8E8E93'),
                            shadow({ radius: isClockedIn ? 4 : 0, color: '#34C759' })
                        ]} />
                        
                        <VStack alignment="leading" spacing={2}>
                            <HStack alignment="center" spacing={8}>
                                <SwiftUIText weight="bold" size={24} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                    {formatElapsed(elapsed)}
                                </SwiftUIText>
                                
                                {isClockedIn && locationCode && (
                                    <HStack alignment="center" spacing={4} modifiers={[
                                        padding({ horizontal: 6, vertical: 2 }),
                                        background(isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                                        cornerRadius(8)
                                    ]}>
                                        <Image systemName="location.fill" size={8} color={isDark ? '#A1A1A6' : '#8E8E93'} />
                                        <SwiftUIText size={9} weight="bold" color={isDark ? '#A1A1A6' : '#8E8E93'}>
                                            {locationCode}
                                        </SwiftUIText>
                                    </HStack>
                                )}
                            </HStack>
                            
                            {/* Times row */}
                            <HStack alignment="center" spacing={6}>
                                <HStack alignment="center" spacing={3}>
                                    <Image systemName="arrow.up.forward" size={9} color={isDark ? '#A1A1A6' : '#8E8E93'} />
                                    <SwiftUIText size={11} weight="semibold" color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                        {startedAt}
                                    </SwiftUIText>
                                </HStack>
                                
                                <SwiftUIText size={10} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}>|</SwiftUIText>
                                
                                <HStack alignment="center" spacing={3}>
                                    <Image systemName="arrow.down.forward" size={9} color={isDark ? '#A1A1A6' : '#8E8E93'} />
                                    <SwiftUIText size={11} weight="semibold" color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                        {targetAt}
                                    </SwiftUIText>
                                </HStack>
                            </HStack>
                        </VStack>
                    </HStack>
                    
                    <Spacer />
                    
                    {/* Action Button */}
                    <Button
                        onPress={handleToggle}
                        color={isClockedIn ? '#FF3B30' : Colors[resolvedTheme].tint}
                        modifiers={[
                            buttonStyle('glassProminent'),
                            frame({ minWidth: 100, height: 38 })
                        ]}
                    >
                        {isClockedIn ? "Clock Out" : "Clock In"}
                    </Button>
                </HStack>
                </GlassEffectContainer>
            </Host>
        </View>
    );
}
