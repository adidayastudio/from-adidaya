import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
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
    Switch,
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
    FinancePaymentTerm,
    PAYMENT_TERM_PRESETS,
    formatDueDaysLabel,
    calculateDueDate,
} from '@/lib/api/financeSetup';

export interface FinancePaymentTermEditSheetProps {
    visible: boolean;
    onClose: () => void;
    term?: FinancePaymentTerm | null;
    existingTerms: FinancePaymentTerm[];
    onSave: (term: FinancePaymentTerm) => void;
    onDelete?: (id: string) => void;
}

const STATUS_OPTIONS = ['Active', 'Archived'];

export function FinancePaymentTermEditSheet({
    visible,
    onClose,
    term,
    existingTerms,
    onSave,
    onDelete,
}: FinancePaymentTermEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!term;

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [daysStr, setDaysStr] = useState('0');
    const [isDefault, setIsDefault] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0); // 0: Active, 1: Archived

    useEffect(() => {
        if (visible) {
            if (term) {
                setName(term.name || '');
                setCode(term.code || '');
                setDaysStr(String(term.days ?? 0));
                setIsDefault(!!term.isDefault);
                setStatusIndex(term.status === 'archived' ? 1 : 0);
            } else {
                setName('');
                setCode('');
                setDaysStr('14');
                setIsDefault(false);
                setStatusIndex(0);
            }
        }
    }, [visible, term]);

    const numericDays = useMemo(() => {
        const parsed = parseInt(daysStr.replace(/[^0-9]/g, ''), 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }, [daysStr]);

    const formattedCalculationSample = useMemo(() => {
        const now = new Date();
        const due = calculateDueDate(now, numericDays);
        const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const nowText = now.toLocaleDateString('en-GB', formatOptions);
        const dueText = due.toLocaleDateString('en-GB', formatOptions);
        return {
            nowText,
            dueText,
            label: formatDueDaysLabel(numericDays),
        };
    }, [numericDays]);

    const handleApplyPreset = (preset: typeof PAYMENT_TERM_PRESETS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setName(preset.name);
        setCode(preset.code);
        setDaysStr(String(preset.days));
    };

    const handleSave = () => {
        const cleanName = name.trim();
        const cleanCode = code.trim().toUpperCase();

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Payment Term Name is required.');
            return;
        }

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Payment Term Code is required.');
            return;
        }

        // Duplicate code validation among active codes
        const isDuplicate = existingTerms.some(
            (t) =>
                t.code?.toUpperCase() === cleanCode &&
                (!term || t.id !== term.id) &&
                t.status === 'active'
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Payment Term Code "${cleanCode}" is already in use by an active term.`);
            return;
        }

        const isArchived = statusIndex === 1;

        // Current default term cannot be archived until another active term is selected as default
        if (isArchived && (term?.isDefault || isDefault)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Default Term Cannot Be Archived',
                'The current default payment term cannot be archived. Please set another active term as default first.'
            );
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedTerm: FinancePaymentTerm = {
            id: term ? term.id : `term_${Date.now()}`,
            name: cleanName,
            code: cleanCode,
            days: numericDays,
            isDefault: isArchived ? false : isDefault,
            status: isArchived ? 'archived' : 'active',
            isSystem: term ? term.isSystem : false,
            inUse: term ? term.inUse : false,
            description: term?.description,
        };

        onSave(updatedTerm);
        onClose();
    };

    const handleDelete = () => {
        if (!term || !onDelete) return;

        if (term.isDefault) {
            Alert.alert(
                'Cannot Delete Default Term',
                'The default payment term cannot be deleted. Please assign another term as default first.'
            );
            return;
        }

        if (term.inUse) {
            Alert.alert(
                'Historical Term In Use',
                'This payment term is referenced by existing transactions. Please Archive it instead of deleting to preserve financial audit history.'
            );
            return;
        }

        Alert.alert(
            'Delete Payment Term',
            `Are you sure you want to permanently delete "${term.name}" (${term.code})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(term.id);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.88, 0.96]}
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
                            {isEditMode ? 'Edit Payment Term' : 'Add Payment Term'}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                handleSave();
                            }}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Term Info */}
                        <Section title="Payment Term Details">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Name
                                </SwiftUIText>
                                <TextField
                                    placeholder="e.g. Net 14 Days"
                                    defaultValue={name}
                                    onChangeText={(val: string) => setName(val)}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    Name shown when selecting payment terms.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Code (Uppercase)
                                </SwiftUIText>
                                <TextField
                                    placeholder="e.g. NET14"
                                    defaultValue={code}
                                    onChangeText={(val: string) => setCode(val.toUpperCase())}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    Short code used to identify this payment term.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Due Days & Live Preview */}
                        <Section title="Due Duration">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Due Days (Calendar Days)
                                </SwiftUIText>
                                <TextField
                                    placeholder="0"
                                    defaultValue={daysStr}
                                    onChangeText={(val: string) => setDaysStr(val.replace(/[^0-9]/g, ''))}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    Number of calendar days before payment is due.
                                </SwiftUIText>
                            </VStack>

                            {/* Calculation Preview */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={14} weight="semibold" color={textColor}>
                                    {`Calculation: ${formattedCalculationSample.label}`}
                                </SwiftUIText>
                                <SwiftUIText size={12} color={subtextColor}>
                                    {`Example: Tx Date ${formattedCalculationSample.nowText} → Due Date ${formattedCalculationSample.dueText}`}
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Workspace Default with Toggle */}
                        <Section title="Workspace Default">
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} color={textColor}>
                                        Set as Workspace Default
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        {isDefault ? 'Automatically preselected for new transactions' : 'Standard payment term'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={isDefault}
                                    onValueChange={(val: boolean) => {
                                        Haptics.selectionAsync();
                                        setIsDefault(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* Section 4: Presets / Suggested Examples (Especially in Add Mode) */}
                        {!isEditMode && (
                            <Section title="Suggested Presets">
                                {PAYMENT_TERM_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.code}
                                        variant="plain"
                                        onPress={() => handleApplyPreset(preset)}
                                    >
                                        <HStack alignment="center" modifiers={[padding({ vertical: 3 })]}>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={14} weight="semibold" color={textColor}>
                                                    {`${preset.name} (${preset.code})`}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {preset.description}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <SwiftUIText size={13} color="#007AFF">
                                                Use
                                            </SwiftUIText>
                                        </HStack>
                                    </Button>
                                ))}
                            </Section>
                        )}

                        {/* Section 5: Status with Context Menu (Edit Mode) */}
                        {isEditMode && (
                            <Section title="Lifecycle & Status">
                                <Picker
                                    label="Status"
                                    variant="menu"
                                    options={STATUS_OPTIONS}
                                    selectedIndex={statusIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        if (index === 1 && (term?.isDefault || isDefault)) {
                                            Alert.alert(
                                                'Default Term',
                                                'The default payment term cannot be archived. Please set another term as default first.'
                                            );
                                            return;
                                        }
                                        setStatusIndex(index);
                                    }}
                                    modifiers={menuControlModifiers}
                                />

                                {!term?.isDefault && !term?.inUse && onDelete && (
                                    <Button
                                        variant="plain"
                                        onPress={handleDelete}
                                    >
                                        <SwiftUIText size={15} color="#FF3B30">
                                            Delete Payment Term
                                        </SwiftUIText>
                                    </Button>
                                )}
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
