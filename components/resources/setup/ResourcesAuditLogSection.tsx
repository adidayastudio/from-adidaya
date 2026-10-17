import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    AuditLogDetailSheet,
    AuditLogItem,
    getAuditCategoryColor,
} from '@/components/clock/setup/AuditLogDetailSheet';
import {
    ResourcesAuditLogItem,
    getResourcesAuditLogs,
    clearResourcesAuditLogs,
} from '@/lib/api/resourcesAuditLogs';
import { ResourceTypeOption } from '@/lib/api/financeSetup';

interface ResourcesAuditLogSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    logs?: ResourcesAuditLogItem[];
    auditLogs?: ResourcesAuditLogItem[];
    onUpdateLogs?: (logs: ResourcesAuditLogItem[]) => void;
    onUpdateAuditLogs?: (logs: ResourcesAuditLogItem[]) => void;
}

type TimeFilterKey = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
type ResourceTypeFilter = 'All' | ResourceTypeOption;

const RESOURCE_TYPE_FILTERS: ResourceTypeFilter[] = ['All', 'Material', 'Tools', 'Assets', 'Services'];

const CATEGORY_OPTIONS = [
    'All Types',
    'Setup Changes',
    'Requests & Approvals',
    'Receiving & Intake',
    'Transfers & Custody',
    'Inventory & Stock',
    'Security / Access',
];

export function ResourcesAuditLogSection({
    isDark,
    textColor,
    subtextColor,
    logs,
    auditLogs,
    onUpdateLogs,
    onUpdateAuditLogs,
}: ResourcesAuditLogSectionProps) {
    const list = auditLogs || logs || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Types');
    const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('all');
    const [selectedResourceType, setSelectedResourceType] = useState<ResourceTypeFilter>('All');
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    const filteredLogs = useMemo(() => {
        return list.filter((item) => {
            // Category filter
            if (selectedCategory !== 'All Types' && item.category !== selectedCategory) {
                return false;
            }

            // Resource Type filter
            if (selectedResourceType !== 'All' && item.resourceType !== selectedResourceType) {
                return false;
            }

            // Time filter
            if (timeFilter === 'today' && item.dateKey !== 'today') return false;
            if (timeFilter === 'last_7_days' && item.dateKey !== 'today' && item.dateKey !== 'last_7_days') return false;
            if (timeFilter === 'last_30_days' && item.dateKey === 'this_month') return false;
            if (timeFilter === 'this_month' && item.dateKey !== 'this_month' && item.dateKey !== 'today') return false;

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchAction = item.action.toLowerCase().includes(q);
                const matchActor = item.actor.toLowerCase().includes(q);
                const matchDetail = item.detail.toLowerCase().includes(q);
                const matchCategory = item.category.toLowerCase().includes(q);
                const matchTime = item.time.toLowerCase().includes(q);
                const matchDoc = item.documentNumber?.toLowerCase().includes(q);
                const matchAffected = item.affectedRecord?.toLowerCase().includes(q);
                const matchModule = item.targetModule?.toLowerCase().includes(q);
                return (
                    matchAction ||
                    matchActor ||
                    matchDetail ||
                    matchCategory ||
                    matchTime ||
                    matchDoc ||
                    matchAffected ||
                    matchModule
                );
            }
            return true;
        });
    }, [list, selectedCategory, selectedResourceType, timeFilter, searchQuery]);

    const categoryActions: ContextMenuAction[] = CATEGORY_OPTIONS.map((cat) => ({
        title: cat,
        selected: selectedCategory === cat,
    }));

    const timeActions: ContextMenuAction[] = [
        { title: 'All Retained (1 Year)', selected: timeFilter === 'all' },
        { title: 'Today', selected: timeFilter === 'today' },
        { title: 'Last 7 Days', selected: timeFilter === 'last_7_days' },
        { title: 'Last 30 Days', selected: timeFilter === 'last_30_days' },
        { title: 'This Month', selected: timeFilter === 'this_month' },
    ];

    const getTimeLabel = () => {
        switch (timeFilter) {
            case 'today':
                return 'Today';
            case 'last_7_days':
                return '7 Days';
            case 'last_30_days':
                return '30 Days';
            case 'this_month':
                return 'This Month';
            default:
                return 'All Time';
        }
    };

    return (
        <View style={s.container}>
            {/* 1-Row Compact Search, Category & Time Toolbar */}
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
                        placeholder="Search audit trail, documents..."
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCorrect={false}
                    />
                </View>

                {/* Category / Type Dropdown */}
                <ContextMenu
                    actions={categoryActions}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const selected = CATEGORY_OPTIONS[e.nativeEvent.index];
                        if (selected) {
                            Haptics.selectionAsync();
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSelectedCategory(selected);
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
                            name="line.3.horizontal.decrease"
                            size={14}
                            tintColor={selectedCategory !== 'All Types' ? '#007AFF' : subtextColor}
                        />
                    </TouchableOpacity>
                </ContextMenu>

                {/* Time Filter Dropdown */}
                <ContextMenu
                    actions={timeActions}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const keys: TimeFilterKey[] = ['all', 'today', 'last_7_days', 'last_30_days', 'this_month'];
                        const selected = keys[e.nativeEvent.index];
                        if (selected) {
                            Haptics.selectionAsync();
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setTimeFilter(selected);
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
                            name="clock.arrow.circlepath"
                            size={14}
                            tintColor={timeFilter !== 'all' ? '#007AFF' : subtextColor}
                        />
                    </TouchableOpacity>
                </ContextMenu>
            </View>

            {/* Resource Type Filter Pills */}
            <View style={s.pillsRow}>
                {RESOURCE_TYPE_FILTERS.map((type) => {
                    const isSelected = selectedResourceType === type;
                    return (
                        <TouchableOpacity
                            key={type}
                            style={[
                                s.pillBtn,
                                isSelected
                                    ? [s.pillBtnActive, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]
                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedResourceType(type);
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
                                {type}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Header with Count */}
            <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionHeader, { color: subtextColor }]}>
                    Activity Events ({filteredLogs.length})
                </Text>
                <Text style={[s.retentionBadgeText, { color: subtextColor }]}>
                    {getTimeLabel()}
                </Text>
            </View>

            {/* Audit Logs List Card */}
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {filteredLogs.length === 0 ? (
                    <View style={s.emptyRow}>
                        <PlatformIcon name="clock.arrow.circlepath" size={28} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>No Audit Logs</Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            Resource activity and configuration history will appear here.
                        </Text>
                    </View>
                ) : (
                    filteredLogs.map((item, idx) => {
                        const catColor = getAuditCategoryColor(item.category);

                        return (
                            <View key={item.id}>
                                {idx > 0 && (
                                    <View
                                        style={[
                                            s.divider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                        ]}
                                    />
                                )}
                                <TouchableOpacity
                                    style={s.logItemRow}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedItem(item);
                                        setDetailVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Action Icon */}
                                    <View
                                        style={[
                                            s.iconBox,
                                            {
                                                backgroundColor: isDark
                                                    ? `${catColor}25`
                                                    : `${catColor}15`,
                                            },
                                        ]}
                                    >
                                        <PlatformIcon
                                            name={(item.icon as any) || 'clock.arrow.circlepath'}
                                            size={16}
                                            tintColor={catColor}
                                        />
                                    </View>

                                    {/* Text Content */}
                                    <View style={s.logContent}>
                                        {/* Action / Event Title */}
                                        <View style={s.actionHeaderRow}>
                                            <Text
                                                style={[s.actionTitle, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                {item.action}
                                            </Text>
                                        </View>

                                        {/* Actor Name (Normal weight) & Resource Subtitle */}
                                        <Text style={[s.actorSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            by <Text style={{ color: textColor, fontWeight: '400' }}>{item.actor}</Text>
                                            {item.affectedRecord ? ` · ${item.affectedRecord}` : ''}
                                        </Text>

                                        {/* Badges and Timestamp */}
                                        <View style={s.metaRow}>
                                            <View style={[s.catPill, { backgroundColor: isDark ? `${catColor}20` : `${catColor}12` }]}>
                                                <Text style={[s.catPillText, { color: catColor }]}>
                                                    {item.targetModule || item.category}
                                                </Text>
                                            </View>

                                            {item.documentNumber && (
                                                <View style={[s.docPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' }]}>
                                                    <Text style={[s.docPillText, { color: subtextColor }]}>
                                                        {item.documentNumber}
                                                    </Text>
                                                </View>
                                            )}

                                            <Text style={[s.timestampText, { color: subtextColor }]}>
                                                {item.time}
                                            </Text>
                                        </View>
                                    </View>

                                    <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Shared Audit Log Detail Sheet */}
            <AuditLogDetailSheet
                visible={detailVisible}
                onClose={() => {
                    setDetailVisible(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
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
    retentionBadgeText: {
        fontSize: 12,
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
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 8,
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
    },
    logItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logContent: {
        flex: 1,
        gap: 3,
    },
    actionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    actorSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 3,
    },
    catPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    catPillText: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    docPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    docPillText: {
        fontSize: 10,
        fontFamily: 'Menlo',
    },
    timestampText: {
        fontSize: 11.5,
        marginLeft: 'auto',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
});
