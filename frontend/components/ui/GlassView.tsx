import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { AnimatedProps } from 'react-native-reanimated';

let BlurViewComponent: any = View;
let AnimatedBlurView: any = Animated.View;
if (Platform.OS !== 'web') {
    try {
        BlurViewComponent = require('expo-blur').BlurView;
        AnimatedBlurView = Animated.createAnimatedComponent(BlurViewComponent);
    } catch {
        BlurViewComponent = View;
        AnimatedBlurView = Animated.View;
    }
}

interface GlassViewProps extends AnimatedProps<any> {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

export function GlassView({ style, intensity = 50, tint = 'systemThinMaterial', children, ...props }: GlassViewProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Map system tints to theme-aware variants
    let resolvedTint = tint;
    if (Platform.OS === 'ios') {
        if (tint === 'systemThinMaterial') {
            resolvedTint = isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
        } else if (tint === 'systemMaterial') {
            resolvedTint = isDark ? 'systemMaterialDark' : 'systemMaterialLight';
        } else if (tint === 'systemThickMaterial') {
            resolvedTint = isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight';
        } else if (tint === 'systemChromeMaterial') {
            resolvedTint = isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
        } else if (tint === 'systemUltraThinMaterial') {
            resolvedTint = isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
        }
    } else {
        // Android only supports 'light' | 'dark' | 'default'
        if (tint.includes('Dark') || isDark) {
            resolvedTint = 'dark';
        } else if (tint.includes('Light') || !isDark) {
            resolvedTint = 'light';
        } else {
            resolvedTint = 'default';
        }
    }

    if (Platform.OS === 'web') {
        return (
            <Animated.View
                style={[
                    styles.glass,
                    {
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    } as any,
                    style,
                ]}
                {...(props as any)}
            >
                {children}
            </Animated.View>
        );
    }

    return (
        <AnimatedBlurView
            intensity={intensity}
            tint={resolvedTint as any}
            style={[styles.glass, style]}
            {...props}>
            {children}
        </AnimatedBlurView>
    );
}

const styles = StyleSheet.create({
    glass: {
        overflow: 'hidden',
    },
    androidGlass: {
        elevation: 0,
    },
});
