import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { startOfWeek } from 'date-fns';
import Animated, { 
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withRepeat,
    withSequence,
    withTiming,
    SharedValue
} from 'react-native-reanimated';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useUserContext } from '@/context/UserProvider';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { LiquidCard } from '@/components/ui/LiquidCard';
import { fetchGeminiAIBriefs, getCachedAIBriefs, AIBriefs } from '@/lib/api/geminiBriefs';
import { PillButton } from '@/components/ui/PillButton';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = 20;
const ROW_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2);

const formatCurrency = (val: number) => {
    if (val >= 1000000000) {
        return `IDR ${(val / 1000000000).toFixed(1)}B`;
    }
    if (val >= 1000000) {
        return `IDR ${(val / 1000000).toFixed(1)}M`;
    }
    return `IDR ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

export interface BriefCardProps {
    id: string;
    label: string;
    title?: string;
    value: string;
    badgeText?: string;
    icon: string;
    color: string;
    route: string;
    width: number;
    gap: number;
    isLast: boolean;
    gradientColors: [string, string];
    textColor: string;
    subtextColor: string;
    updateKey: number;
    animationDelay: number;
    description?: string;
}

// Helper to parse double asterisks or specific red/green markers for highlighting text
function parseHighlightText(text: string) {
    const segments: { text: string; type: 'normal' | 'blue' | 'red' | 'green' }[] = [];
    // Regex matches:
    // 1. **blue**
    // 2. *r*red*r*
    // 3. *g*green*g*
    const regex = /(\*\*([^*]+)\*\*)|(\*r\*([^*]+)\*r\*)|(\*g\*([^*]+)\*g\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
            segments.push({
                text: text.substring(lastIndex, matchIndex),
                type: 'normal',
            });
        }
        if (match[2] !== undefined) {
            segments.push({
                text: match[2],
                type: 'blue',
            });
        } else if (match[4] !== undefined) {
            segments.push({
                text: match[4],
                type: 'red',
            });
        } else if (match[6] !== undefined) {
            segments.push({
                text: match[6],
                type: 'green',
            });
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({
            text: text.substring(lastIndex),
            type: 'normal',
        });
    }

    if (segments.length === 0) {
        segments.push({ text, type: 'normal' });
    }

    return segments;
}

// Custom Typewriter text element
export function TypewriterLine({ 
    text, 
    delay = 0,
    speed = 10, 
    textColor, 
    onComplete, 
    active = true,
    animate = true,
    theme = 'blue'
}: { 
    text: string; 
    delay?: number;
    speed?: number; 
    textColor: string; 
    onComplete?: () => void; 
    active?: boolean; 
    animate?: boolean;
    theme?: 'blue' | 'finance' | 'crew';
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    // Parse segments once
    const segments = parseHighlightText(text);
    const cleanLength = segments.reduce((sum, seg) => sum + seg.text.length, 0);
    
    const [charCount, setCharCount] = useState(animate ? 0 : cleanLength);
    
    useEffect(() => {
        if (!animate) {
            setCharCount(cleanLength);
            if (onComplete) {
                onComplete();
            }
            return;
        }
        if (!active) {
            setCharCount(0);
            return;
        }
        let isMounted = true;
        setCharCount(0);
        
        const timeout = setTimeout(() => {
            let i = 0;
            const interval = setInterval(() => {
                if (!isMounted) return;
                
                i++;
                setCharCount(i);
                
                if (i >= cleanLength) {
                    clearInterval(interval);
                    if (onComplete) {
                        onComplete();
                    }
                }
            }, speed);
            
            return () => clearInterval(interval);
        }, delay);
        
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [text, delay, speed, active, animate, cleanLength]);

    const highlightColors = {
        blue: theme === 'finance'
            ? (isDark ? '#FB7185' : '#D0173E')
            : theme === 'crew'
            ? (isDark ? '#C084FC' : '#8B5CF6')
            : (isDark ? '#60A5FA' : '#0066CC'),
        red: isDark ? '#F87171' : '#D32F2F', // premium semantic red
        green: isDark ? '#34D399' : '#1B5E20', // premium semantic green
    };

    let accumulatedLength = 0;
    const elements = segments.map((seg, idx) => {
        const segLen = seg.text.length;
        const startIdx = accumulatedLength;
        const endIdx = accumulatedLength + segLen;
        accumulatedLength = endIdx;

        if (charCount <= startIdx) {
            return null;
        }

        const visibleText = seg.text.slice(0, charCount - startIdx);
        const isHighlight = seg.type !== 'normal';
        const customColor = isHighlight ? highlightColors[seg.type as keyof typeof highlightColors] : textColor;

        return (
            <Text 
                key={idx} 
                style={[
                    isHighlight 
                        ? { color: customColor, fontWeight: '700' } 
                        : { color: textColor }
                ]}
            >
                {visibleText}
            </Text>
        );
    });

    return (
        <Text style={[styles.sectionSubtitle, { color: textColor }]}>
            {elements.length > 0 ? elements : ' '}
        </Text>
    );
}

export function BriefCard({ 
    id, 
    label, 
    title, 
    value, 
    badgeText, 
    icon, 
    color, 
    route, 
    width, 
    gap, 
    isLast, 
    gradientColors, 
    textColor, 
    subtextColor,
    updateKey,
    animationDelay,
    description
}: BriefCardProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const isFullWidth = width > ROW_WIDTH - 20;

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.cardWrapper,
                { width, marginRight: isLast ? 0 : gap },
                pressed && styles.detailCardPressed
            ]}
        >
            <Animated.View 
                key={`${id}-${updateKey}`}
                entering={FadeInDown.delay(animationDelay).duration(500)}
                style={styles.cardAnimWrapper}
            >
                <LiquidCard
                    variant="tinted"
                    tintColor={color}
                    style={{ minHeight: description ? 165 : 145, height: 'auto' }}
                    contentStyle={{ padding: 16, minHeight: description ? 165 : 145, justifyContent: 'space-between' }}
                >
                    <View style={styles.detailCardHeader}>
                        <View style={[
                            styles.detailIconWrapper, 
                            { 
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                                borderWidth: 1
                            }
                        ]}>
                            <PlatformIcon 
                                name={icon as any} 
                                size={18} 
                                tintColor={color} 
                            />
                        </View>
                        <View style={styles.detailHeaderRight}>
                            {id === 'team-shift' && badgeText === 'NEW' && (
                                <View style={[styles.statusDot, { backgroundColor: '#E53935', marginRight: 6 }]} />
                            )}
                            <PlatformIcon 
                                name="chevron.right" 
                                size={12} 
                                tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} 
                            />
                        </View>
                    </View>

                    <View style={styles.detailCardBody}>
                        {badgeText && isFullWidth && (
                            <View style={[styles.badgeContainer, { 
                                backgroundColor: badgeText === 'APPROVED' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(91, 164, 229, 0.15)',
                                marginBottom: 6
                            }]}>
                                <Text style={[styles.badgeText, { color: badgeText === 'APPROVED' ? '#30D158' : '#5BA4E5' }]}>
                                    {badgeText}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.detailValue, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]} numberOfLines={1}>
                            {value}
                        </Text>
                        <Text style={[styles.detailLabel, { color: isDark ? 'rgba(255,255,255,0.85)' : '#1C1C1E', fontWeight: '700' }]} numberOfLines={1}>
                            {label}
                        </Text>
                        {description && (
                            <Text style={[
                                styles.detailDescription, 
                                { 
                                    color: isDark ? 'rgba(255,255,255,0.55)' : '#4E4E52',
                                    marginTop: 6,
                                    fontSize: 12,
                                    lineHeight: 16,
                                    fontWeight: '500'
                                }
                            ]}>
                                {description}
                            </Text>
                        )}
                    </View>
                </LiquidCard>
            </Animated.View>
        </Pressable>
    );
}

interface BarColumnProps {
    index: number;
    hours: number | null;
    status: string | null;
    isToday: boolean;
    isFuture: boolean;
    val: number;
    heightPercent: number;
    animation: SharedValue<number>;
    pulseAnimation: SharedValue<number>;
    dayLabel: string;
}

function BarColumn({
    index,
    hours,
    status,
    isToday,
    isFuture,
    val,
    heightPercent,
    animation,
    pulseAnimation,
    dayLabel,
}: BarColumnProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const animatedBar = useAnimatedStyle(() => {
        const heightVal = (heightPercent / 100) * 44 * animation.value;
        return {
            height: heightVal,
            opacity: isToday ? pulseAnimation.value : 0.85,
        };
    });

    const trackColor = isToday
        ? (isDark ? 'rgba(10, 132, 255, 0.16)' : 'rgba(10, 132, 255, 0.08)')
        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)');
    
    const normalColors = isDark
        ? ['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.45)'] as [string, string]
        : ['#CBD5E1', '#94A3B8'] as [string, string];

    const onTimeColors = isDark
        ? ['rgba(52, 211, 153, 0.35)', '#34D399'] as [string, string]
        : ['#A7F3D0', '#10B981'] as [string, string];

    const lateColors = isDark
        ? ['rgba(248, 113, 113, 0.35)', '#F87171'] as [string, string]
        : ['#FCA5A5', '#EF4444'] as [string, string];

    const activeColors = isDark 
        ? ['#1D4ED8', '#0A84FF'] as [string, string]
        : ['#93C5FD', '#007AFF'] as [string, string];

    const labelColor = isToday 
        ? (isDark ? '#0A84FF' : '#0056D2')
        : (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)');

    let currentColors = normalColors;
    if (isToday) {
        currentColors = activeColors;
    } else if (status === 'late') {
        currentColors = lateColors;
    } else if (status === 'ontime' || status === 'intime') {
        currentColors = onTimeColors;
    }

    return (
        <View style={styles.barColumn}>
            <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
                {!isFuture && val > 0 && (
                    <Animated.View style={[
                        styles.barFill, 
                        isToday && isDark && {
                            shadowColor: '#0A84FF',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 4,
                        },
                        isToday && !isDark && {
                            shadowColor: '#007AFF',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.4,
                            shadowRadius: 3,
                            elevation: 1,
                        },
                        animatedBar
                    ]}>
                        <LinearGradient
                            colors={currentColors}
                            style={{ flex: 1, borderRadius: 4 }}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                        />
                    </Animated.View>
                )}
            </View>
            <Text style={[
                styles.barLabel, 
                { color: labelColor },
                isToday && styles.barLabelActive
            ]}>{dayLabel}</Text>
        </View>
    );
}

export function WeeklyBarChart({ 
    active, 
    weeklyHours, 
    weeklyStatuses 
}: { 
    active: boolean; 
    weeklyHours?: (number | null)[]; 
    weeklyStatuses?: (string | null)[]; 
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const animation = useSharedValue(0);
    const pulseAnimation = useSharedValue(1);

    useEffect(() => {
        if (active) {
            animation.value = 0;
            animation.value = withTiming(1, { duration: 1000 });
            
            pulseAnimation.value = withRepeat(
                withSequence(
                    withTiming(0.5, { duration: 600 }),
                    withTiming(1, { duration: 600 })
                ),
                -1,
                true
            );
        } else {
            animation.value = 0;
            pulseAnimation.value = 1;
        }
    }, [active]);

    const todayIndex = (new Date().getDay() + 6) % 7;
    
    const defaultHours = [8.2, 7.8, 9.0, 8.0, 7.5, 6.0, 0].map((h, idx) => {
        return idx > todayIndex ? null : h;
    });
    const hoursList = weeklyHours || defaultHours;

    const defaultStatuses = ['ontime', 'late', 'ontime', 'ontime', 'ontime', 'late', null];
    const statusesList = weeklyStatuses || defaultStatuses;

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // Dynamic Average calculation
    const validHours = hoursList.filter((h): h is number => h !== null);
    const avg = validHours.length > 0 
        ? Math.round((validHours.reduce((sum, h) => sum + h, 0) / validHours.length) * 10) / 10
        : 8.0;

    // Calculate max deviation from avg (min 4.0 for stability)
    let maxDev = 4.0;
    validHours.forEach(h => {
        const dev = Math.abs(h - avg);
        if (dev > maxDev) {
            maxDev = dev;
        }
    });

    return (
        <View style={styles.barChartContainer}>
            {/* Horizontal baseline representing the weekly average (exactly 50% of track height) */}
            <View style={[
                styles.baselineLimit,
                {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 122, 255, 0.2)'
                }
            ]} />
            {hoursList.map((hours, index) => {
                const isToday = index === todayIndex;
                const isFuture = hours === null;
                const val = hours !== null ? hours : 0;
                const status = statusesList[index];
                
                // Map to heightPercent (baseline at 50%, clamped between 8% and 92%)
                const deviation = val - avg;
                const heightPercent = isFuture 
                    ? 0 
                    : Math.min(92, Math.max(8, 50 + (deviation / maxDev) * 42));
                
                return (
                    <BarColumn
                        key={index}
                        index={index}
                        hours={hours}
                        status={status}
                        isToday={isToday}
                        isFuture={isFuture}
                        val={val}
                        heightPercent={heightPercent}
                        animation={animation}
                        pulseAnimation={pulseAnimation}
                        dayLabel={dayLabels[index]}
                    />
                );
            })}
        </View>
    );
}

export function ApprovalStatusSlider({ active, status }: { active: boolean; status: string }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const animation = useSharedValue(0);
    
    const getTargetPos = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === 'paid' || lower === 'released' || lower === 'dibayarkan') {
            return 0.84;
        }
        if (lower === 'approved' || lower === 'disetujui') {
            return 0.5;
        }
        return 0.16; // default requested / pending / revised
    };
    const targetPos = getTargetPos(status);

    useEffect(() => {
        if (active) {
            animation.value = 0;
            animation.value = withTiming(targetPos, { duration: 1200 });
        } else {
            animation.value = 0;
        }
    }, [active, status, targetPos]);

    const animatedPointer = useAnimatedStyle(() => {
        return {
            left: `${animation.value * 100}%`,
        };
    });

    const labelColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    const pointerColor = isDark ? '#FFFFFF' : '#1C1C1E';

    return (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderTicks}>
                <Text style={[styles.sliderTickText, { color: labelColor }]}>REQ</Text>
                <Text style={[styles.sliderTickText, { color: labelColor }]}>REVIEW</Text>
                <Text style={[styles.sliderTickText, { color: labelColor }]}>RELEASE</Text>
            </View>
            <View style={styles.sliderTrackWrapper}>
                <LinearGradient
                    colors={['#30D158', '#FFCC00', '#FF453A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sliderTrack}
                />
                <Animated.View style={[
                    styles.sliderPointer, 
                    { backgroundColor: pointerColor },
                    animatedPointer
                ]} />
            </View>
        </View>
    );
}

export function FinancePendingChart({ 
    active, 
    reimburseCount, 
    reimburseAmount, 
    purchasingCount, 
    purchasingAmount 
}: { 
    active: boolean; 
    reimburseCount: number; 
    reimburseAmount: number; 
    purchasingCount: number; 
    purchasingAmount: number; 
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    // Animation for progress widths
    const reimburseWidthAnim = useSharedValue(0);
    const purchasingWidthAnim = useSharedValue(0);

    const totalCount = reimburseCount + purchasingCount;
    const reimburseRatio = totalCount > 0 ? reimburseCount / totalCount : 0;
    const purchasingRatio = totalCount > 0 ? purchasingCount / totalCount : 0;

    useEffect(() => {
        if (active) {
            reimburseWidthAnim.value = withTiming(reimburseRatio, { duration: 1000 });
            purchasingWidthAnim.value = withTiming(purchasingRatio, { duration: 1000 });
        } else {
            reimburseWidthAnim.value = 0;
            purchasingWidthAnim.value = 0;
        }
    }, [active, reimburseRatio, purchasingRatio]);

    const reimburseBar = useAnimatedStyle(() => ({
        width: `${reimburseWidthAnim.value * 100}%`
    }));

    const purchasingBar = useAnimatedStyle(() => ({
        width: `${purchasingWidthAnim.value * 100}%`
    }));

    const labelColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    const valueColor = isDark ? '#FFFFFF' : '#1C1C1E';

    return (
        <View style={styles.financeChartContainer}>
            {/* Row 1: Purchase Requests */}
            <View style={styles.chartRow}>
                <View style={styles.chartRowHeader}>
                    <Text style={[styles.chartRowLabel, { color: labelColor }]}>PURCHASE REQUESTS</Text>
                    <Text style={[styles.chartRowValue, { color: valueColor }]}>
                        {purchasingCount} pending • {formatCurrency(purchasingAmount)}
                    </Text>
                </View>
                <View style={[styles.chartTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Animated.View style={[styles.chartFill, { backgroundColor: isDark ? '#F472B6' : '#E11D48' }, purchasingBar]} />
                </View>
            </View>

            {/* Row 2: Reimbursements */}
            <View style={styles.chartRow}>
                <View style={styles.chartRowHeader}>
                    <Text style={[styles.chartRowLabel, { color: labelColor }]}>REIMBURSEMENTS</Text>
                    <Text style={[styles.chartRowValue, { color: valueColor }]}>
                        {reimburseCount} pending • {formatCurrency(reimburseAmount)}
                    </Text>
                </View>
                <View style={[styles.chartTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Animated.View style={[styles.chartFill, { backgroundColor: isDark ? '#FB7185' : '#D0173E' }, reimburseBar]} />
                </View>
            </View>
        </View>
    );
}

export function CurvedArcGauge({ active, percentage }: { active: boolean; percentage: number }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const animation = useSharedValue(0);

    useEffect(() => {
        if (active) {
            animation.value = 0;
            animation.value = withTiming(percentage / 100, { duration: 1200 });
        } else {
            animation.value = 0;
        }
    }, [active, percentage]);

    const cx = 90;
    const cy = 40;
    const r = 32;

    const animatedDotProps = useAnimatedStyle(() => {
        const theta = -Math.PI + (animation.value * Math.PI);
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        return {
            transform: [
                { translateX: x },
                { translateY: y }
            ]
        };
    });

    const animatedStrokeProps = useAnimatedProps(() => {
        const offset = 100.5 * (1 - animation.value);
        return {
            strokeDashoffset: offset
        };
    });

    const strokeBg = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
    const textFill = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    const dotColor = isDark ? '#C084FC' : '#8B5CF6';

    return (
        <View style={styles.gaugeContainer}>
            <Svg width={180} height={52} viewBox="0 0 180 52">
                <Defs>
                    <SvgGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={isDark ? '#a78bfa' : '#c084fc'} stopOpacity={0.6} />
                        <Stop offset="100%" stopColor={isDark ? '#c084fc' : '#8b5cf6'} />
                    </SvgGradient>
                </Defs>
                
                <Path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    stroke={strokeBg}
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                />

                <AnimatedPath
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    stroke="url(#arcGrad)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="100.5, 201"
                    animatedProps={animatedStrokeProps}
                />

                <SvgText x={cx - r - 14} y={cy + 4} fill={textFill} fontSize={9} fontWeight="800" textAnchor="middle">0</SvgText>
                <SvgText x={cx + r + 14} y={cy + 4} fill={textFill} fontSize={9} fontWeight="800" textAnchor="middle">100</SvgText>
            </Svg>
            
            <Animated.View style={[
                styles.gaugeDot, 
                { 
                    backgroundColor: dotColor,
                    shadowColor: dotColor,
                }, 
                animatedDotProps
            ]} />
        </View>
    );
}

export function AdidayaBrief({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // States: 'new' (typing animation), 'read' (collapsed), 'update' (pulsing teaser)
    const [briefState, setBriefState] = useState<'new' | 'read' | 'update'>('new');
    const [hasUpdates, setHasUpdates] = useState(false);
    const [updateKey, setUpdateKey] = useState(0);
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const [visibleLinesCount, setVisibleLinesCount] = useState(1);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);
    
    // Swipeable carousel and Finance states
    const [currentPage, setCurrentPage] = useState(0);
    const [financeRequests, setFinanceRequests] = useState<any[]>([]);
    const [visibleFinanceLinesCount, setVisibleFinanceLinesCount] = useState(1);
    const [financeBriefState, setFinanceBriefState] = useState<'new' | 'read' | 'update'>('new');
    const [shouldForceAnimate, setShouldForceAnimate] = useState(true);

    // Crew module states
    const [crewRequests, setCrewRequests] = useState<any[]>([]);
    const [visibleCrewLinesCount, setVisibleCrewLinesCount] = useState(1);
    const [crewBriefState, setCrewBriefState] = useState<'new' | 'read' | 'update'>('new');
    const [compareCrewLines, setCompareCrewLines] = useState<string[]>([]);
    const [prevCrewLines, setPrevCrewLines] = useState<string[]>([]);
    const [crewStats, setCrewStats] = useState({
        crewPresentToday: 42,
        crewTotalActive: 53,
        leavesTodayCount: 3,
        sickTodayCount: 2,
        maxProjectName: 'Precision Gym',
        maxProjectCount: 12,
        activeProjectsCount: 7,
    });

    const { user, profile, attendanceStatus, todaySessions, isAuthenticated, profileStatus } = useUserContext();

    // Database operational stats
    const [stats, setStats] = useState({
        attendancePresent: 8,
        attendanceTotal: 12,
        attendanceDate: 'Jun 7',
        latestTeamMemberName: 'Budi',
    });
    const [briefStats, setBriefStats] = useState({
        weeklyHours: 42,
        weeklyOvertime: 0,
        weeklyLates: 0,
        weeklyAttendancePct: 100,
        monthlyDaysPresent: 17,
        monthlyHoursWorked: 148,
        monthlyAttendancePct: 95,
        annualLeaveLeft: 12,
        daysToNextLeave: null as number | null,
        streakOnTime: 0,
        teamWeeklyPct: 94,
        todayHours: 8,
        todayMins: 30,
        monthlyCompletionPct: 92,
        monthlyRemainingHours: 12,
        weeklyHoursList: [8.2, 7.8, 9.0, 8.0, 7.5, 6.0, 0] as (number | null)[],
        weeklyStatusesList: ['ontime', 'late', 'ontime', 'ontime', 'ontime', 'late', null] as (string | null)[],
    });
    const [loading, setLoading] = useState(true);
    const [aiBriefs, setAiBriefs] = useState<AIBriefs | null>(null);

    // Track minutes elapsed since last update
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedMinutes(prev => prev + 1);
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Load real data
    useEffect(() => {
        let isMounted = true;
        const loadRealData = async () => {
            if (!isAuthenticated || !user || profileStatus !== 'ready') {
                return;
            }
            try {
                const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000';
                let profilesList: { id: string; full_name: string }[] = [];
                let recentRecords: { date: string; user_id: string; clock_in: string | null }[] = [];
                let personalRecords: any[] = [];
                let leavesList: any[] = [];
                let financeRequestsList: any[] = [];
                let crewRequestsList: any[] = [];
                let crewPresentToday = 42;
                let crewTotalActive = 53;
                let leavesTodayCount = 3;
                let sickTodayCount = 2;
                let maxProjectName = 'Precision Gym';
                let maxProjectCount = 12;
                let activeProjectsCount = 7;

                if (isMockUser) {
                    profilesList = [
                        { id: 'm1', full_name: 'Adhika Amin' },
                        { id: 'm2', full_name: 'Alifia Rizky Rahma' },
                        { id: 'm3', full_name: 'Bimo Prabowo' },
                        { id: 'm4', full_name: 'Farisqi Dede' },
                        { id: 'm5', full_name: 'Kukuh Tegar' },
                        { id: 'm6', full_name: 'Mohamad Zaki' },
                        { id: 'm7', full_name: 'Raka Guruh' },
                        { id: 'm8', full_name: 'Budi Hartono' }
                    ];
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    recentRecords = [
                        { user_id: 'm6', date: todayStr, clock_in: `${todayStr}T08:07:00.000Z` },
                        { user_id: 'm8', date: todayStr, clock_in: `${todayStr}T08:04:00.000Z` }
                    ];

                    // Mock personal records for past 30 days
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = now.getMonth();
                    const todayDate = now.getDate();
                    for (let d = 1; d <= 30; d++) {
                        const dateObj = new Date(year, month, todayDate - d);
                        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
                        const dateStr = dateObj.toISOString().split('T')[0];
                        personalRecords.push({
                            user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                            date: dateStr,
                            clock_in: `${dateStr}T08:05:00.000Z`,
                            clock_out: `${dateStr}T17:15:00.000Z`,
                            status: (d === 3 || d === 10) ? 'late' : 'ontime',
                            totalMinutes: 9 * 60 + 10,
                            overtimeMinutes: d === 5 ? 120 : 0
                        });
                    }

                    leavesList = [
                        {
                            user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                            startDate: new Date(year, month, todayDate + 3).toISOString().split('T')[0],
                            endDate: new Date(year, month, todayDate + 5).toISOString().split('T')[0],
                            type: 'Annual Leave',
                            status: 'approved'
                        }
                    ];

                    financeRequestsList = [
                        {
                            id: 'f1',
                            user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                            category: 'Pembelian Material',
                            description: 'Pembelian material ACP untuk Fasad Proyek',
                            amount: 24000000,
                            status: 'APPROVED',
                            sourceType: 'Purchasing',
                            created_at: new Date(year, month, todayDate - 1, 10, 0, 0).toISOString(),
                            updated_at: new Date(year, month, todayDate, 14, 0, 0).toISOString(),
                        },
                        {
                            id: 'f2',
                            user_id: 'other_user_1',
                            category: 'Reimbursement',
                            description: 'Bensin dan Tol Kunjungan Lapangan',
                            amount: 350000,
                            status: 'PENDING',
                            sourceType: 'Reimbursement',
                            created_at: new Date(year, month, todayDate - 3, 9, 30, 0).toISOString(),
                            updated_at: new Date(year, month, todayDate - 3, 9, 30, 0).toISOString(),
                        },
                        {
                            id: 'f3',
                            user_id: 'other_user_2',
                            category: 'Purchase Request',
                            description: 'Baja Ringan dan Paku Proyek Cengkareng',
                            amount: 150000000,
                            status: 'PENDING',
                            sourceType: 'Purchasing',
                            created_at: new Date(year, month, todayDate, 11, 20, 0).toISOString(),
                            updated_at: new Date(year, month, todayDate, 11, 20, 0).toISOString(),
                        },
                        {
                            id: 'f4',
                            user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                            category: 'Reimbursement',
                            description: 'Makan Malam Koordinasi Subkon',
                            amount: 1200000,
                            status: 'REVISED',
                            sourceType: 'Reimbursement',
                            created_at: new Date(year, month, todayDate - 2, 16, 45, 0).toISOString(),
                            updated_at: new Date(year, month, todayDate - 1, 9, 0, 0).toISOString(),
                        }
                    ];

                    crewRequestsList = [
                        {
                            id: 'cr1',
                            crewId: 'c1',
                            crewName: 'Agus Santoso',
                            crewRole: 'CRAFTSMAN',
                            projectCode: 'P-001',
                            type: 'LEAVE',
                            amount: undefined,
                            startDate: new Date(year, month, todayDate + 2).toISOString().split('T')[0],
                            endDate: new Date(year, month, todayDate + 4).toISOString().split('T')[0],
                            reason: 'Sakit perlu istirahat',
                            status: 'PENDING',
                            createdAt: new Date().toISOString()
                        },
                        {
                            id: 'cr2',
                            crewId: 'c2',
                            crewName: 'Bambang Hermawan',
                            crewRole: 'HELPER',
                            projectCode: 'P-002',
                            type: 'KASBON',
                            amount: 150000,
                            startDate: new Date().toISOString().split('T')[0],
                            reason: 'Beli obat keluarga',
                            status: 'PENDING',
                            createdAt: new Date().toISOString()
                        }
                    ];
                } else {
                    const [pRes, rRes, personalRes, leavesRes, reimburseRes, purchasingRes, crewReqRes, crewMembersRes, crewLogsRes] = await Promise.all([
                        supabase.from('profiles').select('id, full_name'),
                        supabase.from('attendance_records').select('date, user_id, clock_in').order('date', { ascending: false }).limit(100),
                        supabase.from('attendance_records')
                            .select('*')
                            .eq('user_id', user?.id)
                            .order('date', { ascending: false }),
                        supabase.from('leave_requests')
                            .select('*')
                            .eq('user_id', user?.id)
                            .eq('status', 'approved'),
                        supabase.from('reimbursement_requests')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(200),
                        supabase.from('purchasing_requests')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(200),
                        supabase.from('crew_requests')
                            .select(`
                                id,
                                crew_id,
                                type,
                                amount,
                                start_date,
                                end_date,
                                reason,
                                status,
                                created_at
                            `)
                            .order('created_at', { ascending: false })
                            .limit(200),
                        supabase.from('crew_members').select('*'),
                        supabase.from('crew_daily_logs')
                            .select('*')
                            .gte('date', new Date().toISOString().split('T')[0])
                    ]);
                    profilesList = pRes.data || [];
                    recentRecords = rRes.data || [];
                    personalRecords = personalRes.data || [];
                    leavesList = (leavesRes.data || []).map((row: any) => ({
                        id: row.id,
                        userId: row.user_id,
                        type: row.type,
                        startDate: row.start_date,
                        endDate: row.end_date,
                        status: row.status
                    }));

                    const reimburseList = (reimburseRes.data || []).map((r: any) => ({
                        ...r,
                        sourceType: 'Reimbursement',
                        status: (r.status || '').toUpperCase()
                    }));

                    const purchasingList = (purchasingRes.data || []).map((r: any) => {
                        let statusVal = (r.approval_status || '').toUpperCase();
                        if (statusVal === 'SUBMITTED') {
                            statusVal = 'PENDING';
                        }
                        if (r.financial_status === 'PAID') {
                            statusVal = 'PAID';
                        }
                        return {
                            ...r,
                            sourceType: 'Purchasing',
                            status: statusVal,
                            user_id: r.created_by,
                            category: r.type || 'Purchase Request'
                        };
                    });

                    financeRequestsList = [...reimburseList, ...purchasingList].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );

                    const crewMembersList = crewMembersRes.data || [];
                    const crewMemberMap: Record<string, any> = {};
                    crewMembersList.forEach((m: any) => {
                        crewMemberMap[m.id] = m;
                    });

                    crewRequestsList = (crewReqRes.data || []).map((r: any) => {
                        const m = crewMemberMap[r.crew_id];
                        return {
                            id: r.id,
                            crewId: r.crew_id,
                            crewName: m?.name || 'Unknown',
                            crewRole: m?.role || 'HELPER',
                            type: r.type,
                            amount: r.amount ? Number(r.amount) : undefined,
                            startDate: r.start_date,
                            endDate: r.end_date,
                            reason: r.reason,
                            status: r.status,
                            createdAt: r.created_at
                        };
                    });
                    const crewLogsList = crewLogsRes.data || [];
                    crewTotalActive = crewMembersList.filter(m => m.status === 'ACTIVE').length || 53;
                    crewPresentToday = crewLogsList.filter(l => ['PRESENT', 'HALF_DAY'].includes(l.status?.toUpperCase())).length || 42;
                    leavesTodayCount = crewLogsList.filter(l => l.status?.toUpperCase() === 'CUTI').length || 3;
                    sickTodayCount = crewLogsList.filter(l => l.status?.toUpperCase() === 'ABSENT').length || 2;
 
                    const projectPresence: Record<string, number> = {};
                    const presentLogs = crewLogsList.filter(l => ['PRESENT', 'HALF_DAY'].includes(l.status?.toUpperCase()));
                    presentLogs.forEach(l => {
                        if (l.project_code) {
                            projectPresence[l.project_code] = (projectPresence[l.project_code] || 0) + 1;
                        }
                    });
 
                    maxProjectName = 'Precision Gym';
                    maxProjectCount = 12;
                    activeProjectsCount = Object.keys(projectPresence).length || 7;

                    let maxCode = '';
                    let maxVal = 0;
                    Object.entries(projectPresence).forEach(([code, val]) => {
                        if (val > maxVal) {
                            maxVal = val;
                            maxCode = code;
                        }
                    });
                    if (maxCode) {
                        maxProjectName = maxCode;
                        maxProjectCount = maxVal;
                    }

                    setCrewStats({
                        crewPresentToday,
                        crewTotalActive,
                        leavesTodayCount,
                        sickTodayCount,
                        maxProjectName,
                        maxProjectCount,
                        activeProjectsCount,
                    });
                }

                const realTotal = profilesList.length > 0 ? profilesList.length : 12;
                let realPresent = 0;
                let realLatestTeamMemberName = 'Budi';

                if (recentRecords.length > 0) {
                    const targetDate = recentRecords[0].date;
                    const dayRecords = recentRecords.filter(r => r.date === targetDate);
                    realPresent = dayRecords.length;

                    const firstRecord = dayRecords[0];
                    if (firstRecord) {
                        const profileObj = profilesList.find(p => p.id === firstRecord.user_id);
                        if (profileObj) {
                            realLatestTeamMemberName = profileObj.full_name?.split(' ')[0] || 'Budi';
                        }
                    }
                } else {
                    realPresent = 8;
                    realLatestTeamMemberName = 'Budi';
                }

                if (isMounted) {
                    setStats({
                        attendancePresent: realPresent,
                        attendanceTotal: realTotal,
                        attendanceDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        latestTeamMemberName: realLatestTeamMemberName,
                    });

                    // --- COMPUTE DETAILED STATS ---
                    // Compute today's active minutes
                    const activeSession = todaySessions.find(s => !s.clockOut);
                    const completedMinutes = todaySessions
                        .filter(s => s.clockOut)
                        .reduce((acc, s) => acc + s.durationMinutes, 0);
                    const todayMinutes = completedMinutes + (activeSession && attendanceStatus === 'checked-in'
                        ? Math.floor((Date.now() - new Date(activeSession.clockIn).getTime()) / 60000)
                        : 0);

                    // Compute weekly metrics
                    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
                    const weeklyRecords = personalRecords.filter(r => {
                        const recordDate = new Date(r.date);
                        return recordDate >= startOfCurrentWeek;
                    });
                    const weeklyMinutes = weeklyRecords.reduce((sum, r) => sum + (r.totalMinutes || r.total_minutes || 0), 0);
                    const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;
                    const weeklyOTMinutes = weeklyRecords.reduce((sum, r) => sum + (r.overtimeMinutes || r.overtime_minutes || 0), 0);
                    const weeklyOT = Math.round((weeklyOTMinutes / 60) * 10) / 10;
                    const weeklyLates = weeklyRecords.filter(r => r.status === 'late').length;

                    const currentDay = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
                    const weekdaysPassed = currentDay === 0 ? 5 : Math.min(5, currentDay);
                    const presentThisWeek = weeklyRecords.filter(r => ['ontime', 'intime', 'late'].includes(r.status)).length;
                    const weeklyAttendancePct = weekdaysPassed > 0 ? Math.round((presentThisWeek / weekdaysPassed) * 100) : 100;

                    // Compute monthly metrics
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const monthlyRecords = personalRecords.filter(r => {
                        const recordDate = new Date(r.date);
                        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
                    });
                    const monthlyDaysPresent = monthlyRecords.filter(r => ['ontime', 'intime', 'late'].includes(r.status)).length;
                    const monthlyMinutes = monthlyRecords.reduce((sum, r) => sum + (r.totalMinutes || r.total_minutes || 0), 0);
                    const monthlyHoursWorked = Math.round(monthlyMinutes / 60);

                    const getWorkDaysPassed = (date: Date) => {
                        const now = new Date();
                        const targetYear = date.getFullYear();
                        const targetMonth = date.getMonth();
                        const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();
                        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                        const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;
                        
                        let workDays = 0;
                        for (let day = 1; day <= limitDay; day++) {
                            const d = new Date(targetYear, targetMonth, day);
                            if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
                            workDays++;
                        }
                        return workDays;
                    };
                    const workDaysPassed = getWorkDaysPassed(new Date());
                    const monthlyAttendancePct = workDaysPassed > 0 ? Math.min(100, Math.round((monthlyDaysPresent / workDaysPassed) * 100)) : 100;

                    // Compute streak
                    let streakOnTime = 0;
                    const sortedRecords = [...personalRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    for (const r of sortedRecords) {
                        if (r.status === 'ontime' || r.status === 'intime') {
                            streakOnTime++;
                        } else {
                            break;
                        }
                    }

                    // Compute annual leaves
                    const approvedAnnualLeaves = leavesList.filter(l => l.type === 'Annual Leave' && l.status === 'approved');
                    const leavesDays = approvedAnnualLeaves.reduce((acc, l) => {
                        try {
                            const start = new Date(l.startDate);
                            const end = new Date(l.endDate);
                            const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                            return acc + (isNaN(diff) ? 0 : diff);
                        } catch {
                            return acc;
                        }
                    }, 0);
                    const annualLeaveLeft = Math.max(0, 12 - leavesDays);

                    // Compute upcoming leave countdown
                    let daysToNextLeave: number | null = null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const upcomingLeaves = leavesList
                        .filter(l => l.status === 'approved' && new Date(l.startDate) >= today)
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                    if (upcomingLeaves.length > 0) {
                        const nextLeaveStart = new Date(upcomingLeaves[0].startDate);
                        nextLeaveStart.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((nextLeaveStart.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
                        daysToNextLeave = diffDays;
                    }

                    // Compute hours and statuses for each day of the current week (Monday to Sunday)
                    const currentDayIdx = (new Date().getDay() + 6) % 7;
                    const weeklyHoursList = Array(7).fill(null).map((_, idx) => {
                        if (idx > currentDayIdx) {
                            return null; // Future day, leave empty
                        }
                        
                        const targetDate = new Date(startOfCurrentWeek);
                        targetDate.setDate(startOfCurrentWeek.getDate() + idx);
                        const targetDateStr = targetDate.toISOString().split('T')[0];
                        
                        if (idx === currentDayIdx) {
                            return Math.round((todayMinutes / 60) * 10) / 10;
                        }
                        
                        const dayRecord = personalRecords.find(r => r.date === targetDateStr);
                        if (dayRecord) {
                            const mins = dayRecord.totalMinutes || dayRecord.total_minutes || 0;
                            return Math.round((mins / 60) * 10) / 10;
                        }
                        
                        if (isMockUser) {
                            const mockHrs = [8.2, 7.8, 9.0, 8.0, 7.5, 6.0, 0];
                            return mockHrs[idx];
                        }
                        
                        return 0; // Past day with no check-in
                    });

                    const weeklyStatusesList = Array(7).fill(null).map((_, idx) => {
                        if (idx > currentDayIdx) {
                            return null; // Future day
                        }
                        
                        const targetDate = new Date(startOfCurrentWeek);
                        targetDate.setDate(startOfCurrentWeek.getDate() + idx);
                        const targetDateStr = targetDate.toISOString().split('T')[0];

                        if (idx === currentDayIdx) {
                            const todayRecord = personalRecords.find(r => r.date === targetDateStr);
                            if (todayRecord) {
                                return todayRecord.status || 'ontime';
                            }
                            if (attendanceStatus === 'checked-in') {
                                const firstSession = todaySessions[0];
                                if (firstSession && firstSession.clockIn) {
                                    const clockInDate = new Date(firstSession.clockIn);
                                    const clockInTime = clockInDate.getHours() * 60 + clockInDate.getMinutes();
                                    return clockInTime > 8 * 60 ? 'late' : 'ontime'; // after 08:00 AM
                                }
                                return 'ontime';
                            }
                            return null;
                        }
                        
                        const dayRecord = personalRecords.find(r => r.date === targetDateStr);
                        if (dayRecord) {
                            return dayRecord.status || 'ontime';
                        }
                        
                        if (isMockUser) {
                            const mockStatuses = ['ontime', 'late', 'ontime', 'ontime', 'ontime', 'late', null];
                            return mockStatuses[idx];
                        }
                        
                        return null; // Past day with no check-in
                    });

                    setBriefStats({
                        weeklyHours,
                        weeklyOvertime: weeklyOT,
                        weeklyLates,
                        weeklyAttendancePct,
                        monthlyDaysPresent,
                        monthlyHoursWorked,
                        monthlyAttendancePct,
                        annualLeaveLeft,
                        daysToNextLeave,
                        streakOnTime,
                        teamWeeklyPct: 94,
                        todayHours: Math.floor(todayMinutes / 60),
                        todayMins: todayMinutes % 60,
                        monthlyCompletionPct: Math.min(100, Math.round((monthlyHoursWorked / 160) * 100)),
                        monthlyRemainingHours: Math.max(0, 160 - monthlyHoursWorked),
                        weeklyHoursList,
                        weeklyStatusesList,
                    });

                    setFinanceRequests(financeRequestsList);
                    setCrewRequests(crewRequestsList);

                    // --- INTEGRATE GEMINI API BRIEF GENERATOR ---
                    const getAndCacheGeminiBriefs = async () => {
                        if (!user?.id) return;
                        const cached = await getCachedAIBriefs(user.id);
                        if (cached) {
                            setAiBriefs(cached);
                            return;
                        }

                        const nameVal = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Adi';
                        const roleVal = profile?.role || 'supervisor';
                        const isApproverVal = ['superadmin', 'admin', 'administrator', 'hr', 'pm', 'manager', 'management', 'ceo', 'owner', 'supervisor'].includes(roleVal);

                        let oldestPendingDaysVal = 0;
                        let oldestCategoryVal = '';
                        const pendingForApprover = financeRequestsList.filter(r => r.status?.toUpperCase() === 'PENDING');
                        pendingForApprover.forEach(r => {
                            const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
                            if (days > oldestPendingDaysVal) {
                                oldestPendingDaysVal = days;
                                oldestCategoryVal = r.category || 'request';
                            }
                        });

                        const myRequests = financeRequestsList.filter(r => r.user_id === user?.id);
                        const activeRequests = myRequests.filter(r => ['PENDING', 'REVISED'].includes(r.status?.toUpperCase()));
                        const recentlyApproved = myRequests.filter(r => {
                            const isApproved = r.status?.toUpperCase() === 'APPROVED';
                            if (!isApproved) return false;
                            const hoursPassed = (Date.now() - new Date(r.updated_at).getTime()) / (3600 * 1000);
                            return hoursPassed <= 24;
                        });
                        const recentlyRevised = myRequests.filter(r => {
                            const isRevised = r.status?.toUpperCase() === 'REVISED';
                            if (!isRevised) return false;
                            const hoursPassed = (Date.now() - new Date(r.updated_at).getTime()) / (3600 * 1000);
                            return hoursPassed <= 24;
                        });

                        const outlier = pendingForApprover.find(r => r.amount >= 10000000);
                        const totalAmount = pendingForApprover.reduce((sum, r) => sum + (r.amount || 0), 0);

                        let oldestPendingHoursVal = 0;
                        activeRequests.forEach(r => {
                            const hrs = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (3600 * 1000));
                            if (hrs > oldestPendingHoursVal) {
                                oldestPendingHoursVal = hrs;
                            }
                        });

                        const myPendingCrew = crewRequestsList.filter(r => r.status?.toUpperCase() === 'PENDING');

                        let currentHour = new Date().getHours();
                        try {
                            const hourStr = new Intl.DateTimeFormat('en-US', {
                                timeZone: 'Asia/Jakarta',
                                hour: 'numeric',
                                hour12: false
                            }).format(new Date());
                            currentHour = parseInt(hourStr, 10);
                        } catch (e) {}
                        const timeContext = currentHour >= 22 || currentHour < 4 ? 'Night' 
                                            : currentHour < 12 ? 'Morning' 
                                            : currentHour < 18 ? 'Afternoon' 
                                            : 'Evening';
                        const currentString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                        let localClockInStr = '';
                        const firstSessionObj = todaySessions ? todaySessions[0] : null;
                        if (attendanceStatus === 'checked-in' && firstSessionObj && firstSessionObj.clockIn) {
                            try {
                                const d = new Date(firstSessionObj.clockIn);
                                localClockInStr = d.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                });
                            } catch (e) {}
                        }

                        const generated = await fetchGeminiAIBriefs({
                            userId: user.id,
                            currentTime: currentString,
                            timeOfDayContext: timeContext,
                            name: nameVal,
                            role: roleVal,
                            attendanceStatus,
                            clockInTimeStr: localClockInStr,
                            briefStats: {
                                todayHours: Math.floor(todayMinutes / 60),
                                todayMins: todayMinutes % 60,
                                weeklyHours,
                                weeklyOvertime: weeklyOT,
                                weeklyLates,
                                streakOnTime: briefStats.streakOnTime,
                                teamWeeklyPct: briefStats.teamWeeklyPct,
                                monthlyCompletionPct: Math.min(100, Math.round((monthlyHoursWorked / 160) * 100)),
                                monthlyRemainingHours: Math.max(0, 160 - monthlyHoursWorked),
                                monthlyAttendancePct: briefStats.monthlyAttendancePct,
                                monthlyDaysPresent,
                                annualLeaveLeft,
                                daysToNextLeave
                            },
                            financeStats: {
                                isApprover: isApproverVal,
                                pendingCount: pendingForApprover.length,
                                oldestCategory: oldestCategoryVal,
                                oldestPendingDays: oldestPendingDaysVal,
                                totalAmount,
                                outlierText: outlier ? `${outlier.category} amounting to ${formatCurrency(outlier.amount)}` : '',
                                myActiveCount: activeRequests.length,
                                myApprovedCount: recentlyApproved.length,
                                myRevisedCount: recentlyRevised.length,
                                myOldestDays: Math.floor(oldestPendingHoursVal / 24),
                                myOldestHours: oldestPendingHoursVal % 24
                            },
                            crewStats: {
                                isApprover: isApproverVal,
                                crewPresentToday,
                                activeProjectsCount,
                                maxProjectName,
                                maxProjectCount,
                                leavesTodayCount,
                                sickTodayCount,
                                pendingRequestsCount: crewRequestsList.filter(r => r.status?.toUpperCase() === 'PENDING').length,
                                crewTotalActive,
                                myPendingCount: myPendingCrew.length
                            }
                        });

                        if (generated && isMounted) {
                            setAiBriefs(generated);
                        }
                    };

                    getAndCacheGeminiBriefs();

                    setLoading(false);
                    setUpdateKey(prev => prev + 1);
                }
            } catch (err) {
                console.error("Error loading briefing data:", err);
                if (isMounted) setLoading(false);
            }
        };

        loadRealData();
        return () => { isMounted = false; };
    }, [user, refreshTrigger, profileStatus, isAuthenticated]);

    // Simulated updates for Clock, Finance, and Crew (staggered)
    useEffect(() => {
        if (hasUpdates) return;
        
        // Timer for Clock Brief Update (12 seconds)
        const clockTimer = setTimeout(() => {
            setHasUpdates(true);
            setStats(prev => ({
                ...prev,
                attendancePresent: prev.attendancePresent + 1,
                latestTeamMemberName: 'Farisqi'
            }));
            setElapsedMinutes(0); // reset elapsed timer
            setBriefState('update');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }, 12000);

        // Timer for Finance Brief Update (24 seconds)
        const financeTimer = setTimeout(() => {
            setFinanceBriefState('update');
            setElapsedMinutes(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }, 24000);

        // Timer for Crew Brief Update (36 seconds)
        const crewTimer = setTimeout(() => {
            setCrewBriefState('update');
            setElapsedMinutes(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }, 36000);

        return () => {
            clearTimeout(clockTimer);
            clearTimeout(financeTimer);
            clearTimeout(crewTimer);
        };
    }, [hasUpdates]);

    // Handle pull to refresh reset
    useEffect(() => {
        if (refreshTrigger > 0) {
            setHasUpdates(false);
            setBriefState('new');
            setFinanceBriefState('new');
            setCrewBriefState('new');
            setIsTypingComplete(false);
            setVisibleLinesCount(1);
            setVisibleFinanceLinesCount(1);
            setVisibleCrewLinesCount(1);
            setElapsedMinutes(0);
            setShouldForceAnimate(true);
            setUpdateKey(prev => prev + 1);
        }
    }, [refreshTrigger]);

    // Reset typewriter cascader on key update
    useEffect(() => {
        setVisibleLinesCount(1);
        setVisibleFinanceLinesCount(1);
        setVisibleCrewLinesCount(1);
        setIsTypingComplete(false);
    }, [updateKey]);

    const handleCardPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (briefState === 'update') {
            setBriefState('new');
            setUpdateKey(prev => prev + 1);
        } else {
            setBriefState(prev => prev === 'new' ? 'read' : 'new');
        }
    };

    const handleFinanceCardPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (financeBriefState === 'update') {
            setFinanceBriefState('new');
            setUpdateKey(prev => prev + 1);
        } else {
            setFinanceBriefState(prev => prev === 'new' ? 'read' : 'new');
        }
    };

    const handleCrewCardPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (crewBriefState === 'update') {
            setCrewBriefState('new');
            setUpdateKey(prev => prev + 1);
        } else {
            setCrewBriefState(prev => prev === 'new' ? 'read' : 'new');
        }
    };

    // Calculate time for copywriting
    let hour = new Date().getHours();
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jakarta',
            hour: 'numeric',
            hour12: false
        }).format(new Date());
        hour = parseInt(hourStr, 10);
    } catch (e) {}
    const isNight = hour >= 18 || hour < 4;
    const isAfternoon = hour >= 12 && hour < 18;
    const isMorning = hour >= 4 && hour < 12;

    let clockInTimeStr = '';
    const firstSession = todaySessions ? todaySessions[0] : null;
    if (attendanceStatus === 'checked-in' && firstSession && firstSession.clockIn) {
        try {
            const date = new Date(firstSession.clockIn);
            clockInTimeStr = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {}
    }

    // Generate Conversational Brief Lines based on Role and time in English (Encouraging, dynamic, multi-layered)
    const getBriefLines = () => {
        const name = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Adi';
        const role = profile?.role || 'supervisor';

        const isManager = ['superadmin', 'admin', 'administrator', 'hr', 'pm', 'manager', 'management', 'ceo', 'owner'].includes(role);
        const isSupervisor = role === 'supervisor';

        // --- LAYER 1: Today ---
        let line1 = '';
        if (isNight) {
            // Night time summary
            line1 = `Today you have logged **${briefStats.todayHours}h ${briefStats.todayMins}m** of work.`;
        } else {
            // Day time status
            if (attendanceStatus === 'checked-in') {
                line1 = `You are clocked in! Started today at **${clockInTimeStr || 'this morning'}**.`;
            } else {
                line1 = `No active check-in detected for today. Ready to start?`;
            }
        }

        // --- LAYER 2: Weekly Insights & Streaks ---
        let line2 = '';
        if (isSupervisor || isManager) {
            line2 = `Your team has a strong on-time record of **${briefStats.teamWeeklyPct}%** this week.`;
        } else if (briefStats.streakOnTime >= 3) {
            line2 = `Great job! You checked in on time for **${briefStats.streakOnTime} days in a row**.`;
        } else if (briefStats.weeklyLates === 0) {
            line2 = `You've been perfectly on time this week. No late check-ins! 🌟`;
        } else {
            line2 = `You've worked **${briefStats.weeklyHours} hours** this week, including **${briefStats.weeklyOvertime} hours** of overtime.`;
        }

        // Adjust for encouraging advice if they have lates
        if (briefStats.weeklyLates > 0 && !line2.includes('late') && Math.random() > 0.4) {
            line2 = `You had **${briefStats.weeklyLates} late check-ins** this week. Plenty of time to turn it around!`;
        }

        // --- LAYER 3: Monthly & Future Insights ---
        let line3 = '';
        if (isNight) {
            // Night target progress
            line3 = `You have completed **${briefStats.monthlyCompletionPct}%** of your monthly goal. Just **${briefStats.monthlyRemainingHours} hours** left.`;
        } else if (briefStats.daysToNextLeave !== null) {
            line3 = `Your annual leave is coming up in **${briefStats.daysToNextLeave} days**. Hope you're ready!`;
        } else {
            line3 = `Your attendance rate is at **${briefStats.monthlyAttendancePct}%** across **${briefStats.monthlyDaysPresent} workdays** this month.`;
        }

        // Adjust for leave balance if they have leaves left
        if (line3.includes('attendance') && briefStats.annualLeaveLeft > 0 && Math.random() > 0.5) {
            line3 = `You still have **${briefStats.annualLeaveLeft} days** of annual leave left to use.`;
        }

        return [line1, line2, line3].filter(Boolean);
    };

    // Generate Conversational Brief Lines for Finance in English (Editorial Engine)
    const getFinanceBriefLines = (requests: any[]) => {
        const name = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Adi';
        const role = profile?.role || 'supervisor';
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';

        // 'supervisor' is an approver in Adidaya
        const isApprover = ['superadmin', 'admin', 'administrator', 'hr', 'pm', 'manager', 'management', 'ceo', 'owner', 'supervisor'].includes(role);

        // Filter requests
        const myRequests = requests.filter(r => r.user_id === userId);
        const pendingForApprover = requests.filter(r => r.status?.toUpperCase() === 'PENDING');

        const linesList: string[] = [];

        if (isApprover) {
            // --- APPROVER PERSPECTIVE ---
            const totalPending = pendingForApprover.length;

            if (totalPending === 0) {
                // Semantic success: All clear
                linesList.push(`All requests requiring your approval have been processed. Great job! ✨`);
            } else {
                // Rule 1: Group pending count
                linesList.push(`There are *r*${totalPending} pending requests*r* waiting for your decision.`);

                // Rule 3: Prioritize Age (Oldest pending request)
                let oldestPendingDays = 0;
                let oldestCategory = '';
                pendingForApprover.forEach(r => {
                    const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
                    if (days > oldestPendingDays) {
                        oldestPendingDays = days;
                        oldestCategory = r.category || 'request';
                    }
                });

                if (oldestPendingDays >= 1) {
                    linesList.push(`The oldest request (*r*${oldestCategory}*r*) has been waiting for *r*${oldestPendingDays} days*r*.`);
                } else {
                    const recentRequest = pendingForApprover.find(r => {
                        const mins = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000);
                        return mins > 0 && mins < 60;
                    });
                    if (recentRequest) {
                        const mins = Math.floor((Date.now() - new Date(recentRequest.created_at).getTime()) / 60000);
                        linesList.push(`The latest request was submitted **${mins} minutes ago**.`);
                    }
                }

                // Rule 2: Highlight Outlier
                const outlier = pendingForApprover.find(r => r.amount >= 10000000);
                const totalAmount = pendingForApprover.reduce((sum, r) => sum + (r.amount || 0), 0);

                linesList.push(`The total value of pending requests is currently **${formatCurrency(totalAmount)}**.`);

                if (outlier) {
                    linesList.push(`One request for *r*${outlier.category}*r* is quite large at **${formatCurrency(outlier.amount)}** and may need closer look.`);
                }
            }
        } else {
            // --- INPUTTER / STAFF PERSPECTIVE ---
            const activeRequests = myRequests.filter(r => ['PENDING', 'REVISED'].includes(r.status?.toUpperCase()));
            const recentlyApproved = myRequests.filter(r => {
                const isApproved = r.status?.toUpperCase() === 'APPROVED';
                if (!isApproved) return false;
                const hoursPassed = (Date.now() - new Date(r.updated_at).getTime()) / (3600 * 1000);
                return hoursPassed <= 24; // approved in last 24h
            });
            const recentlyRevised = myRequests.filter(r => {
                const isRevised = r.status?.toUpperCase() === 'REVISED';
                if (!isRevised) return false;
                const hoursPassed = (Date.now() - new Date(r.updated_at).getTime()) / (3600 * 1000);
                return hoursPassed <= 24; // revised in last 24h
            });

            if (recentlyApproved.length > 0) {
                // Status change
                const approvedItem = recentlyApproved[0];
                if (recentlyApproved.length === 1) {
                    linesList.push(`Good news! Your request for *g*${approvedItem.category}*g* of **${formatCurrency(approvedItem.amount)}** has been approved.`);
                } else {
                    linesList.push(`Good news! *g*${recentlyApproved.length} of your requests*g* have been approved.`);
                }
            } else if (recentlyRevised.length > 0) {
                // Revision status change
                const revisedItem = recentlyRevised[0];
                linesList.push(`Your request for *r*${revisedItem.category}*r* has been sent back for *r*revision*r*.`);
            } else if (activeRequests.length > 0) {
                // Rule 1: Group active
                linesList.push(`You currently have **${activeRequests.length} requests** waiting for approval.`);
                
                let oldestPendingHours = 0;
                activeRequests.forEach(r => {
                    const hrs = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (3600 * 1000));
                    if (hrs > oldestPendingHours) {
                        oldestPendingHours = hrs;
                    }
                });

                if (oldestPendingHours >= 24) {
                    const days = Math.floor(oldestPendingHours / 24);
                    linesList.push(`Your oldest request has been waiting for *r*${days} days*r*.`);
                } else if (oldestPendingHours >= 1) {
                    linesList.push(`Your oldest request has been waiting for *r*${oldestPendingHours} hours*r*.`);
                }
            } else {
                linesList.push(`All your requests have been successfully processed. No further action is required.`);
            }
        }

        return linesList.filter(Boolean);
    };

    // Generate Conversational Brief Lines for Crew in English
    const getCrewBriefLines = (requestsList: any[]) => {
        const name = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Adi';
        const role = profile?.role || 'supervisor';
        const isApproverUser = ['superadmin', 'admin', 'administrator', 'hr', 'pm', 'manager', 'management', 'ceo', 'owner', 'supervisor'].includes(role);
        const linesList: string[] = [];

        // Greeting (Removed - already in page header)

        if (isApproverUser) {
            // --- APPROVER PERSPECTIVE ---
            // 1. Crew Attendance & Active Projects
            if (crewStats.crewPresentToday > 0) {
                linesList.push(`Today, **${crewStats.crewPresentToday} workers** are present across **${crewStats.activeProjectsCount} active projects**.`);
                if (crewStats.maxProjectName && crewStats.maxProjectCount > 0) {
                    linesList.push(`**${crewStats.maxProjectName}** has the highest attendance today with **${crewStats.maxProjectCount} workers**.`);
                }
            } else {
                linesList.push(`No crew attendance recorded today yet.`);
            }

            // 2. Absence & Sick Leaves
            const absenceTexts: string[] = [];
            if (crewStats.leavesTodayCount > 0) {
                absenceTexts.push(`**${crewStats.leavesTodayCount} workers** are on leave`);
            }
            if (crewStats.sickTodayCount > 0) {
                absenceTexts.push(`**${crewStats.sickTodayCount}** are out sick`);
            }
            if (absenceTexts.length > 0) {
                linesList.push(`Today, ${absenceTexts.join(' and ')}.`);
            }

            // 3. Pending requests queue
            const pendingRequests = requestsList.filter(r => r.status?.toUpperCase() === 'PENDING');
            if (pendingRequests.length > 0) {
                linesList.push(`There are **${pendingRequests.length} crew requests** waiting for your approval.`);
            } else {
                linesList.push(`All crew requests have been processed. Weekly payroll will run for **${crewStats.crewTotalActive} workers**.`);
            }
        } else {
            // --- PERSONAL STAFF PERSPECTIVE ---
            const myPending = requestsList.filter(r => r.status?.toUpperCase() === 'PENDING');
            if (myPending.length > 0) {
                linesList.push(`You currently have **${myPending.length} requests** pending review.`);
            } else {
                linesList.push("Your crew requests and attendance logs are fully up-to-date.");
            }
        }

        return linesList.filter(Boolean);
    };

    const lines = aiBriefs?.clockBrief || getBriefLines();
    const financeLines = aiBriefs?.financeBrief || getFinanceBriefLines(financeRequests);
    const crewLines = aiBriefs?.crewBrief || getCrewBriefLines(crewRequests);
    const summaryLine = lines.join(' ');

    const relativeTime = elapsedMinutes === 0 
        ? 'Updated just now' 
        : `Updated ${elapsedMinutes}m ago`;

    // Track previous lines to animate only the new updates
    const [compareLines, setCompareLines] = useState<string[]>([]);
    const [compareFinanceLines, setCompareFinanceLines] = useState<string[]>([]);
    const [prevLines, setPrevLines] = useState<string[]>([]);
    const [prevFinanceLines, setPrevFinanceLines] = useState<string[]>([]);

    useEffect(() => {
        setPrevLines(compareLines);
        setPrevFinanceLines(compareFinanceLines);
        setPrevCrewLines(compareCrewLines);
        setCompareLines(lines);
        setCompareFinanceLines(financeLines);
        setCompareCrewLines(crewLines);
        
        // Reset the force animate flag after the update render starts
        const timer = setTimeout(() => {
            setShouldForceAnimate(false);
        }, 100);
        return () => clearTimeout(timer);
    }, [updateKey]);

    const isApprover = ['superadmin', 'admin', 'administrator', 'hr', 'pm', 'manager', 'management', 'ceo', 'owner', 'supervisor'].includes(profile?.role || 'supervisor');
    const pendingForApprover = financeRequests.filter(r => r.status?.toUpperCase() === 'PENDING');
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    const myRequests = financeRequests.filter(r => r.user_id === userId);

    const latestRequest = isApprover 
        ? (pendingForApprover.length > 0 ? pendingForApprover[0] : null)
        : (myRequests.length > 0 ? myRequests[0] : null);
    const latestStatus = latestRequest ? latestRequest.status : 'PENDING';

    const pendingReimburse = pendingForApprover.filter(r => r.sourceType === 'Reimbursement');
    const pendingPurchasing = pendingForApprover.filter(r => r.sourceType === 'Purchasing');

    const myPendingReimburse = myRequests.filter(r => r.sourceType === 'Reimbursement' && ['PENDING', 'REVISED'].includes(r.status));
    const myPendingPurchasing = myRequests.filter(r => r.sourceType === 'Purchasing' && ['PENDING', 'REVISED'].includes(r.status));

    const chartReimburseCount = isApprover ? pendingReimburse.length : myPendingReimburse.length;
    const chartReimburseAmount = isApprover 
        ? pendingReimburse.reduce((sum, r) => sum + (r.amount || 0), 0)
        : myPendingReimburse.reduce((sum, r) => sum + (r.amount || 0), 0);

    const chartPurchasingCount = isApprover ? pendingPurchasing.length : myPendingPurchasing.length;
    const chartPurchasingAmount = isApprover 
        ? pendingPurchasing.reduce((sum, r) => sum + (r.amount || 0), 0)
        : myPendingPurchasing.reduce((sum, r) => sum + (r.amount || 0), 0);

    const CARD_WIDTH = SCREEN_WIDTH - 52;
    const GAP = 12;
    const PAGE_WIDTH = CARD_WIDTH + GAP;

    let clockAccumulatedDelay = 0;
    const clockDelays = lines.map((line, idx) => {
        const isLineNew = prevLines.length > 0 && prevLines[idx] !== line;
        const shouldAnimate = shouldForceAnimate || isLineNew;
        if (!shouldAnimate) return 0;
        const currentDelay = clockAccumulatedDelay;
        clockAccumulatedDelay += line.length * 10 + 150;
        return currentDelay;
    });

    let financeAccumulatedDelay = 0;
    const financeDelays = financeLines.map((line, idx) => {
        const isLineNew = prevFinanceLines.length > 0 && prevFinanceLines[idx] !== line;
        const shouldAnimate = shouldForceAnimate || isLineNew;
        if (!shouldAnimate) return 0;
        const currentDelay = financeAccumulatedDelay;
        financeAccumulatedDelay += line.length * 10 + 150;
        return currentDelay;
    });

    let crewAccumulatedDelay = 0;
    const crewDelays = crewLines.map((line, idx) => {
        const isLineNew = prevCrewLines.length > 0 && prevCrewLines[idx] !== line;
        const shouldAnimate = shouldForceAnimate || isLineNew;
        if (!shouldAnimate) return 0;
        const currentDelay = crewAccumulatedDelay;
        crewAccumulatedDelay += line.length * 10 + 150;
        return currentDelay;
    });

    // Reanimated animated values
    const borderGlow = useSharedValue(0);

    useEffect(() => {
        if (briefState === 'update' || financeBriefState === 'update' || crewBriefState === 'update') {
            borderGlow.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000 }),
                    withTiming(0.2, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            borderGlow.value = 0;
        }
    }, [briefState, financeBriefState, crewBriefState]);

    const animatedCardStyle = useAnimatedStyle(() => {
        const borderVal = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        const shadowOpacityVal = isDark ? 0.25 : 0.08;
        const shadowRadiusVal = isDark ? 8 : 16;
        
        // Clock module blue glow instead of red
        const updateColorHex = '#3B82F6';
        const updateColorRgba = 'rgba(59, 130, 246,';
        
        return {
            minHeight: 260,
            borderColor: briefState === 'update' 
                ? `${updateColorRgba} ${borderGlow.value})`
                : borderVal,
            shadowColor: briefState === 'update' ? updateColorHex : '#000000',
            shadowOpacity: withTiming(briefState === 'update' ? 0.35 : shadowOpacityVal),
            shadowRadius: withTiming(briefState === 'update' ? 12 : shadowRadiusVal),
        };
    }, [briefState, isDark]);

    const animatedFinanceCardStyle = useAnimatedStyle(() => {
        const borderVal = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        const shadowOpacityVal = isDark ? 0.25 : 0.08;
        const shadowRadiusVal = isDark ? 8 : 16;
        
        // Finance module red/pink glow
        const updateColorHex = '#EF4444';
        const updateColorRgba = 'rgba(239, 68, 68,';
        
        return {
            minHeight: 260,
            borderColor: financeBriefState === 'update' 
                ? `${updateColorRgba} ${borderGlow.value})`
                : borderVal,
            shadowColor: financeBriefState === 'update' ? updateColorHex : '#000000',
            shadowOpacity: withTiming(financeBriefState === 'update' ? 0.35 : shadowOpacityVal),
            shadowRadius: withTiming(financeBriefState === 'update' ? 12 : shadowRadiusVal),
        };
    }, [financeBriefState, isDark]);

    const animatedCrewCardStyle = useAnimatedStyle(() => {
        const borderVal = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        const shadowOpacityVal = isDark ? 0.25 : 0.08;
        const shadowRadiusVal = isDark ? 8 : 16;
        
        // Crew module purple glow
        const updateColorHex = '#8B5CF6';
        const updateColorRgba = 'rgba(139, 92, 246,';
        
        return {
            minHeight: 260,
            borderColor: crewBriefState === 'update' 
                ? `${updateColorRgba} ${borderGlow.value})`
                : borderVal,
            shadowColor: crewBriefState === 'update' ? updateColorHex : '#000000',
            shadowOpacity: withTiming(crewBriefState === 'update' ? 0.35 : shadowOpacityVal),
            shadowRadius: withTiming(crewBriefState === 'update' ? 12 : shadowRadiusVal),
        };
    }, [crewBriefState, isDark]);

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / PAGE_WIDTH);
        if (page !== currentPage) {
            setCurrentPage(page);
        }
    };

    // Automatic read receipt when swiping/scrolling to the card
    useEffect(() => {
        if (currentPage === 0 && briefState === 'update') {
            setBriefState('new');
        } else if (currentPage === 1 && financeBriefState === 'update') {
            setFinanceBriefState('new');
        } else if (currentPage === 2 && crewBriefState === 'update') {
            setCrewBriefState('new');
        }
    }, [currentPage, briefState, financeBriefState, crewBriefState]);

    // Auto-scroll when any brief card gets an update, prioritizing Clock > Finance > Crew
    useEffect(() => {
        if (briefState === 'update') {
            scrollViewRef.current?.scrollTo({ x: 0 * PAGE_WIDTH, animated: true });
        } else if (financeBriefState === 'update') {
            scrollViewRef.current?.scrollTo({ x: 1 * PAGE_WIDTH, animated: true });
        } else if (crewBriefState === 'update') {
            scrollViewRef.current?.scrollTo({ x: 2 * PAGE_WIDTH, animated: true });
        }
    }, [briefState, financeBriefState, crewBriefState, PAGE_WIDTH]);

    if (!isAuthenticated || !user) {
        return (
            <View style={styles.wrapper}>
                <View style={{ paddingHorizontal: 20 }}>
                    <Animated.View style={styles.animatedCardWrapper}>
                        <LinearGradient
                            colors={isDark ? ['#1C1C1E', '#182438'] : ['#FFFFFF', '#F2F7FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.homeCardContent, { minHeight: 180, paddingVertical: 24, borderRadius: 28 }]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.headerLeft}>
                                    <View style={[styles.headerBadgeContainer, { 
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                        borderWidth: 1 
                                    }]}>
                                        <Text style={[styles.headerBadgeText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                                            Forma Brief
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.cardBodyConversational, { marginTop: 16, marginBottom: 18 }]}>
                                <Text style={{ 
                                    fontSize: 15, 
                                    lineHeight: 22, 
                                    fontWeight: '500', 
                                    color: isDark ? '#FFFFFF' : '#1C1C1E' 
                                }}>
                                    You're not signed in yet. Sign in to view your daily brief, manage projects, collaborate with your team, and access your operational workspace.
                                </Text>
                            </View>

                            <PillButton
                                label="Sign In to Your Account"
                                onPress={() => router.push('/login')}
                                variant="solid"
                                color="blue"
                                icon={<PlatformIcon name="rectangle.portrait.and.arrow.right" size={16} tintColor="#FFFFFF" />}
                                style={{ alignSelf: 'flex-start', backgroundColor: '#007AFF' }}
                            />
                        </LinearGradient>
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={PAGE_WIDTH}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                style={{ width: SCREEN_WIDTH }}
                contentContainerStyle={{
                    paddingLeft: 20,
                    paddingRight: SCREEN_WIDTH - CARD_WIDTH - 20
                }}
            >
                {/* PAGE 1: Clock Brief */}
                <View style={{ width: PAGE_WIDTH, alignItems: 'flex-start' }}>
                    <Pressable onPress={handleCardPress} style={{ width: CARD_WIDTH }}>
                        <Animated.View style={[
                            styles.animatedCardWrapper,
                            animatedCardStyle
                        ]}>
                            <LinearGradient
                                colors={isDark ? ['#1C1C1E', '#182438'] : ['#FFFFFF', '#F2F7FF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.homeCardContent}
                            >
                                {/* Header Row */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.headerLeft}>
                                        <View style={[
                                            styles.headerBadgeContainer,
                                            { 
                                                backgroundColor: briefState === 'update'
                                                    ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                                                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)'),
                                                borderColor: briefState === 'update'
                                                    ? (isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)')
                                                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                                                borderWidth: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.headerBadgeText, 
                                                { 
                                                    color: briefState === 'update'
                                                        ? '#3B82F6'
                                                        : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') 
                                                }
                                            ]}>
                                                {briefState === 'update' ? 'NEW UPDATE' : 'CLOCK BRIEF'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push('/home/brief-detail');
                                        }}
                                        style={({ pressed }) => [
                                            styles.headerArrowContainer,
                                            { 
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                borderWidth: 1
                                            },
                                            pressed && { opacity: 0.7 }
                                        ]}
                                    >
                                        <PlatformIcon name="arrow.up.forward" size={13} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                                    </Pressable>
                                </View>

                                {/* Visualizer & Conversational Text */}
                                <View style={styles.cardBodyConversational}>
                                    {/* Minimalist Visual Attendance Trend inside Expanded Card at the Top */}
                                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.chartContainerInsideCard}>
                                        <WeeklyBarChart 
                                            active={currentPage === 0} 
                                            weeklyHours={briefStats.weeklyHoursList} 
                                            weeklyStatuses={briefStats.weeklyStatusesList} 
                                        />
                                    </Animated.View>

                                    <View style={{ height: 16 }} />

                                    <View style={styles.briefTextContainer}>
                                        {lines.map((line, idx) => {
                                            const isLineNew = prevLines.length > 0 && prevLines[idx] !== line;
                                            return (
                                                <TypewriterLine
                                                    key={`${idx}-${updateKey}`}
                                                    text={line}
                                                    delay={clockDelays[idx]}
                                                    speed={10}
                                                    textColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                                                    active={currentPage === 0}
                                                    animate={shouldForceAnimate || isLineNew}
                                                    onComplete={() => {
                                                        if (idx === lines.length - 1) {
                                                            setIsTypingComplete(true);
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Footer Section */}
                                <View style={styles.cardFooterSectionConversational}>
                                    <Text style={[styles.updatedText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                                        {relativeTime}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </Pressable>
                </View>

                {/* PAGE 2: Finance Brief */}
                <View style={{ width: PAGE_WIDTH, alignItems: 'flex-start' }}>
                    <Pressable onPress={handleFinanceCardPress} style={{ width: CARD_WIDTH }}>
                        <Animated.View style={[
                            styles.animatedCardWrapper,
                            animatedFinanceCardStyle
                        ]}>
                            <LinearGradient
                                colors={isDark ? ['#1C1C1E', '#3A1C20'] : ['#FFFFFF', '#FFF2F4']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.homeCardContent}
                            >
                                {/* Header Row */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.headerLeft}>
                                        <View style={[
                                            styles.headerBadgeContainer,
                                            { 
                                                backgroundColor: financeBriefState === 'update'
                                                    ? (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(225, 29, 72, 0.1)')
                                                    : (isDark ? 'rgba(244, 114, 182, 0.15)' : 'rgba(225, 29, 72, 0.08)'),
                                                borderColor: financeBriefState === 'update'
                                                    ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(225, 29, 72, 0.15)')
                                                    : (isDark ? 'rgba(244, 114, 182, 0.3)' : 'rgba(225, 29, 72, 0.15)'),
                                                borderWidth: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.headerBadgeText, 
                                                { 
                                                    color: financeBriefState === 'update'
                                                        ? (isDark ? '#F87171' : '#D32F2F')
                                                        : (isDark ? '#F472B6' : '#E11D48')
                                                }
                                            ]}>
                                                {financeBriefState === 'update' ? 'NEW UPDATE' : 'FINANCE BRIEF'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push('/home/brief-detail');
                                        }}
                                        style={({ pressed }) => [
                                            styles.headerArrowContainer,
                                            { 
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                borderWidth: 1
                                            },
                                            pressed && { opacity: 0.7 }
                                        ]}
                                    >
                                        <PlatformIcon name="arrow.up.forward" size={13} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                                    </Pressable>
                                </View>

                                {/* Visualizer & Conversational Text */}
                                <View style={styles.cardBodyConversational}>
                                    {/* Visual pending breakdown of Reimbursements vs Purchase Requests */}
                                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.chartContainerInsideCard}>
                                        <FinancePendingChart 
                                            active={currentPage === 1} 
                                            reimburseCount={chartReimburseCount}
                                            reimburseAmount={chartReimburseAmount}
                                            purchasingCount={chartPurchasingCount}
                                            purchasingAmount={chartPurchasingAmount}
                                        />
                                    </Animated.View>

                                    <View style={{ height: 16 }} />

                                    <View style={styles.briefTextContainer}>
                                        {financeLines.map((line, idx) => {
                                            const isLineNew = prevFinanceLines.length > 0 && prevFinanceLines[idx] !== line;
                                            return (
                                                <TypewriterLine
                                                    key={`${idx}-${updateKey}`}
                                                    text={line}
                                                    delay={financeDelays[idx]}
                                                    speed={10}
                                                    textColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                                                    active={currentPage === 1}
                                                    animate={shouldForceAnimate || isLineNew}
                                                    theme="finance"
                                                />
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Footer Section */}
                                <View style={styles.cardFooterSectionConversational}>
                                    <Text style={[styles.updatedText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                                        {relativeTime}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </Pressable>
                </View>

                {/* PAGE 3: Crew Brief */}
                <View style={{ width: CARD_WIDTH, alignItems: 'flex-start' }}>
                    <Pressable onPress={handleCrewCardPress} style={{ width: CARD_WIDTH }}>
                        <Animated.View style={[
                            styles.animatedCardWrapper,
                            animatedCrewCardStyle
                        ]}>
                            <LinearGradient
                                colors={isDark ? ['#1C1C1E', '#2D1E3D'] : ['#FFFFFF', '#FAF5FF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.homeCardContent}
                            >
                                {/* Header Row */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.headerLeft}>
                                        <View style={[
                                            styles.headerBadgeContainer,
                                            { 
                                                backgroundColor: crewBriefState === 'update'
                                                    ? (isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(139, 92, 246, 0.1)')
                                                    : (isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.08)'),
                                                borderColor: crewBriefState === 'update'
                                                    ? (isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(139, 92, 246, 0.15)')
                                                    : (isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(139, 92, 246, 0.15)'),
                                                borderWidth: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.headerBadgeText, 
                                                { 
                                                    color: crewBriefState === 'update'
                                                        ? (isDark ? '#C084FC' : '#8B5CF6')
                                                        : (isDark ? '#A1A1A6' : '#8E8E93')
                                                }
                                            ]}>
                                                {crewBriefState === 'update' ? 'NEW UPDATE' : 'CREW BRIEF'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push('/home/brief-detail');
                                        }}
                                        style={({ pressed }) => [
                                            styles.headerArrowContainer,
                                            { 
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                borderWidth: 1
                                            },
                                            pressed && { opacity: 0.7 }
                                        ]}
                                    >
                                        <PlatformIcon name="arrow.up.forward" size={13} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                                    </Pressable>
                                </View>

                                {/* Visualizer & Conversational Text */}
                                <View style={styles.cardBodyConversational}>
                                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.chartContainerInsideCard}>
                                        <CurvedArcGauge 
                                            active={currentPage === 2} 
                                            percentage={crewStats.crewTotalActive > 0 ? Math.round((crewStats.crewPresentToday / crewStats.crewTotalActive) * 100) : 92}
                                        />
                                    </Animated.View>

                                    <View style={{ height: 16 }} />

                                    <View style={styles.briefTextContainer}>
                                        {crewLines.map((line, idx) => {
                                            const isLineNew = prevCrewLines.length > 0 && prevCrewLines[idx] !== line;
                                            return (
                                                <TypewriterLine
                                                    key={`${idx}-${updateKey}`}
                                                    text={line}
                                                    delay={crewDelays[idx]}
                                                    speed={10}
                                                    textColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                                                    active={currentPage === 2}
                                                    animate={shouldForceAnimate || isLineNew}
                                                    theme="crew"
                                                />
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Footer Section */}
                                <View style={styles.cardFooterSectionConversational}>
                                    <Text style={[styles.updatedText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                                        {relativeTime}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
                <View style={[
                    styles.dot, 
                    currentPage === 0 
                        ? [styles.dotActive, { backgroundColor: isDark ? '#0A84FF' : '#007AFF' }] 
                        : styles.dotInactive
                ]} />
                <View style={[
                    styles.dot, 
                    currentPage === 1 
                        ? [styles.dotActive, { backgroundColor: isDark ? '#F472B6' : '#E11D48' }] 
                        : styles.dotInactive
                ]} />
                <View style={[
                    styles.dot, 
                    currentPage === 2 
                        ? [styles.dotActive, { backgroundColor: isDark ? '#C084FC' : '#8B5CF6' }] 
                        : styles.dotInactive
                ]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
        marginTop: 10,
    },
    outerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    briefTag: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#E53935',
        textTransform: 'uppercase',
    },
    briefTime: {
        fontSize: 10.5,
        fontWeight: '600',
        marginLeft: 'auto',
    },
    badgeSparkWrapper: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeCardWrapper: {
        borderRadius: 28,
        marginHorizontal: 16,
    },
    animatedCardWrapper: {
        borderRadius: 28,
        borderWidth: 1,
        elevation: 3,
        shadowOffset: { width: 0, height: 6 },
        overflow: 'hidden',
    },
    homeCardContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusIndicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerBadgeContainer: {
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadgeText: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 1,
    },
    headerArrowContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBodyConversational: {
        marginTop: 14,
        marginBottom: 14,
    },
    briefTextContainer: {
        gap: 5,
        alignItems: 'flex-start',
    },
    summaryText: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
    },
    chartContainerInsideCard: {
        marginTop: 12,
        width: '100%',
    },
    cardFooterSectionConversational: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    updatedText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    toggleStateButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    toggleStateButtonText: {
        fontSize: 10,
        fontWeight: '700',
    },
    sectionSubtitle: {
        fontSize: 14.5,
        fontWeight: '600',
        lineHeight: 20,
        letterSpacing: -0.1,
        textAlign: 'left',
    },
    barChartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%',
        marginTop: 8,
        height: 58,
        position: 'relative',
    },
    baselineLimit: {
        position: 'absolute',
        left: 8,
        right: 8,
        top: 22, // exactly middle of 44px height barTrack
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 0.5,
        zIndex: 0,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
        zIndex: 1,
    },
    barTrack: {
        width: 8,
        height: 44,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 4,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        borderRadius: 4,
    },
    barFillNormal: {
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
    },
    barFillActive: {
        backgroundColor: '#30D158',
        shadowColor: '#30D158',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    barLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        marginTop: 4,
    },
    barLabelActive: {
        fontWeight: '800',
    },
    sliderContainer: {
        width: '100%',
        marginTop: 8,
        height: 52,
        justifyContent: 'center',
    },
    sliderTicks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    sliderTickText: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: 'rgba(255, 255, 255, 0.45)',
    },
    sliderTrackWrapper: {
        width: '100%',
        height: 12,
        justifyContent: 'center',
    },
    sliderTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
    },
    sliderPointer: {
        position: 'absolute',
        width: 6,
        height: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
        elevation: 2,
        marginLeft: -3,
    },
    gaugeContainer: {
        width: 180,
        height: 52,
        alignSelf: 'center',
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
        marginLeft: -5,
        marginTop: -5,
        top: 0,
        left: 0,
    },
    cardWrapper: {
    },
    cardAnimWrapper: {
    },
    detailCard: {
        height: 150,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 6 },
    },
    detailCardPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.97 }],
    },
    detailCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flexSpacer: {
        flex: 1,
    },
    detailCardBody: {
        marginTop: 8,
    },
    detailValue: {
        fontSize: 19,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 1,
    },
    detailLabel: {
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    detailDescription: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeContainer: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    paginationDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    dotActive: {
        width: 16,
    },
    dotInactive: {
        width: 6,
        backgroundColor: 'rgba(150, 150, 150, 0.3)',
    },
    financeChartContainer: {
        width: '100%',
        marginTop: 6,
        gap: 12,
    },
    chartRow: {
        width: '100%',
    },
    chartRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chartRowLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    chartRowValue: {
        fontSize: 10,
        fontWeight: '700',
    },
    chartTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    chartFill: {
        height: '100%',
        borderRadius: 3,
    }
});
