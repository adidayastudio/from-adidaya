import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

const RADIUS_TICKS = [25, 50, 75, 100, 125, 150];

export interface LinearRangeSliderProps {
    min?: number;
    max?: number;
    step?: number;
    value: number;
    onChange: (val: number) => void;
    activeColor?: string;
    isDark?: boolean;
}

export function LinearRangeSlider({
    min = 25,
    max = 150,
    step = 5,
    value,
    onChange,
    activeColor = '#007AFF',
    isDark = false,
}: LinearRangeSliderProps) {
    const trackRef = useRef<View>(null);
    const [, setSliderWidth] = useState(0);

    const updateFromPosition = (pageX: number) => {
        if (!trackRef.current) return;
        trackRef.current.measure((_x, _y, width, _height, pageXOffset) => {
            if (width > 0) {
                setSliderWidth(width);
                const touchX = pageX - pageXOffset;
                const clampedX = Math.max(0, Math.min(touchX, width));
                const ratio = clampedX / width;
                const rawVal = min + ratio * (max - min);
                const steppedVal = Math.round(rawVal / step) * step;
                onChange(Math.max(min, Math.min(max, steppedVal)));
            }
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                updateFromPosition(evt.nativeEvent.pageX);
            },
            onPanResponderMove: (evt) => {
                updateFromPosition(evt.nativeEvent.pageX);
            },
        })
    ).current;

    const progressRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    return (
        <View style={sliderStyles.container}>
            <View
                ref={trackRef}
                style={sliderStyles.touchableArea}
                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                {...panResponder.panHandlers}
            >
                {/* Inactive Track Line */}
                <View style={[sliderStyles.trackBackground, isDark ? sliderStyles.trackDark : sliderStyles.trackLight]}>
                    {/* Active Colored Track */}
                    <View
                        style={[
                            sliderStyles.trackActive,
                            {
                                width: `${progressRatio * 100}%`,
                                backgroundColor: activeColor,
                            },
                        ]}
                    />

                    {/* Tick Mark Dots inside Track */}
                    {RADIUS_TICKS.map((tickVal) => {
                        const tickRatio = (tickVal - min) / (max - min);
                        const isFilled = tickVal <= value;
                        return (
                            <View
                                key={tickVal}
                                style={[
                                    sliderStyles.tickDot,
                                    {
                                        left: `${tickRatio * 100}%`,
                                        backgroundColor: isFilled
                                            ? 'rgba(255, 255, 255, 0.7)'
                                            : isDark
                                            ? 'rgba(255, 255, 255, 0.25)'
                                            : 'rgba(0, 0, 0, 0.18)',
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Circular Draggable Thumb */}
                <View
                    style={[
                        sliderStyles.thumb,
                        {
                            left: `${progressRatio * 100}%`,
                        },
                    ]}
                />
            </View>

            {/* Tick labels */}
            <View style={sliderStyles.ticksRow}>
                {RADIUS_TICKS.map((tickVal) => {
                    const isSelected = Math.abs(value - tickVal) < 10;
                    return (
                        <Text
                            key={tickVal}
                            style={[
                                sliderStyles.tickText,
                                isDark && sliderStyles.tickTextDark,
                                isSelected && { color: activeColor, fontWeight: '700' },
                            ]}
                        >
                            {tickVal}m
                        </Text>
                    );
                })}
            </View>
        </View>
    );
}

const sliderStyles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 4,
    },
    touchableArea: {
        height: 36,
        justifyContent: 'center',
        position: 'relative',
    },
    trackBackground: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
        position: 'relative',
    },
    trackLight: {
        backgroundColor: '#E2E8F0',
    },
    trackDark: {
        backgroundColor: '#334155',
    },
    trackActive: {
        height: '100%',
        borderRadius: 3,
    },
    tickDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        top: 1,
        marginLeft: -2,
    },
    thumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        marginLeft: -12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 0, 0, 0.08)',
    },
    ticksRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingHorizontal: 2,
    },
    tickText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    tickTextDark: {
        color: '#64748B',
    },
});
