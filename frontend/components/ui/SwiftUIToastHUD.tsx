import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface SwiftUIToastHUDProps {
    message: string;
    icon?: string;
    iconColor?: string;
    isDark?: boolean;
}

export function SwiftUIToastHUD({
    message,
    icon = 'checkmark.circle.fill',
    iconColor = '#34C759',
    isDark = false,
}: SwiftUIToastHUDProps) {
    if (!message) return null;

    const textColor = isDark ? '#FFFFFF' : '#000000';

    return (
        <View
            style={[
                styles.pill,
                {
                    backgroundColor: isDark ? 'rgba(30, 30, 32, 0.92)' : 'rgba(255, 255, 255, 0.94)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    ...(Platform.OS === 'web' ? {
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        boxShadow: isDark
                            ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                            : '0 8px 24px rgba(0, 0, 0, 0.12)',
                    } as any : {}),
                },
            ]}
        >
            <PlatformIcon name={icon} size={15} tintColor={iconColor} />
            <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
                {message}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
});
