import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface DynamicIslandToastHUDProps {
    title?: string;
    message?: string;
    isDark?: boolean;
}

export function DynamicIslandToastHUD({
    title = 'Attendance Rules',
    message = 'Settings saved successfully',
    isDark = false,
}: DynamicIslandToastHUDProps) {
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtitleColor = isDark ? '#8E8E93' : '#8E8E93';

    return (
        <View style={styles.container}>
            <GlassEffectContainer
                borderRadius={30}
                intensity={80}
                tint="systemChromeMaterial"
                style={styles.glassWrapper}
            >
                <View style={styles.contentRow}>
                    {/* Text di Kiri: Title & Subtitle */}
                    <View style={styles.textColumn}>
                        <Text style={[styles.titleText, { color: textColor }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Text style={[styles.messageText, { color: subtitleColor }]} numberOfLines={1}>
                            {message}
                        </Text>
                    </View>

                    {/* Ikon Besar Hijau Solid di Kanan */}
                    <View style={styles.greenCheckCircle}>
                        <PlatformIcon name="checkmark" size={18} tintColor="#FFFFFF" />
                    </View>
                </View>
            </GlassEffectContainer>
        </View>
    );
}

export const LiquidGlassToastHUD = DynamicIslandToastHUD;

const styles = StyleSheet.create({
    container: {
        width: '92%',
        maxWidth: 390,
        height: 60,
        alignSelf: 'center',
    },
    glassWrapper: {
        width: '100%',
        height: 60,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: '100%',
    },
    textColumn: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    titleText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    messageText: {
        fontSize: 11,
        fontWeight: '500',
    },
    greenCheckCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#34C759',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
});
