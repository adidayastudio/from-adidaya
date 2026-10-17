import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    DateTimePicker,
    Picker,
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

export interface DateRangeValue {
    startDate: Date | null;
    endDate: Date | null;
    label?: string;
}

export interface SwiftUIDateRangeSheetProps {
    isOpened: boolean;
    onClose: () => void;
    currentRange?: DateRangeValue;
    onApplyRange: (range: DateRangeValue) => void;
}

export const SwiftUIDateRangeSheet: React.FC<SwiftUIDateRangeSheetProps> = ({
    isOpened,
    onClose,
    currentRange,
    onApplyRange,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';

    const [presetIndex, setPresetIndex] = useState(0); // 0: Custom, 1: Today, 2: This Week, 3: This Month, 4: Last 30 Days
    const [startDate, setStartDate] = useState<Date>(currentRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState<Date>(currentRange?.endDate || new Date());

    const presetLabels = ['Custom Range', 'Today', 'This Week', 'This Month', 'Last 30 Days'];

    useEffect(() => {
        if (isOpened) {
            if (currentRange?.startDate) setStartDate(currentRange.startDate);
            if (currentRange?.endDate) setEndDate(currentRange.endDate);
            if (currentRange?.label === 'Today') setPresetIndex(1);
            else if (currentRange?.label === 'This Week') setPresetIndex(2);
            else if (currentRange?.label === 'This Month') setPresetIndex(3);
            else if (currentRange?.label === 'Last 30 Days') setPresetIndex(4);
            else setPresetIndex(0);
        }
    }, [isOpened, currentRange]);

    const handlePresetChange = (idx: number) => {
        setPresetIndex(idx);
        const now = new Date();
        if (idx === 1) {
            // Today
            const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            setStartDate(s);
            setEndDate(e);
        } else if (idx === 2) {
            // This Week
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const s = new Date(now.setDate(diff));
            s.setHours(0, 0, 0, 0);
            setStartDate(s);
            setEndDate(new Date());
        } else if (idx === 3) {
            // This Month
            const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            setStartDate(s);
            setEndDate(new Date());
        } else if (idx === 4) {
            // Last 30 Days
            const s = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            s.setHours(0, 0, 0, 0);
            setStartDate(s);
            setEndDate(new Date());
        }
    };

    const handleApply = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const label = presetIndex === 0 ? 'Custom Range' : presetLabels[presetIndex];
        onApplyRange({
            startDate,
            endDate,
            label,
        });
        onClose();
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onApplyRange({
            startDate: null,
            endDate: null,
            label: undefined,
        });
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.55]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background(sheetBg)]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}>
                        <SwiftUIText size={20} weight="bold" color={textColor}>
                            Filter Date Range
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            modifiers={[buttonStyle('glass')]}
                            onPress={onClose}
                        />
                    </HStack>

                    <Form>
                        <Section title="Quick Preset">
                            <Picker
                                title="Preset"
                                selectedIndex={presetIndex}
                                options={presetLabels}
                                onOptionSelected={handlePresetChange}
                            />
                        </Section>

                        <Section title="Range Details">
                            <DateTimePicker
                                title="Start Date"
                                initialDate={startDate.toISOString()}
                                onDateSelected={(date) => {
                                    setStartDate(date);
                                    setPresetIndex(0);
                                }}
                                variant="compact"
                                displayedComponents="date"
                            />
                            <DateTimePicker
                                title="End Date"
                                initialDate={endDate.toISOString()}
                                onDateSelected={(date) => {
                                    setEndDate(date);
                                    setPresetIndex(0);
                                }}
                                variant="compact"
                                displayedComponents="date"
                            />
                        </Section>

                        <Section>
                            <Button
                                color="#007AFF"
                                modifiers={[buttonStyle('borderedProminent')]}
                                onPress={handleApply}
                            >
                                Apply Date Filter
                            </Button>
                            <Button
                                color="#FF3B30"
                                modifiers={[buttonStyle('plain')]}
                                onPress={handleReset}
                            >
                                Clear Date Filter
                            </Button>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
