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

export interface FinanceExpenseTypesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceExpenseTypesGuideSheet({
    visible,
    onClose,
}: FinanceExpenseTypesGuideSheetProps) {
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
                            About Expense Types
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
                        {/* Section 1: Classification Concept */}
                        <Section title="Classification Structure">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    What is an Expense Type?
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    A reusable classification standard applied across purchasing, claims, and reimbursements to standardize spending analysis.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Relationship to Categories
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Transaction Categories and subcategories select an Expense Type as their default spending classification.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Defaults & Overrides */}
                        <Section title="Accounting & Tax Defaults">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Default Tax Rule
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Pre-populates applicable tax definitions (e.g. PPN 11%, PPh 23, Non-Taxable) on transaction entry.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Default Account (COA)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Maps expense lines directly to general ledger Chart of Accounts for automated journal postings.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Transaction Override
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Tax and Account defaults can be adjusted on individual transaction lines by authorized users when required.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Architecture Note */}
                        <Section title="System Architecture">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Tax Rules and Accounts are managed independently in their dedicated setup sections. Expense Types only maintain default references.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceExpenseTypesGuideSheetIOS = FinanceExpenseTypesGuideSheet;
