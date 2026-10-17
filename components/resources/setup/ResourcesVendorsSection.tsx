import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    VendorMasterRecord,
} from '@/lib/api/resourcesVendors';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';
import { VendorEditSheet } from './VendorEditSheet';
import { VendorDetailSheet } from './VendorDetailSheet';

const VENDOR_SORT_OPTIONS = [
    'Name (A to Z)',
    'Name (Z to A)',
    'Vendor Code',
    'Most Receivings',
    'Recently Updated',
];

const VENDOR_FILTER_OPTIONS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Vendors' },
    { id: 'Preferred', label: 'Preferred Only' },
    { id: 'Material', label: 'MT - Material' },
    { id: 'Tools', label: 'TL - Tools' },
    { id: 'Assets', label: 'AS - Assets' },
    { id: 'Services', label: 'SV - Services' },
];

interface ResourcesVendorsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    vendors: VendorMasterRecord[];
    onUpdateVendors: (vendors: VendorMasterRecord[]) => void;
    isAddVendorOpen: boolean;
    onCloseAddVendor: () => void;
}

export function ResourcesVendorsSection({
    isDark,
    textColor,
    subtextColor,
    vendors,
    onUpdateVendors,
    isAddVendorOpen,
    onCloseAddVendor,
}: ResourcesVendorsSectionProps) {
    // Search, Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
    const [sortIndex, setSortIndex] = useState(0);

    // Detail & Edit Sheet States
    const [detailVendor, setDetailVendor] = useState<VendorMasterRecord | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const [editingVendor, setEditingVendor] = useState<VendorMasterRecord | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Filter & Sort Logic
    const filteredVendors = useMemo(() => {
        let result = [...vendors];

        // Filter selection
        if (selectedFilter === 'Preferred') {
            result = result.filter((v) => v.isPreferred);
        } else if (selectedFilter !== 'ALL') {
            result = result.filter((v) => v.resourceTypes.includes(selectedFilter as any));
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (v) =>
                    v.name.toLowerCase().includes(q) ||
                    v.code.toLowerCase().includes(q) ||
                    (v.city && v.city.toLowerCase().includes(q)) ||
                    (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
                    v.categoriesSupplied.some((c) => c.toLowerCase().includes(q)) ||
                    (v.brandsSupplied && v.brandsSupplied.some((b) => b.toLowerCase().includes(q)))
            );
        }

        // Sorting
        result.sort((a, b) => {
            if (sortIndex === 0) {
                return a.name.localeCompare(b.name);
            } else if (sortIndex === 1) {
                return b.name.localeCompare(a.name);
            } else if (sortIndex === 2) {
                return a.code.localeCompare(b.code, undefined, { numeric: true });
            } else if (sortIndex === 3) {
                return (b.historySummary?.totalReceivings || 0) - (a.historySummary?.totalReceivings || 0);
            } else if (sortIndex === 4) {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return 0;
        });

        return result;
    }, [vendors, selectedFilter, searchQuery, sortIndex]);

    // Vendor CRUD Handlers
    const handleSaveVendor = (savedVendor: VendorMasterRecord) => {
        const exists = vendors.some((v) => v.id === savedVendor.id);
        let updated: VendorMasterRecord[];
        if (exists) {
            updated = vendors.map((v) => (v.id === savedVendor.id ? savedVendor : v));
        } else {
            updated = [savedVendor, ...vendors];
        }
        onUpdateVendors(updated);

        if (detailVendor?.id === savedVendor.id) {
            setDetailVendor(savedVendor);
        }
    };

    const handleDeleteVendor = (vendorId: string) => {
        const updated = vendors.filter((v) => v.id !== vendorId);
        onUpdateVendors(updated);
        if (detailVendor?.id === vendorId) {
            setIsDetailOpen(false);
            setDetailVendor(null);
        }
    };

    // Filter Actions
    const filterActions: ContextMenuAction[] = useMemo(() => {
        return VENDOR_FILTER_OPTIONS.map((opt) => ({
            title: opt.label,
            state: selectedFilter === opt.id ? 'on' : 'off',
        }));
    }, [selectedFilter]);

    return (
        <View style={s.container}>
            {/* 1-Row Toolbar (Matching Classification & Item Master) */}
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
                        placeholder="Search vendors, contacts, brands..."
                        placeholderTextColor={subtextColor}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                </View>

                {/* 2. Sort Dropdown */}
                <SortMenuPicker
                    options={VENDOR_SORT_OPTIONS}
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
                        const opt = VENDOR_FILTER_OPTIONS[e.nativeEvent.index];
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
                                : selectedFilter === 'Preferred'
                                ? 'Preferred'
                                : selectedFilter}
                        </Text>
                    </View>
                </ContextMenu>
            </View>

            {/* Clean White Cards without Border */}
            <View style={s.cardsWrapper}>
                {filteredVendors.length === 0 ? (
                    <View
                        style={[
                            s.emptyCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <PlatformIcon name="person.2.slash" size={30} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>No Vendors Found</Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No vendor matches "${searchQuery}".`
                                : 'Tap + in the top bar to add your first Vendor.'}
                        </Text>
                    </View>
                ) : (
                    filteredVendors.map((vendor) => {
                        return (
                            <TouchableOpacity
                                key={vendor.id}
                                style={[
                                    s.cleanCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                    !vendor.active && { opacity: 0.6 },
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setDetailVendor(vendor);
                                    setIsDetailOpen(true);
                                }}
                                activeOpacity={0.7}
                            >
                                {/* Top Row: Name + Preferred Star + Resource Pills + Chevron */}
                                <View style={s.cardTopRow}>
                                    <View style={s.cardTitleCol}>
                                        <View style={s.nameStarRow}>
                                            <Text style={[s.cardVendorName, { color: textColor }]} numberOfLines={1}>
                                                {vendor.name}
                                            </Text>
                                            {vendor.isPreferred && (
                                                <PlatformIcon name="star.fill" size={11} tintColor="#FF9500" />
                                            )}
                                        </View>

                                        {/* Subtitle: categories & supplied scope */}
                                        <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {vendor.vendorType} · {vendor.categoriesSupplied?.join(', ') || 'General Supply'}
                                            {vendor.brandsSupplied && vendor.brandsSupplied.length > 0 ? ` · ${vendor.brandsSupplied.join(', ')}` : ''}
                                        </Text>

                                        {/* Secondary Subtitle: Location / City */}
                                        {vendor.city && (
                                            <Text style={[s.cardLocationSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                                {vendor.city}{vendor.resourceLocationLink ? ` · ${vendor.resourceLocationLink}` : ''}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Right Col: Resource Pills & Chevron */}
                                    <View style={s.cardRightCol}>
                                        <View style={s.pillsGroup}>
                                            {vendor.resourceTypes?.map((t) => {
                                                const meta = getResourceBadgeMeta(t);
                                                return (
                                                    <View
                                                        key={t}
                                                        style={[
                                                            s.resourcePill,
                                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                                        ]}
                                                    >
                                                        <PlatformIcon
                                                            name={meta.icon as any}
                                                            size={11}
                                                            tintColor={meta.iconColor}
                                                        />
                                                        <Text style={[s.resourcePillText, { color: textColor }]}>
                                                            {meta.label}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            {/* Dedicated Vendor Detail Sheet */}
            <VendorDetailSheet
                visible={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setDetailVendor(null);
                }}
                vendor={detailVendor}
                onEditVendor={(v) => {
                    setEditingVendor(v);
                    setIsEditOpen(true);
                }}
            />

            {/* Add / Edit Vendor Sheet */}
            <VendorEditSheet
                visible={isAddVendorOpen || isEditOpen}
                onClose={() => {
                    if (isAddVendorOpen) onCloseAddVendor();
                    if (isEditOpen) setIsEditOpen(false);
                    setEditingVendor(null);
                }}
                vendor={editingVendor}
                existingVendors={vendors}
                onSave={handleSaveVendor}
                onDelete={handleDeleteVendor}
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
        paddingHorizontal: 16,
        paddingVertical: 14,
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
        gap: 10,
    },
    cardTitleCol: {
        flex: 1,
        gap: 2,
    },
    nameStarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    cardVendorName: {
        fontSize: 15.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: 12.5,
    },
    cardLocationSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    cardRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pillsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    resourcePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 7,
    },
    resourcePillText: {
        fontSize: 11,
        fontWeight: '500',
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
