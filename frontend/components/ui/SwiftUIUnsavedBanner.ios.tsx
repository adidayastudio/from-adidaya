import React from 'react';
import { StyleSheet, View } from 'react-native';
import { 
    Host,
    HStack, 
    Button,
    GlassEffectContainer,
    Image,
    Text as SwiftUIText,
    Spacer,
} from '@expo/ui/swift-ui';
import { padding, frame, glassEffect, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';

export interface SwiftUIUnsavedBannerProps {
    onCancel: () => void;
    onSave: () => void;
    saving?: boolean;
    isDark?: boolean;
    title?: string;
}

export function SwiftUIUnsavedBanner({
    onCancel,
    onSave,
    saving = false,
    isDark = false,
    title = 'Unsaved changes',
}: SwiftUIUnsavedBannerProps) {
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#64748B';

    return (
        <View style={styles.container}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ maxWidth: Infinity, height: 56 }),
                    cornerRadius(28)
                ]}>
                    <HStack alignment="center" spacing={12} modifiers={[
                        padding({ top: 6, bottom: 6, leading: 16, trailing: 10 }),
                        glassEffect({ shape: 'capsule' })
                    ]}>
                        <HStack alignment="center" spacing={8}>
                            <Image systemName="circle.fill" size={8} color="#FF9500" />
                            <SwiftUIText size={14} weight="semibold" color={textColor}>
                                {title}
                            </SwiftUIText>
                        </HStack>

                        <Spacer />

                        <Button
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onCancel();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                padding({ leading: 8, trailing: 8, top: 6, bottom: 6 })
                            ]}
                        >
                            <SwiftUIText size={14} weight="medium" color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Button
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onSave();
                            }}
                            variant="glassProminent"
                            color="#007AFF"
                            disabled={saving}
                            modifiers={[
                                cornerRadius(18),
                                padding({ leading: 12, trailing: 12, top: 4, bottom: 4 })
                            ]}
                        >
                            <SwiftUIText size={14} weight="semibold" color="#FFFFFF">
                                {saving ? 'Saving...' : 'Save'}
                            </SwiftUIText>
                        </Button>
                    </HStack>
                </GlassEffectContainer>
            </Host>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
    },
});
