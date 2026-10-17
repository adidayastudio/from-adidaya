import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { BlurView } from 'expo-blur';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { getProjects, Project } from '@/lib/api/projects';
import { supabase } from '@/lib/supabase';
import { FormaBlue } from '@/constants/theme';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { UnifiedSearchBar } from '@/components/ui/UnifiedSearchBar';
import { SwiftUINewChannelSheet } from '@/components/chat/SwiftUINewChannelSheet';
import { SwiftUIEditChannelSheet } from '@/components/chat/SwiftUIEditChannelSheet';
import { ChatDetailContent } from '@/app/chat-details/[id]';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    RefreshControl,
    TextInput,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Keyboard,
    LayoutAnimation,
    ActionSheetIOS,
    useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getChannelLastMessage, getUserAccessibleChannels, getCachedAccessibleChannels, ACCESSIBLE_CACHE_KEY, ChatChannel, DEFAULT_GENERAL_CHANNEL, INITIAL_FALLBACK_CHANNELS, resolvePreviewName, getChatProfiles, seedChatProfile, subscribeAllChatMessages, getUserChatPreferences, saveUserPinnedChannels, saveUserArchivedChannels, formatMessagePreviewSnippet, createOrUpdateChatChannel, deleteChatChannel, isAdidayaTenant } from '@/lib/api/chat';
import { sendLocalNotification } from '@/lib/notificationService';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';

export type PumbleChannel = ChatChannel;

function ChannelAvatar({
    channelId,
    avatarUrl,
    tenant,
    isDark,
}: {
    channelId: string;
    avatarUrl?: string | null;
    tenant?: any;
    isDark: boolean;
}) {
    // General channel always uses the tenant logo. Other channels use their own DB avatar (http only),
    // otherwise fall back to the tenant logo. No local per-device cache => no stale / cross-tenant photos.
    const isGeneral = channelId === 'general-channel' || channelId === '000-general' || channelId.includes('000-gen');
    const ownAvatar = !isGeneral && typeof avatarUrl === 'string' && /^https?:\/\//.test(avatarUrl) ? avatarUrl : null;

    if (ownAvatar) {
        return (
            <View style={[styles.channelAvatarWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Image source={{ uri: ownAvatar }} style={styles.channelAvatarImgCover} resizeMode="cover" />
            </View>
        );
    }

    if (tenant) {
        return (
            <View style={[styles.channelAvatarWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <TenantBrandLogo tenant={tenant} size={28} isDark={isDark} />
            </View>
        );
    }

    return (
        <View style={[styles.channelAvatarWrapper, { backgroundColor: isDark ? 'rgba(10, 132, 255,0.14)' : 'rgba(0, 122, 255,0.08)' }]}>
            <PlatformIcon
                name="bubble.left.and.bubble.right.fill"
                size={18}
                tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
            />
        </View>
    );
}

function LastMessagePreview({
    senderName,
    senderUserId,
    messageText,
    textColor,
    subtextColor,
    isUnread,
    isDark,
}: {
    senderName?: string;
    senderUserId?: string;
    messageText: string;
    textColor: string;
    subtextColor: string;
    isUnread: boolean;
    isDark: boolean;
}) {
    const text = (messageText || '').trim();
    let iconName: string | null = null;

    if (/^(\d+\s+)?photos?$/i.test(text)) {
        iconName = 'camera.fill';
    } else if (/^(\d+\s+)?videos?$/i.test(text)) {
        iconName = 'video.fill';
    } else if (/photo\s*&\s*video/i.test(text)) {
        iconName = 'photo.on.rectangle.fill';
    } else if (text === 'Document' || /\.(pdf|xlsx|xls|csv|docx|doc)$/i.test(text)) {
        iconName = 'doc.fill';
    }

    const previewColor = isUnread ? (isDark ? 'rgba(255,255,255,0.9)' : '#1C1C1E') : subtextColor;
    const resolvedSender = senderName ? resolvePreviewName(senderName, senderUserId) : '';

    return (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
            {!!resolvedSender && (
                <Text style={{ fontSize: 13, fontWeight: '500', color: textColor, marginRight: 5, flexShrink: 0 }} numberOfLines={1}>
                    {resolvedSender}:
                </Text>
            )}
            {iconName && (
                <View style={{ marginRight: 4, justifyContent: 'center' }}>
                    <PlatformIcon name={iconName} size={13} tintColor={subtextColor} />
                </View>
            )}
            <Text
                style={[
                    styles.channelLastMsg,
                    {
                        color: previewColor,
                        flex: 1,
                    },
                ]}
                numberOfLines={1}
            >
                {text}
            </Text>
        </View>
    );
}

const FILTER_ITEMS: { id: 'all' | 'general' | 'department' | 'project' | 'recent' | 'archived'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'general', label: 'General' },
    { id: 'department', label: 'Departments' },
    { id: 'project', label: 'Projects' },
    { id: 'recent', label: 'Recent' },
    { id: 'archived', label: 'Archived' },
];

const STORAGE_KEY_CUSTOM_CHANNELS = 'forma_chat_custom_channels_v2';
const STORAGE_KEY_PINNED_IDS = 'forma_chat_pinned_ids_v2';
const STORAGE_KEY_ARCHIVED_IDS = 'forma_chat_archived_ids_v2';

export default function ChatScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isFocused = useIsFocused();
    const { isSearchVisible, setIsSearchVisible, setContextAction } = useSearch();

    const { user, isAuthenticated, profile } = useUserContext();
    const { activeWorkspace, activeTenant, tenantRole } = useTenantContext();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const [selectedChannel, setSelectedChannel] = useState<PumbleChannel | null>(null);

    useEffect(() => {
        setSelectedChannel(null);
    }, [activeTenant?.id]);

    const [activeFilter, setActiveFilter] = useState<'all' | 'general' | 'department' | 'project' | 'recent' | 'archived'>('all');
    const [searchQueryLocal, setSearchQueryLocal] = useState('');
    const [isLocalSearchOpen, setIsLocalSearchOpen] = useState(false);
    const searchInputRef = useRef<TextInput>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [rawChannels, setRawChannels] = useState<PumbleChannel[]>([]);
    const [customChannels, setCustomChannels] = useState<PumbleChannel[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]); // ordered array of up to 3 channel IDs
    const [archivedIds, setArchivedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Create / Edit Modal State
    const [isChannelModalVisible, setIsChannelModalVisible] = useState(false);
    const [editingChannel, setEditingChannel] = useState<PumbleChannel | null>(null);
    const [channelToDelete, setChannelToDelete] = useState<PumbleChannel | null>(null);
    const [isDeletingChannel, setIsDeletingChannel] = useState(false);

    // Pill animation layout positions
    const [pillLayouts, setPillLayouts] = useState<{ [key: string]: { x: number; width: number } }>({});
    const pillsScrollRef = useRef<ScrollView>(null);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderTint = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const intensity = Platform.OS === 'ios' ? (isDark ? 20 : 35) : 0;

    // Active layout for sliding pill indicator
    const activeLayout = pillLayouts[activeFilter];
    const springConfig = { damping: 22, stiffness: 260, mass: 0.7 };

    const animatedPillStyle = useAnimatedStyle(() => {
        if (!activeLayout) {
            return { opacity: 0 };
        }
        return {
            opacity: withSpring(1, springConfig),
            width: withSpring(activeLayout.width, springConfig),
            transform: [
                { translateX: withSpring(activeLayout.x, springConfig) },
            ],
        };
    });

    useEffect(() => {
        if (activeLayout && pillsScrollRef.current) {
            pillsScrollRef.current.scrollTo({
                x: Math.max(0, activeLayout.x - 32),
                animated: true,
            });
        }
    }, [activeFilter, activeLayout]);

    // Load Local Custom Channels, Pinned IDs, Archived IDs per logged in user account
    const loadUserPreferences = useCallback(async () => {
        const uid = user?.id || profile?.id;
        if (!uid) return;
        const wsId = activeWorkspace?.id || 'default';
        try {
            const [storedCustom, userPrefs] = await Promise.all([
                AsyncStorage.getItem(`${STORAGE_KEY_CUSTOM_CHANNELS}_${wsId}`),
                getUserChatPreferences(uid, wsId),
            ]);

            if (storedCustom) setCustomChannels(JSON.parse(storedCustom));
            if (userPrefs?.pinnedIds) setPinnedIds(userPrefs.pinnedIds);
            if (userPrefs?.archivedIds) setArchivedIds(userPrefs.archivedIds);
        } catch (err) {
            console.error('Error loading chat preferences:', err);
        }
    }, [activeWorkspace?.id, user?.id, profile?.id]);

    useEffect(() => {
        loadUserPreferences();
    }, [loadUserPreferences]);

    const saveCustomChannels = async (updated: PumbleChannel[]) => {
        setCustomChannels(updated);
        try {
            const wsId = activeWorkspace?.id || 'default';
            await AsyncStorage.setItem(`${STORAGE_KEY_CUSTOM_CHANNELS}_${wsId}`, JSON.stringify(updated));
        } catch (err) {
            console.error('Error saving custom channels:', err);
        }
    };

    const savePinnedIds = async (updated: string[]) => {
        setPinnedIds(updated);
        const wsId = activeWorkspace?.id || 'default';
        const uid = user?.id || profile?.id;
        await saveUserPinnedChannels(uid, wsId, updated);
    };

    const saveArchivedIds = async (updated: string[]) => {
        setArchivedIds(updated);
        const wsId = activeWorkspace?.id || 'default';
        const uid = user?.id || profile?.id;
        await saveUserArchivedChannels(uid, wsId, updated);
    };

    // Load user accessible channels with instant Stale-While-Revalidate (0ms perceived latency)
    // Guards against glitches: stale responses from a previous tenant, list clearing on profile refresh, redundant re-renders.
    const tenantScopeKey = isAuthenticated && activeTenant?.id
        ? (isAdidayaTenant(activeTenant.id) ? 'adidaya' : activeTenant.id)
        : null;
    const tenantScopeRef = useRef<string | null>(tenantScopeKey);
    tenantScopeRef.current = tenantScopeKey;
    const profileRef = useRef(profile);
    profileRef.current = profile;
    const tenantRoleRef = useRef(tenantRole);
    tenantRoleRef.current = tenantRole;
    const lastChannelsJsonRef = useRef<string>('');

    const applyChannels = useCallback((list: PumbleChannel[]) => {
        const json = JSON.stringify(list);
        if (json === lastChannelsJsonRef.current) return;
        lastChannelsJsonRef.current = json;
        setRawChannels(list);
    }, []);

    const loadChannels = useCallback(async (isInitial = false) => {
        const scope = tenantScopeRef.current;
        if (!scope) return; // Wait until login + active tenant are resolved
        const currentProfile = profileRef.current;
        const wsId = activeWorkspace?.id || activeTenant?.id || 'default';
        if (currentProfile) {
            seedChatProfile(currentProfile);
        }

        // 1. Instant cache load if initial
        if (isInitial) {
            const cached = await getCachedAccessibleChannels({
                tenantId: activeTenant?.id,
                workspaceId: activeWorkspace?.id,
            });
            if (tenantScopeRef.current !== scope) return;
            if (cached && cached.length > 0) {
                applyChannels(cached as any);
            }
        }

        // 2. Silent background revalidation (no blocking loading spinner)
        try {
            const [accessible, storedCustom] = await Promise.all([
                getUserAccessibleChannels({
                    userId: user?.id || currentProfile?.id || 'current-user',
                    tenantId: activeTenant?.id,
                    workspaceId: activeWorkspace?.id,
                    userProfile: currentProfile,
                    tenantRole: tenantRoleRef.current,
                }),
                AsyncStorage.getItem(`${STORAGE_KEY_CUSTOM_CHANNELS}_${wsId}`),
            ]);

            // Drop responses that belong to a tenant we already switched away from
            if (tenantScopeRef.current !== scope) return;

            const parsedCustom: PumbleChannel[] = storedCustom ? JSON.parse(storedCustom) : [];
            const isAdidaya = isAdidayaTenant(activeTenant?.id);
            const defaultGen = isAdidaya ? { ...DEFAULT_GENERAL_CHANNEL, id: '000-general' } : DEFAULT_GENERAL_CHANNEL;

            setCustomChannels(prev => (JSON.stringify(prev) === JSON.stringify(parsedCustom) ? prev : parsedCustom));
            applyChannels(accessible && accessible.length > 0 ? (accessible as any) : [defaultGen as any]);
        } catch (error) {
            console.error('Error loading accessible channels:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, activeTenant?.id, activeWorkspace?.id, applyChannels]);

    // Tenant / mount channel loader — only clears when the tenant scope actually changes
    useEffect(() => {
        lastChannelsJsonRef.current = '';
        setRawChannels([]);
        setSelectedChannel(null);
        loadChannels(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantScopeKey, activeWorkspace?.id]);

    // Realtime chat subscription across all channels (instant update like WhatsApp) + OS local notification
    useEffect(() => {
        const unsubscribe = subscribeAllChatMessages((payload) => {
            // Handle realtime channel deletion
            if (payload?.isChannelDeleted) {
                const delId = payload.channelId;
                const delCode = payload.channelCode;
                if (delId || delCode) {
                    setRawChannels(prev => prev.filter(c => c.id !== delId && c.code !== delCode));
                }
                loadChannels(false);
                return;
            }

            // Handle cross-device preferences sync
            if (payload?.isPrefUpdate) {
                const uid = user?.id || profile?.id;
                const payloadUserId = payload.userId || payload.user_id;
                if (uid && payloadUserId && uid === payloadUserId) {
                    const nextPinned = payload.pinnedIds || payload.pinned_channels;
                    const nextArchived = payload.archivedIds || payload.archived_channels;
                    if (Array.isArray(nextPinned)) setPinnedIds(nextPinned);
                    if (Array.isArray(nextArchived)) setArchivedIds(nextArchived);
                }
                return;
            }

            loadChannels(false);

            // Device local notification when incoming message is from another member
            if (payload) {
                const isSelf = (user?.id && (payload.user_id === user.id || payload.userId === user.id)) ||
                    (profile?.full_name && payload.sender_name === profile.full_name) ||
                    (profile?.nickname && payload.sender_name === profile.nickname);

                if (!isSelf) {
                    const sender = payload.sender_name || payload.sender || 'New Message';
                    const text = formatMessagePreviewSnippet(payload) || 'Sent a message';
                    sendLocalNotification(
                        sender,
                        text,
                        { channelId: payload.channel_id || payload.channelId }
                    ).catch(() => {});
                }
            }
        });

        // Fast periodic check every 4.5s while on chat tab
        const pollInterval = setInterval(() => {
            loadChannels(false);
        }, 4500);

        return () => {
            unsubscribe();
            clearInterval(pollInterval);
        };
    }, [loadChannels, user?.id, profile]);

    useFocusEffect(
        useCallback(() => {
            loadChannels(false);
            loadUserPreferences();
        }, [loadChannels, loadUserPreferences])
    );

    // Combine raw channels + custom channels with deduplication and pinned/archived statuses applied
    const allChannelsWithState = useMemo(() => {
        const seenIds = new Set<string>();
        const uniqueList: PumbleChannel[] = [];
        const combined = [...customChannels, ...rawChannels];
        combined.forEach((ch) => {
            if (ch && ch.id && !seenIds.has(ch.id)) {
                seenIds.add(ch.id);
                uniqueList.push(ch);
            }
        });
        return uniqueList.map(ch => {
            const isArchived = archivedIds.includes(ch.id);
            const pinIndex = pinnedIds.indexOf(ch.id);
            const isPinned = pinIndex !== -1;
            return {
                ...ch,
                status: isArchived ? ('archived' as const) : ('active' as const),
                isPinned,
                pinOrder: isPinned ? pinIndex : undefined,
            };
        });
    }, [rawChannels, customChannels, pinnedIds, archivedIds]);

    // Sorting & Filtering
    const filteredChannels = useMemo(() => {
        const filtered = allChannelsWithState.filter(ch => {
            let matchesFilter = true;
            if (activeFilter === 'recent') matchesFilter = !!ch.isRecent && ch.status !== 'archived';
            else if (activeFilter === 'archived') matchesFilter = ch.status === 'archived';
            else if (activeFilter === 'general') matchesFilter = (ch.category === 'general' || ch.category === 'manual' || !!ch.isCustom) && ch.status !== 'archived';
            else if (activeFilter === 'department') matchesFilter = ch.category === 'department' && ch.status !== 'archived';
            else if (activeFilter === 'project') matchesFilter = ch.category === 'project' && ch.status !== 'archived';
            else if (activeFilter === 'all') matchesFilter = ch.status !== 'archived';

            const q = (searchQueryLocal || '').toLowerCase().trim();
            const matchesQuery = q === '' ||
                (ch.code ? ch.code.toLowerCase().includes(q) : false) ||
                (ch.name ? ch.name.toLowerCase().includes(q) : false) ||
                (ch.senderName ? ch.senderName.toLowerCase().includes(q) : false) ||
                (ch.lastMessageText ? ch.lastMessageText.toLowerCase().includes(q) : false);

            return matchesFilter && matchesQuery;
        });

        // Sorting rules:
        // 1. Pinned channels at the top in pinOrder (0, 1, 2)
        // 2. Channels with messages (timeA > 0) appear first, sorted by newest time descending (most recent at top)
        // 3. Channels without messages appear below, sorted by channelNumber ascending, then alphabetically
        return filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isPinned && b.isPinned) {
                return (a.pinOrder ?? 0) - (b.pinOrder ?? 0);
            }

            const timeA = a.lastUpdatedAt || 0;
            const timeB = b.lastUpdatedAt || 0;

            if (timeA > 0 && timeB === 0) return -1;
            if (timeA === 0 && timeB > 0) return 1;

            if (timeA > 0 && timeB > 0 && timeA !== timeB) {
                return timeB - timeA;
            }

            const numA = a.channelNumber ?? 99999;
            const numB = b.channelNumber ?? 99999;
            if (numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name);
        });
    }, [allChannelsWithState, activeFilter, searchQueryLocal]);

    // Build Native iOS ContextMenu Actions per Channel
    const getContextMenuActions = useCallback((channel: PumbleChannel): ContextMenuAction[] => {
        const isPinned = pinnedIds.includes(channel.id);
        const isArchived = archivedIds.includes(channel.id);
        const isCustom = channel.isCustom;
        const isPermanent = channel.isPermanent;

        const actions: ContextMenuAction[] = [];

        // 1. Edit (Allowed for custom channels and department/project channels, but NOT general channel)
        const canEdit = !isPermanent && channel.id !== 'general-channel' && !channel.code.includes('000-gen');
        if (canEdit) {
            actions.push({
                title: 'Edit',
                systemIcon: 'pencil',
            });
        }

        // 2. Reorder Pinned Actions (if pinned and more than 1 pinned channel)
        if (isPinned && pinnedIds.length > 1) {
            const pinIndex = pinnedIds.indexOf(channel.id);
            if (pinIndex > 0) {
                actions.push({
                    title: 'Move Up',
                    systemIcon: 'arrow.up',
                });
            }
            if (pinIndex < pinnedIds.length - 1) {
                actions.push({
                    title: 'Move Down',
                    systemIcon: 'arrow.down',
                });
            }
        }

        // 3. Favorite / Unfavorite (Applies to all channels, max 3)
        actions.push({
            title: isPinned ? 'Unfavorite' : 'Favorite',
            systemIcon: isPinned ? 'star.slash' : 'star',
        });

        // 4. Archive / Unarchive (Applies to all except permanent #000-gen)
        if (!isPermanent) {
            actions.push({
                title: isArchived ? 'Unarchive' : 'Archive',
                systemIcon: isArchived ? 'archivebox.fill' : 'archivebox',
            });
        }

        // 5. Delete (Only for manual / custom channels, NOT dept/project/general)
        const isGeneral = isPermanent || channel.id === 'general-channel' || channel.code.includes('000-gen') || channel.category === 'general';
        const isDeptOrProj = channel.category === 'department' || channel.category === 'project' || channel.id.startsWith('dept-') || channel.id.startsWith('proj-');
        const canDelete = (channel.category === 'manual' || isCustom || (!isGeneral && !isDeptOrProj)) && !isGeneral;
        if (canDelete) {
            actions.push({
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
            });
        }

        return actions;
    }, [pinnedIds, archivedIds]);

    // Handle Native ContextMenu Item Selection
    const handleContextMenuPress = useCallback((channel: PumbleChannel, actionTitle: string) => {
        Haptics.selectionAsync();

        const delay = Platform.OS === 'ios' ? 300 : 0;
        const uid = user?.id || profile?.id;
        const wsId = activeWorkspace?.id || 'default';

        if (actionTitle === 'Move Up') {
            setTimeout(() => {
                setPinnedIds((prev) => {
                    const pinIndex = prev.indexOf(channel.id);
                    if (pinIndex <= 0) return prev;
                    const next = [...prev];
                    const temp = next[pinIndex - 1];
                    next[pinIndex - 1] = next[pinIndex];
                    next[pinIndex] = temp;
                    saveUserPinnedChannels(uid, wsId, next);
                    return next;
                });
            }, delay);
        } else if (actionTitle === 'Move Down') {
            setTimeout(() => {
                setPinnedIds((prev) => {
                    const pinIndex = prev.indexOf(channel.id);
                    if (pinIndex < 0 || pinIndex >= prev.length - 1) return prev;
                    const next = [...prev];
                    const temp = next[pinIndex + 1];
                    next[pinIndex + 1] = next[pinIndex];
                    next[pinIndex] = temp;
                    saveUserPinnedChannels(uid, wsId, next);
                    return next;
                });
            }, delay);
        } else if (actionTitle === 'Favorite' || actionTitle === 'Unfavorite' || actionTitle === 'Pin' || actionTitle === 'Unpin') {
            const id = channel.id;
            setTimeout(() => {
                setPinnedIds((prev) => {
                    const isCurrentlyPinned = prev.includes(id);
                    let nextPinned: string[];
                    if (isCurrentlyPinned) {
                        nextPinned = prev.filter(pId => pId !== id);
                    } else {
                        nextPinned = [id, ...prev.filter(pId => pId !== id)];
                        if (nextPinned.length > 3) {
                            nextPinned = nextPinned.slice(0, 3);
                        }
                    }
                    saveUserPinnedChannels(uid, wsId, nextPinned);
                    return nextPinned;
                });
            }, delay);
        } else if (actionTitle === 'Edit') {
            setEditingChannel(channel);
            setIsChannelModalVisible(true);
        } else if (actionTitle === 'Archive' || actionTitle === 'Unarchive') {
            const id = channel.id;
            setTimeout(() => {
                setArchivedIds((prev) => {
                    const isArchived = prev.includes(id);
                    let nextArchived: string[];
                    if (isArchived) {
                        nextArchived = prev.filter(aId => aId !== id);
                    } else {
                        nextArchived = [...prev, id];
                        // Unpin if archiving
                        setPinnedIds((currPins) => {
                            if (currPins.includes(id)) {
                                const nextPins = currPins.filter(pId => pId !== id);
                                saveUserPinnedChannels(uid, wsId, nextPins);
                                return nextPins;
                            }
                            return currPins;
                        });
                    }
                    saveUserArchivedChannels(uid, wsId, nextArchived);
                    return nextArchived;
                });
            }, delay);
        } else if (actionTitle === 'Delete') {
            setTimeout(() => {
                setChannelToDelete(channel);
            }, delay);
        }
    }, []);

    const handleConfirmDeleteChannel = async () => {
        if (!channelToDelete) return;
        setIsDeletingChannel(true);
        const id = channelToDelete.id;
        const code = channelToDelete.code;
        const uid = user?.id || profile?.id;
        const wsId = activeWorkspace?.id || 'default';

        setRawChannels((prev) => prev.filter(ch => ch.id !== id && ch.code !== code));
        saveCustomChannels(customChannels.filter(ch => ch.id !== id && ch.code !== code));
        setPinnedIds((prev) => {
            const next = prev.filter(pId => pId !== id && pId !== code);
            if (prev.includes(id)) saveUserPinnedChannels(uid, wsId, next);
            return next;
        });
        setArchivedIds((prev) => {
            const next = prev.filter(aId => aId !== id && aId !== code);
            if (prev.includes(id)) saveUserArchivedChannels(uid, wsId, next);
            return next;
        });

        if (selectedChannel?.id === id || selectedChannel?.code === code) {
            setSelectedChannel(null);
        }

        try {
            await deleteChatChannel(id, code, wsId);
        } catch (e) {
            console.error('Error deleting channel:', e);
        } finally {
            setIsDeletingChannel(false);
            setChannelToDelete(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    // Open Create Modal
    const handleOpenCreateModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingChannel(null);
        setIsChannelModalVisible(true);
    };

    useEffect(() => {
        if (isFocused) {
            setContextAction({
                label: 'New Channel',
                icon: 'add-circle-outline',
                sfIcon: 'plus.circle',
                action: handleOpenCreateModal,
            });
        }
    }, [isFocused, setContextAction]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadChannels();
        setRefreshing(false);
    };

    const toggleSearch = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLocalSearchOpen((prev) => {
            const next = !prev;
            if (!next) {
                setSearchQueryLocal('');
            } else {
                setTimeout(() => searchInputRef.current?.focus(), 80);
            }
            return next;
        });
    };

    const toolbarActions: HeaderToolbarAction[] = [
        {
            id: 'search',
            icon: 'search',
            image: 'magnifyingglass',
            tintColor: textColor,
            onPress: toggleSearch,
        },
        {
            id: 'add',
            icon: 'add',
            image: 'plus',
            isPrimary: true,
            tintColor: FormaBlue[700],
            onPress: handleOpenCreateModal,
            title: 'New Channel',
        },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: Platform.OS !== 'web',
                    title: 'Chat',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeTitleStyle: { fontSize: 26, color: textColor },
                    headerRight: () => isAuthenticated ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }} pointerEvents="box-none">
                            <HeaderToolbar actions={toolbarActions} isDark={isDark} textColor={textColor} maxDirectActions={3} />
                        </View>
                    ) : null,
                }}
            />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Chat"
                    actions={isAuthenticated ? toolbarActions : undefined}
                    centerComponent={
                        <SegmentedControl
                            fullWidth
                            style={{ width: '100%' }}
                            segments={[
                                { id: 'all', label: 'All' },
                                { id: 'general', label: 'General' },
                                { id: 'department', label: 'Departments' },
                                { id: 'project', label: 'Projects' },
                                { id: 'recent', label: 'Recent' },
                                { id: 'archived', label: 'Archived' },
                            ]}
                            activeSegment={activeFilter}
                            onSegmentChange={(id) => setActiveFilter(id as any)}
                        />
                    }
                />
            )}

            {isDesktopWeb ? (
                <View style={[styles.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* ═══ Middle Column: Channel List ═══ */}
                    <View style={[styles.splitLeftPane, { borderRightColor: borderTint, backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {/* Header with Title + Action Buttons */}
                        <View style={styles.splitListHeader}>
                            <View style={styles.splitListHeaderTitleRow}>
                                <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>Chat</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={toggleSearch}
                                            style={[styles.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Ionicons name="search-outline" size={16} color={textColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleOpenCreateModal}
                                            style={[styles.headerActionCircle, { backgroundColor: FormaBlue[700] }]}
                                        >
                                            <Ionicons name="add" size={18} color="#FFFFFF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Filter Segmented Control */}
                            <View style={{ marginTop: 10 }}>
                                <SegmentedControl
                                    fullWidth
                                    style={{ width: '100%' }}
                                    segments={[
                                        { id: 'all', label: 'All' },
                                        { id: 'general', label: 'General' },
                                        { id: 'department', label: 'Departments' },
                                        { id: 'project', label: 'Projects' },
                                        { id: 'recent', label: 'Recent' },
                                        { id: 'archived', label: 'Archived' },
                                    ]}
                                    activeSegment={activeFilter}
                                    onSegmentChange={(id) => setActiveFilter(id as any)}
                                />
                            </View>

                            {(isLocalSearchOpen || isSearchVisible) && (
                                <View style={{ marginTop: 10 }}>
                                    <UnifiedSearchBar
                                        value={searchQueryLocal}
                                        onChangeText={setSearchQueryLocal}
                                        placeholder="Search channels & messages..."
                                        onClose={() => {
                                            setIsLocalSearchOpen(false);
                                            setIsSearchVisible(false);
                                            setSearchQueryLocal('');
                                            Keyboard.dismiss();
                                        }}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Channels List ScrollView */}
                        <ScrollView
                            style={styles.splitListScroll}
                            contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                        >
                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Team Chat — ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
                                    description="Real-time team messaging and workspace communication."
                                    buttonText="Sign In"
                                />
                            ) : loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={FormaBlue[700]} />
                                </View>
                            ) : filteredChannels.length === 0 ? (
                                <View style={[styles.emptyContainer, { paddingVertical: 40 }]}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon
                                            name="bubble.left.and.bubble.right.fill"
                                            size={32}
                                            tintColor={isDark ? 'rgba(255,255,255,0.4)' : FormaBlue[700]}
                                            weight="bold"
                                        />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor, fontSize: 15 }]}>
                                        {searchQueryLocal.trim() ? 'No Channels Found' : 'No Channels'}
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor, fontSize: 12 }]}>
                                        {searchQueryLocal.trim()
                                            ? `No channel matches "${searchQueryLocal.trim()}".`
                                            : 'Create a new channel to get started.'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {filteredChannels.map((channel, index) => {
                                        const isSelected = selectedChannel?.id === channel.id;
                                        return (
                                            <ContextMenu
                                                key={`${channel.id || 'chan'}_${index}`}
                                                actions={getContextMenuActions(channel)}
                                                previewBackgroundColor="transparent"
                                                style={{ borderRadius: 14 }}
                                                onPress={(e) => {
                                                    const actionTitle = e.nativeEvent.name;
                                                    handleContextMenuPress(channel, actionTitle);
                                                }}
                                            >
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setSelectedChannel((prev) => prev?.id === channel.id ? null : channel);
                                                    }}
                                                >
                                                    <View
                                                        style={[
                                                            styles.channelCard,
                                                            {
                                                                backgroundColor: isSelected
                                                                    ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
                                                                    : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                                                borderWidth: 1,
                                                                borderColor: isSelected ? (isDark ? 'rgba(10, 132, 255, 0.4)' : FormaBlue[400]) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.channelRow}>
                                                            <ChannelAvatar
                                                                channelId={channel.id}
                                                                avatarUrl={channel.avatarUrl}
                                                                tenant={activeTenant}
                                                                isDark={isDark}
                                                            />
                                                            <View style={styles.channelBody}>
                                                                <View style={styles.cardHeaderRow}>
                                                                    <View style={styles.nameAndBadgeWrapper}>
                                                                        <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                                            <Text style={[styles.codeBadgeText, { color: subtextColor }]}>
                                                                                {channel.code}
                                                                            </Text>
                                                                        </View>
                                                                        {channel.membership?.status === 'former' && (
                                                                            <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)', marginLeft: 4 }]}>
                                                                                <Text style={[styles.codeBadgeText, { color: '#FF3B30', fontSize: 10, fontWeight: '600' }]}>
                                                                                    Former
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        <Text style={[styles.channelName, { color: textColor, fontWeight: isSelected ? '700' : '600' }]} numberOfLines={1}>
                                                                            {channel.name}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.cardMetaRight}>
                                                                        {!!channel.time && (
                                                                            <Text style={[styles.channelTime, { color: channel.unreadCount > 0 ? (isDark ? FormaBlue[400] : FormaBlue[700]) : subtextColor }]}>
                                                                                {channel.time}
                                                                            </Text>
                                                                        )}
                                                                        {channel.isPinned && (
                                                                            <PlatformIcon name="star.fill" size={12} tintColor="#FFCC00" />
                                                                        )}
                                                                    </View>
                                                                </View>
                                                                <View style={styles.cardBottomRow}>
                                                                    <LastMessagePreview
                                                                        senderName={channel.senderName}
                                                                        senderUserId={channel.senderUserId}
                                                                        messageText={channel.lastMessageText}
                                                                        textColor={textColor}
                                                                        subtextColor={subtextColor}
                                                                        isUnread={channel.unreadCount > 0}
                                                                        isDark={isDark}
                                                                    />
                                                                    {channel.unreadCount > 0 && (
                                                                        <View style={styles.unreadBadge}>
                                                                            <Text style={styles.unreadBadgeText}>
                                                                                {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </ContextMenu>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* ═══ Right Column: Chat Detail View or Empty State ═══ */}
                    <View style={[styles.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {selectedChannel ? (
                            <ChatDetailContent
                                key={`${activeTenant?.id || 'ten'}_${selectedChannel.id}`}
                                channelId={selectedChannel.id}
                                code={selectedChannel.code}
                                name={selectedChannel.name}
                                members={selectedChannel.membersCount?.toString()}
                                category={selectedChannel.category}
                                isEmbedded={true}
                            />
                        ) : (
                            <View style={styles.desktopEmptyPane}>
                                <View style={[styles.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(77, 130, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                                    <PlatformIcon
                                        name="bubble.left.and.bubble.right.fill"
                                        size={44}
                                        tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                                    />
                                </View>
                                <Text style={[styles.desktopEmptyTitle, { color: textColor }]}>
                                    {rawChannels.length === 0 ? 'No Channels Created Yet' : 'Select a Conversation'}
                                </Text>
                                <Text style={[styles.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {rawChannels.length === 0
                                        ? 'Get started by creating your workspace’s first chat channel to start team messaging and collaboration.'
                                        : 'Choose a channel from the list on the left to view discussions, share files, and send messages.'}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleOpenCreateModal}
                                    style={[styles.desktopEmptyBtn, { backgroundColor: FormaBlue[700] }]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={styles.desktopEmptyBtnText}>
                                        {rawChannels.length === 0 ? 'Create First Channel' : 'New Channel'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <>
                    <ScrollView
                        style={[styles.scrollView, { backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') }]}
                        contentInsetAdjustmentBehavior="automatic"
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            isAuthenticated ? (
                                <RefreshControl 
                                    refreshing={refreshing} 
                                    onRefresh={onRefresh} 
                                    tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} 
                                />
                            ) : undefined
                        }
                    >
                        {/* Standard Top Segmented Control (Mobile Native Only) */}
                        {Platform.OS !== 'web' && (
                            <View style={{
                                width: '100%',
                                paddingTop: 8,
                                paddingBottom: 4,
                            }}>
                                <View style={{
                                    width: '100%',
                                    alignItems: 'center',
                                    paddingHorizontal: 16,
                                    paddingBottom: 6,
                                }}>
                                    <SegmentedControl
                                        fullWidth
                                        style={{ width: '100%' }}
                                        segments={[
                                            { id: 'all', label: 'All' },
                                            { id: 'general', label: 'General' },
                                            { id: 'department', label: 'Departments' },
                                            { id: 'project', label: 'Projects' },
                                            { id: 'recent', label: 'Recent' },
                                            { id: 'archived', label: 'Archived' },
                                        ]}
                                        activeSegment={activeFilter}
                                        onSegmentChange={(id) => setActiveFilter(id as any)}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Channel Cards Section */}
                        <View style={[styles.listSection, { paddingBottom: insets.bottom + 100 }]}>
                            {(isLocalSearchOpen || isSearchVisible) && (
                                <UnifiedSearchBar
                                    value={searchQueryLocal}
                                    onChangeText={setSearchQueryLocal}
                                    placeholder="Search channels & messages..."
                                    onClose={() => {
                                        setIsLocalSearchOpen(false);
                                        setIsSearchVisible(false);
                                        setSearchQueryLocal('');
                                        Keyboard.dismiss();
                                    }}
                                />
                            )}

                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Team Chat — ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
                                    description="Real-time team messaging, media sharing, and instant workspace communication."
                                    buttonText="Sign In"
                                />
                            ) : loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={FormaBlue[700]} />
                                </View>
                            ) : filteredChannels.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <Ionicons
                                            name={
                                                searchQueryLocal.trim()
                                                    ? "search-outline"
                                                    : activeFilter === 'department'
                                                    ? "briefcase-outline"
                                                    : activeFilter === 'project'
                                                    ? "folder-open-outline"
                                                    : activeFilter === 'archived'
                                                    ? "archive-outline"
                                                    : activeFilter === 'recent'
                                                    ? "time-outline"
                                                    : "chatbubbles-outline"
                                            }
                                            size={34}
                                            color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)'}
                                        />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor }]}>
                                        {searchQueryLocal.trim()
                                            ? 'No Channels Found'
                                            : activeFilter === 'department'
                                            ? 'No Department Channels'
                                            : activeFilter === 'project'
                                            ? 'No Project Channels'
                                            : activeFilter === 'archived'
                                            ? 'No Archived Channels'
                                            : activeFilter === 'recent'
                                            ? 'No Recent Activity'
                                            : 'No Channels Found'}
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                        {searchQueryLocal.trim()
                                            ? `No channel matches "${searchQueryLocal.trim()}". Try searching with another keyword.`
                                            : activeFilter === 'department'
                                            ? 'Department channels will appear automatically when assigned to your department.'
                                            : activeFilter === 'project'
                                            ? 'No dedicated project chat channels active at the moment.'
                                            : activeFilter === 'archived'
                                            ? 'Channels you archive will be stored here for future reference.'
                                            : activeFilter === 'recent'
                                            ? 'Channels with recent discussions or messages will appear here.'
                                            : 'Start collaborating by opening an existing channel or creating a new one.'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.channelListContainer}>
                                    {filteredChannels.map((channel, index) => (
                                        <ContextMenu
                                        key={`${channel.id || 'chan'}_${index}`}
                                        actions={getContextMenuActions(channel)}
                                        previewBackgroundColor="transparent"
                                        style={{ borderRadius: 18 }}
                                        onPress={(e) => {
                                            const actionTitle = e.nativeEvent.name;
                                            handleContextMenuPress(channel, actionTitle);
                                        }}
                                    >
                                        <TouchableOpacity 
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                router.push({
                                                    pathname: '/chat-details/[id]',
                                                    params: { 
                                                        id: channel.id,
                                                        code: channel.code,
                                                        name: channel.name,
                                                        members: channel.membersCount.toString(),
                                                        category: channel.category,
                                                    }
                                                } as any);
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.channelCard,
                                                    {
                                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                    },
                                                ]}
                                            >
                                                <View style={styles.channelRow}>
                                                    {/* Left: Avatar Thumbnail */}
                                                    <ChannelAvatar
                                                        channelId={channel.id}
                                                        avatarUrl={channel.avatarUrl}
                                                        tenant={activeTenant}
                                                        isDark={isDark}
                                                    />

                                                    {/* Right: Channel Body */}
                                                    <View style={styles.channelBody}>
                                                        {/* Line 1: Code Badge + Channel Name + Right (Time, Pin, Archive) */}
                                                        <View style={styles.cardHeaderRow}>
                                                            <View style={styles.nameAndBadgeWrapper}>
                                                                <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                                    <Text style={[styles.codeBadgeText, { color: subtextColor }]}>
                                                                        {channel.code}
                                                                    </Text>
                                                                </View>

                                                                {channel.membership?.status === 'former' && (
                                                                    <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)', marginLeft: 4 }]}>
                                                                        <Text style={[styles.codeBadgeText, { color: '#FF3B30', fontSize: 10, fontWeight: '600' }]}>
                                                                            Former Member
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                <Text style={[styles.channelName, { color: textColor }]} numberOfLines={1}>
                                                                    {channel.name}
                                                                </Text>
                                                            </View>

                                                            <View style={styles.cardMetaRight}>
                                                                {!!channel.time && (
                                                                    <Text style={[styles.channelTime, { color: channel.unreadCount > 0 ? (isDark ? FormaBlue[400] : FormaBlue[700]) : subtextColor, fontWeight: channel.unreadCount > 0 ? '600' : '400' }]}>
                                                                        {channel.time}
                                                                    </Text>
                                                                )}
                                                                {channel.isPinned && (
                                                                    <PlatformIcon 
                                                                        name="star.fill" 
                                                                        size={12} 
                                                                        tintColor="#FFCC00" 
                                                                    />
                                                                )}
                                                                {channel.status === 'archived' && (
                                                                    <PlatformIcon 
                                                                        name="archivebox.fill" 
                                                                        size={11} 
                                                                        tintColor={subtextColor} 
                                                                    />
                                                                )}
                                                            </View>
                                                        </View>

                                                        {/* Line 2: Sender Name + Message + Unread Badge */}
                                                        <View style={styles.cardBottomRow}>
                                                            <LastMessagePreview
                                                                senderName={channel.senderName}
                                                                senderUserId={channel.senderUserId}
                                                                messageText={channel.lastMessageText}
                                                                textColor={textColor}
                                                                subtextColor={subtextColor}
                                                                isUnread={channel.unreadCount > 0}
                                                                isDark={isDark}
                                                            />
                                                            
                                                            {channel.unreadCount > 0 && (
                                                                <View style={styles.unreadBadge}>
                                                                    <Text style={styles.unreadBadgeText}>
                                                                        {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </ContextMenu>
                                ))}
                                </View>
                            )}
                        </View>

                        <View style={{ height: insets.bottom + 80 }} />
                    </ScrollView>
                </>
            )}

            {/* Create Channel Drawer (Native SwiftUI) */}
            <SwiftUINewChannelSheet
                visible={isChannelModalVisible && !editingChannel}
                isDark={isDark}
                onClose={() => setIsChannelModalVisible(false)}
                onCreate={(name, code, desc) => {
                    const newChanId = `custom-${Date.now()}`;
                    const nextNumber = customChannels.length + 10;
                    const newChan: PumbleChannel = {
                        id: newChanId,
                        code: code,
                        name: name,
                        description: desc || undefined,
                        senderName: '',
                        lastMessageText: desc || 'Workspace announcements and general team discussion.',
                        time: '',
                        unreadCount: 0,
                        membersCount: 1,
                        category: 'manual',
                        status: 'active',
                        isRecent: true,
                        isCustom: true,
                        createdBy: user?.id,
                        channelNumber: nextNumber,
                        lastUpdatedAt: Date.now(),
                        membership: {
                            status: 'active',
                            role: 'admin',
                            canWrite: true,
                            canReadHistory: true,
                            joinedAt: new Date().toISOString(),
                        },
                    };
                    saveCustomChannels([newChan, ...customChannels]);
                    if (isDesktopWeb) {
                        setSelectedChannel(newChan);
                    }
                    createOrUpdateChatChannel({
                        id: newChanId,
                        name,
                        code,
                        description: desc || undefined,
                        category: 'manual',
                        tenantId: activeTenant?.id,
                        workspaceId: activeWorkspace?.id,
                        userId: user?.id,
                    });
                }}
            />

            {/* Edit Channel Drawer (Native SwiftUI) */}
            {editingChannel && (
                <SwiftUIEditChannelSheet
                    visible={isChannelModalVisible && !!editingChannel}
                    channelName={editingChannel.name}
                    channelCode={editingChannel.code}
                    description={editingChannel.description || ''}
                    isDark={isDark}
                    onClose={() => {
                        setIsChannelModalVisible(false);
                        setEditingChannel(null);
                    }}
                    onSave={(name, code, desc) => {
                        const isCustom = customChannels.some(ch => ch.id === editingChannel.id);
                        if (isCustom) {
                            const updated = customChannels.map((ch) => {
                                if (ch.id === editingChannel.id) {
                                    return {
                                        ...ch,
                                        name,
                                        code,
                                        description: desc || undefined,
                                    };
                                }
                                return ch;
                            });
                            saveCustomChannels(updated);
                        } else {
                            const updatedRaw = rawChannels.map((ch) => {
                                if (ch.id === editingChannel.id) {
                                    return {
                                        ...ch,
                                        name,
                                        code,
                                        description: desc || undefined,
                                    };
                                }
                                return ch;
                            });
                            setRawChannels(updatedRaw);
                        }

                        createOrUpdateChatChannel({
                            id: editingChannel.id,
                            name,
                            code,
                            description: desc || undefined,
                            category: editingChannel.category,
                            tenantId: activeTenant?.id,
                            workspaceId: activeWorkspace?.id,
                            userId: user?.id,
                        });

                        // Persist metadata locally
                        AsyncStorage.setItem(`forma_channel_meta_${editingChannel.id}`, JSON.stringify({
                            name,
                            code,
                            description: desc || undefined,
                        })).catch(() => {});
                        setEditingChannel(null);
                        setIsChannelModalVisible(false);
                    }}
                />
            )}

            {/* Delete Channel Confirmation Modal (Full Pill Buttons & Matched Rounded Card) */}
            <Modal
                visible={!!channelToDelete}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeletingChannel) setChannelToDelete(null);
                }}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.dialogCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={styles.dialogIconContainer}>
                            <View style={[styles.dialogIconCircle, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.16)' : 'rgba(255, 59, 48, 0.10)' }]}>
                                <Ionicons name="trash-outline" size={28} color="#FF3B30" />
                            </View>
                        </View>
                        <Text style={[styles.dialogTitle, { color: textColor }]}>
                            Delete Channel
                        </Text>
                        <Text style={[styles.dialogMessage, { color: subtextColor }]}>
                            Are you sure you want to permanently delete &quot;{channelToDelete?.name}&quot; ({channelToDelete?.code})?{'\n\n'}
                            This action cannot be undone. All messages, attachments, media links, and files in this channel will be permanently removed.
                        </Text>
                        <View style={styles.dialogActions}>
                            <TouchableOpacity
                                style={[styles.dialogBtn, styles.dialogCancelBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                onPress={() => setChannelToDelete(null)}
                                disabled={isDeletingChannel}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.dialogBtnText, { color: textColor }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dialogBtn, styles.dialogDeleteBtn]}
                                onPress={handleConfirmDeleteChannel}
                                disabled={isDeletingChannel}
                                activeOpacity={0.8}
                            >
                                {isDeletingChannel ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[styles.dialogBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                                        Delete Channel
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    filterSection: {
        paddingTop: 8,
        paddingBottom: 4,
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 6,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 6 : 10,
        borderRadius: 9999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        padding: 0,
    },
    listSection: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 100,
    },
    channelListContainer: {
        gap: 10,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    channelCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 0,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        minHeight: 70,
        gap: 12,
    },
    channelAvatarWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelAvatarImgCover: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    channelAvatarLogoContain: {
        width: 28,
        height: 28,
    },
    channelBody: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    nameAndBadgeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
        gap: 6,
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    channelName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
        flexShrink: 1,
    },
    cardMetaRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    channelTime: {
        fontSize: 11.5,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    channelLastMsg: {
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    unreadBadge: {
        backgroundColor: FormaBlue[700],
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        paddingHorizontal: 24,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 13.5,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 280,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    formModalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 22,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    formModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    formModalSubtitle: {
        fontSize: 13,
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    modalInput: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalInputArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    formButtonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 6,
    },
    formBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    formBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dialogCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    dialogIconContainer: {
        marginBottom: 16,
    },
    dialogIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    dialogMessage: {
        fontSize: 13.5,
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 24,
    },
    dialogActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    dialogBtn: {
        flex: 1,
        height: 48,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogCancelBtn: {},
    dialogDeleteBtn: {
        backgroundColor: '#FF3B30',
    },
    dialogBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        height: '100%',
        borderRightWidth: StyleSheet.hairlineWidth,
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
    },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    desktopEmptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    desktopEmptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 380,
        marginBottom: 24,
    },
    desktopEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 6,
    },
    desktopEmptyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    createFirstBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 14,
    },
    createFirstBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
