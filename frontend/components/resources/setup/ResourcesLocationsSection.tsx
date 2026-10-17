import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Switch,
    LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourceLocationItem,
    LocationSource,
    getLocationSourceBadgeMeta,
    getLocationTypeIcon,
} from '@/lib/api/resourcesLocations';
import { VendorMasterRecord } from '@/lib/api/resourcesVendors';
import { LocationEditSheet } from './LocationEditSheet';

interface ResourcesLocationsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    locations: ResourceLocationItem[];
    vendors: VendorMasterRecord[];
    onUpdateLocations: (locations: ResourceLocationItem[]) => void;
    isAddLocationOpen: boolean;
    onCloseAddLocation: () => void;
}

type FilterSource = 'All' | LocationSource;
type SortMode = 'name_asc' | 'name_desc' | 'type' | 'source' | 'hierarchy';
type RoleFilter = 'all' | 'receiving' | 'storage' | 'transfer';

const SOURCE_FILTER_OPTIONS: FilterSource[] = ['All', 'Internal', 'Clock', 'Project', 'Vendor'];

export function ResourcesLocationsSection({
    isDark,
    textColor,
    subtextColor,
    locations,
    vendors,
    onUpdateLocations,
    isAddLocationOpen,
    onCloseAddLocation,
}: ResourcesLocationsSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSource, setSelectedSource] = useState<FilterSource>('All');
    const [sortMode, setSortMode] = useState<SortMode>('hierarchy');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

    // Selected location for editing
    const [selectedLocation, setSelectedLocation] = useState<ResourceLocationItem | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    // Save/Edit Handler
    const handleSaveLocation = (savedItem: ResourceLocationItem) => {
        const exists = locations.some((l) => l.id === savedItem.id);
        let updated: ResourceLocationItem[];
        if (exists) {
            updated = locations.map((l) => (l.id === savedItem.id ? savedItem : l));
        } else {
            updated = [savedItem, ...locations];
        }
        onUpdateLocations(updated);
    };

    const handleDeleteLocation = (id: string) => {
        const updated = locations.filter((l) => l.id !== id);
        onUpdateLocations(updated);
    };

    const handleToggleActive = (id: string, active: boolean) => {
        Haptics.selectionAsync();
        const updated = locations.map((l) => (l.id === id ? { ...l, active } : l));
        onUpdateLocations(updated);
    };

    // Filter & Sort
    const filteredLocations = useMemo(() => {
        let result = [...locations];

        // 1. Source Filter
        if (selectedSource !== 'All') {
            result = result.filter((l) => l.source === selectedSource);
        }

        // 2. Role Filter
        if (roleFilter === 'receiving') {
            result = result.filter((l) => l.isReceivingLocation);
        } else if (roleFilter === 'storage') {
            result = result.filter((l) => l.isStorageLocation);
        } else if (roleFilter === 'transfer') {
            result = result.filter((l) => l.isTransferDestination);
        }

        // 3. Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (l) =>
                    l.name.toLowerCase().includes(q) ||
                    l.type.toLowerCase().includes(q) ||
                    l.source.toLowerCase().includes(q) ||
                    (l.parentName && l.parentName.toLowerCase().includes(q)) ||
                    (l.address && l.address.toLowerCase().includes(q)) ||
                    (l.department && l.department.toLowerCase().includes(q)) ||
                    (l.linkedProjectName && l.linkedProjectName.toLowerCase().includes(q)) ||
                    (l.linkedVendorName && l.linkedVendorName.toLowerCase().includes(q))
            );
        }

        // 4. Sorting
        result.sort((a, b) => {
            if (sortMode === 'name_asc') {
                return a.name.localeCompare(b.name);
            }
            if (sortMode === 'name_desc') {
                return b.name.localeCompare(a.name);
            }
            if (sortMode === 'source') {
                return a.source.localeCompare(b.source) || a.name.localeCompare(b.name);
            }
            if (sortMode === 'type') {
                return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
            }
            // hierarchy / default order
            return (a.order || 99) - (b.order || 99);
        });

        return result;
    }, [locations, selectedSource, roleFilter, searchQuery, sortMode]);

    const sortOptions = [
        { title: 'Hierarchy / Natural Order', mode: 'hierarchy' as SortMode },
        { title: 'Location Name (A to Z)', mode: 'name_asc' as SortMode },
        { title: 'Location Name (Z to A)', mode: 'name_desc' as SortMode },
        { title: 'Location Source', mode: 'source' as SortMode },
        { title: 'Location Type', mode: 'type' as SortMode },
    ];

    const roleFilterOptions = [
        { title: 'All Roles', filter: 'all' as RoleFilter },
        { title: 'Receiving Locations Only', filter: 'receiving' as RoleFilter },
        { title: 'Storage Locations Only', filter: 'storage' as RoleFilter },
        { title: 'Transfer Destinations Only', filter: 'transfer' as RoleFilter },
    ];

    return (
        <View style={s.container}>
            {/* 1-Row Compact Search, Sort & Role Filter Toolbar */}
            <View style={s.toolbarRow}>
                {/* Search Input Box */}
                <View
                    style={[
                        s.searchBar,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(255,255,255,0.92)',
                        },
                    ]}
                >
                    <PlatformIcon
                        name="magnifyingglass"
                        size={14}
                        tintColor={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'}
                    />
                    <TextInput
                        style={[s.searchInput, { color: textColor }]}
                        placeholder="Search locations, sites, racks..."
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCorrect={false}
                    />
                </View>

                {/* Sort Dropdown Menu */}
                <ContextMenu
                    actions={sortOptions.map((opt) => ({
                        title: opt.title,
                        state: sortMode === opt.mode ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const selected = sortOptions[e.nativeEvent.index];
                        if (selected) {
                            Haptics.selectionAsync();
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSortMode(selected.mode);
                        }
                    }}
                >
                    <TouchableOpacity
                        style={[
                            s.toolbarBtn,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(255,255,255,0.92)',
                            },
                        ]}
                        activeOpacity={0.7}
                        hitSlop={4}
                    >
                        <PlatformIcon
                            name="arrow.up.arrow.down"
                            size={14}
                            tintColor={sortMode !== 'hierarchy' ? '#007AFF' : subtextColor}
                        />
                    </TouchableOpacity>
                </ContextMenu>

                {/* Role Filter Dropdown Menu */}
                <ContextMenu
                    actions={roleFilterOptions.map((opt) => ({
                        title: opt.title,
                        state: roleFilter === opt.filter ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const selected = roleFilterOptions[e.nativeEvent.index];
                        if (selected) {
                            Haptics.selectionAsync();
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setRoleFilter(selected.filter);
                        }
                    }}
                >
                    <TouchableOpacity
                        style={[
                            s.toolbarBtn,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(255,255,255,0.92)',
                            },
                        ]}
                        activeOpacity={0.7}
                        hitSlop={4}
                    >
                        <PlatformIcon
                            name="line.3.horizontal.decrease.circle"
                            size={14}
                            tintColor={roleFilter !== 'all' ? '#007AFF' : subtextColor}
                        />
                    </TouchableOpacity>
                </ContextMenu>
            </View>

            {/* Source Filter Pills */}
            <View style={s.pillsRow}>
                {SOURCE_FILTER_OPTIONS.map((src) => {
                    const isSelected = selectedSource === src;
                    return (
                        <TouchableOpacity
                            key={src}
                            style={[
                                s.pillBtn,
                                isSelected
                                    ? [s.pillBtnActive, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]
                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedSource(src);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    s.pillText,
                                    {
                                        color: isSelected ? (isDark ? '#000000' : '#FFFFFF') : textColor,
                                        fontWeight: isSelected ? '600' : '500',
                                    },
                                ]}
                            >
                                {src}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Section Header */}
            <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionHeader, { color: subtextColor }]}>
                    Locations ({filteredLocations.length})
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedLocation(null);
                        setIsEditSheetOpen(true);
                    }}
                    hitSlop={8}
                >
                    <Text style={s.addBtnText}>+ Add Location</Text>
                </TouchableOpacity>
            </View>

            {/* Locations List Card */}
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {filteredLocations.length === 0 ? (
                    <View style={s.emptyRow}>
                        <PlatformIcon name="mappin.slash" size={24} tintColor={subtextColor} />
                        <Text style={[s.emptyRowText, { color: subtextColor }]}>
                            No locations found matching your criteria.
                        </Text>
                    </View>
                ) : (
                    filteredLocations.map((loc, idx) => {
                        const sourceMeta = getLocationSourceBadgeMeta(loc.source);
                        const typeIcon = getLocationTypeIcon(loc.type);

                        // Hierarchy / Context subtitle
                        let contextSubtitle = `${loc.type}`;
                        if (loc.parentName) {
                            contextSubtitle = `${loc.source} · ${loc.parentName}`;
                        } else if (loc.linkedProjectName) {
                            contextSubtitle = `${loc.source} · ${loc.linkedProjectName}`;
                        } else if (loc.linkedVendorName) {
                            contextSubtitle = `${loc.source} · ${loc.linkedVendorName}`;
                        } else if (loc.address) {
                            contextSubtitle = `${loc.source} · ${loc.address.split(',')[0]}`;
                        } else {
                            contextSubtitle = `${loc.source} · Standalone`;
                        }

                        return (
                            <View key={loc.id}>
                                {idx > 0 && (
                                    <View
                                        style={[
                                            s.divider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                        ]}
                                    />
                                )}
                                <TouchableOpacity
                                    style={s.locationRow}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedLocation(loc);
                                        setIsEditSheetOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Icon Container */}
                                    <View
                                        style={[
                                            s.typeIconBox,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : sourceMeta.bgLight,
                                            },
                                        ]}
                                    >
                                        <PlatformIcon
                                            name={typeIcon as any}
                                            size={16}
                                            tintColor={sourceMeta.color}
                                        />
                                    </View>

                                    {/* Content Column */}
                                    <View style={s.locationContentCol}>
                                        <View style={s.locationHeaderLine}>
                                            <Text
                                                style={[
                                                    s.locationNameText,
                                                    { color: loc.active ? textColor : subtextColor },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {loc.name}
                                            </Text>
                                        </View>

                                        <Text style={[s.locationSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {contextSubtitle}
                                        </Text>

                                        {/* Role Pills */}
                                        <View style={s.rolesPillsRow}>
                                            <View
                                                style={[
                                                    s.sourceBadge,
                                                    {
                                                        backgroundColor: isDark
                                                            ? sourceMeta.bgDark
                                                            : sourceMeta.bgLight,
                                                    },
                                                ]}
                                            >
                                                <Text style={[s.sourceBadgeText, { color: sourceMeta.color }]}>
                                                    {loc.source}
                                                </Text>
                                            </View>

                                            {loc.isReceivingLocation && (
                                                <View style={[s.roleTag, { backgroundColor: isDark ? 'rgba(52,199,89,0.12)' : '#EBF8EE' }]}>
                                                    <Text style={[s.roleTagText, { color: '#34C759' }]}>Receiving</Text>
                                                </View>
                                            )}

                                            {loc.isStorageLocation && (
                                                <View style={[s.roleTag, { backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : '#EBF5FF' }]}>
                                                    <Text style={[s.roleTagText, { color: '#007AFF' }]}>Storage</Text>
                                                </View>
                                            )}

                                            {loc.isTransferDestination && (
                                                <View style={[s.roleTag, { backgroundColor: isDark ? 'rgba(88,86,214,0.12)' : '#F2EFFE' }]}>
                                                    <Text style={[s.roleTagText, { color: '#5856D6' }]}>Transfer</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Active Toggle & Chevron */}
                                    <View style={s.rightActions}>
                                        <Switch
                                            value={loc.active}
                                            onValueChange={(val) => handleToggleActive(loc.id, val)}
                                            trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                                        />
                                        <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Add / Edit Location Sheet */}
            <LocationEditSheet
                visible={isAddLocationOpen || isEditSheetOpen}
                onClose={() => {
                    if (isAddLocationOpen) onCloseAddLocation();
                    if (isEditSheetOpen) setIsEditSheetOpen(false);
                    setSelectedLocation(null);
                }}
                locationItem={selectedLocation}
                allLocations={locations}
                vendors={vendors}
                onSaveLocation={handleSaveLocation}
                onDeleteLocation={handleDeleteLocation}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 8,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    searchBar: {
        flex: 1,
        height: 38,
        borderRadius: 19,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
        height: '100%',
    },
    toolbarBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    pillBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 18,
    },
    pillBtnActive: {},
    pillText: {
        fontSize: 13,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 10,
        marginBottom: 6,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
    },
    addBtnText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
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
    emptyRow: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 36,
        paddingHorizontal: 20,
        gap: 8,
    },
    emptyRowText: {
        fontSize: 13.5,
        textAlign: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    typeIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationContentCol: {
        flex: 1,
        gap: 3,
    },
    locationHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationNameText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    locationSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    rolesPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 3,
    },
    sourceBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 5,
    },
    sourceBadgeText: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    roleTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleTagText: {
        fontSize: 10,
        fontWeight: '600',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
});
