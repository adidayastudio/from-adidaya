import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Platform,
    ActionSheetIOS,
    Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import {
    AuditLogDetailSheet,
    AuditLogItem,
} from '@/components/clock/setup/AuditLogDetailSheet';

// ─── Finance Audit Category Types ────────────────────────────────────────────
export type FinanceAuditCategory =
    | 'Setup Changes'
    | 'Requests & Approvals'
    | 'Payments & Disbursements'
    | 'Bank & Funding'
    | 'Documents & Rules';

export type FinanceAuditLogItem = AuditLogItem & {
    dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
    documentNumber?: string;
    requestNumber?: string;
    bankName?: string;
    fundingSourceName?: string;
    affectedRecord?: string;
};

// ─── Finance Category Colors ─────────────────────────────────────────────────
const FINANCE_AUDIT_CATEGORY_COLORS: Record<FinanceAuditCategory, string> = {
    'Setup Changes': '#007AFF',
    'Requests & Approvals': '#34C759',
    'Payments & Disbursements': '#FF9500',
    'Bank & Funding': '#5856D6',
    'Documents & Rules': '#AF52DE',
};

function getFinanceAuditCategoryColor(category: string): string {
    return (FINANCE_AUDIT_CATEGORY_COLORS as Record<string, string>)[category] || '#007AFF';
}

function getFinanceAuditCategoryShortLabel(category: string): string {
    switch (category) {
        case 'Setup Changes':
            return 'Setup';
        case 'Requests & Approvals':
            return 'Requests';
        case 'Payments & Disbursements':
            return 'Payments';
        case 'Bank & Funding':
            return 'Banking';
        case 'Documents & Rules':
            return 'Documents';
        default:
            return category;
    }
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface FinanceAuditLogSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    retentionLabel?: string; // e.g. "1 Year", "180 Days"
}

// ─── Component ───────────────────────────────────────────────────────────────
export function FinanceAuditLogSection({
    isDark,
    textColor,
    subtextColor,
    retentionLabel,
}: FinanceAuditLogSectionProps) {
    const intensity = isDark ? 18 : 30;

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | FinanceAuditCategory>('All');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'>('all');
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    // Audit log entries (populated by real data when backend is connected)
    const auditLogsList: FinanceAuditLogItem[] = [];

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return auditLogsList.filter((item) => {
            // Category filter
            if (selectedCategory !== 'All' && item.category !== selectedCategory) {
                return false;
            }
            // Time filter
            if (timeFilter === 'today' && item.dateKey !== 'today') return false;
            if (timeFilter === 'last_7_days' && item.dateKey !== 'today' && item.dateKey !== 'last_7_days') return false;
            if (timeFilter === 'last_30_days' && item.dateKey === 'this_month') return false;
            if (timeFilter === 'this_month' && item.dateKey !== 'this_month' && item.dateKey !== 'today') return false;
            // Search
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchAction = item.action.toLowerCase().includes(query);
                const matchActor = item.actor.toLowerCase().includes(query);
                const matchDetail = item.detail.toLowerCase().includes(query);
                const matchCategory = item.category.toLowerCase().includes(query);
                const matchTime = item.time.toLowerCase().includes(query);
                const matchDocNumber = item.documentNumber?.toLowerCase().includes(query);
                const matchReqNumber = item.requestNumber?.toLowerCase().includes(query);
                const matchBank = item.bankName?.toLowerCase().includes(query);
                const matchFunding = item.fundingSourceName?.toLowerCase().includes(query);
                const matchAffected = item.affectedRecord?.toLowerCase().includes(query);
                const matchId = item.id.toLowerCase().includes(query);
                return (
                    matchAction || matchActor || matchDetail || matchCategory ||
                    matchTime || matchDocNumber || matchReqNumber || matchBank ||
                    matchFunding || matchAffected || matchId
                );
            }
            return true;
        });
    }, [auditLogsList, selectedCategory, timeFilter, searchQuery]);

    // Filter options
    const retentionDisplay = retentionLabel || '1 Year';

    const categoryActions: ContextMenuAction[] = [
        { title: 'All Types', selected: selectedCategory === 'All' },
        { title: 'Setup Changes', selected: selectedCategory === 'Setup Changes' },
        { title: 'Requests & Approvals', selected: selectedCategory === 'Requests & Approvals' },
        { title: 'Payments & Disbursements', selected: selectedCategory === 'Payments & Disbursements' },
        { title: 'Bank & Funding', selected: selectedCategory === 'Bank & Funding' },
        { title: 'Documents & Rules', selected: selectedCategory === 'Documents & Rules' },
    ];

    const timeActions: ContextMenuAction[] = [
        { title: `All Retained (${retentionDisplay})`, selected: timeFilter === 'all' },
        { title: 'Today', selected: timeFilter === 'today' },
        { title: 'Last 7 Days', selected: timeFilter === 'last_7_days' },
        { title: 'Last 30 Days', selected: timeFilter === 'last_30_days' },
        { title: 'This Month', selected: timeFilter === 'this_month' },
    ];

    const categoryFilterLabel =
        selectedCategory === 'All'
            ? 'Type'
            : selectedCategory === 'Setup Changes'
            ? 'Setup'
            : selectedCategory === 'Requests & Approvals'
            ? 'Requests'
            : selectedCategory === 'Payments & Disbursements'
            ? 'Payments'
            : selectedCategory === 'Bank & Funding'
            ? 'Banking'
            : 'Documents';

    const timeFilterLabel =
        timeFilter === 'all'
            ? 'Time'
            : timeFilter === 'today'
            ? 'Today'
            : timeFilter === 'last_7_days'
            ? '7 Days'
            : timeFilter === 'last_30_days'
            ? '30 Days'
            : 'This Month';

    const isFiltered = searchQuery || selectedCategory !== 'All' || timeFilter !== 'all';

    return (
        <View style={{ gap: 12 }}>
            {/* Search, Filter & Time Row */}
            <View style={styles.filterRow}>
                {/* Search Bar */}
                <View
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search audit trail, actor, or detail..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={15} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Pull-Down Menu */}
                <ContextMenu
                    actions={categoryActions}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        const categoryMap: Record<number, 'All' | FinanceAuditCategory> = {
                            0: 'All',
                            1: 'Setup Changes',
                            2: 'Requests & Approvals',
                            3: 'Payments & Disbursements',
                            4: 'Bank & Funding',
                            5: 'Documents & Rules',
                        };
                        setSelectedCategory(categoryMap[e.nativeEvent.index] || 'All');
                    }}
                    dropdownMenuMode
                >
                    <View
                        style={[
                            styles.menuButtonPill,
                            {
                                backgroundColor: selectedCategory !== 'All'
                                    ? (isDark ? 'rgba(21,153,87,0.18)' : 'rgba(21,153,87,0.08)')
                                    : isDark
                                    ? '#1C1C1E'
                                    : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: selectedCategory !== 'All'
                                    ? '#159957'
                                    : isDark
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name={selectedCategory !== 'All' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                            size={selectedCategory !== 'All' ? 18 : 16}
                            tintColor={selectedCategory !== 'All' ? '#159957' : textColor}
                        />
                    </View>
                </ContextMenu>

                {/* Time Pull-Down Menu */}
                <ContextMenu
                    actions={timeActions}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        const timeMap: Record<number, typeof timeFilter> = {
                            0: 'all',
                            1: 'today',
                            2: 'last_7_days',
                            3: 'last_30_days',
                            4: 'this_month',
                        };
                        setTimeFilter(timeMap[e.nativeEvent.index] || 'all');
                    }}
                    dropdownMenuMode
                >
                    <View
                        style={[
                            styles.timeButtonPill,
                            {
                                backgroundColor: timeFilter !== 'all'
                                    ? (isDark ? 'rgba(21,153,87,0.18)' : 'rgba(21,153,87,0.08)')
                                    : isDark
                                    ? '#1C1C1E'
                                    : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: timeFilter !== 'all'
                                    ? '#159957'
                                    : isDark
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name="clock"
                            size={14}
                            tintColor={timeFilter !== 'all' ? '#159957' : subtextColor}
                        />
                        <Text
                            style={[
                                styles.timeButtonText,
                                {
                                    color: timeFilter !== 'all' ? '#159957' : textColor,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {timeFilterLabel}
                        </Text>
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
                                : 'Finance activity and configuration history will appear here.'}
                        </Text>

                        {isFiltered && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSearchQuery('');
                                    setSelectedCategory('All');
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
                        const categoryColor = getFinanceAuditCategoryColor(item.category);

                        const initials = item.actor
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
                                    setSelectedItem(item);
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
                                            paddingVertical: 13,
                                            paddingHorizontal: 15,
                                            gap: 6,
                                        },
                                    ]}
                                >
                                    {/* Row 1: Actor Avatar & Name (Left) + Category Short Label [Dot] (Right) */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
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
                                                {item.actor}
                                            </Text>
                                        </View>

                                        {/* Top-Right: Category Short Label [Dot] */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                            <Text
                                                style={{
                                                    fontSize: 11.5,
                                                    color: subtextColor,
                                                    fontWeight: '400',
                                                }}
                                                numberOfLines={1}
                                            >
                                                {getFinanceAuditCategoryShortLabel(item.category)}
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
                                        {item.action}
                                    </Text>

                                    {/* Row 3: Clean Detail Text */}
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color: isDark ? '#D1D1D6' : '#3A3A3C',
                                            lineHeight: 18,
                                        }}
                                    >
                                        {item.detail}
                                    </Text>

                                    {/* Row 4: Clean Timestamp Footer (Light) */}
                                    <Text
                                        style={{
                                            fontSize: 11.5,
                                            color: '#8E8E93',
                                            fontWeight: '400',
                                            marginTop: 2,
                                        }}
                                    >
                                        {item.time}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        borderWidth: 0,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    menuButtonPill: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeButtonPill: {
        height: 42,
        paddingHorizontal: 14,
        borderRadius: 21,
        borderWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    timeButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    cardBase: {
        borderRadius: 16,
        padding: 14,
        overflow: 'hidden',
    },
});

export default FinanceAuditLogSection;
