import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

interface FormaLogoProps {
    size?: number;
    color?: string;
    showText?: boolean;
    tagline?: string;
    style?: ViewStyle;
    isDark?: boolean;
}

export function FormaLogo({ 
    size = 48, 
    color, 
    showText = false, 
    tagline = 'Architecture • Design • Development',
    style,
    isDark = false
}: FormaLogoProps) {
    if (showText) {
        const fullSource = isDark 
            ? require('@/assets/images/logo-adidaya-white.png')
            : require('@/assets/images/logo-adidaya-red.png');

        return (
            <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
                <Image
                    source={fullSource}
                    style={{ width: size * 1.6, height: size * 1.6 }}
                    resizeMode="contain"
                />
                {tagline ? (
                    <Text style={[styles.tagline, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {tagline}
                    </Text>
                ) : null}
            </View>
        );
    }

    const markSource = isDark
        ? require('@/assets/images/logo-adidaya-white.png')
        : require('@/assets/images/logo-adidaya-red.png');

    return (
        <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
            <Image
                source={markSource}
                style={{ width: size, height: size }}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    tagline: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.2,
        marginTop: 4,
        textAlign: 'center',
    }
});

