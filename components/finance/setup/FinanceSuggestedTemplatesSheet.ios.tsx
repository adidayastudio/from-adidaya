import React from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    SUGGESTED_CUSTOM_RULE_PRESETS,
    SuggestedCustomRulePreset,
} from '@/lib/api/financeSetup';

export interface FinanceSuggestedTemplatesSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelectPreset: (preset: SuggestedCustomRulePreset) => void;
}

export function FinanceSuggestedTemplatesSheet({
    visible,
    onClose,
    onSelectPreset,
}: FinanceSuggestedTemplatesSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const handleSelect = (preset: SuggestedCustomRulePreset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        onSelectPreset(preset);
    };

    return (
        <Host
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: visible ? 'auto' : 'none',
            }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
                presentationDetents={[0.75, 0.95]}
                presentationDragIndicator="visible"
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                        frame({ maxWidth: 9999, maxHeight: 9999 }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 12 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            Suggested Rule Templates
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Templates List in Native Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        <Section title="Ready-To-Use Finance Presets">
                            {SUGGESTED_CUSTOM_RULE_PRESETS.map((preset) => (
                                <Button
                                    key={preset.id}
                                    variant="plain"
                                    onPress={() => handleSelect(preset)}
                                >
                                    <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                        <VStack alignment="leading" spacing={3}>
                                            <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                {preset.title}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                {preset.subtitle}
                                            </SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        <SwiftUIText size={14} color="#007AFF">
                                            {"↗"}
                                        </SwiftUIText>
                                    </HStack>
                                </Button>
                            ))}
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
