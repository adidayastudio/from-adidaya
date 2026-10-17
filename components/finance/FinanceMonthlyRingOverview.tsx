import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

interface FinanceMonthlyRingOverviewProps {
    monthLabel?: string;
    totalPaid: number;
    paidChangePct?: number;
    lastMonthPaid?: number;
    outstandingAmount: number;
    outstandingCount: number;
    reimburseAmount: number;
    reimburseCount: number;
    onSelectSegment?: (segment: 'purchasing' | 'reimbursement' | 'reports') => void;
}

const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return 'Rp0';
    return `Rp${val.toLocaleString('id-ID')}`;
};

const formatCompactCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return '0';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
    return val.toString();
};

export function FinanceMonthlyRingOverview({
    monthLabel = 'Sep 2026',
    totalPaid = 50000,
    paidChangePct = -35,
    lastMonthPaid = 77000,
    outstandingAmount = 570508,
    outstandingCount = 1,
    reimburseAmount = 0,
    reimburseCount = 0,
    onSelectSegment,
}: FinanceMonthlyRingOverviewProps) {
    const { width: windowWidth } = useWindowDimensions();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    const totalVolume = totalPaid + outstandingAmount + reimburseAmount;
    const maxVal = Math.max(totalVolume, 1);

    // Calculate ring percentages (clamped 0..1 for visual ring circumference)
    // If totalVolume is 0, give minimal default
    const paidPct = totalVolume > 0 ? Math.min(1, Math.max(0.04, totalPaid / maxVal)) : 0.08;
    const outstandingPct = totalVolume > 0 ? Math.min(1, Math.max(0.04, outstandingAmount / maxVal)) : 0.08;
    const reimbursePct = totalVolume > 0 ? Math.min(1, Math.max(0.04, reimburseAmount / maxVal)) : 0.08;

    // Concentric Ring Geometry
    const svgSize = 130;
    const center = svgSize / 2;
    const strokeWidth = 9;
    const gap = 3.5;

    const rOuter = 54;
    const rMid = rOuter - strokeWidth - gap; // 41.5
    const rInner = rMid - strokeWidth - gap; // 29

    const calcCircumference = (r: number) => 2 * Math.PI * r;
    const circOuter = calcCircumference(rOuter);
    const circMid = calcCircumference(rMid);
    const circInner = calcCircumference(rInner);

    const offsetOuter = circOuter * (1 - paidPct);
    const offsetMid = circMid * (1 - outstandingPct);
    const offsetInner = circInner * (1 - (reimburseAmount > 0 ? reimbursePct : 0.02));

    const handlePress = (segment: 'purchasing' | 'reimbursement' | 'reports') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onSelectSegment?.(segment);
    };

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Header / Month Badge */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconCircle}>
                        <PlatformIcon name="chart.pie.fill" size={16} tintColor="#34C759" />
                    </View>
                    <View>
                        <Text style={[styles.cardTitle, { color: textColor }]}>Monthly Activity Rings</Text>
                        <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
                            {monthLabel} • Combined Flow
                        </Text>
                    </View>
                </View>

                {paidChangePct !== undefined && (
                    <View style={[
                        styles.trendBadge,
                        { backgroundColor: paidChangePct <= 0 ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)' }
                    ]}>
                        <PlatformIcon
                            name={paidChangePct <= 0 ? "arrow.down.right" : "arrow.up.right"}
                            size={12}
                            tintColor={paidChangePct <= 0 ? '#34C759' : '#FF3B30'}
                        />
                        <Text style={[
                            styles.trendText,
                            { color: paidChangePct <= 0 ? '#34C759' : '#FF3B30' }
                        ]}>
                            {paidChangePct > 0 ? `+${paidChangePct}%` : `${paidChangePct}%`}
                        </Text>
                    </View>
                )}
            </View>

            {/* Main Content: Ring Chart + Metrics Breakdown */}
            <View style={styles.contentRow}>
                {/* 3-Ring SVG Activity Ring */}
                <View style={styles.ringWrapper}>
                    <Svg width={svgSize} height={svgSize}>
                        <Defs>
                            {/* Outer Ring: Green Gradient */}
                            <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#30D158" />
                                <Stop offset="100%" stopColor="#34C759" />
                            </LinearGradient>
                            {/* Middle Ring: Orange Gradient */}
                            <LinearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#FFB340" />
                                <Stop offset="100%" stopColor="#FF9500" />
                            </LinearGradient>
                            {/* Inner Ring: Purple/Rose Gradient */}
                            <LinearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#FF2D55" />
                                <Stop offset="100%" stopColor="#AF52DE" />
                            </LinearGradient>
                        </Defs>

                        <G rotation="-90" origin={`${center}, ${center}`}>
                            {/* Outer Track (Total Paid) */}
                            <Circle
                                cx={center}
                                cy={center}
                                r={rOuter}
                                stroke={isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.12)'}
                                strokeWidth={strokeWidth}
                                fill="none"
                            />
                            <Circle
                                cx={center}
                                cy={center}
                                r={rOuter}
                                stroke="url(#greenGrad)"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circOuter}
                                strokeDashoffset={offsetOuter}
                                strokeLinecap="round"
                                fill="none"
                            />

                            {/* Middle Track (Outstanding Bills) */}
                            <Circle
                                cx={center}
                                cy={center}
                                r={rMid}
                                stroke={isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.12)'}
                                strokeWidth={strokeWidth}
                                fill="none"
                            />
                            <Circle
                                cx={center}
                                cy={center}
                                r={rMid}
                                stroke="url(#orangeGrad)"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circMid}
                                strokeDashoffset={offsetMid}
                                strokeLinecap="round"
                                fill="none"
                            />

                            {/* Inner Track (Reimbursements) */}
                            <Circle
                                cx={center}
                                cy={center}
                                r={rInner}
                                stroke={isDark ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.12)'}
                                strokeWidth={strokeWidth}
                                fill="none"
                            />
                            <Circle
                                cx={center}
                                cy={center}
                                r={rInner}
                                stroke="url(#purpleGrad)"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circInner}
                                strokeDashoffset={offsetInner}
                                strokeLinecap="round"
                                fill="none"
                            />
                        </G>
                    </Svg>

                    {/* Ring Center Info */}
                    <View style={styles.ringCenter}>
                        <PlatformIcon name="dollarsign" size={15} tintColor={isDark ? '#8E8E93' : '#636366'} />
                    </View>
                </View>

                {/* Metrics Breakdown Column */}
                <View style={styles.metricsColumn}>
                    {/* Paid Item */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePress('reports')}
                        style={styles.metricItem}
                    >
                        <View style={[styles.indicatorDot, { backgroundColor: '#34C759' }]} />
                        <View style={styles.metricInfo}>
                            <View style={styles.metricHeaderLine}>
                                <Text style={[styles.metricLabel, { color: subtextColor }]}>Total Paid</Text>
                                <Text style={[styles.metricPct, { color: '#34C759' }]}>
                                    {Math.round((totalPaid / maxVal) * 100)}%
                                </Text>
                            </View>
                            <Text style={[styles.metricValue, { color: textColor }]}>
                                {formatCurrency(totalPaid)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Outstanding Bills Item */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePress('purchasing')}
                        style={styles.metricItem}
                    >
                        <View style={[styles.indicatorDot, { backgroundColor: '#FF9500' }]} />
                        <View style={styles.metricInfo}>
                            <View style={styles.metricHeaderLine}>
                                <Text style={[styles.metricLabel, { color: subtextColor }]}>
                                    Outstanding ({outstandingCount})
                                </Text>
                                <Text style={[styles.metricPct, { color: '#FF9500' }]}>
                                    {Math.round((outstandingAmount / maxVal) * 100)}%
                                </Text>
                            </View>
                            <Text style={[styles.metricValue, { color: textColor }]}>
                                {formatCurrency(outstandingAmount)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Reimbursements Item */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePress('reimbursement')}
                        style={styles.metricItem}
                    >
                        <View style={[styles.indicatorDot, { backgroundColor: '#AF52DE' }]} />
                        <View style={styles.metricInfo}>
                            <View style={styles.metricHeaderLine}>
                                <Text style={[styles.metricLabel, { color: subtextColor }]}>
                                    Reimbursements ({reimburseCount})
                                </Text>
                                <Text style={[styles.metricPct, { color: '#AF52DE' }]}>
                                    {Math.round((reimburseAmount / maxVal) * 100)}%
                                </Text>
                            </View>
                            <Text style={[styles.metricValue, { color: textColor }]}>
                                {formatCurrency(reimburseAmount)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Total Summary & Quick Insight */}
            <View style={[styles.footerBar, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <View style={styles.footerLeft}>
                    <Text style={[styles.footerLabel, { color: subtextColor }]}>Total Allocation</Text>
                    <Text style={[styles.footerTotal, { color: textColor }]}>{formatCurrency(totalVolume)}</Text>
                </View>

                {lastMonthPaid > 0 && (
                    <View style={styles.footerRight}>
                        <Text style={[styles.footerSubText, { color: subtextColor }]}>
                            vs. last month ({formatCompactCurrency(lastMonthPaid)})
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        marginHorizontal: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    ringWrapper: {
        position: 'relative',
        width: 130,
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringCenter: {
        position: 'absolute',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(142, 142, 147, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricsColumn: {
        flex: 1,
        marginLeft: 18,
        gap: 10,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    indicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    metricInfo: {
        flex: 1,
    },
    metricHeaderLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    metricPct: {
        fontSize: 11,
        fontWeight: '700',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
        marginTop: 1,
    },
    footerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    footerLeft: {
        flexDirection: 'column',
    },
    footerLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    footerTotal: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 1,
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    footerSubText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
