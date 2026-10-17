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
    FinancePaymentCycle,
    PaymentCycleFrequency,
    CutoffOptionType,
    PAYMENT_CYCLE_PRESETS,
    getOrdinalSuffix,
    formatCycleSchedule,
    formatCycleCutoff,
    formatCycleSummary,
} from '@/lib/api/financeSetup';

export interface FinancePaymentCycleEditSheetProps {
    visible: boolean;
    onClose: () => void;
    cycle?: FinancePaymentCycle | null;
    existingCycles: FinancePaymentCycle[];
    onSave: (cycle: FinancePaymentCycle) => void;
    onDelete?: (id: string) => void;
}

const FREQUENCY_OPTIONS = [
    'Weekly',
    'Every 2 Weeks',
    'Twice Monthly',
    'Monthly',
];

const FREQUENCY_KEYS: PaymentCycleFrequency[] = [
    'weekly',
    'biweekly',
    'twice_monthly',
    'monthly',
];

const WEEKDAY_OPTIONS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

const CUTOFF_DAYS_OPTIONS = [
    'Same day payment (0 days)',
    '1 day before payment',
    '2 days before payment',
    '3 days before payment',
    '5 days before payment',
];

const MONTH_DAYS_31 = Array.from({ length: 31 }, (_, i) => getOrdinalSuffix(i + 1));
const MONTH_DAYS_28 = Array.from({ length: 28 }, (_, i) => getOrdinalSuffix(i + 1));

export function FinancePaymentCycleEditSheet({
    visible,
    onClose,
    cycle,
    existingCycles,
    onSave,
    onDelete,
}: FinancePaymentCycleEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!cycle;

    // Form fields
    const [name, setName] = useState('');
    const [freqIndex, setFreqIndex] = useState(0); // 0: weekly, 1: biweekly, 2: twice_monthly, 3: monthly
    const [weekdayIndex, setWeekdayIndex] = useState(4); // Friday (index 4)
    const [startDate, setStartDate] = useState('2026-09-04');
    const [firstDateIndex, setFirstDateIndex] = useState(0); // 1st (index 0)
    const [secondDateIndex, setSecondDateIndex] = useState(14); // 15th (index 14)
    const [monthlyDateIndex, setMonthlyDateIndex] = useState(24); // 25th (index 24)

    // Cut-off state
    const [cutoffDaysIndex, setCutoffDaysIndex] = useState(2); // 2 days before (index 2)
    const [cutoffType, setCutoffType] = useState<CutoffOptionType>('days_before');
    const [cutoffWeekdayIndex, setCutoffWeekdayIndex] = useState(3); // Thursday (index 3)
    const [cutoffDateIndex, setCutoffDateIndex] = useState(19); // 20th (index 19)

    // Status & default
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (visible) {
            if (cycle) {
                setName(cycle.name || '');

                const fIdx = FREQUENCY_KEYS.indexOf(cycle.frequency);
                setFreqIndex(fIdx >= 0 ? fIdx : 0);

                const wIdx = WEEKDAY_OPTIONS.indexOf(cycle.dayOfWeek || 'Friday');
                setWeekdayIndex(wIdx >= 0 ? wIdx : 4);

                setStartDate(cycle.startDate || '2026-09-04');

                const d1 = Math.min(28, Math.max(1, cycle.firstPaymentDate || 1));
                setFirstDateIndex(d1 - 1);

                const d2 = Math.min(31, Math.max(1, cycle.secondPaymentDate || 15));
                setSecondDateIndex(d2 - 1);

                const md = Math.min(31, Math.max(1, cycle.monthlyPaymentDate || 25));
                setMonthlyDateIndex(md - 1);

                setCutoffType(cycle.cutoffType || 'days_before');
                const days = cycle.cutoffDaysBefore ?? 2;
                if (days === 0) setCutoffDaysIndex(0);
                else if (days === 1) setCutoffDaysIndex(1);
                else if (days === 2) setCutoffDaysIndex(2);
                else if (days === 3) setCutoffDaysIndex(3);
                else if (days === 5) setCutoffDaysIndex(4);
                else setCutoffDaysIndex(2);

                const cwIdx = WEEKDAY_OPTIONS.indexOf(cycle.cutoffDayOfWeek || 'Thursday');
                setCutoffWeekdayIndex(cwIdx >= 0 ? cwIdx : 3);

                const cd = Math.min(31, Math.max(1, cycle.cutoffDate || 20));
                setCutoffDateIndex(cd - 1);

                setIsActive(cycle.status !== 'inactive');
            } else {
                setName('');
                setFreqIndex(0);
                setWeekdayIndex(4);
                setStartDate('2026-09-04');
                setFirstDateIndex(0);
                setSecondDateIndex(14);
                setMonthlyDateIndex(24);
                setCutoffType('days_before');
                setCutoffDaysIndex(2);
                setCutoffWeekdayIndex(3);
                setCutoffDateIndex(19);
                setIsActive(true);
            }
        }
    }, [visible, cycle]);

    const currentFrequency = FREQUENCY_KEYS[freqIndex];

    const currentCycleDraft = useMemo<Partial<FinancePaymentCycle>>(() => {
        let cutoffDays = 2;
        if (cutoffDaysIndex === 0) cutoffDays = 0;
        else if (cutoffDaysIndex === 1) cutoffDays = 1;
        else if (cutoffDaysIndex === 2) cutoffDays = 2;
        else if (cutoffDaysIndex === 3) cutoffDays = 3;
        else if (cutoffDaysIndex === 4) cutoffDays = 5;

        return {
            frequency: currentFrequency,
            dayOfWeek: WEEKDAY_OPTIONS[weekdayIndex],
            startDate,
            firstPaymentDate: firstDateIndex + 1,
            secondPaymentDate: secondDateIndex + 1,
            monthlyPaymentDate: monthlyDateIndex + 1,
            cutoffType,
            cutoffDaysBefore: cutoffDays,
            cutoffDayOfWeek: WEEKDAY_OPTIONS[cutoffWeekdayIndex],
            cutoffDate: cutoffDateIndex + 1,
        };
    }, [
        currentFrequency,
        weekdayIndex,
        startDate,
        firstDateIndex,
        secondDateIndex,
        monthlyDateIndex,
        cutoffType,
        cutoffDaysIndex,
        cutoffWeekdayIndex,
        cutoffDateIndex,
    ]);

    const liveSummary = useMemo(() => {
        return {
            schedule: formatCycleSchedule(currentCycleDraft),
            cutoff: formatCycleCutoff(currentCycleDraft),
            combined: formatCycleSummary(currentCycleDraft),
        };
    }, [currentCycleDraft]);

    const handleApplyPreset = (preset: typeof PAYMENT_CYCLE_PRESETS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setName(preset.name);

        const fIdx = FREQUENCY_KEYS.indexOf(preset.frequency);
        setFreqIndex(fIdx >= 0 ? fIdx : 0);

        if (preset.dayOfWeek) {
            const wIdx = WEEKDAY_OPTIONS.indexOf(preset.dayOfWeek);
            if (wIdx >= 0) setWeekdayIndex(wIdx);
        }
        if (preset.startDate) {
            setStartDate(preset.startDate);
        }
        if (preset.firstPaymentDate) {
            setFirstDateIndex(preset.firstPaymentDate - 1);
        }
        if (preset.secondPaymentDate) {
            setSecondDateIndex(preset.secondPaymentDate - 1);
        }
        if (preset.monthlyPaymentDate) {
            setMonthlyDateIndex(preset.monthlyPaymentDate - 1);
        }
        if (preset.cutoffType) {
            setCutoffType(preset.cutoffType);
        }
        if (preset.cutoffDaysBefore !== undefined) {
            if (preset.cutoffDaysBefore === 0) setCutoffDaysIndex(0);
            else if (preset.cutoffDaysBefore === 1) setCutoffDaysIndex(1);
            else if (preset.cutoffDaysBefore === 2) setCutoffDaysIndex(2);
            else if (preset.cutoffDaysBefore === 3) setCutoffDaysIndex(3);
            else if (preset.cutoffDaysBefore === 5) setCutoffDaysIndex(4);
        }
        if (preset.cutoffDayOfWeek) {
            const cwIdx = WEEKDAY_OPTIONS.indexOf(preset.cutoffDayOfWeek);
            if (cwIdx >= 0) setCutoffWeekdayIndex(cwIdx);
        }
        if (preset.cutoffDate) {
            setCutoffDateIndex(preset.cutoffDate - 1);
        }
    };

    const handleSave = () => {
        const cleanName = name.trim();

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Payment Cycle Name is required.');
            return;
        }

        // Check duplicate name among existing
        const isDuplicate = existingCycles.some(
            (c) =>
                c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
                (!cycle || c.id !== cycle.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Name', `A payment cycle named "${cleanName}" already exists.`);
            return;
        }

        let cutoffDays = 2;
        if (cutoffDaysIndex === 0) cutoffDays = 0;
        else if (cutoffDaysIndex === 1) cutoffDays = 1;
        else if (cutoffDaysIndex === 2) cutoffDays = 2;
        else if (cutoffDaysIndex === 3) cutoffDays = 3;
        else if (cutoffDaysIndex === 4) cutoffDays = 5;

        const updatedCycle: FinancePaymentCycle = {
            id: cycle ? cycle.id : `cycle_${Date.now()}`,
            name: cleanName,
            frequency: currentFrequency,
            dayOfWeek: currentFrequency === 'weekly' || currentFrequency === 'biweekly' ? WEEKDAY_OPTIONS[weekdayIndex] : undefined,
            startDate: currentFrequency === 'biweekly' ? startDate : undefined,
            firstPaymentDate: currentFrequency === 'twice_monthly' ? firstDateIndex + 1 : undefined,
            secondPaymentDate: currentFrequency === 'twice_monthly' ? secondDateIndex + 1 : undefined,
            monthlyPaymentDate: currentFrequency === 'monthly' ? monthlyDateIndex + 1 : undefined,
            cutoffType,
            cutoffDaysBefore: cutoffType === 'days_before' ? cutoffDays : undefined,
            cutoffDayOfWeek: cutoffType === 'specific_day' ? WEEKDAY_OPTIONS[cutoffWeekdayIndex] : undefined,
            cutoffDate: cutoffType === 'specific_date' ? cutoffDateIndex + 1 : undefined,
            status: isActive ? 'active' : 'inactive',
            isDefault: cycle?.isDefault || false,
            inUse: cycle?.inUse || false,
            description: cycle?.description,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updatedCycle);
        onClose();
    };

    const handleDelete = () => {
        if (!cycle || !onDelete) return;

        if (cycle.inUse) {
            Alert.alert(
                'Cycle In Use',
                'This payment cycle is referenced by existing payment batches. Please Deactivate it instead of deleting to preserve historical audit records.'
            );
            return;
        }

        Alert.alert(
            'Delete Payment Cycle',
            `Are you sure you want to permanently delete "${cycle.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(cycle.id);
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
                            {isEditMode ? 'Edit Payment Cycle' : 'Add Payment Cycle'}
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

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Cycle Name & Frequency */}
                        <Section title="Cycle Identification">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Cycle Name
                                </SwiftUIText>
                                <TextField
                                    placeholder="e.g. Weekly Vendor Settlement"
                                    defaultValue={name}
                                    onChangeText={(val: string) => setName(val)}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    Identifies this recurring disbursement cycle.
                                </SwiftUIText>
                            </VStack>

                            <Picker
                                label="Frequency"
                                variant="menu"
                                options={FREQUENCY_OPTIONS}
                                selectedIndex={freqIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setFreqIndex(index);
                                }}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* Section 2: Adaptive Payment Schedule */}
                        <Section title="Payment Schedule">
                            {currentFrequency === 'weekly' && (
                                <Picker
                                    label="Payment Day"
                                    variant="menu"
                                    options={WEEKDAY_OPTIONS}
                                    selectedIndex={weekdayIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setWeekdayIndex(index);
                                    }}
                                    modifiers={menuControlModifiers}
                                />
                            )}

                            {currentFrequency === 'biweekly' && (
                                <>
                                    <Picker
                                        label="Payment Day"
                                        variant="menu"
                                        options={WEEKDAY_OPTIONS}
                                        selectedIndex={weekdayIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setWeekdayIndex(index);
                                        }}
                                        modifiers={menuControlModifiers}
                                    />
                                    <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            Anchor Start Date (YYYY-MM-DD)
                                        </SwiftUIText>
                                        <TextField
                                            placeholder="2026-09-04"
                                            defaultValue={startDate}
                                            onChangeText={(val: string) => setStartDate(val)}
                                            modifiers={[
                                                frame({ maxWidth: 9999 }),
                                                tint('#007AFF'),
                                            ]}
                                        />
                                        <SwiftUIText size={11} color={subtextColor}>
                                            Disbursements recur every 14 days based on this anchor date.
                                        </SwiftUIText>
                                    </VStack>
                                </>
                            )}

                            {currentFrequency === 'twice_monthly' && (
                                <>
                                    <Picker
                                        label="First Payment Date"
                                        variant="menu"
                                        options={MONTH_DAYS_28}
                                        selectedIndex={firstDateIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setFirstDateIndex(index);
                                        }}
                                        modifiers={menuControlModifiers}
                                    />
                                    <Picker
                                        label="Second Payment Date"
                                        variant="menu"
                                        options={MONTH_DAYS_31}
                                        selectedIndex={secondDateIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSecondDateIndex(index);
                                        }}
                                        modifiers={menuControlModifiers}
                                    />
                                    <VStack alignment="leading" spacing={2} modifiers={[padding({ vertical: 2 })]}>
                                        <SwiftUIText size={11} color={subtextColor}>
                                            If a date does not exist in a shorter month, it automatically uses the month's last calendar day.
                                        </SwiftUIText>
                                    </VStack>
                                </>
                            )}

                            {currentFrequency === 'monthly' && (
                                <>
                                    <Picker
                                        label="Monthly Payment Date"
                                        variant="menu"
                                        options={MONTH_DAYS_31}
                                        selectedIndex={monthlyDateIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setMonthlyDateIndex(index);
                                        }}
                                        modifiers={menuControlModifiers}
                                    />
                                    <VStack alignment="leading" spacing={2} modifiers={[padding({ vertical: 2 })]}>
                                        <SwiftUIText size={11} color={subtextColor}>
                                            If a date does not exist in a shorter month (e.g. 31st in February), it automatically uses the last calendar day.
                                        </SwiftUIText>
                                    </VStack>
                                </>
                            )}
                        </Section>

                        {/* Section 3: Cut-off Configuration */}
                        <Section title="Cut-off Configuration">
                            <Picker
                                label="Cut-off Rule"
                                variant="menu"
                                options={CUTOFF_DAYS_OPTIONS}
                                selectedIndex={cutoffDaysIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setCutoffType('days_before');
                                    setCutoffDaysIndex(index);
                                }}
                                modifiers={menuControlModifiers}
                            />

                            {/* Live Schedule & Cutoff Preview */}
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={14} weight="semibold" color={textColor}>
                                    {liveSummary.combined}
                                </SwiftUIText>
                                <SwiftUIText size={12} color={subtextColor}>
                                    Transactions approved after the cut-off roll to the next eligible payment batch. Original Due Dates remain unchanged.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 4: Status & Lifecycle */}
                        <Section title="Status & Lifecycle">
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} color={textColor}>
                                        Active
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        {isActive ? 'Available for new payment batch scheduling' : 'Inactive (kept for historical records)'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={isActive}
                                    onValueChange={(val: boolean) => {
                                        Haptics.selectionAsync();
                                        setIsActive(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>

                            {isEditMode && onDelete && !cycle?.isDefault && (
                                <Button
                                    variant="plain"
                                    onPress={handleDelete}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Delete Payment Cycle
                                    </SwiftUIText>
                                </Button>
                            )}
                        </Section>

                        {/* Section 5: Presets (Add Mode) */}
                        {!isEditMode && (
                            <Section title="Suggested Presets">
                                {PAYMENT_CYCLE_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.name}
                                        variant="plain"
                                        onPress={() => handleApplyPreset(preset)}
                                    >
                                        <HStack alignment="center" modifiers={[padding({ vertical: 3 })]}>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={14} weight="semibold" color={textColor}>
                                                    {preset.name}
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
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
