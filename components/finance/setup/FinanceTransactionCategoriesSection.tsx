import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    LayoutAnimation,
    UIManager,
    Alert,
    ActionSheetIOS,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    FinanceCategory,
    FinanceSubcategory,
    getEffectiveSubcategorySettings,
} from '@/lib/api/financeSetup';
import { FinanceWorkflowSegmentedPicker } from './FinanceWorkflowSegmentedPicker';
import { FinanceCategoryWorkflow } from '@/lib/financeTransactionCategories';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import { FinanceResourceMappingGuideSheet } from './FinanceResourceMappingGuideSheet';
import { FinanceCategoryEditSheet } from './FinanceCategoryEditSheet';
import { FinanceSubcategoryEditSheet } from './FinanceSubcategoryEditSheet';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_SORT_OPTIONS = ['Name (A to Z)', 'Name (Z to A)', 'Code (A to Z)', 'Subcategories'];

interface FinanceTransactionCategoriesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    categories: FinanceCategory[];
    expenseTypesList?: string[];
    onUpdateCategories: (categories: FinanceCategory[]) => void;
    isAddCategorySheetOpen: boolean;
    onCloseAddCategorySheet: () => void;
    isGuideSheetOpen: boolean;
    onCloseGuideSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinanceTransactionCategoriesSection({
    isDark,
    textColor,
    subtextColor,
    categories,
    expenseTypesList,
    onUpdateCategories,
    isAddCategorySheetOpen,
    onCloseAddCategorySheet,
    isGuideSheetOpen,
    onCloseGuideSheet,
    onShowToast,
}: FinanceTransactionCategoriesSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);
    const [workflow, setWorkflow] = useState<FinanceCategoryWorkflow>('purchasing');

    const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});

    // Edit Category Sheet State
    const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
    const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
    const [isInternalAddCategoryOpen, setIsInternalAddCategoryOpen] = useState(false);

    // Subcategory Sheet State
    const [targetParentCategory, setTargetParentCategory] = useState<FinanceCategory | null>(null);
    const [editingSubcategory, setEditingSubcategory] = useState<FinanceSubcategory | null>(null);
    const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);

    const toggleExpandCategory = (categoryId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCategoryIds((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    // Category CRUD Handlers
    const handleSaveCategory = (updatedCat: FinanceCategory) => {
        const exists = categories.some((c) => c.id === updatedCat.id);
        let newCategories: FinanceCategory[];
        if (exists) {
            newCategories = categories.map((c) => (c.id === updatedCat.id ? { ...updatedCat, subcategories: [...updatedCat.subcategories, ...c.subcategories.filter(sub => sub.legacyValues && !sub.legacyValues[workflow] && !updatedCat.subcategories.some(updated => updated.id === sub.id))] } : c));
            onShowToast(`Category ${updatedCat.code} updated`);
        } else {
            newCategories = [...categories, { ...updatedCat, legacyValues: { [workflow]: updatedCat.name } }];
            onShowToast(`Category ${updatedCat.code} added`);
            setExpandedCategoryIds((prev) => ({ ...prev, [updatedCat.id]: true }));
        }
        onUpdateCategories(newCategories);
    };

    const handleArchiveCategory = (categoryId: string) => {
        const newCategories = categories.map((c) =>
            c.id === categoryId ? { ...c, isArchived: !c.isArchived } : c
        );
        onUpdateCategories(newCategories);
        onShowToast('Category archived');
    };

    const handleDeleteCategory = (categoryId: string) => {
        const newCategories = categories.filter((c) => c.id !== categoryId);
        onUpdateCategories(newCategories);
        onShowToast('Category removed');
    };

    const confirmDeleteCategory = (category: FinanceCategory) => {
        const subCount = category.subcategories?.length || 0;
        const msg = subCount > 0
            ? `"${category.name}" (${category.code}) contains ${subCount} subcategory(s). Are you sure you want to delete this category and all its subcategories?`
            : `Are you sure you want to permanently delete "${category.name}" (${category.code})?`;

        confirmDestructiveAction({
            title: 'Delete Category',
            message: msg,
            confirmLabel: 'Delete',
            onConfirm: () => handleDeleteCategory(category.id),
        });
    };

    const handleCategoryLongPress = (category: FinanceCategory) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${category.name} (${category.code})`,
                    message: `${category.defaultExpenseType || 'None'} · ${category.resourceMapping || 'None'}`,
                    options: ['Cancel', 'Edit Category', 'Delete Category'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setEditingCategory(category);
                        setIsEditCategoryOpen(true);
                    } else if (buttonIndex === 2) {
                        confirmDeleteCategory(category);
                    }
                }
            );
        } else {
            Alert.alert(
                category.name,
                `${category.code} · ${category.defaultExpenseType || 'None'}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit Category',
                        onPress: () => {
                            setEditingCategory(category);
                            setIsEditCategoryOpen(true);
                        },
                    },
                    {
                        text: 'Delete Category',
                        style: 'destructive',
                        onPress: () => confirmDeleteCategory(category),
                    },
                ]
            );
        }
    };

    // Subcategory CRUD Handlers
    const handleOpenAddSubcategory = (category: FinanceCategory) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTargetParentCategory(category);
        setEditingSubcategory(null);
        setIsSubcategorySheetOpen(true);
    };

    const handleOpenEditSubcategory = (
        parentCat: FinanceCategory,
        subcat: FinanceSubcategory
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTargetParentCategory(parentCat);
        setEditingSubcategory(subcat);
        setIsSubcategorySheetOpen(true);
    };

    const handleSaveSubcategory = (savedSub: FinanceSubcategory) => {
        if (!targetParentCategory) return;

        const parentId = targetParentCategory.id;
        const currentParent = categories.find((c) => c.id === parentId) || targetParentCategory;
        const subExists = currentParent.subcategories?.some((s) => s.id === savedSub.id);

        let updatedSubList: FinanceSubcategory[];
        if (subExists) {
            updatedSubList = (currentParent.subcategories || []).map((s) =>
                s.id === savedSub.id ? savedSub : s
            );
            onShowToast(`Subcategory ${savedSub.code} updated`);
        } else {
            updatedSubList = [...(currentParent.subcategories || []), savedSub];
            onShowToast(`Subcategory ${savedSub.code} added`);
        }

        const newCategories = categories.map((c) =>
            c.id === parentId ? { ...c, subcategories: updatedSubList } : c
        );

        onUpdateCategories(newCategories);
    };

    const handleArchiveSubcategory = (subcategoryId: string) => {
        if (!targetParentCategory) return;
        const parentId = targetParentCategory.id;
        const currentParent = categories.find((c) => c.id === parentId);
        if (!currentParent) return;

        const updatedSubList = (currentParent.subcategories || []).map((s) =>
            s.id === subcategoryId ? { ...s, isArchived: !s.isArchived } : s
        );

        const newCategories = categories.map((c) =>
            c.id === parentId ? { ...c, subcategories: updatedSubList } : c
        );

        onUpdateCategories(newCategories);
        onShowToast('Subcategory archived');
    };

    const handleDeleteSubcategory = (subcategoryId: string, parentCatId?: string) => {
        const targetId = parentCatId || targetParentCategory?.id;
        if (!targetId) return;
        const currentParent = categories.find((c) => c.id === targetId);
        if (!currentParent) return;

        const updatedSubList = (currentParent.subcategories || []).filter(
            (s) => s.id !== subcategoryId
        );

        const newCategories = categories.map((c) =>
            c.id === targetId ? { ...c, subcategories: updatedSubList } : c
        );

        onUpdateCategories(newCategories);
        onShowToast('Subcategory deleted');
    };

    const confirmDeleteSubcategory = (
        parentCat: FinanceCategory,
        subcat: FinanceSubcategory
    ) => {
        confirmDestructiveAction({
            title: 'Delete Subcategory',
            message: `Are you sure you want to delete "${subcat.name}" (${subcat.code})?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                handleDeleteSubcategory(subcat.id, parentCat.id);
            },
        });
    };

    const handleSubcategoryLongPress = (
        parentCat: FinanceCategory,
        subcat: FinanceSubcategory
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${subcat.name} (${subcat.code})`,
                    message: `Parent: ${parentCat.name} (${parentCat.code})`,
                    options: ['Cancel', 'Edit Subcategory', 'Delete Subcategory'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleOpenEditSubcategory(parentCat, subcat);
                    } else if (buttonIndex === 2) {
                        confirmDeleteSubcategory(parentCat, subcat);
                    }
                }
            );
        } else {
            Alert.alert(
                subcat.name,
                `${subcat.code} · ${parentCat.name}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit Subcategory',
                        onPress: () => handleOpenEditSubcategory(parentCat, subcat),
                    },
                    {
                        text: 'Delete Subcategory',
                        style: 'destructive',
                        onPress: () => confirmDeleteSubcategory(parentCat, subcat),
                    },
                ]
            );
        }
    };

    // Filter & Sort Logic
    const processedCategories = useMemo(() => {
        let list = categories.filter(cat => !cat.legacyValues || !!cat.legacyValues[workflow]).map(cat => ({ ...cat, subcategories: (cat.subcategories || []).filter(sub => !sub.legacyValues || !!sub.legacyValues[workflow]) }));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((cat) => {
                const nameMatch = cat.name.toLowerCase().includes(q);
                const codeMatch = (cat.code || '').toLowerCase().includes(q);
                const expMatch = (cat.defaultExpenseType || '').toLowerCase().includes(q);
                const resMatch = (cat.resourceMapping || '').toLowerCase().includes(q);
                const subMatch = (cat.subcategories || []).some(
                    (s) =>
                        s.name.toLowerCase().includes(q) ||
                        (s.code || '').toLowerCase().includes(q) ||
                        (s.defaultExpenseType || '').toLowerCase().includes(q) ||
                        (s.resourceMapping || '').toLowerCase().includes(q)
                );
                return nameMatch || codeMatch || expMatch || resMatch || subMatch;
            });
        }

        list.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const codeA = (a.code || '').toLowerCase();
            const codeB = (b.code || '').toLowerCase();
            const subCountA = a.subcategories?.length || 0;
            const subCountB = b.subcategories?.length || 0;

            if (sortIndex === 0) {
                return nameA.localeCompare(nameB);
            } else if (sortIndex === 1) {
                return nameB.localeCompare(nameA);
            } else if (sortIndex === 2) {
                return codeA.localeCompare(codeB);
            } else if (sortIndex === 3) {
                return subCountB - subCountA;
            }
            return 0;
        });

        return list;
    }, [categories, searchQuery, sortIndex, workflow]);

    return (
        <View style={s.container}>
            <FinanceWorkflowSegmentedPicker activeTab={workflow} onTabChange={setWorkflow} />
            {/* Search & Sort Bar (Borderless Pills + Native Menu Picker) */}
            <View style={s.filterRow}>
                {/* Search Input Box */}
                <View
                    style={[
                        s.searchBar,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                    <TextInput
                        style={[s.searchInput, { color: textColor }]}
                        placeholder="Search categories..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={15} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Native Variant Menu Sort Picker */}
                <SortMenuPicker
                    options={CATEGORY_SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx) => {
                        Haptics.selectionAsync();
                        setSortIndex(idx);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                />
            </View>

            {/* Categories List */}
            <View style={{ gap: 12 }}>
                {processedCategories.map((category) => {
                    const isExpanded = !!expandedCategoryIds[category.id];
                    const subCount = category.subcategories?.length || 0;
                    const subLabel = `${subCount} ${subCount === 1 ? 'subcategory' : 'subcategories'}`;

                    return (
                        <View key={category.id} style={s.categoryWrapper}>
                            {/* 1. Parent Card (Full Width) */}
                            <View
                                style={[
                                    s.parentCard,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isExpanded
                                            ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)')
                                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                                    },
                                ]}
                            >
                                {/* Top Row: Category Name + Subtitle on Left, Plain Chevron on Right */}
                                <View style={s.parentHeader}>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setEditingCategory(category);
                                            setIsEditCategoryOpen(true);
                                        }}
                                        onLongPress={() => handleCategoryLongPress(category)}
                                        delayLongPress={350}
                                        style={{ flex: 1 }}
                                    >
                                        <View style={s.titleRow}>
                                            <View style={s.codeBadge}>
                                                <Text style={s.codeBadgeText}>{category.code}</Text>
                                            </View>
                                            <Text style={[s.categoryNameText, { color: textColor }]} numberOfLines={1}>
                                                {category.name}
                                            </Text>
                                        </View>
                                        <Text style={[s.categoryStatsText, { color: subtextColor }]}>
                                            {subLabel}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Plain Chevron Button for Expand/Collapse */}
                                    <TouchableOpacity
                                        activeOpacity={0.6}
                                        onPress={() => toggleExpandCategory(category.id)}
                                        hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
                                        style={s.plainChevronBtn}
                                    >
                                        <PlatformIcon
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                            size={14}
                                            tintColor={subtextColor}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Plain Inline Category Mappings Preview without bold prefixes */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setEditingCategory(category);
                                        setIsEditCategoryOpen(true);
                                    }}
                                    onLongPress={() => handleCategoryLongPress(category)}
                                    delayLongPress={350}
                                    style={s.chainTextContainer}
                                >
                                    <Text style={[s.chainInlineText, { color: subtextColor }]} numberOfLines={1}>
                                        {category.defaultExpenseType || 'None'} · {category.resourceMapping || 'None'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 2. Inline Expanded Subcards (Tree Connector Pattern: 90% width, aligned right) */}
                            {isExpanded && (
                                <View style={s.expandedArea}>
                                    {/* Left Tree Connector Line */}
                                    <View
                                        style={[
                                            s.treeBranchLine,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.2)'
                                                    : 'rgba(0,0,0,0.18)',
                                            },
                                        ]}
                                    />

                                    {/* Subcards Container */}
                                    <View style={s.subcardsContainer}>
                                        {category.subcategories && category.subcategories.length > 0 ? (
                                             category.subcategories.map((sub) => {
                                                const effective = getEffectiveSubcategorySettings(category, sub);

                                                return (
                                                    <TouchableOpacity
                                                        key={sub.id}
                                                        activeOpacity={0.72}
                                                        onPress={() => handleOpenEditSubcategory(category, sub)}
                                                        onLongPress={() => handleSubcategoryLongPress(category, sub)}
                                                        delayLongPress={350}
                                                    >
                                                        <View
                                                            style={[
                                                                s.subcard,
                                                                {
                                                                    backgroundColor: isDark
                                                                        ? '#2C2C2E'
                                                                        : '#F8F9FA',
                                                                    borderWidth: 1,
                                                                    borderColor: isDark
                                                                        ? 'rgba(255,255,255,0.08)'
                                                                        : 'rgba(0,0,0,0.06)',
                                                                },
                                                            ]}
                                                        >
                                                            {/* Subcard Header: Code + Name */}
                                                            <View style={s.subcardHeader}>
                                                                <Text
                                                                    style={[s.subcardTitle, { color: textColor }]}
                                                                    numberOfLines={1}
                                                                >
                                                                    <Text style={[s.subcardCodePrefix, { color: textColor }]}>
                                                                        {sub.code} ·{' '}
                                                                    </Text>
                                                                    {sub.name}
                                                                </Text>
                                                            </View>

                                                            {/* Subcard Chain / Mapping Text */}
                                                            <View style={{ marginTop: 2 }}>
                                                                <Text
                                                                    style={[s.subcardChainText, { color: subtextColor }]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {effective.expenseType} · {effective.resourceMapping}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <View style={s.emptySubcardBox}>
                                                <Text style={[s.emptySubcardText, { color: subtextColor }]}>
                                                    No subcategories yet
                                                </Text>
                                            </View>
                                        )}

                                        {/* + Add Subcategory Button (Subtly distinct background from parent card) */}
                                        <TouchableOpacity
                                            style={[
                                                s.addSubcategoryBtn,
                                                {
                                                    backgroundColor: isDark
                                                        ? 'rgba(255,255,255,0.06)'
                                                        : 'rgba(0,0,0,0.035)',
                                                    borderColor: isDark
                                                        ? 'rgba(255,255,255,0.1)'
                                                        : 'rgba(0,0,0,0.08)',
                                                },
                                            ]}
                                            onPress={() => handleOpenAddSubcategory(category)}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon name="plus" size={13} tintColor={textColor} />
                                            <Text style={[s.addSubcategoryBtnText, { color: textColor }]}>
                                                Add Subcategory
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}

                {processedCategories.length === 0 && (
                    <View
                        style={[
                            s.emptyCard,
                            {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                    >
                        <PlatformIcon name="square.grid.2x2" size={28} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>
                            {searchQuery.trim() ? 'No Matching Categories' : 'No Categories'}
                        </Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No categories found matching "${searchQuery.trim()}".`
                                : 'Organize your financial transactions and documentation into custom categories.'}
                        </Text>
                        {searchQuery.trim() ? (
                            <TouchableOpacity
                                style={s.emptyActionBtn}
                                onPress={() => setSearchQuery('')}
                                activeOpacity={0.8}
                            >
                                <Text style={s.emptyActionBtnText}>Clear Search</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={s.emptyActionBtn}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsInternalAddCategoryOpen(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <PlatformIcon name="plus" size={13} tintColor="#FFFFFF" />
                                <Text style={s.emptyActionBtnText}>Create Category</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Resource Mapping Concise Guide Bottom Sheet */}
            <FinanceResourceMappingGuideSheet
                visible={isGuideSheetOpen}
                onClose={onCloseGuideSheet}
            />

            {/* Add / Edit Category Sheet */}
            <FinanceCategoryEditSheet
                visible={isAddCategorySheetOpen || isInternalAddCategoryOpen || isEditCategoryOpen}
                onClose={() => {
                    onCloseAddCategorySheet();
                    setIsInternalAddCategoryOpen(false);
                    setIsEditCategoryOpen(false);
                    setEditingCategory(null);
                }}
                category={editingCategory}
                existingCategories={categories}
                expenseTypesList={expenseTypesList}
                onSave={handleSaveCategory}
                onArchive={handleArchiveCategory}
                onDelete={handleDeleteCategory}
            />

            {/* Add / Edit Subcategory Sheet */}
            {targetParentCategory && (
                <FinanceSubcategoryEditSheet
                    visible={isSubcategorySheetOpen}
                    onClose={() => {
                        setIsSubcategorySheetOpen(false);
                        setEditingSubcategory(null);
                    }}
                    parentCategory={targetParentCategory}
                    subcategory={editingSubcategory}
                    expenseTypesList={expenseTypesList}
                    onSave={handleSaveSubcategory}
                    onArchive={handleArchiveSubcategory}
                    onDelete={(subId) => handleDeleteSubcategory(subId, targetParentCategory.id)}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        borderRadius: 21,
        borderWidth: 0,
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    emptyCard: {
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 36,
        paddingHorizontal: 24,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 320,
    },
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#159957',
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 999,
        marginTop: 10,
    },
    emptyActionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    categoryWrapper: {
        marginBottom: 2,
    },
    parentCard: {
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 6,
    },
    parentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    codeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    codeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563EB',
        letterSpacing: 0.3,
    },
    categoryNameText: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
        flex: 1,
    },
    categoryStatsText: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 3,
    },
    plainChevronBtn: {
        padding: 4,
        marginTop: 2,
    },
    chainTextContainer: {
        marginTop: 4,
    },
    chainInlineText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
    },
    expandedArea: {
        width: '90%',
        alignSelf: 'flex-end',
        marginTop: 10,
        position: 'relative',
    },
    treeBranchLine: {
        position: 'absolute',
        left: -14,
        top: 0,
        bottom: 16,
        width: 1.5,
        borderRadius: 1,
    },
    subcardsContainer: {
        gap: 8,
    },
    subcard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 2,
    },
    subcardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    subcardTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.2,
        flex: 1,
    },
    subcardCodePrefix: {
        fontWeight: '600',
        fontSize: 14,
    },
    subcardChainText: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    emptySubcardBox: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    emptySubcardText: {
        fontSize: 12.5,
        fontStyle: 'italic',
    },
    addSubcategoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 2,
    },
    addSubcategoryBtnText: {
        fontSize: 13.5,
        fontWeight: '500',
    },
});
