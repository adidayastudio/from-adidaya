import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import {
    FinanceCategory,
    FinanceSubcategory,
    SubcategoryExpenseTypeOption,
    SubcategoryResourceTypeOption,
    ResourceTypeOption,
    RESOURCE_TYPE_OPTIONS,
    DEFAULT_ACTIVE_EXPENSE_TYPES,
} from '@/lib/api/financeSetup';

interface FinanceSubcategoryEditSheetProps {
    visible: boolean;
    onClose: () => void;
    parentCategory: FinanceCategory;
    subcategory?: FinanceSubcategory | null;
    expenseTypesList?: string[];
    onSave: (subcategory: FinanceSubcategory) => void;
    onArchive?: (subcategoryId: string) => void;
    onDelete?: (subcategoryId: string) => void;
}

export function FinanceSubcategoryEditSheet({
    visible,
    onClose,
    parentCategory,
    subcategory,
    expenseTypesList,
    onSave,
    onArchive,
    onDelete,
}: FinanceSubcategoryEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!subcategory;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [defaultExpenseType, setDefaultExpenseType] = useState<SubcategoryExpenseTypeOption>('Inherit from Category');
    const [resourceMapping, setResourceMapping] = useState<SubcategoryResourceTypeOption>('Inherit from Category');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const expenseTypeOptions: SubcategoryExpenseTypeOption[] = React.useMemo(() => {
        const baseList = expenseTypesList && expenseTypesList.length > 0 ? expenseTypesList : DEFAULT_ACTIVE_EXPENSE_TYPES;
        return ['Inherit from Category', ...baseList, 'None'];
    }, [expenseTypesList]);

    useEffect(() => {
        if (visible) {
            if (subcategory) {
                setCode(subcategory.code || '');
                setName(subcategory.name || '');
                setDefaultExpenseType(subcategory.defaultExpenseType || 'Inherit from Category');
                setResourceMapping(subcategory.resourceMapping || 'Inherit from Category');
            } else {
                const parentCode = (parentCategory.code || 'CAT').toUpperCase();
                const subcats = parentCategory.subcategories || [];
                let maxSeq = 0;
                const regex = new RegExp(`^${parentCode}-(\\d+)$`, 'i');
                for (const s of subcats) {
                    const match = s.code.match(regex);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxSeq) {
                            maxSeq = num;
                        }
                    }
                }
                const nextSeq = maxSeq > 0 ? maxSeq + 1 : subcats.length + 1;
                const padded = String(nextSeq).padStart(2, '0');
                const suggestedCode = `${parentCode}-${padded}`;

                setCode(suggestedCode);
                setName('');
                setDefaultExpenseType('Inherit from Category');
                setResourceMapping('Inherit from Category');
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
    }, [visible, subcategory, parentCategory, expenseTypeOptions, slideAnim, fadeAnim]);

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
            setErrorMsg('Subcategory Code is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!cleanName) {
            setErrorMsg('Subcategory Name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        // Check duplicate code within parent or siblings
        const isDuplicate = parentCategory.subcategories?.some(
            (s) => s.code.toUpperCase() === cleanCode && (!subcategory || s.id !== subcategory.id)
        );

        if (isDuplicate) {
            setErrorMsg(`Subcategory Code "${cleanCode}" is already in use in this category.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newSubcategory: FinanceSubcategory = {
            ...subcategory,
            id: subcategory ? subcategory.id : `sub_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            defaultExpenseType,
            resourceMapping,
            isArchived: subcategory?.isArchived || false,
        };

        onSave(newSubcategory);
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
                                {isEditMode ? 'Edit Subcategory' : 'Add Subcategory'}
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                Parent: <Text style={{ fontWeight: '600', color: '#159957' }}>{parentCategory.name} ({parentCategory.code})</Text>
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
                            <PlatformIcon
                                name="xmark"
                                size={14}
                                tintColor={subtextColor}
                            />
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
                        {/* Field 1: Subcategory Code */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Subcategory Code</Text>
                                <Text style={[s.fieldHint, { color: subtextColor }]}>e.g. {parentCategory.code || 'CAT'}-01</Text>
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
                                placeholder={`e.g. ${parentCategory.code || 'CAT'}-01`}
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                maxLength={10}
                            />
                        </View>

                        {/* Field 2: Subcategory Name */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Subcategory Name</Text>
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
                                placeholder="e.g. Building Materials"
                                placeholderTextColor={subtextColor}
                            />
                        </View>

                        {/* Field 3: Default Expense Type */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Default Expense Type</Text>
                            </View>
                            <ContextMenu
                                actions={expenseTypeOptions.map((exp) => ({
                                    title: exp,
                                    state: defaultExpenseType === exp ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const selected = expenseTypeOptions[e.nativeEvent.index];
                                    if (selected) setDefaultExpenseType(selected);
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
                                        {defaultExpenseType}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Field 4: Resource Mapping */}
                        <View style={s.fieldGroup}>
                            <View style={s.fieldLabelRow}>
                                <Text style={[s.fieldLabel, { color: textColor }]}>Resource Mapping</Text>
                            </View>

                            {/* Inherit Option */}
                            <TouchableOpacity
                                style={[
                                    s.resourceOptionCard,
                                    {
                                        backgroundColor: resourceMapping === 'Inherit from Category'
                                            ? isDark
                                                ? 'rgba(21, 153, 87, 0.18)'
                                                : 'rgba(21, 153, 87, 0.08)'
                                            : isDark
                                            ? 'rgba(255,255,255,0.04)'
                                            : 'rgba(0,0,0,0.02)',
                                        borderColor: resourceMapping === 'Inherit from Category'
                                            ? '#159957'
                                            : isDark
                                            ? 'rgba(255,255,255,0.08)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setResourceMapping('Inherit from Category');
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name="arrow.triangle.merge"
                                    size={16}
                                    tintColor={resourceMapping === 'Inherit from Category' ? '#159957' : subtextColor}
                                />
                                <Text
                                    style={[
                                        s.resourceOptionTitle,
                                        { color: resourceMapping === 'Inherit from Category' ? '#159957' : textColor },
                                        resourceMapping === 'Inherit from Category' && { fontWeight: '600' },
                                    ]}
                                >
                                    Inherit from Category ({parentCategory.resourceMapping || 'Material'})
                                </Text>
                                {resourceMapping === 'Inherit from Category' && (
                                    <PlatformIcon
                                        name="checkmark.circle.fill"
                                        size={16}
                                        tintColor="#159957"
                                        style={s.checkMark}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Specific Resource Type Cards (3-Column Grid) */}
                            <View style={s.resourceGrid}>
                                {RESOURCE_TYPE_OPTIONS.map((res) => {
                                    const isSelected = resourceMapping === res.value;
                                    return (
                                        <TouchableOpacity
                                            key={res.value}
                                            style={[
                                                s.resourceCard,
                                                {
                                                    backgroundColor: isSelected
                                                        ? isDark
                                                            ? 'rgba(21, 153, 87, 0.18)'
                                                            : 'rgba(21, 153, 87, 0.08)'
                                                        : isDark
                                                        ? 'rgba(255,255,255,0.04)'
                                                        : 'rgba(0,0,0,0.02)',
                                                    borderColor: isSelected
                                                        ? '#159957'
                                                        : isDark
                                                        ? 'rgba(255,255,255,0.08)'
                                                        : 'rgba(0,0,0,0.06)',
                                                },
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setResourceMapping(res.value);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon
                                                name={res.icon as any}
                                                size={22}
                                                tintColor={isSelected ? '#159957' : subtextColor}
                                            />
                                            <Text
                                                style={[
                                                    s.resourceCardTitle,
                                                    { color: isSelected ? '#159957' : textColor },
                                                    isSelected && { fontWeight: '600' },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {res.label}
                                            </Text>
                                            {isSelected && (
                                                <View style={s.resourceCardCheck}>
                                                    <PlatformIcon
                                                        name="checkmark.circle.fill"
                                                        size={14}
                                                        tintColor="#159957"
                                                    />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={s.footerContainer}>
                        {isEditMode && (onDelete || onArchive) && (
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
                                    if (!subcategory) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    confirmDestructiveAction({
                                        title: 'Delete Subcategory',
                                        message: `Are you sure you want to delete "${subcategory.name}"? Transactions using this subcategory may be affected.`,
                                        confirmLabel: 'Delete',
                                        onConfirm: () => {
                                            if (onDelete) {
                                                onDelete(subcategory.id);
                                            } else if (onArchive) {
                                                onArchive(subcategory.id);
                                            }
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
                                {isEditMode ? 'Save Changes' : 'Add Subcategory'}
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
        backgroundColor: 'rgba(0,0,0,0.45)',
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
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 18 : 0,
        paddingBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#EF4444',
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 16,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    fieldHint: {
        fontSize: 12,
    },
    supportingText: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 4,
    },
    inputField: {
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '500',
        borderWidth: StyleSheet.hairlineWidth,
    },
    pickerBtn: {
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: StyleSheet.hairlineWidth,
    },
    pickerBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    resourceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    resourceOptionCard: {
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        gap: 10,
    },
    resourceOptionTitle: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    resourceCard: {
        width: '31.5%',
        minHeight: 74,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 6,
        position: 'relative',
    },
    resourceCardTitle: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    resourceCardCheck: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    checkMark: {
        marginLeft: 'auto',
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
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
