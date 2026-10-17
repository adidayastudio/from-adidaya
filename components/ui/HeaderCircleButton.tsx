import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, StyleProp, Platform } from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

export interface HeaderCircleButtonProps {
    type?: 'back' | 'close' | 'custom';
    iconName?: string;
    onPress?: () => void;
    tintColor?: string;
    style?: StyleProp<ViewStyle>;
    isDark?: boolean;
    size?: number;
    hitSlop?: any;
}

export function HeaderCircleButton({
    type = 'back',
    iconName,
    onPress,
    tintColor,
    style,
    isDark: customIsDark,
    size = 36,
    hitSlop = { top: 10, bottom: 10, left: 10, right: 10 },
}: HeaderCircleButtonProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = customIsDark !== undefined ? customIsDark : resolvedTheme === 'dark';

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) {
            onPress();
        } else if (type === 'back') {
            router.back();
        }
    };

    const resolvedIconName = iconName || (type === 'back' ? 'chevron.left' : 'xmark');
    const iconSize = type === 'close' ? 14 : 16;
    const defaultColor = isDark ? '#FFFFFF' : '#0F172A';
    const effectiveColor = tintColor || defaultColor;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={hitSlop}
            style={[
                styles.base,
                { width: size, height: size, borderRadius: size / 2 },
                isDark ? styles.dark : styles.light,
                style,
            ]}
        >
            <PlatformIcon
                name={resolvedIconName as any}
                size={iconSize}
                weight="semibold"
                tintColor={effectiveColor}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, transform 0.1s ease',
            },
            default: {},
        }),
    },
    light: {
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            },
            default: {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
            },
        }),
    },
    dark: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            },
            default: {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
        }),
    },
});
