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

export function FinancePaymentTermEditSheet(props: FinancePaymentTermEditSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinancePaymentTermEditSheet.ios').FinancePaymentTermEditSheet || require('./FinancePaymentTermEditSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinancePaymentTermEditSheetWebAndroid {...props} />;
}

export default FinancePaymentTermEditSheet;

function FinancePaymentTermEditSheetWebAndroid({
    visible,
    onClose,
    term,
    existingTerms,
    onSave,
    onDelete,
}: FinancePaymentTermEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!term;

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [daysStr, setDaysStr] = useState('14');
    const [isDefault, setIsDefault] = useState(false);
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (term) {
                setName(term.name || '');
                setCode(term.code || '');
                setDaysStr(String(term.days ?? 0));
                setIsDefault(!!term.isDefault);
                setStatus(term.status || 'active');
            } else {
                setName('');
                setCode('');
                setDaysStr('14');
                setIsDefault(false);
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
    }, [visible, term, fadeAnim, slideAnim]);

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
            setErrorMsg('Term name is required');
            return;
        }
        if (!cleanCode) {
            setErrorMsg('Term code is required');
            return;
        }

        const duplicate = existingTerms.find(
            (t) =>
                t.id !== term?.id &&
                (t.code.toUpperCase() === cleanCode || t.name.toLowerCase() === cleanName.toLowerCase())
        );

        if (duplicate) {
            setErrorMsg(`Code or Name already in use by "${duplicate.name}"`);
            return;
        }

        const payload: FinancePaymentTerm = {
            id: term?.id || `term_${Date.now()}`,
            name: cleanName,
            code: cleanCode,
            days: numericDays,
            isDefault,
            status,
            inUse: term ? term.inUse : false,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(payload);
        handleDismiss();
    };

    const handleDelete = () => {
        if (!term || !onDelete) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        confirmDestructiveAction({
            title: 'Delete Payment Term',
            message: `Are you sure you want to permanently delete "${term.name}"?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                onDelete(term.id);
                handleDismiss();
            },
        });
    };

    if (!visible) return null;

    const isWebDesktop = Platform.OS === 'web';

    const presetActions = PAYMENT_TERM_PRESETS.map((p) => ({
        title: `${p.name} (${p.code}) · ${formatDueDaysLabel(p.days)}`,
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
                                {isEditMode ? 'Edit Payment Term' : 'New Payment Term'}
                            </Text>
                            <Text style={[s.headerSubtitle, { color: subtextColor }]}>
                                {isEditMode ? 'Update due period and settlement rule' : 'Add credit term for invoice due dates'}
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

                        {/* Presets Button (For Quick Fill) */}
                        {!isEditMode && (
                            <ContextMenu
                                actions={presetActions}
                                onPress={(e) => {
                                    const idx = e.nativeEvent.index;
                                    if (PAYMENT_TERM_PRESETS[idx]) {
                                        handleApplyPreset(PAYMENT_TERM_PRESETS[idx]);
                                    }
                                }}
                                dropdownMenuMode
                            >
                                <View style={[s.presetPill, { backgroundColor: isDark ? 'rgba(21,153,87,0.12)' : 'rgba(21,153,87,0.08)' }]}>
                                    <PlatformIcon name="sparkles" size={14} tintColor="#159957" />
                                    <Text style={s.presetPillText}>Choose from Preset Templates...</Text>
                                </View>
                            </ContextMenu>
                        )}

                        {/* Term Name */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Term Name *</Text>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                        color: textColor,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                                placeholder="e.g. Net 14 Days"
                                placeholderTextColor={subtextColor}
                                value={name}
                                onChangeText={(t) => {
                                    setName(t);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Term Code */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Code *</Text>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                        color: textColor,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                                placeholder="e.g. NET-14, COD"
                                placeholderTextColor={subtextColor}
                                value={code}
                                onChangeText={(t) => {
                                    setCode(t);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                autoCapitalize="characters"
                            />
                        </View>

                        {/* Payment Due Period (Days) */}
                        <View style={s.fieldGroup}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Payment Due Days *</Text>
                            <View style={s.daysInputRow}>
                                <TextInput
                                    style={[
                                        s.inputField,
                                        {
                                            flex: 1,
                                            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                            color: textColor,
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                    placeholder="0"
                                    placeholderTextColor={subtextColor}
                                    value={daysStr}
                                    onChangeText={(t) => {
                                        setDaysStr(t.replace(/[^0-9]/g, ''));
                                        if (errorMsg) setErrorMsg(null);
                                    }}
                                    keyboardType="numeric"
                                />
                                <View style={[s.daysUnitPill, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                    <Text style={[s.daysUnitText, { color: textColor }]}>days</Text>
                                </View>
                            </View>

                            {/* Dynamic Calculation Helper Card */}
                            <View style={[s.sampleCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                <View style={s.sampleRow}>
                                    <PlatformIcon name="calendar" size={14} tintColor="#159957" />
                                    <Text style={[s.sampleLabel, { color: subtextColor }]}>
                                        {formattedCalculationSample.label}
                                    </Text>
                                </View>
                                <Text style={[s.sampleSubtitle, { color: subtextColor }]}>
                                    Invoiced today ({formattedCalculationSample.nowText}) → Due {formattedCalculationSample.dueText}
                                </Text>
                            </View>
                        </View>

                        {/* Default Term Switch */}
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
                                <Text style={[s.switchLabel, { color: textColor }]}>Default Payment Term</Text>
                                <Text style={[s.switchSublabel, { color: subtextColor }]}>
                                    Auto-selected on new invoices and POs
                                </Text>
                            </View>
                            <IOSSwitch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                activeColor="#159957"
                            />
                        </View>

                        {/* Status (Edit Mode) */}
                        {isEditMode && (
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
                                    <Text style={[s.switchLabel, { color: textColor }]}>Active</Text>
                                    <Text style={[s.switchSublabel, { color: subtextColor }]}>
                                        Archived terms are hidden from transaction dropdowns
                                    </Text>
                                </View>
                                <IOSSwitch
                                    value={status === 'active'}
                                    onValueChange={(val) => setStatus(val ? 'active' : 'archived')}
                                    activeColor="#159957"
                                />
                            </View>
                        )}

                        {/* Delete Button (Edit Mode) */}
                        {isEditMode && onDelete && !term?.isDefault && !term?.inUse && (
                            <TouchableOpacity
                                style={s.deleteBtn}
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="trash" size={15} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Payment Term</Text>
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
    daysInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    daysUnitPill: {
        height: 44,
        paddingHorizontal: 16,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    daysUnitText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sampleCard: {
        marginTop: 6,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 4,
    },
    sampleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sampleLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    sampleSubtitle: {
        fontSize: 12,
        lineHeight: 16,
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
