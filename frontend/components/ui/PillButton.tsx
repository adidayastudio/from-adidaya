import { Colors, FormaBlue } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

type ButtonVariant = 'solid' | 'tinted' | 'clear' | 'muted';
type ButtonColor = 'blue' | 'red' | 'green' | 'orange' | 'neutral';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PillButtonProps {
    label?: string;
    onPress: () => void;
    variant?: ButtonVariant;
    color?: ButtonColor;
    size?: ButtonSize;
    style?: ViewStyle;
    icon?: React.ReactNode;
    iconRight?: React.ReactNode;
    textColor?: string;
    disabled?: boolean;
    noShadow?: boolean;
    noBorder?: boolean;
}

const COLOR_MAP: Record<Exclude<ButtonColor, 'neutral'>, { light: string; dark: string }> = {
    blue: { light: FormaBlue[700], dark: '#0A84FF' },
    red: { light: '#FF3B30', dark: '#FF453A' },
    green: { light: '#34C759', dark: '#30D158' },
    orange: { light: '#FF9500', dark: '#FF9F0A' },
};

export function PillButton({
    label,
    onPress,
    variant = 'solid',
    color = 'neutral',
    size = 'md',
    style,
    icon,
    iconRight,
    textColor,
    disabled = false,
    noShadow = false,
    noBorder = false,
}: PillButtonProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const scale = useSharedValue(1);

    const themeColors = Colors[isDark ? 'dark' : 'light'];
    const activeColorConfig = color !== 'neutral' ? COLOR_MAP[color] : null;
    const baseColor = color === 'blue'
        ? (isDark ? '#0A84FF' : FormaBlue[700])
        : (color === 'neutral' ? themeColors.text : (isDark ? activeColorConfig?.dark || '#FF453A' : activeColorConfig?.light || '#FF3B30'));

    const handlePressIn = () => {
        'worklet';
        scale.value = withSpring(0.94, { damping: 15, stiffness: 400, mass: 0.8 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
        'worklet';
        scale.value = withSpring(1, { damping: 15, stiffness: 400, mass: 0.8 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const getOverlayStyle = (): ViewStyle => {
        if (variant === 'solid') {
            return { backgroundColor: color === 'neutral' ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : (color === 'blue' ? FormaBlue[700] : baseColor) };
        }
        if (variant === 'tinted') {
            return { 
                backgroundColor: color === 'neutral' 
                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') 
                    : (isDark ? `${baseColor}22` : `${baseColor}18`),
                borderColor: noBorder ? 'transparent' : (color !== 'neutral' ? (isDark ? `${baseColor}38` : `${baseColor}28`) : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')),
                borderWidth: noBorder ? 0 : 1,
            };
        }
        if (variant === 'muted') {
            return {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.035)',
            };
        }
        return { backgroundColor: 'transparent' };
    };

    const getTextColorValue = () => {
        if (textColor) return textColor;
        if (variant === 'solid') return '#FFFFFF';
        if (variant === 'tinted' && color !== 'neutral') return baseColor;
        if (variant === 'clear' && color !== 'neutral') return baseColor;
        if (variant === 'muted' && color !== 'neutral') return baseColor;
        return themeColors.text;
    };

    const getPaddingStyle = () => {
        if (size === 'sm') {
            return { paddingVertical: 7, paddingHorizontal: 12, minWidth: 60 };
        }
        if (size === 'lg') {
            return { paddingVertical: 15, paddingHorizontal: 24, minWidth: 100 };
        }
        return { paddingVertical: 12, paddingHorizontal: 20, minWidth: 80 };
    };

    const getFontSize = () => {
        if (size === 'sm') return 12;
        if (size === 'lg') return 17;
        return 15;
    };

    return (
        <Animated.View style={[styles.wrapper, noShadow && { shadowOpacity: 0, elevation: 0 }, animatedStyle, style]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[styles.pressable, disabled && { opacity: 0.5 }]}
            >
                {/* 
                   THE LIQUID BASE (FOR EVERYONE)
                   Every button (Solid, Tinted, Clear) now has the native blur base.
                   This ensures they all distort the background.
                */}
                {variant !== 'muted' && (
                    <BlurView
                        intensity={Platform.OS === 'android' ? 0 : 100}
                        tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                        experimentalBlurMethod="none"
                        blurReductionFactor={2}
                        style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                    />
                )}

                {/* THE COLOR OVERLAY */}
                <View style={[StyleSheet.absoluteFill, getOverlayStyle(), { borderRadius: 999 }]} />

                <View style={[styles.container, getPaddingStyle(), !label && styles.iconOnlyContainer]}>
                    {icon && <View style={[styles.iconContainer, !label && { marginRight: 0 }]}>{icon}</View>}
                    {label && (
                        <Text style={[styles.label, { color: getTextColorValue(), fontSize: getFontSize() }]}>
                            {label}
                        </Text>
                    )}
                    {iconRight && <View style={[styles.iconRightContainer, !label && { marginLeft: 0 }]}>{iconRight}</View>}
                </View>

                {/* Subtle Rim Edge (Native crystal feeling) */}
                {!noBorder && (
                    variant !== 'muted' ? (
                        <View style={styles.rimOverlay} />
                    ) : (
                        <View style={[styles.rimOverlay, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)', borderWidth: 1 }]} />
                    )
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: 999,
        overflow: 'visible',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    pressable: {
        borderRadius: 999,
        overflow: 'hidden',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        minWidth: 80,
    },
    iconOnlyContainer: {
        paddingHorizontal: 0,
        paddingVertical: 0,
        width: 32,
        height: 32,
        minWidth: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    iconContainer: {
        marginRight: 8,
    },
    iconRightContainer: {
        marginLeft: 8,
    },
    rimOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 999,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        pointerEvents: 'none',
    }
});
