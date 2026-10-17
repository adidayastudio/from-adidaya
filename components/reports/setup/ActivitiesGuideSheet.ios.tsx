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

export interface ActivitiesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function ActivitiesGuideSheet({
    visible,
    onClose,
}: ActivitiesGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.88]}
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
                            About Activities & Forms
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
                        {/* Section 1: Activity Structure */}
                        <Section title="Activity Structure">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    What is an Activity?
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    An Activity defines a specific operational check, task, or inspection performed within a Report Type.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Relationship to Report Types
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Each Activity belongs to a Report Type and represents the actual work or inspection recorded during reporting.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Forms & Fields
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Each Activity can contain its own form fields, such as checklist items, text input, numbers, photos, measurements, or other required evidence.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Scheduling & Usage */}
                        <Section title="Scheduling & Usage">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Frequency
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Activities can have a recurring frequency such as Daily, Weekly, Biweekly, or Monthly to define how often they are expected to be performed.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Report Entry
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    When a report is created, its Activities become the forms users complete as operational evidence.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Structure
                                </SwiftUIText>
                                <SwiftUIText size={13} color="#007AFF" weight="medium">
                                    Category → Report Type → Activity → Fields
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Example
                                </SwiftUIText>
                                <SwiftUIText size={13} color={textColor} weight="medium">
                                    Facility & Operations → Maintenance → Electric Panel Inspection → Voltage / Condition / Photo
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const ActivitiesGuideSheetIOS = ActivitiesGuideSheet;
