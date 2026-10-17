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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import {
    FinanceCategory,
    FinanceSubcategory,
    ResourceTypeOption,
    getEffectiveSubcategorySettings,
} from '@/lib/api/financeSetup';
import { ResourceCategoryEditSheet } from './ResourceCategoryEditSheet';
import { ResourceSubcategoryEditSheet } from './ResourceSubcategoryEditSheet';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_SORT_OPTIONS = [
    'Sequence Code',
    'Name (A to Z)',
    'Name (Z to A)',
    'Subcategories Count',
];

const RESOURCE_TYPE_FILTER_OPTIONS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Types' },
    { id: 'Material', label: 'MT - Material' },
    { id: 'Tools', label: 'TL - Tools' },
    { id: 'Assets', label: 'AS - Assets' },
    { id: 'Services', label: 'SV - Services' },
    { id: 'None', label: 'None - Finance Only' },
];

export function getResourceBadgeMeta(type: ResourceTypeOption | string): { iconColor: string; label: string; icon: string } {
    switch (type) {
        case 'Material':
            return { iconColor: '#007AFF', label: 'Material', icon: 'shippingbox.fill' };
        case 'Tools':
            return { iconColor: '#FF9500', label: 'Tools', icon: 'hammer.fill' };
        case 'Assets':
            return { iconColor: '#5856D6', label: 'Assets', icon: 'car.fill' };
        case 'Services':
            return { iconColor: '#00C7BE', label: 'Services', icon: 'briefcase.fill' };
        case 'None':
        default:
            return { iconColor: '#8E8E93', label: 'Finance Only', icon: 'minus.circle.fill' };
    }
}

interface ResourcesClassificationSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    categories: FinanceCategory[];
    onUpdateCategories: (categories: FinanceCategory[]) => void;
    isAddCategoryOpen: boolean;
    onCloseAddCategory: () => void;
}

export function ResourcesClassificationSection({
    isDark,
    textColor,
    subtextColor,
    categories,
    onUpdateCategories,
    isAddCategoryOpen,
    onCloseAddCategory,
}: ResourcesClassificationSectionProps) {
    // Search, Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
    const [sortIndex, setSortIndex] = useState(0);

    // Expand category accordion state
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({
        [categories[0]?.id || '']: true, // First category open by default
    });

    // Category Edit Sheet State
    const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
    const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);

    // Subcategory Edit Sheet State
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

    // Category CRUD
    const handleSaveCategory = (updatedCat: FinanceCategory) => {
        const exists = categories.some((c) => c.id === updatedCat.id);
        let newCategories: FinanceCategory[];
        if (exists) {
            newCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
        } else {
            newCategories = [...categories, updatedCat];
        }
        onUpdateCategories(newCategories);
    };

    const handleArchiveCategory = (categoryId: string) => {
        const target = categories.find((c) => c.id === categoryId);
        if (!target) return;

        const updated: FinanceCategory = {
            ...target,
            isArchived: !target.isArchived,
        };
        const newCategories = categories.map((c) => (c.id === categoryId ? updated : c));
        onUpdateCategories(newCategories);
    };

    // Subcategory CRUD
    const handleSaveSubcategory = (updatedSub: FinanceSubcategory) => {
        if (!targetParentCategory) return;

        const currentSubs = targetParentCategory.subcategories || [];
        const exists = currentSubs.some((s) => s.id === updatedSub.id);

        let newSubs: FinanceSubcategory[];
        if (exists) {
            newSubs = currentSubs.map((s) => (s.id === updatedSub.id ? updatedSub : s));
        } else {
            newSubs = [...currentSubs, updatedSub];
        }

        const updatedCat: FinanceCategory = {
            ...targetParentCategory,
            subcategories: newSubs,
        };

        const newCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
        onUpdateCategories(newCategories);
        setTargetParentCategory(updatedCat);
    };

    const handleArchiveSubcategory = (subId: string) => {
        if (!targetParentCategory) return;

        const newSubs = targetParentCategory.subcategories.map((s) => {
            if (s.id === subId) {
                return { ...s, isArchived: !s.isArchived };
            }
            return s;
        });

        const updatedCat: FinanceCategory = {
            ...targetParentCategory,
            subcategories: newSubs,
        };

        const newCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
        onUpdateCategories(newCategories);
        setTargetParentCategory(updatedCat);
    };

    // Context Menu Filter Actions (Compact single line without subtitle)
    const filterActions: ContextMenuAction[] = useMemo(() => {
        return RESOURCE_TYPE_FILTER_OPTIONS.map((opt) => ({
            title: opt.label,
            state: selectedTypeFilter === opt.id ? 'on' : 'off',
        }));
    }, [selectedTypeFilter]);

    // Filtered & Sorted categories
    const filteredCategories = useMemo(() => {
        let result = [...categories];

        // Resource Type Filter
        if (selectedTypeFilter !== 'ALL') {
            result = result.filter((cat) => cat.resourceMapping === selectedTypeFilter);
        }

        // Search Query Filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (cat) =>
                    cat.name.toLowerCase().includes(q) ||
                    cat.code.toLowerCase().includes(q) ||
                    cat.subcategories.some(
                        (sub) => sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q)
                    )
            );
        }

        // Sorting
        result.sort((a, b) => {
            if (sortIndex === 0) {
                return a.code.localeCompare(b.code, undefined, { numeric: true });
            } else if (sortIndex === 1) {
                return a.name.localeCompare(b.name);
            } else if (sortIndex === 2) {
                return b.name.localeCompare(a.name);
            } else if (sortIndex === 3) {
                return (b.subcategories?.length || 0) - (a.subcategories?.length || 0);
            }
            return 0;
        });

        return result;
    }, [categories, selectedTypeFilter, searchQuery, sortIndex]);

    return (
        <View style={s.container}>
            {/* 3 Toolbar Elements: Search + Sort + Filter (Equal Height) */}
            <View style={s.searchSortRow}>
                {/* 1. Search Bar */}
                <View
                    style={[
                        s.searchPill,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(255,255,255,0.92)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={13.5} tintColor={subtextColor} />
                    <TextInput
                        style={[s.searchInput, { color: textColor }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search categories..."
                        placeholderTextColor={subtextColor}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                </View>

                {/* 2. Sort Dropdown */}
                <SortMenuPicker
                    options={CATEGORY_SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx) => {
                        Haptics.selectionAsync();
                        setSortIndex(idx);
                    }}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    isDark={isDark}
                />

                {/* 3. Filter Dropdown */}
                <ContextMenu
                    actions={filterActions}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        const index = e.nativeEvent.index;
                        const keys = ['ALL', 'Material', 'Tools', 'Assets', 'Services', 'None'];
                        setSelectedTypeFilter(keys[index] || 'ALL');
                    }}
                >
                    <View
                        style={[
                            s.filterMenuBtn,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(255,255,255,0.92)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name="line.3.horizontal.decrease.circle"
                            size={14}
                            tintColor={selectedTypeFilter !== 'ALL' ? '#007AFF' : subtextColor}
                        />
                        <Text
                            style={[
                                s.filterMenuText,
                                {
                                    color: selectedTypeFilter !== 'ALL' ? '#007AFF' : textColor,
                                    fontWeight: selectedTypeFilter !== 'ALL' ? '600' : '500',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {selectedTypeFilter === 'ALL'
                                ? 'Filter'
                                : selectedTypeFilter === 'None'
                                ? 'Finance Only'
                                : selectedTypeFilter}
                        </Text>
                    </View>
                </ContextMenu>
            </View>

            {/* Clean White Cards without Border */}
            <View style={s.cardsWrapper}>
                {filteredCategories.length === 0 ? (
                    <View
                        style={[
                            s.emptyCard,
                            {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            },
                        ]}
                    >
                        <PlatformIcon name="folder.badge.questionmark" size={30} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>No Categories Found</Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No classification matches "${searchQuery}".`
                                : 'No categories found for the selected filter.'}
                        </Text>
                    </View>
                ) : (
                    filteredCategories.map((category, catIdx) => {
                        const isExpanded = !!expandedCategoryIds[category.id];
                        const badgeMeta = getResourceBadgeMeta(category.resourceMapping);
                        const subCount = category.subcategories?.length || 0;
                        const formattedSeqCode = category.code.length <= 2 
                            ? category.code.padStart(2, '0') 
                            : String(catIdx + 1).padStart(2, '0');

                        return (
                            <View
                                key={category.id}
                                style={[
                                    s.cleanCard,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    },
                                    category.isArchived && { opacity: 0.6 },
                                ]}
                            >
                                {/* Category Header */}
                                <TouchableOpacity
                                    style={s.cardHeaderRow}
                                    onPress={() => toggleExpandCategory(category.id)}
                                    activeOpacity={0.7}
                                >
                                    {/* 2-Digit Sequence Code */}
                                    <View
                                        style={[
                                            s.codeBox,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.codeBoxText, { color: textColor }]}>
                                            {formattedSeqCode}
                                        </Text>
                                    </View>

                                    {/* Title & Subtitle */}
                                    <View style={s.cardHeaderTitleCol}>
                                        <View style={s.titleRow}>
                                            <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                                {category.name}
                                            </Text>
                                            {category.isArchived && (
                                                <View style={s.archivedTag}>
                                                    <Text style={s.archivedTagText}>Archived</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[s.cardSubtitle, { color: subtextColor }]}>
                                            {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
                                        </Text>
                                    </View>

                                    {/* Mapping Pill & Chevron */}
                                    <View style={s.cardHeaderRightCol}>
                                        <View
                                            style={[
                                                s.mappingPill,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                            ]}
                                        >
                                            <PlatformIcon
                                                name={badgeMeta.icon as any}
                                                size={11.5}
                                                tintColor={badgeMeta.iconColor}
                                            />
                                            <Text style={[s.mappingPillText, { color: textColor }]}>
                                                {badgeMeta.label}
                                            </Text>
                                        </View>
                                        <PlatformIcon
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                            size={13}
                                            tintColor={subtextColor}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <View style={s.expandedContent}>
                                        <View style={[s.cardDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} />

                                        {/* Subcategories Container */}
                                        {category.subcategories && category.subcategories.length > 0 ? (
                                            <View style={[s.subsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB' }]}>
                                                {category.subcategories.map((sub, subIdx) => {
                                                    const effSettings = getEffectiveSubcategorySettings(category, sub);
                                                    const subBadgeMeta = getResourceBadgeMeta(effSettings.resourceMapping);
                                                    const formattedSubSeq = sub.code.length <= 2 
                                                        ? sub.code.padStart(2, '0') 
                                                        : String(subIdx + 1).padStart(2, '0');

                                                    return (
                                                        <TouchableOpacity
                                                            key={sub.id}
                                                            style={[
                                                                s.subRow,
                                                                subIdx > 0 && [
                                                                    s.subBorderTop,
                                                                    {
                                                                        borderTopColor: isDark
                                                                            ? 'rgba(255,255,255,0.05)'
                                                                            : 'rgba(0,0,0,0.04)',
                                                                    },
                                                                ],
                                                                sub.isArchived && { opacity: 0.5 },
                                                            ]}
                                                            onPress={() => {
                                                                Haptics.selectionAsync();
                                                                setTargetParentCategory(category);
                                                                setEditingSubcategory(sub);
                                                                setIsSubcategorySheetOpen(true);
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={[s.subCodeText, { color: subtextColor }]}>
                                                                {formattedSubSeq}
                                                            </Text>

                                                            <View style={s.subNameCol}>
                                                                <Text style={[s.subName, { color: textColor }]} numberOfLines={1}>
                                                                    {sub.name}
                                                                </Text>
                                                            </View>

                                                            <View
                                                                style={[
                                                                    s.subMappingPill,
                                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' },
                                                                ]}
                                                            >
                                                                <PlatformIcon
                                                                    name={subBadgeMeta.icon as any}
                                                                    size={10.5}
                                                                    tintColor={subBadgeMeta.iconColor}
                                                                />
                                                                <Text style={[s.subMappingPillText, { color: subtextColor }]}>
                                                                    {subBadgeMeta.label}
                                                                </Text>
                                                            </View>

                                                            <PlatformIcon name="chevron.right" size={11} tintColor={subtextColor} />
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <View style={s.emptySubsBox}>
                                                <Text style={[s.emptySubsText, { color: subtextColor }]}>
                                                    No subcategories yet.
                                                </Text>
                                            </View>
                                        )}

                                        {/* Actions Row at Bottom with SwiftUI Bouncy Glass Buttons */}
                                        <View style={s.actionRowBottom}>
                                            <BouncyGlassButton
                                                isDark={isDark}
                                                isPill={true}
                                                isGlass={true}
                                                onPress={() => {
                                                    setEditingCategory(category);
                                                    setIsEditCategoryOpen(true);
                                                }}
                                                style={s.subtleActionBtn}
                                            >
                                                <PlatformIcon name="pencil" size={13} tintColor="#007AFF" />
                                                <Text style={s.subtleActionText}>Edit</Text>
                                            </BouncyGlassButton>

                                            <BouncyGlassButton
                                                isDark={isDark}
                                                isPill={true}
                                                isGlass={true}
                                                onPress={() => {
                                                    setTargetParentCategory(category);
                                                    setEditingSubcategory(null);
                                                    setIsSubcategorySheetOpen(true);
                                                }}
                                                style={s.primaryPillBtn}
                                            >
                                                <PlatformIcon name="plus" size={13} tintColor="#007AFF" />
                                                <Text style={s.primaryPillText}>Add Subcategory</Text>
                                            </BouncyGlassButton>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </View>

            {/* Category Add/Edit Modal Sheet */}
            <ResourceCategoryEditSheet
                visible={isAddCategoryOpen || isEditCategoryOpen}
                onClose={() => {
                    onCloseAddCategory();
                    setIsEditCategoryOpen(false);
                    setEditingCategory(null);
                }}
                category={isEditCategoryOpen ? editingCategory : null}
                existingCategories={categories}
                onSave={handleSaveCategory}
                onArchive={handleArchiveCategory}
            />

            {/* Subcategory Add/Edit Modal Sheet */}
            <ResourceSubcategoryEditSheet
                visible={isSubcategorySheetOpen}
                onClose={() => {
                    setIsSubcategorySheetOpen(false);
                    setEditingSubcategory(null);
                }}
                parentCategory={targetParentCategory}
                subcategory={editingSubcategory}
                onSave={handleSaveSubcategory}
                onArchive={handleArchiveSubcategory}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    searchSortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        paddingHorizontal: 12,
        gap: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        padding: 0,
    },
    filterMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 19,
        gap: 6,
    },
    filterMenuText: {
        fontSize: 13,
    },
    cardsWrapper: {
        gap: 10,
        marginTop: 2,
    },
    cleanCard: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    codeBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeBoxText: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    cardHeaderTitleCol: {
        flex: 1,
        gap: 2,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 12,
    },
    archivedTag: {
        backgroundColor: 'rgba(255,59,48,0.12)',
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    archivedTagText: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#FF3B30',
    },
    cardHeaderRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mappingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4.5,
        borderRadius: 8,
        gap: 5,
    },
    mappingPillText: {
        fontSize: 12,
        fontWeight: '500',
    },
    expandedContent: {
        paddingBottom: 10,
    },
    cardDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginBottom: 8,
    },
    actionRowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 2,
        gap: 8,
    },
    subtleActionBtn: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    subtleActionText: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#007AFF',
    },
    primaryPillBtn: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    primaryPillText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#007AFF',
    },
    subsContainer: {
        marginHorizontal: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    subBorderTop: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    subCodeText: {
        fontSize: 12,
        fontWeight: '600',
        width: 20,
    },
    subNameCol: {
        flex: 1,
    },
    subName: {
        fontSize: 13.5,
        fontWeight: '500',
    },
    subMappingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    subMappingPillText: {
        fontSize: 11,
        fontWeight: '500',
    },
    emptySubsBox: {
        padding: 12,
        alignItems: 'center',
    },
    emptySubsText: {
        fontSize: 12,
    },
    emptyCard: {
        borderRadius: 16,
        padding: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 12.5,
        textAlign: 'center',
    },
});
