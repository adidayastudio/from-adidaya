import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Platform,
    Share,
    Alert,
    RefreshControl,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import {
    Announcement,
    AnnouncementDocument,
    ANNOUNCEMENT_TEMPLATES,
    getAnnouncements,
    getAnnouncementById,
    markAnnouncementAsRead,
    formatPostedAt,
    formatRole,
    getInitials,
    subscribeToAnnouncements,
    togglePinAnnouncement,
    withdrawAnnouncement,
    restoreAnnouncement,
    deleteAnnouncement,
} from '@/lib/announcements';
import { CreateAnnouncementSheet } from '@/components/home/CreateAnnouncementSheet';
import { SwiftUIDocumentPreviewSheet } from '@/components/home/SwiftUIDocumentPreviewSheet';
import { ForwardToChatModal, ForwardPayload } from '@/components/chat/ForwardToChatModal';
import { copyToClipboard, triggerSystemShare } from '@/lib/shareActions';

import { supabase } from '@/lib/supabase';

const ANNOUNCEMENT_SHARE_ACTIONS: ContextMenuAction[] = [
    { title: 'Share to Chat', systemIcon: 'paperplane' },
    { title: 'Copy Text', systemIcon: 'doc.on.doc' },
    { title: 'Share...', systemIcon: 'square.and.arrow.up' },
];

const DOC_CONTEXT_MENU_ACTIONS: ContextMenuAction[] = [
    { title: 'Preview', systemIcon: 'eye' },
    { title: 'Download', systemIcon: 'square.and.arrow.down' },
    { title: 'Share', systemIcon: 'square.and.arrow.up' },
];

export default function AnnouncementDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const { tenantRole, isSuperAdmin, activeTenant } = useTenantContext();
    const { profile, user } = useUserContext();

    const isAuthorized = isSuperAdmin || !!(tenantRole && (
        tenantRole.toLowerCase().includes('admin') ||
        tenantRole.toLowerCase().includes('owner') ||
        tenantRole.toLowerCase().includes('lead') ||
        tenantRole.toLowerCase().includes('manager')
    ));

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
    const [activeId, setActiveId] = useState<string>(id || '');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<AnnouncementDocument | null>(null);
    const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null);
    const [coverLoadError, setCoverLoadError] = useState(false);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardPayload, setForwardPayload] = useState<ForwardPayload | null>(null);
    const scrollViewRef = React.useRef<ScrollView>(null);

    const loadData = useCallback(async (targetParamId?: string) => {
        try {
            const list = await getAnnouncements(false, activeTenant?.id);
            setAnnouncements(list);

            const effectiveId = targetParamId || activeId || id;
            if (effectiveId) {
                // 1. Try finding in loaded list
                let found = list.find(a => a.id === effectiveId);
                // 2. If not found, fetch single from DB
                if (!found) {
                    found = (await getAnnouncementById(effectiveId, activeTenant?.id)) || undefined;
                }
                // 3. Fallback: match by title text if ID is from notification text
                if (!found && typeof effectiveId === 'string') {
                    const cleanTitle = effectiveId.replace(/^📢\s*(Announcement:\s*)?/i, '').trim().toLowerCase();
                    if (cleanTitle) {
                        found = list.find(a => a.title.toLowerCase().includes(cleanTitle) || cleanTitle.includes(a.title.toLowerCase()));
                    }
                }

                if (found) {
                    setCurrentAnnouncement(found);
                    setActiveId(found.id);
                    return;
                }
            }

            if (list.length > 0) {
                setCurrentAnnouncement(list[0]);
                setActiveId(list[0].id);
            } else {
                setCurrentAnnouncement(null);
            }
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [id, activeId, activeTenant?.id]);

    useEffect(() => {
        setCoverLoadError(false);
    }, [activeId]);

    useEffect(() => {
        loadData();
        const unsub = subscribeToAnnouncements(() => {
            loadData();
        });
        return () => unsub();
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    useEffect(() => {
        if (id && id !== activeId) {
            setActiveId(id);
            loadData(id);
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
    }, [id]);

    useEffect(() => {
        if (activeId) {
            markAnnouncementAsRead(activeId, activeTenant?.id);
        }
    }, [activeId, activeTenant?.id]);

    const activeAnnouncement = useMemo(() => {
        if (activeId) {
            const found = announcements.find(a => a.id === activeId);
            if (found) return found;
        }
        if (currentAnnouncement) {
            return currentAnnouncement;
        }
        return announcements[0] || null;
    }, [announcements, activeId, currentAnnouncement]);

    const handleSelectAnnouncement = (item: Announcement) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveId(item.id);
        setCurrentAnnouncement(item);
        router.setParams({ id: item.id });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    useEffect(() => {
        if (activeAnnouncement?.authorName && !activeAnnouncement?.authorAvatarUrl) {
            supabase
                .from('profiles')
                .select('avatar_url')
                .or(`full_name.eq."${activeAnnouncement.authorName}",nickname.eq."${activeAnnouncement.authorName}"`)
                .limit(1)
                .maybeSingle()
                .then(
                    ({ data }) => {
                        if (data?.avatar_url) {
                            setDbAvatarUrl(data.avatar_url);
                        }
                    },
                    () => {}
                );
        }
    }, [activeAnnouncement?.authorName, activeAnnouncement?.authorAvatarUrl]);

    // Announcements within last 30 days excluding currently displayed one
    const pastAnnouncements = useMemo(() => {
        if (!activeAnnouncement) return announcements;
        return announcements.filter(a => a.id !== activeAnnouncement.id);
    }, [announcements, activeAnnouncement]);

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
        setRefreshing(false);
    };

    const formatAnnouncementShareText = (ann: Announcement) => {
        const categoryLabel = (ANNOUNCEMENT_TEMPLATES[ann.template]?.label || 'Announcement').toUpperCase();
        const parts: string[] = [
            `[${categoryLabel}]`,
            ann.title,
        ];
        if (ann.subtitle) parts.push(ann.subtitle);
        if (ann.bodyContent) parts.push(ann.bodyContent);

        const metaParts: string[] = [];
        if (ann.duration) metaParts.push(`Schedule ${ann.duration}`);
        const postedAt = ann.dateCreated ? formatPostedAt(ann.dateCreated) : '';
        const author = ann.authorName || 'Broadcast Team';
        metaParts.push(`Posted by ${author}${postedAt ? ` at ${postedAt}` : ''}`);

        if (metaParts.length > 0) {
            parts.push('');
            parts.push(metaParts.join('\n'));
        }

        return parts.join('\n');
    };

    const handleAnnouncementShareMenu = useCallback((actionIndex: number) => {
        if (!activeAnnouncement) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const action = ANNOUNCEMENT_SHARE_ACTIONS[actionIndex]?.title;
        const shareText = formatAnnouncementShareText(activeAnnouncement);

        if (action === 'Share to Chat') {
            setForwardPayload({
                title: activeAnnouncement.title,
                text: shareText,
                announcementId: activeAnnouncement.id,
            });
            setForwardModalVisible(true);
        } else if (action === 'Copy Text') {
            copyToClipboard(shareText, 'Announcement copied');
        } else if (action === 'Share...') {
            triggerSystemShare({
                title: activeAnnouncement.title,
                message: shareText,
            });
        }
    }, [activeAnnouncement]);

    const handleDirectPreview = (doc: AnnouncementDocument) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDoc(doc);
    };

    const handleDocContextMenu = (actionIndex: number, doc: AnnouncementDocument) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const action = DOC_CONTEXT_MENU_ACTIONS[actionIndex]?.title;
        if (action === 'Preview' || action === 'Download') {
            setSelectedDoc(doc);
        } else if (action === 'Share') {
            Share.share({
                title: doc.name,
                message: `Document: ${doc.name} (${doc.size})`,
                url: doc.url,
            });
        }
    };

    const handleTogglePin = async () => {
        if (!activeAnnouncement) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const tenantId = activeAnnouncement.tenantId || activeTenant?.id;
        await togglePinAnnouncement(activeAnnouncement.id, tenantId);
        await loadData();
    };

    const handleWithdrawToggle = async () => {
        if (!activeAnnouncement) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tenantId = activeAnnouncement.tenantId || activeTenant?.id;
        const confirmMsg = activeAnnouncement.isWithdrawn
            ? `Restore "${activeAnnouncement.title}" to active announcements?`
            : `Withdraw "${activeAnnouncement.title}"? It will no longer appear on Home Brief.`;

        const doAction = async () => {
            if (activeAnnouncement.isWithdrawn) {
                await restoreAnnouncement(activeAnnouncement.id, tenantId);
            } else {
                await withdrawAnnouncement(activeAnnouncement.id, tenantId);
            }
            await loadData();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await doAction();
            }
        } else {
            Alert.alert(
                activeAnnouncement.isWithdrawn ? 'Restore Announcement' : 'Withdraw Announcement',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: activeAnnouncement.isWithdrawn ? 'Restore' : 'Withdraw',
                        style: activeAnnouncement.isWithdrawn ? 'default' : 'destructive',
                        onPress: doAction,
                    },
                ]
            );
        }
    };

    const handleDelete = async () => {
        if (!activeAnnouncement) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const tenantId = activeAnnouncement.tenantId || activeTenant?.id;
        const confirmMsg = `Permanently delete "${activeAnnouncement.title}"? This action cannot be undone.`;

        const doDelete = async () => {
            await deleteAnnouncement(activeAnnouncement.id, tenantId);
            router.back();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await doDelete();
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

    const templateConfig = activeAnnouncement
        ? ANNOUNCEMENT_TEMPLATES[activeAnnouncement.template] || ANNOUNCEMENT_TEMPLATES.general
        : ANNOUNCEMENT_TEMPLATES.general;

    const headerActions: HeaderToolbarAction[] = useMemo(() => {
        const list: HeaderToolbarAction[] = [
            {
                id: 'share',
                icon: 'share-outline',
                image: 'square.and.arrow.up',
                title: 'Share',
                tintColor: textColor,
                menuActions: ANNOUNCEMENT_SHARE_ACTIONS,
                onMenuPress: (e) => handleAnnouncementShareMenu(e.nativeEvent.index),
                onPress: () => handleAnnouncementShareMenu(0),
            }
        ];

        if (isAuthorized) {
            list.push({
                id: 'create',
                icon: 'add-outline',
                image: 'plus',
                title: 'New Announcement',
                tintColor: '#0036F8',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCreateModal(true);
                },
            });
        }

        return list;
    }, [textColor, isAuthorized, handleAnnouncementShareMenu]);

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Announcement',
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
                                actions={headerActions}
                                isDark={isDark}
                                textColor={textColor}
                                maxDirectActions={3}
                            />
                        </View>
                    ),
                }}
            />

            <ScrollView
                ref={scrollViewRef}
                contentInsetAdjustmentBehavior="automatic"
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentContainerStyle={[styles.content, { 
                    paddingTop: Platform.OS === 'ios' ? 8 : 14,
                    paddingBottom: insets.bottom + 60 
                }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                    />
                }
            >
                {isLoading && !activeAnnouncement ? (
                    <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#0036F8" />
                    </View>
                ) : !activeAnnouncement ? (
                    <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                        <PlatformIcon name="exclamationmark.triangle" size={32} tintColor="#8E8E93" />
                        <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginTop: 12 }}>
                            Announcement Not Found
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? '#8E8E93' : '#8E8E93', marginTop: 4, textAlign: 'center' }}>
                            This announcement might have been deleted or expired.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.mainArticle}>
                        {/* Colorful Hero Banner or Custom Cover Image */}
                        {activeAnnouncement.coverImageUrl && !coverLoadError ? (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedDoc({
                                        id: 'cover-banner',
                                        name: activeAnnouncement.title,
                                        size: '',
                                        type: 'image',
                                        url: activeAnnouncement.coverImageUrl,
                                    });
                                }}
                            >
                                <Image
                                    source={{ uri: activeAnnouncement.coverImageUrl }}
                                    style={styles.coverImage}
                                    contentFit="cover"
                                    transition={200}
                                    onError={() => setCoverLoadError(true)}
                                />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.heroBannerWrapper}>
                                <LinearGradient
                                    colors={templateConfig.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.heroBannerGradient}
                                >
                                    <View style={styles.decorCircle1} />
                                    <View style={styles.decorCircle2} />

                                    {/* Centered Template Icon */}
                                    <View style={styles.heroCenterBox}>
                                        <View style={styles.heroIconSquircle}>
                                            <PlatformIcon
                                                name={templateConfig.icon as any}
                                                size={32}
                                                tintColor="#FFFFFF"
                                            />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        )}

                        {/* Article Details Card */}
                        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
                            {/* Category Pill */}
                            <View style={styles.metaRow}>
                                <View style={[styles.categoryPill, { backgroundColor: `${templateConfig.accent}18` }]}>
                                    <Text style={[styles.categoryPillText, { color: templateConfig.accent }]}>
                                        {templateConfig.label}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.articleTitle, { color: textColor }]}>
                                {activeAnnouncement.title}
                            </Text>

                            <Text style={[styles.articleSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                {activeAnnouncement.subtitle}
                            </Text>

                            {/* Author & Schedule Metadata Block */}
                            <View style={[styles.metaSection, isDark ? styles.metaSectionDark : styles.metaSectionLight]}>
                                <View style={styles.authorRow}>
                                    {(() => {
                                        const resolvedAvatar = activeAnnouncement.authorAvatarUrl ||
                                            dbAvatarUrl ||
                                            (profile && (profile.full_name === activeAnnouncement.authorName || profile.nickname === activeAnnouncement.authorName)
                                                ? (profile.avatarUrl || (profile as any).avatar_url || user?.user_metadata?.avatar_url)
                                                : null);

                                        if (resolvedAvatar) {
                                            return (
                                                <Image
                                                    source={{ uri: resolvedAvatar }}
                                                    style={styles.authorAvatar}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                            );
                                        }

                                        return (
                                            <LinearGradient
                                                colors={['#0036F8', '#3872FF']}
                                                style={styles.authorAvatar}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <Text style={styles.authorInitialsText}>
                                                    {getInitials(activeAnnouncement.authorName)}
                                                </Text>
                                            </LinearGradient>
                                        );
                                    })()}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.authorName, { color: textColor }]}>
                                            {activeAnnouncement.authorName || 'Broadcast Team'}
                                        </Text>
                                        <Text style={styles.authorRole}>
                                            {formatRole(activeAnnouncement.authorRole)}
                                            {activeAnnouncement.dateCreated ? ` • ${formatPostedAt(activeAnnouncement.dateCreated)}` : ''}
                                        </Text>
                                    </View>
                                </View>

                                {activeAnnouncement.duration ? (
                                    <View style={[styles.scheduleRow, isDark ? styles.scheduleRowDark : styles.scheduleRowLight]}>
                                        <View style={[styles.scheduleIconBox, isDark ? styles.iconBoxDark : styles.iconBoxLight]}>
                                            <PlatformIcon name="calendar" size={13} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.scheduleLabel}>Schedule</Text>
                                            <Text style={[styles.scheduleValue, { color: textColor }]}>
                                                {activeAnnouncement.duration}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}
                            </View>

                            {/* Body content */}
                            {activeAnnouncement.bodyContent && (
                                <Text style={[styles.bodyText, { color: isDark ? '#D4D4D8' : '#334155' }]}>
                                    {activeAnnouncement.bodyContent}
                                </Text>
                            )}
                        </View>

                        {/* Attached Documents - Separate Card */}
                        {activeAnnouncement.documents && activeAnnouncement.documents.length > 0 && (
                            <View style={styles.docsSection}>
                                <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight]}>
                                    Attached Documents
                                </Text>

                                <View style={[styles.docsCard, isDark ? styles.cardDark : styles.cardLight]}>
                                    {activeAnnouncement.documents.map((doc, idx) => {
                                        const isLast = idx === activeAnnouncement.documents!.length - 1;
                                        const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                                        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.name) || doc.type === 'image';

                                        return (
                                            <View key={doc.id || idx}>
                                                <ContextMenu
                                                    actions={DOC_CONTEXT_MENU_ACTIONS}
                                                    onPress={(e) => handleDocContextMenu(e.nativeEvent.index, doc)}
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => handleDirectPreview(doc)}
                                                        activeOpacity={0.7}
                                                        style={[
                                                            styles.docRow,
                                                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
                                                        ]}
                                                    >
                                                        {isImage && doc.url ? (
                                                            <Image
                                                                source={{ uri: doc.url }}
                                                                style={styles.docThumbnail}
                                                                contentFit="cover"
                                                                transition={200}
                                                            />
                                                        ) : (
                                                            <View style={[styles.docIconBox, isDark ? styles.iconBoxDark : styles.iconBoxLight]}>
                                                                <PlatformIcon
                                                                    name={isImage ? 'photo.fill' : isPdf ? 'doc.text.fill' : 'link'}
                                                                    size={16}
                                                                    tintColor={isDark ? '#A1A1AA' : '#64748B'}
                                                                />
                                                            </View>
                                                        )}

                                                        <View style={{ flex: 1, gap: 2 }}>
                                                            <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>
                                                                {doc.name}
                                                            </Text>
                                                            <Text style={styles.docMeta}>
                                                                {doc.size}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </ContextMenu>

                                                {!isLast && (
                                                    <View style={[styles.docDivider, isDark ? styles.dividerDark : styles.dividerLight]} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Actions Toolbar Row */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                onPress={() => handleAnnouncementShareMenu(0)}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                            >
                                <PlatformIcon name="paperplane" size={15} tintColor="#0036F8" />
                                <Text style={[styles.actionBtnText, { color: textColor }]}>Share to Chat</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleAnnouncementShareMenu(1)}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                            >
                                <PlatformIcon name="doc.on.doc" size={15} tintColor="#0036F8" />
                                <Text style={[styles.actionBtnText, { color: textColor }]}>Copy Text</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleAnnouncementShareMenu(2)}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                            >
                                <PlatformIcon name="square.and.arrow.up" size={15} tintColor="#0036F8" />
                                <Text style={[styles.actionBtnText, { color: textColor }]}>Share...</Text>
                            </TouchableOpacity>

                            {isAuthorized && (
                                <>
                                    <TouchableOpacity
                                        onPress={handleTogglePin}
                                        activeOpacity={0.75}
                                        style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                                    >
                                        <PlatformIcon name={activeAnnouncement.isFeatured ? 'pin.slash' : 'pin'} size={15} tintColor="#0036F8" />
                                        <Text style={[styles.actionBtnText, { color: textColor }]}>
                                            {activeAnnouncement.isFeatured ? 'Unpin' : 'Pin'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleWithdrawToggle}
                                        activeOpacity={0.75}
                                        style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                                    >
                                        <PlatformIcon name={activeAnnouncement.isWithdrawn ? 'arrow.uturn.backward' : 'xmark.circle'} size={15} tintColor={activeAnnouncement.isWithdrawn ? '#0036F8' : '#DC2626'} />
                                        <Text style={[styles.actionBtnText, { color: activeAnnouncement.isWithdrawn ? textColor : '#DC2626' }]}>
                                            {activeAnnouncement.isWithdrawn ? 'Restore' : 'Withdraw'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        activeOpacity={0.75}
                                        style={[styles.actionBtn, isDark ? styles.cardDark : styles.cardLight]}
                                    >
                                        <PlatformIcon name="trash" size={15} tintColor="#DC2626" />
                                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}

                {/* Section 2: Recent Announcements Horizontal Carousel */}
                {pastAnnouncements.length > 0 && (
                    <View style={styles.historySection}>
                        <View style={styles.historySectionHeader}>
                            <Text style={[styles.sectionHeading, isDark ? styles.sectionHeadingDark : styles.sectionHeadingLight]}>
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

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.historyCardsScroll}
                        >
                            {pastAnnouncements.map((item) => {
                                const itemConf = ANNOUNCEMENT_TEMPLATES[item.template] || ANNOUNCEMENT_TEMPLATES.general;

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handleSelectAnnouncement(item)}
                                        activeOpacity={0.82}
                                        style={[
                                            styles.historyCard,
                                            isDark ? styles.historyCardDark : styles.historyCardLight
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
                                            <Text style={styles.historyCardDuration}>
                                                {item.duration}
                                            </Text>
                                            <Text
                                                style={[styles.historyCardTitle, { color: textColor }]}
                                                numberOfLines={2}
                                            >
                                                {item.title}
                                            </Text>
                                            <Text
                                                style={[styles.historyCardSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}
                                                numberOfLines={2}
                                            >
                                                {item.subtitle}
                                            </Text>
                                            <Text style={styles.historyCardAuthor} numberOfLines={1}>
                                                By {item.authorName || 'Broadcast Team'}{item.dateCreated ? ` • ${formatPostedAt(item.dateCreated)}` : ''}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </ScrollView>

            {/* Native SwiftUI LiquidGlass BottomSheet Document/Photo Preview */}
            <SwiftUIDocumentPreviewSheet
                isOpened={!!selectedDoc}
                document={selectedDoc}
                onClose={() => setSelectedDoc(null)}
            />

            {/* Create Announcement Modal Sheet */}
            <CreateAnnouncementSheet
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(newAnn) => {
                    setAnnouncements(prev => [newAnn, ...prev]);
                    handleSelectAnnouncement(newAnn);
                }}
            />

            {/* Forward to Chat Channel Modal */}
            <ForwardToChatModal
                visible={forwardModalVisible}
                payload={forwardPayload}
                onClose={() => setForwardModalVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 20,
    },
    mainArticle: {
        gap: 16,
    },
    // Vibrant Hero Banner Styles
    heroBannerWrapper: {
        borderRadius: 22,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#0036F8',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 14,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    heroBannerGradient: {
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        top: -30,
        right: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroCenterBox: {
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroIconSquircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.24)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bigIconSquircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    coverImage: {
        width: '100%',
        height: 160,
        borderRadius: 22,
    },
    // Standard Card Styles
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 18,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    articleCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 18,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
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
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    categoryPill: {
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 8,
    },
    categoryPillText: {
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    durationBadge: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8E8E93',
    },
    articleTitle: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
        letterSpacing: -0.3,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
        lineHeight: 26,
    },
    articleSubtitle: {
        fontSize: 14.5,
        lineHeight: 21,
    },
    subtitleText: {
        fontSize: 14.5,
        lineHeight: 21,
        fontWeight: '500',
    },
    subtitleLight: {
        color: '#475569',
    },
    subtitleDark: {
        color: '#94A3B8',
    },
    metaSection: {
        gap: 10,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    metaSectionLight: {
        borderColor: 'rgba(0,0,0,0.06)',
    },
    metaSectionDark: {
        borderColor: 'rgba(255,255,255,0.08)',
    },
    authorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    authorBoxLight: {
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    authorBoxDark: {
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    authorInitialsText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '700',
    },
    authorAvatarSquircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorName: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    postedAt: {
        fontSize: 11.5,
        color: '#8E8E93',
        fontWeight: '400',
    },
    authorRole: {
        fontSize: 11.5,
        color: '#8E8E93',
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.04)',
    },
    scheduleIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxLight: {
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    iconBoxDark: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    scheduleLabel: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '500',
    },
    scheduleValue: {
        fontSize: 13.5,
        fontWeight: '600',
        marginTop: 1,
    },
    bodyText: {
        fontSize: 14.5,
        lineHeight: 23,
        paddingTop: 2,
    },
    // Section Headings
    sectionHeading: {
        fontSize: 13.5,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionHeadingLight: {
        color: '#475569',
    },
    sectionHeadingDark: {
        color: '#94A3B8',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#8E8E93',
        marginLeft: 4,
    },
    // Attached Documents Section
    docsSection: {
        gap: 8,
    },
    docSection: {
        gap: 8,
    },
    docsCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 5,
        gap: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    docContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 5,
        gap: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 13,
        borderRadius: 15,
    },
    docIconBox: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docName: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.15,
    },
    docMeta: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 1,
    },
    docDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 61,
        marginRight: 12,
        marginVertical: 2,
    },
    // Recent Announcements Section (Horizontal Carousel)
    historySection: {
        gap: 12,
        marginTop: 4,
        marginHorizontal: -16,
    },
    historySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    historyLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
    },
    historyLinkText: {
        fontSize: 13,
        fontWeight: '600',
    },
    historyCardsScroll: {
        gap: 12,
        paddingHorizontal: 16,
    },
    historyCard: {
        width: 250,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
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
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopLeftRadius: 19,
        borderTopRightRadius: 19,
    },
    historyCardIconSquircle: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.24)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyCardCategoryPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.24)',
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
    docThumbnail: {
        width: 38,
        height: 38,
        borderRadius: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
