import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import useAccessControl from '@/hooks/useAccessControl';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import {
    Announcement,
    ANNOUNCEMENT_TEMPLATES,
    getAnnouncements,
    formatPostedAt,
    subscribeToAnnouncements,
} from '@/lib/announcements';
import { CreateAnnouncementSheet } from '@/components/home/CreateAnnouncementSheet';
import { AnnouncementDetailPane } from '@/components/home/AnnouncementDetailPane';

const STATUS_SEGMENTS: Segment[] = [
    { id: 'ALL', label: 'All' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'FEATURED', label: 'Pinned' },
    { id: 'WITHDRAWN', label: 'Withdrawn' },
];

export function AnnouncementHistoryMasterDetail() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const paneBgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const formaBlue = '#0036F8';

    const { activeTenant, tenantRole, isSuperAdmin } = useTenantContext();
    const { permissions, can } = useAccessControl();
    const isAuthorized = permissions
        ? can('can_manage_people')
        : isSuperAdmin || ['admin', 'superadmin', 'administrator', 'hr', 'management', 'supervisor', 'manager', 'pm'].includes((tenantRole || '').toLowerCase());

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreateSheet, setShowCreateSheet] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const list = await getAnnouncements(false, activeTenant?.id);
            setAnnouncements(list);
        } catch {
            // silent
        }
    }, [activeTenant?.id]);

    useEffect(() => {
        loadData();
        const unsub = subscribeToAnnouncements(() => {
            loadData();
        });
        return () => unsub();
    }, [loadData]);

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter((item) => {
            if (statusFilter === 'ACTIVE' && item.isWithdrawn) return false;
            if (statusFilter === 'WITHDRAWN' && !item.isWithdrawn) return false;
            if (statusFilter === 'FEATURED' && !item.isFeatured) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
                const matchAuthor = item.authorName?.toLowerCase().includes(q);
                const matchDept = item.targetDepartment?.toLowerCase().includes(q);
                if (!matchTitle && !matchSubtitle && !matchAuthor && !matchDept) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    }, [announcements, searchQuery, statusFilter]);

    const selectedAnnouncement = useMemo(() => {
        if (!selectedAnnouncementId) return null;
        return announcements.find((a) => a.id === selectedAnnouncementId) || null;
    }, [announcements, selectedAnnouncementId]);

    const handleSelectAnnouncement = (item: Announcement) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedAnnouncementId === item.id) {
            setSelectedAnnouncementId(null);
        } else {
            setSelectedAnnouncementId(item.id);
        }
    };

    return (
        <View style={[styles.splitRoot, { backgroundColor: paneBgColor }]}>
            {/* Left Pane: Master List */}
            <View style={[styles.splitLeftPane, { borderRightColor: borderColor, backgroundColor: paneBgColor }]}>
                {/* Master Header */}
                <View style={styles.splitListHeader}>
                    <View style={styles.headerTitleRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            hitSlop={10}
                            style={[styles.backButtonCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        >
                            <PlatformIcon name="chevron.left" size={16} tintColor={textColor} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            Announcement History
                        </Text>
                    </View>
                    <View style={styles.headerActionsRow}>
                        <HeaderCircleButton
                            type="custom"
                            iconName="magnifyingglass"
                            size={32}
                            tintColor={(isSearchVisible || !!searchQuery) ? formaBlue : textColor}
                            style={[
                                (isSearchVisible || !!searchQuery) && {
                                    backgroundColor: isDark ? 'rgba(0, 54, 248, 0.2)' : '#EFF6FF',
                                }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsSearchVisible((prev) => !prev);
                            }}
                        />
                        {isAuthorized && (
                            <HeaderCircleButton
                                type="custom"
                                iconName="plus"
                                tintColor="#FFFFFF"
                                size={32}
                                style={{ backgroundColor: formaBlue }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowCreateSheet(true);
                                }}
                            />
                        )}
                    </View>
                </View>

                {/* Status Filter Segmented Control */}
                <View style={[styles.segmentedWrapper, (isSearchVisible || !!searchQuery) && { paddingBottom: 8 }]}>
                    <SegmentedControl
                        segments={STATUS_SEGMENTS}
                        activeSegment={statusFilter}
                        onSegmentChange={setStatusFilter}
                        fullWidth
                    />
                </View>

                {/* Search Bar (Placed BELOW Segmented Control) */}
                {(isSearchVisible || !!searchQuery) && (
                    <View style={styles.searchBarWrapper}>
                        <SwiftUISearchBar
                            placeholder="Search announcements, author..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onClear={() => {
                                setSearchQuery('');
                                setIsSearchVisible(false);
                            }}
                            isDark={isDark}
                            showClearButton={true}
                        />
                    </View>
                )}

                {/* Announcements Scroll List */}
                <ScrollView
                    style={styles.splitListScroll}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredAnnouncements.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <PlatformIcon name="megaphone.fill" size={36} tintColor={isDark ? '#3A3A3C' : '#C7C7CC'} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                No Announcements
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                {searchQuery ? 'Try adjusting your search query' : 'No announcements in this view.'}
                            </Text>
                        </View>
                    ) : (
                        filteredAnnouncements.map((item) => {
                            const conf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;
                            const isSelected = selectedAnnouncementId === item.id;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.78}
                                    onPress={() => handleSelectAnnouncement(item)}
                                    style={[
                                        styles.itemCard,
                                        {
                                            backgroundColor: isSelected
                                                ? (isDark ? 'rgba(0, 54, 248, 0.16)' : '#EFF6FF')
                                                : cardBgColor,
                                            borderColor: isSelected ? formaBlue : borderColor,
                                        },
                                    ]}
                                >
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.iconSquircle, { backgroundColor: conf.gradient[0] }]}>
                                            <PlatformIcon name={conf.icon as any} size={15} tintColor="#FFFFFF" />
                                        </View>
                                        <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Text style={[styles.pillBadgeText, { color: conf.gradient[0] }]}>
                                                {conf.label}
                                            </Text>
                                        </View>
                                        {item.isFeatured && (
                                            <View style={[styles.pillBadge, { backgroundColor: 'rgba(0,54,248,0.12)' }]}>
                                                <PlatformIcon name="pin.fill" size={10} tintColor={formaBlue} />
                                                <Text style={[styles.pillBadgeText, { color: formaBlue }]}>Pinned</Text>
                                            </View>
                                        )}
                                        {item.isWithdrawn && (
                                            <View style={[styles.pillBadge, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
                                                <Text style={[styles.pillBadgeText, { color: '#DC2626' }]}>Withdrawn</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!!item.duration && (
                                        <Text style={[styles.cardDuration, { color: subtextColor }]}>
                                            {item.duration}
                                        </Text>
                                    )}

                                    <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
                                        {item.title}
                                    </Text>

                                    {!!item.subtitle && (
                                        <Text style={[styles.cardSubtitle, { color: subtextColor }]} numberOfLines={2}>
                                            {item.subtitle}
                                        </Text>
                                    )}

                                    <View style={styles.cardFooterRow}>
                                        <Text style={[styles.cardAuthor, { color: subtextColor }]} numberOfLines={1}>
                                            By {item.authorName || 'Broadcast Team'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                        </Text>
                                        {item.documents && item.documents.length > 0 && (
                                            <View style={styles.docsBadge}>
                                                <PlatformIcon name="paperclip" size={11} tintColor={subtextColor} />
                                                <Text style={[styles.docsBadgeText, { color: subtextColor }]}>
                                                    {item.documents.length}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>

            {/* Right Pane: Embedded Announcement Detail Inspector */}
            <View style={styles.splitRightPane}>
                {selectedAnnouncement ? (
                    <AnnouncementDetailPane
                        announcement={selectedAnnouncement}
                        onClose={() => setSelectedAnnouncementId(null)}
                        onUpdated={loadData}
                    />
                ) : (
                    <View style={styles.emptyDetailPlaceholder}>
                        <View style={[styles.emptyIconCircle, { width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <PlatformIcon name="megaphone.fill" size={26} tintColor={isDark ? '#48484A' : '#C7C7CC'} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            Select an Announcement
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                            Choose an announcement from the list on the left to inspect its full content and attachments.
                        </Text>
                    </View>
                )}
            </View>

            <CreateAnnouncementSheet
                visible={showCreateSheet}
                onClose={() => setShowCreateSheet(false)}
                onSuccess={loadData}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: 1,
    },
    splitListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    searchBarWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    segmentedWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    splitListScroll: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 60,
        gap: 10,
    },
    itemCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        gap: 6,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            },
        }),
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconSquircle: {
        width: 26,
        height: 26,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
    },
    pillBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardDuration: {
        fontSize: 11,
        fontWeight: '600',
    },
    cardTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        letterSpacing: -0.2,
        lineHeight: 19,
    },
    cardSubtitle: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    cardAuthor: {
        fontSize: 11.5,
        fontWeight: '500',
        flex: 1,
    },
    docsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    docsBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    splitRightPane: {
        flex: 2,
        position: 'relative',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyDetailPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 10,
    },
    emptyIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        maxWidth: 280,
    },
});
