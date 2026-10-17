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

export interface FinanceResourceMappingGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceResourceMappingGuideSheet({
    visible,
    onClose,
}: FinanceResourceMappingGuideSheetProps) {
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
                            About Categories & Mapping
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
                        {/* Section 1: Category vs Subcategory */}
                        <Section title="Structure & Hierarchy">
                            {/* Category */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Category
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Top-level group (e.g. Material, Overhead) defining the primary operational scope and default Expense Type.
                                </SwiftUIText>
                            </VStack>

                            {/* Subcategory */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Subcategory
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Granular line-item classification (e.g. Building Materials, Software) used on actual transaction entries.
                                </SwiftUIText>
                            </VStack>

                            {/* Inheritance */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Inheritance Rules
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Subcategories automatically inherit the parent Category's Expense Type and Resource Mapping unless explicitly customized.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Resource Types */}
                        <Section title="Resource Types">
                            {/* Material */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Material
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Consumable goods, stock, and project materials.
                                </SwiftUIText>
                            </VStack>

                            {/* Tools */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Tools
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Reusable tools and operational equipment.
                                </SwiftUIText>
                            </VStack>

                            {/* Assets */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Assets
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Long-term organizational assets such as machines, vehicles, and facilities.
                                </SwiftUIText>
                            </VStack>

                            {/* Services */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Services
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    External services without a physical inventory item.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Module Integration */}
                        <Section title="Module Integration">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Resource types are defined in Resources. This classification maps Finance transaction lines directly into physical logistics and inventory tracking.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceResourceMappingGuideSheetIOS = FinanceResourceMappingGuideSheet;
