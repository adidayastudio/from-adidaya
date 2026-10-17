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
import {
    ItemMasterRecord,
    ItemVariant,
    ItemSku,
    UnmatchedItemCandidate,
} from '@/lib/api/resourcesItemMaster';
import {
    FinanceCategory,
    ResourceTypeOption,
} from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';
import { ItemMasterEditSheet } from './ItemMasterEditSheet';
import { VariantSkuEditSheet, VariantSkuMode } from './VariantSkuEditSheet';
import { ItemMasterDetailSheet } from './ItemMasterDetailSheet';
import { CandidateMatchingModal } from './CandidateMatchingModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ITEM_SORT_OPTIONS = [
    'Name (A to Z)',
    'Name (Z to A)',
    'Master Code',
    'Recently Updated',
    'Most SKUs',
];

const ITEM_FILTER_OPTIONS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Items' },
    { id: 'Material', label: 'MT - Material' },
    { id: 'Tools', label: 'TL - Tools' },
    { id: 'Assets', label: 'AS - Assets' },
    { id: 'Services', label: 'SV - Services' },
    { id: 'Candidates', label: 'Duplicates & Candidates' },
];

interface ResourcesItemMasterSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    items: ItemMasterRecord[];
    candidates: UnmatchedItemCandidate[];
    categories: FinanceCategory[];
    onUpdateItems: (items: ItemMasterRecord[]) => void;
    onUpdateCandidates: (candidates: UnmatchedItemCandidate[]) => void;
    isAddItemOpen: boolean;
    onCloseAddItem: () => void;
}

export function ResourcesItemMasterSection({
    isDark,
    textColor,
    subtextColor,
    items,
    candidates,
    categories,
    onUpdateItems,
    onUpdateCandidates,
    isAddItemOpen,
    onCloseAddItem,
}: ResourcesItemMasterSectionProps) {
    // Search, Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
    const [sortIndex, setSortIndex] = useState(0);

    // Detail Modal State
    const [detailItem, setDetailItem] = useState<ItemMasterRecord | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Edit Item Modal State
    const [editingItem, setEditingItem] = useState<ItemMasterRecord | null>(null);
    const [isEditItemOpen, setIsEditItemOpen] = useState(false);

    // Variant / SKU Modal State
    const [variantSkuMode, setVariantSkuMode] = useState<VariantSkuMode>('add_variant');
    const [targetItemForSku, setTargetItemForSku] = useState<ItemMasterRecord | null>(null);
    const [targetVariant, setTargetVariant] = useState<ItemVariant | null>(null);
    const [targetSku, setTargetSku] = useState<ItemSku | null>(null);
    const [isVariantSkuSheetOpen, setIsVariantSkuSheetOpen] = useState(false);

    // Candidate Matching Modal State
    const [selectedCandidate, setSelectedCandidate] = useState<UnmatchedItemCandidate | null>(null);
    const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

    // Filter & Sort Logic
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Resource Type Filter
        if (selectedFilter !== 'ALL' && selectedFilter !== 'Candidates') {
            result = result.filter((it) => it.resourceType === selectedFilter);
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (it) =>
                    it.name.toLowerCase().includes(q) ||
                    it.code.toLowerCase().includes(q) ||
                    it.categoryName.toLowerCase().includes(q) ||
                    (it.subcategoryName && it.subcategoryName.toLowerCase().includes(q)) ||
                    it.variants.some(
                        (v) =>
                            v.brandName.toLowerCase().includes(q) ||
                            v.skus.some((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
                    )
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sortIndex === 0) {
                return a.name.localeCompare(b.name);
            } else if (sortIndex === 1) {
                return b.name.localeCompare(a.name);
            } else if (sortIndex === 2) {
                return a.code.localeCompare(b.code, undefined, { numeric: true });
            } else if (sortIndex === 3) {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            } else if (sortIndex === 4) {
                const aSkus = a.variants.reduce((sum, v) => sum + v.skus.length, 0);
                const bSkus = b.variants.reduce((sum, v) => sum + v.skus.length, 0);
                return bSkus - aSkus;
            }
            return 0;
        });

        return result;
    }, [items, selectedFilter, searchQuery, sortIndex]);

    const filteredCandidates = useMemo(() => {
        if (!searchQuery.trim()) return candidates;
        const q = searchQuery.trim().toLowerCase();
        return candidates.filter(
            (c) =>
                c.rawName.toLowerCase().includes(q) ||
                c.sourceDocumentNumber.toLowerCase().includes(q)
        );
    }, [candidates, searchQuery]);

    // Item CRUD Handlers
    const handleSaveItem = (savedItem: ItemMasterRecord) => {
        const exists = items.some((i) => i.id === savedItem.id);
        let updated: ItemMasterRecord[];
        if (exists) {
            updated = items.map((i) => (i.id === savedItem.id ? savedItem : i));
        } else {
            updated = [savedItem, ...items];
        }
        onUpdateItems(updated);

        // Also update detail item if currently open
        if (detailItem?.id === savedItem.id) {
            setDetailItem(savedItem);
        }
    };

    const handleDeleteItem = (itemId: string) => {
        const updated = items.filter((i) => i.id !== itemId);
        onUpdateItems(updated);
        if (detailItem?.id === itemId) {
            setIsDetailOpen(false);
            setDetailItem(null);
        }
    };

    // Variant CRUD Handlers
    const handleSaveVariant = (savedVariant: ItemVariant) => {
        if (!targetItemForSku) return;

        const currentVariants = targetItemForSku.variants || [];
        const exists = currentVariants.some((v) => v.id === savedVariant.id);
        let newVariants: ItemVariant[];
        if (exists) {
            newVariants = currentVariants.map((v) => (v.id === savedVariant.id ? savedVariant : v));
        } else {
            newVariants = [...currentVariants, savedVariant];
        }

        const updatedItem: ItemMasterRecord = {
            ...targetItemForSku,
            variants: newVariants,
            updatedAt: new Date().toISOString(),
        };

        handleSaveItem(updatedItem);
    };

    const handleDeleteVariant = (variantId: string) => {
        if (!targetItemForSku) return;

        const newVariants = targetItemForSku.variants.filter((v) => v.id !== variantId);
        const updatedItem: ItemMasterRecord = {
            ...targetItemForSku,
            variants: newVariants,
            updatedAt: new Date().toISOString(),
        };

        handleSaveItem(updatedItem);
    };

    // SKU CRUD Handlers
    const handleSaveSku = (variantId: string, savedSku: ItemSku) => {
        if (!targetItemForSku) return;

        const newVariants = targetItemForSku.variants.map((v) => {
            if (v.id === variantId) {
                const currentSkus = v.skus || [];
                const exists = currentSkus.some((s) => s.id === savedSku.id);
                let newSkus: ItemSku[];
                if (exists) {
                    newSkus = currentSkus.map((s) => (s.id === savedSku.id ? savedSku : s));
                } else {
                    newSkus = [...currentSkus, savedSku];
                }
                return { ...v, skus: newSkus };
            }
            return v;
        });

        const updatedItem: ItemMasterRecord = {
            ...targetItemForSku,
            variants: newVariants,
            updatedAt: new Date().toISOString(),
        };

        handleSaveItem(updatedItem);
    };

    const handleDeleteSku = (variantId: string, skuId: string) => {
        if (!targetItemForSku) return;

        const newVariants = targetItemForSku.variants.map((v) => {
            if (v.id === variantId) {
                const newSkus = v.skus.filter((s) => s.id !== skuId);
                return { ...v, skus: newSkus };
            }
            return v;
        });

        const updatedItem: ItemMasterRecord = {
            ...targetItemForSku,
            variants: newVariants,
            updatedAt: new Date().toISOString(),
        };

        handleSaveItem(updatedItem);
    };

    // Candidate Normalization Handlers
    const handleMatchCandidateToExisting = (
        candidateId: string,
        masterId: string,
        variantId?: string,
        skuId?: string
    ) => {
        const updated = candidates.filter((c) => c.id !== candidateId);
        onUpdateCandidates(updated);
    };

    const handleCreateNewFromCandidate = (candidate: UnmatchedItemCandidate) => {
        const updated = candidates.filter((c) => c.id !== candidate.id);
        onUpdateCandidates(updated);

        const newItem: ItemMasterRecord = {
            id: `item-${Date.now()}`,
            name: candidate.rawName,
            code: `MT-0${items.length + 1}010100`,
            resourceType: 'Material',
            categoryId: categories[0]?.id || '',
            categoryName: categories[0]?.name || 'Building Materials',
            standardUnit: 'unit',
            variants: [],
            active: true,
            updatedAt: new Date().toISOString(),
        };
        setEditingItem(newItem);
        setIsEditItemOpen(true);
    };

    const handleIgnoreCandidate = (candidateId: string) => {
        const updated = candidates.filter((c) => c.id !== candidateId);
        onUpdateCandidates(updated);
    };

    // Filter Menu Actions (Single line compact)
    const filterActions: ContextMenuAction[] = useMemo(() => {
        return ITEM_FILTER_OPTIONS.map((opt) => ({
            title: opt.id === 'Candidates' && candidates.length > 0 ? `${opt.label} (${candidates.length})` : opt.label,
            state: selectedFilter === opt.id ? 'on' : 'off',
        }));
    }, [selectedFilter, candidates.length]);

    const isShowingCandidates = selectedFilter === 'Candidates';

    return (
        <View style={s.container}>
            {/* Exactly 1 Single-Row Toolbar (Matching Classification): Search + Sort + Filter */}
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
                        placeholder="Search items, brands, SKUs..."
                        placeholderTextColor={subtextColor}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                </View>

                {/* 2. Sort Dropdown */}
                <SortMenuPicker
                    options={ITEM_SORT_OPTIONS}
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
                        const opt = ITEM_FILTER_OPTIONS[e.nativeEvent.index];
                        if (opt) setSelectedFilter(opt.id);
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
                            tintColor={selectedFilter !== 'ALL' ? '#007AFF' : subtextColor}
                        />
                        <Text
                            style={[
                                s.filterMenuText,
                                {
                                    color: selectedFilter !== 'ALL' ? '#007AFF' : textColor,
                                    fontWeight: selectedFilter !== 'ALL' ? '600' : '500',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {selectedFilter === 'ALL'
                                ? 'Filter'
                                : selectedFilter === 'Candidates'
                                ? `Duplicates (${candidates.length})`
                                : selectedFilter}
                        </Text>
                    </View>
                </ContextMenu>
            </View>

            {/* Content List */}
            {isShowingCandidates ? (
                <View style={s.cardsWrapper}>
                    {filteredCandidates.length === 0 ? (
                        <View
                            style={[
                                s.emptyCard,
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                            ]}
                        >
                            <PlatformIcon name="checkmark.seal.fill" size={30} tintColor="#34C759" />
                            <Text style={[s.emptyTitle, { color: textColor }]}>No Duplicate Candidates</Text>
                            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                                All Finance items have been matched with Master records.
                            </Text>
                        </View>
                    ) : (
                        filteredCandidates.map((cand) => (
                            <TouchableOpacity
                                key={cand.id}
                                style={[
                                    s.cleanCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setSelectedCandidate(cand);
                                    setIsCandidateModalOpen(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={s.candidateHeaderRow}>
                                    <View style={[s.sourceTag, { backgroundColor: isDark ? 'rgba(255,149,0,0.12)' : '#FFF3E0' }]}>
                                        <PlatformIcon name="doc.text.fill" size={11} tintColor="#FF9500" />
                                        <Text style={s.sourceTagText}>{cand.sourceTransactionType}</Text>
                                    </View>
                                    <Text style={[s.candDocText, { color: subtextColor }]}>
                                        {cand.sourceDocumentNumber} · {cand.sourceDate}
                                    </Text>
                                </View>

                                <Text style={[s.cardItemName, { color: textColor }]}>"{cand.rawName}"</Text>

                                {/* Inner Subcard for suggested match */}
                                <View
                                    style={[
                                        s.innerSubcard,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB' },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.suggestMatchLabel, { color: subtextColor }]}>Suggested Master</Text>
                                        <Text style={[s.suggestMatchValue, { color: textColor }]} numberOfLines={1}>
                                            {items.find((i) => i.id === cand.suggestedMasterId)?.name || 'Matching Item Master'}
                                        </Text>
                                    </View>
                                    <View style={[s.matchBtn, { backgroundColor: '#007AFF' }]}>
                                        <Text style={s.matchBtnText}>Review</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            ) : (
                /* Item Master List with Inset Subcards */
                <View style={s.cardsWrapper}>
                    {filteredItems.length === 0 ? (
                        <View
                            style={[
                                s.emptyCard,
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                            ]}
                        >
                            <PlatformIcon name="shippingbox" size={30} tintColor={subtextColor} />
                            <Text style={[s.emptyTitle, { color: textColor }]}>No Item Masters Found</Text>
                            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                                {searchQuery.trim()
                                    ? `No items match "${searchQuery}".`
                                    : 'Tap + in the top bar to add your first Item Master.'}
                            </Text>
                        </View>
                    ) : (
                        filteredItems.map((item) => {
                            const badgeMeta = getResourceBadgeMeta(item.resourceType);
                            const brandCount = item.variants?.length || 0;
                            const skuCount = item.variants?.reduce((acc, v) => acc + (v.skus?.length || 0), 0) || 0;
                            const brandNames = item.variants?.map((v) => v.brandName).join(', ');

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        s.cleanCard,
                                        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                        !item.active && { opacity: 0.6 },
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setDetailItem(item);
                                        setIsDetailOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Top Row: Item Name + Resource Type Pill + Chevron */}
                                    <View style={s.cardTopRow}>
                                        <Text style={[s.cardItemName, { color: textColor }]} numberOfLines={1}>
                                            {item.name}
                                        </Text>

                                        <View style={s.cardRightPillCol}>
                                            <View
                                                style={[
                                                    s.resourcePill,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                                ]}
                                            >
                                                <PlatformIcon
                                                    name={badgeMeta.icon as any}
                                                    size={11.5}
                                                    tintColor={badgeMeta.iconColor}
                                                />
                                                <Text style={[s.resourcePillText, { color: textColor }]}>
                                                    {badgeMeta.label}
                                                </Text>
                                            </View>
                                            <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                        </View>
                                    </View>

                                    {/* Inset Subcard Inside Item Card */}
                                    <View
                                        style={[
                                            s.innerSubcard,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB' },
                                        ]}
                                    >
                                        <View style={s.subcardRow}>
                                            <Text style={[s.subcardCategoryPath, { color: subtextColor }]} numberOfLines={1}>
                                                {item.categoryName} {item.subcategoryName ? `· ${item.subcategoryName}` : ''}
                                            </Text>
                                            <Text style={[s.subcardCode, { color: subtextColor }]}>
                                                {item.code}
                                            </Text>
                                        </View>

                                        <View style={s.subcardRow}>
                                            <Text style={[s.subcardHierarchy, { color: textColor }]} numberOfLines={1}>
                                                <Text style={{ fontWeight: '600' }}>{brandCount} {brandCount === 1 ? 'brand' : 'brands'}</Text>
                                                {brandNames ? ` (${brandNames})` : ''} · <Text style={{ fontWeight: '600' }}>{skuCount} {skuCount === 1 ? 'SKU' : 'SKUs'}</Text>
                                            </Text>
                                            <Text style={[s.subcardUnit, { color: subtextColor }]}>
                                                {item.standardUnit}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            )}

            {/* Modal Sheets */}

            {/* 1. Add / Edit Item Master Sheet */}
            <ItemMasterEditSheet
                visible={isAddItemOpen || isEditItemOpen}
                onClose={() => {
                    if (isAddItemOpen) onCloseAddItem();
                    if (isEditItemOpen) setIsEditItemOpen(false);
                    setEditingItem(null);
                }}
                item={editingItem}
                existingItems={items}
                categories={categories}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
            />

            {/* 2. Dedicated Item Detail Sheet with SwiftUI Section Form and Inset Subcards */}
            <ItemMasterDetailSheet
                visible={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setDetailItem(null);
                }}
                item={detailItem}
                onEditItem={(it) => {
                    setEditingItem(it);
                    setIsEditItemOpen(true);
                }}
                onAddVariant={(it) => {
                    setTargetItemForSku(it);
                    setTargetVariant(null);
                    setVariantSkuMode('add_variant');
                    setIsVariantSkuSheetOpen(true);
                }}
                onEditVariant={(it, v) => {
                    setTargetItemForSku(it);
                    setTargetVariant(v);
                    setVariantSkuMode('edit_variant');
                    setIsVariantSkuSheetOpen(true);
                }}
                onAddSku={(it, v) => {
                    setTargetItemForSku(it);
                    setTargetVariant(v);
                    setTargetSku(null);
                    setVariantSkuMode('add_sku');
                    setIsVariantSkuSheetOpen(true);
                }}
                onEditSku={(it, v, s) => {
                    setTargetItemForSku(it);
                    setTargetVariant(v);
                    setTargetSku(s);
                    setVariantSkuMode('edit_sku');
                    setIsVariantSkuSheetOpen(true);
                }}
            />

            {/* 3. Variant / SKU Edit Sheet */}
            <VariantSkuEditSheet
                visible={isVariantSkuSheetOpen}
                onClose={() => {
                    setIsVariantSkuSheetOpen(false);
                    setTargetVariant(null);
                    setTargetSku(null);
                }}
                mode={variantSkuMode}
                item={targetItemForSku}
                variant={targetVariant}
                sku={targetSku}
                onSaveVariant={handleSaveVariant}
                onDeleteVariant={handleDeleteVariant}
                onSaveSku={handleSaveSku}
                onDeleteSku={handleDeleteSku}
            />

            {/* 4. Candidate Matching Modal */}
            <CandidateMatchingModal
                visible={isCandidateModalOpen}
                onClose={() => {
                    setIsCandidateModalOpen(false);
                    setSelectedCandidate(null);
                }}
                candidate={selectedCandidate}
                itemMasters={items}
                onMatchExisting={handleMatchCandidateToExisting}
                onCreateNewFromCandidate={handleCreateNewFromCandidate}
                onIgnoreCandidate={handleIgnoreCandidate}
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
        padding: 14,
        gap: 10,
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
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cardItemName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardRightPillCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resourcePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    resourcePillText: {
        fontSize: 12,
        fontWeight: '500',
    },
    innerSubcard: {
        borderRadius: 12,
        padding: 10,
        gap: 6,
    },
    subcardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    subcardCategoryPath: {
        fontSize: 12.5,
        flex: 1,
    },
    subcardCode: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '500',
    },
    subcardHierarchy: {
        fontSize: 13,
        flex: 1,
    },
    subcardUnit: {
        fontSize: 12,
        fontWeight: '500',
    },
    candidateHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sourceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 3,
    },
    sourceTagText: {
        color: '#FF9500',
        fontSize: 11,
        fontWeight: '600',
    },
    candDocText: {
        fontSize: 12,
    },
    suggestMatchLabel: {
        fontSize: 11,
    },
    suggestMatchValue: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 1,
    },
    matchBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    matchBtnText: {
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: '600',
    },
    emptyCard: {
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280,
    },
});
