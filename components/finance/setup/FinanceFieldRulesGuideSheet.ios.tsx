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

export interface FinanceFieldRulesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceFieldRulesGuideSheet({
    visible,
    onClose,
}: FinanceFieldRulesGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85, 0.95]}
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
                            About Field Rules
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
                        <Section title="Overview & Requirement Control">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Field Requirement vs Visibility
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Field Rules control which fields are mandatory (Required) or non-mandatory (Optional) during document submission. Toggling a field off does not remove it from the form; it simply allows requesters to submit without completing that specific field.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Dynamic Forma Presets
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Forma automatically provides sensible defaults that adapt seamlessly to your active Finance workflow. You can customize individual rules or reset back to Forma Presets at any time.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Workflow Responsibility Shifting */}
                        <Section title="Workflow Responsibility Shifting">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Without Consolidation (Direct Purchasing)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Workflow: Request → Payment. The requester is directly responsible for purchasing info. Therefore, the Purchase Request requires actual transaction fields such as final unit price, supplier, beneficiary account, and invoice.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    With Consolidation (Procurement Realization)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Workflow: Request → Consolidation → Payment. Purchase Requests become lightweight intent submissions (item, quantity, deadline), while the Consolidation stage captures actual purchasing realization (final price, vendor, and tax invoice).
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Data Integrity & Settlement */}
                        <Section title="Data Integrity & Settlement Rules">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Preserving Requested vs Actual Data
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Modifying purchasing realization in Consolidation never overwrites original submitted Request data. Both are preserved for full audit trails and variance analysis.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Consolidation to Payment Flexibility
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    One Consolidation document can bundle multiple requests, and finance can settle them through multiple separate payment transactions. Each payment retains full reference to its upstream source.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceFieldRulesGuideSheetIOS = FinanceFieldRulesGuideSheet;
export default FinanceFieldRulesGuideSheet;
