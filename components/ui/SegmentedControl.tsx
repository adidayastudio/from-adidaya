import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useState } from 'react';
import {
    LayoutChangeEvent,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
    Platform,
    ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

export interface Segment {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

interface SegmentedControlProps {
    segments: Segment[];
    activeSegment: string;
    onSegmentChange: (id: string) => void;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'hero';
    fullWidth?: boolean;
    equalWidth?: boolean;
}

export function SegmentedControl({
    segments,
    activeSegment,
    onSegmentChange,
    style,
    variant = 'default',
    fullWidth = false,
    equalWidth = false,
}: SegmentedControlProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isHero = variant === 'hero';

    const [segmentWidths, setSegmentWidths] = useState<{ [key: string]: number }>({});
    const [segmentPositions, setSegmentPositions] = useState<{ [key: string]: number }>({});
    const [containerHeight, setContainerHeight] = useState(0);
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const scrollViewRef = React.useRef<ScrollView>(null);

    const activeIndex = segments.findIndex((s) => s.id === activeSegment);
    const activeWidth = segmentWidths[activeSegment] || 0;
    const activePosition = segmentPositions[activeSegment] || 0;

    // Adjusted bounce spring config (more bounce than before, less than default)
    const springConfig = { damping: 20, stiffness: 220, mass: 0.8 };

    const animatedIndicatorStyle = useAnimatedStyle(() => {
        return {
            width: withSpring(activeWidth, springConfig),
            transform: [
                {
                    translateX: withSpring(activePosition, springConfig),
                },
            ],
            opacity: activeWidth > 0 ? 1 : 0,
        };
    });

    // Auto-scroll to center the active segment
    React.useEffect(() => {
        if (activeWidth > 0 && scrollViewWidth > 0 && scrollViewRef.current) {
            const centerX = activePosition - (scrollViewWidth / 2) + (activeWidth / 2);
            scrollViewRef.current.scrollTo({
                x: Math.max(0, centerX),
                animated: true,
            });
        }
    }, [activeSegment, activePosition, activeWidth, scrollViewWidth]);

    const handleLayout = (id: string, event: LayoutChangeEvent) => {
        const { width, x } = event.nativeEvent.layout;
        setSegmentWidths((prev) => ({ ...prev, [id]: width }));
        setSegmentPositions((prev) => ({ ...prev, [id]: x }));
    };

    const isAndroid = Platform.OS === 'android';
    const isWeb = Platform.OS === 'web';

    if (isWeb) {
        return (
            <View
                style={[
                    styles.container,
                    fullWidth && { width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        borderWidth: 1,
                    },
                    style,
                ]}
            >
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.webScrollView, fullWidth && { width: '100%', maxWidth: '100%' }]}
                    contentContainerStyle={[styles.segmentsWrapper, fullWidth && { minWidth: '100%', display: 'flex' }, equalWidth && { width: '100%' }]}
                    scrollEnabled={!equalWidth}
                    onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
                >
                    {/* Highlight Sliding Indicator */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.indicator,
                            {
                                height: 36,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
                            },
                            animatedIndicatorStyle,
                        ]}
                    />

                    {segments.map((segment) => {
                        const isSelected = activeSegment === segment.id;
                        const isDisabled = !!segment.disabled;
                        const activeColor = isDark ? '#FFFFFF' : '#000000';
                        const inactiveColor = isDark ? '#8E8E93' : '#6E6E73';
                        const itemColor = isSelected ? activeColor : inactiveColor;

                        return (
                            <TouchableOpacity
                                key={segment.id}
                                style={[
                                    styles.segmentButton,
                                    fullWidth && { flexGrow: 1, flexShrink: 0, paddingHorizontal: 12 },
                                    equalWidth && { flex: 1, flexBasis: 0, flexShrink: 1, minWidth: 0, paddingHorizontal: 4 },
                                    isDisabled && { opacity: 0.4 }
                                ]}
                                onPress={() => {
                                    if (isDisabled) return;
                                    onSegmentChange(segment.id);
                                }}
                                disabled={isDisabled}
                                onLayout={(e) => handleLayout(segment.id, e)}
                                activeOpacity={isDisabled ? 1 : 0.7}
                            >
                                <View style={styles.segmentContent}>
                                    <Text
                                        style={[
                                            styles.segmentText,
                                            {
                                                color: itemColor,
                                                fontWeight: isSelected ? '700' : '500',
                                            },
                                        ]}
                                    >
                                        {segment.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    }

    if (isAndroid) {
        return (
            <View
                style={[
                    styles.container,
                    fullWidth && { width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
                    style,
                    {
                        borderColor: isHero
                            ? 'rgba(255, 255, 255, 0.25)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.04)',
                        backgroundColor: isHero
                            ? 'rgba(0, 0, 0, 0.15)'
                            : isDark
                            ? 'rgba(38, 38, 40, 0.95)'
                            : 'rgba(0, 0, 0, 0.05)',
                        borderWidth: 1,
                    }
                ]}
            >
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[{ height: 36 }, fullWidth && { width: '100%', maxWidth: '100%' }]}
                    contentContainerStyle={[styles.segmentsWrapper, fullWidth && { minWidth: '100%', display: 'flex' }]}
                    onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
                >
                    {/* Highlight Indicator wrapped in native pointerEvents="none" container */}
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <Animated.View
                            style={[
                                styles.indicator,
                                {
                                    height: 36,
                                    backgroundColor: isHero
                                        ? '#FFFFFF'
                                        : isDark
                                        ? 'rgba(255, 255, 255, 0.12)'
                                        : '#FFFFFF',
                                    elevation: 0,
                                },
                                animatedIndicatorStyle,
                            ]}
                        />
                    </View>

                    {segments.map((segment) => {
                        const isActive = segment.id === activeSegment;
                        const isDisabled = !!segment.disabled;
                        const textColor = isDisabled
                            ? (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')
                            : isActive
                            ? (isHero ? '#000000' : (isDark ? '#FFFFFF' : '#000000'))
                            : (isHero ? 'rgba(255, 255, 255, 0.85)' : (isDark ? '#8E8E93' : '#6e6e73'));

                        const tapGesture = Gesture.Tap()
                            .enabled(!isDisabled)
                            .runOnJS(true)
                            .onEnd(() => {
                                onSegmentChange(segment.id);
                            });

                        return (
                            <GestureDetector key={segment.id} gesture={tapGesture}>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentButton,
                                        fullWidth && { flexGrow: 1, flexShrink: 0, paddingHorizontal: 12 },
                                        isDisabled && { opacity: 0.4 }
                                    ]}
                                    onPress={() => {
                                        if (isDisabled) return;
                                        onSegmentChange(segment.id);
                                    }}
                                    disabled={isDisabled}
                                    onLayout={(e) => handleLayout(segment.id, e)}
                                    activeOpacity={isDisabled ? 1 : 0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                                >
                                    <View style={styles.segmentContent} pointerEvents="none">
                                        <Text
                                            style={[
                                                styles.segmentText,
                                                { color: textColor, fontWeight: isActive ? '700' : '500' },
                                            ]}
                                        >
                                            {segment.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </GestureDetector>
                        );
                    })}
                </ScrollView>
            </View>
        );
    }

    return (
        <BlurView
            intensity={isHero ? 25 : 45}
            tint={isHero ? 'light' : (isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight')}
            style={[
                styles.container,
                fullWidth && { width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
                style,
                {
                    borderColor: isHero
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.04)',
                    backgroundColor: isHero
                        ? 'rgba(255, 255, 255, 0.16)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.06)'
                }
            ]}
        >
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[{ height: 36 }, fullWidth && { width: '100%', maxWidth: '100%' }]}
                contentContainerStyle={[styles.segmentsWrapper, fullWidth && { minWidth: '100%', display: 'flex' }]}
                bounces={true}
                onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
            >
                {/* Highlight Indicator */}
                <Animated.View
                    style={[
                        styles.indicator,
                        {
                            height: 36,
                            backgroundColor: isHero
                                ? '#FFFFFF'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.15)'
                                : '#FFFFFF',
                            shadowColor: 'transparent',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0,
                            shadowRadius: 0,
                        },
                        animatedIndicatorStyle,
                    ]}
                />

                {segments.map((segment) => {
                    const isActive = segment.id === activeSegment;
                    const isDisabled = !!segment.disabled;
                    const textColor = isDisabled
                        ? (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')
                        : isActive
                        ? (isHero ? '#000000' : (isDark ? '#FFFFFF' : '#000000'))
                        : (isHero ? 'rgba(255, 255, 255, 0.9)' : (isDark ? '#8E8E93' : '#6e6e73'));

                    return (
                        <TouchableOpacity
                            key={segment.id}
                            style={[
                                styles.segmentButton,
                                fullWidth && { flexGrow: 1, flexShrink: 0, paddingHorizontal: 12 },
                                isDisabled && { opacity: 0.4 }
                            ]}
                            onPress={() => {
                                if (isDisabled) return;
                                onSegmentChange(segment.id);
                            }}
                            disabled={isDisabled}
                            onLayout={(e) => handleLayout(segment.id, e)}
                            activeOpacity={isDisabled ? 1 : 0.7}
                        >
                            <View style={styles.segmentContent}>
                                <Text
                                    style={[
                                        styles.segmentText,
                                        { color: textColor, fontWeight: isActive ? '700' : '500' },
                                    ]}
                                >
                                    {segment.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 23,
        height: 46,
        alignSelf: 'flex-start',
        overflow: 'hidden',
        padding: 4,
        maxWidth: '100%',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: 'none',
            },
            default: {},
        }),
    },
    webScrollView: {
        maxWidth: '100%',
        flexGrow: 0,
        height: 36,
    },
    segmentsWrapper: {
        flexDirection: 'row',
        position: 'relative',
        alignItems: 'center',
        height: 36,
    },
    indicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 18,
        height: 36,
        zIndex: 0,
        ...Platform.select({
            web: {
                boxShadow: 'none',
            },
            default: {},
        }),
    },
    segmentButton: {
        height: 36,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        borderRadius: 18,
        cursor: 'pointer' as any,
    },
    segmentContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    segmentText: {
        fontSize: 13,
        lineHeight: 16,
        letterSpacing: -0.2,
    },
    webPillGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 3,
        borderRadius: 999,
        borderWidth: 1,
        gap: 2,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            },
            default: {},
        }),
    },
    webPillItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        cursor: 'pointer' as any,
    },
    webPillLabel: {
        fontSize: 13,
        letterSpacing: -0.2,
    },
});
