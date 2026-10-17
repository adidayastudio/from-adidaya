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

export interface AuditLogItem {
    id: string;
    actor: string;
    actorRole?: string;
    actorAvatarUrl?: string;
    action: string;
    detail: string;
    time: string;
    category: 'Setup Changes' | 'Requests & Approvals' | 'Attendance Corrections' | 'Security / Access' | 'Payments & Disbursements' | 'Bank & Funding' | 'Documents & Rules';
    icon: string;
    iconColor: string;
    relatedEmployee?: string;
    oldValue?: string;
    newValue?: string;
    targetModule?: string;
    ipAddress?: string;
    timestampIso?: string;
}

export const AUDIT_CATEGORY_COLORS: Record<string, string> = {
    'Setup Changes': '#007AFF',
    'Requests & Approvals': '#34C759',
    'Attendance Corrections': '#AF52DE',
    'Security / Access': '#FF9500',
    'Payments & Disbursements': '#FF9500',
    'Bank & Funding': '#5856D6',
    'Documents & Rules': '#AF52DE',
};

export function getAuditCategoryColor(category: string): string {
    return (AUDIT_CATEGORY_COLORS as Record<string, string>)[category] || '#007AFF';
}

export function getAuditCategoryShortLabel(category: string): string {
    switch (category) {
        case 'Setup Changes':
            return 'Setup';
        case 'Requests & Approvals':
            return 'Request';
        case 'Attendance Corrections':
            return 'Correction';
        case 'Security / Access':
            return 'Security';
        default:
            return category;
    }
}

export interface AuditLogDetailSheetProps {
    visible: boolean;
    onClose: () => void;
    item: AuditLogItem | null;
}

export function AuditLogDetailSheet({
    visible,
    onClose,
    item,
}: AuditLogDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    if (!item) return null;

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.72]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <VStack spacing={2} alignment="leading">
                            <SwiftUIText size={17} weight="bold" color={textColor}>
                                Audit Trail Record
                            </SwiftUIText>
                            <SwiftUIText size={12.5} color={subtextColor}>
                                Immutable System Event Log
                            </SwiftUIText>
                        </VStack>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form Content */}
                    <Form modifiers={[background('clear')]}>
                        {/* Event Information */}
                        <Section title="Event Information">
                            <HStack alignment="center">
                                <SwiftUIText size={15} color={nativeControlTextColor}>
                                    Action
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={14} weight="bold" color={textColor}>
                                    {item.action}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText size={15} color={nativeControlTextColor}>
                                    Actor
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={14} color={textColor}>
                                    {`${item.actor}${item.actorRole ? ` (${item.actorRole})` : ''}`}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText size={15} color={nativeControlTextColor}>
                                    Category
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={14} weight="bold" color={getAuditCategoryColor(item.category)}>
                                    {item.category}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText size={15} color={nativeControlTextColor}>
                                    Timestamp
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={13.5} color={subtextColor}>
                                    {item.time}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {/* Change Detail Section */}
                        <Section title="Change Specification">
                            <VStack spacing={6} alignment="leading">
                                <SwiftUIText size={14.5} weight="bold" color={textColor}>
                                    {item.detail}
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* System Verification & Integrity Section */}
                        <Section title="Security & Integrity">
                            <HStack alignment="center">
                                <SwiftUIText size={14} color={nativeControlTextColor}>
                                    Record ID
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={13} color={subtextColor}>
                                    {item.id}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText size={14} color={nativeControlTextColor}>
                                    Integrity Status
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={13} weight="bold" color="#34C759">
                                    ✓ Immutable & Sealed
                                </SwiftUIText>
                            </HStack>

                            <VStack spacing={4} alignment="leading">
                                <SwiftUIText size={12} color={subtextColor}>
                                    Audit trail logs are immutable and cannot be deleted or modified from the user interface. Retention is enforced according to Privacy & Retention rules.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export default AuditLogDetailSheet;
