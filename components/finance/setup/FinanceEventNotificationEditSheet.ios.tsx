import React, { useState, useEffect, useMemo } from 'react';
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
    Picker,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceEventNotificationRule,
    FinanceDocumentRulesSettings,
    PaymentDueTiming,
    ReminderTiming,
    PAYMENT_DUE_TIMING_OPTIONS,
    REMINDER_TIMING_OPTIONS,
    getEnabledFinanceDocumentTypes,
} from '@/lib/api/financeSetup';

export interface FinanceEventNotificationEditSheetProps {
    visible: boolean;
    onClose: () => void;
    eventRule: FinanceEventNotificationRule | null;
    documentRules: FinanceDocumentRulesSettings;
    onSave: (updated: FinanceEventNotificationRule) => void;
}

const STATUS_OPTIONS = ['Active', 'Inactive'];

export function FinanceEventNotificationEditSheet({
    visible,
    onClose,
    eventRule,
    documentRules,
    onSave,
}: FinanceEventNotificationEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const [statusIndex, setStatusIndex] = useState(0); // 0 = Active, 1 = Inactive
    const [paymentTimingIndex, setPaymentTimingIndex] = useState(1); // 1 day before
    const [reminderTimingIndex, setReminderTimingIndex] = useState(1); // After 24 hours
    const [appliedDocKeys, setAppliedDocKeys] = useState<string[]>(['all']);

    const enabledDocs = useMemo(() => {
        return getEnabledFinanceDocumentTypes(documentRules);
    }, [documentRules]);

    const isPaymentDue = eventRule?.id === 'payment_due';
    const isReminder = eventRule?.id === 'pending_approval_reminder';

    useEffect(() => {
        if (visible && eventRule) {
            setStatusIndex(eventRule.enabled ? 0 : 1);
            if (eventRule.paymentDueTiming) {
                const idx = PAYMENT_DUE_TIMING_OPTIONS.findIndex((o) => o.value === eventRule.paymentDueTiming);
                setPaymentTimingIndex(idx >= 0 ? idx : 1);
            }
            if (eventRule.reminderTiming) {
                const idx = REMINDER_TIMING_OPTIONS.findIndex((o) => o.value === eventRule.reminderTiming);
                setReminderTimingIndex(idx >= 0 ? idx : 1);
            }
            setAppliedDocKeys(eventRule.appliedDocumentTypes || ['all']);
        }
    }, [visible, eventRule]);

    const handleToggleDocKey = (key: string) => {
        Haptics.selectionAsync();
        if (key === 'all') {
            setAppliedDocKeys(['all']);
            return;
        }

        let next: string[];
        if (appliedDocKeys.includes('all')) {
            next = [key];
        } else if (appliedDocKeys.includes(key)) {
            next = appliedDocKeys.filter((k) => k !== key);
            if (next.length === 0) {
                next = ['all'];
            }
        } else {
            next = [...appliedDocKeys, key];
            if (next.length === enabledDocs.length) {
                next = ['all'];
            }
        }
        setAppliedDocKeys(next);
    };

    const handleSave = () => {
        if (!eventRule) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updated: FinanceEventNotificationRule = {
            ...eventRule,
            enabled: statusIndex === 0,
            paymentDueTiming: isPaymentDue ? PAYMENT_DUE_TIMING_OPTIONS[paymentTimingIndex].value : eventRule.paymentDueTiming,
            reminderTiming: isReminder ? REMINDER_TIMING_OPTIONS[reminderTimingIndex].value : eventRule.reminderTiming,
            appliedDocumentTypes: appliedDocKeys,
        };

        onSave(updated);
        onClose();
    };

    if (!eventRule) return null;

    return (
        <Host
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: visible ? 'auto' : 'none',
            }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
                presentationDetents={[0.88, 0.96]}
                presentationDragIndicator="hidden"
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                        frame({ maxWidth: 9999, maxHeight: 9999 }),
                    ]}
                >
                    {/* Header Toolbar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 12 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {eventRule.name}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Event Status Section */}
                        <Section title="Status">
                            <Picker
                                label="Notification Status"
                                variant="menu"
                                selectedIndex={statusIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setStatusIndex(index);
                                }}
                                options={STATUS_OPTIONS}
                                modifiers={menuControlModifiers}
                            />
                            <SwiftUIText size={11} color={subtextColor}>
                                When active, this event trigger will automatically dispatch notifications.
                            </SwiftUIText>
                        </Section>

                        {/* Timing Configuration Section if applicable */}
                        {isPaymentDue && (
                            <Section title="Delivery Timing">
                                <Picker
                                    label="Schedule Alert"
                                    variant="menu"
                                    selectedIndex={paymentTimingIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setPaymentTimingIndex(index);
                                    }}
                                    options={PAYMENT_DUE_TIMING_OPTIONS.map((o) => o.label)}
                                    modifiers={menuControlModifiers}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    {PAYMENT_DUE_TIMING_OPTIONS[paymentTimingIndex]?.description || ''}
                                </SwiftUIText>
                            </Section>
                        )}

                        {isReminder && (
                            <Section title="Reminder Frequency">
                                <Picker
                                    label="Send Reminder"
                                    variant="menu"
                                    selectedIndex={reminderTimingIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setReminderTimingIndex(index);
                                    }}
                                    options={REMINDER_TIMING_OPTIONS.map((o) => o.label)}
                                    modifiers={menuControlModifiers}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    {REMINDER_TIMING_OPTIONS[reminderTimingIndex]?.description || ''}
                                </SwiftUIText>
                            </Section>
                        )}

                        {/* Recipients Resolution Section */}
                        <Section title="Recipients Derivation">
                            <HStack alignment="center">
                                <SwiftUIText size={14} color={subtextColor}>Target Recipients</SwiftUIText>
                                <Spacer />
                                <SwiftUIText
                                    size={14}
                                    weight="semibold"
                                    color={textColor}
                                >
                                    {eventRule.recipientDescription}
                                </SwiftUIText>
                            </HStack>
                            <SwiftUIText size={11} color={subtextColor}>
                                Derived from Approval Matrix and requester metadata automatically.
                            </SwiftUIText>
                        </Section>

                        {/* Document-Aware Applicability */}
                        <Section title="Applied Documents">
                            <Button
                                variant="plain"
                                onPress={() => handleToggleDocKey('all')}
                            >
                                <HStack alignment="center">
                                    <SwiftUIText size={15} color={textColor}>
                                        All Active Documents
                                    </SwiftUIText>
                                    <Spacer />
                                    {appliedDocKeys.includes('all') && (
                                        <SwiftUIText size={16} weight="bold" color="#007AFF">✓</SwiftUIText>
                                    )}
                                </HStack>
                            </Button>

                            {enabledDocs.map((doc) => {
                                const isSelected =
                                    appliedDocKeys.includes('all') || appliedDocKeys.includes(doc.key);
                                const docLabel = `${doc.code} • ${doc.workflow === 'purchasing' ? 'Purchasing' : 'Reimbursement'}`;
                                return (
                                    <Button
                                        key={doc.key}
                                        variant="plain"
                                        onPress={() => handleToggleDocKey(doc.key)}
                                    >
                                        <HStack alignment="center">
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={15} color={textColor}>
                                                    {doc.name}
                                                </SwiftUIText>
                                                <SwiftUIText
                                                    size={11}
                                                    color={subtextColor}
                                                >
                                                    {docLabel}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            {isSelected && (
                                                <SwiftUIText size={16} weight="bold" color="#007AFF">✓</SwiftUIText>
                                            )}
                                        </HStack>
                                    </Button>
                                );
                            })}
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
