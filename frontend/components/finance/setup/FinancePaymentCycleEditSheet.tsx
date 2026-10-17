import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { confirmDestructiveAction } from '@/lib/alertUtils';
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

const FREQUENCY_OPTIONS: { label: string; value: PaymentCycleFrequency }[] = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Every 2 Weeks', value: 'biweekly' },
    { label: 'Twice Monthly', value: 'twice_monthly' },
    { label: 'Monthly', value: 'monthly' },
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

const CUTOFF_OPTIONS: { label: string; daysBefore: number; type: CutoffOptionType }[] = [
    { label: 'Same day payment (0 days)', daysBefore: 0, type: 'days_before' },
    { label: '1 day before payment', daysBefore: 1, type: 'days_before' },
    { label: '2 days before payment', daysBefore: 2, type: 'days_before' },
    { label: '3 days before payment', daysBefore: 3, type: 'days_before' },
    { label: '5 days before payment', daysBefore: 5, type: 'days_before' },
];

export function FinancePaymentCycleEditSheet(props: FinancePaymentCycleEditSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinancePaymentCycleEditSheet.ios').FinancePaymentCycleEditSheet || require('./FinancePaymentCycleEditSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinancePaymentCycleEditSheetWebAndroid {...props} />;
}

export default FinancePaymentCycleEditSheet;

function FinancePaymentCycleEditSheetWebAndroid({
    visible,
    onClose,
    cycle,
    existingCycles,
    onSave,
    onDelete,
}: FinancePaymentCycleEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!cycle;

    const [name, setName] = useState('');
    const [frequency, setFrequency] = useState<PaymentCycleFrequency>('weekly');
    const [weekday, setWeekday] = useState('Friday');
    const [monthlyDay, setMonthlyDay] = useState(25);
    const [twiceFirstDay, setTwiceFirstDay] = useState(10);
    const [twiceSecondDay, setTwiceSecondDay] = useState(25);
    const [cutoffDaysBefore, setCutoffDaysBefore] = useState(1);
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (cycle) {
                setName(cycle.name || '');
                setFrequency(cycle.frequency || 'weekly');
                setWeekday(cycle.dayOfWeek || 'Friday');
                setMonthlyDay(cycle.monthlyPaymentDate || 25);
                setTwiceFirstDay(cycle.firstPaymentDate || 10);
                setTwiceSecondDay(cycle.secondPaymentDate || 25);
                setCutoffDaysBefore(cycle.cutoffDaysBefore ?? 1);
                setStatus(cycle.status || 'active');
            } else {
                setName('');
                setFrequency('weekly');
                setWeekday('Friday');
                setMonthlyDay(25);
                setTwiceFirstDay(10);
                setTwiceSecondDay(25);
                setCutoffDaysBefore(1);
                setStatus('active');
            }
            setErrorMsg(null);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, cycle, fadeAnim, slideAnim]);

    const previewCycleObj: FinancePaymentCycle = useMemo(() => ({
        id: cycle?.id || 'temp',
        name: name || 'Payment Cycle',
        frequency,
        dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? weekday : undefined,
        monthlyPaymentDate: frequency === 'monthly' ? monthlyDay : undefined,
        firstPaymentDate: frequency === 'twice_monthly' ? twiceFirstDay : undefined,
        secondPaymentDate: frequency === 'twice_monthly' ? twiceSecondDay : undefined,
        cutoffType: 'days_before',
        cutoffDaysBefore,
        status,
        inUse: cycle ? cycle.inUse : false,
    }), [cycle, name, frequency, weekday, monthlyDay, twiceFirstDay, twiceSecondDay, cutoffDaysBefore, status]);

    const summaryText = useMemo(() => formatCycleSummary(previewCycleObj), [previewCycleObj]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleApplyPreset = (preset: typeof PAYMENT_CYCLE_PRESETS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setName(preset.name);
        setFrequency(preset.frequency);
        if (preset.dayOfWeek) setWeekday(preset.dayOfWeek);
        if (preset.monthlyPaymentDate) setMonthlyDay(preset.monthlyPaymentDate);
        if (preset.firstPaymentDate) setTwiceFirstDay(preset.firstPaymentDate);
        if (preset.secondPaymentDate) setTwiceSecondDay(preset.secondPaymentDate);
        if (preset.cutoffDaysBefore !== undefined) setCutoffDaysBefore(preset.cutoffDaysBefore);
    };

    const handleSave = () => {
        const cleanName = name.trim();
        if (!cleanName) {
            setErrorMsg('Cycle name is required');
            return;
        }

        const duplicate = existingCycles.find(
            (c) => c.id !== cycle?.id && c.name.toLowerCase() === cleanName.toLowerCase()
        );

        if (duplicate) {
            setErrorMsg(`A payment cycle named "${duplicate.name}" already exists`);
            return;
        }

        const payload: FinancePaymentCycle = {
            id: cycle?.id || `cycle_${Date.now()}`,
            name: cleanName,
            frequency,
            dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? weekday : undefined,
            monthlyPaymentDate: frequency === 'monthly' ? monthlyDay : undefined,
            firstPaymentDate: frequency === 'twice_monthly' ? twiceFirstDay : undefined,
            secondPaymentDate: frequency === 'twice_monthly' ? twiceSecondDay : undefined,
            cutoffType: 'days_before',
            cutoffDaysBefore,
            status,
            inUse: cycle ? cycle.inUse : false,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(payload);
        handleDismiss();
    };

    const handleDelete = () => {
        if (!cycle || !onDelete) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        confirmDestructiveAction({
            title: 'Delete Payment Cycle',
            message: `Are you sure you want to permanently delete "${cycle.name}"?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                onDelete(cycle.id);
                handleDismiss();
            },
        });
    };

    if (!visible) return null;

    const isWebDesktop = Platform.OS === 'web';

    const presetActions = PAYMENT_CYCLE_PRESETS.map((p) => ({
        title: `${p.name} (${formatCycleSummary(p as any)})`,
    }));

    const freqActions = FREQUENCY_OPTIONS.map((f) => ({
        title: `${frequency === f.value ? '✓ ' : ''}${f.label}`,
    }));

    const weekdayActions = WEEKDAY_OPTIONS.map((w) => ({
        title: `${weekday === w ? '✓ ' : ''}${w}`,
    }));

    const cutoffActions = CUTOFF_OPTIONS.map((c) => ({
        title: `${cutoffDaysBefore === c.daysBefore ? '✓ ' : ''}${c.label}`,
    }));

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={s.modalOverlay}
            >
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View
                        style={[
                            s.backdrop,
                            {
                                opacity: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.5],
                                }),
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>

                {/* Animated Drawer / Sheet */}
                <Animated.View
                    style={[
                        s.drawerContainer,
                        isWebDesktop && s.containerWeb,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            transform: isWebDesktop
                                ? [
                                      {
                                          translateX: slideAnim.interpolate({
                                              inputRange: [0, 1],
                                              outputRange: [520, 0],
                                          }),
                                      },
                                  ]
                                : [
                                      {
                                          translateY: slideAnim.interpolate({
                                              inputRange: [0, 1],
                                              outputRange: [600, 0],
                                          }),
                                      },
                                  ],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.headerTitle, { color: textColor }]}>
                                {isEditMode ? 'Edit Payment Cycle' : 'New Payment Cycle'}
                            </Text>
                            <Text style={[s.headerSubtitle, { color: subtextColor }]}>
                                {isEditMode ? 'Update recurring cut-off and payout schedule' : 'Configure batch disbursement cadence'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable Form Body */}
                    <ScrollView
                        style={s.scrollBody}
                        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {errorMsg && (
                            <View style={s.errorBanner}>
                                <PlatformIcon name="exclamationmark.circle.fill" size={16} tintColor="#FF3B30" />
                                <Text style={s.errorBannerText}>{errorMsg}</Text>
                            </View>
                        )}

                        {/* Presets Button */}
                        {!isEditMode && (
                            <ContextMenu
                                actions={presetActions}
                                onPress={(e) => {
                                    const idx = e.nativeEvent.index;
                                    if (PAYMENT_CYCLE_PRESETS[idx]) {
                                        handleApplyPreset(PAYMENT_CYCLE_PRESETS[idx]);
                                    }
                                }}
                                dropdownMenuMode
                            >
                                <View style={[s.presetPill, { backgroundColor: isDark ? 'rgba(21,153,87,0.12)' : 'rgba(21,153,87,0.08)' }]}>
                                    <PlatformIcon name="sparkles" size={14} tintColor="#159957" />
                                    <Text style={s.presetPillText}>Choose from Preset Schedules...</Text>
                                </View>
                            </ContextMenu>
                        )}

                        {/* Cycle Name */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Cycle Name *</Text>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                        color: textColor,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                                placeholder="e.g. Vendor Friday Batch"
                                placeholderTextColor={subtextColor}
                                value={name}
                                onChangeText={(t) => {
                                    setName(t);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Frequency Picker */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Payment Frequency *</Text>
                            <ContextMenu
                                actions={freqActions}
                                onPress={(e) => {
                                    const selected = FREQUENCY_OPTIONS[e.nativeEvent.index];
                                    if (selected) {
                                        setFrequency(selected.value);
                                    }
                                }}
                                dropdownMenuMode
                            >
                                <View
                                    style={[
                                        s.pickerBtn,
                                        {
                                            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.pickerBtnText, { color: textColor }]}>
                                        {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || 'Select Frequency'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Frequency-Specific Inputs */}
                        {(frequency === 'weekly' || frequency === 'biweekly') && (
                            <View style={s.fieldGroup}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Disbursement Day *</Text>
                                <ContextMenu
                                    actions={weekdayActions}
                                    onPress={(e) => {
                                        const selected = WEEKDAY_OPTIONS[e.nativeEvent.index];
                                        if (selected) setWeekday(selected);
                                    }}
                                    dropdownMenuMode
                                >
                                    <View
                                        style={[
                                            s.pickerBtn,
                                            {
                                                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.pickerBtnText, { color: textColor }]}>{weekday}</Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </ContextMenu>
                            </View>
                        )}

                        {frequency === 'monthly' && (
                            <View style={s.fieldGroup}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Day of Month *</Text>
                                <ContextMenu
                                    actions={Array.from({ length: 31 }, (_, i) => ({
                                        title: `${monthlyDay === i + 1 ? '✓ ' : ''}${getOrdinalSuffix(i + 1)} of every month`,
                                    }))}
                                    onPress={(e) => setMonthlyDay(e.nativeEvent.index + 1)}
                                    dropdownMenuMode
                                >
                                    <View
                                        style={[
                                            s.pickerBtn,
                                            {
                                                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.pickerBtnText, { color: textColor }]}>
                                            {getOrdinalSuffix(monthlyDay)} of every month
                                        </Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </ContextMenu>
                            </View>
                        )}

                        {frequency === 'twice_monthly' && (
                            <View style={s.rowTwoCol}>
                                <View style={[s.fieldGroup, { flex: 1 }]}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>1st Date *</Text>
                                    <ContextMenu
                                        actions={Array.from({ length: 28 }, (_, i) => ({
                                            title: `${twiceFirstDay === i + 1 ? '✓ ' : ''}${getOrdinalSuffix(i + 1)}`,
                                        }))}
                                        onPress={(e) => setTwiceFirstDay(e.nativeEvent.index + 1)}
                                        dropdownMenuMode
                                    >
                                        <View
                                            style={[
                                                s.pickerBtn,
                                                {
                                                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                },
                                            ]}
                                        >
                                            <Text style={[s.pickerBtnText, { color: textColor }]}>
                                                {getOrdinalSuffix(twiceFirstDay)}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>

                                <View style={[s.fieldGroup, { flex: 1 }]}>
                                    <Text style={[s.fieldLabel, { color: subtextColor }]}>2nd Date *</Text>
                                    <ContextMenu
                                        actions={Array.from({ length: 31 }, (_, i) => ({
                                            title: `${twiceSecondDay === i + 1 ? '✓ ' : ''}${getOrdinalSuffix(i + 1)}`,
                                        }))}
                                        onPress={(e) => setTwiceSecondDay(e.nativeEvent.index + 1)}
                                        dropdownMenuMode
                                    >
                                        <View
                                            style={[
                                                s.pickerBtn,
                                                {
                                                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                },
                                            ]}
                                        >
                                            <Text style={[s.pickerBtnText, { color: textColor }]}>
                                                {getOrdinalSuffix(twiceSecondDay)}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                        </View>
                                    </ContextMenu>
                                </View>
                            </View>
                        )}

                        {/* Cutoff Days Picker */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Submission Cut-off Rule *</Text>
                            <ContextMenu
                                actions={cutoffActions}
                                onPress={(e) => {
                                    const selected = CUTOFF_OPTIONS[e.nativeEvent.index];
                                    if (selected) setCutoffDaysBefore(selected.daysBefore);
                                }}
                                dropdownMenuMode
                            >
                                <View
                                    style={[
                                        s.pickerBtn,
                                        {
                                            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.pickerBtnText, { color: textColor }]}>
                                        {CUTOFF_OPTIONS.find((c) => c.daysBefore === cutoffDaysBefore)?.label || `${cutoffDaysBefore} days before`}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Summary Preview Card */}
                        <View
                            style={[
                                s.summaryCard,
                                {
                                    backgroundColor: isDark ? 'rgba(21,153,87,0.08)' : 'rgba(21,153,87,0.05)',
                                    borderColor: isDark ? 'rgba(21,153,87,0.25)' : 'rgba(21,153,87,0.2)',
                                },
                            ]}
                        >
                            <View style={s.summaryTitleRow}>
                                <PlatformIcon name="arrow.triangle.2.circlepath" size={15} tintColor="#159957" />
                                <Text style={s.summaryTitle}>Schedule Summary</Text>
                            </View>
                            <Text style={[s.summaryBodyText, { color: textColor }]}>
                                {summaryText}
                            </Text>
                        </View>

                        {/* Active Status Switch */}
                        <View
                            style={[
                                s.switchRow,
                                {
                                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                },
                            ]}
                        >
                            <View style={s.switchTextCol}>
                                <Text style={[s.switchLabel, { color: textColor }]}>Active Schedule</Text>
                                <Text style={[s.switchSublabel, { color: subtextColor }]}>
                                    Inactive cycles are disabled for automatic batch processing
                                </Text>
                            </View>
                            <IOSSwitch
                                value={status === 'active'}
                                onValueChange={(val) => setStatus(val ? 'active' : 'inactive')}
                                activeColor="#159957"
                            />
                        </View>

                        {/* Delete Button (Edit Mode) */}
                        {isEditMode && onDelete && !cycle?.inUse && (
                            <TouchableOpacity
                                style={s.deleteBtn}
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="trash" size={15} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Payment Cycle</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View
                        style={[
                            s.footerRow,
                            {
                                paddingBottom: isWebDesktop ? 20 : Math.max(insets.bottom + 12, 16),
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[s.footerCancelBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            onPress={handleDismiss}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.footerCancelBtnText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.footerSaveBtn, { backgroundColor: '#159957' }]}
                            onPress={handleSave}
                            activeOpacity={0.8}
                        >
                            <Text style={s.footerSaveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
    },
    drawerContainer: {
        width: Platform.OS === 'web' ? 480 : '100%',
        maxHeight: Platform.OS === 'web' ? '100%' : '90%',
        height: Platform.OS === 'web' ? '100%' : undefined,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    containerWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 480,
        maxWidth: 'calc(100% - 24px)' as any,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        minHeight: 'auto' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28), 0 2px 12px rgba(0, 0, 0, 0.12)',
        } as any) : {}),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : 16,
        paddingBottom: 12,
        borderBottomWidth: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12.5,
        fontWeight: '400',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 18,
        gap: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    errorBannerText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    presetPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(21, 153, 87, 0.25)',
    },
    presetPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#159957',
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    inputField: {
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 15,
        borderWidth: 1,
    },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    pickerBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
    rowTwoCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    summaryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#159957',
    },
    summaryBodyText: {
        fontSize: 13.5,
        lineHeight: 18,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
    },
    switchTextCol: {
        flex: 1,
        gap: 2,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    switchSublabel: {
        fontSize: 12,
        lineHeight: 16,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        marginTop: 6,
    },
    deleteBtnText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 0,
        gap: 12,
    },
    footerCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerCancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footerSaveBtn: {
        flex: 2,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
