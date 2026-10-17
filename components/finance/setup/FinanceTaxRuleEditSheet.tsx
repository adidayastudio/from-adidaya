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
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import {
    FinanceTaxRule,
    TaxType,
    TAX_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';

export interface FinanceTaxRuleEditSheetProps {
    visible: boolean;
    onClose: () => void;
    taxRule?: FinanceTaxRule | null;
    existingTaxRules: FinanceTaxRule[];
    accounts?: any[];
    onSave: (taxRule: FinanceTaxRule) => void;
    onDelete?: (taxRuleId: string) => void;
}

export function FinanceTaxRuleEditSheet(props: FinanceTaxRuleEditSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceTaxRuleEditSheet.ios').FinanceTaxRuleEditSheet || require('./FinanceTaxRuleEditSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinanceTaxRuleEditSheetWebAndroid {...props} />;
}

function FinanceTaxRuleEditSheetWebAndroid({
    visible,
    onClose,
    taxRule,
    existingTaxRules,
    accounts = [],
    onSave,
    onDelete,
}: FinanceTaxRuleEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!taxRule;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [rateStr, setRateStr] = useState('11');
    const [taxType, setTaxType] = useState<TaxType>('vat');
    const [defaultAccount, setDefaultAccount] = useState('None');
    const [description, setDescription] = useState('');
    const [active, setActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const currentTaxTypeLabel = useMemo(() => {
        return TAX_TYPE_OPTIONS.find((t) => t.value === taxType)?.label || taxType;
    }, [taxType]);

    useEffect(() => {
        if (visible) {
            if (taxRule) {
                setCode(taxRule.code || '');
                setName(taxRule.name || '');
                setRateStr(taxRule.rate !== undefined ? String(taxRule.rate) : '0');
                setTaxType(taxRule.taxType || 'vat');
                setDefaultAccount(taxRule.defaultAccount || 'None');
                setDescription(taxRule.description || '');
                setActive(taxRule.active !== false);
            } else {
                setCode('');
                setName('');
                setRateStr('11');
                setTaxType('vat');
                setDefaultAccount('None');
                setDescription('');
                setActive(true);
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
    }, [visible, taxRule, fadeAnim, slideAnim]);

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

    const handleSave = () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();
        const parsedRate = parseFloat(rateStr.replace(',', '.'));

        if (!cleanCode) {
            setErrorMsg('Tax Rule Code is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!cleanName) {
            setErrorMsg('Tax Rule Name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (isNaN(parsedRate) || parsedRate < 0) {
            setErrorMsg('Please enter a valid non-negative rate.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const isDuplicate = existingTaxRules.some(
            (t) => t.code?.toUpperCase() === cleanCode && (!taxRule || t.id !== taxRule.id)
        );

        if (isDuplicate) {
            setErrorMsg(`Tax Rule Code "${cleanCode}" already exists.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const updated: FinanceTaxRule = {
            id: taxRule?.id || `tax_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            rate: parsedRate,
            taxType,
            defaultAccount: defaultAccount || 'None',
            description: description.trim() || undefined,
            active,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updated);
        handleDismiss();
    };

    const handleDelete = () => {
        if (!taxRule || !onDelete) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        confirmDestructiveAction({
            title: 'Delete Tax Rule',
            message: `Are you sure you want to delete "${taxRule.name}" (${taxRule.code})?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                onDelete(taxRule.id);
                handleDismiss();
            },
        });
    };

    const taxTypeActions = useMemo(() => {
        return TAX_TYPE_OPTIONS.map((t) => ({
            title: t.label,
            state: taxType === t.value ? ('on' as const) : ('off' as const),
        }));
    }, [taxType]);

    const availableAccountOptions = useMemo(() => {
        if (accounts && accounts.length > 0) {
            const list = accounts
                .filter((a: any) => a.active !== false)
                .map((a: any) => {
                    const codePart = a.code || a.accountNumber || '';
                    const namePart = a.name || a.accountName || '';
                    return codePart && namePart ? `${codePart} ${namePart}` : (namePart || codePart || a.label);
                })
                .filter(Boolean);
            return ['None', ...Array.from(new Set(list))];
        }
        return ['None'];
    }, [accounts]);

    const accountActions = useMemo(() => {
        return availableAccountOptions.map((accName) => ({
            title: accName,
            state: defaultAccount === accName ? ('on' as const) : ('off' as const),
        }));
    }, [availableAccountOptions, defaultAccount]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[s.overlay, Platform.OS === 'web' && s.overlayWeb]}
            >
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View
                        style={[
                            s.backdrop,
                            {
                                opacity: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.45],
                                }),
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        s.sheetContainer,
                        Platform.OS === 'web' && s.containerWeb,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            paddingBottom: Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 20),
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 520 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 0 : 350, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {/* Drag Handle (Mobile only) */}
                    {Platform.OS !== 'web' && (
                        <View style={s.dragHandleContainer}>
                            <View
                                style={[
                                    s.dragHandle,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.2)'
                                            : 'rgba(0,0,0,0.15)',
                                    },
                                ]}
                            />
                        </View>
                    )}

                    {/* Header (No divider border) */}
                    <View style={s.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: textColor }]}>
                                {isEditMode ? 'Edit Tax Rule' : 'Add Tax Rule'}
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                {isEditMode
                                    ? `Modify configuration for ${taxRule?.name}`
                                    : 'Create a reusable tax rate definition'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[
                                s.closeBtn,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.05)',
                                },
                            ]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {errorMsg && (
                        <View style={s.errorBanner}>
                            <PlatformIcon name="exclamationmark.circle.fill" size={14} tintColor="#EF4444" />
                            <Text style={s.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <ScrollView
                        style={s.formScroll}
                        contentContainerStyle={s.formContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Field 1: Code */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Tax Code</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>Uppercase alphanumeric</Text>
                            </View>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        color: textColor,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.035)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={code}
                                onChangeText={(val) => {
                                    setCode(val.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                                    setErrorMsg(null);
                                }}
                                placeholder="e.g. PPN11, PPH23"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                maxLength={10}
                            />
                        </View>

                        {/* Field 2: Name */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Rule Name</Text>
                            </View>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        color: textColor,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.035)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    setErrorMsg(null);
                                }}
                                placeholder="e.g. PPN Masukan 11%"
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 3: Tax Rate */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Tax Rate (%)</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>Percentage</Text>
                            </View>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        color: textColor,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.035)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={rateStr}
                                onChangeText={(val) => {
                                    setRateStr(val);
                                    setErrorMsg(null);
                                }}
                                placeholder="e.g. 11"
                                placeholderTextColor={subtextColor}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        {/* Field 4: Tax Type */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Tax Type</Text>
                            </View>
                            <ContextMenu
                                title="Select Tax Type"
                                actions={taxTypeActions}
                                onPress={(e) => {
                                    const selected = TAX_TYPE_OPTIONS[e.nativeEvent.index];
                                    if (selected) {
                                        setTaxType(selected.value);
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View
                                    style={[
                                        s.pickerBtn,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(0,0,0,0.035)',
                                            borderColor: isDark
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'rgba(0,0,0,0.08)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.pickerBtnText, { color: textColor }]}>
                                        {currentTaxTypeLabel}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 5: Default Account */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Default Account</Text>
                            </View>
                            <ContextMenu
                                title="Select Account"
                                actions={accountActions}
                                onPress={(e) => {
                                    const selected = availableAccountOptions[e.nativeEvent.index];
                                    if (selected) {
                                        setDefaultAccount(selected);
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View
                                    style={[
                                        s.pickerBtn,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(0,0,0,0.035)',
                                            borderColor: isDark
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'rgba(0,0,0,0.08)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.pickerBtnText, { color: textColor }]}>
                                        {defaultAccount}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 6: Description */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Description</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>Optional</Text>
                            </View>
                            <TextInput
                                style={[
                                    s.inputField,
                                    {
                                        color: textColor,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.035)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Optional explanation..."
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 7: Active Status */}
                        <View style={s.switchRow}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Active Status</Text>
                                <Text style={[s.fieldHint, { color: subtextColor, marginTop: 2 }]}>
                                    Enable to show in transaction categories & subcategories
                                </Text>
                            </View>
                            <IOSSwitch
                                value={active}
                                onValueChange={setActive}
                                activeColor="#159957"
                            />
                        </View>
                    </ScrollView>

                    {/* Footer Actions (No divider border, Pill buttons) */}
                    <View style={s.footerContainer}>
                        {isEditMode && onDelete && (
                            <TouchableOpacity
                                style={[
                                    s.deleteActionBtn,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(239, 68, 68, 0.15)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                    },
                                ]}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    if (taxRule) {
                                        onDelete(taxRule.id);
                                        handleDismiss();
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="trash.fill" size={16} tintColor="#EF4444" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                s.primaryBtn,
                                {
                                    backgroundColor: '#159957',
                                },
                            ]}
                            onPress={handleSave}
                            activeOpacity={0.8}
                        >
                            <Text style={s.primaryBtnText}>
                                {isEditMode ? 'Save Changes' : 'Add Tax Rule'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: 480,
    },
    containerWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 480,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        minHeight: 'auto' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : 6,
        paddingBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        gap: 8,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 16,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    fieldHint: {
        fontSize: 12,
    },
    inputField: {
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    pickerBtn: {
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerBtnText: {
        fontSize: 15,
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    footerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 10,
    },
    deleteActionBtn: {
        width: 48,
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        flex: 1,
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default FinanceTaxRuleEditSheet;
