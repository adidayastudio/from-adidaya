import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FinancePulseProps {
    data?: {
        dailySpending: number[];
        rollingAvg: number;
        approved: number;
        pendingMoreThan3d: number;
        paid: number;
        currentBalance: number;
        dates?: string[];
    };
}

const SAFE_DATA = {
    dailySpending: [2100000, 2300000, 2050000, 2200000, 2150000, 2400000, 2200000],
    rollingAvg: 2200000,
    approved: 2500000,
    pendingMoreThan3d: 1500000,
    paid: 18000000,
    currentBalance: 45000000,
    dates: ['06 APR', '07 APR', '08 APR', '09 APR', '10 APR', '11 APR', '12 APR']
};

const STRESS_DATA = {
    dailySpending: [2500000, 3200000, 1500000, 1800000, 1800000, 8500000, 1900000],
    rollingAvg: 2200000,
    approved: 36000000,
    pendingMoreThan3d: 15300000,
    paid: 18000000,
    currentBalance: 45000000,
    dates: ['06 APR', '07 APR', '08 APR', '09 APR', '10 APR', '11 APR', '12 APR']
};

const DATES = ['06 APR', '07 APR', '08 APR', '09 APR', '10 APR', '11 APR', '12 APR'];

const formatPulseValue = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (val >= 1000000000) return `${(val / 1000000000).toFixed(2)}B`;
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(2)}K`;
    return val.toString();
};

export function FinancePulse({ data: propData }: FinancePulseProps) {
    const { width: windowWidth } = useWindowDimensions();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [isStress, setIsStress] = useState(false);
    
    const data = useMemo(() => {
        const baseData = propData || (isStress ? STRESS_DATA : SAFE_DATA);
        
        if (propData) {
            if (isStress) {
                // Simulate stress on real data:
                // 1. Spike 5th day of dailySpending to trigger exactly 2.8x stability index (volatility)
                const simulatedSpending = [...propData.dailySpending];
                const otherDaysSum = simulatedSpending.reduce((sum, val, idx) => idx === 5 ? sum : sum + val, 0);
                simulatedSpending[5] = Math.round((2 / 3) * otherDaysSum) || 8500000;
                
                const rollingAvg = simulatedSpending.reduce((a, b) => a + b, 0) / 7;
                
                // 2. Set approved and pending bills so outstanding bills = 114% of available funding (currentBalance)
                const targetOutstanding = propData.currentBalance * 1.14;
                const approvedSimulated = targetOutstanding * 0.70;
                const pendingSimulated = targetOutstanding * 0.30;
                
                return {
                    ...propData,
                    dailySpending: simulatedSpending,
                    rollingAvg,
                    approved: approvedSimulated,
                    pendingMoreThan3d: pendingSimulated,
                };
            } else {
                return propData;
            }
        }
        
        return isStress ? STRESS_DATA : SAFE_DATA;
    }, [propData, isStress]);

    // Chart Dimensions
    const chartHeight = 120;
    const paddingVertical = 14;
    const innerChartHeight = chartHeight - 2 * paddingVertical;
    const horizontalMargin = 15;
    const chartWidth = windowWidth - 80;
    const hasChartData = data.dailySpending.length > 0 && data.dailySpending.some(v => v > 0);
    const maxSpending = hasChartData ? Math.max(...data.dailySpending, data.rollingAvg) * 1.3 : 1;

    const points = useMemo(() => {
        if (!hasChartData) return [];
        return data.dailySpending.map((val, i) => {
            const x = horizontalMargin + (i / (data.dailySpending.length - 1)) * (chartWidth - 2 * horizontalMargin);
            const y = paddingVertical + innerChartHeight - (val / maxSpending) * innerChartHeight;
            return { x, y, val, index: i };
        });
    }, [data, chartWidth, maxSpending, hasChartData, innerChartHeight, paddingVertical]);

    // Interaction State
    const [activePoint, setActivePoint] = useState<{ x: number, y: number, val: number, index: number }>({ x: 0, y: chartHeight, val: 0, index: 0 });
    const tooltipX = useSharedValue(points.length > 0 ? points[points.length - 1].x : 0);
    const tooltipY = useSharedValue(points.length > 0 ? points[points.length - 1].y : 0);
    const tooltipOpacity = useSharedValue(0); 
    const hideTimerRef = useRef<any>(null);

    useEffect(() => {
        if (points.length === 0) return;
        const lastPoint = points[points.length - 1];
        setActivePoint(lastPoint);
        tooltipX.value = lastPoint.x;
        tooltipY.value = lastPoint.y;
    }, [points]);

    // Calculations
    const avgDailySpending = hasChartData ? data.dailySpending.reduce((a, b) => a + b, 0) / data.dailySpending.length : 0;
    const maxDailySpending = hasChartData ? Math.max(...data.dailySpending) : 0;
    const stabilityIndex = avgDailySpending > 0 ? (maxDailySpending / avgDailySpending) : 0;

    const outstandingBills = data.approved + data.pendingMoreThan3d;
    const availableFunding = data.currentBalance;
    const pressureRatio = availableFunding > 0 ? (outstandingBills / availableFunding) : 0;
    const pressurePercentage = Math.round(pressureRatio * 100);

    const isHighPressure = pressureRatio > 0.3; // High pressure if outstanding bills reach >30% of available funding
    const pressureColor = isHighPressure ? '#FF9500' : '#34C759';
    const pressureLabel = isHighPressure ? 'High Pressure' : 'Normal Pressure';
    const pressureDesc = isHighPressure 
        ? `Outstanding bills are reaching ${pressurePercentage}% of available funding`
        : 'Spending and commitments are within healthy limits';

    const volatilityLabel = stabilityIndex > 2.5 ? 'HIGH VOLATILITY' : 'LOW VOLATILITY';
    const volatilityColor = stabilityIndex > 2.5 ? '#FF3B30' : '#34C759';

    const linePath = points.reduce((acc, p, i) =>
        i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
    );

    const dates = data.dates || DATES;

    const avgY = paddingVertical + innerChartHeight - (data.rollingAvg / maxSpending) * innerChartHeight;

    const handleTouch = (x: number) => {
        if (points.length === 0) return;
        const scaledX = (x - horizontalMargin) / (chartWidth - 2 * horizontalMargin);
        const index = Math.round(scaledX * (data.dailySpending.length - 1));
        const safeIndex = Math.max(0, Math.min(data.dailySpending.length - 1, index));
        const point = points[safeIndex];
        if (!point) return;
        setActivePoint(point);
        tooltipX.value = withSpring(point.x, { damping: 15, stiffness: 120 });
        tooltipY.value = withSpring(point.y, { damping: 15, stiffness: 120 });
        
        // Show tooltip on touch
        tooltipOpacity.value = withSpring(1);
        
        // Start/Reset hide timer (4 seconds)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            tooltipOpacity.value = withSpring(0);
        }, 4000);
    };

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
    }), [points, chartWidth]);

    const tooltipStyle = useAnimatedStyle(() => {
        const halfWidth = 75; 
        const clampedX = Math.max(halfWidth - 15, Math.min(chartWidth - halfWidth + 15, tooltipX.value));
        
        return {
            opacity: tooltipOpacity.value,
            transform: [
                { translateX: clampedX - halfWidth },
                { translateY: tooltipY.value - 85 }
            ]
        };
    });

    const arrowStyle = useAnimatedStyle(() => {
        const halfWidth = 75;
        const clampedX = Math.max(halfWidth - 15, Math.min(chartWidth - halfWidth + 15, tooltipX.value));
        const arrowOffset = tooltipX.value - clampedX;
        
        return {
            transform: [
                { translateX: arrowOffset }
            ]
        };
    });

    return (
        <View 
            style={[
                s.card, 
                { 
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: 'transparent',
                    borderWidth: 0,
                }
            ]}
        >
            {/* Header */}
            <View style={s.topRow}>
                <View style={s.titleContainer}>
                    <PlatformIcon name="waveform.path.ecg" size={18} tintColor={textColor} />
                    <Text style={[s.title, { color: textColor }]}>Finance Pulse</Text>
                </View>
            </View>

            {/* Main Metrics */}
            <View style={s.metricsRow}>
                <View style={s.metricLeft}>
                    <View style={s.pressureHeader}>
                        <PlatformIcon 
                            name={isHighPressure ? "exclamationmark.circle" : "checkmark.circle"} 
                            size={14} 
                            tintColor={pressureColor} 
                        />
                        <Text style={[s.pressureLabel, { color: pressureColor }]}>{pressureLabel}</Text>
                    </View>
                    <Text style={[s.description, { color: subtextColor }]}>{pressureDesc}</Text>
                </View>
                <View style={s.metricRight}>
                    <Text style={[s.mainValue, { color: textColor }]}>{stabilityIndex.toFixed(1)}x</Text>
                    <View style={[s.volatilityBadge, { backgroundColor: volatilityColor + '10' }]}>
                        <Text style={[s.volatilityText, { color: volatilityColor }]}>{volatilityLabel}</Text>
                    </View>
                </View>
            </View>

            {/* Chart Area */}
            <View style={s.chartSection} {...(hasChartData ? panResponder.panHandlers : {})}>
                {hasChartData ? (
                <View style={s.chartContainer}>
                    <Svg width={chartWidth} height={chartHeight}>
                        {/* Vertical Guide Line */}
                        <Line 
                            x1={activePoint.x} y1="0" x2={activePoint.x} y2={chartHeight} 
                            stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} 
                            strokeWidth="1" 
                        />

                        {/* Horizontal Dashed Average Line */}
                        <Line 
                            x1={horizontalMargin} y1={avgY} x2={chartWidth - horizontalMargin} y2={avgY} 
                            stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                        />
                        
                        {/* Main Spending Line */}
                        <Path d={linePath} stroke={isHighPressure ? '#FF9500' : '#007AFF'} strokeWidth="3" fill="none" strokeLinejoin="round" />
                        
                        {/* Data Points */}
                        {points.map((p, i) => (
                            <Circle 
                                key={i} 
                                cx={p.x} cy={p.y} r={activePoint.index === i ? 7 : 4} 
                                fill={isHighPressure ? '#FF9500' : '#007AFF'} 
                                stroke={isDark ? '#1C1C1E' : '#FFF'} 
                                strokeWidth={activePoint.index === i ? 2.5 : 2} 
                            />
                        ))}
                    </Svg>

                    {/* Liquid Glass Tooltip - Pure Blurred Aesthetic */}
                    <Animated.View style={[s.tooltip, tooltipStyle]}>
                        <GlassView 
                            intensity={isDark ? 10 : 80} 
                            style={[
                                s.tooltipContent, 
                                { 
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255,255,255,0.7)',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                                }
                            ]}
                        >
                            <Text style={[s.tooltipDate, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#8E8E93' }]}>{dates[activePoint.index]} 2026</Text>
                            <View style={s.tooltipAmountRow}>
                                <Text style={[s.tooltipCurrency, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#8E8E93' }]}>Rp</Text>
                                <Text style={[s.tooltipAmount, { color: textColor }]}>{formatPulseValue(activePoint.val)}</Text>
                            </View>
                        </GlassView>
                        <Animated.View style={[
                            s.tooltipArrow, 
                            { borderTopColor: isDark ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255,255,255,0.4)' },
                            arrowStyle
                        ]} />
                    </Animated.View>
                </View>
                ) : (
                    <View style={[s.chartContainer, { justifyContent: 'center' }]}>
                        <Text style={[s.description, { color: subtextColor, textAlign: 'center' }]}>
                            No paid spending data in the last 7 days yet.
                        </Text>
                    </View>
                )}
            </View>

            {/* Legend & Simulation toggle */}
            <View style={s.footer}>
                <View style={s.legend}>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: isHighPressure ? '#FF9500' : '#007AFF' }]} />
                        <Text style={[s.legendText, { color: subtextColor }]}>DAILY SPENDING</Text>
                    </View>
                    <View style={s.legendItem}>
                        <View style={[s.legendDash, { backgroundColor: subtextColor, opacity: 0.3 }]} />
                        <Text style={[s.legendText, { color: subtextColor }]}>7D AVERAGE</Text>
                    </View>
                </View>
                
                <TouchableOpacity 
                    onPress={() => setIsStress(!isStress)}
                    style={s.simToggle}
                >
                    <PlatformIcon name="bolt.circle" size={12} tintColor={subtextColor} />
                    <Text style={[s.simText, { color: subtextColor }]}>SIMULATION</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 0,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    metricLeft: {
        flex: 1,
        paddingRight: 20,
    },
    pressureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    pressureLabel: {
        fontSize: 15,
        fontWeight: '800',
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    metricRight: {
        alignItems: 'flex-end',
    },
    mainValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: 2,
    },
    volatilityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    volatilityText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    chartSection: {
        height: 160,
        justifyContent: 'flex-end',
        paddingTop: 30,
    },
    chartContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltip: {
        position: 'absolute',
        width: 150,
        alignItems: 'center',
        top: 0,
        left: 0,
        zIndex: 100,
    },
    tooltipContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        alignItems: 'center',
        minWidth: 140,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    liquidShine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '45%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    tooltipDate: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    tooltipAmountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    tooltipCurrency: {
        fontSize: 12,
        fontWeight: '700',
    },
    tooltipAmount: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    legend: {
        flexDirection: 'row',
        gap: 16,
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
    legendDash: {
        width: 12,
        height: 2,
        borderRadius: 1,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    simToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.5,
    },
    simText: {
        fontSize: 9,
        fontWeight: '800',
    }
});
