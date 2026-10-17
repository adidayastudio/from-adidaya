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
    FinanceAccount,
    AccountType,
    ACCOUNT_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';

export interface FinanceAccountEditSheetProps {
    visible: boolean;
    onClose: () => void;
    account?: FinanceAccount | null;
    existingAccounts: FinanceAccount[];
    onSave: (account: FinanceAccount) => void;
    onDelete?: (accountId: string) => void;
}

export function FinanceAccountEditSheet(props: FinanceAccountEditSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceAccountEditSheet.ios').FinanceAccountEditSheet || require('./FinanceAccountEditSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinanceAccountEditSheetWebAndroid {...props} />;
}

function FinanceAccountEditSheetWebAndroid({
    visible,
    onClose,
    account,
    existingAccounts,
    onSave,
    onDelete,
}: FinanceAccountEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!account;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [accountType, setAccountType] = useState<AccountType>('cost_of_sales');
    const [description, setDescription] = useState('');
    const [active, setActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const currentTypeLabel = useMemo(() => {
        return ACCOUNT_TYPE_OPTIONS.find((t) => t.value === accountType)?.label || accountType;
    }, [accountType]);

    useEffect(() => {
        if (visible) {
            if (account) {
                setCode(account.code || '');
                setName(account.name || '');
                setAccountType(account.type || 'cost_of_sales');
                setDescription(account.description || '');
                setActive(account.active !== false);
            } else {
                setCode('');
                setName('');
                setAccountType('cost_of_sales');
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
    }, [visible, account, fadeAnim, slideAnim]);

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
        const cleanCode = code.trim();
        const cleanName = name.trim();

        if (!cleanCode) {
            setErrorMsg('Account Code is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!cleanName) {
            setErrorMsg('Account Name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingAccounts.some(
            (a) => a.code?.toUpperCase() === cleanCode.toUpperCase() && (!account || a.id !== account.id)
        );

        if (isDuplicate) {
            setErrorMsg(`Account Code "${cleanCode}" is already in use.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedAccount: FinanceAccount = {
            id: account ? account.id : `acc_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            type: accountType,
            description: description.trim() || undefined,
            active,
        };

        onSave(updatedAccount);
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
                                {isEditMode ? 'Edit Account' : 'Add Account'}
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                {isEditMode
                                    ? `Modify configuration for ${account?.name}`
                                    : 'Create a new ledger / chart of account'}
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
                        {/* Field 1: Account Code */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Account Code</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>e.g. 1-1001, 5-1001</Text>
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
                                    setCode(val);
                                    setErrorMsg(null);
                                }}
                                placeholder="e.g. 1-1001"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="none"
                                maxLength={16}
                            />
                        </View>

                        {/* Field 2: Account Name */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Account Name</Text>
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
                                placeholder="e.g. Petty Cash"
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 3: Account Type */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Account Classification</Text>
                            </View>
                            <ContextMenu
                                actions={ACCOUNT_TYPE_OPTIONS.map((opt) => ({
                                    title: opt.label,
                                    state: accountType === opt.value ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const selected = ACCOUNT_TYPE_OPTIONS[e.nativeEvent.index];
                                    if (selected) setAccountType(selected.value);
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
                                        {currentTypeLabel}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 4: Description */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Description (Optional)</Text>
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
                                placeholder="e.g. Cash on hand for operational reimbursements"
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 5: Active Status */}
                        <View style={[s.fieldGroup, s.switchRow]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Active Status</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>
                                    Enable to allow selection in Expense Types & mapping
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
                                    if (!account) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    confirmDestructiveAction({
                                        title: 'Delete Account',
                                        message: `Are you sure you want to delete "${account.name}" (${account.code})?`,
                                        confirmLabel: 'Delete',
                                        onConfirm: () => {
                                            onDelete(account.id);
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
                                {isEditMode ? 'Save Changes' : 'Add Account'}
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

export default FinanceAccountEditSheet;
