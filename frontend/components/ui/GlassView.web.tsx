import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { AnimatedProps } from 'react-native-reanimated';

interface GlassViewProps extends AnimatedProps<any> {
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    tint?: string;
    children?: React.ReactNode;
}

export function GlassView({ style, intensity = 50, tint = 'systemThinMaterial', children, ...props }: GlassViewProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const blurPx = Math.round(intensity * 0.3) || 16;
    const bg = isDark ? 'rgba(28, 28, 30, 0.75)' : 'rgba(255, 255, 255, 0.75)';

    return (
        <Animated.View
            style={[
                styles.glass,
                {
                    backdropFilter: `blur(${blurPx}px)`,
                    WebkitBackdropFilter: `blur(${blurPx}px)`,
                    backgroundColor: bg,
                } as any,
                style,
            ]}
            {...props}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    glass: {
        overflow: 'hidden',
    },
});
