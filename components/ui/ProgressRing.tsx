import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Helper to get color based on progress (Fluorescent palette)
export const getProgressColor = (progress: number) => {
    if (progress <= 25) return '#FF1F00'; // Fluorescent Red
    if (progress <= 50) return '#FF9500'; // Apple Orange
    if (progress <= 75) return '#00A3FF'; // Fluorescent Blue
    return '#34C759'; // Natural Apple Green
};

export function ProgressRing({
    progress,
    size = 44,
    strokeWidth = 3,
    showText = true,
    customText,
}: {
    progress: number;
    size?: number;
    strokeWidth?: number;
    showText?: boolean;
    customText?: string;
}) {
    const color = getProgressColor(progress);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Physical measurements
    const halfSize = size / 2;
    const clamped = Math.min(100, Math.max(0, progress));

    // Degrees: 360 * (progress / 100)
    const rightSideDegrees = Math.min(clamped, 50) * 3.6;
    const leftSideDegrees = Math.max(0, clamped - 50) * 3.6;

    const roundedDisplay =
        progress > 0 && progress < 1
            ? 1
            : progress > 99 && progress < 100
            ? 99
            : Math.min(100, Math.max(0, Math.round(progress)));

    return (
        <View style={[styles.ringContainer, { width: size, height: size, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)' }]}>
            {/* Background Track */}
            <View style={[StyleSheet.absoluteFill, {
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }]} />

            {/* RIGHT WINDOW (0-50%) */}
            <View style={{ position: 'absolute', top: 0, right: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                <View style={{
                    width: size, height: size, position: 'absolute', right: 0,
                    borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent',
                    borderTopColor: color, borderRightColor: color, // 180deg segment
                    transform: [{ rotate: `${rightSideDegrees - 135}deg` }]
                }} />
            </View>

            {/* LEFT WINDOW (51-100%) */}
            <View style={{ position: 'absolute', top: 0, left: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                <View style={{
                    width: size, height: size, position: 'absolute', left: 0,
                    borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent',
                    borderBottomColor: clamped > 50 ? color : 'transparent', borderLeftColor: clamped > 50 ? color : 'transparent',
                    transform: [{ rotate: `${leftSideDegrees - 135}deg` }]
                }} />
            </View>

            {showText && (
                <View style={styles.ringTextWrapper}>
                    <Text
                        style={[styles.ringText, { color, fontSize: size > 40 ? 10 : 8 }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {customText !== undefined ? customText : `${roundedDisplay}%`}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    ringContainer: {
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    ringTextWrapper: {
        width: '80%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringText: {
        fontWeight: '900',
        textAlign: 'center',
    },
});
