import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import {
    getUserAccessibleChannels,
    sendChatMessage,
    ChatChannel,
} from '@/lib/api/chat';

export interface ForwardPayload {
    text?: string;
    mediaUrl?: string;
    attachment?: {
        name: string;
        size: string;
        type: 'pdf' | 'xlsx' | 'image' | 'video';
        url?: string;
    };
    title?: string;
    announcementId?: string;
}

interface ForwardToChatModalProps {
    visible: boolean;
    onClose: () => void;
    payload: ForwardPayload | null;
}

export function ForwardToChatModal({
    visible,
    onClose,
    payload,
}: ForwardToChatModalProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const { user, profile } = useUserContext();
    const { activeTenant, activeWorkspace, tenantRole } = useTenantContext();

    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (visible) {
            loadChannels();
            setSearchQuery('');
        }
    }, [visible]);

    const loadChannels = async () => {
        setIsLoading(true);
        try {
            const list = await getUserAccessibleChannels({
                userId: user?.id,
                tenantId: activeTenant?.id,
                workspaceId: activeWorkspace?.id,
                userProfile: profile as any,
                tenantRole,
            });
            setChannels(list);
        } catch (e) {
            console.error('Failed to load channels for forwarding:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return channels;
        const q = searchQuery.toLowerCase();
        return channels.filter(
            ch => ch.name.toLowerCase().includes(q) || (ch.code && ch.code.toLowerCase().includes(q))
        );
    }, [channels, searchQuery]);

    const handleSendToChannel = async (channel: ChatChannel) => {
        if (!payload || isSending) return;
        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const senderName = profile?.full_name || profile?.nickname || 'Team Member';
            const senderRole = profile?.role || 'Member';

            let msgText = payload.text || '';
            if (!msgText && payload.title) {
                msgText = `📢 *${payload.title}*`;
            }

            const mediaParam = payload.mediaUrl
                ? {
                    type: 'image' as const,
                    title: payload.title || 'Shared Photo',
                    thumbnails: [payload.mediaUrl],
                }
                : undefined;

            await sendChatMessage(channel.id, {
                text: msgText,
                senderName,
                senderRole,
                userId: user?.id,
                workspaceId: activeWorkspace?.id || null,
                tenantId: activeTenant?.id || null,
                media: mediaParam,
                attachment: payload.attachment,
                isForwarded: true,
                forwardedFrom: 'Announcements',
                linkedRecord: payload.announcementId ? {
                    type: 'announcement',
                    title: payload.title || 'Announcement',
                    id: payload.announcementId,
                } : undefined,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();

            Alert.alert(
                'Shared to Chat',
                `Successfully sent to ${channel.code || channel.name}.`,
                [
                    { text: 'OK', style: 'default' },
                    {
                        text: 'View in Chat',
                        onPress: () => {
                            router.push({
                                pathname: '/chat-details/[id]',
                                params: { id: channel.id, name: channel.name, code: channel.code },
                            });
                        },
                    },
                ]
            );
        } catch (e) {
            console.error('Failed to share to chat channel:', e);
            Alert.alert('Share Failed', 'Could not send message to this channel.');
        } finally {
            setIsSending(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[
                    styles.modalBox,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    }
                ]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            Share to Chat
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeCircleBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                            ]}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="xmark" size={13} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={[
                        styles.searchRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                    ]}>
                        <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Search channel or DM..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Channel List */}
                    {isLoading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="small" color="#0036F8" />
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.channelListScroll}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {filteredChannels.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Text style={[styles.emptyText, { color: subtextColor }]}>
                                        No channels found.
                                    </Text>
                                </View>
                            ) : (
                                filteredChannels.map((ch) => {
                                    const avatarUri = ch.avatarUrl || (ch as any).avatar_url || (ch as any).image_url || (ch as any).icon_url;
                                    return (
                                        <TouchableOpacity
                                            key={ch.id}
                                            style={[
                                                styles.channelItemRow,
                                                { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                            ]}
                                            onPress={() => handleSendToChannel(ch)}
                                            activeOpacity={0.7}
                                        >
                                            {avatarUri ? (
                                                <Image
                                                    source={{ uri: avatarUri }}
                                                    style={styles.channelAvatarImg}
                                                    contentFit="cover"
                                                    transition={150}
                                                />
                                            ) : (
                                                <View style={[
                                                    styles.channelIconBox,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                                ]}>
                                                    <PlatformIcon
                                                        name={ch.category === 'department' ? 'person.2' : ch.category === 'project' ? 'folder' : 'number'}
                                                        size={16}
                                                        tintColor={isDark ? '#FFFFFF' : '#0036F8'}
                                                    />
                                                </View>
                                            )}
                                            <View style={styles.channelTextCol}>
                                                <Text style={[styles.channelName, { color: textColor }]} numberOfLines={1}>
                                                    {ch.name}
                                                </Text>
                                                {ch.code ? (
                                                    <Text style={[styles.channelCode, { color: subtextColor }]}>
                                                        {ch.code}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <PlatformIcon name="paperplane" size={17} tintColor="#0036F8" />
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalBox: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 20,
        gap: 12,
        borderWidth: 1,
        maxHeight: 520,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            default: {},
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    closeCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: '500',
        padding: 0,
    },
    loadingBox: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelListScroll: {
        maxHeight: 320,
    },
    emptyBox: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13.5,
        fontWeight: '500',
    },
    channelItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    channelIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    channelTextCol: {
        flex: 1,
        gap: 2,
    },
    channelName: {
        fontSize: 14.5,
        fontWeight: '600',
    },
    channelCode: {
        fontSize: 12,
    },
});
