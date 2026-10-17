import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
    RefreshControl,
    Animated,
    Pressable,
    Keyboard,
    useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import { NotificationsMasterDetail } from '@/components/notifications/NotificationsMasterDetail';
import {
    Host,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    HStack as SwiftUIHStack,
    Spacer as SwiftUISpacer,
    frame,
    cornerRadius,
    glassEffect,
} from '@/lib/swiftui';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import {
    Announcement,
    ANNOUNCEMENT_TEMPLATES,
    getAnnouncements,
    pinAnnouncement,
    unpinAnnouncement,
    withdrawAnnouncement,
    restoreAnnouncement,
    deleteAnnouncement,
    formatPostedAt,
    subscribeToAnnouncements,
} from '@/lib/announcements';
import { CreateAnnouncementSheet } from '@/components/home/CreateAnnouncementSheet';

import { AnnouncementDetailPane } from '@/components/home/AnnouncementDetailPane';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';

function BouncyGlassButton({
    onPress,
    title,
    icon = 'plus',
}: {
    onPress: () => void;
    title: string;
    icon?: any;
    isDark?: boolean;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scale, {
            toValue: 0.94,
            friction: 4,
            tension: 300,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, styles.bouncyGlassWrapper]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.bouncyGlassBtn}
            >
                <BlurView
                    intensity={Platform.OS === 'ios' ? 25 : 0}
                    tint="light"
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.bouncyGlassContent}>
                    <PlatformIcon name={icon} size={14} tintColor="#FFFFFF" />
                    <Text style={styles.bouncyGlassText}>{title}</Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const TIME_SORT_OPTIONS = [
    'Last 90 Days',
    'Last 30 Days',
    'All Time',
    'Oldest First',
];

const STATUS_FILTER_OPTIONS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Status' },
    { id: 'ACTIVE', label: 'Active Only' },
    { id: 'WITHDRAWN', label: 'Withdrawn' },
    { id: 'FEATURED', label: 'Pinned Only' },
];

const STATUS_SEGMENTS: Segment[] = [
    { id: 'ALL', label: 'All' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'FEATURED', label: 'Pinned' },
    { id: 'WITHDRAWN', label: 'Withdrawn' },
];

const TIME_SEGMENTS: Segment[] = [
    { id: '90d', label: '90 Days' },
    { id: '30d', label: '30 Days' },
    { id: 'all', label: 'All Time' },
];

export default function AnnouncementHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const paneBgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const formaBlue = '#007AFF';

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeSortIndex, setTimeSortIndex] = useState(0); // 0 = 90d, 1 = 30d, 2 = all, 3 = oldest
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreateSheet, setShowCreateSheet] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/announcement-history' as any);
        }
    }, [isDesktopWeb]);

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
        const unsub = subscribeToAnnouncements((list) => {
            loadData();
        });
        return () => unsub();
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Filter and Sort Logic
    const filteredAnnouncements = useMemo(() => {
        const now = Date.now();
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        let result = announcements.filter((item) => {
            // 1. Time range
            const itemTime = new Date(item.dateCreated).getTime();
            if (timeSortIndex === 0 && itemTime < ninetyDaysAgo) return false;
            if (timeSortIndex === 1 && itemTime < thirtyDaysAgo) return false;

            // 2. Status filter
            if (statusFilter === 'ACTIVE' && item.isWithdrawn) return false;
            if (statusFilter === 'WITHDRAWN' && !item.isWithdrawn) return false;
            if (statusFilter === 'FEATURED' && !item.isFeatured) return false;

            // 3. Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
                const matchAuthor = item.authorName?.toLowerCase().includes(q);
                const matchDept = item.targetDepartment?.toLowerCase().includes(q);
                if (!matchTitle && !matchSubtitle && !matchAuthor && !matchDept) return false;
            }

            return true;
        });

        // Sort order
        if (timeSortIndex === 3) {
            result = [...result].sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());
        } else {
            result = [...result].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
        }

        return result;
    }, [announcements, searchQuery, timeSortIndex, statusFilter]);

    const handleWithdraw = (item: Announcement) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tenantId = item.tenantId || activeTenant?.id;
        const confirmMsg = item.isWithdrawn
            ? `Restore "${item.title}" to active announcements?`
            : `Are you sure you want to withdraw "${item.title}"? It will no longer appear on Home Brief.`;

        const doAction = async () => {
            if (item.isWithdrawn) {
                await restoreAnnouncement(item.id, tenantId);
            } else {
                await withdrawAnnouncement(item.id, tenantId);
            }
            await loadData();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                doAction();
            }
        } else {
            Alert.alert(
                item.isWithdrawn ? 'Restore Announcement' : 'Withdraw Announcement',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: item.isWithdrawn ? 'Restore' : 'Withdraw',
                        style: item.isWithdrawn ? 'default' : 'destructive',
                        onPress: doAction,
                    },
                ]
            );
        }
    };

    const handleDelete = (item: Announcement) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const tenantId = item.tenantId || activeTenant?.id;
        const confirmMsg = `Permanently delete "${item.title}"? This action cannot be undone.`;

        const doDelete = async () => {
            await deleteAnnouncement(item.id, tenantId);
            await loadData();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Delete Announcement',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete Permanently',
                        style: 'destructive',
                        onPress: doDelete,
                    },
                ]
            );
        }
    };

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const isSearching = isKeyboardVisible || isSearchFocused;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    const baseBottom = Platform.OS === 'ios' ? insets.bottom + 12 : 16;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e: any) => {
            setIsKeyboardVisible(true);
            const height = e?.endCoordinates?.height || 0;
            const targetGap = Platform.OS === 'ios' ? 8 : 24;
            const lift = Math.max(0, height + targetGap - baseBottom);
            const duration = e?.duration || (Platform.OS === 'ios' ? 250 : 200);
            Animated.timing(keyboardOffset, {
                toValue: lift,
                duration,
                useNativeDriver: false,
            }).start();
        };

        const onHide = (e: any) => {
            setIsKeyboardVisible(false);
            const duration = e?.duration || (Platform.OS === 'ios' ? 250 : 200);
            Animated.timing(keyboardOffset, {
                toValue: 0,
                duration,
                useNativeDriver: false,
            }).start();
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [keyboardOffset, baseBottom]);

    const sortActions: ContextMenuAction[] = useMemo(() => {
        return TIME_SORT_OPTIONS.map((opt, idx) => ({
            title: opt,
            state: timeSortIndex === idx ? 'on' : 'off',
        }));
    }, [timeSortIndex]);

    const filterActions: ContextMenuAction[] = useMemo(() => {
        return STATUS_FILTER_OPTIONS.map((opt) => ({
            title: opt.label,
            state: statusFilter === opt.id ? 'on' : 'off',
        }));
    }, [statusFilter]);

    const getCardContextMenuActions = (item: Announcement): ContextMenuAction[] => [
        {
            title: 'View Details',
            systemIcon: 'eye',
        },
        {
            title: item.isFeatured ? 'Unpin from Brief' : 'Pin to Brief',
            systemIcon: item.isFeatured ? 'pin.slash' : 'pin',
        },
        {
            title: item.isWithdrawn ? 'Restore' : 'Withdraw',
            systemIcon: item.isWithdrawn ? 'arrow.uturn.backward' : 'xmark.circle',
            destructive: !item.isWithdrawn,
            attributes: {
                destructive: !item.isWithdrawn,
            },
        },
        {
            title: 'Delete',
            systemIcon: 'trash',
            destructive: true,
            attributes: {
                destructive: true,
            },
        },
    ];

    const selectedAnnouncement = useMemo(() => {
        if (!selectedAnnouncementId) return null;
        return announcements.find((a) => a.id === selectedAnnouncementId) || null;
    }, [announcements, selectedAnnouncementId]);

    if (isDesktopWeb) {
        return (
            <View style={[styles.screen, { backgroundColor: paneBgColor }]}>
                <Stack.Screen
                    options={{
                        title: 'Announcement History',
                        headerTintColor: textColor,
                        headerShadowVisible: false,
                        headerStyle: {
                            backgroundColor: paneBgColor,
                        },
                        headerLeft: () => (
                            <View style={{ marginLeft: 12, marginRight: 10 }}>
                                <HeaderCircleButton
                                    type="back"
                                    isDark={isDark}
                                    onPress={() => router.back()}
                                />
                            </View>
                        ),
                        headerRight: () => (
                            <View style={{ marginRight: 16 }}>
                                <HeaderCircleButton
                                    type="custom"
                                    iconName="plus"
                                    tintColor="#FFFFFF"
                                    style={{ backgroundColor: '#007AFF' }}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowCreateSheet(true);
                                    }}
                                />
                            </View>
                        ),
                    }}
                />

                <View style={styles.desktopSplitRoot}>
                    {/* Left Pane: Master List */}
                    <View style={[styles.desktopSplitLeft, { borderRightColor: borderColor, backgroundColor: paneBgColor }]}>
                        <View style={styles.desktopFiltersWrap}>
                            <SwiftUISearchBar
                                placeholder="Search announcements..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onClear={() => setSearchQuery('')}
                                isDark={isDark}
                                showClearButton={true}
                            />
                            <SegmentedControl
                                segments={STATUS_SEGMENTS}
                                activeSegment={statusFilter}
                                onSegmentChange={setStatusFilter}
                                fullWidth
                            />
                        </View>

                        <ScrollView
                            style={styles.desktopScrollList}
                            contentContainerStyle={styles.desktopScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {filteredAnnouncements.length === 0 ? (
                                <View style={[styles.emptyContainer, isDark ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.emptyIconCircle}>
                                        <PlatformIcon name="clock.arrow.circlepath" size={28} tintColor="#007AFF" />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor }]}>
                                        No Announcements
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                        {searchQuery ? 'Try adjusting your search' : 'No announcements in this view.'}
                                    </Text>
                                </View>
                            ) : (
                                filteredAnnouncements.map((item) => {
                                    const conf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;
                                    const isSelected = selectedAnnouncementId === item.id;

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedAnnouncementId(isSelected ? null : item.id);
                                            }}
                                            style={[
                                                styles.itemCard,
                                                isDark ? styles.cardDark : styles.cardLight,
                                                isSelected && {
                                                    borderColor: formaBlue,
                                                    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : '#EFF6FF',
                                                },
                                            ]}
                                        >
                                            <View style={styles.itemCardInner}>
                                                <View style={styles.itemHeaderRow}>
                                                    <View style={[styles.templateIconSquircle, { backgroundColor: conf.gradient[0] }]}>
                                                        <PlatformIcon name={conf.icon as any} size={15} tintColor="#FFFFFF" />
                                                    </View>
                                                    <View style={styles.templatePill}>
                                                        <Text style={[styles.templatePillText, { color: conf.gradient[0] }]}>
                                                            {conf.label}
                                                        </Text>
                                                    </View>
                                                    {item.isFeatured && (
                                                        <View style={styles.featuredBadge}>
                                                            <PlatformIcon name="pin.fill" size={11} tintColor="#007AFF" />
                                                            <Text style={styles.featuredBadgeText}>PINNED</Text>
                                                        </View>
                                                    )}
                                                    {item.isWithdrawn && (
                                                        <View style={styles.withdrawnBadge}>
                                                            <Text style={styles.withdrawnBadgeText}>WITHDRAWN</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {!!item.duration && (
                                                    <Text style={styles.itemDuration}>{item.duration}</Text>
                                                )}

                                                <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                                                    {item.title}
                                                </Text>

                                                {!!item.subtitle && (
                                                    <Text style={[styles.itemSubtitle, { color: subtextColor }]} numberOfLines={2}>
                                                        {item.subtitle}
                                                    </Text>
                                                )}

                                                <View style={styles.itemFooterRow}>
                                                    <Text style={styles.itemAuthorText} numberOfLines={1}>
                                                        By {item.authorName || 'Broadcast Admin'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>

                    {/* Right Pane: Inspector */}
                    <View style={styles.desktopSplitRight}>
                        {selectedAnnouncement ? (
                            <AnnouncementDetailPane
                                announcement={selectedAnnouncement}
                                onClose={() => setSelectedAnnouncementId(null)}
                                onUpdated={loadData}
                            />
                        ) : (
                            <View style={styles.detailEmptyPlaceholder}>
                                <View style={[styles.emptyIconCircle, { width: 56, height: 56, borderRadius: 28 }]}>
                                    <PlatformIcon name="megaphone.fill" size={26} tintColor={isDark ? '#48484A' : '#C7C7CC'} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: textColor }]}>
                                    Select an Announcement
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                    Choose an announcement from the list on the left to inspect its full content and documents.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <CreateAnnouncementSheet
                    visible={showCreateSheet}
                    onClose={() => setShowCreateSheet(false)}
                    onSuccess={loadData}
                />
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen
                options={{
                    title: 'Announcement History',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerShadowVisible: false,
                    headerTintColor: textColor,
                    headerStyle: {
                        backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7'),
                    },
                    ...(Platform.OS === 'ios' ? { headerBackground: () => null } : {}),
                    headerRight: () => (
                        <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderToolbar
                                actions={[
                                    {
                                        id: 'create',
                                        icon: 'add-outline',
                                        image: 'plus',
                                        title: 'New Announcement',
                                        tintColor: '#007AFF',
                                        onPress: () => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setShowCreateSheet(true);
                                        },
                                    },
                                ]}
                                isDark={isDark}
                                textColor={textColor}
                                maxDirectActions={1}
                            />
                        </View>
                    ),
                }}
            />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: Platform.OS === 'ios' ? 12 : 14,
                        paddingBottom: insets.bottom + 96,
                    }
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                    />
                }
            >
                {/* Announcement Cards List */}
                {filteredAnnouncements.length === 0 ? (
                    <View style={[styles.emptyContainer, isDark ? styles.cardDark : styles.cardLight]}>
                        <View style={styles.emptyIconCircle}>
                            <PlatformIcon name="clock.arrow.circlepath" size={30} tintColor="#007AFF" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            No Announcements Found
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery
                                ? 'No results match your search and filter criteria.'
                                : 'There are no announcements recorded in this range.'}
                        </Text>
                        <BouncyGlassButton
                            title="New Announcement"
                            icon="plus"
                            isDark={isDark}
                            onPress={() => setShowCreateSheet(true)}
                        />
                    </View>
                ) : (
                    <View style={styles.cardsList}>
                        {filteredAnnouncements.map((item) => {
                            const conf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;
                            const isWithdrawn = item.isWithdrawn;

                            return (
                                <ContextMenu
                                    key={item.id}
                                    actions={getCardContextMenuActions(item)}
                                    onPress={async (e) => {
                                        const idx = e.nativeEvent.index;
                                        if (idx === 0) {
                                            router.push(`/announcement-detail?id=${item.id}` as any);
                                        } else if (idx === 1) {
                                            Haptics.selectionAsync();
                                            const tenantId = item.tenantId || activeTenant?.id;
                                            if (item.isFeatured) {
                                                await unpinAnnouncement(item.id, tenantId);
                                            } else {
                                                await pinAnnouncement(item.id, tenantId);
                                            }
                                            await loadData();
                                        } else if (idx === 2) {
                                            handleWithdraw(item);
                                        } else if (idx === 3) {
                                            handleDelete(item);
                                        }
                                    }}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.82}
                                        onPress={() => router.push(`/announcement-detail?id=${item.id}` as any)}
                                        style={[
                                            styles.historyItemCard,
                                            isDark ? styles.cardDark : styles.cardLight,
                                            isWithdrawn && { opacity: 0.75 }
                                        ]}
                                    >
                                        {/* Top Template Banner Strip */}
                                        <LinearGradient
                                            colors={isWithdrawn ? ['#64748B', '#475569'] : conf.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.itemCardBanner}
                                        >
                                            <View style={styles.bannerLeftRow}>
                                                <View style={styles.bannerIconBox}>
                                                    <PlatformIcon
                                                        name={conf.icon as any}
                                                        size={14}
                                                        tintColor="#FFFFFF"
                                                    />
                                                </View>
                                                <Text style={styles.bannerCategoryText}>
                                                    {conf.label}
                                                </Text>
                                            </View>

                                            <View style={styles.bannerRightRow}>
                                                {isWithdrawn ? (
                                                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(239,68,68,0.3)' }]}>
                                                        <Text style={styles.statusBadgeText}>Withdrawn</Text>
                                                    </View>
                                                ) : item.isFeatured ? (
                                                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                                                        <PlatformIcon name="pin.fill" size={10} tintColor="#FFFFFF" />
                                                        <Text style={styles.statusBadgeText}>Pinned</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </LinearGradient>

                                        {/* Card Content Body */}
                                        <View style={styles.itemCardBody}>
                                            <View style={styles.itemMetaHeader}>
                                                <Text style={styles.itemDurationText}>
                                                    {item.duration}
                                                </Text>
                                                {item.targetDepartment && (
                                                    <Text style={styles.itemDeptText}>
                                                        • {item.targetDepartment}
                                                    </Text>
                                                )}
                                            </View>

                                            <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                                                {item.title}
                                            </Text>

                                            {item.subtitle ? (
                                                <Text style={[styles.itemSubtitle, { color: subtextColor }]} numberOfLines={2}>
                                                    {item.subtitle}
                                                </Text>
                                            ) : null}

                                            {/* Footer Info: Author, Posted at & Docs count */}
                                            <View style={styles.itemFooterRow}>
                                                <Text style={styles.itemAuthorText} numberOfLines={1}>
                                                    By {item.authorName || 'Broadcast Admin'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                                </Text>
                                                {item.documents && item.documents.length > 0 && (
                                                    <View style={styles.docsCountBadge}>
                                                        <PlatformIcon name="paperclip" size={11} tintColor={subtextColor} />
                                                        <Text style={[styles.docsCountText, { color: subtextColor }]}>
                                                            {item.documents.length}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Floating Bottom 3-Capsule Toolbar (Search + Sort + Filter) */}
            <Animated.View
                style={[
                    styles.floatingBottomContainer,
                    {
                        bottom: Animated.add(keyboardOffset, baseBottom),
                    },
                ]}
            >
                {/* 1. Search Capsule */}
                <View style={styles.searchCapsuleWrapper}>
                    {Platform.OS === 'ios' ? (
                        <View style={styles.iosCapsuleFrame}>
                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer
                                    modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' }),
                                    ]}
                                >
                                    <SwiftUIHStack alignment="center" modifiers={[frame({ height: 44 })]}>
                                        <SwiftUISpacer />
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </Host>
                            <View style={styles.searchCapsuleInner}>
                                <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    placeholder="Search..."
                                    placeholderTextColor={subtextColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    clearButtonMode="never"
                                    autoCapitalize="none"
                                />
                                {(searchQuery.length > 0 || isSearching) && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSearchQuery('');
                                            setIsSearchFocused(false);
                                            Keyboard.dismiss();
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.cancelSearchBtn}
                                    >
                                        <PlatformIcon name="xmark.circle.fill" size={16} tintColor={isDark ? '#636366' : '#8E8E93'} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <GlassEffectContainer borderRadius={22}>
                            <View
                                style={[
                                    styles.searchCapsuleInner,
                                    isDark ? styles.capsuleDark : styles.capsuleLight,
                                ]}
                            >
                                <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    placeholder="Search..."
                                    placeholderTextColor={subtextColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    clearButtonMode="never"
                                    autoCapitalize="none"
                                />
                                {(searchQuery.length > 0 || isSearching) && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSearchQuery('');
                                            setIsSearchFocused(false);
                                            Keyboard.dismiss();
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.cancelSearchBtn}
                                    >
                                        <PlatformIcon name="xmark.circle.fill" size={16} tintColor={isDark ? '#636366' : '#8E8E93'} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </GlassEffectContainer>
                    )}
                </View>

                {/* 2. Sort & Filter Circles (Hidden during search) */}
                {!isSearching && (
                    <>
                        {/* Sort Circle (Native Context Menu) */}
                        <ContextMenu
                            actions={sortActions}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const idx = e.nativeEvent.index;
                                if (idx >= 0 && idx < TIME_SORT_OPTIONS.length) {
                                    setTimeSortIndex(idx);
                                }
                            }}
                        >
                            {Platform.OS === 'ios' ? (
                                <View style={styles.iosCircleFrame}>
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer
                                            modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' }),
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                    <View style={styles.circleBtnInner}>
                                        <PlatformIcon
                                            name="arrow.up.arrow.down"
                                            size={15}
                                            tintColor={timeSortIndex !== 0 ? (isDark ? '#0A84FF' : '#007AFF') : textColor}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <GlassEffectContainer borderRadius={22}>
                                    <View
                                        style={[
                                            styles.circleBtnInner,
                                            isDark ? styles.capsuleDark : styles.capsuleLight,
                                        ]}
                                    >
                                        <PlatformIcon
                                            name="arrow.up.arrow.down"
                                            size={15}
                                            tintColor={timeSortIndex !== 0 ? (isDark ? '#0A84FF' : '#007AFF') : textColor}
                                        />
                                    </View>
                                </GlassEffectContainer>
                            )}
                        </ContextMenu>

                        {/* Filter Circle (Native Context Menu) */}
                        <ContextMenu
                            actions={filterActions}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const opt = STATUS_FILTER_OPTIONS[e.nativeEvent.index];
                                if (opt) setStatusFilter(opt.id);
                            }}
                        >
                            {Platform.OS === 'ios' ? (
                                <View style={styles.iosCircleFrame}>
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer
                                            modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' }),
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                    <View style={styles.circleBtnInner}>
                                        <PlatformIcon
                                            name="line.3.horizontal.decrease"
                                            size={15}
                                            tintColor={statusFilter !== 'ALL' ? (isDark ? '#0A84FF' : '#007AFF') : textColor}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <GlassEffectContainer borderRadius={22}>
                                    <View
                                        style={[
                                            styles.circleBtnInner,
                                            isDark ? styles.capsuleDark : styles.capsuleLight,
                                        ]}
                                    >
                                        <PlatformIcon
                                            name="line.3.horizontal.decrease"
                                            size={15}
                                            tintColor={statusFilter !== 'ALL' ? (isDark ? '#0A84FF' : '#007AFF') : textColor}
                                        />
                                    </View>
                                </GlassEffectContainer>
                            )}
                        </ContextMenu>
                    </>
                )}
            </Animated.View>

            <CreateAnnouncementSheet
                visible={showCreateSheet}
                onClose={() => setShowCreateSheet(false)}
                onSuccess={() => {
                    loadData();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        gap: 12,
    },
    floatingBottomContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 100,
    },
    searchCapsuleWrapper: {
        flex: 1,
    },
    iosCapsuleFrame: {
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    iosCircleFrame: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchCapsuleInner: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        padding: 0,
    },
    cancelSearchBtn: {
        paddingLeft: 4,
        paddingRight: 2,
        justifyContent: 'center',
    },
    circleBtnInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    capsuleLight: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    capsuleDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardsList: {
        gap: 12,
        marginTop: 4,
    },
    historyItemCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    cardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    itemCardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopLeftRadius: 17,
        borderTopRightRadius: 17,
    },
    bannerLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    bannerIconBox: {
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerCategoryText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    bannerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    itemCardBody: {
        padding: 14,
        gap: 5,
    },
    itemMetaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itemDurationText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#007AFF',
    },
    itemDeptText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8E8E93',
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 19,
    },
    itemSubtitle: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    itemFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    itemAuthorText: {
        fontSize: 11.5,
        color: '#8E8E93',
        flex: 1,
        marginRight: 8,
    },
    docsCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    docsCountText: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 28,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 20,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
    },
    emptyIconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(0, 122, 255,0.1)',
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
    emptyCtaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 18,
        marginTop: 6,
    },
    emptyCtaBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    bouncyGlassWrapper: {
        marginTop: 10,
        borderRadius: 22,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    bouncyGlassBtn: {
        backgroundColor: '#007AFF',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    bouncyGlassContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    bouncyGlassText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    // Desktop Master-Detail Layout Styles
    desktopSplitRoot: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    desktopSplitLeft: {
        flex: 1.1,
        minWidth: 340,
        maxWidth: 540,
        borderRightWidth: 1,
    },
    desktopSplitRight: {
        flex: 2,
        position: 'relative',
    },
    desktopFiltersWrap: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        gap: 10,
    },
    desktopScrollList: {
        flex: 1,
    },
    desktopScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 60,
        gap: 10,
    },
    detailEmptyPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 10,
    },
});
