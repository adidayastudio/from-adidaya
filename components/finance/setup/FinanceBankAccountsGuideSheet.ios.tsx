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

export interface FinanceBankAccountsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceBankAccountsGuideSheet({
    visible,
    onClose,
}: FinanceBankAccountsGuideSheetProps) {
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
                            About Bank Accounts
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
                        {/* Section 1: Unified Master List & Owner Types */}
                        <Section title="Account Classifications">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Company Accounts
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Organization-owned accounts used for receiving revenue, operational pools, petty cash funding, or disburse runs.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Vendor Accounts
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Saved beneficiary accounts for suppliers, contractors, and trade partners linked to the Vendor directory.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Employee Accounts
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Saved accounts for staff, crew members, and employees used for payroll, mileage, and reimbursement claims.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Other Beneficiaries
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Ad-hoc or third-party beneficiaries such as external consultants, landlords, or government agencies.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Primary Account Scope */}
                        <Section title="Primary Account Behavior">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Scoped to Owner Entity
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Primary status is scoped per beneficiary. If a Vendor has 3 saved accounts, setting one as Primary designates it as their default payout destination without affecting other entities.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Smart Auto-Selection
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    When creating a purchase order or reimbursement, selecting a payee automatically pre-selects their Primary bank account.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Labels & Masking */}
                        <Section title="Account Labels & Security">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Internal Account Labels
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Labels (e.g. "Main Operating", "Project Payments", "Payroll") distinguish multiple accounts belonging to the same entity.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Masked Number Display
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Account numbers are masked in lists for security (•••• 9381). Long-press any card to copy the full account number.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 4: Lifecycle & Archiving */}
                        <Section title="Archiving & Audit Trail">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Historical Integrity
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Accounts referenced by past payments are archived rather than permanently deleted, ensuring past financial ledgers remain consistent.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
