import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Host,
    HStack,
    VStack,
    Spacer,
    GlassEffectContainer,
    Image,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import { padding, frame, glassEffect, cornerRadius } from '@expo/ui/swift-ui/modifiers';

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
    const subtitleColor = '#8E8E93';

    return (
        <View style={styles.container}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ maxWidth: Infinity, height: 60 }),
                    cornerRadius(30),
                ]}>
                    <HStack alignment="center" spacing={12} modifiers={[
                        padding({ top: 8, bottom: 8, leading: 20, trailing: 16 }),
                        glassEffect({ shape: 'capsule' }),
                    ]}>
                        {/* Text di Kiri: Title & Subtitle */}
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={14} weight="bold" color={textColor}>
                                {title}
                            </SwiftUIText>
                            <SwiftUIText size={11} weight="medium" color={subtitleColor}>
                                {message}
                            </SwiftUIText>
                        </VStack>

                        <Spacer />

                        {/* Ikon Besar Hijau Solid di Kanan */}
                        <Image systemName="checkmark.circle.fill" size={32} color="#34C759" />
                    </HStack>
                </GlassEffectContainer>
            </Host>
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
        backgroundColor: 'transparent',
    },
});
