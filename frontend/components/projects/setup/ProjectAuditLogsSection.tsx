import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import {
    AuditLogDetailSheet,
    AuditLogItem,
} from '@/components/clock/setup/AuditLogDetailSheet';
import {
    ProjectAuditLogItem,
    ProjectAuditCategory,
    getProjectAuditCategoryColor,
    getProjectAuditCategoryShortLabel,
} from '@/lib/api/projectSetup';

interface ProjectAuditLogsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    logs: ProjectAuditLogItem[];
}

type TimeFilterKey = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month';

const CATEGORY_OPTIONS: Array<'All Types' | ProjectAuditCategory> = [
    'All Types',
    'Setup Changes',
    'Types & Statuses',
    'Roles & Permissions',
    'Tracking & Rules',
    'Security / Access',
];

export function ProjectAuditLogsSection({
    isDark,
    textColor,
    subtextColor,
    logs,
}: ProjectAuditLogsSectionProps) {
    const intensity = isDark ? 18 : 30;

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All Types' | ProjectAuditCategory>('All Types');
    const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('all');
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter((item) => {
            // Category filter
            if (selectedCategory !== 'All Types' && item.category !== selectedCategory) {
                return false;
            }

            // Time filter
            if (timeFilter === 'today' && item.dateKey !== 'today') return false;
            if (timeFilter === 'last_7_days' && item.dateKey !== 'today' && item.dateKey !== 'last_7_days') return false;
            if (timeFilter === 'last_30_days' && item.dateKey === 'this_month') return false;
            if (timeFilter === 'this_month' && item.dateKey !== 'this_month' && item.dateKey !== 'today') return false;

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchAction = item.action.toLowerCase().includes(query);
                const matchActor = (item.actor || item.user || '').toLowerCase().includes(query);
                const matchDetail = (item.detail || item.details || '').toLowerCase().includes(query);
                const matchCategory = item.category.toLowerCase().includes(query);
                const matchTime = (item.time || item.timestamp || '').toLowerCase().includes(query);
                const matchTarget = item.targetModule?.toLowerCase().includes(query);
                const matchId = item.id.toLowerCase().includes(query);

                return (
                    matchAction ||
                    matchActor ||
                    matchDetail ||
                    matchCategory ||
                    matchTime ||
                    matchTarget ||
                    matchId
                );
            }
            return true;
        });
    }, [logs, selectedCategory, timeFilter, searchQuery]);

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

    const getCategoryFilterLabel = () => {
        if (selectedCategory === 'All Types') return 'Type';
        return getProjectAuditCategoryShortLabel(selectedCategory);
    };

    const getTimeFilterLabel = () => {
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
                return 'Time';
        }
    };

    const isFiltered = searchQuery || selectedCategory !== 'All Types' || timeFilter !== 'all';

    return (
        <View style={styles.container}>
            {/* 1. Unified Toolbar: Search | Type Menu | Time Menu */}
            <View style={styles.unifiedToolbar}>
                {/* Search Input */}
                <View
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={13} tintColor={subtextColor} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                </View>

                {/* Type Filter */}
                <ContextMenu
                    actions={categoryActions}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        setSelectedCategory(CATEGORY_OPTIONS[e.nativeEvent.index] || 'All Types');
                    }}
                    dropdownMenuMode={true}
                >
                    <View
                        style={[
                            styles.filterBtn,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterBtnText,
                                {
                                    color: textColor,
                                    fontWeight: '600',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {getCategoryFilterLabel()}
                        </Text>
                        <PlatformIcon
                            name="chevron.down"
                            size={10}
                            tintColor={subtextColor}
                        />
                    </View>
                </ContextMenu>

                {/* Time Filter */}
                <ContextMenu
                    actions={timeActions}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        const timeMap: Record<number, TimeFilterKey> = {
                            0: 'all',
                            1: 'today',
                            2: 'last_7_days',
                            3: 'last_30_days',
                            4: 'this_month',
                        };
                        setTimeFilter(timeMap[e.nativeEvent.index] || 'all');
                    }}
                    dropdownMenuMode={true}
                >
                    <View
                        style={[
                            styles.filterBtn,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterBtnText,
                                {
                                    color: textColor,
                                    fontWeight: '600',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {getTimeFilterLabel()}
                        </Text>
                        <PlatformIcon
                            name="chevron.down"
                            size={10}
                            tintColor={subtextColor}
                        />
                    </View>
                </ContextMenu>
            </View>

            {/* 2. Audit Log Cards */}
            <View style={{ gap: 10 }}>
                {filteredLogs.length === 0 ? (
                    <GlassView
                        intensity={intensity}
                        style={[
                            styles.cardBase,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(255,255,255,0.7)',
                                paddingVertical: 36,
                                paddingHorizontal: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            },
                        ]}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <PlatformIcon
                                name={isFiltered ? 'magnifyingglass' : 'clock.arrow.circlepath'}
                                size={22}
                                tintColor={subtextColor}
                            />
                        </View>
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: '600',
                                color: textColor,
                                textAlign: 'center',
                            }}
                        >
                            {isFiltered ? 'No Matching Logs' : 'No Audit Logs'}
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: subtextColor,
                                textAlign: 'center',
                                lineHeight: 18,
                                maxWidth: 280,
                            }}
                        >
                            {isFiltered
                                ? 'Try changing your search or filters.'
                                : 'Projects setup activity and configuration history will appear here.'}
                        </Text>

                        {isFiltered && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSearchQuery('');
                                    setSelectedCategory('All Types');
                                    setTimeFilter('all');
                                }}
                                style={{
                                    marginTop: 4,
                                    paddingHorizontal: 14,
                                    paddingVertical: 6,
                                    borderRadius: 14,
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.05)',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12.5,
                                        fontWeight: '500',
                                        color: textColor,
                                    }}
                                >
                                    Reset Filters
                                </Text>
                            </TouchableOpacity>
                        )}
                    </GlassView>
                ) : (
                    filteredLogs.map((item) => {
                        const categoryColor = getProjectAuditCategoryColor(item.category);
                        const actorName = item.actor || item.user || 'Current User';
                        const actionTitle = item.action;
                        const detailText = item.detail || item.details || '';
                        const timeText = item.time || item.timestamp || 'Just now';

                        const initials = actorName
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.72}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedItem({
                                        id: item.id,
                                        actor: actorName,
                                        actorRole: item.actorRole || 'Workspace Admin',
                                        actorAvatarUrl: item.actorAvatarUrl,
                                        action: actionTitle,
                                        detail: detailText,
                                        time: timeText,
                                        category: (item.category === 'Roles & Permissions'
                                            ? 'Security / Access'
                                            : item.category === 'Tracking & Rules'
                                            ? 'Documents & Rules'
                                            : 'Setup Changes') as any,
                                        icon: item.icon || 'folder.badge.gearshape',
                                        iconColor: categoryColor,
                                        targetModule: item.targetModule || 'Projects Setup',
                                        oldValue: item.oldValue,
                                        newValue: item.newValue,
                                        ipAddress: item.ipAddress || '127.0.0.1',
                                        timestampIso: item.timestampIso || new Date().toISOString(),
                                    });
                                    setDetailVisible(true);
                                }}
                            >
                                <GlassView
                                    intensity={intensity}
                                    style={[
                                        styles.cardBase,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.025)'
                                                : 'rgba(255,255,255,0.75)',
                                            borderColor: isDark
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(0,0,0,0.06)',
                                            gap: 6,
                                        },
                                    ]}
                                >
                                    {/* Row 1: Actor Avatar & Name (Left) + Category Short Label [Dot] (Right) */}
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 7,
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            {item.actorAvatarUrl ? (
                                                <Image
                                                    source={{ uri: item.actorAvatarUrl }}
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 11,
                                                        backgroundColor: isDark
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.04)',
                                                    }}
                                                />
                                            ) : (
                                                <View
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 11,
                                                        backgroundColor: isDark
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.04)',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 9.5,
                                                            fontWeight: '500',
                                                            color: isDark ? '#AEAEB2' : '#636366',
                                                        }}
                                                    >
                                                        {initials}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text
                                                style={{
                                                    fontSize: 13.5,
                                                    fontWeight: '500',
                                                    color: textColor,
                                                    flexShrink: 1,
                                                }}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {actorName}
                                            </Text>
                                        </View>

                                        {/* Top-Right: Category Short Label [Dot] */}
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 5,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11.5,
                                                    color: subtextColor,
                                                    fontWeight: '400',
                                                }}
                                                numberOfLines={1}
                                            >
                                                {getProjectAuditCategoryShortLabel(item.category)}
                                            </Text>
                                            <View
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    backgroundColor: categoryColor,
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </View>
                                    </View>

                                    {/* Row 2: Action Title */}
                                    <Text
                                        style={{
                                            fontSize: 14.5,
                                            fontWeight: '600',
                                            color: textColor,
                                        }}
                                    >
                                        {actionTitle}
                                    </Text>

                                    {/* Row 3: Detail Text */}
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color: isDark ? '#D1D1D6' : '#3A3A3C',
                                            lineHeight: 18,
                                        }}
                                    >
                                        {detailText}
                                    </Text>

                                    {/* Row 4: Clean Timestamp Footer */}
                                    <Text
                                        style={{
                                            fontSize: 11.5,
                                            color: '#8E8E93',
                                            fontWeight: '400',
                                            marginTop: 2,
                                        }}
                                    >
                                        {timeText}
                                    </Text>
                                </GlassView>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            {/* Audit Log Detail Sheet */}
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

const styles = StyleSheet.create({
    container: {
        gap: 12,
        paddingHorizontal: 0,
        paddingTop: 4,
        paddingBottom: 24,
        width: '100%',
    },
    unifiedToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        marginBottom: 4,
    },
    searchBar: {
        flex: 1,
        height: 36,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 6,
        paddingVertical: 0,
    },
    filterBtn: {
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        maxWidth: 130,
    },
    filterBtnText: {
        fontSize: 12.5,
        fontWeight: '500',
    },
    cardBase: {
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
});

export default ProjectAuditLogsSection;
