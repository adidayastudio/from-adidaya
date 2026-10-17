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
    FinanceExpenseType,
} from '@/lib/api/financeSetup';

export interface FinanceExpenseTypeEditSheetProps {
    visible: boolean;
    onClose: () => void;
    expenseType?: FinanceExpenseType | null;
    existingExpenseTypes: FinanceExpenseType[];
    accounts?: any[];
    taxRules?: any[];
    onSave: (expenseType: FinanceExpenseType) => void;
    onDelete?: (expenseTypeId: string) => void;
}

export function FinanceExpenseTypeEditSheet(props: FinanceExpenseTypeEditSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceExpenseTypeEditSheet.ios').FinanceExpenseTypeEditSheet || require('./FinanceExpenseTypeEditSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinanceExpenseTypeEditSheetWebAndroid {...props} />;
}

function FinanceExpenseTypeEditSheetWebAndroid({
    visible,
    onClose,
    expenseType,
    existingExpenseTypes,
    accounts,
    taxRules,
    onSave,
    onDelete,
}: FinanceExpenseTypeEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!expenseType;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [taxRule, setTaxRule] = useState('None');
    const [account, setAccount] = useState('None');
    const [active, setActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const taxRuleOptions = useMemo(() => {
        if (taxRules && taxRules.length > 0) {
            const list = taxRules
                .filter((t: any) => t.active !== false)
                .map((t: any) => t.name || t.label || t.code)
                .filter(Boolean);
            return Array.from(new Set(['None', ...list]));
        }
        return ['None'];
    }, [taxRules]);

    const accountOptions = useMemo(() => {
        if (accounts && accounts.length > 0) {
            const list = accounts
                .filter((a: any) => a.active !== false)
                .map((a: any) => {
                    if (a.label) return a.label;
                    const codePart = a.code || a.accountNumber || '';
                    const namePart = a.name || a.accountName || '';
                    return codePart && namePart ? `${codePart} ${namePart}` : (namePart || codePart);
                })
                .filter(Boolean);

            return Array.from(new Set(['None', ...list]));
        }
        return ['None'];
    }, [accounts]);

    useEffect(() => {
        if (visible) {
            if (expenseType) {
                setCode(expenseType.code || '');
                setName(expenseType.name || '');
                setTaxRule(expenseType.defaultTaxRule || expenseType.tax || 'None');
                setAccount(expenseType.defaultAccount || 'None');
                setActive(expenseType.active !== false);
            } else {
                setCode('');
                setName('');
                setTaxRule('None');
                setAccount('None');
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
    }, [visible, expenseType, fadeAnim, slideAnim]);

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

        if (!cleanCode) {
            setErrorMsg('Expense Type Code is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!cleanName) {
            setErrorMsg('Expense Type Name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingExpenseTypes.some(
            (e) => e.code?.toUpperCase() === cleanCode && (!expenseType || e.id !== expenseType.id)
        );

        if (isDuplicate) {
            setErrorMsg(`Expense Type Code "${cleanCode}" is already in use.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedExpenseType: FinanceExpenseType = {
            id: expenseType ? expenseType.id : `exp_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            defaultTaxRule: taxRule,
            tax: taxRule,
            defaultAccount: account,
            active,
        };

        onSave(updatedExpenseType);
        handleDismiss();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[s.overlay, Platform.OS === 'web' && s.overlayWeb]}
            >
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
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

                    {/* Header */}
                    <View style={s.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: textColor }]}>
                                {isEditMode ? 'Edit Expense Type' : 'Add Expense Type'}
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                {isEditMode
                                    ? `Modify configuration for ${expenseType?.name}`
                                    : 'Create a reusable expense classification'}
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
                                <Text style={[s.fieldLabel, { color: textColor }]}>Expense Type Code</Text>
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
                                placeholder="e.g. OPX"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                maxLength={8}
                            />
                        </View>

                        {/* Field 2: Name */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Expense Type Name</Text>
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
                                placeholder="e.g. Operational Expenses"
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 3: Default Tax Rule */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Default Tax Rule</Text>
                            </View>
                            <ContextMenu
                                actions={taxRuleOptions.map((opt) => ({
                                    title: opt,
                                    state: taxRule === opt ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const selected = taxRuleOptions[e.nativeEvent.index];
                                    if (selected) setTaxRule(selected);
                                }}
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
                                        {taxRule}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 4: Default Account */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Default Account</Text>
                            </View>
                            <ContextMenu
                                actions={accountOptions.map((opt) => ({
                                    title: opt,
                                    state: account === opt ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const selected = accountOptions[e.nativeEvent.index];
                                    if (selected) setAccount(selected);
                                }}
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
                                    <Text style={[s.pickerBtnText, { color: textColor }]} numberOfLines={1}>
                                        {account}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 5: Active Status */}
                        <View style={[s.fieldGroup, s.switchRow]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Active Status</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>
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

                    {/* Footer Actions */}
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
                                    if (!expenseType) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    confirmDestructiveAction({
                                        title: 'Delete Expense Type',
                                        message: `Are you sure you want to delete "${expenseType.name}"? Transactions using this expense type may be affected.`,
                                        confirmLabel: 'Delete',
                                        onConfirm: () => {
                                            onDelete(expenseType.id);
                                            handleDismiss();
                                        },
                                    });
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
                                {isEditMode ? 'Save Changes' : 'Add Expense Type'}
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
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetContainer: {
        width: '100%',
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    containerWeb: {
        width: 480,
        height: '100%',
        maxHeight: '100%',
        borderRadius: 20,
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
        paddingTop: 14,
        paddingBottom: 6,
        gap: 12,
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

export default FinanceExpenseTypeEditSheet;
