import React, { useState, useEffect, useRef } from 'react';
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
    TextField,
    Picker,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    RetentionSetting,
    RetentionPreset,
    RetentionUnit,
} from '@/lib/api/clockSetup';

export type RetentionTypeKey = 'location' | 'photo' | 'audit_log';

export interface PrivacyRetentionModalProps {
    visible: boolean;
    onClose: () => void;
    retentionType: RetentionTypeKey | null;
    currentSetting?: RetentionSetting;
    onSave: (typeKey: RetentionTypeKey, updated: RetentionSetting) => void;
}

interface RetentionMeta {
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    color: string;
    defaultLabel: string;
}

const RETENTION_METAS: Record<RetentionTypeKey, RetentionMeta> = {
    location: {
        title: 'Location Data Retention',
        subtitle: 'How long clock-in/out location history is retained.',
        description:
            'Controls how long precise latitude & longitude attendance coordinates are kept. When the retention period expires, coordinate history is purged while core attendance timestamps remain.',
        icon: 'location.fill',
        color: '#007AFF',
        defaultLabel: '90 Days (Recommended)',
    },
    photo: {
        title: 'Attendance Photo Retention',
        subtitle: 'How long attendance verification photos are retained.',
        description:
            'Controls how long clock-in and clock-out selfie verification photos are preserved. Once the retention limit is reached, verification photo files are permanently purged.',
        icon: 'camera.fill',
        color: '#FF9500',
        defaultLabel: '90 Days (Recommended)',
    },
    audit_log: {
        title: 'Audit Log Retention',
        subtitle: 'How long attendance changes and approval records are retained.',
        description:
            'Preserves the complete change history (original value → corrected value, editor identity, modification timestamp, and approver). When expired, older logs are purged.',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
        defaultLabel: '1 Year (Recommended)',
    },
};

const PRESET_OPTIONS: Array<{ key: RetentionPreset; label: string }> = [
    { key: '7_days', label: '7 Days' },
    { key: '30_days', label: '30 Days' },
    { key: '90_days', label: '90 Days' },
    { key: '180_days', label: '180 Days' },
    { key: '1_year', label: '1 Year' },
    { key: 'custom', label: 'Custom' },
    { key: 'never', label: 'Never Delete' },
];

const UNIT_OPTIONS: Array<{ key: RetentionUnit; label: string }> = [
    { key: 'days', label: 'Days' },
    { key: 'months', label: 'Months' },
    { key: 'years', label: 'Years' },
];

export function PrivacyRetentionModal({
    visible,
    onClose,
    retentionType,
    currentSetting,
    onSave,
}: PrivacyRetentionModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const [presetIndex, setPresetIndex] = useState(2); // default 90 days
    const [customValueInput, setCustomValueInput] = useState('60');
    const customValueRef = useRef('60');
    const [unitIndex, setUnitIndex] = useState(0); // days

    useEffect(() => {
        if (visible && retentionType) {
            const fallbackPreset: RetentionPreset =
                retentionType === 'audit_log' ? '1_year' : '90_days';
            const activePreset = currentSetting?.preset || fallbackPreset;

            const pIdx = PRESET_OPTIONS.findIndex((o) => o.key === activePreset);
            setPresetIndex(pIdx >= 0 ? pIdx : 2);

            const cVal = String(currentSetting?.customValue || 60);
            setCustomValueInput(cVal);
            customValueRef.current = cVal;

            const uIdx = UNIT_OPTIONS.findIndex((u) => u.key === currentSetting?.customUnit);
            setUnitIndex(uIdx >= 0 ? uIdx : 0);
        }
    }, [visible, retentionType, currentSetting]);

    if (!retentionType) return null;

    const meta = RETENTION_METAS[retentionType];
    const selectedPresetObj = PRESET_OPTIONS[presetIndex] || PRESET_OPTIONS[2];
    const isCustom = selectedPresetObj.key === 'custom';

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const chosenPreset = selectedPresetObj.key;
        let finalSetting: RetentionSetting;

        if (chosenPreset === 'custom') {
            const parsed = parseInt((customValueRef.current || customValueInput || '30').replace(/[^0-9]/g, ''), 10);
            const val = isNaN(parsed) || parsed <= 0 ? 30 : parsed;
            const chosenUnit = UNIT_OPTIONS[unitIndex]?.key || 'days';

            finalSetting = {
                preset: 'custom',
                customValue: val,
                customUnit: chosenUnit,
            };
        } else {
            finalSetting = {
                preset: chosenPreset,
            };
        }

        onSave(retentionType, finalSetting);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={isCustom ? [0.88] : [0.75]}
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
                            {meta.title}
                        </SwiftUIText>

                        <Spacer />

                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Settings Form */}
                    <Form modifiers={[background('clear')]}>
                        {/* 1. Retention Period Options */}
                        <Section title="Retention Duration">
                            <Picker
                                label="Retention Period"
                                options={PRESET_OPTIONS.map((o) => o.label)}
                                selectedIndex={presetIndex}
                                onOptionSelected={(e) => {
                                    Haptics.selectionAsync();
                                    setPresetIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />
                        </Section>

                        {/* 2. Custom Duration Inputs (Revealed when Custom selected) */}
                        {isCustom && (
                            <Section title="Custom Duration Settings">
                                <HStack alignment="center">
                                    <SwiftUIText size={15} color={textColor}>
                                        Duration Value
                                    </SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        key={`custom-val-${customValueInput}`}
                                        defaultValue={customValueInput}
                                        placeholder="e.g. 45"
                                        onChangeText={(val) => {
                                            const cleaned = val.replace(/[^0-9]/g, '');
                                            setCustomValueInput(cleaned);
                                            customValueRef.current = cleaned;
                                        }}
                                        modifiers={[
                                            padding({ top: 8, bottom: 8, leading: 10, trailing: 10 }),
                                        ]}
                                    />
                                </HStack>

                                <Picker
                                    label="Time Unit"
                                    options={UNIT_OPTIONS.map((u) => u.label)}
                                    selectedIndex={unitIndex}
                                    onOptionSelected={(e) => {
                                        Haptics.selectionAsync();
                                        setUnitIndex(e.nativeEvent.index);
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                />
                            </Section>
                        )}

                        {/* 3. Policy Details & Core Preservation Guarantee */}
                        <Section title="Policy Details">
                            <VStack spacing={6} alignment="leading">
                                <SwiftUIText size={13.5} color={subtextColor}>
                                    {meta.description}
                                </SwiftUIText>
                                <SwiftUIText size={12.5} color={subtextColor}>
                                    {`• Default: ${meta.defaultLabel}`}
                                </SwiftUIText>
                                <SwiftUIText size={12.5} color="#34C759">
                                    {`✓ Core attendance records (clock-in/out timestamps, hours worked, approval status) remain preserved indefinitely.`}
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
