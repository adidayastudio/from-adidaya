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

export interface FinancePlaceholderGuideSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
}

export function FinancePlaceholderGuideSheet({
    visible,
    onClose,
    title,
    subtitle,
    description,
}: FinancePlaceholderGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.72, 0.82]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'top' }),
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        spacing={12}
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {`About ${title}`}
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

                    {/* Content Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        <Section title={subtitle || 'Overview'}>
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    {title}
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    {description}
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        <Section title="Roadmap Status">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    This module is currently in placeholder state. Detailed configuration and rules will be available in future releases.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinancePlaceholderGuideSheetIOS = FinancePlaceholderGuideSheet;
