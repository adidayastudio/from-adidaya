import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ImageBackground, Platform, StyleSheet, View, ViewStyle } from 'react-native';

type CardVariant = 'clear' | 'tinted' | 'image';

interface LiquidCardProps {
    children?: React.ReactNode;
    variant?: CardVariant;
    tintColor?: string;
    backgroundImage?: any; // Image source
    style?: ViewStyle;
    contentStyle?: ViewStyle;
}

export function LiquidCard({
    children,
    variant = 'clear',
    tintColor,
    backgroundImage,
    style,
    contentStyle,
}: LiquidCardProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const renderBackground = () => {
        if (variant === 'image' && backgroundImage) {
            return (
                <ImageBackground
                    source={backgroundImage}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />
            );
        }
        return null;
    };

    const getOverlayStyle = (): ViewStyle => {
        if (variant === 'tinted' && tintColor) {
            return { backgroundColor: `${tintColor}33` }; // 20% overlay
        }
        return { backgroundColor: 'transparent' };
    };

    const isAndroid = Platform.OS === 'android';

    return (
        <View style={[styles.wrapper, isAndroid && styles.androidWrapper, style]}>
            {/* Base Layer: Background Image (optional) */}
            {renderBackground()}

            {/* Glass Layer */}
            {isAndroid ? (
                // Android: Solid semi-transparent background (BlurView tints don't work well)
                <View style={[StyleSheet.absoluteFill, {
                    backgroundColor: isDark ? 'rgba(38,38,40,0.92)' : 'rgba(255,255,255,0.95)',
                }]} />
            ) : (
                // iOS: Native BlurView with system materials
                <BlurView
                    intensity={100}
                    tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* Tint Layer */}
            <View style={[StyleSheet.absoluteFill, getOverlayStyle()]} />

            {/* Content Layer */}
            <View style={[styles.container, contentStyle]}>
                {children}
            </View>

            {/* Rim Reflection Layer (The Native Touch) */}
            <View style={[styles.rimOverlay, isAndroid && styles.androidRim, {
                borderColor: isAndroid
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                    : 'rgba(255,255,255,0.25)',
            }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        // iOS shadow (white bloom)
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    androidWrapper: {
        // Android: Use proper elevation + dark shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    container: {
        padding: 20,
    },
    rimOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.25)',
        pointerEvents: 'none',
    },
    androidRim: {
        borderWidth: 1,
    },
});
