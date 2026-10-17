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

export interface FinanceTaxRulesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceTaxRulesGuideSheet({
    visible,
    onClose,
}: FinanceTaxRulesGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.82, 0.92]}
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
                            About Tax Rules
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
                        {/* Section 1: Overview */}
                        <Section title="Overview">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    What are Tax Rules?
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Tax Rules specify rate percentages, classification categories, and ledger mappings for value-added tax (PPN) and withholding tax (PPh) calculations.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Inheritance by Expense Types
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    When an Expense Type is configured with a default Tax Rule, transactions using that classification automatically adopt the designated tax calculation.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Indonesian Tax Classifications */}
                        <Section title="Standard Classifications">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    PPN (Value Added Tax)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Applied on procurement of materials and goods (11% standard, 12% statutory future rate). Mapped to input tax (PPN Masukan).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    PPh 23 & PPh 21 (Withholding Tax)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Withheld on corporate contractor services (2%), equipment rentals, and individual professional fees (5%).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    PPh Final 4(2)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Final withholding tax for construction implementation services (1.75%/standard construction rate).
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceTaxRulesGuideSheetIOS = FinanceTaxRulesGuideSheet;
export default FinanceTaxRulesGuideSheet;
