import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import {
    FinanceCategory,
    FinanceSubcategory,
    SubcategoryResourceTypeOption,
    RESOURCE_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';

interface ResourceSubcategoryEditSheetProps {
    visible: boolean;
    onClose: () => void;
    parentCategory: FinanceCategory | null;
    subcategory?: FinanceSubcategory | null;
    onSave: (sub: FinanceSubcategory) => void;
    onArchive?: (subId: string) => void;
}

export function ResourceSubcategoryEditSheet({
    visible,
    onClose,
    parentCategory,
    subcategory,
    onSave,
    onArchive,
}: ResourceSubcategoryEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!subcategory;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [resourceMapping, setResourceMapping] = useState<SubcategoryResourceTypeOption>('Inherit from Category');
    const [isActive, setIsActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Auto-generate 2-digit sequence code for subcategory (e.g. 01, 02...)
    useEffect(() => {
        if (visible) {
            if (subcategory) {
                setCode(subcategory.code || '');
                setName(subcategory.name || '');
                setResourceMapping(subcategory.resourceMapping || 'Inherit from Category');
                setIsActive(!subcategory.isArchived);
            } else {
                const count = parentCategory?.subcategories?.length || 0;
                const nextSeq = count + 1;
                const formattedCode = String(nextSeq).padStart(2, '0');
                setCode(formattedCode);
                setName('');
                setResourceMapping('Inherit from Category');
                setIsActive(true);
            }
            setErrorMsg(null);
        }
    }, [visible, subcategory, parentCategory]);

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

        const isDuplicate = parentCategory?.subcategories.some(
            (s) => s.code.toUpperCase() === cleanCode && (!subcategory || s.id !== subcategory.id)
        );

        if (isDuplicate) {
            setErrorMsg(`Subcategory Code "${cleanCode}" already exists in this Category.`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        const updated: FinanceSubcategory = {
            id: subcategory ? subcategory.id : `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            code: cleanCode,
            name: cleanName,
            defaultExpenseType: subcategory?.defaultExpenseType || 'Inherit from Category',
            resourceMapping,
            isArchived: !isActive,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updated);
        onClose();
    };

    const handleArchiveToggle = () => {
        if (subcategory && onArchive) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onArchive(subcategory.id);
            onClose();
        }
    };

    const mappingOptions: { value: SubcategoryResourceTypeOption; label: string; icon: string; desc: string }[] = [
        {
            value: 'Inherit from Category',
            label: `Inherit (${parentCategory?.resourceMapping || 'Material'})`,
            icon: 'arrow.triangle.merge',
            desc: `Follow parent category default (${parentCategory?.resourceMapping || 'Material'})`,
        },
        ...RESOURCE_TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label === 'None' ? 'None (Finance Only)' : o.label,
            icon: o.icon,
            desc: o.description,
        })),
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[s.modalRoot, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
            >
                {/* Header */}
                <View style={[s.headerRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={[s.cancelBtnText, { color: subtextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {isEditMode ? 'Edit Subcategory' : 'New Subcategory'}
                    </Text>
                    <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={s.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 30 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {errorMsg && (
                        <View style={[s.errorBanner, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)' }]}>
                            <PlatformIcon name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                            <Text style={s.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    {/* Parent Info */}
                    {parentCategory && (
                        <View style={[s.parentInfoCard, { backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.08)' }]}>
                            <PlatformIcon name="folder.fill" size={16} tintColor="#007AFF" />
                            <Text style={[s.parentInfoText, { color: isDark ? '#64D2FF' : '#007AFF' }]}>
                                Parent Category: <Text style={{ fontWeight: '700' }}>{parentCategory.name}</Text> ({parentCategory.code})
                            </Text>
                        </View>
                    )}

                    {/* Subcategory Details */}
                    <Text style={[s.sectionLabel, { color: subtextColor }]}>Subcategory Details</Text>
                    <View style={[s.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                        <View style={s.row}>
                            <Text style={[s.rowLabel, { color: textColor }]}>Subcategory Name</Text>
                            <TextInput
                                style={[s.rowInput, { color: textColor }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Structural Steel"
                                placeholderTextColor={subtextColor}
                                autoFocus={!isEditMode}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

                        <View style={s.row}>
                            <View style={s.labelCol}>
                                <Text style={[s.rowLabel, { color: textColor }]}>Subcategory Code</Text>
                                <Text style={[s.rowSublabel, { color: subtextColor }]}>2-digit sequence code (e.g. 01)</Text>
                            </View>
                            <TextInput
                                style={[s.codeInput, { color: textColor, borderColor: isDark ? '#444' : '#E5E5EA', backgroundColor: isDark ? '#1C1C1E' : '#F9F9FB' }]}
                                value={code}
                                onChangeText={setCode}
                                placeholder="01"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                maxLength={8}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

                        <View style={s.row}>
                            <Text style={[s.rowLabel, { color: textColor }]}>Active Status</Text>
                            <Switch
                                value={isActive}
                                onValueChange={setIsActive}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                            />
                        </View>
                    </View>

                    {/* Resource Mapping Override Section */}
                    <Text style={[s.sectionLabel, { color: subtextColor, marginTop: 22 }]}>
                        Resource Mapping
                    </Text>
                    <View style={[s.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                        {mappingOptions.map((opt, idx) => {
                            const isSelected = resourceMapping === opt.value;
                            return (
                                <React.Fragment key={opt.value}>
                                    {idx > 0 && (
                                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                                    )}
                                    <TouchableOpacity
                                        style={s.mappingRow}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setResourceMapping(opt.value);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={s.mappingInfoCol}>
                                            <View style={s.mappingTitleRow}>
                                                <PlatformIcon
                                                    name={opt.icon as any}
                                                    size={16}
                                                    tintColor={isSelected ? '#007AFF' : subtextColor}
                                                />
                                                <Text style={[s.mappingTitle, { color: isSelected ? '#007AFF' : textColor, fontWeight: isSelected ? '600' : '400' }]}>
                                                    {opt.label}
                                                </Text>
                                            </View>
                                            <Text style={[s.mappingDesc, { color: subtextColor }]}>
                                                {opt.desc}
                                            </Text>
                                        </View>

                                        {isSelected && (
                                            <PlatformIcon name="checkmark" size={16} tintColor="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Archive Button */}
                    {isEditMode && onArchive && (
                        <TouchableOpacity
                            style={[s.archiveBtn, { borderColor: isDark ? 'rgba(255,59,48,0.3)' : 'rgba(255,59,48,0.2)' }]}
                            onPress={handleArchiveToggle}
                            activeOpacity={0.7}
                        >
                            <Text style={s.archiveBtnText}>
                                {subcategory?.isArchived ? 'Restore Subcategory' : 'Archive Subcategory'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    modalRoot: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelBtnText: {
        fontSize: 16,
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    scrollContent: {
        padding: 16,
    },
    parentInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 8,
        marginBottom: 16,
    },
    parentInfoText: {
        fontSize: 13,
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 8,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 13,
        color: '#FF3B30',
        flex: 1,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 12,
    },
    labelCol: {
        flex: 1,
        gap: 2,
    },
    rowLabel: {
        fontSize: 15,
    },
    rowSublabel: {
        fontSize: 12,
    },
    rowInput: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        padding: 0,
    },
    codeInput: {
        fontSize: 14,
        fontWeight: '700',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        textAlign: 'center',
        minWidth: 52,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    mappingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    mappingInfoCol: {
        flex: 1,
        gap: 3,
    },
    mappingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mappingTitle: {
        fontSize: 15,
    },
    mappingDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    archiveBtn: {
        marginTop: 28,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    archiveBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
});
