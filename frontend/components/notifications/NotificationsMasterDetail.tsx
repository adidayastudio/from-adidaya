import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { NotificationInboxControls } from './NotificationInboxControls';
import { notificationDestination } from '@/lib/notificationDestination';
import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { useTenantContext } from '@/context/TenantContext';
import { getLocalNotifications, markNotificationsAsRead, LocalNotification } from '@/lib/api/notifications';
import { parseNotificationDate } from '@/constants/mockNotifications';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { differenceInDays, isToday, isYesterday, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { TransactionDetailDrawer } from '@/components/finance/TransactionDetailDrawer';

import { getAnnouncements, Announcement } from '@/lib/announcements';

export interface NotificationItem {
    id: string;
    text: string;
    module: string;
    user: string;
    time: string;
    unread: boolean;
    category: 'finance' | 'crew' | 'projects' | 'system' | 'general';
    requestId?: string;
    requestType?: 'purchasing' | 'reimbursement' | 'task' | 'general';
    projectCode?: string;
    action?: string;
    ref?: string;
    subjectUser?: string;
    link?: string;
    description?: string;
    rawDate?: Date;
}

const CATEGORY_SEGMENTS: Segment[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'finance', label: 'Finance' },
    { id: 'crew', label: 'Crew' },
    { id: 'projects', label: 'Projects' },
    { id: 'system', label: 'System' },
];

const HISTORY_TIME_SEGMENTS: Segment[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: '7 Days' },
    { id: 'month', label: '30 Days' },
    { id: 'older', label: 'Older' },
];

const MODULE_FILTER_ITEMS = [
    { id: 'ALL', label: 'All Modules' },
    { id: 'finance', label: 'Finance' },
    { id: 'system', label: 'Announcements & System' },
    { id: 'crew', label: 'Crew' },
    { id: 'projects', label: 'Projects' },
];

interface NotificationsMasterDetailProps {
    initialHistoryMode?: boolean;
}

export const NotificationsMasterDetail: React.FC<NotificationsMasterDetailProps> = ({ initialHistoryMode = false }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const paneBgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const formaBlue = isDark ? '#4D82FF' : '#007AFF';

    const { teamPurchasing, teamReimbursement, refreshData } = useFinance();
    const { activeTenant } = useTenantContext();
    const { notifications: localNotifications, refresh: refreshInbox, markRead, markAllRead, loading: inboxLoading, unreadCount, error: inboxError } = useAdidayaNotifications();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isHistoryMode, setIsHistoryMode] = useState(initialHistoryMode);
    const [activeTab, setActiveTab] = useState('all');
    const [historyTimeTab, setHistoryTimeTab] = useState('all');
    const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

    const fetchNotifications = refreshInbox;

    const formatRequestTime = (req: any): string => {
        try {
            const dateStr = req.updated_at || req.created_at || req.date;
            if (!dateStr) return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
            return format(date, 'dd/MM/yyyy, HH:mm:ss');
        } catch {
            return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
        }
    };

    const isRequestRecent = (req: any): boolean => {
        try {
            const dateStr = req.updated_at || req.created_at || req.date;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return diffHours < 24;
        } catch {
            return false;
        }
    };

    const capitalizeName = (name: string): string => {
        if (!name) return '';
        if (name.length <= 3 && name === name.toUpperCase()) return name;
        return name
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Build notifications list
    const allNotifications = useMemo<NotificationItem[]>(() => {
        const localList: NotificationItem[] = (localNotifications || []).map((n: any) => {
            const rawCategory = n.category || 'system';
            const rawModule = n.module || 'System';
            const text = n.title || n.text || '';
            const lowerText = text.toLowerCase();
            const lowerModule = rawModule.toLowerCase();

            let category = rawCategory;
            let moduleName = rawModule;

            if (
                category === 'system' &&
                (lowerText.includes('purchasing') || lowerText.includes('reimbursement') || lowerModule.includes('purchasing') || lowerModule.includes('reimbursement') || n.requestType === 'purchasing' || n.requestType === 'reimbursement')
            ) {
                category = 'finance';
                if (moduleName === 'System') {
                    moduleName = lowerText.includes('reimbursement') || lowerModule.includes('reimbursement') ? 'Reimbursement' : 'Purchasing';
                }
            } else if (
                category === 'system' &&
                (lowerText.includes('crew') || lowerText.includes('daily log') || lowerText.includes('payroll') || lowerModule.includes('crew') || lowerModule.includes('payroll'))
            ) {
                category = 'crew';
                if (moduleName === 'System') {
                    moduleName = lowerText.includes('payroll') ? 'Payroll' : 'Crew';
                }
            } else if (
                category === 'system' &&
                (lowerText.includes('project') || lowerModule.includes('project') || lowerModule.includes('task'))
            ) {
                category = 'projects';
                if (moduleName === 'System') {
                    moduleName = 'Projects';
                }
            }

            return {
                link: n.link,
                id: n.id || `local-${Math.random()}`,
                text: text || 'Notification',
                description: n.body || n.description || n.text || '',
                module: moduleName,
                user: n.user || 'Adidaya System',
                time: n.created_at ? format(new Date(n.created_at), 'dd/MM/yyyy, HH:mm:ss') : n.time || format(new Date(), 'dd/MM/yyyy, HH:mm:ss'),
                unread: Boolean(n.unread),
                category: category as any,
                requestId: n.requestId,
                requestType: n.requestType,
                projectCode: n.projectCode,
                subjectUser: n.subjectUser || n.user,
                ref: n.ref || n.id,
                action: n.action || 'info',
                rawDate: parseNotificationDate(n.time),
            };
        });

        const merged = localList;

        return merged.sort((a, b) => {
            const dateA = parseNotificationDate(a.time).getTime();
            const dateB = parseNotificationDate(b.time).getTime();
            return dateB - dateA;
        });
    }, [localNotifications]);

    // Filter notifications by Search Query, Time Period & Module Tab
    const filteredNotifications = useMemo(() => {
        return allNotifications.filter((item) => {
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !query ||
                item.text.toLowerCase().includes(query) ||
                item.module.toLowerCase().includes(query) ||
                item.user.toLowerCase().includes(query) ||
                (item.ref && item.ref.toLowerCase().includes(query)) ||
                (item.projectCode && item.projectCode.toLowerCase().includes(query));

            if (!matchesSearch) return false;

            if (isHistoryMode) {
                // 1. Time Filter
                const itemDate = parseNotificationDate(item.time);
                if (historyTimeTab === 'today' && !isToday(itemDate)) return false;
                if (historyTimeTab === 'week' && differenceInDays(new Date(), itemDate) > 7) return false;
                if (historyTimeTab === 'month' && differenceInDays(new Date(), itemDate) > 30) return false;
                if (historyTimeTab === 'older' && differenceInDays(new Date(), itemDate) <= 30) return false;

                // 2. Module / Type Filter
                if (selectedModuleFilter !== 'ALL' && item.category !== selectedModuleFilter) return false;

                return true;
            }

            if (activeTab === 'all') return true;
            if (activeTab === 'unread') return item.unread;
            return item.category === activeTab;
        });
    }, [allNotifications, isHistoryMode, historyTimeTab, selectedModuleFilter, activeTab, searchQuery]);

    // Group filtered items by date header
    const groupedNotifications = useMemo(() => {
        const groups: { title: string; items: NotificationItem[] }[] = [];
        const todayItems: NotificationItem[] = [];
        const yesterdayItems: NotificationItem[] = [];
        const last7DaysItems: NotificationItem[] = [];
        const olderItems: NotificationItem[] = [];

        filteredNotifications.forEach((item) => {
            const date = parseNotificationDate(item.time);
            if (isToday(date)) {
                todayItems.push(item);
            } else if (isYesterday(date)) {
                yesterdayItems.push(item);
            } else if (differenceInDays(new Date(), date) <= 7) {
                last7DaysItems.push(item);
            } else {
                olderItems.push(item);
            }
        });

        if (todayItems.length > 0) groups.push({ title: 'Today', items: todayItems });
        if (yesterdayItems.length > 0) groups.push({ title: 'Yesterday', items: yesterdayItems });
        if (last7DaysItems.length > 0) groups.push({ title: 'Last 7 Days', items: last7DaysItems });
        if (olderItems.length > 0) groups.push({ title: 'Older', items: olderItems });

        return groups;
    }, [filteredNotifications]);

    // Keep selection valid if filtered list changes
    useEffect(() => {
        if (selectedNotificationId) {
            const exists = filteredNotifications.some((n) => n.id === selectedNotificationId);
            if (!exists) {
                setSelectedNotificationId(null);
            }
        }
    }, [filteredNotifications, selectedNotificationId]);

    const selectedNotification = useMemo(() => {
        return allNotifications.find((n) => n.id === selectedNotificationId) || null;
    }, [allNotifications, selectedNotificationId]);

    const handleSelectNotification = (item: NotificationItem) => {
        Haptics.selectionAsync();
        void markRead(item.id);
        setSelectedNotificationId(item.id);
    };

    const handleOpenInModule = (notification: NotificationItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const destination = notificationDestination(notification.link);
        if (destination) { router.push(destination as any); return; }
        if (
            notification.module === 'Announcement' ||
            notification.ref?.startsWith('ann-')
        ) {
            router.push({
                pathname: '/announcement-detail',
                params: { id: notification.ref || notification.id },
            });
            return;
        }

        if (notification.requestId && notification.requestType) {
            router.push({
                pathname: '/(tabs)/home/finance',
                params: {
                    requestId: notification.requestId,
                    requestType: notification.requestType,
                },
            });
            return;
        }

        if (notification.module === 'Task' || notification.requestType === 'task' || notification.action?.startsWith('task_')) {
            router.push({
                pathname: '/(tabs)/tasks',
                params: { taskId: notification.ref || '' }
            });
            return;
        }

        if (notification.category === 'projects') {
            router.push('/(tabs)/projects');
            return;
        }

        if (notification.category === 'crew') {
            router.push('/(tabs)/home/crew-module');
            return;
        }
    };

    const getActionInfo = (action?: string) => {
        switch ((action || '').toLowerCase()) {
            case 'paid':
                return {
                    label: 'marking as paid:',
                    color: '#15803D',
                    avatarBg: isDark ? 'rgba(52,199,89,0.18)' : '#DCFCE7',
                    avatarText: '#15803D',
                    badgeBg: isDark ? 'rgba(52,199,89,0.2)' : '#DCFCE7',
                    badgeText: '#15803D',
                };
            case 'approved':
                return {
                    label: 'approved:',
                    color: '#007AFF',
                    avatarBg: isDark ? 'rgba(0,122,255,0.18)' : '#DBEAFE',
                    avatarText: '#1D4ED8',
                    badgeBg: isDark ? 'rgba(0,122,255,0.2)' : '#DBEAFE',
                    badgeText: '#1D4ED8',
                };
            case 'rejected':
                return {
                    label: 'rejected:',
                    color: '#DC2626',
                    avatarBg: isDark ? 'rgba(255,59,48,0.18)' : '#FEE2E2',
                    avatarText: '#B91C1C',
                    badgeBg: isDark ? 'rgba(255,59,48,0.2)' : '#FEE2E2',
                    badgeText: '#B91C1C',
                };
            case 'revision':
                return {
                    label: 'requested revision for:',
                    color: '#D97706',
                    avatarBg: isDark ? 'rgba(255,149,0,0.18)' : '#FEF3C7',
                    avatarText: '#B45309',
                    badgeBg: isDark ? 'rgba(255,149,0,0.2)' : '#FEF3C7',
                    badgeText: '#B45309',
                };
            case 'info':
                return { label: '', color: formaBlue, avatarBg: isDark ? '#1C1C1E' : '#EFF6FF', avatarText: formaBlue, badgeBg: 'transparent', badgeText: formaBlue };
            case 'submitted':
            default:
                return {
                    label: 'submitted:',
                    color: formaBlue,
                    avatarBg: isDark ? 'rgba(0, 122, 255,0.18)' : '#EFF6FF',
                    avatarText: formaBlue,
                    badgeBg: isDark ? 'rgba(0, 122, 255,0.2)' : '#EFF6FF',
                    badgeText: formaBlue,
                };
        }
    };

    const getAvatarTheme = (item: NotificationItem) => {
        const actionInfo = getActionInfo(item.action);
        return {
            bg: actionInfo.avatarBg,
            text: actionInfo.avatarText,
        };
    };

    const filterMenuActions = useMemo(() => {
        return [
            ...MODULE_FILTER_ITEMS.map((m) => ({
                title: m.label,
                selected: selectedModuleFilter === m.id,
            })),
            ...(selectedModuleFilter !== 'ALL' || historyTimeTab !== 'all'
                ? [
                      {
                          title: 'Reset Filter',
                          destructive: true,
                      },
                  ]
                : []),
        ];
    }, [selectedModuleFilter, historyTimeTab]);

    const handleFilterMenuPress = useCallback((e: { nativeEvent: { name: string } }) => {
        const name = e.nativeEvent.name;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (name === 'Reset Filter') {
            setSelectedModuleFilter('ALL');
            setHistoryTimeTab('all');
            return;
        }

        const matched = MODULE_FILTER_ITEMS.find((m) => m.label === name);
        if (matched) {
            setSelectedModuleFilter(matched.id);
        }
    }, []);

    // Master Header Toolbar Actions (Line-only icons)
    const masterToolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (isHistoryMode) {
            return [
                {
                    id: 'search',
                    icon: 'search-outline',
                    image: 'magnifyingglass',
                    title: 'Search',
                    onPress: () => setIsSearchVisible((prev) => !prev),
                },
                {
                    id: 'filter',
                    icon: 'filter-outline',
                    image: 'line.3.horizontal.decrease',
                    title: 'Filter Type',
                    tintColor: selectedModuleFilter !== 'ALL' ? formaBlue : textColor,
                    menuActions: filterMenuActions,
                    onMenuPress: handleFilterMenuPress,
                },
                {
                    id: 'live_notifications',
                    icon: 'notifications-outline',
                    image: 'bell',
                    title: 'Live Notifications',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsHistoryMode(false);
                    },
                },
            ];
        }

        return [
            {
                id: 'search',
                icon: 'search-outline',
                image: 'magnifyingglass',
                title: 'Search',
                onPress: () => setIsSearchVisible((prev) => !prev),
            },
            {
                id: 'history',
                icon: 'time-outline',
                image: 'clock',
                title: 'History',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsHistoryMode(true);
                },
            },
        ];
    }, [isHistoryMode, selectedModuleFilter, filterMenuActions, handleFilterMenuPress, formaBlue, textColor]);

    const selectedRequestData = useMemo(() => {
        if (!selectedNotification || !selectedNotification.requestId) return null;
        if (selectedNotification.requestType === 'purchasing') {
            return (teamPurchasing || []).find((r: any) => String(r.id) === String(selectedNotification.requestId)) || null;
        }
        if (selectedNotification.requestType === 'reimbursement') {
            return (teamReimbursement || []).find((r: any) => String(r.id) === String(selectedNotification.requestId)) || null;
        }
        return null;
    }, [selectedNotification, teamPurchasing, teamReimbursement]);

    const formatCurrency = (amount: any) => {
        const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0).replace(/[^0-9.-]+/g, ''));
        if (isNaN(num) || num <= 0) return null;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num).replace('IDR', 'Rp');
    };

    return (
        <View style={[styles.splitRoot, { backgroundColor: paneBgColor }]}>
            {/* ════════════════════════════════════════════════════════════════════
                LEFT PANE: NOTIFICATIONS MASTER LIST
               ════════════════════════════════════════════════════════════════════ */}
            <View
                style={[
                    styles.splitLeftPane,
                    {
                        backgroundColor: paneBgColor,
                        borderRightColor: borderColor,
                    },
                ]}
            >
                {!!inboxError && <Text accessibilityRole="alert" style={{ color: '#FF453A', padding: 16 }}>{inboxError}</Text>}
                {/* Master Header */}
                <View style={styles.splitListHeader}>
                    <View style={styles.splitListHeaderTitleRow}>
                        {isHistoryMode ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => setIsHistoryMode(false)}
                                    hitSlop={10}
                                    style={[styles.backButtonCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                >
                                    <PlatformIcon name="chevron.left" size={16} tintColor={textColor} />
                                </TouchableOpacity>
                                <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>
                                    History
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (router.canGoBack()) {
                                            router.back();
                                        } else {
                                            router.replace("/");
                                        }
                                    }}
                                    hitSlop={10}
                                    style={[styles.backButtonCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
                                    accessibilityLabel="Back"
                                >
                                    <PlatformIcon name="chevron.left" size={16} tintColor={textColor} />
                                </TouchableOpacity>
                                <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>
                                    Notifications
                                </Text>
                            </View>
                        )}
                        <HeaderToolbar
                            actions={masterToolbarActions}
                            isDark={isDark}
                            textColor={textColor}
                        />
                    </View>
                </View>

                {/* Segmented Control */}
                <View style={[styles.segmentedWrapper, isSearchVisible && { marginBottom: 8 }]}>
                    <SegmentedControl
                        segments={isHistoryMode ? HISTORY_TIME_SEGMENTS : CATEGORY_SEGMENTS}
                        activeSegment={isHistoryMode ? historyTimeTab : activeTab}
                        onSegmentChange={isHistoryMode ? setHistoryTimeTab : setActiveTab}
                        fullWidth
                    />
                </View>

                {/* Floating/Inline Search Bar (Placed BELOW Segmented Control) */}
                {isSearchVisible && (
                    <View style={styles.searchBarWrapper}>
                        <SwiftUISearchBar
                            placeholder={isHistoryMode ? "Search history, module, ref..." : "Search notifications, module, ref..."}
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

                <NotificationInboxControls unreadCount={unreadCount} loading={inboxLoading} onRefresh={refreshInbox} onMarkAllRead={markAllRead} />
                {/* Notifications Scroll List */}
                <ScrollView
                    style={styles.splitListScroll}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {groupedNotifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <PlatformIcon
                                name="bell"
                                size={40}
                                tintColor={isDark ? '#3A3A3C' : '#C7C7CC'}
                            />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                {inboxLoading ? 'Loading notifications…' : inboxError ? 'Unable to load notifications' : 'No notifications found'}
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                {inboxLoading ? 'Fetching your Adidaya inbox' : inboxError ? 'Use Refresh to try again' : searchQuery ? 'Try matching another keyword or filter' : 'You are all caught up for now'}
                            </Text>
                        </View>
                    ) : (
                        groupedNotifications.map((group) => (
                            <View key={group.title} style={styles.groupSection}>
                                <Text style={[styles.groupHeaderTitle, { color: subtextColor }]}>
                                    {group.title}
                                </Text>

                                <View style={styles.itemsColumn}>
                                    {group.items.map((item) => {
                                        const isSelected = item.id === selectedNotificationId;
                                        const actionInfo = getActionInfo(item.action);
                                        const actorName = item.subjectUser || item.user || 'Adidaya Finance';
                                        const avatarLetter = actorName.charAt(0).toUpperCase();

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.75}
                                                onPress={() => handleSelectNotification(item)}
                                                style={[
                                                    styles.notificationCard,
                                                    {
                                                        backgroundColor: isSelected
                                                            ? (isDark ? 'rgba(0, 122, 255, 0.16)' : '#EFF6FF')
                                                            : cardBgColor,
                                                        borderColor: isSelected
                                                            ? formaBlue
                                                            : borderColor,
                                                    },
                                                ]}
                                            >
                                                {/* Full Circle Avatar */}
                                                <View
                                                    style={[
                                                        styles.avatarCircle,
                                                        { backgroundColor: actionInfo.avatarBg },
                                                    ]}
                                                >
                                                    <Text style={[styles.avatarText, { color: actionInfo.avatarText }]}>
                                                        {avatarLetter}
                                                    </Text>
                                                </View>

                                                {/* Card Content */}
                                                <View style={styles.cardInfo}>
                                                    {/* Top Narrative: Actor + Action + Title */}
                                                    <Text
                                                        style={[styles.cardMainText, { color: textColor }]}
                                                        numberOfLines={2}
                                                    >
                                                        <Text style={styles.cardActorText}>
                                                            {actorName}
                                                        </Text>
                                                        {' '}
                                                        <Text style={[styles.cardActionText, { color: actionInfo.color }]}>
                                                            {actionInfo.label}
                                                        </Text>
                                                        {' '}
                                                        <Text style={[styles.cardItemText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                                                            {item.text}
                                                        </Text>
                                                    </Text>

                                                    {/* Subtitle Metadata: Module • Project • Full Date Time */}
                                                    <Text
                                                        style={[styles.cardMetaText, { color: subtextColor }]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.module}{item.projectCode ? ` • ${item.projectCode}` : ''} • {item.time}
                                                    </Text>
                                                </View>

                                                {/* Unread Dot Indicator */}
                                                {item.unread && <View style={styles.unreadDot} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* ════════════════════════════════════════════════════════════════════
                RIGHT PANE: EMBEDDED DOCUMENT DETAIL INSPECTOR
               ════════════════════════════════════════════════════════════════════ */}
            <View
                style={[
                    styles.splitRightPane,
                    { backgroundColor: paneBgColor },
                ]}
            >
                {selectedNotification ? (
                    selectedRequestData ? (
                        <TransactionDetailDrawer
                            visible={true}
                            isEmbedded={true}
                            onClose={() => {}}
                            request={selectedRequestData}
                            actions={[
                                {
                                    id: 'open_module',
                                    label: `Go to ${selectedNotification.module}`,
                                    color: formaBlue,
                                    type: 'primary',
                                },
                            ]}
                            onAction={() => handleOpenInModule(selectedNotification)}
                        />
                    ) : (
                        <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Detail Header */}
                            <View style={styles.headerRow}>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                                        {selectedNotification.ref || selectedNotification.text}
                                    </Text>
                                    <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                                        {selectedNotification.module} • {selectedNotification.time}
                                    </Text>
                                </View>
                            </View>

                            {/* Content Viewport */}
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={styles.detailScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Main Document Summary Card */}
                                <View style={[styles.detailCard, { backgroundColor: cardBgColor, borderColor }]}>
                                    <View style={styles.detailCardTop}>
                                        <View style={styles.userProfileRow}>
                                            <View
                                                style={[
                                                    styles.detailAvatarCircle,
                                                    { backgroundColor: getActionInfo(selectedNotification.action).avatarBg },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.detailAvatarText,
                                                        { color: getActionInfo(selectedNotification.action).avatarText },
                                                    ]}
                                                >
                                                    {(selectedNotification.subjectUser || selectedNotification.user || 'A').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>

                                            <View>
                                                <Text style={[styles.detailUserName, { color: textColor }]}>
                                                    {selectedNotification.subjectUser || selectedNotification.user}
                                                </Text>
                                                <Text style={[styles.detailUserRole, { color: subtextColor }]}>
                                                    {selectedNotification.module} Record
                                                </Text>
                                            </View>
                                        </View>

                                        <View
                                            style={[
                                                styles.statusActionBadge,
                                                {
                                                    backgroundColor: getActionInfo(selectedNotification.action).badgeBg,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusActionText,
                                                    { color: getActionInfo(selectedNotification.action).badgeText },
                                                ]}
                                            >
                                                {(selectedNotification.action || 'INFO').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.detailDivider, { backgroundColor: borderColor }]} />

                                    {/* Document Title & Description */}
                                    <View style={styles.detailBody}>
                                        <Text style={[styles.detailBodyText, { color: textColor }]}>
                                            {selectedNotification.text}
                                        </Text>
                                        {selectedNotification.description && (
                                            <Text style={[styles.detailDescriptionText, { color: subtextColor }]}>
                                                {selectedNotification.description}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Reference Details */}
                                <View style={[styles.detailCard, { backgroundColor: cardBgColor, borderColor }]}>
                                    <Text style={[styles.cardSectionHeader, { color: textColor }]}>
                                        Details
                                    </Text>

                                    <View style={styles.metadataGrid}>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: subtextColor }]}>
                                                MODULE
                                            </Text>
                                            <Text style={[styles.gridValue, { color: textColor }]}>
                                                {selectedNotification.module}
                                            </Text>
                                        </View>

                                        {selectedNotification.ref && (
                                            <View style={styles.gridItem}>
                                                <Text style={[styles.gridLabel, { color: subtextColor }]}>
                                                    REFERENCE ID
                                                </Text>
                                                <Text style={[styles.gridValue, { color: formaBlue }]}>
                                                    {selectedNotification.ref}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: subtextColor }]}>
                                                TIMESTAMP
                                            </Text>
                                            <Text style={[styles.gridValue, { color: textColor }]}>
                                                {selectedNotification.time}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Clean Bottom Button */}
                            <View style={styles.cleanBottomFooter}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => handleOpenInModule(selectedNotification)}
                                    style={[styles.cleanPrimaryButton, { backgroundColor: formaBlue }]}
                                >
                                    <Text style={styles.cleanPrimaryButtonText}>
                                        Go to {selectedNotification.module}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                ) : (
                    <View style={styles.rightEmptyState}>
                        <View
                            style={[
                                styles.emptyIconCircle,
                                { backgroundColor: cardBgColor },
                            ]}
                        >
                            <PlatformIcon
                                name={isHistoryMode ? "clock" : "bell"}
                                size={40}
                                tintColor={isDark ? '#64748B' : '#94A3B8'}
                            />
                        </View>
                        <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                            {isHistoryMode ? 'Select a Record' : 'Select a Notification'}
                        </Text>
                        <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                            {isHistoryMode
                                ? 'Choose a historical record or announcement from the left pane to inspect full details.'
                                : 'Choose an item from the left pane to view complete details and open linked modules.'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: StyleSheet.hairlineWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    splitListHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    splitListHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    backButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBarWrapper: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    segmentedWrapper: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 16,
    },
    groupSection: {
        gap: 8,
    },
    groupHeaderTitle: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
        letterSpacing: -0.1,
    },
    itemsColumn: {
        gap: 10,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardInfo: {
        flex: 1,
        gap: 4,
    },
    cardMainText: {
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '400',
    },
    cardActorText: {
        fontWeight: '700',
    },
    cardActionText: {
        fontWeight: '700',
    },
    cardItemText: {
        fontWeight: '500',
    },
    cardMetaText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#007AFF',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 12.5,
        textAlign: 'center',
        maxWidth: 240,
    },

    // RIGHT DETAIL PANE
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 2,
    },
    detailScrollContent: {
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 60,
        gap: 16,
    },
    detailCard: {
        borderRadius: 20,
        padding: 20,
        gap: 14,
        borderWidth: 1,
    },
    detailCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailAvatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailAvatarText: {
        fontSize: 18,
        fontWeight: '800',
    },
    detailUserName: {
        fontSize: 15.5,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    detailUserRole: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusActionBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusActionText: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    amountBlock: {
        marginTop: 4,
        gap: 2,
    },
    amountLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    amountValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    detailDivider: {
        height: StyleSheet.hairlineWidth,
    },
    detailBody: {
        gap: 6,
    },
    detailBodyText: {
        fontSize: 15.5,
        fontWeight: '700',
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    detailDescriptionText: {
        fontSize: 13.5,
        lineHeight: 20,
    },
    cardSectionHeader: {
        fontSize: 13.5,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    metadataGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridItem: {
        width: '45%',
        gap: 3,
    },
    gridLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    gridValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    cleanBottomFooter: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 12,
    },
    cleanPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 26,
        width: '100%',
    },
    cleanPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    rightEmptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 10,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    emptyStateSubtitle: {
        fontSize: 13.5,
        textAlign: 'center',
        maxWidth: 300,
        lineHeight: 19,
    },
});
