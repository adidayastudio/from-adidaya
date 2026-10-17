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
    TextField,
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
    parseStructuredTiming,
    formatPaymentDueTiming,
    formatReminderTiming,
} from '@/lib/api/financeSetup';

export interface FinanceCustomTimingSheetProps {
    visible: boolean;
    onClose: () => void;
    eventType: 'payment_due' | 'pending_approval_reminder';
    currentTimingValue?: string;
    onSave: (timingValue: string) => void;
}

const UNIT_OPTIONS = ['Days', 'Hours'];
const DIRECTION_OPTIONS = ['Before', 'After'];

export function FinanceCustomTimingSheet({
    visible,
    onClose,
    eventType,
    currentTimingValue,
    onSave,
}: FinanceCustomTimingSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isPaymentDue = eventType === 'payment_due';

    const sheetTitle = isPaymentDue ? 'Payment Due Timing' : 'Reminder Timing';

    const [valStr, setValStr] = useState('2');
    const [unitIndex, setUnitIndex] = useState(0); // 0 = Days, 1 = Hours
    const [directionIndex, setDirectionIndex] = useState(0); // 0 = Before, 1 = After
    const [mountKey, setMountKey] = useState(0);

    useEffect(() => {
        if (visible) {
            const defaultDir = isPaymentDue ? 'before' : 'after';
            const parsed = parseStructuredTiming(currentTimingValue, defaultDir);
            setValStr(String(parsed.value || (isPaymentDue ? 2 : 12)));
            setUnitIndex(parsed.unit === 'hours' ? 1 : 0);
            setDirectionIndex(parsed.direction === 'after' ? 1 : 0);
            setMountKey((prev) => prev + 1);
        }
    }, [visible, currentTimingValue, isPaymentDue]);

    const numericVal = Math.max(1, parseInt(valStr, 10) || 1);
    const selectedUnit = unitIndex === 1 ? 'hours' : 'days';
    const selectedDirection = directionIndex === 1 ? 'after' : 'before';

    const previewDisplay = useMemo(() => {
        const unitLabel = numericVal === 1 ? (selectedUnit === 'hours' ? 'hour' : 'day') : selectedUnit;
        if (isPaymentDue) {
            return selectedDirection === 'after'
                ? `${numericVal} ${unitLabel} overdue`
                : `${numericVal} ${unitLabel} before`;
        }
        return selectedDirection === 'after'
            ? `After ${numericVal} ${unitLabel}`
            : `${numericVal} ${unitLabel} before`;
    }, [numericVal, selectedUnit, selectedDirection, isPaymentDue]);

    const previewHelperText = useMemo(() => {
        if (isPaymentDue) {
            return selectedDirection === 'before'
                ? 'The notification will trigger ahead of the payment due date.'
                : 'The notification will trigger after the payment due date (overdue reminder).';
        }
        return selectedDirection === 'after'
            ? 'The reminder will dispatch after the approval request stays pending.'
            : 'The reminder will trigger before the approval deadline expires.';
    }, [isPaymentDue, selectedDirection]);

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const structuredKey = `custom_${numericVal}_${selectedUnit}_${selectedDirection}`;
        onSave(structuredKey);
        onClose();
    };

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
                presentationDetents={[0.65, 0.8]}
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
                            {sheetTitle}
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
                        {/* 1. Value & Unit Configuration */}
                        <Section title="Duration & Offset">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 2 })]}>
                                <SwiftUIText size={12} color={subtextColor}>
                                    Quantity
                                </SwiftUIText>
                                <TextField
                                    key={`custom-timing-input-${mountKey}`}
                                    defaultValue={valStr}
                                    keyboardType="numeric"
                                    onChangeText={(text: string) => {
                                        const clean = text.replace(/[^0-9]/g, '');
                                        setValStr(clean);
                                    }}
                                    placeholder="e.g. 5"
                                    modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                />
                            </VStack>

                            <Picker
                                label="Unit"
                                variant="menu"
                                selectedIndex={unitIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setUnitIndex(index);
                                }}
                                options={UNIT_OPTIONS}
                                modifiers={menuControlModifiers}
                            />

                            <Picker
                                label="Timing Offset"
                                variant="menu"
                                selectedIndex={directionIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setDirectionIndex(index);
                                }}
                                options={DIRECTION_OPTIONS}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* 2. Live Preview */}
                        <Section title="Preview">
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={14} color={subtextColor}>
                                    Scheduled Timing
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} weight="bold" color="#FF9500">
                                    {previewDisplay}
                                </SwiftUIText>
                            </HStack>
                            <SwiftUIText size={11} color={subtextColor}>
                                {previewHelperText}
                            </SwiftUIText>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
