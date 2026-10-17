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

export interface FinanceApprovalMatrixGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceApprovalMatrixGuideSheet({
    visible,
    onClose,
}: FinanceApprovalMatrixGuideSheetProps) {
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
                            About Approval Matrix
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
                        {/* Section 1: Overview & Philosophy */}
                        <Section title="Overview & Philosophy">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Tiered Spending Authorization
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    An approval matrix eliminates operational bottlenecks by allowing routine low-value purchases to be signed off quickly by project leads, while routing mid-to-high capital commitments through managerial and executive oversight.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Forma Sensible Defaults
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Forma provides canonical default tiers ready from day one. Organizations can use them immediately, archive unneeded tiers, or duplicate to customize thresholds for specific project governance.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Forma Presets Architecture */}
                        <Section title="Forma Presets vs Custom Tiers">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Forma Presets
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Canonical system presets cannot be deleted or directly overwritten. If your company workflow differs, archive the preset and duplicate it to create a custom version.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Custom Tiers
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Created specifically by your workspace. You can customize exact monetary thresholds, multi-level sequential approvers, and quotation attachment requirements.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Approver Routing Modes */}
                        <Section title="Multi-Level Approval Rules">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Sequential Routing
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    The document moves sequentially from Level 1 (e.g. Project Lead) to Level 2 (Finance Manager) and Level 3 (Executive Board). Each approver must approve before the next is notified.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Quotation & Compliance Attachment
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Higher tiers can enforce mandatory vendor price comparison attachments (e.g. minimum 2 or 3 quotations) before requests can be submitted.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceApprovalMatrixGuideSheetIOS = FinanceApprovalMatrixGuideSheet;
export default FinanceApprovalMatrixGuideSheet;
