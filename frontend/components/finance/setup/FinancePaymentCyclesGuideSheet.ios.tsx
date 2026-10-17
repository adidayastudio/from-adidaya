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

export interface FinancePaymentCyclesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinancePaymentCyclesGuideSheet({
    visible,
    onClose,
}: FinancePaymentCyclesGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.82, 0.94]}
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
                            About Payment Cycles
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
                        {/* Section 1: Core Function & Terms vs Cycles */}
                        <Section title="Payment Terms vs Payment Cycles">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Payment Terms
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Defines when a transaction is due. This is the legal / contractual deadline for payment.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Payment Cycles
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Defines when approved transactions are grouped and processed for payment by Finance.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Due Date Integrity
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment Cycles never overwrite or alter the transaction's original Due Date. For example, if an invoice is due on the 13th and the cycle pays on the 15th, the Due Date remains the 13th.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Cut-off Rules */}
                        <Section title="Cut-off Rules">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Cut-off Deadline
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Each cycle defines when transactions stop being included in the upcoming payment run.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Late Approval Roll-over
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Transactions approved after the cut-off automatically move to the next eligible payment cycle. The contractual Due Date is never modified.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Frequency Clarification */}
                        <Section title="Frequency Definitions">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Weekly
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment occurs on a selected weekday every week (e.g. Every Friday).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Every 2 Weeks (Bi-Weekly)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment recurs every 14 days on a selected weekday based on an anchor start date (e.g. Every other Friday). This is not Twice Monthly.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Twice Monthly (Semi-Monthly)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment occurs on two specific calendar dates every month (e.g. 1st & 15th of each month).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Monthly
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Payment occurs once on a selected calendar date (e.g. 25th of each month). If a date does not exist in a shorter month, it automatically defaults to the last calendar day.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 4: Lifecycle & Inactive Status */}
                        <Section title="Cycle Lifecycle & Archiving">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Active vs Inactive
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Inactive cycles remain available in historical audit records and retain their full configuration, but are excluded from new transaction payment runs.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Preserve History
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Prefer deactivating a cycle over deleting it if it has already been used to process payments.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
