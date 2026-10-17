import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface RingData {
    progress: number; // 0 to 100
    color: string;
    size: number;
    strokeWidth: number;
}

function SingleRing({ progress, color, size, strokeWidth }: RingData) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const halfSize = size / 2;
    const clamped = Math.min(100, Math.max(0, progress));

    const totalDegrees = clamped * 3.6;
    const rightSideDegrees = Math.min(clamped, 50) * 3.6;
    const leftSideDegrees = Math.max(0, clamped - 50) * 3.6;

    return (
        <View style={{ width: size, height: size, position: 'absolute' }}>
            {/* 1. Subtle Background Track - Tinted with the ring's color */}
            <View style={[StyleSheet.absoluteFill, {
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color + (isDark ? '15' : '10'), // Using 15% opacity for dark, 10% for light
            }]} />

            {/* 2. Arc Segments: Hidden when progress is 0 */}
            {clamped > 0 && (
                <>
                    {/* RIGHT HALF (0-180deg) */}
                    <View style={{ position: 'absolute', top: 0, right: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                        <View style={{
                            width: size, height: size, position: 'absolute', right: 0,
                            borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent',
                            borderTopColor: color, borderRightColor: color,
                            transform: [{ rotate: `${rightSideDegrees - 135}deg` }]
                        }} />
                    </View>

                    {/* LEFT HALF (181-360deg) */}
                    <View style={{ position: 'absolute', top: 0, left: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                        <View style={{
                            width: size, height: size, position: 'absolute', left: 0,
                            borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent',
                            borderBottomColor: clamped > 50 ? color : 'transparent', borderLeftColor: clamped > 50 ? color : 'transparent',
                            transform: [{ rotate: `${leftSideDegrees - 135}deg` }]
                        }} />
                    </View>

                    {/* 3. Rounded START Cap */}
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: halfSize - strokeWidth / 2,
                        width: strokeWidth,
                        height: strokeWidth,
                        borderRadius: strokeWidth / 2,
                        backgroundColor: color,
                        shadowColor: color,
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                    }} />

                    {/* 4. Rounded END Cap */}
                    <View style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        transform: [{ rotate: `${totalDegrees}deg` }]
                    }}>
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: halfSize - strokeWidth / 2,
                            width: strokeWidth,
                            height: strokeWidth,
                            borderRadius: strokeWidth / 2,
                            backgroundColor: color,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 1,
                        }} />
                        {/* Glow for end cap */}
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: halfSize - strokeWidth / 2,
                            width: strokeWidth,
                            height: strokeWidth,
                            borderRadius: strokeWidth / 2,
                            backgroundColor: color,
                            shadowColor: color,
                            shadowOpacity: 0.4,
                            shadowRadius: 6,
                        }} />
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export function MultiProgressRing({ rings, size: baseSize = 140, strokeWidth: strokeWidthProp }: { rings: { progress: number, color: string }[], size?: number, strokeWidth?: number }) {
    const strokeWidth = strokeWidthProp ?? Math.max(8, Math.round(baseSize * 0.1));
    const spacing = 2;

    return (
        <View style={{ width: baseSize, height: baseSize, alignItems: 'center', justifyContent: 'center' }}>
            {rings.map((ring, index) => {
                const ringSize = baseSize - (index * (strokeWidth + spacing) * 2);
                if (ringSize <= 0) return null;

                return (
                    <SingleRing
                        key={index}
                        progress={ring.progress}
                        color={ring.color}
                        size={ringSize}
                        strokeWidth={strokeWidth}
                    />
                );
            })}
        </View>
    );
}
