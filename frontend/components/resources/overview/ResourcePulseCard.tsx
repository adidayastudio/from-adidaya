import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

export type ResourcePulsePeriodType = 'this_month' | '3_months' | '1_year' | 'all_time';

export interface ResourcePulseCardProps {
    readyCount?: number;
    attentionCount?: number;
    criticalCount?: number;
    totalCount?: number;
    monthLabel?: string;
    selectedPeriod?: ResourcePulsePeriodType;
    onPeriodChange?: (period: ResourcePulsePeriodType) => void;
    onPress?: () => void;
}

export function ResourcePulseCard({
    readyCount = 14,
    attentionCount = 4,
    criticalCount = 3,
    totalCount,
    monthLabel = 'Sep',
    selectedPeriod: externalPeriod,
    onPeriodChange,
    onPress,
}: ResourcePulseCardProps) {
    const total = totalCount ?? (readyCount + attentionCount + criticalCount);

    // Calculate pulse percentage score: Ready = 100, Attention = 50, Critical = 0
    const pulseScore = useMemo(() => {
        if (total === 0) return 100;
        const score = Math.round((readyCount * 100 + attentionCount * 50 + criticalCount * 0) / total);
        return Math.min(100, Math.max(0, score));
    }, [readyCount, attentionCount, criticalCount, total]);

    // Healthy resources count (ready + normal)
    const healthyCount = readyCount + Math.floor(attentionCount / 2); // e.g., 14 + 2 = 16

    // Status label & badge styling
    const statusConfig = useMemo(() => {
        if (pulseScore >= 80) {
            return {
                label: 'Good control',
                dotColor: '#4ADE80',
            };
        } else if (pulseScore >= 60) {
            return {
                label: 'Attention needed',
                dotColor: '#FDE047',
            };
        } else {
            return {
                label: 'Critical attention',
                dotColor: '#F87171',
            };
        }
    }, [pulseScore]);

    // Period selector state
    const [currentPeriod, setCurrentPeriod] = useState<ResourcePulsePeriodType>(externalPeriod || 'this_month');
    const activePeriod = externalPeriod || currentPeriod;

    const shortMonth = useMemo(() => {
        return monthLabel.split(' ')[0] || 'Sep';
    }, [monthLabel]);

    const periodOptions: { id: ResourcePulsePeriodType; menuLabel: string; shortLabel: string }[] = useMemo(() => [
        { id: 'this_month', menuLabel: 'This Month', shortLabel: shortMonth },
        { id: '3_months', menuLabel: '3 Months', shortLabel: '3M' },
        { id: '1_year', menuLabel: '1 Year', shortLabel: '1Y' },
        { id: 'all_time', menuLabel: 'All Time', shortLabel: 'All' },
    ], [shortMonth]);

    const currentPeriodTitle = periodOptions.find(p => p.id === activePeriod)?.shortLabel || shortMonth;

    const contextMenuActions: ContextMenuAction[] = useMemo(() => {
        return periodOptions.map(p => ({
            title: p.menuLabel,
            state: p.id === activePeriod ? 'on' : 'off',
        }));
    }, [periodOptions, activePeriod]);

    // Bouncy scale for period dropdown
    const pillScale = useSharedValue(1);
    const animatedPillStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pillScale.value }],
    }));

    const handlePillPressIn = () => {
        'worklet';
        pillScale.value = withSpring(0.92, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    const handlePillPressOut = () => {
        'worklet';
        pillScale.value = withSpring(1, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    const handlePeriodSelect = (index: number) => {
        const selected = periodOptions[index];
        if (selected) {
            if (Platform.OS === 'ios') {
                Haptics.selectionAsync();
            }
            setCurrentPeriod(selected.id);
            onPeriodChange?.(selected.id);
        }
    };

    // Width ratios for the segmented bar
    const readyFlex = Math.max(0.01, readyCount);
    const attentionFlex = Math.max(0.01, attentionCount);
    const criticalFlex = Math.max(0.01, criticalCount);

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.cardContainer,
                pressed && styles.cardPressed,
            ]}
        >
            {/* Rich Warm Terracotta/Amber Gradient matching Dashboard Grid */}
            <LinearGradient
                colors={['#E58338', '#D97A32', '#C56824']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Header: Resource Pulse Title & Period Selector */}
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Resource Pulse</Text>

                {/* Dropdown Period Pill */}
                <ContextMenu
                    actions={contextMenuActions}
                    dropdownMenuMode={true}
                    onPress={(event) => handlePeriodSelect(event.nativeEvent.index)}
                >
                    <Animated.View style={animatedPillStyle}>
                        <Pressable
                            onPressIn={handlePillPressIn}
                            onPressOut={handlePillPressOut}
                            style={styles.periodDropdownPill}
                        >
                            <Text style={styles.periodText}>
                                {currentPeriodTitle}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor="rgba(255, 255, 255, 0.85)" style={{ marginLeft: 4 }} />
                        </Pressable>
                    </Animated.View>
                </ContextMenu>
            </View>

            {/* Main Score & Subtitle */}
            <View style={styles.metricSection}>
                <Text style={styles.scoreText}>{pulseScore}%</Text>
                <Text style={styles.subtitleText}>
                    {healthyCount} of {total} resources healthy
                </Text>
            </View>

            {/* Horizontal Distribution Bar */}
            <View style={styles.distributionBar}>
                {readyCount > 0 && (
                    <View style={[styles.barSegment, { flex: readyFlex, backgroundColor: '#FDF6E9' }]} />
                )}
                {attentionCount > 0 && (
                    <View style={[styles.barSegment, { flex: attentionFlex, backgroundColor: '#ECA050' }]} />
                )}
                {criticalCount > 0 && (
                    <View style={[styles.barSegment, { flex: criticalFlex, backgroundColor: '#D9532F' }]} />
                )}
            </View>

            {/* Legend Row */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FDF6E9' }]} />
                    <Text style={styles.legendLabel}>Ready</Text>
                    <Text style={styles.legendValue}>{readyCount}</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ECA050' }]} />
                    <Text style={styles.legendLabel}>Attention</Text>
                    <Text style={styles.legendValue}>{attentionCount}</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#D9532F' }]} />
                    <Text style={styles.legendLabel}>Critical</Text>
                    <Text style={styles.legendValue}>{criticalCount}</Text>
                </View>
            </View>

            {/* Status Pill Badge */}
            <View style={styles.bottomRow}>
                <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
                    <Text style={styles.statusText}>{statusConfig.label}</Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        height: 260,
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#D97A32',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 18,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    cardPressed: {
        opacity: 0.96,
        transform: [{ scale: 0.995 }],
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '80%',
        height: 180,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    periodDropdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    periodText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    metricSection: {
        marginBottom: 14,
    },
    scoreText: {
        fontSize: 46,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.2,
        lineHeight: 52,
    },
    subtitleText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
    },
    distributionBar: {
        height: 18,
        borderRadius: 9,
        flexDirection: 'row',
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.12)',
        marginBottom: 12,
    },
    barSegment: {
        height: '100%',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
        marginBottom: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 12.5,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.85)',
    },
    legendValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        marginLeft: 2,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
        paddingHorizontal: 12,
        paddingVertical: 5.5,
        borderRadius: 14,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.1,
    },
});
