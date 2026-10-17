import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    PanResponder,
    LayoutChangeEvent,
    Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import Svg, { Rect, Line, G } from 'react-native-svg';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

export type FinancePeriodType = 'this_month' | '3_months' | '1_year' | 'all_time';

interface DailyFinanceItem {
    day: number;
    paid: number;
    outstanding: number;
    reimburse: number;
}

interface FinanceMonthlyStackedOverviewProps {
    monthLabel?: string;
    totalPaid: number;
    paidChangePct?: number;
    lastMonthPaid?: number;
    outstandingAmount: number;
    outstandingCount: number;
    reimburseAmount: number;
    reimburseCount: number;
    dailyData?: DailyFinanceItem[];
    selectedPeriod?: FinancePeriodType;
    onPeriodChange?: (period: FinancePeriodType) => void;
    onSelectSegment?: (segment: 'purchasing' | 'reimbursement' | 'reports') => void;
}

const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return 'Rp0';
    return `Rp${val.toLocaleString('id-ID')}`;
};

const formatCompact = (val: number) => {
    if (isNaN(val) || val === null || val === undefined || val === 0) return '0';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return val.toString();
};

export function FinanceMonthlyStackedOverview({
    monthLabel = 'Sep 2026',
    totalPaid = 50000,
    paidChangePct = -35,
    lastMonthPaid = 77000,
    outstandingAmount = 570508,
    outstandingCount = 1,
    reimburseAmount = 0,
    reimburseCount = 0,
    dailyData: customDailyData,
    selectedPeriod: externalPeriod,
    onPeriodChange,
    onSelectSegment,
}: FinanceMonthlyStackedOverviewProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const baselineTrackColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';

    const [currentPeriod, setCurrentPeriod] = useState<FinancePeriodType>(externalPeriod || 'this_month');
    const activePeriod = externalPeriod || currentPeriod;

    // Short month string (e.g. "Sep" from "Sep 2026")
    const shortMonth = useMemo(() => {
        return monthLabel.split(' ')[0] || 'Sep';
    }, [monthLabel]);

    const periodOptions: { id: FinancePeriodType; title: string }[] = useMemo(() => [
        { id: 'this_month', title: shortMonth },
        { id: '3_months', title: '3M' },
        { id: '1_year', title: '1Y' },
        { id: 'all_time', title: 'All' },
    ], [shortMonth]);

    const currentPeriodTitle = periodOptions.find(p => p.id === activePeriod)?.title || shortMonth;

    const contextMenuActions: ContextMenuAction[] = useMemo(() => {
        return periodOptions.map(p => ({
            title: p.title,
            state: p.id === activePeriod ? 'on' : 'off',
        }));
    }, [periodOptions, activePeriod]);

    const totalVolume = totalPaid + outstandingAmount + reimburseAmount;
    const daysInMonth = 30;

    // Bouncy scale animation for dropdown pill
    const pillScale = useSharedValue(1);

    const animatedPillStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pillScale.value }],
    }));

    const handlePillPressIn = () => {
        'worklet';
        pillScale.value = withSpring(0.92, {
            damping: 14,
            stiffness: 320,
            mass: 0.6,
        });
    };

    const handlePillPressOut = () => {
        'worklet';
        pillScale.value = withSpring(1, {
            damping: 14,
            stiffness: 320,
            mass: 0.6,
        });
    };

    // Dynamic width tracking
    const [cardInnerWidth, setCardInnerWidth] = useState<number>(335);

    const onCardLayout = (e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) {
            setCardInnerWidth(w - 36);
        }
    };

    // 30 Days micro-data matching Apple Fitness bars
    const monthBars = useMemo(() => {
        if (customDailyData && customDailyData.length === daysInMonth) {
            return customDailyData;
        }

        const items: DailyFinanceItem[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
            let p = 0;
            let o = 0;
            let r = 0;

            if (d === 8) {
                p = totalPaid;
            } else if (d === 14) {
                o = Math.round(outstandingAmount * 0.7);
            } else if (d === 20) {
                o = Math.round(outstandingAmount * 0.3);
                r = reimburseAmount;
            }

            items.push({
                day: d,
                paid: p,
                outstanding: o,
                reimburse: r,
            });
        }
        return items;
    }, [totalPaid, outstandingAmount, reimburseAmount, customDailyData]);

    // Initial state: NO selected bar (hidden by default)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Reanimated values for liquid glass tooltip
    const tooltipOpacity = useSharedValue(0);
    const tooltipX = useSharedValue(0);
    const hideTimerRef = useRef<any>(null);

    // Dimensions
    const chartWidth = Math.max(280, cardInnerWidth);
    const chartHeight = 84;
    const stepX = chartWidth / daysInMonth;
    const barWidth = Math.max(3, Math.min(5.5, stepX - 2.2));

    // Scale calculation
    const maxVal = useMemo(() => {
        let max = 0;
        monthBars.forEach(b => {
            const sum = b.paid + b.outstanding + b.reimburse;
            if (sum > max) max = sum;
        });
        return Math.max(max * 1.15, 60000);
    }, [monthBars]);

    const selectedBar = selectedIndex !== null ? monthBars[selectedIndex] : null;

    const showTooltipForIndex = (idx: number) => {
        setSelectedIndex(idx);
        const targetX = idx * stepX + stepX / 2;
        tooltipX.value = withSpring(targetX, { damping: 20, stiffness: 200 });
        tooltipOpacity.value = withTiming(1, { duration: 180 });

        // Auto hide after 2.5 seconds
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
            tooltipOpacity.value = withTiming(0, { duration: 250 });
            setTimeout(() => setSelectedIndex(null), 260);
        }, 2500);
    };

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

    // Pan Responder for interactive scrubbing & tapping
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const touchX = evt.nativeEvent.locationX;
                const idx = Math.min(daysInMonth - 1, Math.max(0, Math.floor(touchX / stepX)));
                showTooltipForIndex(idx);
                if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                }
            },
            onPanResponderMove: (evt) => {
                const touchX = evt.nativeEvent.locationX;
                const idx = Math.min(daysInMonth - 1, Math.max(0, Math.floor(touchX / stepX)));
                if (idx !== selectedIndex) {
                    showTooltipForIndex(idx);
                    if (Platform.OS !== 'web') {
                        Haptics.selectionAsync();
                    }
                }
            },
        })
    ).current;

    const tooltipStyle = useAnimatedStyle(() => {
        const halfWidth = 70;
        const clampedX = Math.max(halfWidth, Math.min(chartWidth - halfWidth, tooltipX.value));
        return {
            opacity: tooltipOpacity.value,
            transform: [{ translateX: clampedX - halfWidth }],
        };
    });

    const arrowStyle = useAnimatedStyle(() => {
        const halfWidth = 70;
        const clampedX = Math.max(halfWidth, Math.min(chartWidth - halfWidth, tooltipX.value));
        const offset = tooltipX.value - clampedX;
        return {
            transform: [{ translateX: offset }],
        };
    });

    const handleSegmentPress = (seg: 'purchasing' | 'reimbursement' | 'reports') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onSelectSegment?.(seg);
    };

    const handlePeriodSelect = (index: number) => {
        const selected = periodOptions[index];
        if (selected) {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setCurrentPeriod(selected.id);
            onPeriodChange?.(selected.id);
        }
    };

    return (
        <View
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            onLayout={onCardLayout}
        >
            {/* Header: Title, Main Value / Total, Borderless Bouncy Dropdown Pill */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.categoryLabel, { color: subtextColor }]}>
                        Spending & Commitments
                    </Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.mainValue, { color: textColor }]}>
                            {formatCurrency(totalPaid)}
                        </Text>
                        <Text style={[styles.subValue, { color: subtextColor }]}>
                            / {formatCurrency(totalVolume)}
                        </Text>
                    </View>
                </View>

                {/* Borderless Bouncy Dropdown Pill */}
                <ContextMenu
                    actions={contextMenuActions}
                    dropdownMenuMode={true}
                    onPress={(event) => handlePeriodSelect(event.nativeEvent.index)}
                >
                    <Animated.View style={animatedPillStyle}>
                        <Pressable
                            onPressIn={handlePillPressIn}
                            onPressOut={handlePillPressOut}
                            style={[
                                styles.periodDropdownPill,
                                {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                }
                            ]}
                        >
                            <Text style={[styles.periodText, { color: textColor }]}>
                                {currentPeriodTitle}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} style={{ marginLeft: 4 }} />
                        </Pressable>
                    </Animated.View>
                </ContextMenu>
            </View>

            {/* Peak Reference indicator & vs last month */}
            <View style={styles.peakRow}>
                <Text style={[styles.peakText, { color: subtextColor }]}>
                    Peak {formatCompact(maxVal)}
                </Text>
                {paidChangePct !== undefined && (
                    <View style={styles.trendRow}>
                        <PlatformIcon
                            name={paidChangePct <= 0 ? "arrow.down" : "arrow.up"}
                            size={10}
                            tintColor={paidChangePct <= 0 ? '#34C759' : '#FF3B30'}
                        />
                        <Text style={[
                            styles.trendText,
                            { color: paidChangePct <= 0 ? '#34C759' : '#FF3B30' }
                        ]}>
                            {paidChangePct > 0 ? `+${paidChangePct}%` : `${paidChangePct}%`} vs last month
                        </Text>
                    </View>
                )}
            </View>

            {/* Chart Area: Apple Fitness 30-Day Thin Vertical Stacked Bars */}
            <View style={styles.chartWrapper} {...panResponder.panHandlers}>
                {/* Liquid Glass Floating Tooltip */}
                {selectedBar && (
                    <Animated.View pointerEvents="none" style={[styles.tooltipContainer, tooltipStyle]}>
                        <GlassView
                            glassEffectStyle={isDark ? 'dark' : 'regular'}
                            style={[
                                styles.liquidGlassCard,
                                {
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                                    backgroundColor: isDark ? 'rgba(30, 30, 32, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                                }
                            ]}
                        >
                            <Text style={[styles.tooltipDate, { color: isDark ? '#A1A1A6' : '#636366' }]}>
                                {selectedBar.day} {monthLabel}
                            </Text>
                            <View style={styles.tooltipMetrics}>
                                {selectedBar.paid > 0 ? (
                                    <Text style={[styles.tooltipItemPaid, { color: '#34C759' }]}>
                                        Paid: {formatCompact(selectedBar.paid)}
                                    </Text>
                                ) : null}
                                {selectedBar.outstanding > 0 ? (
                                    <Text style={[styles.tooltipItemOut, { color: '#FF9500' }]}>
                                        {selectedBar.paid > 0 ? ' • ' : ''}Bills: {formatCompact(selectedBar.outstanding)}
                                    </Text>
                                ) : null}
                                {selectedBar.reimburse > 0 ? (
                                    <Text style={[styles.tooltipItemRem, { color: '#AF52DE' }]}>
                                        {selectedBar.paid > 0 || selectedBar.outstanding > 0 ? ' • ' : ''}Reimburse: {formatCompact(selectedBar.reimburse)}
                                    </Text>
                                ) : null}
                                {selectedBar.paid === 0 && selectedBar.outstanding === 0 && selectedBar.reimburse === 0 ? (
                                    <Text style={[styles.tooltipItemEmpty, { color: subtextColor }]}>
                                        No activity
                                    </Text>
                                ) : null}
                            </View>
                        </GlassView>
                        <Animated.View
                            style={[
                                styles.tooltipArrow,
                                { borderTopColor: isDark ? 'rgba(30, 30, 32, 0.85)' : 'rgba(255, 255, 255, 0.85)' },
                                arrowStyle
                            ]}
                        />
                    </Animated.View>
                )}

                <Svg width={chartWidth} height={chartHeight}>
                    {/* Horizontal Reference Baseline */}
                    <Line
                        x1={0}
                        y1={chartHeight - 4}
                        x2={chartWidth}
                        y2={chartHeight - 4}
                        stroke={gridLineColor}
                        strokeWidth={1}
                    />

                    {/* 30-Day Micro Bars */}
                    {monthBars.map((bar, i) => {
                        const x = i * stepX + (stepX - barWidth) / 2;
                        const paidH = (bar.paid / maxVal) * (chartHeight - 12);
                        const outH = (bar.outstanding / maxVal) * (chartHeight - 12);
                        const remH = (bar.reimburse / maxVal) * (chartHeight - 12);

                        const totalH = paidH + outH + remH;
                        const isSelected = selectedIndex === i;

                        return (
                            <G key={`day-bar-${i}`}>
                                {/* Empty Day Baseline Dot */}
                                {totalH < 3 ? (
                                    <Rect
                                        x={x}
                                        y={chartHeight - 6}
                                        width={barWidth}
                                        height={3}
                                        rx={1.5}
                                        ry={1.5}
                                        fill={isSelected ? (isDark ? '#FFFFFF' : '#000000') : baselineTrackColor}
                                    />
                                ) : (
                                    <>
                                        {/* Realized Paid Base (Neon Green #30D158 / #34C759) */}
                                        {paidH > 0 && (
                                            <Rect
                                                x={x}
                                                y={chartHeight - 4 - paidH}
                                                width={barWidth}
                                                height={paidH}
                                                rx={outH === 0 && remH === 0 ? barWidth / 2 : 0}
                                                ry={outH === 0 && remH === 0 ? barWidth / 2 : 0}
                                                fill={isSelected ? '#30D158' : '#34C759'}
                                                opacity={selectedIndex !== null && !isSelected ? 0.35 : 1}
                                            />
                                        )}

                                        {/* Outstanding Bills Stack (Neon Orange #FF9500 / #FF9F0A) */}
                                        {outH > 0 && (
                                            <Rect
                                                x={x}
                                                y={chartHeight - 4 - paidH - outH}
                                                width={barWidth}
                                                height={outH}
                                                rx={remH === 0 ? barWidth / 2 : 0}
                                                ry={remH === 0 ? barWidth / 2 : 0}
                                                fill={isSelected ? '#FF9F0A' : '#FF9500'}
                                                opacity={selectedIndex !== null && !isSelected ? 0.35 : 1}
                                            />
                                        )}

                                        {/* Reimbursements Stack (Purple #AF52DE) */}
                                        {remH > 0 && (
                                            <Rect
                                                x={x}
                                                y={chartHeight - 4 - paidH - outH - remH}
                                                width={barWidth}
                                                height={remH}
                                                rx={barWidth / 2}
                                                ry={barWidth / 2}
                                                fill="#AF52DE"
                                                opacity={selectedIndex !== null && !isSelected ? 0.35 : 1}
                                            />
                                        )}
                                    </>
                                )}

                                {/* Selected Cursor Dotted Guide Line */}
                                {isSelected && (
                                    <Line
                                        x1={x + barWidth / 2}
                                        y1={0}
                                        x2={x + barWidth / 2}
                                        y2={chartHeight - 4}
                                        stroke={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.25)'}
                                        strokeWidth={1}
                                        strokeDasharray="2,2"
                                    />
                                )}
                            </G>
                        );
                    })}
                </Svg>
            </View>

            {/* Time Axis Markers (01 Sep, 08 Sep, 15 Sep, 22 Sep, 30 Sep) */}
            <View style={styles.timeAxisRow}>
                <Text style={[styles.timeAxisLabel, { color: subtextColor }]}>01 Sep</Text>
                <Text style={[styles.timeAxisLabel, { color: subtextColor }]}>08 Sep</Text>
                <Text style={[styles.timeAxisLabel, { color: subtextColor }]}>15 Sep</Text>
                <Text style={[styles.timeAxisLabel, { color: subtextColor }]}>22 Sep</Text>
                <Text style={[styles.timeAxisLabel, { color: subtextColor }]}>30 Sep</Text>
            </View>

            {/* Bottom Summary Bar: 3 Categories (Paid, Bills, Reimburse) */}
            <View style={[styles.footerRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]}>
                {/* Paid */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSegmentPress('reports')}
                    style={styles.footerItem}
                >
                    <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
                    <Text style={[styles.footerText, { color: textColor }]}>
                        Paid <Text style={{ fontWeight: '700' }}>{formatCurrency(totalPaid)}</Text>
                    </Text>
                </TouchableOpacity>

                {/* Bills */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSegmentPress('purchasing')}
                    style={styles.footerItem}
                >
                    <View style={[styles.dot, { backgroundColor: '#FF9500' }]} />
                    <Text style={[styles.footerText, { color: textColor }]}>
                        Bills <Text style={{ fontWeight: '700' }}>{formatCurrency(outstandingAmount)}</Text>
                    </Text>
                </TouchableOpacity>

                {/* Reimburse */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSegmentPress('reimbursement')}
                    style={styles.footerItem}
                >
                    <View style={[styles.dot, { backgroundColor: '#AF52DE' }]} />
                    <Text style={[styles.footerText, { color: textColor }]}>
                        Reimburse <Text style={{ fontWeight: '700' }}>{formatCurrency(reimburseAmount)}</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        width: '100%',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    headerLeft: {
        flex: 1,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    mainValue: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    periodDropdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 0,
    },
    periodText: {
        fontSize: 12,
        fontWeight: '600',
    },
    peakRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    peakText: {
        fontSize: 11,
        fontWeight: '600',
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    trendText: {
        fontSize: 11,
        fontWeight: '700',
    },
    chartWrapper: {
        position: 'relative',
        height: 84,
        justifyContent: 'flex-end',
        marginVertical: 4,
    },
    tooltipContainer: {
        position: 'absolute',
        top: -50,
        left: 0,
        zIndex: 100,
        alignItems: 'center',
        width: 140,
    },
    liquidGlassCard: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        overflow: 'hidden',
        minWidth: 120,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    tooltipDate: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 2,
    },
    tooltipMetrics: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    tooltipItemPaid: {
        fontSize: 11,
        fontWeight: '700',
    },
    tooltipItemOut: {
        fontSize: 11,
        fontWeight: '700',
    },
    tooltipItemRem: {
        fontSize: 11,
        fontWeight: '700',
    },
    tooltipItemEmpty: {
        fontSize: 10,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    timeAxisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 2,
    },
    timeAxisLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
