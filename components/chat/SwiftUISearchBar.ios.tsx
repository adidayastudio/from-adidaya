import { useTheme } from '@/context/ThemeContext';
import { 
    Host,
    HStack, 
    Button,
    GlassEffectContainer,
    Image,
    TextField,
} from '@expo/ui/swift-ui';
import { padding, frame, glassEffect, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface SwiftUISearchBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onClear?: () => void;
    isDark?: boolean;
}

export function SwiftUISearchBar({
    placeholder = 'Search...',
    value,
    onChangeText,
    onClear,
    isDark = false,
}: SwiftUISearchBarProps) {
    return (
        <View style={styles.container}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ maxWidth: Infinity, height: 56 }),
                    cornerRadius(28)
                ]}>
                    <HStack alignment="center" spacing={10} modifiers={[
                        padding({ top: 8, bottom: 8, leading: 14, trailing: 14 }),
                        glassEffect({ shape: 'capsule' })
                    ]}>
                        <Image systemName="magnifyingglass" size={16} color={isDark ? '#8E8E93' : '#8E8E93'} />

                        <TextField
                            placeholder={placeholder}
                            defaultValue={value}
                            onChangeText={onChangeText}
                            modifiers={[
                                frame({ maxWidth: Infinity, height: 38 })
                            ]}
                        />

                        {value.length > 0 && (
                            <Button
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (onClear) onClear();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ width: 28, height: 28 })
                                ]}
                            >
                                <Image systemName="xmark.circle.fill" size={16} color="#8E8E93" />
                            </Button>
                        )}
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
