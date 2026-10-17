import React, { useState, useEffect } from 'react';
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
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import {
    ItemMasterRecord,
} from '@/lib/api/resourcesItemMaster';
import {
    FinanceCategory,
    ResourceTypeOption,
} from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface ItemMasterEditSheetProps {
    visible: boolean;
    onClose: () => void;
    item?: ItemMasterRecord | null;
    existingItems: ItemMasterRecord[];
    categories: FinanceCategory[];
    onSave: (item: ItemMasterRecord) => void;
    onDelete?: (itemId: string) => void;
}

const COMMON_UNITS = ['unit', 'sak', 'btg', 'pcs', 'kg', 'm', 'm2', 'm3', 'box', 'set', 'jam', 'hari', 'bln'];

export function ItemMasterEditSheet({
    visible,
    onClose,
    item,
    existingItems,
    categories,
    onSave,
    onDelete,
}: ItemMasterEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!item;

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [resourceType, setResourceType] = useState<ResourceTypeOption>('Material');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | undefined>(undefined);
    const [standardUnit, setStandardUnit] = useState('unit');
    const [isActive, setIsActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initial setup on opening
    useEffect(() => {
        if (visible) {
            if (item) {
                setName(item.name || '');
                setCode(item.code || '');
                setResourceType(item.resourceType || 'Material');
                setSelectedCategoryId(item.categoryId || (categories[0]?.id || ''));
                setSelectedSubcategoryId(item.subcategoryId);
                setStandardUnit(item.standardUnit || 'unit');
                setIsActive(item.active !== false);
            } else {
                setName('');
                const prefix = 'MT';
                const nextSeq = String(existingItems.length + 1).padStart(2, '0');
                setCode(`${prefix}-${nextSeq}010100`);
                setResourceType('Material');
                const defaultCat = categories.find((c) => c.resourceMapping === 'Material') || categories[0];
                if (defaultCat) {
                    setSelectedCategoryId(defaultCat.id);
                    setSelectedSubcategoryId(defaultCat.subcategories?.[0]?.id);
                } else {
                    setSelectedCategoryId('');
                    setSelectedSubcategoryId(undefined);
                }
                setStandardUnit('unit');
                setIsActive(true);
            }
            setErrorMsg(null);
        }
    }, [visible, item, existingItems, categories]);

    const currentCategory = categories.find((c) => c.id === selectedCategoryId);
    const currentSubcategories = currentCategory?.subcategories || [];
    const currentSubcategory = currentSubcategories.find((s) => s.id === selectedSubcategoryId);

    // Auto-update code prefix when resourceType changes if creating new
    const handleSelectResourceType = (type: ResourceTypeOption) => {
        setResourceType(type);
        if (!isEditMode) {
            let prefix = 'MT';
            if (type === 'Tools') prefix = 'TL';
            else if (type === 'Assets') prefix = 'AS';
            else if (type === 'Services') prefix = 'SV';

            const nextSeq = String(existingItems.length + 1).padStart(2, '0');
            setCode(`${prefix}-${nextSeq}010100`);

            // Auto select matching category
            const matchCat = categories.find((c) => c.resourceMapping === type);
            if (matchCat) {
                setSelectedCategoryId(matchCat.id);
                setSelectedSubcategoryId(matchCat.subcategories?.[0]?.id);
            }
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            setErrorMsg('Item name cannot be empty.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const catName = currentCategory ? currentCategory.name : 'General';
        const subName = currentSubcategory ? currentSubcategory.name : undefined;

        const record: ItemMasterRecord = {
            id: item ? item.id : `item-${Date.now()}`,
            name: name.trim(),
            code: code.trim() || 'TL-00000000',
            resourceType,
            categoryId: selectedCategoryId,
            categoryName: catName,
            subcategoryId: selectedSubcategoryId,
            subcategoryName: subName,
            standardUnit: standardUnit.trim() || 'unit',
            variants: item ? item.variants : [],
            active: isActive,
            updatedAt: new Date().toISOString(),
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(record);
        onClose();
    };

    const badgeMeta = getResourceBadgeMeta(resourceType);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
            >
                {/* Header */}
                <View
                    style={[
                        s.header,
                        {
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: subtextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {isEditMode ? 'Edit Item Master' : 'New Item Master'}
                    </Text>
                    <TouchableOpacity onPress={handleSave} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: '#007AFF', fontWeight: '600' }]}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {errorMsg && (
                        <View style={s.errorBanner}>
                            <PlatformIcon name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                            <Text style={s.errorBannerText}>{errorMsg}</Text>
                        </View>
                    )}

                    {/* Section 1: Basic Identity */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Item Identity</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Name */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Item Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                placeholder="e.g. Impact Drill, Semen Portland"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Master Code */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Master Code</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={code}
                                onChangeText={setCode}
                                placeholder="e.g. TL-01020300"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Section 2: Classification */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Classification & Unit</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Resource Type Dropdown */}
                        <ContextMenu
                            actions={[
                                { title: 'Material', subtitle: 'MT', selected: resourceType === 'Material' },
                                { title: 'Tools', subtitle: 'TL', selected: resourceType === 'Tools' },
                                { title: 'Assets', subtitle: 'AS', selected: resourceType === 'Assets' },
                                { title: 'Services', subtitle: 'SV', selected: resourceType === 'Services' },
                            ]}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const types: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];
                                const selected = types[e.nativeEvent.index] || 'Material';
                                handleSelectResourceType(selected);
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Resource Type</Text>
                                <View style={s.selectValueBox}>
                                    <View
                                        style={[
                                            s.badgePill,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                        ]}
                                    >
                                        <PlatformIcon
                                            name={badgeMeta.icon as any}
                                            size={12}
                                            tintColor={badgeMeta.iconColor}
                                        />
                                        <Text style={[s.badgeText, { color: textColor }]}>
                                            {badgeMeta.label}
                                        </Text>
                                    </View>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Category Dropdown */}
                        <ContextMenu
                            actions={categories.map((c) => ({
                                title: c.name,
                                subtitle: `${c.code} · ${c.resourceMapping}`,
                                state: selectedCategoryId === c.id ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const cat = categories[e.nativeEvent.index];
                                if (cat) {
                                    setSelectedCategoryId(cat.id);
                                    setSelectedSubcategoryId(cat.subcategories?.[0]?.id);
                                }
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Category</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: textColor }]}>
                                        {currentCategory ? currentCategory.name : 'Select Category'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        {currentSubcategories.length > 0 && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                {/* Subcategory Dropdown */}
                                <ContextMenu
                                    actions={currentSubcategories.map((s) => ({
                                        title: s.name,
                                        subtitle: s.code,
                                        state: selectedSubcategoryId === s.id ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const sub = currentSubcategories[e.nativeEvent.index];
                                        if (sub) setSelectedSubcategoryId(sub.id);
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Subcategory</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: textColor }]}>
                                                {currentSubcategory ? currentSubcategory.name : 'Select Subcategory'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </>
                        )}

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Standard Unit Dropdown / Input */}
                        <ContextMenu
                            actions={COMMON_UNITS.map((u) => ({
                                title: u,
                                state: standardUnit.toLowerCase() === u ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                setStandardUnit(COMMON_UNITS[e.nativeEvent.index] || 'unit');
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Standard Unit</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: textColor }]}>
                                        {standardUnit}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>
                    </View>

                    {/* Section 3: Status & Controls */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Status</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.switchLabel, { color: textColor }]}>Active in Catalog</Text>
                                <Text style={[s.switchDesc, { color: subtextColor }]}>
                                    Available for inventory, purchasing, and Finance autocomplete
                                </Text>
                            </View>
                            <Switch
                                value={isActive}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsActive(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>
                    </View>

                    {isEditMode && onDelete && (
                        <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                            <TouchableOpacity
                                style={[
                                    s.deleteBtn,
                                    { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (item) onDelete(item.id);
                                    onClose();
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Item Master</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    headerBtn: {
        fontSize: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorBannerText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'none',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 12,
    },
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        width: 120,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        padding: 0,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectValueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    badgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    deleteBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
});
