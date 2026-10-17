import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import useAccessControl from '@/hooks/useAccessControl';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    RefreshControl,
    Platform,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { generateAmbientInsights, AmbientInsight } from '@/lib/briefIntelligence';
import {
    Announcement,
    ANNOUNCEMENT_TEMPLATES,
    getAnnouncements,
    formatPostedAt,
} from '@/lib/announcements';
import { CreateAnnouncementSheet } from '@/components/home/CreateAnnouncementSheet';
import { AnnouncementDetailPane } from '@/components/home/AnnouncementDetailPane';

export default function BriefDetailScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const paneBgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const formaBlue = isDark ? '#4D82FF' : '#007AFF';

    const { attendanceStatus, todaySessions, refreshAttendance } = useUserContext();
    const { tenantRole, isSuperAdmin, activeTenant } = useTenantContext();

    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

    const { permissions, can } = useAccessControl();
    const isManager = permissions
        ? can('can_manage_people')
        : isSuperAdmin || ['admin', 'superadmin', 'administrator', 'hr', 'management', 'supervisor', 'manager', 'pm'].includes((tenantRole || '').toLowerCase());

    const loadAnnouncements = useCallback(async () => {
        try {
            const list = await getAnnouncements(false, activeTenant?.id);
            setAnnouncements(list);
        } catch {
            // silent
        }
    }, [activeTenant?.id]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    useFocusEffect(
        useCallback(() => {
            loadAnnouncements();
        }, [loadAnnouncements])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Promise.all([
                refreshAttendance?.(),
                loadAnnouncements(),
            ]);
        } catch {
            // silent
        } finally {
            setRefreshing(false);
        }
    }, [refreshAttendance, loadAnnouncements]);

    const workedDurationMs = useMemo(() => {
        if (attendanceStatus !== 'checked-in' || !todaySessions || todaySessions.length === 0) {
            return 0;
        }
        const first = todaySessions[0];
        if (!first?.clockIn) return 0;
        const start = new Date(first.clockIn).getTime();
        return Math.max(0, Date.now() - start);
    }, [attendanceStatus, todaySessions]);

    const allInsights = useMemo<AmbientInsight[]>(() => {
        const now = new Date();
        const hour = now.getHours();

        return generateAmbientInsights({
            hour,
            attendanceStatus: attendanceStatus || 'checked-out',
            workedDurationMs,
            isManager,
            projectName: 'Precision Gym',
        });
    }, [attendanceStatus, workedDurationMs, isManager]);

    const todayInsights = useMemo(() => allInsights.filter(i => i.horizon === 'today'), [allInsights]);
    const yesterdayInsights = useMemo(() => allInsights.filter(i => i.horizon === 'yesterday'), [allInsights]);
    const tomorrowInsights = useMemo(() => allInsights.filter(i => i.horizon === 'tomorrow'), [allInsights]);

    const cardGradientColors = isDark
        ? ['#1C1C1E', '#161618'] as [string, string]
        : ['#FFFFFF', '#FAFBFD'] as [string, string];

    const currentHour = new Date().getHours();
    const contextualEmptyState = useMemo(() => {
        const isEarlyMorning = currentHour >= 5 && currentHour < 11;
        const isEvening = currentHour >= 18 || currentHour < 4;

        if (isEarlyMorning && attendanceStatus !== 'checked-in') {
            return {
                icon: 'sun.min.fill',
                title: 'Your day is just getting started',
                subtitle: 'Brief will update as activity comes in.',
                iconTint: '#007AFF',
                iconBg: 'rgba(0, 122, 255, 0.08)',
            };
        }

        if (isEvening) {
            return {
                icon: 'checkmark.circle.fill',
                title: 'Nothing carried over',
                subtitle: 'Today wrapped up cleanly.',
                iconTint: '#007AFF',
                iconBg: 'rgba(0, 122, 255, 0.08)',
            };
        }

        return {
            icon: 'checkmark.circle.fill',
            title: 'All clear for now',
            subtitle: 'Nothing unusual across your workday.',
            iconTint: '#007AFF',
            iconBg: 'rgba(0, 122, 255, 0.08)',
        };
    }, [currentHour, attendanceStatus]);

    const activeAnnouncements = useMemo(() => {
        return announcements.filter(a => !a.isWithdrawn);
    }, [announcements]);

    const selectedAnnouncement = useMemo(() => {
        if (!selectedAnnouncementId) return null;
        return announcements.find(a => a.id === selectedAnnouncementId) || null;
    }, [announcements, selectedAnnouncementId]);

    const handleAnnouncementClick = (item: Announcement) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isDesktopWeb) {
            if (selectedAnnouncementId === item.id) {
                setSelectedAnnouncementId(null);
            } else {
                setSelectedAnnouncementId(item.id);
            }
        } else {
            router.push({
                pathname: '/announcement-detail' as any,
                params: { id: item.id },
            });
        }
    };

    const renderHorizonSection = (title: string, insights: AmbientInsight[]) => {
        if (insights.length === 0) return null;

        return (
            <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight]}>
                    {title}
                </Text>

                <View style={[
                    styles.cardContainer,
                    isDark ? styles.cardDark : styles.cardLight
                ]}>
                    <LinearGradient
                        colors={cardGradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        {insights.map((item, index) => {
                            const isLast = index === insights.length - 1;

                            return (
                                <View key={item.id}>
                                    <View style={styles.row}>
                                        {/* Module Icon Squircle */}
                                        <LinearGradient
                                            colors={item.gradient || [item.color, item.color]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.iconBox}
                                        >
                                            <PlatformIcon
                                                name={item.icon as any}
                                                size={17}
                                                tintColor="#FFFFFF"
                                            />
                                        </LinearGradient>

                                        {/* Content */}
                                        <View style={styles.contentCol}>
                                            <Text style={[styles.moduleName, { color: item.color }]}>
                                                {item.moduleName}
                                            </Text>
                                            <Text style={[styles.primaryText, { color: textColor }]}>
                                                {item.primaryText}
                                                {item.secondaryText ? (
                                                    <Text style={isDark ? styles.secondaryTextDark : styles.secondaryTextLight}>
                                                        {' '}{item.secondaryText}
                                                    </Text>
                                                ) : null}
                                            </Text>
                                        </View>
                                    </View>

                                    {!isLast && (
                                        <View style={[
                                            styles.divider,
                                            isDark ? styles.dividerDark : styles.dividerLight
                                        ]} />
                                    )}
                                </View>
                            );
                        })}
                    </LinearGradient>
                </View>
            </View>
        );
    };

    const renderInsightsColumn = () => (
        <View style={styles.columnWrap}>
            {renderHorizonSection('Today', todayInsights)}
            {renderHorizonSection('Yesterday', yesterdayInsights)}
            {renderHorizonSection('Tomorrow', tomorrowInsights)}

            {allInsights.length === 0 && (
                <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight]}>
                        Insights
                    </Text>
                    <View style={[styles.emptyStateCard, isDark ? styles.cardDark : styles.cardLight]}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: contextualEmptyState.iconBg }]}>
                            <PlatformIcon
                                name={contextualEmptyState.icon as any}
                                size={20}
                                tintColor={contextualEmptyState.iconTint}
                            />
                        </View>
                        <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                            {contextualEmptyState.title}
                        </Text>
                        <Text style={[styles.emptyStateSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                            {contextualEmptyState.subtitle}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );

    const renderAnnouncementsList = (isCompact = false) => (
        <View style={styles.columnWrap}>
            <View style={styles.historySectionHeader}>
                <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight, { marginLeft: 0 }]}>
                    Recent Announcements
                </Text>
                <TouchableOpacity
                    style={styles.historyLinkRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(isDesktopWeb ? ('/(tabs)/home/announcement-history' as any) : ('/announcement-history' as any))}
                >
                    <Text style={[styles.historyLinkText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
                        History
                    </Text>
                    <PlatformIcon
                        name="chevron.right"
                        size={13}
                        tintColor={isDark ? '#71717A' : '#94A3B8'}
                    />
                </TouchableOpacity>
            </View>

            {activeAnnouncements.length > 0 ? (
                <View style={styles.announcementsVerticalStack}>
                    {activeAnnouncements.map((item) => {
                        const itemConf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;
                        const isSelected = selectedAnnouncementId === item.id;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleAnnouncementClick(item)}
                                activeOpacity={0.82}
                                style={[
                                    styles.desktopHistoryCard,
                                    isDark ? styles.historyCardDark : styles.historyCardLight,
                                    isSelected && {
                                        borderColor: formaBlue,
                                        backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : '#EFF6FF',
                                    },
                                ]}
                            >
                                {/* Card Top Banner Strip */}
                                <LinearGradient
                                    colors={itemConf.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.historyCardBanner}
                                >
                                    <View style={styles.historyCardIconSquircle}>
                                        <PlatformIcon
                                            name={itemConf.icon as any}
                                            size={15}
                                            tintColor="#FFFFFF"
                                        />
                                    </View>
                                    <View style={styles.historyCardCategoryPill}>
                                        <Text style={styles.historyCardCategoryText}>
                                            {itemConf.label}
                                        </Text>
                                    </View>
                                </LinearGradient>

                                {/* Card Body */}
                                <View style={styles.historyCardBody}>
                                    {!!item.duration && (
                                        <Text style={styles.historyCardDuration}>
                                            {item.duration}
                                        </Text>
                                    )}
                                    <Text
                                        style={[styles.historyCardTitle, { color: textColor }]}
                                        numberOfLines={2}
                                    >
                                        {item.title}
                                    </Text>
                                    {!!item.subtitle && (
                                        <Text
                                            style={[styles.historyCardSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}
                                            numberOfLines={2}
                                        >
                                            {item.subtitle}
                                        </Text>
                                    )}
                                    <Text style={styles.historyCardAuthor} numberOfLines={1}>
                                        By {item.authorName || 'Broadcast Team'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : (
                <View style={styles.emptyAnnouncementsWrapper}>
                    <View style={[styles.emptyStateCard, isDark ? styles.cardDark : styles.cardLight]}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.08)' }]}>
                            <PlatformIcon
                                name="megaphone.fill"
                                size={22}
                                tintColor="#007AFF"
                            />
                        </View>
                        <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                            No recent announcements
                        </Text>
                        <Text style={[styles.emptyStateSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                            New workspace updates will appear here.
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: paneBgColor }]}>
            <Stack.Screen
                options={{
                    title: 'Daily Brief',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerStyle: {
                        backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7'),
                    },
                    ...(Platform.OS === 'ios' ? { headerBackground: () => null } : {}),
                    headerLeft: Platform.OS !== 'ios' ? () => (
                        <View style={{ marginLeft: Platform.OS === 'web' ? 12 : 0, marginRight: 10 }}>
                            <HeaderCircleButton
                                type="back"
                                isDark={isDark}
                                onPress={() => router.back()}
                            />
                        </View>
                    ) : undefined,
                    headerRight: isManager ? () => (
                        <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderCircleButton
                                type="custom"
                                iconName="plus"
                                tintColor="#FFFFFF"
                                style={{ backgroundColor: '#007AFF' }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowCreateModal(true);
                                }}
                            />
                        </View>
                    ) : undefined,
                }}
            />

            {/* Desktop Web Layout */}
            {isDesktopWeb ? (
                selectedAnnouncement ? (
                    // Master-Detail Mode
                    <View style={styles.splitRoot}>
                        {/* Left Pane: Master List */}
                        <View style={[styles.splitLeftPane, { borderRightColor: borderColor }]}>
                            <View style={styles.splitListHeader}>
                                <TouchableOpacity
                                    onPress={() => setSelectedAnnouncementId(null)}
                                    activeOpacity={0.7}
                                    style={styles.backToOverviewBtn}
                                >
                                    <PlatformIcon name="chevron.left" size={14} tintColor={formaBlue} />
                                    <Text style={[styles.backToOverviewText, { color: formaBlue }]}>Overview</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.splitLeftScroll}
                                contentContainerStyle={styles.splitLeftContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {renderInsightsColumn()}
                                {renderAnnouncementsList(true)}
                            </ScrollView>
                        </View>

                        {/* Right Pane: Embedded Announcement Detail Inspector */}
                        <View style={styles.splitRightPane}>
                            <AnnouncementDetailPane
                                announcement={selectedAnnouncement}
                                onClose={() => setSelectedAnnouncementId(null)}
                                onUpdated={loadAnnouncements}
                            />
                        </View>
                    </View>
                ) : (
                    // Overview 2-Column Split Mode (50% Insights, 50% Announcements)
                    <ScrollView
                        style={styles.desktopOverviewScroll}
                        contentContainerStyle={styles.desktopOverviewContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={isDark ? '#FFFFFF' : '#000000'}
                            />
                        }
                    >
                        <View style={styles.twoColumnGrid}>
                            <View style={styles.gridColumn}>
                                {renderInsightsColumn()}
                            </View>
                            <View style={styles.gridColumn}>
                                {renderAnnouncementsList(false)}
                            </View>
                        </View>
                    </ScrollView>
                )
            ) : (
                // Mobile / Small Screen Vertical List
                <ScrollView
                    contentInsetAdjustmentBehavior="automatic"
                    style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: Platform.OS === 'ios' ? 8 : 14,
                            paddingBottom: insets.bottom + 80,
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
                    {renderHorizonSection('Today', todayInsights)}
                    {renderHorizonSection('Yesterday', yesterdayInsights)}
                    {renderHorizonSection('Tomorrow', tomorrowInsights)}

                    {allInsights.length === 0 && (
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight]}>
                                Insights
                            </Text>
                            <View style={[styles.emptyStateCard, isDark ? styles.cardDark : styles.cardLight]}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: contextualEmptyState.iconBg }]}>
                                    <PlatformIcon
                                        name={contextualEmptyState.icon as any}
                                        size={20}
                                        tintColor={contextualEmptyState.iconTint}
                                    />
                                </View>
                                <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                                    {contextualEmptyState.title}
                                </Text>
                                <Text style={[styles.emptyStateSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                    {contextualEmptyState.subtitle}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Mobile Recent Announcements Carousel */}
                    <View style={styles.historySection}>
                        <View style={styles.historySectionHeader}>
                            <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight, { marginLeft: 0 }]}>
                                Recent Announcements
                            </Text>
                            <TouchableOpacity
                                style={styles.historyLinkRow}
                                activeOpacity={0.7}
                                onPress={() => router.push(isDesktopWeb ? ('/(tabs)/home/announcement-history' as any) : ('/announcement-history' as any))}
                            >
                                <Text style={[styles.historyLinkText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
                                    History
                                </Text>
                                <PlatformIcon
                                    name="chevron.right"
                                    size={13}
                                    tintColor={isDark ? '#71717A' : '#94A3B8'}
                                />
                            </TouchableOpacity>
                        </View>

                        {activeAnnouncements.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.historyCardsScroll}
                            >
                                {activeAnnouncements.map((item) => {
                                    const itemConf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleAnnouncementClick(item)}
                                            activeOpacity={0.82}
                                            style={[
                                                styles.historyCard,
                                                isDark ? styles.historyCardDark : styles.historyCardLight
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={itemConf.gradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.historyCardBanner}
                                            >
                                                <View style={styles.historyCardIconSquircle}>
                                                    <PlatformIcon
                                                        name={itemConf.icon as any}
                                                        size={15}
                                                        tintColor="#FFFFFF"
                                                    />
                                                </View>
                                                <View style={styles.historyCardCategoryPill}>
                                                    <Text style={styles.historyCardCategoryText}>
                                                        {itemConf.label}
                                                    </Text>
                                                </View>
                                            </LinearGradient>

                                            <View style={styles.historyCardBody}>
                                                {!!item.duration && (
                                                    <Text style={styles.historyCardDuration}>
                                                        {item.duration}
                                                    </Text>
                                                )}
                                                <Text
                                                    style={[styles.historyCardTitle, { color: textColor }]}
                                                    numberOfLines={2}
                                                >
                                                    {item.title}
                                                </Text>
                                                {!!item.subtitle && (
                                                    <Text
                                                        style={[styles.historyCardSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}
                                                        numberOfLines={2}
                                                    >
                                                        {item.subtitle}
                                                    </Text>
                                                )}
                                                <Text style={styles.historyCardAuthor} numberOfLines={1}>
                                                    By {item.authorName || 'Broadcast Team'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyAnnouncementsWrapper}>
                                <View style={[styles.emptyStateCard, isDark ? styles.cardDark : styles.cardLight]}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.08)' }]}>
                                        <PlatformIcon
                                            name="megaphone.fill"
                                            size={22}
                                            tintColor="#007AFF"
                                        />
                                    </View>
                                    <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                                        No recent announcements
                                    </Text>
                                    <Text style={[styles.emptyStateSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                        New workspace updates will appear here.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            <CreateAnnouncementSheet
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    onRefresh();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : 16,
        gap: 24,
    },
    // Desktop Overview Layout
    desktopOverviewScroll: {
        flex: 1,
    },
    desktopOverviewContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 80,
    },
    twoColumnGrid: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 24,
        width: '100%',
    },
    gridColumn: {
        flex: 1,
        minWidth: 0,
    },
    columnWrap: {
        gap: 16,
    },
    announcementsVerticalStack: {
        gap: 12,
    },
    desktopHistoryCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            },
        }),
    },
    // Master-Detail Split Root
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backToOverviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    backToOverviewText: {
        fontSize: 14,
        fontWeight: '600',
    },
    splitLeftScroll: {
        flex: 1,
    },
    splitLeftContent: {
        paddingHorizontal: 16,
        paddingBottom: 60,
        gap: 20,
    },
    splitRightPane: {
        flex: 2,
        position: 'relative',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginLeft: 4,
        opacity: 0.5,
    },
    sectionHeadingLight: {
        color: '#64748B',
    },
    sectionHeadingDark: {
        color: '#94A3B8',
    },
    cardContainer: {
        borderRadius: 20,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    cardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    cardGradient: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 13,
        paddingHorizontal: 15,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 13,
        marginTop: 1,
    },
    contentCol: {
        flex: 1,
        gap: 2,
    },
    moduleName: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    primaryText: {
        fontSize: 14.5,
        lineHeight: 20,
        fontWeight: '500',
        letterSpacing: -0.15,
    },
    secondaryTextLight: {
        color: '#64748B',
        fontWeight: '400',
    },
    secondaryTextDark: {
        color: '#94A3B8',
        fontWeight: '400',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
    dividerLight: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    dividerDark: {
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    subtitleLight: {
        color: '#64748B',
    },
    subtitleDark: {
        color: '#A1A1AA',
    },
    historySection: {
        gap: 12,
        marginTop: 4,
    },
    historySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    historyLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    historyLinkText: {
        fontSize: 13,
        fontWeight: '500',
    },
    historyCardsScroll: {
        gap: 12,
        paddingRight: 16,
    },
    historyCard: {
        width: 250,
        borderRadius: 18,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    historyCardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    historyCardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    historyCardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    historyCardIconSquircle: {
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyCardCategoryPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    historyCardCategoryText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    historyCardBody: {
        padding: 14,
        gap: 5,
    },
    historyCardDuration: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8E8E93',
    },
    historyCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
        letterSpacing: -0.2,
    },
    historyCardSubtitle: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    historyCardAuthor: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 2,
    },
    emptyAnnouncementsWrapper: {
        paddingHorizontal: 0,
    },
    emptyStateCard: {
        borderRadius: 20,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
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
    emptyIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    emptyStateTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 12.5,
        textAlign: 'center',
        lineHeight: 17,
        maxWidth: 270,
    },
});
