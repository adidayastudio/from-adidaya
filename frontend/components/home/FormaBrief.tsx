import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { generateAmbientInsights, getHomeTopInsights, AmbientInsight } from '@/lib/briefIntelligence';
import {
    Announcement,
    AnnouncementTemplateKey,
    ANNOUNCEMENT_TEMPLATES,
    getAnnouncements,
    getHomeActiveAnnouncement,
    isAnnouncementExpired,
    subscribeToAnnouncements,
} from '@/lib/announcements';

const VIBRANT_GRADIENTS: Record<AnnouncementTemplateKey, [string, string, string]> = {
    general: ['#007AFF', '#1A56FF', '#437BFF'],
    holiday: ['#0D9488', '#0EA5C6', '#22D3EE'],
    site_visit: ['#C2410C', '#EA580C', '#F59E0B'],
    system_update: ['#1E40AF', '#2563EB', '#3B82F6'],
    birthday: ['#BE185D', '#DB2777', '#F472B6'],
    policy_hr: ['#3730A3', '#4F46E5', '#6366F1'],
    important_notice: ['#B45309', '#D97706', '#F59E0B'],
    urgent_alert: ['#B91C1C', '#DC2626', '#EF4444'],
    custom: ['#8B5CF6', '#9333EA', '#A855F7'],
};

interface BriefEmptyStateConfig {
    icon: string;
    title: string;
    subtitle: string;
    iconTint: string;
    iconBg: string;
}

function getContextualBriefEmptyState(hour: number, attendanceStatus?: string | null): BriefEmptyStateConfig {
    const isEarlyMorning = hour >= 5 && hour < 11;
    const isEvening = hour >= 18 || hour < 4;

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

    // Default: ALL CLEAR during the day
    return {
        icon: 'checkmark.circle.fill',
        title: 'All clear for now',
        subtitle: 'Nothing unusual across your workday.',
        iconTint: '#007AFF',
        iconBg: 'rgba(0, 122, 255, 0.08)',
    };
}

export function FormaBrief({ firstCard }: { firstCard?: React.ReactNode }) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { attendanceStatus, todaySessions, isAuthenticated } = useUserContext();
    const { activeTenant, tenantRole, isSuperAdmin } = useTenantContext();

    const [activeList, setActiveList] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const badgeScale = useRef(new Animated.Value(1)).current;
    const cardAnimScale = useRef(new Animated.Value(1)).current;
    const cardAnimOpacity = useRef(new Animated.Value(1)).current;

    const isManager = isSuperAdmin || !!(tenantRole && (
        tenantRole.toLowerCase().includes('admin') ||
        tenantRole.toLowerCase().includes('owner') ||
        tenantRole.toLowerCase().includes('lead') ||
        tenantRole.toLowerCase().includes('manager')
    ));

    const loadAnnouncement = useCallback(async () => {
        try {
            const list = await getAnnouncements(false, activeTenant?.id);
            const active = list.filter(a => !a.isWithdrawn && !isAnnouncementExpired(a));
            const { activeItem, unreadCount: count } = await getHomeActiveAnnouncement(activeTenant?.id);
            setActiveList(active);
            setUnreadCount(count);
            if (activeItem) {
                const idx = active.findIndex(a => a.id === activeItem.id);
                if (idx >= 0) setCurrentIndex(idx);
            }
        } catch {
            // silent
        }
    }, [activeTenant?.id]);

    const featuredAnnouncement = activeList[currentIndex] || activeList[0] || null;

    const handleNextAnnouncement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (activeList.length <= 1) return;

        // Bouncy spring animation on badge
        badgeScale.setValue(0.68);
        Animated.spring(badgeScale, {
            toValue: 1,
            friction: 3,
            tension: 220,
            useNativeDriver: true,
        }).start();

        // Elastic pop animation on card
        Animated.sequence([
            Animated.parallel([
                Animated.timing(cardAnimScale, { toValue: 0.965, duration: 60, useNativeDriver: true }),
                Animated.timing(cardAnimOpacity, { toValue: 0.6, duration: 60, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(cardAnimScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
                Animated.timing(cardAnimOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]),
        ]).start();

        setCurrentIndex(prev => (prev + 1) % activeList.length);
    };

    useEffect(() => {
        loadAnnouncement();
        const unsubscribe = subscribeToAnnouncements(() => {
            loadAnnouncement();
        });
        return () => {
            unsubscribe();
        };
    }, [loadAnnouncement]);

    useFocusEffect(
        useCallback(() => {
            loadAnnouncement();
        }, [loadAnnouncement])
    );

    const workedDurationMs = useMemo(() => {
        if (attendanceStatus !== 'checked-in' || !todaySessions || todaySessions.length === 0) {
            return 0;
        }
        const first = todaySessions[0];
        if (!first?.clockIn) return 0;
        const start = new Date(first.clockIn).getTime();
        return Math.max(0, Date.now() - start);
    }, [attendanceStatus, todaySessions]);

    // Generate ambient work intelligence (2 insights when announcement is visible, up to 3 otherwise)
    const homeInsights = useMemo<AmbientInsight[]>(() => {
        const now = new Date();
        const hour = now.getHours();

        const all = generateAmbientInsights({
            hour,
            attendanceStatus: attendanceStatus || 'checked-out',
            workedDurationMs,
            isManager,
            projectName: 'Precision Gym',
        });

        const top = getHomeTopInsights(all);
        return featuredAnnouncement ? top.slice(0, 2) : top.slice(0, 3);
    }, [attendanceStatus, workedDurationMs, isManager, featuredAnnouncement]);

    const handleOpenDailyBrief = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/home/brief-detail' as any);
    };

    const handleOpenAnnouncement = (ann: Announcement) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/announcement-detail' as any,
            params: { id: ann.id },
        });
    };

    const emptyStateConfig = useMemo(() => {
        const hour = new Date().getHours();
        return getContextualBriefEmptyState(hour, attendanceStatus);
    }, [attendanceStatus]);

    if (!activeTenant || !isAuthenticated) {
        return null;
    }

    const templateConfig = featuredAnnouncement
        ? ANNOUNCEMENT_TEMPLATES[featuredAnnouncement.template] || ANNOUNCEMENT_TEMPLATES.general
        : null;

    const bannerGradients = featuredAnnouncement
        ? VIBRANT_GRADIENTS[featuredAnnouncement.template] || VIBRANT_GRADIENTS.general
        : VIBRANT_GRADIENTS.general;

    const insightGradientColors = isDark
        ? ['#1C1C1E', '#161618'] as [string, string]
        : ['#FFFFFF', '#FAFBFD'] as [string, string];

    return (
        <View style={styles.wrapper}>
            {/* Section Header with Clickable Chevron to Daily Brief */}
            <TouchableOpacity
                onPress={handleOpenDailyBrief}
                activeOpacity={0.7}
                style={styles.sectionHeader}
            >
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: Colors[resolvedTheme].text }]}>
                        Brief
                    </Text>
                    <PlatformIcon
                        name="chevron.right"
                        size={12}
                        tintColor={isDark ? '#8E8E93' : '#8E8E93'}
                    />
                </View>
            </TouchableOpacity>

            <View style={styles.cardsStack}>
                {firstCard}
                {/* 1. Colorful Featured Announcement Banner (Top Layer) */}
                {featuredAnnouncement && templateConfig && (
                    <View style={styles.announcementCardWrapper}>
                        <Animated.View style={{ transform: [{ scale: cardAnimScale }], opacity: cardAnimOpacity }}>
                            <Pressable
                                onPress={() => handleOpenAnnouncement(featuredAnnouncement)}
                                style={({ pressed }) => [
                                    styles.announcementCard,
                                    { transform: [{ scale: pressed ? 0.985 : 1 }] }
                                ]}
                            >
                                {/* Background: Custom Banner Cover or Vibrant Gradient */}
                                {featuredAnnouncement.coverImageUrl ? (
                                    <View style={StyleSheet.absoluteFill}>
                                        <Image
                                            source={{ uri: featuredAnnouncement.coverImageUrl }}
                                            style={StyleSheet.absoluteFill}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                        <LinearGradient
                                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.78)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={bannerGradients}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    >
                                        <View style={styles.decorCircle1} />
                                        <View style={styles.decorCircle2} />
                                    </LinearGradient>
                                )}

                                <View style={styles.announcementGradient}>
                                    {/* Left Content Area */}
                                    <View style={styles.announcementContent}>
                                        {/* Meta Row (Category badge + Duration pill) */}
                                        <View style={styles.announcementMetaRow}>
                                            <View style={styles.categoryPill}>
                                                <PlatformIcon
                                                    name={templateConfig.icon as any}
                                                    size={11.5}
                                                    tintColor="#FFFFFF"
                                                />
                                                <Text style={styles.categoryPillText}>
                                                    {templateConfig.label}
                                                </Text>
                                            </View>

                                            <View style={styles.durationPill}>
                                                <Text style={styles.durationPillText}>
                                                    {featuredAnnouncement.duration}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Title & Subtitle */}
                                        <Text style={styles.announcementHeadline} numberOfLines={2}>
                                            {featuredAnnouncement.title}
                                        </Text>
                                        <Text style={styles.announcementDesc} numberOfLines={2}>
                                            {featuredAnnouncement.subtitle}
                                        </Text>
                                    </View>

                                    {/* Right Floating Circle Icon */}
                                    <View style={styles.announcementRightBox}>
                                        <View style={styles.bigIconSquircle}>
                                            <PlatformIcon
                                                name={templateConfig.icon as any}
                                                size={24}
                                                tintColor="#FFFFFF"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </Pressable>

                            {/* Floating Outer Counter Badge (Only when unread announcements exist) */}
                            {unreadCount > 0 && (
                                <Animated.View style={[styles.cardOuterBadgeWrapper, { transform: [{ scale: badgeScale }] }]}>
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={handleNextAnnouncement}
                                        style={[
                                            styles.cardOuterBadge,
                                            isDark ? styles.cardOuterBadgeDark : styles.cardOuterBadgeLight
                                        ]}
                                    >
                                        <Text style={styles.cardOuterBadgeText}>{unreadCount}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </Animated.View>
                    </View>
                )}

                {/* 2. Daily Brief Insights Card (Bottom Layer) */}
                {homeInsights.length > 0 && (
                    <Pressable
                        onPress={handleOpenDailyBrief}
                        style={({ pressed }) => [
                            styles.insightsCard,
                            isDark ? styles.insightsCardDark : styles.insightsCardLight,
                            { transform: [{ scale: pressed ? 0.985 : 1 }] }
                        ]}
                    >
                        <LinearGradient
                            colors={insightGradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.insightsGradient}
                        >
                            {homeInsights.map((item, index) => {
                                const isLast = index === homeInsights.length - 1;

                                return (
                                    <View key={item.id}>
                                        <View style={styles.insightRow}>
                                            {/* Left Module Icon Squircle (Gradient with white icon) */}
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

                                            {/* Center Content */}
                                            <View style={styles.contentCol}>
                                                <Text style={[styles.moduleLabel, { color: Colors[resolvedTheme].text }]}>
                                                    {item.moduleName}
                                                </Text>
                                                <Text style={[styles.primaryText, isDark ? styles.subtitleDark : styles.subtitleLight]}>
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
                    </Pressable>
                )}

                {/* 3. Contextual Empty State when no announcements & no insights */}
                {!featuredAnnouncement && homeInsights.length === 0 && (
                    <Pressable
                        onPress={handleOpenDailyBrief}
                        style={({ pressed }) => [
                            styles.emptyStateCard,
                            isDark ? styles.emptyStateCardDark : styles.emptyStateCardLight,
                            { transform: [{ scale: pressed ? 0.985 : 1 }] }
                        ]}
                    >
                        <View style={[styles.emptyIconSquircle, { backgroundColor: emptyStateConfig.iconBg }]}>
                            <PlatformIcon
                                name={emptyStateConfig.icon as any}
                                size={18}
                                tintColor={emptyStateConfig.iconTint}
                            />
                        </View>

                        <View style={styles.emptyContentCol}>
                            <Text style={[styles.emptyStateTitle, { color: Colors[resolvedTheme].text }]}>
                                {emptyStateConfig.title}
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                {emptyStateConfig.subtitle}
                            </Text>
                        </View>

                        <View style={styles.emptyChevronBox}>
                            <PlatformIcon
                                name="chevron.right"
                                size={13}
                                tintColor={isDark ? '#71717A' : '#A1A1AA'}
                            />
                        </View>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 24,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        opacity: 0.5,
    },
    cardsStack: {
        gap: 12,
    },
    // Vibrant Colorful Announcement Banner Styles
    announcementCardWrapper: {
        marginHorizontal: 16,
        position: 'relative',
        zIndex: 10,
    },
    announcementCard: {
        borderRadius: 22,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 14,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardOuterBadgeWrapper: {
        position: 'absolute',
        top: -6,
        right: -4,
        zIndex: 20,
    },
    cardOuterBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: Platform.OS === 'android' ? 0 : 2,
        ...Platform.select({
            ios: {
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.35,
                shadowRadius: 5,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardOuterBadgeLight: {
        borderColor: '#F2F2F7',
    },
    cardOuterBadgeDark: {
        borderColor: '#000000',
    },
    cardOuterBadgeText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    announcementGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        position: 'relative',
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -50,
        right: 40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    announcementContent: {
        flex: 1,
        gap: 5,
        paddingRight: 10,
        zIndex: 2,
    },
    announcementMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 2,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.24)',
        alignSelf: 'flex-start',
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
        color: '#FFFFFF',
    },
    durationPill: {
        paddingHorizontal: 8.5,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    durationPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.92)',
    },
    announcementHeadline: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: '#FFFFFF',
        lineHeight: 22,
    },
    announcementDesc: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.85)',
    },
    announcementRightBox: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    bigIconSquircle: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    actionHintText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.88)',
    },
    // Daily Brief Insights Styles
    insightsCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    insightsCardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    insightsCardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    insightsGradient: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    insightRow: {
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
    moduleLabel: {
        fontSize: 14.5,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    primaryText: {
        fontSize: 13.5,
        lineHeight: 19,
        fontWeight: '400',
    },
    subtitleLight: {
        color: '#52525B',
    },
    subtitleDark: {
        color: '#A1A1AA',
    },
    secondaryTextLight: {
        color: '#71717A',
        fontWeight: '400',
    },
    secondaryTextDark: {
        color: '#8E8E93',
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
    // Contextual Empty State Card
    emptyStateCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
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
    emptyStateCardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    emptyStateCardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    emptyIconSquircle: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    emptyContentCol: {
        flex: 1,
        gap: 2,
    },
    emptyStateTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    emptyStateSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    emptyChevronBox: {
        paddingLeft: 6,
        justifyContent: 'center',
    },
});
