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

export interface FinancePaymentTermsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinancePaymentTermsGuideSheet({
    visible,
    onClose,
}: FinancePaymentTermsGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.78, 0.9]}
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
                            About Payment Terms
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
                        {/* Section 1: How Due Dates Work */}
                        <Section title="How Due Dates Work">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Payment Deadline Calculation
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment terms determine the maximum allowable deadline to settle an invoice, bill, or reimbursement.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Formula
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Submission Date + Due Days = Maximum Payment Date.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Submission & Payment Timeline Scenarios */}
                        <Section title="Submission & Payment Timeline">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Net 7 Days
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    If submitted on 7 Sep 2026, maximum payment deadline is 14 Sep 2026 (7 calendar days).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Net 14 Days
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    If submitted on 7 Sep 2026, maximum payment deadline is 21 Sep 2026 (14 calendar days).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Net 30 Days
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    If submitted on 7 Sep 2026, maximum payment deadline is 7 Oct 2026 (30 calendar days).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Cash on Delivery (COD)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    If submitted on 7 Sep 2026, payment is due immediately on 7 Sep 2026 (0 days).
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Workspace Default & Archiving */}
                        <Section title="Workspace Rules">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Workspace Default
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    The default term is automatically selected when creating new transactions to ensure consistent payment schedules.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Historical Archiving
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Terms referenced by existing transactions are archived instead of deleted, ensuring historical audit trails remain accurate.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
