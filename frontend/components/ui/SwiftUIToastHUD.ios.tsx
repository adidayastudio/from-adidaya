import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Host,
    HStack,
    GlassEffectContainer,
    Image,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import { padding, frame, glassEffect, cornerRadius } from '@expo/ui/swift-ui/modifiers';

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
    const calcWidth = Math.min(340, Math.max(120, message.length * 8.2 + 48));

    return (
        <View style={[styles.container, { width: calcWidth }]}>
            <Host style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ width: calcWidth, height: 40 }),
                    cornerRadius(20),
                    glassEffect({ shape: 'capsule' }),
                ]}>
                    <HStack alignment="center" spacing={8} modifiers={[
                        frame({ width: calcWidth, height: 40 }),
                        padding({ top: 4, bottom: 4, leading: 14, trailing: 14 }),
                    ]}>
                        <Image systemName={icon as any} size={15} color={iconColor} />
                        <SwiftUIText size={13} weight="semibold" color={textColor}>
                            {message}
                        </SwiftUIText>
                    </HStack>
                </GlassEffectContainer>
            </Host>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 40,
        borderRadius: 20,
        alignSelf: 'center',
    },
});
