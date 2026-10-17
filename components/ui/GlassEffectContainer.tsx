import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface GlassEffectContainerProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    borderRadius?: number;
    intensity?: number;
    tint?: 'light' | 'dark' | 'systemThinMaterial' | 'systemMaterial' | 'systemThickMaterial' | 'systemChromeMaterial' | 'systemUltraThinMaterial';
}

export function GlassEffectContainer({
    children,
    style,
    borderRadius = 24,
    intensity = 80,
    tint = 'systemChromeMaterial',
}: GlassEffectContainerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isAndroid = Platform.OS === 'android';

    // Map system tints to theme-aware variants
    let resolvedTint = tint;
    if (tint.startsWith('system')) {
        resolvedTint = (isDark ? `${tint}Dark` : `${tint}Light`) as any;
    }

    const rimColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.3)';

    if (Platform.OS === 'web') {
        const webGlassBg = isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.88)';
        const webBorder = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)';
        return (
            <View
                style={[
                    styles.shadowWrapper,
                    {
                        borderRadius,
                        // @ts-ignore
                        boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.45)' : '0 8px 30px rgba(0, 0, 0, 0.08)',
                    },
                    style,
                ]}
            >
                <View
                    style={[
                        styles.innerContainer,
                        {
                            borderRadius,
                            backgroundColor: webGlassBg,
                            borderWidth: 1,
                            borderColor: webBorder,
                            // @ts-ignore
                            backdropFilter: 'blur(24px)',
                            // @ts-ignore
                            WebkitBackdropFilter: 'blur(24px)',
                        },
                    ]}
                >
                    {children}
                </View>
            </View>
        );
    }

    if (isAndroid) {
        const glassBg = isDark ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.94)';
        return (
            <View style={[styles.shadowWrapper, { elevation: 8, borderRadius }, style]}>
                <View style={[styles.innerContainer, { borderRadius, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)', backgroundColor: glassBg }]}>
                    <BlurView
                        intensity={0}
                        tint={isDark ? 'dark' : 'light'}
                        experimentalBlurMethod="none"
                        blurReductionFactor={2}
                        pointerEvents="none"
                        style={StyleSheet.absoluteFill}
                    />
                    {children}
                    <View style={[styles.rimOverlay, { borderRadius, borderColor: rimColor }]} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.shadowWrapper, { borderRadius }, style]}>
            <View style={[styles.innerContainer, { borderRadius }]}>
                <BlurView
                    intensity={intensity}
                    tint={resolvedTint as any}
                    style={StyleSheet.absoluteFill}
                />
                {children}
                <View style={[styles.rimOverlay, { borderRadius, borderColor: rimColor }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    shadowWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
    },
    innerContainer: {
        overflow: 'hidden',
        width: '100%',
    },
    rimOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 0.5,
        pointerEvents: 'none',
    },
});
