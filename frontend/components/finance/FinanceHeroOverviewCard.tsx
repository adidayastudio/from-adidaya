import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    LayoutChangeEvent,
    Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Rect, Line, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

export type FinancePeriodType = 'this_month' | '3_months' | '1_year' | 'all_time';

interface BarItem {
    label: string;
    value: number;
    active: boolean;
    dateKey?: string;
    align?: 'start' | 'middle' | 'end';
}

export interface FinanceHeroTransactionItem {
    date: string;
    amount?: number;
    paidAmount?: number;
    totalAmount?: number;
    statusTag?: string;
    status?: string;
}

interface FinanceHeroOverviewCardProps {
    monthLabel?: string;
    totalPaid: number;
    totalCommitted: number;
    lastMonthPaid?: number;
    outstandingAmount: number;
    outstandingCount: number;
    reimburseAmount?: number;
    reimburseCount?: number;
    selectedPeriod?: FinancePeriodType;
    transactions?: FinanceHeroTransactionItem[];
    onPeriodChange?: (period: FinancePeriodType) => void;
    onSelectSegment?: (segment: 'purchasing' | 'reimbursement' | 'reports') => void;
    embedded?: boolean;
}

const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return 'Rp0';
    return `Rp${Math.round(val).toLocaleString('id-ID')}`;
};

const formatCompact = (val: number) => {
    if (isNaN(val) || val === null || val === undefined || val === 0) return '0';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return val.toString();
};

const parseTxDate = (dStr?: string): { year: number; month: number; day: number } | null => {
    if (!dStr) return null;
    const clean = dStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
    }
    const dt = new Date(dStr);
    if (!isNaN(dt.getTime())) {
        return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() };
    }
    return null;
};

export function FinanceHeroOverviewCard({
    monthLabel = 'Oct 2026',
    totalPaid = 0,
    totalCommitted = 0,
    lastMonthPaid = 0,
    outstandingAmount = 0,
    outstandingCount = 0,
    reimburseAmount = 0,
    reimburseCount = 0,
    selectedPeriod: externalPeriod,
    transactions = [],
    onPeriodChange,
    onSelectSegment,
    embedded = false,
}: FinanceHeroOverviewCardProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = '#FFFFFF';
    const subtextColor = 'rgba(255, 255, 255, 0.75)';
    const gridLineColor = 'rgba(255, 255, 255, 0.15)';

    const [currentPeriod, setCurrentPeriod] = useState<FinancePeriodType>(externalPeriod || 'this_month');
    const activePeriod = externalPeriod || currentPeriod;

    // Interactive clicked bar index for tooltip
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    const targetDate = useMemo(() => {
        const now = new Date();
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let year = now.getFullYear();
        let month = now.getMonth();

        if (monthLabel && monthLabel !== 'Current View') {
            const parts = monthLabel.trim().split(' ');
            const mIdx = monthNames.findIndex(m => parts[0]?.toLowerCase().startsWith(m));
            if (mIdx >= 0) month = mIdx;
            if (parts[1]) {
                const y = parseInt(parts[1], 10);
                if (!isNaN(y)) year = y;
            }
        }
        return { year, month };
    }, [monthLabel]);

    const shortMonth = useMemo(() => {
        const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNamesShort[targetDate.month] || 'Oct';
    }, [targetDate.month]);

    const periodOptions: { id: FinancePeriodType; menuLabel: string; shortLabel: string }[] = useMemo(() => [
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
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setSelectedBarIndex(null);
            setCurrentPeriod(selected.id);
            onPeriodChange?.(selected.id);
        }
    };

    // Calculate dynamic days in current month (28, 29, 30, or 31)
    const daysInCurrentMonth = useMemo(() => {
        return new Date(targetDate.year, targetDate.month + 1, 0).getDate();
    }, [targetDate]);

    // Dynamic chart data generation per period
    const { barsData, maxVal, displayAmount, displayCommitted } = useMemo(() => {
        const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const { year: currYear, month: currMonthIdx } = targetDate;

        const getItemPaid = (t: FinanceHeroTransactionItem) => {
            if (typeof t.paidAmount === 'number') return t.paidAmount;
            if (t.statusTag === 'paid' || t.status === 'Paid') return Number(t.amount ?? t.totalAmount ?? 0);
            return 0;
        };

        const getItemTotal = (t: FinanceHeroTransactionItem) => {
            return Number(t.totalAmount ?? t.amount ?? 0);
        };

        if (activePeriod === '3_months') {
            // 3 Months: 13 weekly buckets ending at the target month
            const weeks: BarItem[] = [];
            const endDate = new Date(currYear, currMonthIdx + 1, 0);
            let periodPaid = 0;
            let periodCommitted = 0;

            for (let w = 0; w < 13; w++) {
                const wStart = new Date(endDate);
                wStart.setDate(wStart.getDate() - (12 - w) * 7 - 6);
                const wEnd = new Date(endDate);
                wEnd.setDate(wEnd.getDate() - (12 - w) * 7);

                let weekVal = 0;
                transactions.forEach(t => {
                    const parsed = parseTxDate(t.date);
                    if (parsed) {
                        const txDate = new Date(parsed.year, parsed.month, parsed.day);
                        if (txDate >= wStart && txDate <= wEnd) {
                            const pVal = getItemPaid(t);
                            const tVal = getItemTotal(t);
                            weekVal += pVal;
                            periodPaid += pVal;
                            periodCommitted += tVal;
                        }
                    }
                });

                let lbl = '';
                let align: 'start' | 'middle' | 'end' = 'middle';
                if (w === 0) {
                    lbl = monthNamesShort[(currMonthIdx - 2 + 12) % 12];
                    align = 'start';
                } else if (w === 4) {
                    lbl = monthNamesShort[(currMonthIdx - 1 + 12) % 12];
                } else if (w === 8) {
                    lbl = monthNamesShort[currMonthIdx];
                } else if (w === 12) {
                    lbl = 'Now';
                    align = 'end';
                }

                weeks.push({
                    label: lbl,
                    value: weekVal,
                    active: false,
                    align,
                });
            }

            const maxBar = Math.max(...weeks.map(b => b.value), 0);
            const dynamicMax = maxBar > 0 ? Math.ceil(maxBar * 1.25) : 100000;

            return {
                displayAmount: periodPaid > 0 ? periodPaid : totalPaid,
                displayCommitted: periodCommitted > 0 ? periodCommitted : totalCommitted,
                maxVal: dynamicMax,
                barsData: weeks,
            };
        } else if (activePeriod === '1_year') {
            // 1 Year: Rolling 12 months ending at target month
            const items: BarItem[] = [];
            let periodPaid = 0;
            let periodCommitted = 0;

            for (let i = 0; i < 12; i++) {
                const targetMIdx = (currMonthIdx - 11 + i + 120) % 12;
                const targetY = currYear - (currMonthIdx - 11 + i < 0 ? 1 : 0);
                const mName = monthNamesShort[targetMIdx];
                const isLatest = i === 11;

                let monthVal = 0;
                transactions.forEach(t => {
                    const parsed = parseTxDate(t.date);
                    if (parsed && parsed.year === targetY && parsed.month === targetMIdx) {
                        const pVal = getItemPaid(t);
                        const tVal = getItemTotal(t);
                        monthVal += pVal;
                        periodPaid += pVal;
                        periodCommitted += tVal;
                    }
                });

                let label = '';
                let align: 'start' | 'middle' | 'end' = 'middle';
                if (i === 0) {
                    label = mName;
                    align = 'start';
                } else if (isLatest) {
                    label = mName;
                    align = 'end';
                } else if (i % 2 === 0) {
                    label = mName;
                }

                items.push({
                    label,
                    value: monthVal,
                    active: false,
                    align,
                });
            }

            const maxBar = Math.max(...items.map(b => b.value), 0);
            const dynamicMax = maxBar > 0 ? Math.ceil(maxBar * 1.25) : 100000;

            return {
                displayAmount: periodPaid > 0 ? periodPaid : totalPaid,
                displayCommitted: periodCommitted > 0 ? periodCommitted : totalCommitted,
                maxVal: dynamicMax,
                barsData: items,
            };
        } else if (activePeriod === 'all_time') {
            // All Time: Months YTD from Jan to target month
            const monthsYTD = monthNamesShort.slice(0, currMonthIdx + 1);
            let periodPaid = 0;
            let periodCommitted = 0;

            const items: BarItem[] = monthsYTD.map((m, idx) => {
                const isLatest = idx === monthsYTD.length - 1;
                let monthVal = 0;
                transactions.forEach(t => {
                    const parsed = parseTxDate(t.date);
                    if (parsed && parsed.year === currYear && parsed.month === idx) {
                        const pVal = getItemPaid(t);
                        const tVal = getItemTotal(t);
                        monthVal += pVal;
                        periodPaid += pVal;
                        periodCommitted += tVal;
                    }
                });

                let align: 'start' | 'middle' | 'end' = 'middle';
                if (idx === 0) align = 'start';
                else if (isLatest) align = 'end';

                return {
                    label: m,
                    value: monthVal,
                    active: false,
                    align,
                };
            });

            const maxBar = Math.max(...items.map(b => b.value), 0);
            const dynamicMax = maxBar > 0 ? Math.ceil(maxBar * 1.25) : 100000;

            return {
                displayAmount: periodPaid > 0 ? periodPaid : totalPaid,
                displayCommitted: periodCommitted > 0 ? periodCommitted : totalCommitted,
                maxVal: dynamicMax,
                barsData: items,
            };
        }

        // Default 'this_month': Exact 1..N days in target month
        const days: BarItem[] = [];
        const totalDays = daysInCurrentMonth;
        let monthPaid = 0;
        let monthCommitted = 0;

        for (let d = 1; d <= totalDays; d++) {
            let dayVal = 0;
            transactions.forEach(t => {
                const parsed = parseTxDate(t.date);
                if (parsed && parsed.year === currYear && parsed.month === currMonthIdx && parsed.day === d) {
                    const pVal = getItemPaid(t);
                    const tVal = getItemTotal(t);
                    dayVal += pVal;
                    monthPaid += pVal;
                    monthCommitted += tVal;
                }
            });

            let label = '';
            let align: 'start' | 'middle' | 'end' = 'middle';
            if (d === 1) {
                label = `1 ${shortMonth}`;
                align = 'start';
            } else if (d === 8) {
                label = `8 ${shortMonth}`;
            } else if (d === 15) {
                label = `15 ${shortMonth}`;
            } else if (d === 22) {
                label = `22 ${shortMonth}`;
            } else if (d === totalDays) {
                label = `${totalDays} ${shortMonth}`;
                align = 'end';
            }

            days.push({
                label,
                value: dayVal,
                active: false,
                align,
                dateKey: `${d} ${shortMonth}`,
            });
        }

        const maxBar = Math.max(...days.map(b => b.value), 0);
        let dynamicMax = 100000;
        if (maxBar > 0) {
            const power = Math.pow(10, Math.floor(Math.log10(maxBar)));
            const ratio = maxBar / power;
            let factor = 10;
            if (ratio <= 1.2) factor = 1.5;
            else if (ratio <= 2.5) factor = 3;
            else if (ratio <= 5) factor = 6;
            else factor = 12;
            dynamicMax = Math.ceil(factor * power);
        }

        return {
            displayAmount: totalPaid > 0 ? totalPaid : monthPaid,
            displayCommitted: totalCommitted > 0 ? totalCommitted : monthCommitted,
            maxVal: dynamicMax,
            barsData: days,
        };
    }, [activePeriod, transactions, targetDate, totalPaid, totalCommitted, daysInCurrentMonth, shortMonth]);

    const [cardInnerWidth, setCardInnerWidth] = useState<number>(335);

    const onCardLayout = (e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) {
            setCardInnerWidth(w - 36);
        }
    };

    const chartWidth = Math.max(280, cardInnerWidth);
    const plotTop = 4;
    const plotHeight = 60;
    const chartHeight = plotTop + plotHeight + 18;
    const yAxisWidth = 34;
    const plotWidth = chartWidth - yAxisWidth;
    const stepX = plotWidth / barsData.length;
    const barWidth = Math.max(3.5, Math.min(13, stepX * 0.58));

    const defaultActiveIndex = barsData.findIndex(b => b.active);
    const activeIndex = selectedBarIndex !== null ? selectedBarIndex : defaultActiveIndex;
    const activeX = activeIndex >= 0 ? yAxisWidth + activeIndex * stepX + (stepX - barWidth) / 2 : 0;
    const activeValue = activeIndex >= 0 ? barsData[activeIndex]?.value || 0 : 0;
    const activeH = activeIndex >= 0 ? Math.max(4, (activeValue / maxVal) * plotHeight) : 0;

    const formattedAmount = formatCurrency(displayAmount);
    const formattedCommitted = formatCurrency(displayCommitted);

    // Dynamic hero font size based on length
    const heroFontSize = useMemo(() => {
        if (formattedAmount.length > 17) return 22;
        if (formattedAmount.length > 14) return 25;
        if (formattedAmount.length > 11) return 27;
        return 29;
    }, [formattedAmount]);

    const handleBarPress = (index: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (selectedBarIndex === index) {
            setSelectedBarIndex(null);
        } else {
            setSelectedBarIndex(index);
        }
    };

    return (
        <View style={[styles.cardContainer, embedded && styles.embeddedCardContainer]} onLayout={onCardLayout}>
            {/* Full Emerald Gradient Background - only when not embedded */}
            {!embedded && (
                <LinearGradient
                    colors={
                        isDark
                            ? ['#18A860', '#159957', '#0E6A3B']
                            : ['#19B568', '#159957', '#0F7341']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            )}

            {/* Header: Finance Pulse Title & Dropdown Period Pill */}
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Finance Pulse</Text>

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
                            <Text style={[styles.periodText, { color: textColor }]}>
                                {currentPeriodTitle}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor="rgba(255, 255, 255, 0.85)" style={{ marginLeft: 4 }} />
                        </Pressable>
                    </Animated.View>
                </ContextMenu>
            </View>

            {/* Metric Section: Overview Amount & Committed Text */}
            <View style={styles.metricSection}>
                <Text
                    style={[styles.heroAmount, { color: textColor, fontSize: heroFontSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.6}
                >
                    {formattedAmount}
                </Text>
                <Text
                    style={[styles.committedText, { color: subtextColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.65}
                >
                    of {formattedCommitted} committed
                </Text>
            </View>

            {/* Middle: Clean Dynamic Bar Chart */}
            <View style={[styles.chartWrapper, { height: chartHeight }]}>
                {/* Active Highlight Tooltip Tag - only shown when clicked */}
                {selectedBarIndex !== null && activeIndex >= 0 && (
                    <View
                        style={[
                            styles.activeTagWrapper,
                            {
                                left: Math.max(yAxisWidth, Math.min(chartWidth - 85, activeX - 32)),
                                top: Math.max(0, plotTop + plotHeight - activeH - 30),
                            }
                        ]}
                    >
                        <View style={styles.activeTagBadge}>
                            <Text style={styles.activeTagText}>
                                {formatCurrency(activeValue)}
                            </Text>
                        </View>
                    </View>
                )}

                <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                        {/* Normal Inactive Bar Gradient (White translucent on Emerald) */}
                        <SvgGradient id="barGradNormal" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.42} />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.12} />
                        </SvgGradient>

                        {/* Active Highlight Bar Gradient (Bright Solid White with mint glow) */}
                        <SvgGradient id="barGradActive" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                            <Stop offset="100%" stopColor="#D1FAE5" stopOpacity={0.92} />
                        </SvgGradient>
                    </Defs>

                    {/* Y-Axis Gridlines & Labels */}
                    {[0, maxVal / 2, maxVal].map((val, idx) => {
                        const y = plotTop + plotHeight - (val / maxVal) * plotHeight;
                        return (
                            <G key={`grid-${idx}`}>
                                <Line
                                    x1={yAxisWidth}
                                    y1={y}
                                    x2={chartWidth}
                                    y2={y}
                                    stroke={gridLineColor}
                                    strokeWidth={1}
                                    strokeDasharray={idx > 0 ? '3,3' : undefined}
                                />
                                <SvgText
                                    x={yAxisWidth - 6}
                                    y={y + 3}
                                    fill={subtextColor}
                                    fontSize={9}
                                    fontWeight="600"
                                    fontFamily="System, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                    textAnchor="end"
                                >
                                    {val === 0 ? '0' : formatCompact(val)}
                                </SvgText>
                            </G>
                        );
                    })}

                    {/* Active Bar Guide Line */}
                    {selectedBarIndex !== null && activeIndex >= 0 && (
                        <Line
                            x1={activeX + barWidth / 2}
                            y1={plotTop + plotHeight - activeH}
                            x2={activeX + barWidth / 2}
                            y2={plotTop + plotHeight}
                            stroke="rgba(255, 255, 255, 0.7)"
                            strokeWidth={1}
                            strokeDasharray="2,2"
                        />
                    )}

                    {/* Bars */}
                    {barsData.map((b, i) => {
                        const isBarActive = selectedBarIndex !== null ? selectedBarIndex === i : b.active;
                        const x = yAxisWidth + i * stepX + (stepX - barWidth) / 2;
                        const h = b.value > 0 ? Math.max(5, (b.value / maxVal) * plotHeight) : 3;
                        const y = plotTop + plotHeight - h;

                        let textX = x + barWidth / 2;
                        let textAnchor: 'start' | 'middle' | 'end' = b.align || 'middle';
                        if (b.align === 'start') {
                            textX = yAxisWidth + 2;
                        } else if (b.align === 'end') {
                            textX = chartWidth - 2;
                        }

                        return (
                            <G key={`b-${i}`}>
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={h}
                                    rx={barWidth / 2}
                                    ry={barWidth / 2}
                                    fill={isBarActive ? 'url(#barGradActive)' : 'url(#barGradNormal)'}
                                    opacity={b.value === 0 ? 0.35 : 1}
                                />
                                {b.label ? (
                                    <SvgText
                                        x={textX}
                                        y={plotTop + plotHeight + 16}
                                        fill={subtextColor}
                                        fontSize={8.5}
                                        fontWeight="600"
                                        fontFamily="System, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                        textAnchor={textAnchor}
                                    >
                                        {b.label}
                                    </SvgText>
                                ) : null}
                            </G>
                        );
                    })}
                </Svg>

                {/* Invisible Touch Overlay for Smooth Bar Interaction */}
                <View style={[styles.touchOverlay, { left: yAxisWidth, width: plotWidth, top: plotTop, height: plotHeight }]}>
                    {barsData.map((_, i) => (
                        <Pressable
                            key={`touch-${i}`}
                            style={styles.touchCol}
                            onPress={() => handleBarPress(i)}
                        />
                    ))}
                </View>
            </View>

            {/* Bottom Row: Good control Pill */}
            <View style={styles.bottomRow}>
                <View style={styles.controlPill}>
                    <View style={styles.controlDot} />
                    <Text style={styles.controlText}>Good control</Text>
                </View>
            </View>
        </View>
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
                shadowColor: '#159957',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 18,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    embeddedCardContainer: {
        borderRadius: 0,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 28,
        marginBottom: 16,
        marginTop: 0,
        shadowOpacity: 0,
        elevation: 0,
        backgroundColor: 'transparent',
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
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    metricSection: {
        marginBottom: 8,
    },
    heroAmount: {
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    committedText: {
        fontSize: 12.5,
        fontWeight: '600',
        marginTop: 2,
    },
    bottomRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
        paddingHorizontal: 12,
        paddingVertical: 5.5,
        borderRadius: 14,
        gap: 6,
    },
    controlDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    controlText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.1,
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
    },
    chartWrapper: {
        position: 'relative',
        marginVertical: 4,
    },
    touchOverlay: {
        position: 'absolute',
        flexDirection: 'row',
    },
    touchCol: {
        flex: 1,
        height: '100%',
    },
    activeTagWrapper: {
        position: 'absolute',
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    activeTagBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
    },
    activeTagText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#0E6A3B',
    },
});


