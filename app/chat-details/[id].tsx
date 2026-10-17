import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { GlassView } from '@/components/ui/GlassView';
import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import {
    Host,
    Spacer as SwiftUISpacer,
    Slider as SwiftUISlider,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    Image as SwiftUIImage,
    Text as SwiftUIText,
    HStack as SwiftUIHStack,
    frame,
    glassEffect,
    cornerRadius,
    padding as swiftUIPadding,
} from '@/lib/swiftui';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SwiftUISegmentedControl as SegmentedControl } from '@/components/ui/SwiftUISegmentedControl';
import { SwiftUIChatInputBar } from '@/components/chat/SwiftUIChatInputBar';
import { AndroidAttachmentSheet } from '@/components/chat/AndroidAttachmentSheet';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { SwiftUIForwardSheet, ForwardChannel } from '@/components/chat/SwiftUIForwardSheet';
import { SwiftUIDocInfoSheet, DocPagePreview } from '@/components/chat/SwiftUIDocInfoSheet';
import { FormaUniversalFileViewer } from '@/components/chat/FormaUniversalFileViewer';
import { FilePreviewItem, resolveFilePreview } from '@/lib/filePreviewStrategy';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { ChatInfoContent } from '../chat-info/[id]';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getChannelMessages,
    getCachedChannelMessages,
    sendChatMessage,
    deleteChatMessage,
    deleteChatMessageForMe,
    deleteChatMessageForEveryone,
    updateChatMessage,
    toggleMessagePin,
    toggleMessageReaction,
    subscribeChannelMessages,
    getChannelMembership,
    getUserAccessibleChannels,
    ChannelMembershipInfo,
    seedChatProfile,
    getChatProfiles,
    resolveFullName,
    uploadChatAttachment,
    formatMessagePreviewSnippet,
    CHAT_URL_REGEX,
    normalizeChatUrl,
    isAdidayaTenant,
} from '@/lib/api/chat';
import { supabaseAdidaya, supabaseForma } from '@/lib/supabase';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { SvgUri } from 'react-native-svg';
import { FormaBlue } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    Share,
    Linking,
    StatusBar as RNStatusBar,
    ActionSheetIOS,
    Modal,
    Dimensions,
    ActivityIndicator,
    Keyboard,
    LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

function truncateMiddleFileName(fileName: string, maxLength: number = 18): string {
    if (!fileName || fileName.length <= maxLength) return fileName;
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > 0 && fileName.length - dotIndex <= 6) {
        const ext = fileName.slice(dotIndex);
        const nameWithoutExt = fileName.slice(0, dotIndex);
        const available = maxLength - ext.length - 3;
        if (available > 4) {
            const front = Math.ceil(available * 0.6);
            const back = Math.floor(available * 0.4);
            return `${nameWithoutExt.slice(0, front)}...${back > 0 ? nameWithoutExt.slice(nameWithoutExt.length - back) : ''}${ext}`;
        }
        return `${nameWithoutExt.slice(0, Math.max(3, available))}...${ext}`;
    }
    const front = Math.ceil((maxLength - 3) / 2);
    const back = Math.floor((maxLength - 3) / 2);
    return `${fileName.slice(0, front)}...${fileName.slice(fileName.length - back)}`;
}

const CHAT_SEGMENTS = [
    { id: 'chat', label: 'Chat', icon: 'bubble.left.and.bubble.right' },
    { id: 'documents', label: 'Docs', icon: 'doc.text' },
    { id: 'media', label: 'Media', icon: 'photo' },
    { id: 'links', label: 'Links', icon: 'link' },
    // { id: 'actions', label: 'Actions', icon: 'checkmark.circle' }, // Parked for future revamp
];

export interface StagedAttachment {
    id: string;
    type: 'image' | 'video' | 'document';
    uri: string;
    name: string;
    size?: string;
    duration?: string;
    docType?: 'pdf' | 'xlsx';
    base64?: string;
}

export interface ChatAttachment {
    name: string;
    size: string;
    type: 'pdf' | 'xlsx' | 'image' | 'video' | string;
    url?: string;
    uri?: string;
}

export interface ChatMedia {
    type: 'image' | 'video';
    title?: string;
    count?: number;
    duration?: string;
    thumbnailUri?: string;
    thumbnails?: string[];
    url?: string;
    uri?: string;
}

export interface ChatMessage {
    id: string;
    sender: string;
    userId?: string;
    role?: string;
    avatarUrl?: string;
    avatarBg?: string;
    text: string;
    time: string;
    isSelf: boolean;
    dateLabel?: string;
    isPinned?: boolean;
    isSaved?: boolean;
    isAnnouncement?: boolean;
    hasLink?: boolean;
    linkUrl?: string;
    hasMedia?: boolean;
    replyTo?: {
        messageId?: string;
        sender: string;
        text: string;
    };
    attachment?: ChatAttachment;
    attachments?: ChatAttachment[];
    media?: ChatMedia;
    linkedRecord?: {
        type: string;
        title: string;
        id: string;
    };
    reactions?: { emoji: string; count: number; users?: string[] }[];
    myReaction?: string;
    createdAt?: string;
    isDeleted?: boolean;
    isEdited?: boolean;
    isForwarded?: boolean;
    forwardedFrom?: string;
}

export interface DocItem {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    isSelf: boolean;
    time: string;
    dateLabel: string;
    date: string;
}

export interface MediaItem {
    id: string;
    title: string;
    uploadedBy: string;
    time: string;
    dateLabel: string;
    isVideo: boolean;
    duration?: string;
    uri?: string;
}

export interface LinkItem {
    id: string;
    title: string;
    url: string;
    sharedBy: string;
    time: string;
    dateLabel: string;
}

export interface ActionItem {
    id: string;
    title: string;
    assignee: string;
    status: string;
    priority: string;
    dateLabel: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [];



const getModuleConfig = (type: string, isDark: boolean) => {
    switch (type) {
        case 'task':
            return { icon: 'checkmark.circle.fill', color: isDark ? '#64D2FF' : '#007AFF', bg: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.10)' };
        case 'completed':
            return { icon: 'checkmark.circle.fill', color: isDark ? '#30D158' : '#248A3D', bg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)' };
        case 'action':
            return { icon: 'flag.fill', color: isDark ? '#FF9F0A' : '#C96500', bg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.12)' };
        case 'pr':
            return { icon: 'cart.fill', color: isDark ? '#7D7AFF' : '#5856D6', bg: isDark ? 'rgba(88, 86, 214, 0.22)' : 'rgba(88, 86, 214, 0.10)' };
        case 'po':
            return { icon: 'bag.fill', color: isDark ? '#5AC8FA' : '#007D99', bg: isDark ? 'rgba(48, 176, 199, 0.22)' : 'rgba(48, 176, 199, 0.12)' };
        case 'reimbursement':
            return { icon: 'banknote.fill', color: isDark ? '#FF375F' : '#D70035', bg: isDark ? 'rgba(255, 45, 85, 0.22)' : 'rgba(255, 45, 85, 0.10)' };
        case 'payment':
            return { icon: 'creditcard.fill', color: isDark ? '#30D158' : '#248A3D', bg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)' };
        case 'resource':
            return { icon: 'cube.fill', color: isDark ? '#FF9F0A' : '#B86200', bg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.12)' };
        case 'receiving':
            return { icon: 'shippingbox.fill', color: isDark ? '#30D158' : '#248A3D', bg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)' };
        case 'transfer':
            return { icon: 'arrow.triangle.2.circlepath', color: isDark ? '#7D7AFF' : '#5856D6', bg: isDark ? 'rgba(88, 86, 214, 0.22)' : 'rgba(88, 86, 214, 0.10)' };
        case 'clock':
            return { icon: 'clock.fill', color: isDark ? '#FF9F0A' : '#C96500', bg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.12)' };
        case 'overtime':
            return { icon: 'timer', color: isDark ? '#BF5AF2' : '#8944AB', bg: isDark ? 'rgba(175, 82, 222, 0.22)' : 'rgba(175, 82, 222, 0.12)' };
        case 'shift':
            return { icon: 'calendar', color: isDark ? '#64D2FF' : '#007AFF', bg: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.10)' };
        case 'people':
            return { icon: 'person.2.fill', color: isDark ? '#FF375F' : '#D70035', bg: isDark ? 'rgba(255, 45, 85, 0.22)' : 'rgba(255, 45, 85, 0.10)' };
        case 'acknowledgement':
            return { icon: 'signature', color: isDark ? '#7D7AFF' : '#5856D6', bg: isDark ? 'rgba(88, 86, 214, 0.22)' : 'rgba(88, 86, 214, 0.10)' };
        case 'announcement':
            return { icon: 'megaphone.fill', color: isDark ? '#FF9F0A' : '#C96500', bg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.12)' };
        case 'dailylog':
            return { icon: 'book.closed.fill', color: isDark ? '#30D158' : '#248A3D', bg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)' };
        case 'report':
            return { icon: 'exclamationmark.triangle.fill', color: isDark ? '#FF453A' : '#D70015', bg: isDark ? 'rgba(255, 59, 48, 0.22)' : 'rgba(255, 59, 48, 0.12)' };
        default:
            return { icon: 'link', color: isDark ? '#64D2FF' : '#007AFF', bg: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.10)' };
    }
};


const LinkFaviconOrIcon = React.memo(({ url, isDark }: { url: string; isDark: boolean }) => {
    const [imageError, setImageError] = useState(false);
    const domain = useMemo(() => {
        try {
            return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
        } catch {
            return '';
        }
    }, [url]);

    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

    if (faviconUrl && !imageError) {
        return (
            <Image
                source={{ uri: faviconUrl }}
                style={{ width: 18, height: 18, borderRadius: 4 }}
                resizeMode="contain"
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <PlatformIcon
            name="link"
            size={16}
            tintColor={isDark ? '#8E8E93' : '#636366'}
        />
    );
});

interface BouncyReactionBadgeProps {
    emoji: string;
    count: number;
    isSelected: boolean;
    isDark: boolean;
    onPress: () => void;
}

const BouncyReactionBadge = React.memo(({
    emoji,
    count,
    isSelected,
    isDark,
    onPress,
}: BouncyReactionBadgeProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.86,
            useNativeDriver: true,
            friction: 7,
            tension: 250,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 180,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[
                    styles.reactionPill,
                    {
                        backgroundColor: isSelected
                            ? (isDark ? 'rgba(0, 122, 255, 0.28)' : 'rgba(0, 122, 255, 0.16)')
                            : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)'),
                    },
                ]}
            >
                <GlassView
                    intensity={isDark ? 25 : 45}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <Text style={[
                    styles.reactionText,
                    {
                        color: isSelected
                            ? (isDark ? FormaBlue[400] : FormaBlue[700])
                            : (isDark ? '#FFFFFF' : '#1C1C1E'),
                        fontWeight: isSelected ? '700' : '600',
                    }
                ]}>
                    {emoji} {count}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
});

const BouncyToolbarButton = React.memo(({
    onPress,
    disabled,
    style,
    children,
}: {
    onPress?: () => void;
    disabled?: boolean;
    style?: any;
    children: React.ReactNode;
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.88,
            useNativeDriver: true,
            friction: 7,
            tension: 300,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.35 }]}>
            <TouchableOpacity
                activeOpacity={1}
                disabled={disabled}
                onPressIn={disabled ? undefined : handlePressIn}
                onPressOut={disabled ? undefined : handlePressOut}
                onPress={onPress ? () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                } : undefined}
                style={style}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
});

const BouncyScrollToBottomButton = React.memo(({
    onPress,
    isDark,
}: {
    onPress: () => void;
    isDark: boolean;
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.82,
            useNativeDriver: true,
            friction: 7,
            tension: 300,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale }], alignSelf: 'flex-end', marginBottom: 2, marginRight: 0 }}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                style={styles.scrollToBottomBtn}
            >
                {Platform.OS === 'ios' ? (
                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIGlassEffectContainer modifiers={[
                            frame({ width: 38, height: 38 }),
                            cornerRadius(19)
                        ]}>
                            <SwiftUIHStack alignment="center" modifiers={[
                                frame({ width: 38, height: 38 }),
                                glassEffect({ shape: 'circle' })
                            ]}>
                                <SwiftUISpacer />
                            </SwiftUIHStack>
                        </SwiftUIGlassEffectContainer>
                    </Host>
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                borderRadius: 19,
                                overflow: 'hidden',
                                borderWidth: StyleSheet.hairlineWidth,
                                borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
                                backgroundColor: isDark ? 'rgba(38, 38, 42, 0.72)' : 'rgba(255, 255, 255, 0.78)',
                                elevation: 3,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.12,
                                shadowRadius: 3,
                            }
                        ]}
                    >
                        <BlurView
                            intensity={isDark ? 40 : 60}
                            tint={isDark ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}
                <PlatformIcon name="chevron.down" size={16} tintColor={isDark ? '#FFFFFF' : '#1C1C1E'} />
            </TouchableOpacity>
        </Animated.View>
    );
});

const FormattedChatMessageText = React.memo(({
    text,
    isSelf,
    textColor,
    isDark,
}: {
    text: string;
    isSelf: boolean;
    textColor: string;
    isDark: boolean;
}) => {
    if (!text) return null;

    const parts = useMemo(() => {
        const urlMatches = text.match(CHAT_URL_REGEX);
        if (!urlMatches || urlMatches.length === 0) {
            return null;
        }

        const segments: { text: string; isUrl: boolean; url?: string }[] = [];
        let lastIndex = 0;
        const regex = new RegExp(CHAT_URL_REGEX.source, 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = regex.lastIndex;
            let matchedStr = match[0];

            let trailingPunct = '';
            const punctMatch = matchedStr.match(/[.,!?:;)]+$/);
            if (punctMatch) {
                trailingPunct = punctMatch[0];
                matchedStr = matchedStr.slice(0, matchedStr.length - trailingPunct.length);
            }

            if (matchStart > lastIndex) {
                segments.push({ text: text.slice(lastIndex, matchStart), isUrl: false });
            }

            if (matchedStr) {
                segments.push({
                    text: matchedStr,
                    isUrl: true,
                    url: normalizeChatUrl(matchedStr),
                });
            }

            if (trailingPunct) {
                segments.push({ text: trailingPunct, isUrl: false });
            }

            lastIndex = matchEnd;
        }

        if (lastIndex < text.length) {
            segments.push({ text: text.slice(lastIndex), isUrl: false });
        }

        return segments;
    }, [text]);

    if (!parts) {
        return (
            <Text style={[styles.messageText, { color: isSelf ? '#FFFFFF' : textColor }]}>
                {text}
            </Text>
        );
    }

    const linkColor = isSelf ? '#D0E6FF' : (isDark ? '#60A5FA' : '#0066CC');

    return (
        <Text style={[styles.messageText, { color: isSelf ? '#FFFFFF' : textColor }]}>
            {parts.map((part, idx) => {
                if (part.isUrl && part.url) {
                    return (
                        <Text
                            key={idx}
                            style={{
                                color: linkColor,
                                textDecorationLine: 'underline',
                                fontWeight: '500',
                            }}
                            onPress={async () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                try {
                                    await WebBrowser.openBrowserAsync(part.url!, {
                                        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
                                        controlsColor: '#007AFF',
                                    });
                                } catch {
                                    Linking.openURL(part.url!);
                                }
                            }}
                        >
                            {part.text}
                        </Text>
                    );
                }
                return <Text key={idx}>{part.text}</Text>;
            })}
        </Text>
    );
});

export interface ChatDetailProps {
    channelId?: string;
    code?: string;
    name?: string;
    members?: string;
    category?: string;
    isEmbedded?: boolean;
}

export function ChatDetailContent({
    channelId: propChannelId,
    code: propCode,
    name: propName,
    members: propMembers,
    category: propCategory,
    isEmbedded = false,
}: ChatDetailProps = {}) {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; code?: string; name?: string; members?: string; category?: string }>();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { user, profile } = useUserContext();
    const { activeWorkspace, activeTenant, tenantRole } = useTenantContext();

    const channelId = propChannelId || params.id || 'general-channel';
    const displayCode = propCode || params.code || (channelId && !channelId.includes('-') ? `#${channelId}` : '#036-prg');
    const displayName = propName || params.name || 'General Channel';
    const displayMembers = propMembers || params.members || '1';

    const [activeTab, setActiveTab] = useState<string>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [membership, setMembership] = useState<ChannelMembershipInfo>({
        status: 'active',
        canWrite: true,
        canReadHistory: true,
    });
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [inputText, setInputText] = useState('');
    const [inputKey, setInputKey] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isAndroidAttachSheetVisible, setIsAndroidAttachSheetVisible] = useState(false);

    const scrollViewRef = React.useRef<ScrollView>(null);
    const lastContentHeight = useRef(0);
    const hasInitialScrolled = useRef(false);
    const prevMessagesCountRef = useRef(0);
    const [isChatReady, setIsChatReady] = useState(false);

    const scrollToBottom = useCallback((animated: boolean = false) => {
        if (!scrollViewRef.current) return;
        if (lastContentHeight.current > 0) {
            scrollViewRef.current.scrollTo({ y: lastContentHeight.current + 10000, animated });
        }
        scrollViewRef.current.scrollToEnd({ animated });
        if (Platform.OS === 'web') {
            try {
                // @ts-ignore
                const node = scrollViewRef.current?.getScrollableNode?.() || (scrollViewRef.current as any)?._node || (scrollViewRef.current as any);
                if (node && node.scrollHeight) {
                    node.scrollTop = node.scrollHeight;
                }
            } catch (_) {}
        }
    }, []);

    useEffect(() => {
        hasInitialScrolled.current = false;
        prevMessagesCountRef.current = 0;
        setIsChatReady(true);
    }, [channelId]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            if (activeTab === 'chat') {
                setTimeout(() => {
                    scrollToBottom(true);
                }, 120);
            }
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [activeTab, scrollToBottom]);

    // Fast initial mount from local cache in 0ms (no loading spinner)
    useEffect(() => {
        setMessages([]);
        setIsLoadingMessages(true);
        if (profile) {
            seedChatProfile(profile);
        }
        getCachedChannelMessages(channelId, user?.id, undefined, activeTenant?.id).then(cached => {
            if (cached && cached.length > 0) {
                setMessages(cached);
                setIsLoadingMessages(false);
            }
        });
    }, [channelId, user?.id, profile, activeTenant?.id]);

    // Load messages from Supabase / cache with membership access control
    const loadMessages = useCallback(async () => {
        try {
            if (profile) {
                seedChatProfile(profile);
            }
            await getChatProfiles();
            const mem = await getChannelMembership(channelId, user?.id, {
                tenantId: activeTenant?.id,
                userProfile: profile,
                userRole: tenantRole,
                departmentName: displayName,
                departmentCode: displayCode,
            });
            setMembership(mem);
            const data = await getChannelMessages(channelId, user?.id, mem, activeTenant?.id);
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching channel messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [channelId, user?.id, activeTenant?.id, profile, tenantRole, displayName, displayCode]);

    useEffect(() => {
        loadMessages();
        const unsubscribe = subscribeChannelMessages(channelId, (incomingMsg) => {
            if (incomingMsg) {
                setMessages(prev => {
                    const existingIndex = prev.findIndex(m => m.id === incomingMsg.id);
                    if (existingIndex >= 0) {
                        const existing = prev[existingIndex];
                        const updated = [...prev];
                        updated[existingIndex] = {
                            ...existing,
                            ...incomingMsg,
                            isEdited: existing.isEdited || incomingMsg.isEdited || false,
                            isPinned: incomingMsg.isPinned !== undefined ? incomingMsg.isPinned : existing.isPinned,
                            isSaved: incomingMsg.isSaved !== undefined ? incomingMsg.isSaved : existing.isSaved,
                            reactions: incomingMsg.reactions !== undefined ? incomingMsg.reactions : existing.reactions,
                        };
                        return updated;
                    }
                    return [...prev, incomingMsg];
                });
            }
            loadMessages();
        });

        // Realtime fallback polling interval while screen is open
        const pollTimer = setInterval(() => {
            loadMessages();
        }, 3500);

        return () => {
            unsubscribe();
            clearInterval(pollTimer);
        };
    }, [loadMessages, channelId]);

    // Channel Avatar State
    const [channelAvatarUri, setChannelAvatarUri] = useState<string | null>(null);

    const loadChannelAvatar = useCallback(async () => {
        const isGeneral = channelId === 'general-channel' || channelId === '000-general' || channelId.includes('000-gen');
        if (isGeneral) {
            setChannelAvatarUri(null);
            return;
        }
        const tenantKey = isAdidayaTenant(activeTenant?.id) ? 'adidaya' : (activeTenant?.id || 'default');
        const targetClient = isAdidayaTenant(activeTenant?.id) ? supabaseAdidaya : supabaseForma;
        try {
            const stored = await AsyncStorage.getItem(`forma_channel_avatar_v7_${tenantKey}_${channelId}`);
            if (stored) {
                setChannelAvatarUri(stored);
            }
            const { data } = await targetClient
                .from('chat_channels')
                .select('meta')
                .eq('id', channelId)
                .maybeSingle();
            if (data?.meta?.avatar_url && (data.meta.avatar_url.startsWith('http://') || data.meta.avatar_url.startsWith('https://'))) {
                setChannelAvatarUri(data.meta.avatar_url);
                AsyncStorage.setItem(`forma_channel_avatar_v7_${tenantKey}_${channelId}`, data.meta.avatar_url).catch(() => {});
            }
        } catch {
            // ignore
        }
    }, [channelId, activeTenant?.id]);

    useFocusEffect(
        useCallback(() => {
            loadChannelAvatar();
        }, [loadChannelAvatar])
    );

    // Floating Toast HUD State
    const [toastState, setToastState] = useState<{ message: string; icon?: string; iconColor?: string } | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const toastTimerRef = useRef<any>(null);

    const showToast = useCallback((msg: string = 'Copied', icon: string = 'checkmark.circle.fill', iconColor: string = '#34C759') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToastState({ message: msg, icon, iconColor });
        toastAnim.setValue(0);
        Animated.spring(toastAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
            tension: 90,
        }).start();

        toastTimerRef.current = setTimeout(() => {
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start(() => {
                setToastState(null);
            });
        }, 1600);
    }, [toastAnim]);

    // Multi-select Mode & Edit / Forward / Info States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [isChatInfoVisible, setIsChatInfoVisible] = useState(false);
    const chatInfoSlideAnim = useRef(new Animated.Value(0)).current;

    const toggleChatInfo = useCallback((open?: boolean) => {
        const target = open !== undefined ? open : !isChatInfoVisible;
        if (target) {
            setIsChatInfoVisible(true);
            Animated.spring(chatInfoSlideAnim, {
                toValue: 1,
                useNativeDriver: Platform.OS !== 'web',
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(chatInfoSlideAnim, {
                toValue: 0,
                duration: 220,
                useNativeDriver: Platform.OS !== 'web',
            }).start(() => {
                setIsChatInfoVisible(false);
            });
        }
    }, [isChatInfoVisible, chatInfoSlideAnim]);

    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    const [docsList, setDocsList] = useState<any[]>([]);
    const [isDocSelectMode, setIsDocSelectMode] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [isMediaSelectMode, setIsMediaSelectMode] = useState(false);
    const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
    const [forwardTargetMessages, setForwardTargetMessages] = useState<ChatMessage[] | null>(null);
    const [accessibleForwardChannels, setAccessibleForwardChannels] = useState<ForwardChannel[]>([]);
    const [forwardSearch, setForwardSearch] = useState('');

    // Load accessible channels for forward sheet based on user membership
    useEffect(() => {
        if (!user?.id) return;
        let isMounted = true;
        (async () => {
            try {
                const wsId = activeWorkspace?.id || 'default';
                const [channels, storedCustom] = await Promise.all([
                    getUserAccessibleChannels({
                        userId: user?.id,
                        tenantId: activeTenant?.id,
                        workspaceId: activeWorkspace?.id,
                        userProfile: profile,
                        tenantRole,
                    }),
                    AsyncStorage.getItem(`forma_chat_custom_channels_v2_${wsId}`),
                ]);

                const parsedCustom = storedCustom ? JSON.parse(storedCustom) : [];
                const all = [...channels, ...parsedCustom];
                const uniqueMap = new Map<string, any>();
                all.forEach((c) => {
                    if (c?.id && !uniqueMap.has(c.id)) {
                        uniqueMap.set(c.id, c);
                    }
                });
                const uniqueAll = Array.from(uniqueMap.values());
                const mapped: ForwardChannel[] = await Promise.all(
                    uniqueAll
                        .filter(c => c.id !== channelId)
                        .map(async (c) => {
                            const avatar = await AsyncStorage.getItem(`forma_channel_avatar_${c.id}`);
                            return {
                                id: c.id,
                                code: c.code,
                                name: c.name,
                                icon: 'chatbubbles',
                                avatarUri: avatar || null,
                            };
                        })
                );
                if (isMounted) {
                    setAccessibleForwardChannels(mapped);
                }
            } catch (err) {
                console.error('Error loading forward channels:', err);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, [user?.id, activeTenant?.id, activeWorkspace?.id, profile, tenantRole, channelId]);
    const [isChannelInfoVisible, setIsChannelInfoVisible] = useState(false);
    const [channelInfoTab, setChannelInfoTab] = useState<'saved' | 'pinned' | 'info'>('saved');
    const [docSortMode, setDocSortMode] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('date-desc');
    const [docFilterType, setDocFilterType] = useState<string>('all');
    const [mediaSortMode, setMediaSortMode] = useState<'date-desc' | 'date-asc'>('date-desc');
    const [mediaFilterType, setMediaFilterType] = useState<'all' | 'photos' | 'videos' | 'saved'>('all');
    const [linksList, setLinksList] = useState<any[]>([]);
    const [actionsList, setActionsList] = useState<any[]>([]);
    const [savedActionIds, setSavedActionIds] = useState<string[]>([]);
    const [isLinkSelectMode, setIsLinkSelectMode] = useState(false);
    const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
    const [savedLinkIds, setSavedLinkIds] = useState<string[]>([]);
    const [linkSortMode, setLinkSortMode] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc');
    const [linkFilterType, setLinkFilterType] = useState<'all' | 'saved' | 'internal' | 'external'>('all');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [savedDocIds, setSavedDocIds] = useState<string[]>([]);
    const [savedMediaIds, setSavedMediaIds] = useState<string[]>([]);
    const [docInfoTarget, setDocInfoTarget] = useState<any | null>(null);

    // Dynamically derive Docs, Media, Links, and Actions from actual messages
    useEffect(() => {
        const docs: any[] = [];
        const media: any[] = [];
        const links: any[] = [];
        const actions: any[] = [];

        messages.forEach(msg => {
            const atts = msg.attachments || (msg.attachment ? [msg.attachment] : []);
            
            // 1. Docs (exclude image and video attachments)
            atts.forEach((att, idx) => {
                const isImage = att.type === 'image' || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || att.url || '');
                const isVideo = att.type === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(att.name || att.url || '');
                const attUri = att.url || att.uri;

                if (!isImage && !isVideo) {
                    docs.push({
                        id: `${msg.id}-doc-${idx}`,
                        name: att.name || 'Document',
                        size: att.size || '1.2 MB',
                        type: att.type || 'document',
                        uri: attUri,
                        url: attUri,
                        uploadedBy: msg.sender,
                        isSelf: msg.isSelf,
                        time: msg.time,
                        dateLabel: msg.dateLabel || 'Today',
                        date: msg.createdAt || new Date().toISOString(),
                    });
                } else if (attUri) {
                    media.push({
                        id: `${msg.id}-att-media-${idx}`,
                        title: att.name || (isVideo ? 'Video' : 'Photo'),
                        uploadedBy: msg.sender,
                        time: msg.time,
                        dateLabel: msg.dateLabel || 'Today',
                        isVideo,
                        uri: attUri,
                        url: attUri,
                    });
                }
            });

            // 2. Media
            if (msg.media) {
                if (msg.media.thumbnails && msg.media.thumbnails.length > 0) {
                    msg.media.thumbnails.forEach((uri, idx) => {
                        const resolvedUri = typeof uri === 'string' ? uri : ((uri as any)?.uri || (uri as any)?.url || (uri as any)?.thumbnailUrl || '');
                        if (resolvedUri) {
                            media.push({
                                id: `${msg.id}-media-${idx}`,
                                title: msg.media?.title || 'Photo',
                                uploadedBy: msg.sender,
                                time: msg.time,
                                dateLabel: msg.dateLabel || 'Today',
                                isVideo: false,
                                uri: resolvedUri,
                                url: resolvedUri,
                            });
                        }
                    });
                } else {
                    const resolvedUri = msg.media.thumbnailUri || msg.media.uri || (msg.media as any).url || (msg.media as any).thumbnailUrl || (msg.media.thumbnails && msg.media.thumbnails[0]);
                    if (resolvedUri) {
                        media.push({
                            id: `${msg.id}-media`,
                            title: msg.media.title || (msg.media.type === 'video' ? 'Video' : 'Photo'),
                            uploadedBy: msg.sender,
                            time: msg.time,
                            dateLabel: msg.dateLabel || 'Today',
                            isVideo: msg.media.type === 'video',
                            duration: msg.media.duration,
                            uri: resolvedUri,
                            url: resolvedUri,
                        });
                    }
                }
            }

            // Links
            if (msg.hasLink || (msg.text && msg.text.match(CHAT_URL_REGEX))) {
                const urlMatches = msg.text ? msg.text.match(CHAT_URL_REGEX) : null;
                const rawUrl = msg.linkUrl || (urlMatches ? urlMatches[0] : '');
                const url = rawUrl ? normalizeChatUrl(rawUrl) : '';
                if (url) {
                    links.push({
                        id: `${msg.id}-link`,
                        title: (rawUrl ? msg.text.replace(rawUrl, '').trim() : '') || rawUrl || url,
                        url,
                        sharedBy: msg.sender,
                        time: msg.time,
                        dateLabel: msg.dateLabel || 'Today',
                    });
                }
            }

            // Linked record / actions
            if (msg.linkedRecord) {
                actions.push({
                    id: msg.linkedRecord.id || `${msg.id}-action`,
                    title: msg.linkedRecord.title,
                    assignee: msg.sender,
                    status: 'Active',
                    priority: 'Normal',
                    dateLabel: msg.dateLabel || 'Today',
                });
            }
        });

        setDocsList(docs);
        setMediaList(media);
        setLinksList(links);
        setActionsList(actions);
    }, [messages]);

    // Fullscreen Embedded Media / Document Preview states
    const screenWidth = Dimensions.get('window').width;
    const photoScrollRef = React.useRef<ScrollView>(null);
    const [previewItem, setPreviewItem] = useState<FilePreviewItem | null>(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(true);
    const [videoProgress, setVideoProgress] = useState(14);

    const parseDurationSeconds = useCallback((sub?: string) => {
        if (!sub) return 78;
        const parts = sub.split('•');
        const timeStr = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const timeParts = timeStr.split(':');
        if (timeParts.length === 2) {
            const mins = parseInt(timeParts[0], 10) || 0;
            const secs = parseInt(timeParts[1], 10) || 0;
            return mins * 60 + secs > 0 ? mins * 60 + secs : 78;
        }
        return 78;
    }, []);

    const openFilePreview = useCallback((itemToPreview: FilePreviewItem) => {
        Haptics.selectionAsync();
        router.push({
            pathname: '/file-preview',
            params: {
                payload: JSON.stringify(itemToPreview),
                id: itemToPreview.id || 'preview-file',
                name: itemToPreview.name || itemToPreview.title || 'Document',
                title: itemToPreview.title || itemToPreview.name || 'Document',
                size: itemToPreview.size || '',
                type: itemToPreview.type || '',
                uploadedBy: itemToPreview.uploadedBy || itemToPreview.sender || '',
                time: itemToPreview.time || '',
                url: itemToPreview.url || itemToPreview.uri || '',
                uri: itemToPreview.uri || itemToPreview.url || '',
                thumbnails: itemToPreview.thumbnails ? JSON.stringify(itemToPreview.thumbnails) : undefined,
                isDrawingSheet: (itemToPreview as any).isDrawingSheet ? 'true' : 'false',
            },
        });
    }, [router]);

    const formatVideoTime = useCallback((seconds: number) => {
        const s = Math.max(0, Math.floor(seconds));
        const mins = Math.floor(s / 60);
        const remSecs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    }, []);

    const videoDurationSec = useMemo(() => {
        if (previewItem?.type !== 'video') return 78;
        return parseDurationSeconds(previewItem.subtitle);
    }, [previewItem, parseDurationSeconds]);

    React.useEffect(() => {
        if (previewItem?.type === 'image' && previewItem.thumbnails && activePhotoIndex > 0) {
            setTimeout(() => {
                photoScrollRef.current?.scrollTo({ x: activePhotoIndex * screenWidth, animated: false });
            }, 60);
        }
        if (previewItem?.type === 'video') {
            setVideoProgress(14);
            setIsVideoPlaying(true);
        }
    }, [previewItem]);

    // Scroll & Message Ref navigation
    const messageLayouts = React.useRef<{ [key: string]: number }>({});
    const sectionLayouts = React.useRef<{ [key: string]: { y: number; height: number; items: any[] } }>({});
    const itemLayouts = React.useRef<{ [key: string]: { y: number; height: number; item: any } }>({});
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const formatItemDate = (item: any): { month: string; year: number; timestamp: number } => {
        if (item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return { month: months[d.getMonth()], year: d.getFullYear(), timestamp: d.getTime() };
            }
        }
        const str = `${item.dateLabel || ''} ${item.time || ''}`;
        const yearMatch = str.match(/\b(20\d\d)\b/);
        const now = new Date();
        const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
        const monthMatch = str.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthMatch ? monthMatch[1].slice(0, 3) : months[now.getMonth()];
        return { month, year, timestamp: new Date(`${month} 1, ${year}`).getTime() };
    };

    const computeDateRangeLabel = useCallback((items: any[]): string => {
        if (!items || items.length === 0) return 'This Month';
        const dates = items.map(formatItemDate).sort((a, b) => a.timestamp - b.timestamp);
        const oldest = dates[0];
        const newest = dates[dates.length - 1];

        if (oldest.year === newest.year && oldest.month === newest.month) {
            return `${oldest.month} ${oldest.year}`;
        }
        if (oldest.year === newest.year) {
            return `${oldest.month} – ${newest.month} ${oldest.year}`;
        }
        return `${oldest.month} ${oldest.year} – ${newest.month} ${newest.year}`;
    }, []);

    // Floating Sticky Date Header (Glassy Liquid Glass, Context-sensitive, Auto Fade Out)
    const [floatingDateLabel, setFloatingDateLabel] = useState<string>('Today');
    const floatingDateOpacity = useRef(new Animated.Value(0)).current;
    const floatingDateHideTimer = useRef<any>(null);

    const handleScroll = useCallback((event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 120;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
        setShowScrollBottom(!isCloseToBottom);

        let activeItems: Array<{ id: string; dateLabel?: string; time?: string; date?: string }> = [];
        if (activeTab === 'chat') activeItems = messages;
        else if (activeTab === 'documents') activeItems = docsList;
        else if (activeTab === 'media') activeItems = mediaList;
        else if (activeTab === 'links') activeItems = linksList;
        else if (activeTab === 'actions') activeItems = actionsList;

        if (activeItems.length > 0) {
            const scrollY = contentOffset.y;
            const viewportH = layoutMeasurement.height || 600;

            if (activeTab === 'chat') {
                const getItemLabel = (it: { dateLabel?: string; time?: string }) => {
                    const raw = it.dateLabel || it.time;
                    if (!raw) return 'Today';
                    if (raw.includes(':') || raw.includes('AM') || raw.includes('PM')) return 'Today';
                    return raw;
                };

                let activeLabel = getItemLabel(activeItems[0]);
                for (let i = 0; i < activeItems.length; i++) {
                    const item = activeItems[i];
                    const itemY = messageLayouts.current[item.id];
                    if (itemY !== undefined) {
                        if (itemY <= scrollY + 220) {
                            activeLabel = getItemLabel(item);
                        } else {
                            break;
                        }
                    }
                }
                setFloatingDateLabel(activeLabel);
            } else if (activeTab === 'documents') {
                const visibleItems: any[] = [];
                const isGrouped = !searchQuery.trim() && docFilterType === 'all' && (docSortMode === 'date-desc' || docSortMode === 'date-asc');
                if (isGrouped) {
                    Object.values(sectionLayouts.current).forEach((sec) => {
                        if (sec.y + sec.height >= scrollY + 30 && sec.y <= scrollY + viewportH - 30) {
                            visibleItems.push(...sec.items);
                        }
                    });
                } else {
                    Object.values(itemLayouts.current).forEach((entry) => {
                        if (entry.y + entry.height >= scrollY + 30 && entry.y <= scrollY + viewportH - 30) {
                            visibleItems.push(entry.item);
                        }
                    });
                }
                const label = computeDateRangeLabel(visibleItems.length > 0 ? visibleItems : docsList);
                setFloatingDateLabel(label);
            } else {
                // Media, Links, Actions
                const visibleItems: any[] = [];
                Object.values(itemLayouts.current).forEach((entry) => {
                    if (entry.y + entry.height >= scrollY + 30 && entry.y <= scrollY + viewportH - 30) {
                        visibleItems.push(entry.item);
                    }
                });
                const label = computeDateRangeLabel(visibleItems.length > 0 ? visibleItems : activeItems);
                setFloatingDateLabel(label);
            }

            Animated.timing(floatingDateOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();

            if (floatingDateHideTimer.current) {
                clearTimeout(floatingDateHideTimer.current);
            }
            floatingDateHideTimer.current = setTimeout(() => {
                Animated.timing(floatingDateOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            }, 1800);
        }
    }, [activeTab, messages, docsList, computeDateRangeLabel, searchQuery, docFilterType, docSortMode, floatingDateOpacity]);

    const handleContentSizeChange = useCallback((w: number, h: number) => {
        lastContentHeight.current = h;
        if (activeTab === 'chat' && messages.length > 0) {
            if (!hasInitialScrolled.current) {
                hasInitialScrolled.current = true;
                requestAnimationFrame(() => {
                    scrollToBottom(false);
                    setIsChatReady(true);
                });
                setTimeout(() => {
                    scrollToBottom(false);
                }, 100);
                setTimeout(() => {
                    scrollToBottom(false);
                }, 300);
            }
        }
    }, [activeTab, messages.length, scrollToBottom]);

    useEffect(() => {
        if (activeTab === 'chat' && messages.length > 0) {
            if (!hasInitialScrolled.current) {
                hasInitialScrolled.current = true;
                requestAnimationFrame(() => {
                    scrollToBottom(false);
                    setIsChatReady(true);
                });
                setTimeout(() => {
                    scrollToBottom(false);
                }, 100);
                setTimeout(() => {
                    scrollToBottom(false);
                }, 300);
            } else if (messages.length > prevMessagesCountRef.current) {
                requestAnimationFrame(() => {
                    scrollToBottom(true);
                });
                setTimeout(() => {
                    scrollToBottom(true);
                }, 100);
            }
        }
        prevMessagesCountRef.current = messages.length;
    }, [messages, activeTab, scrollToBottom]);

    const handleScrollToMessage = useCallback((targetId?: string) => {
        if (!targetId) return;
        const yOffset = messageLayouts.current[targetId];
        if (yOffset !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, yOffset - 120), animated: true });
            setHighlightedMessageId(targetId);
            Haptics.selectionAsync();
            setTimeout(() => {
                setHighlightedMessageId(null);
            }, 1400);
        }
    }, []);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const bubbleOtherBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderTint = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tenantLogo = activeTenant?.branding_logo_url || activeTenant?.logo_url || activeWorkspace?.logo_url;

    const headerTitleText = isSelectMode 
        ? `${selectedMessageIds.length} Selected`
        : isDocSelectMode
        ? `${selectedDocIds.length} Selected`
        : isMediaSelectMode
        ? `${selectedMediaIds.length} Selected`
        : isLinkSelectMode
        ? `${selectedLinkIds.length} Selected`
        : (displayName.length > 20 ? displayCode : displayName);

    const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);
    const activePinnedIndex = pinnedMessages.length > 0 ? (currentPinnedIndex % pinnedMessages.length) : 0;
    const currentPinned = pinnedMessages[activePinnedIndex];

    const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
        const res = await toggleMessageReaction(channelId, messageId, emoji, user?.id || 'anon');
        if (res?.message) {
            setMessages((prev) => prev.map((msg) => (msg.id === messageId ? res.message! : msg)));
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [channelId, user?.id]);

    const handleTogglePin = useCallback((messageId: string) => {
        const targetMsg = messages.find((m) => m.id === messageId);
        if (!targetMsg) return;

        if (!targetMsg.isPinned) {
            const currentlyPinned = messages.filter((m) => m.isPinned);
            if (currentlyPinned.length >= 3) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showToast('Maximum 3 pinned messages', 'exclamationmark.circle.fill', '#FF9500');
                return;
            }
        }

        let isNowPinned = false;
        setMessages((prev) =>
            prev.map((msg) => {
                if (msg.id === messageId) {
                    isNowPinned = !msg.isPinned;
                    return { ...msg, isPinned: isNowPinned };
                }
                return msg;
            })
        );
        toggleMessagePin(channelId, messageId, isNowPinned);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (isNowPinned) {
            showToast('Pinned', 'pin.fill', isDark ? FormaBlue[400] : FormaBlue[700]);
        } else {
            showToast('Unpinned', 'pin.slash', isDark ? '#A1A1AA' : '#8E8E93');
        }
    }, [messages, isDark, showToast, channelId]);

    const handleToggleSave = useCallback((messageId: string) => {
        let isNowSaved = false;
        setMessages((prev) =>
            prev.map((msg) => {
                if (msg.id === messageId) {
                    isNowSaved = !msg.isSaved;
                    return { ...msg, isSaved: isNowSaved };
                }
                return msg;
            })
        );
        updateChatMessage(channelId, messageId, { isSaved: isNowSaved });
        Haptics.selectionAsync();
        if (isNowSaved) {
            showToast('Bookmarked', 'bookmark.fill', '#FF9500');
        } else {
            showToast('Removed from Bookmarks', 'bookmark', isDark ? '#A1A1AA' : '#8E8E93');
        }
    }, [channelId, isDark, showToast]);

    // Multi-Select Handlers
    const handleToggleSelectMessage = useCallback((id: string) => {
        Haptics.selectionAsync();
        setSelectedMessageIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }, []);

    const handleEnterSelectMode = useCallback((initialId?: string) => {
        setIsSelectMode(true);
        setSelectedMessageIds(initialId ? [initialId] : []);
        setReplyingTo(null);
        setEditingMessage(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleExitSelectMode = useCallback(() => {
        setIsSelectMode(false);
        setSelectedMessageIds([]);
        Haptics.selectionAsync();
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
    }, []);

    const handleCopySelected = useCallback(async () => {
        const selectedTexts = messages
            .filter((m) => selectedMessageIds.includes(m.id))
            .map((m) => `${m.sender}: ${m.text}`)
            .filter(Boolean)
            .join('\n\n');

        if (selectedTexts) {
            await Clipboard.setStringAsync(selectedTexts);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Copied');
        }
        handleExitSelectMode();
    }, [messages, selectedMessageIds, handleExitSelectMode, showToast]);

    const handleForwardSelected = useCallback(() => {
        const selected = messages.filter((m) => selectedMessageIds.includes(m.id));
        if (selected.length > 0) {
            setForwardTargetMessages(selected);
        }
    }, [messages, selectedMessageIds]);

    const handleShareSelected = useCallback(async () => {
        const selectedTexts = messages
            .filter((m) => selectedMessageIds.includes(m.id))
            .map((m) => `${m.sender}: ${m.text || (m.attachments?.[0]?.name ? `[Document: ${m.attachments[0].name}]` : '[Media]')}`)
            .filter(Boolean)
            .join('\n\n');

        if (selectedTexts) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await Share.share({ message: selectedTexts });
            } catch (e) {
                // Ignore cancel/abort
            }
        }
    }, [messages, selectedMessageIds]);

    const multiSelectDeleteActions: ContextMenuAction[] = useMemo(() => {
        const selectedMessages = messages.filter((m) => selectedMessageIds.includes(m.id));
        const hasSelfMessage = selectedMessages.some((m) => m.isSelf);

        if (hasSelfMessage) {
            return [
                { title: 'Delete for Me', systemIcon: 'person.badge.minus', destructive: true },
                { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
            ];
        }

        return [
            { title: 'Delete for Me', systemIcon: 'person.badge.minus', destructive: true },
        ];
    }, [messages, selectedMessageIds]);

    const handleDeleteAction = useCallback(async (actionTitle: string) => {
        if (actionTitle === 'Delete for Everyone') {
            for (const id of selectedMessageIds) {
                await deleteChatMessageForEveryone(channelId, id, user?.id);
            }
            setMessages((prev) =>
                prev.map((m) =>
                    selectedMessageIds.includes(m.id)
                        ? { ...m, isDeleted: true, text: 'You deleted this message.', attachments: undefined, media: undefined, reactions: [], replyTo: undefined, hasMedia: false, hasLink: false, isPinned: false }
                        : m
                )
            );
            handleExitSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (actionTitle === 'Delete for Me') {
            for (const id of selectedMessageIds) {
                await deleteChatMessageForMe(channelId, id, user?.id);
            }
            setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.id)));
            handleExitSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [selectedMessageIds, handleExitSelectMode, channelId, user?.id]);

    const handleDeleteSelected = useCallback(() => {
        const selectedMessages = messages.filter((m) => selectedMessageIds.includes(m.id));
        const hasSelfMessage = selectedMessages.some((m) => m.isSelf);

        const performDeleteForMe = async () => {
            for (const id of selectedMessageIds) {
                await deleteChatMessageForMe(channelId, id, user?.id);
            }
            setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.id)));
            handleExitSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        };

        const performDeleteForEveryone = async () => {
            for (const id of selectedMessageIds) {
                await deleteChatMessageForEveryone(channelId, id, user?.id);
            }
            setMessages((prev) =>
                prev.map((m) =>
                    selectedMessageIds.includes(m.id)
                        ? { ...m, isDeleted: true, text: 'You deleted this message.', attachments: undefined, media: undefined, reactions: [], replyTo: undefined, hasMedia: false, hasLink: false, isPinned: false }
                        : m
                )
            );
            handleExitSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        };

        if (Platform.OS === 'ios') {
            const options = hasSelfMessage
                ? ['Cancel', 'Delete for Me', 'Delete for Everyone']
                : ['Cancel', 'Delete for Me'];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: hasSelfMessage ? 2 : 1,
                    cancelButtonIndex: 0,
                    title: 'Delete Messages',
                    message: `Delete ${selectedMessageIds.length} selected message(s)?`,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        performDeleteForMe();
                    } else if (buttonIndex === 2 && hasSelfMessage) {
                        performDeleteForEveryone();
                    }
                }
            );
        } else {
            const buttons = hasSelfMessage
                ? [
                    { text: 'Cancel', style: 'cancel' as const },
                    {
                        text: 'Delete for Me',
                        onPress: performDeleteForMe,
                    },
                    {
                        text: 'Delete for Everyone',
                        style: 'destructive' as const,
                        onPress: performDeleteForEveryone,
                    },
                  ]
                : [
                    { text: 'Cancel', style: 'cancel' as const },
                    {
                        text: 'Delete for Me',
                        style: 'destructive' as const,
                        onPress: performDeleteForMe,
                    },
                  ];

            Alert.alert(
                'Delete Messages',
                `Are you sure you want to delete ${selectedMessageIds.length} selected message(s)?`,
                buttons
            );
        }
    }, [messages, selectedMessageIds, handleExitSelectMode, channelId, user?.id]);

    const handleDeleteSingle = useCallback((item: ChatMessage, mode: 'forMe' | 'forEveryone' = 'forMe') => {
        setTimeout(() => {
            Alert.alert(
                mode === 'forEveryone' ? 'Delete for Everyone' : 'Delete for Me',
                mode === 'forEveryone'
                    ? 'Are you sure you want to delete this message for everyone?'
                    : 'Are you sure you want to delete this message for yourself?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            if (mode === 'forEveryone') {
                                await deleteChatMessageForEveryone(channelId, item.id, user?.id);
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === item.id
                                            ? {
                                                  ...m,
                                                  isDeleted: true,
                                                  text: 'You deleted this message.',
                                                  attachments: undefined,
                                                  media: undefined,
                                                  reactions: [],
                                                  replyTo: undefined,
                                                  hasMedia: false,
                                                  hasLink: false,
                                                  isPinned: false,
                                              }
                                            : m
                                    )
                                );
                            } else {
                                await deleteChatMessageForMe(channelId, item.id, user?.id);
                                setMessages((prev) => prev.filter((m) => m.id !== item.id));
                            }
                            if (replyingTo?.id === item.id) setReplyingTo(null);
                            if (editingMessage?.id === item.id) {
                                setEditingMessage(null);
                                setInputText('');
                                setInputKey((k) => k + 1);
                            }
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        },
                    },
                ]
            );
        }, 120);
    }, [replyingTo, editingMessage, channelId, user?.id]);

    const getTextContextMenuActions = useCallback((item: ChatMessage): ContextMenuAction[] => {
        if (item.isDeleted) {
            return [
                { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
            ];
        }
        const isLink = !!item.hasLink;

        return [
            // 1. Reactions Submenu
            {
                title: 'React',
                systemIcon: 'face.smiling',
                actions: [
                    { title: '👍 Like' },
                    { title: '❤️ Love' },
                    { title: '😂 Haha' },
                    { title: '😮 Wow' },
                    { title: '😢 Sad' },
                    { title: '🙏 Thanks' },
                    { title: 'More Reactions', systemIcon: 'plus' },
                ],
            },

            // Group A — Content-Specific Actions
            { title: 'Reply', systemIcon: 'arrowshape.turn.up.left' },
            { title: 'Copy', systemIcon: 'doc.on.doc' },
            ...(isLink
                ? [
                    { title: 'Open in Browser', systemIcon: 'safari' },
                    { title: 'Copy Link', systemIcon: 'link' },
                  ]
                : []
            ),

            // Group B — Send / Share
            { title: 'Forward', systemIcon: 'arrowshape.turn.up.right' },
            { title: 'Share', systemIcon: 'square.and.arrow.up' },

            // Group C — Organize
            {
                title: item.isPinned ? 'Unpin' : 'Pin',
                systemIcon: item.isPinned ? 'pin.slash' : 'pin',
            },
            {
                title: item.isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: item.isSaved ? 'bookmark.slash' : 'bookmark',
            },

            // Group D — Management
            { title: 'Select', systemIcon: 'checkmark.circle' },
            {
                title: 'More',
                systemIcon: 'ellipsis.circle',
                actions: [
                    ...(item.isSelf && !!item.text ? [{ title: 'Edit Message', systemIcon: 'pencil' }] : []),
                    {
                        title: 'Delete',
                        systemIcon: 'trash',
                        destructive: true,
                        actions: item.isSelf ? [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                            { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
                        ] : [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                        ],
                    },
                ],
            },
        ];
    }, []);

    const getMediaContextMenuActions = useCallback((item: ChatMessage): ContextMenuAction[] => {
        return [
            // 1. Reactions Submenu
            {
                title: 'React',
                systemIcon: 'face.smiling',
                actions: [
                    { title: '👍 Like' },
                    { title: '❤️ Love' },
                    { title: '😂 Haha' },
                    { title: '😮 Wow' },
                    { title: '😢 Sad' },
                    { title: '🙏 Thanks' },
                    { title: 'More Reactions', systemIcon: 'plus' },
                ],
            },

            // Group A — Content-Specific Actions
            { title: 'Reply', systemIcon: 'arrowshape.turn.up.left' },
            { title: 'Download', systemIcon: 'arrow.down.to.line' },

            // Group B — Send / Share
            { title: 'Forward', systemIcon: 'arrowshape.turn.up.right' },
            { title: 'Share', systemIcon: 'square.and.arrow.up' },

            // Group C — Organize
            {
                title: item.isPinned ? 'Unpin' : 'Pin',
                systemIcon: item.isPinned ? 'pin.slash' : 'pin',
            },
            {
                title: item.isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: item.isSaved ? 'bookmark.slash' : 'bookmark',
            },

            // Group D — Management
            { title: 'Select', systemIcon: 'checkmark.circle' },
            {
                title: 'More',
                systemIcon: 'ellipsis.circle',
                actions: [
                    {
                        title: 'Delete',
                        systemIcon: 'trash',
                        destructive: true,
                        actions: item.isSelf ? [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                            { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
                        ] : [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                        ],
                    },
                ],
            },
        ];
    }, []);

    const getDocContextMenuActions = useCallback((item: ChatMessage, att?: any): ContextMenuAction[] => {
        return [
            // 1. Reactions Submenu
            {
                title: 'React',
                systemIcon: 'face.smiling',
                actions: [
                    { title: '👍 Like' },
                    { title: '❤️ Love' },
                    { title: '😂 Haha' },
                    { title: '😮 Wow' },
                    { title: '😢 Sad' },
                    { title: '🙏 Thanks' },
                    { title: 'More Reactions', systemIcon: 'plus' },
                ],
            },

            // Group A — Content-Specific Actions
            { title: 'Reply', systemIcon: 'arrowshape.turn.up.left' },
            { title: 'Download', systemIcon: 'arrow.down.to.line' },

            // Group B — Send / Share
            { title: 'Forward', systemIcon: 'arrowshape.turn.up.right' },
            { title: 'Share', systemIcon: 'square.and.arrow.up' },

            // Group C — Organize
            {
                title: item.isPinned ? 'Unpin' : 'Pin',
                systemIcon: item.isPinned ? 'pin.slash' : 'pin',
            },
            {
                title: item.isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: item.isSaved ? 'bookmark.slash' : 'bookmark',
            },

            // Group D — Management
            { title: 'Get Info', systemIcon: 'info.circle' },
            { title: 'Select', systemIcon: 'checkmark.circle' },
            {
                title: 'More',
                systemIcon: 'ellipsis.circle',
                actions: [
                    {
                        title: 'Delete',
                        systemIcon: 'trash',
                        destructive: true,
                        actions: item.isSelf ? [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                            { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
                        ] : [
                            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                        ],
                    },
                ],
            },
        ];
    }, []);

    const handleMessageContextMenuPress = useCallback(async (item: ChatMessage, actionTitle: string, att?: any) => {
        Haptics.selectionAsync();

        // 1. Primary & Standard Actions FIRST
        if (actionTitle === 'Reply') {
            setEditingMessage(null);
            setReplyingTo(item);
        } else if (actionTitle === 'Download' || actionTitle === 'Save Media' || actionTitle === 'Download Document') {
            const fileName = att?.name || item.attachments?.[0]?.name || (item as any).attachment?.name || item.media?.title || 'file';
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Downloading ${truncateMiddleFileName(fileName)}`, 'arrow.down.to.line', FormaBlue[500]);
        } else if (actionTitle === 'Open in Browser' || actionTitle === 'Open Link') {
            if (item.linkUrl) Linking.openURL(item.linkUrl);
        } else if (actionTitle === 'Copy Link') {
            if (item.linkUrl) {
                await Clipboard.setStringAsync(item.linkUrl);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Link copied to clipboard', 'link', FormaBlue[500]);
            }
        } else if (actionTitle === 'Copy' || actionTitle === 'Copy Text') {
            await Clipboard.setStringAsync(item.text);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Copied', 'doc.on.doc', isDark ? FormaBlue[400] : FormaBlue[700]);
        } else if (actionTitle === 'Forward') {
            setForwardTargetMessages([item]);
        } else if (actionTitle === 'Share' || actionTitle === 'Share Media' || actionTitle === 'Share Document') {
            const shareText = item.text || item.media?.title || att?.name || 'Forma Message';
            Share.share({ message: shareText }).catch(() => {});
        } else if (actionTitle === 'Pin' || actionTitle === 'Unpin' || actionTitle.includes('Pin')) {
            handleTogglePin(item.id);
        } else if (actionTitle === 'Bookmark' || actionTitle === 'Remove Bookmark' || actionTitle === 'Save' || actionTitle === 'Remove from Saved' || actionTitle.includes('Bookmark') || actionTitle.includes('Save')) {
            handleToggleSave(item.id);
        } else if (actionTitle === 'Get Info' || actionTitle === 'Info') {
            const docObj = att || item.attachments?.[0] || {
                id: item.id,
                name: item.media?.title || 'Chat Message',
                size: `${item.text?.length || 0} characters`,
                uploadedBy: item.sender,
                time: item.time,
                isSaved: item.isSaved,
            };
            setDocInfoTarget(docObj);
        } else if (actionTitle === 'Edit Message' || actionTitle === 'Edit') {
            setReplyingTo(null);
            setEditingMessage(item);
            setInputText(item.text);
            setInputKey((k) => k + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (actionTitle === 'Select' || actionTitle === 'Select Messages') {
            handleEnterSelectMode(item.id);
        } else if (actionTitle === 'Delete for Everyone') {
            handleDeleteSingle(item, 'forEveryone');
        } else if (actionTitle === 'Delete for Me' || actionTitle === 'Delete Message' || actionTitle === 'Delete') {
            handleDeleteSingle(item, 'forMe');
        }
        // 2. Named Reactions & Extended Emojis
        else if (actionTitle.includes('Like') || actionTitle.startsWith('👍')) {
            toggleReaction(item.id, '👍');
        } else if (actionTitle.includes('Love') || actionTitle.startsWith('❤️')) {
            toggleReaction(item.id, '❤️');
        } else if (actionTitle.includes('Haha') || actionTitle.startsWith('😂')) {
            toggleReaction(item.id, '😂');
        } else if (actionTitle.includes('Wow') || actionTitle.startsWith('😮')) {
            toggleReaction(item.id, '😮');
        } else if (actionTitle.includes('Sad') || actionTitle.startsWith('😢')) {
            toggleReaction(item.id, '😢');
        } else if (actionTitle.includes('Thanks') || actionTitle.startsWith('🙏')) {
            toggleReaction(item.id, '🙏');
        } else if (actionTitle.includes('More Reactions') || actionTitle.includes('➕')) {
            if (Platform.OS === 'ios') {
                const moreEmojis = ['Cancel', '🏗️ Site', '✅ Approved', '🔥 Urgent', '🚀 Launched', '👀 Under Review', '💯 Perfect', '🤝 Agreed', '⚠️ Issue'];
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options: moreEmojis,
                        cancelButtonIndex: 0,
                        title: 'Select Reaction',
                    },
                    (buttonIndex) => {
                        if (buttonIndex > 0) {
                            const emoji = moreEmojis[buttonIndex].split(' ')[0];
                            toggleReaction(item.id, emoji);
                        }
                    }
                );
            }
        } else {
            toggleReaction(item.id, actionTitle.trim());
        }
    }, [handleDeleteSingle, handleEnterSelectMode, handleTogglePin, handleToggleSave, toggleReaction, isDark, showToast]);

    const sendInFlight = useRef(false);
    const handleSendMessage = async () => {
        if ((!inputText.trim() && stagedAttachments.length === 0) || sendInFlight.current) return;
        sendInFlight.current = true;
        try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (editingMessage) {
            updateChatMessage(channelId, editingMessage.id, { text: inputText.trim(), isEdited: true });
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === editingMessage.id
                        ? { ...msg, text: inputText.trim(), isEdited: true }
                        : msg
                )
            );
            setEditingMessage(null);
            setInputText('');
            setInputKey((k) => k + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
        }

        const senderName = profile?.full_name || user?.email?.split('@')[0] || 'You';
        const senderRole = profile?.position || profile?.job_title || profile?.role || 'Member';
        const avatarBg = '#007AFF';

        if (stagedAttachments.length > 0) {
            const currentStaged = [...stagedAttachments];
            setStagedAttachments([]);

            // Upload all staged attachments to Supabase Storage
            const uploadedAttachments = await Promise.all(
                currentStaged.map(async (att) => {
                    const publicUrl = await uploadChatAttachment(att.uri, att.name, activeTenant?.id, 'attachment', att.base64);
                    return { ...att, uri: publicUrl };
                })
            );

            const imageAttachments = uploadedAttachments.filter(a => a.type === 'image');
            const otherAttachments = uploadedAttachments.filter(a => a.type !== 'image');

            // If there are multiple images, group them into a single grid message
            if (imageAttachments.length > 1) {
                await sendChatMessage(channelId, {
                    text: inputText.trim(),
                    userId: user?.id,
                    senderName,
                    senderRole,
                    avatarBg,
                    workspaceId: activeWorkspace?.id,
                    tenantId: activeTenant?.id,
                    replyTo: replyingTo ? { messageId: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined,
                    media: {
                        type: 'image',
                        title: `${imageAttachments.length} photos`,
                        thumbnailUri: imageAttachments[0].uri,
                        thumbnails: imageAttachments.map(img => img.uri),
                        count: imageAttachments.length,
                    },
                }).then(sentMsg => {
                    setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
                });
            } else if (imageAttachments.length === 1) {
                const att = imageAttachments[0];
                await sendChatMessage(channelId, {
                    text: otherAttachments.length === 0 ? inputText.trim() : '',
                    userId: user?.id,
                    senderName,
                    senderRole,
                    avatarBg,
                    workspaceId: activeWorkspace?.id,
                    tenantId: activeTenant?.id,
                    replyTo: replyingTo ? { messageId: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined,
                    media: {
                        type: 'image',
                        title: att.name,
                        thumbnailUri: att.uri,
                        count: 1,
                    },
                }).then(sentMsg => {
                    setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
                });
            }

            for (const [index, att] of otherAttachments.entries()) {
                const isFirst = imageAttachments.length === 0 && index === 0;
                const captionText = isFirst ? inputText.trim() : '';

                if (att.type === 'video') {
                    await sendChatMessage(channelId, {
                        text: captionText,
                        userId: user?.id,
                        senderName,
                        senderRole,
                        avatarBg,
                        workspaceId: activeWorkspace?.id,
                        tenantId: activeTenant?.id,
                        replyTo: isFirst && replyingTo ? { messageId: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined,
                        media: {
                            type: 'video',
                            title: att.name,
                            thumbnailUri: att.uri,
                            duration: att.duration,
                            count: 1,
                        },
                    }).then(sentMsg => {
                        setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
                    });
                } else {
                    await sendChatMessage(channelId, {
                        text: captionText,
                        userId: user?.id,
                        senderName,
                        senderRole,
                        avatarBg,
                        workspaceId: activeWorkspace?.id,
                        tenantId: activeTenant?.id,
                        replyTo: isFirst && replyingTo ? { messageId: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined,
                        attachment: {
                            name: att.name,
                            size: att.size || '1.2 MB',
                            type: att.docType || 'pdf',
                            url: att.uri,
                        },
                    }).then(sentMsg => {
                        setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
                    });
                }
            }
        } else {
            await sendChatMessage(channelId, {
                text: inputText.trim(),
                userId: user?.id,
                senderName,
                senderRole,
                avatarBg,
                workspaceId: activeWorkspace?.id,
                tenantId: activeTenant?.id,
                replyTo: replyingTo ? { messageId: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined,
            }).then(sentMsg => {
                setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
            });
        }

        setInputText('');
        setInputKey((k) => k + 1);
        setReplyingTo(null);

        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        } catch (error: any) {
            const message = error?.message || 'Pesan gagal dikirim. Silakan coba lagi.';
            if (Platform.OS === 'web') window.alert(message);
            else Alert.alert('Chat', message);
            if (stagedAttachments.length) setStagedAttachments(stagedAttachments);
        } finally {
            sendInFlight.current = false;
        }
    };

    const docContextMenuActions: ContextMenuAction[] = useMemo(() => [
        {
            title: 'Download',
            systemIcon: 'arrow.down.circle',
        },
        {
            title: 'Share',
            systemIcon: 'square.and.arrow.up',
        },
        {
            title: 'Select',
            systemIcon: 'checkmark.circle',
        },
        {
            title: 'Delete',
            systemIcon: 'trash',
            destructive: true,
            actions: [
                {
                    title: 'Delete for Me',
                    systemIcon: 'person.crop.circle.badge.minus',
                    destructive: true,
                },
                {
                    title: 'Delete for Everyone',
                    systemIcon: 'trash.fill',
                    destructive: true,
                },
            ],
        },
    ], []);

    const getDocBadgeConfig = useCallback((fileName: string) => {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.pdf')) {
            return {
                icon: 'doc.text',
                iconColor: isDark ? '#FF6961' : '#E04848',
                bgColor: isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 59, 48, 0.09)',
                typeName: 'PDF Document',
            };
        }
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
            return {
                icon: 'tablecells',
                iconColor: isDark ? '#30D158' : '#28A745',
                bgColor: isDark ? 'rgba(52, 199, 89, 0.16)' : 'rgba(52, 199, 89, 0.09)',
                typeName: 'Spreadsheet',
            };
        }
        if (lower.endsWith('.dwg') || lower.endsWith('.cad')) {
            return {
                icon: 'square.stack.3d.up',
                iconColor: isDark ? '#64D2FF' : '#007AFF',
                bgColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.09)',
                typeName: 'CAD Drawing',
            };
        }
        return {
            icon: 'doc',
            iconColor: isDark ? '#A0A0A5' : '#71717A',
            bgColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            typeName: 'Document',
        };
    }, [isDark]);

    const getDocCardContextMenuActions = useCallback((doc: any): ContextMenuAction[] => {
        const isSaved = savedDocIds.includes(doc.id);
        const isSelf = doc.isSelf || doc.uploadedBy === 'You';
        return [
            {
                title: 'Download',
                systemIcon: 'arrow.down.to.line',
            },
            {
                title: 'Forward',
                systemIcon: 'arrowshape.turn.up.right',
            },
            {
                title: 'Share',
                systemIcon: 'square.and.arrow.up',
            },
            {
                title: isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: isSaved ? 'bookmark.slash' : 'bookmark',
            },
            {
                title: 'Get Info',
                systemIcon: 'info.circle',
            },
            {
                title: 'Select',
                systemIcon: 'checkmark.circle',
            },
            {
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
                actions: isSelf ? [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                    {
                        title: 'Delete for Everyone',
                        systemIcon: 'trash.fill',
                        destructive: true,
                    },
                ] : [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                ],
            },
        ];
    }, [savedDocIds]);

    const handleDocActionPress = (doc: any, actionName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionName === 'Download') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Downloading ${truncateMiddleFileName(doc.name)}`, 'arrow.down.to.line', FormaBlue[500]);
        } else if (actionName === 'Forward') {
            setForwardTargetMessages([{
                id: doc.id,
                sender: doc.uploadedBy,
                text: doc.name,
                time: doc.time,
                isSelf: doc.isSelf,
                avatarBg: '#5856D6',
            }]);
        } else if (actionName === 'Share') {
            Share.share({
                message: `Forma Project File: ${doc.name}`,
                title: doc.name,
            }).catch(() => {});
        } else if (actionName === 'Bookmark' || actionName === 'Remove Bookmark' || actionName === 'Save' || actionName === 'Remove from Saved') {
            const isSaved = savedDocIds.includes(doc.id);
            setSavedDocIds(prev => isSaved ? prev.filter(id => id !== doc.id) : [...prev, doc.id]);
            showToast(isSaved ? 'Removed from Bookmarks' : 'Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        } else if (actionName === 'Get Info' || actionName === 'Info') {
            setDocInfoTarget(doc);
        } else if (actionName === 'Select') {
            handleEnterDocSelectMode(doc.id);
        } else if (actionName === 'Delete for Me' || actionName === 'Delete for Everyone') {
            setDocsList(prev => prev.filter(d => d.id !== doc.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Deleted ${doc.name}`, 'trash.fill', '#FF453A');
        }
    };

    const handleAttachSelect = useCallback(async (action: string) => {
        try {
            if (action === 'Take Photo') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Camera permission is required to take photos.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                    base64: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const asset = result.assets[0];
                    setStagedAttachments(prev => [
                        ...prev,
                        {
                            id: `staged-${Date.now()}`,
                            type: 'image',
                            uri: asset.uri,
                            name: asset.fileName || `Photo_${Date.now()}.jpg`,
                            base64: asset.base64 || undefined,
                        },
                    ]);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else if (action === 'Photo Library') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Photo library permission is required to select photos/videos.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images', 'videos'],
                    allowsMultipleSelection: true,
                    selectionLimit: 10,
                    quality: 0.8,
                    base64: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const newItems = result.assets.slice(0, 10).map((asset, index) => {
                        const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video');
                        const durationStr = isVideo && asset.duration ? `${Math.floor(asset.duration / 60)}:${String(Math.floor(asset.duration % 60)).padStart(2, '0')}` : undefined;
                        return {
                            id: `staged-${Date.now()}-${index}`,
                            type: (isVideo ? 'video' : 'image') as 'video' | 'image',
                            uri: asset.uri,
                            name: asset.fileName || (isVideo ? `Video_${Date.now()}_${index}.mp4` : `Photo_${Date.now()}_${index}.jpg`),
                            duration: durationStr,
                            base64: asset.base64 || undefined,
                        };
                    });
                    setStagedAttachments(prev => [...prev, ...newItems]);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else if (action === 'Browse File') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: '*/*',
                    multiple: true,
                    copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const newItems = result.assets.slice(0, 5).map((asset, index) => {
                        const formattedSize = asset.size ? (asset.size > 1024 * 1024 ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(asset.size / 1024)} KB`) : '1.2 MB';
                        const isXlsx = asset.name?.toLowerCase().endsWith('.xlsx') || asset.name?.toLowerCase().endsWith('.xls') || asset.name?.toLowerCase().endsWith('.csv');
                        return {
                            id: `staged-${Date.now()}-${index}`,
                            type: 'document' as const,
                            uri: asset.uri,
                            name: asset.name || `Document_${Date.now()}_${index}`,
                            size: formattedSize,
                            docType: isXlsx ? 'xlsx' as const : 'pdf' as const,
                        };
                    });
                    setStagedAttachments(prev => [...prev, ...newItems]);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error) {
            console.error('Attachment selection error:', error);
        }
    }, []);

    const handleAttachAction = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Photo Library', 'Browse File'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleAttachSelect('Take Photo');
                    } else if (buttonIndex === 2) {
                        handleAttachSelect('Photo Library');
                    } else if (buttonIndex === 3) {
                        handleAttachSelect('Browse File');
                    }
                }
            );
        } else {
            setIsAndroidAttachSheetVisible(true);
        }
    }, [handleAttachSelect]);

    // Document Multi-Select Handlers
    const handleToggleSelectDoc = useCallback((id: string) => {
        Haptics.selectionAsync();
        setSelectedDocIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }, []);

    const handleEnterDocSelectMode = useCallback((initialId?: string) => {
        setIsDocSelectMode(true);
        setSelectedDocIds(initialId ? [initialId] : []);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleExitDocSelectMode = useCallback(() => {
        setIsDocSelectMode(false);
        setSelectedDocIds([]);
        Haptics.selectionAsync();
    }, []);

    const handleBookmarkSelectedDocs = useCallback(() => {
        if (selectedDocIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const allBookmarked = selectedDocIds.every(id => savedDocIds.includes(id));
        if (allBookmarked) {
            setSavedDocIds(prev => prev.filter(id => !selectedDocIds.includes(id)));
            showToast(`Removed from Bookmarks`, 'bookmark.fill', '#FFCC00');
        } else {
            setSavedDocIds(prev => Array.from(new Set([...prev, ...selectedDocIds])));
            showToast(`Added to Bookmarks`, 'bookmark.fill', '#FFCC00');
        }
        handleExitDocSelectMode();
    }, [selectedDocIds, savedDocIds, handleExitDocSelectMode, showToast]);

    const handleForwardSelectedDocs = useCallback(() => {
        if (selectedDocIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const selectedDocs = docsList.filter(d => selectedDocIds.includes(d.id));
        setForwardTargetMessages(selectedDocs.map(d => ({
            id: d.id,
            sender: d.uploadedBy,
            text: d.name,
            time: d.time,
            isSelf: d.isSelf,
            avatarBg: '#5856D6',
        })));
    }, [selectedDocIds, docsList]);

    const handleShareSelectedDocs = useCallback(async () => {
        if (selectedDocIds.length === 0) return;
        const selectedDocObjects = docsList.filter(d => selectedDocIds.includes(d.id));
        const shareMessage = selectedDocObjects.map(d => `${d.name} (${d.size})`).join('\n');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                title: 'Share Documents',
                message: `Forma Project Files:\n${shareMessage}`,
            });
        } catch (e) {
            // Ignore cancel/abort
        }
    }, [selectedDocIds, docsList]);

    const handleDownloadSelectedDocs = useCallback(() => {
        if (selectedDocIds.length === 0) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(`Downloading ${selectedDocIds.length} document${selectedDocIds.length > 1 ? 's' : ''}`, 'arrow.down.to.line', FormaBlue[500]);
        handleExitDocSelectMode();
    }, [selectedDocIds, handleExitDocSelectMode, showToast]);

    const multiSelectDocDeleteActions: ContextMenuAction[] = useMemo(() => {
        const selectedDocs = docsList.filter((d) => selectedDocIds.includes(d.id));
        const hasSelfDoc = selectedDocs.some((d) => d.isSelf || d.uploadedBy === 'You');

        if (hasSelfDoc) {
            return [
                { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
            ];
        }

        return [
            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
        ];
    }, [docsList, selectedDocIds]);

    const handleDeleteDocBatchAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'Delete for Me' || actionTitle === 'Delete for Everyone') {
            const count = selectedDocIds.length;
            setDocsList(prev => prev.filter(d => !selectedDocIds.includes(d.id)));
            handleExitDocSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Deleted ${count} document${count > 1 ? 's' : ''}`, 'trash.fill', '#FF453A');
        }
    }, [selectedDocIds, handleExitDocSelectMode, showToast]);

    const docSortActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Newest to Oldest', systemIcon: 'arrow.down', state: docSortMode === 'date-desc' ? 'on' : 'off' },
        { title: 'Oldest to Newest', systemIcon: 'arrow.up', state: docSortMode === 'date-asc' ? 'on' : 'off' },
        { title: 'Name (A to Z)', systemIcon: 'textformat.abc', state: docSortMode === 'name-asc' ? 'on' : 'off' },
        { title: 'Name (Z to A)', systemIcon: 'textformat.abc', state: docSortMode === 'name-desc' ? 'on' : 'off' },
        { title: 'Largest to Smallest', systemIcon: 'arrow.down.circle', state: docSortMode === 'size-desc' ? 'on' : 'off' },
        { title: 'Smallest to Largest', systemIcon: 'arrow.up.circle', state: docSortMode === 'size-asc' ? 'on' : 'off' },
    ], [docSortMode]);

    const docFilterActions: ContextMenuAction[] = useMemo(() => {
        const hasPdf = docsList.some(d => d.name.toLowerCase().endsWith('.pdf'));
        const hasSheet = docsList.some(d => d.name.toLowerCase().endsWith('.xlsx') || d.name.toLowerCase().endsWith('.xls') || d.name.toLowerCase().endsWith('.csv'));
        const hasCad = docsList.some(d => d.name.toLowerCase().endsWith('.dwg') || d.name.toLowerCase().endsWith('.cad'));

        const actions: ContextMenuAction[] = [
            { title: 'All Documents', systemIcon: 'doc.on.doc', state: docFilterType === 'all' ? 'on' : 'off' },
            { title: 'Bookmarked', systemIcon: 'bookmark', state: docFilterType === 'saved' ? 'on' : 'off' },
        ];
        if (hasPdf) {
            actions.push({ title: 'PDF Files', systemIcon: 'doc.text', state: docFilterType === 'pdf' ? 'on' : 'off' });
        }
        if (hasSheet) {
            actions.push({ title: 'Spreadsheets', systemIcon: 'tablecells', state: docFilterType === 'spreadsheet' ? 'on' : 'off' });
        }
        if (hasCad) {
            actions.push({ title: 'CAD Drawings', systemIcon: 'square.stack.3d.up', state: docFilterType === 'cad' ? 'on' : 'off' });
        }
        if (docFilterType !== 'all') {
            actions.push({
                title: 'Reset Filter',
                systemIcon: 'arrow.counterclockwise',
                destructive: true,
            });
        }
        return actions;
    }, [docsList, docFilterType]);

    const handleDocSortAction = useCallback((actionTitle: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionTitle === 'Newest to Oldest') setDocSortMode('date-desc');
        else if (actionTitle === 'Oldest to Newest') setDocSortMode('date-asc');
        else if (actionTitle === 'Name (A to Z)') setDocSortMode('name-asc');
        else if (actionTitle === 'Name (Z to A)') setDocSortMode('name-desc');
        else if (actionTitle === 'Largest to Smallest') setDocSortMode('size-desc');
        else if (actionTitle === 'Smallest to Largest') setDocSortMode('size-asc');
        else if (actionTitle === 'Reset Sort' || actionTitle.includes('Reset')) setDocSortMode('date-desc');
    }, []);

    const handleDocFilterAction = useCallback((actionTitle: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionTitle === 'All Documents' || actionTitle === 'Reset Filter' || actionTitle.includes('Reset')) setDocFilterType('all');
        else if (actionTitle === 'Bookmarked Documents' || actionTitle === 'Saved Documents' || actionTitle === 'Saved' || actionTitle === 'Bookmarked') setDocFilterType('saved');
        else if (actionTitle === 'PDF Files') setDocFilterType('pdf');
        else if (actionTitle === 'Spreadsheets') setDocFilterType('spreadsheet');
        else if (actionTitle === 'CAD Drawings') setDocFilterType('cad');
    }, []);

    const filteredDocs = useMemo(() => {
        let list = [...docsList];
        if (docFilterType === 'saved') {
            list = list.filter(doc => savedDocIds.includes(doc.id));
        } else if (docFilterType !== 'all') {
            list = list.filter((doc) => {
                const lower = doc.name.toLowerCase();
                if (docFilterType === 'pdf') return lower.endsWith('.pdf');
                if (docFilterType === 'spreadsheet') return lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
                if (docFilterType === 'cad') return lower.endsWith('.dwg') || lower.endsWith('.cad');
                return true;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((doc) => doc.name.toLowerCase().includes(q) || doc.uploadedBy.toLowerCase().includes(q));
        }
        const parseKb = (sizeStr: string) => {
            const s = sizeStr.toUpperCase();
            const n = parseFloat(s) || 0;
            if (s.includes('GB')) return n * 1024 * 1024;
            if (s.includes('MB')) return n * 1024;
            return n;
        };
        if (docSortMode === 'date-asc') {
            list.reverse();
        } else if (docSortMode === 'name-asc') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (docSortMode === 'name-desc') {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else if (docSortMode === 'size-desc') {
            list.sort((a, b) => parseKb(b.size) - parseKb(a.size));
        } else if (docSortMode === 'size-asc') {
            list.sort((a, b) => parseKb(a.size) - parseKb(b.size));
        }
        return list;
    }, [docsList, searchQuery, docSortMode, docFilterType, savedDocIds]);

    const getDocSectionTitle = useCallback((doc: any): string => {
        if (doc.dateLabel) return doc.dateLabel;
        return 'This Month';
    }, []);

    const groupedDocSections = useMemo(() => {
        const groups: { title: string; data: typeof filteredDocs }[] = [];
        filteredDocs.forEach((doc) => {
            const title = getDocSectionTitle(doc);
            const existing = groups.find((g) => g.title === title);
            if (existing) {
                existing.data.push(doc);
            } else {
                groups.push({ title, data: [doc] });
            }
        });
        return groups;
    }, [filteredDocs, getDocSectionTitle]);

    const getMediaCardContextMenuActions = useCallback((media: any): ContextMenuAction[] => {
        const isSelf = media.uploadedBy === 'You' || media.isSelf;
        const isSaved = savedMediaIds.includes(media.id);
        return [
            // Group A — Content-Specific Actions
            {
                title: 'Download',
                systemIcon: 'arrow.down.to.line',
            },
            // Group B — Send / Share
            {
                title: 'Forward',
                systemIcon: 'arrowshape.turn.up.right',
            },
            {
                title: 'Share',
                systemIcon: 'square.and.arrow.up',
            },
            // Group C — Organize
            {
                title: isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: isSaved ? 'bookmark.slash' : 'bookmark',
            },
            // Group D — Management
            {
                title: 'Get Info',
                systemIcon: 'info.circle',
            },
            {
                title: 'Select',
                systemIcon: 'checkmark.circle',
            },
            // Group E — Destructive
            {
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
                actions: isSelf ? [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                    {
                        title: 'Delete for Everyone',
                        systemIcon: 'trash.fill',
                        destructive: true,
                    },
                ] : [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                ],
            },
        ];
    }, [savedMediaIds]);

    const handleMediaActionPress = useCallback((media: any, actionName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionName === 'Download' || actionName === 'Save Video' || actionName === 'Save Image' || actionName.includes('Save to Photos') || actionName.includes('Save Image') || actionName.includes('Save Video')) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Downloaded to Photos', 'arrow.down.to.line', FormaBlue[500]);
        } else if (actionName === 'Forward') {
            setForwardTargetMessages([{
                id: media.id,
                sender: media.uploadedBy,
                text: media.title,
                time: media.time,
                isSelf: media.uploadedBy === 'You' || media.isSelf,
                avatarBg: '#5856D6',
            }]);
        } else if (actionName === 'Share') {
            Share.share({
                message: `Forma Media: ${media.title}`,
                title: media.title,
            }).catch(() => {});
        } else if (actionName === 'Bookmark' || actionName === 'Remove Bookmark' || actionName === 'Save' || actionName === 'Remove from Saved') {
            const isSaved = savedMediaIds.includes(media.id);
            setSavedMediaIds(prev => isSaved ? prev.filter(id => id !== media.id) : [...prev, media.id]);
            showToast(isSaved ? 'Removed from Bookmarks' : 'Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        } else if (actionName === 'Get Info' || actionName === 'Info') {
            setDocInfoTarget({
                id: media.id,
                name: media.title || 'Media File',
                size: media.size || '3.2 MB',
                uploadedBy: media.uploadedBy || 'You',
                time: media.time || '10:00 AM',
                dateLabel: media.dateLabel,
                isSaved: savedMediaIds.includes(media.id),
                isMedia: true,
                isVideo: media.isVideo,
                uri: media.uri,
            });
        } else if (actionName === 'Select') {
            setIsMediaSelectMode(true);
            setSelectedMediaIds([media.id]);
        } else if (actionName === 'Delete for Me' || actionName === 'Delete for Everyone' || actionName === 'Delete') {
            setMediaList(prev => prev.filter(m => m.id !== media.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Media deleted', 'trash.fill', '#FF453A');
        }
    }, [savedMediaIds, showToast]);

    const handleToggleSelectMedia = useCallback((mediaId: string) => {
        Haptics.selectionAsync();
        setSelectedMediaIds((prev) =>
            prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
        );
    }, []);

    const handleEnterMediaSelectMode = useCallback((initialId?: string) => {
        setIsMediaSelectMode(true);
        setSelectedMediaIds(initialId ? [initialId] : []);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleExitMediaSelectMode = useCallback(() => {
        setIsMediaSelectMode(false);
        setSelectedMediaIds([]);
        Haptics.selectionAsync();
    }, []);

    const handleBookmarkSelectedMedia = useCallback(() => {
        if (selectedMediaIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const allBookmarked = selectedMediaIds.every(id => savedMediaIds.includes(id));
        if (allBookmarked) {
            setSavedMediaIds(prev => prev.filter(id => !selectedMediaIds.includes(id)));
            showToast('Removed from Bookmarks', 'bookmark.fill', '#FFCC00');
        } else {
            setSavedMediaIds(prev => Array.from(new Set([...prev, ...selectedMediaIds])));
            showToast('Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        }
        handleExitMediaSelectMode();
    }, [selectedMediaIds, savedMediaIds, handleExitMediaSelectMode, showToast]);

    const handleSaveSelectedMedia = useCallback(() => {
        if (selectedMediaIds.length === 0) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(`Downloaded ${selectedMediaIds.length} item${selectedMediaIds.length > 1 ? 's' : ''} to Photos`, 'arrow.down.to.line', FormaBlue[500]);
        handleExitMediaSelectMode();
    }, [selectedMediaIds, handleExitMediaSelectMode, showToast]);

    const handleForwardSelectedMedia = useCallback(() => {
        if (selectedMediaIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const selectedMedia = mediaList.filter(m => selectedMediaIds.includes(m.id));
        setForwardTargetMessages(selectedMedia.map(m => ({
            id: m.id,
            sender: m.uploadedBy,
            text: m.title,
            time: m.time,
            isSelf: m.uploadedBy === 'You' || !!(m as any).isSelf,
            avatarBg: '#5856D6',
        })));
    }, [selectedMediaIds, mediaList]);

    const handleShareSelectedMedia = useCallback(async () => {
        if (selectedMediaIds.length === 0) return;
        const selectedMediaObjects = mediaList.filter(m => selectedMediaIds.includes(m.id));
        const shareMessage = selectedMediaObjects.map(m => `${m.title} (${m.time})`).join('\n');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                title: 'Share Media',
                message: `Forma Media Files:\n${shareMessage}`,
            });
        } catch (e) {
            // Ignore cancel/abort
        }
    }, [selectedMediaIds, mediaList]);

    const multiSelectMediaDeleteActions: ContextMenuAction[] = useMemo(() => {
        const selectedMedia = mediaList.filter((m) => selectedMediaIds.includes(m.id));
        const hasSelfMedia = selectedMedia.some((m) => m.uploadedBy === 'You' || !!(m as any).isSelf);

        if (hasSelfMedia) {
            return [
                { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
            ];
        }

        return [
            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
        ];
    }, [mediaList, selectedMediaIds]);

    const handleDeleteMediaBatchAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'Delete for Me' || actionTitle === 'Delete for Everyone') {
            const count = selectedMediaIds.length;
            setMediaList(prev => prev.filter(m => !selectedMediaIds.includes(m.id)));
            handleExitMediaSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Deleted ${count} item${count > 1 ? 's' : ''}`, 'trash.fill', '#FF453A');
        }
    }, [selectedMediaIds, handleExitMediaSelectMode, showToast]);

    const mediaSortActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Newest First', systemIcon: 'arrow.down', state: mediaSortMode === 'date-desc' ? 'on' : 'off' },
        { title: 'Oldest First', systemIcon: 'arrow.up', state: mediaSortMode === 'date-asc' ? 'on' : 'off' },
    ], [mediaSortMode]);

    const handleMediaSortAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'Newest First' || actionTitle.includes('Newest')) setMediaSortMode('date-desc');
        else if (actionTitle === 'Oldest First' || actionTitle.includes('Oldest')) setMediaSortMode('date-asc');
        Haptics.selectionAsync();
    }, []);

    const mediaFilterActions: ContextMenuAction[] = useMemo(() => [
        { title: 'All Media', systemIcon: 'photo.on.rectangle.angled', state: mediaFilterType === 'all' ? 'on' : 'off' },
        { title: 'Bookmarked', systemIcon: 'bookmark', state: mediaFilterType === 'saved' ? 'on' : 'off' },
        { title: 'Photos', systemIcon: 'photo', state: mediaFilterType === 'photos' ? 'on' : 'off' },
        { title: 'Videos', systemIcon: 'video', state: mediaFilterType === 'videos' ? 'on' : 'off' },
    ], [mediaFilterType]);

    const handleMediaFilterAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'All Media' || actionTitle.includes('All')) setMediaFilterType('all');
        else if (actionTitle === 'Bookmarked' || actionTitle.includes('Bookmark') || actionTitle.includes('Saved')) setMediaFilterType('saved');
        else if (actionTitle === 'Photos' || actionTitle.includes('Photo')) setMediaFilterType('photos');
        else if (actionTitle === 'Videos' || actionTitle.includes('Video')) setMediaFilterType('videos');
        Haptics.selectionAsync();
    }, []);

    const filteredMedia = useMemo(() => {
        let list = [...mediaList];
        if (mediaFilterType === 'photos') {
            list = list.filter((m) => !m.isVideo);
        } else if (mediaFilterType === 'videos') {
            list = list.filter((m) => m.isVideo);
        } else if (mediaFilterType === 'saved') {
            list = list.filter((m) => savedMediaIds.includes(m.id));
        }
        if (mediaSortMode === 'date-asc') {
            list.reverse();
        }
        return list;
    }, [mediaList, mediaFilterType, mediaSortMode, savedMediaIds]);

    const getLinkCardContextMenuActions = useCallback((link: any): ContextMenuAction[] => {
        const isSelf = link.sharedBy === 'You' || (link as any).isSelf;
        const isSaved = savedLinkIds.includes(link.id);
        return [
            // Group A — Content-Specific Actions
            {
                title: 'Open in Browser',
                systemIcon: 'safari',
            },
            {
                title: 'Copy Link',
                systemIcon: 'link',
            },
            // Group B — Send / Share
            {
                title: 'Forward',
                systemIcon: 'arrowshape.turn.up.right',
            },
            {
                title: 'Share',
                systemIcon: 'square.and.arrow.up',
            },
            // Group C — Organize
            {
                title: isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: isSaved ? 'bookmark.slash' : 'bookmark',
            },
            // Group D — Management
            {
                title: 'Select',
                systemIcon: 'checkmark.circle',
            },
            // Group E — Destructive
            {
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
                actions: isSelf ? [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                    {
                        title: 'Delete for Everyone',
                        systemIcon: 'trash',
                        destructive: true,
                    },
                ] : [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                ],
            },
        ];
    }, [savedLinkIds]);

    const handleLinkActionPress = useCallback(async (link: any, actionName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionName === 'Open in Browser' || actionName === 'Open in Safari' || actionName === 'Open Link') {
            Linking.openURL(link.url);
        } else if (actionName === 'Copy Link') {
            await Clipboard.setStringAsync(link.url);
            showToast('Link copied to clipboard', 'link', FormaBlue[500]);
        } else if (actionName === 'Forward') {
            setForwardTargetMessages([{
                id: link.id,
                sender: link.sharedBy,
                text: link.url,
                time: link.time,
                isSelf: link.sharedBy === 'You' || (link as any).isSelf,
                avatarBg: '#5856D6',
            }]);
        } else if (actionName === 'Share') {
            Share.share({
                message: link.url,
                title: link.title || link.url,
                url: link.url,
            }).catch(() => {});
        } else if (actionName === 'Bookmark' || actionName === 'Remove Bookmark' || actionName === 'Save' || actionName === 'Remove from Saved') {
            const isSaved = savedLinkIds.includes(link.id);
            setSavedLinkIds(prev => isSaved ? prev.filter(id => id !== link.id) : [...prev, link.id]);
            showToast(isSaved ? 'Removed from Bookmarks' : 'Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        } else if (actionName === 'Get Info' || actionName === 'Info') {
            setDocInfoTarget({
                id: link.id,
                name: link.title || link.url,
                size: link.url,
                uploadedBy: link.sharedBy || 'You',
                time: link.time || '10:00 AM',
                dateLabel: link.dateLabel,
                isSaved: savedLinkIds.includes(link.id),
                isLink: true,
                url: link.url,
            });
        } else if (actionName === 'Select') {
            setIsLinkSelectMode(true);
            setSelectedLinkIds([link.id]);
        } else if (actionName === 'Delete for Me' || actionName === 'Delete for Everyone' || actionName === 'Delete') {
            setLinksList(prev => prev.filter(l => l.id !== link.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Link deleted', 'trash.fill', '#FF453A');
        }
    }, [savedLinkIds, showToast]);

    const handleToggleSelectLink = useCallback((linkId: string) => {
        Haptics.selectionAsync();
        setSelectedLinkIds((prev) =>
            prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId]
        );
    }, []);

    const handleEnterLinkSelectMode = useCallback((initialId?: string) => {
        setIsLinkSelectMode(true);
        setSelectedLinkIds(initialId ? [initialId] : []);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleExitLinkSelectMode = useCallback(() => {
        setIsLinkSelectMode(false);
        setSelectedLinkIds([]);
        Haptics.selectionAsync();
    }, []);

    const handleBookmarkSelectedLinks = useCallback(() => {
        if (selectedLinkIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const allBookmarked = selectedLinkIds.every(id => savedLinkIds.includes(id));
        if (allBookmarked) {
            setSavedLinkIds(prev => prev.filter(id => !selectedLinkIds.includes(id)));
            showToast('Removed from Bookmarks', 'bookmark.fill', '#FFCC00');
        } else {
            setSavedLinkIds(prev => Array.from(new Set([...prev, ...selectedLinkIds])));
            showToast('Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        }
        handleExitLinkSelectMode();
    }, [selectedLinkIds, savedLinkIds, handleExitLinkSelectMode, showToast]);

    const handleCopySelectedLinks = useCallback(async () => {
        if (selectedLinkIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const selected = linksList.filter(l => selectedLinkIds.includes(l.id));
        const urls = selected.map(l => l.url).join('\n');
        await Clipboard.setStringAsync(urls);
        showToast(`Copied ${selectedLinkIds.length} link${selectedLinkIds.length > 1 ? 's' : ''}`, 'doc.on.doc', FormaBlue[500]);
        handleExitLinkSelectMode();
    }, [selectedLinkIds, linksList, handleExitLinkSelectMode, showToast]);

    const handleForwardSelectedLinks = useCallback(() => {
        if (selectedLinkIds.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const selected = linksList.filter(l => selectedLinkIds.includes(l.id));
        setForwardTargetMessages(selected.map(l => ({
            id: l.id,
            sender: l.sharedBy,
            text: l.url,
            time: l.time,
            isSelf: l.sharedBy === 'You' || (l as any).isSelf,
            avatarBg: '#5856D6',
        })));
    }, [selectedLinkIds, linksList]);

    const handleShareSelectedLinks = useCallback(async () => {
        if (selectedLinkIds.length === 0) return;
        const selected = linksList.filter(l => selectedLinkIds.includes(l.id));
        const shareMessage = selected.map(l => (l.title ? `${l.title}: ${l.url}` : l.url)).join('\n');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                title: 'Share Links',
                message: shareMessage,
            });
        } catch (e) {
            // Ignore cancel/abort
        }
    }, [selectedLinkIds, linksList]);

    const multiSelectLinkDeleteActions: ContextMenuAction[] = useMemo(() => {
        const selected = linksList.filter((l) => selectedLinkIds.includes(l.id));
        const hasSelf = selected.some((l) => l.sharedBy === 'You' || (l as any).isSelf);

        if (hasSelf) {
            return [
                { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
                { title: 'Delete for Everyone', systemIcon: 'trash', destructive: true },
            ];
        }

        return [
            { title: 'Delete for Me', systemIcon: 'person.crop.circle.badge.minus', destructive: true },
        ];
    }, [linksList, selectedLinkIds]);

    const handleDeleteLinkBatchAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'Delete for Me' || actionTitle === 'Delete for Everyone') {
            const count = selectedLinkIds.length;
            setLinksList(prev => prev.filter(l => !selectedLinkIds.includes(l.id)));
            handleExitLinkSelectMode();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Deleted ${count} link${count > 1 ? 's' : ''}`, 'trash.fill', '#FF453A');
        }
    }, [selectedLinkIds, handleExitLinkSelectMode, showToast]);

    const linkSortActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Newest First', systemIcon: 'arrow.down', state: linkSortMode === 'date-desc' ? 'on' : 'off' },
        { title: 'Oldest First', systemIcon: 'arrow.up', state: linkSortMode === 'date-asc' ? 'on' : 'off' },
        { title: 'Title (A to Z)', systemIcon: 'textformat.abc', state: linkSortMode === 'title-asc' ? 'on' : 'off' },
        { title: 'Title (Z to A)', systemIcon: 'textformat.abc', state: linkSortMode === 'title-desc' ? 'on' : 'off' },
    ], [linkSortMode]);

    const handleLinkSortAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'Newest First' || actionTitle.includes('Newest')) setLinkSortMode('date-desc');
        else if (actionTitle === 'Oldest First' || actionTitle.includes('Oldest')) setLinkSortMode('date-asc');
        else if (actionTitle === 'Title (A to Z)' || actionTitle.includes('A to Z')) setLinkSortMode('title-asc');
        else if (actionTitle === 'Title (Z to A)' || actionTitle.includes('Z to A')) setLinkSortMode('title-desc');
        Haptics.selectionAsync();
    }, []);

    const linkFilterActions: ContextMenuAction[] = useMemo(() => [
        { title: 'All Links', systemIcon: 'link', state: linkFilterType === 'all' ? 'on' : 'off' },
        { title: 'Bookmarked', systemIcon: 'bookmark', state: linkFilterType === 'saved' ? 'on' : 'off' },
    ], [linkFilterType]);

    const handleLinkFilterAction = useCallback((actionTitle: string) => {
        if (actionTitle === 'All Links' || actionTitle.includes('All')) setLinkFilterType('all');
        else if (actionTitle === 'Bookmarked' || actionTitle.includes('Bookmark') || actionTitle.includes('Saved')) setLinkFilterType('saved');
        Haptics.selectionAsync();
    }, []);

    const filteredLinks = useMemo(() => {
        let list = [...linksList];
        if (linkFilterType === 'saved') {
            list = list.filter(l => savedLinkIds.includes(l.id));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((link) => (link.title && link.title.toLowerCase().includes(q)) || link.sharedBy.toLowerCase().includes(q) || link.url.toLowerCase().includes(q));
        }
        if (linkSortMode === 'date-asc') {
            list.reverse();
        } else if (linkSortMode === 'title-asc') {
            list.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
        } else if (linkSortMode === 'title-desc') {
            list.sort((a, b) => (b.title || b.url).localeCompare(a.title || a.url));
        }
        return list;
    }, [linksList, searchQuery, linkSortMode, linkFilterType, savedLinkIds]);

    const getLinkSectionTitle = useCallback((link: any): string => {
        if (link.dateLabel) return link.dateLabel;
        return 'This Month';
    }, []);

    const groupedLinkSections = useMemo(() => {
        const groups: { title: string; data: typeof filteredLinks }[] = [];
        filteredLinks.forEach((link) => {
            const title = getLinkSectionTitle(link);
            const existing = groups.find((g) => g.title === title);
            if (existing) {
                existing.data.push(link);
            } else {
                groups.push({ title, data: [link] });
            }
        });
        return groups;
    }, [filteredLinks, getLinkSectionTitle]);

    const getActionCardContextMenuActions = useCallback((action: any): ContextMenuAction[] => {
        const isSaved = savedActionIds.includes(action.id);
        return [
            // Group A — Content-Specific Actions
            {
                title: 'Open Detail',
                systemIcon: 'arrow.up.right.square',
            },
            // Group B — Send / Share
            {
                title: 'Forward',
                systemIcon: 'arrowshape.turn.up.right',
            },
            {
                title: 'Share',
                systemIcon: 'square.and.arrow.up',
            },
            // Group C — Organize
            {
                title: isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: isSaved ? 'bookmark.slash' : 'bookmark',
            },
            // Group D — Management
            {
                title: 'Get Info',
                systemIcon: 'info.circle',
            },
            // Group E — Destructive
            {
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
            },
        ];
    }, [savedActionIds]);

    const handleActionCardPress = useCallback((action: any, actionName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionName === 'Open Detail') {
            Alert.alert(action.title, `Assignee: ${action.assignee}\nPriority: ${action.priority}\nStatus: ${action.status}`);
        } else if (actionName === 'Forward') {
            setForwardTargetMessages([{
                id: action.id,
                sender: action.assignee,
                text: action.title,
                time: 'Today',
                isSelf: false,
                avatarBg: '#5856D6',
            }]);
        } else if (actionName === 'Share') {
            Share.share({
                title: action.title,
                message: `Forma Action: ${action.title} (${action.status}) - Assigned to ${action.assignee}`,
            }).catch(() => {});
        } else if (actionName === 'Bookmark' || actionName === 'Remove Bookmark' || actionName === 'Save' || actionName === 'Remove from Saved') {
            const isSaved = savedActionIds.includes(action.id);
            setSavedActionIds(prev => isSaved ? prev.filter(id => id !== action.id) : [...prev, action.id]);
            showToast(isSaved ? 'Removed from Bookmarks' : 'Added to Bookmarks', 'bookmark.fill', '#FFCC00');
        } else if (actionName === 'Get Info' || actionName === 'Info') {
            setDocInfoTarget({
                id: action.id,
                name: action.title,
                size: `${action.priority} Priority`,
                uploadedBy: action.assignee,
                time: action.status,
                isSaved: savedActionIds.includes(action.id),
            });
        } else if (actionName === 'Delete') {
            setActionsList(prev => prev.filter(a => a.id !== action.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Action deleted', 'trash.fill', '#FF453A');
        }
    }, [savedActionIds, showToast]);

    const filteredActions = useMemo(() => {
        if (!searchQuery.trim()) return actionsList;
        const q = searchQuery.toLowerCase();
        return actionsList.filter((act) => act.title.toLowerCase().includes(q) || act.assignee.toLowerCase().includes(q));
    }, [searchQuery, actionsList]);

    const navigateToChatInfo = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === 'web') {
            toggleChatInfo();
        } else {
            router.push({
                pathname: '/chat-info/[id]',
                params: {
                    id: params.id || 'general-channel',
                    name: displayName,
                    code: displayCode,
                    members: displayMembers,
                    category: (params as any).category || (displayCode.includes('gen') ? 'general' : channelId.startsWith('dept-') ? 'department' : channelId.startsWith('proj-') ? 'project' : 'manual'),
                },
            } as any);
        }
    }, [params, displayName, displayCode, displayMembers, channelId, router, toggleChatInfo]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen
                options={{
                    headerShown: Platform.OS !== 'web',
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerTitle: () => (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={navigateToChatInfo}
                            style={{ alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>
                                {headerTitleText}
                            </Text>
                        </TouchableOpacity>
                    ),
                    headerTitleAlign: 'center',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerRight: () => (
                        <HeaderToolbar
                            actions={[
                                {
                                    id: 'info',
                                    icon: 'information-circle-outline',
                                    image: 'info.circle',
                                    tintColor: textColor,
                                    onPress: navigateToChatInfo,
                                },
                            ]}
                            isDark={isDark}
                            textColor={textColor}
                            maxDirectActions={1}
                        />
                    ),
                }}
            />

            {Platform.OS === 'web' && (
                <WebFinderHeader
                    title={displayCode}
                    subtitle={displayName}
                    showBack={!isEmbedded}
                    onBack={() => router.back()}
                    actions={[
                        {
                            id: 'info',
                            icon: 'information-circle-outline',
                            image: 'info.circle',
                            tintColor: textColor,
                            onPress: navigateToChatInfo,
                        },
                    ]}
                    centerComponent={
                        <SegmentedControl
                            fullWidth
                            equalWidth
                            style={{ width: '100%', maxWidth: 400 }}
                            segments={CHAT_SEGMENTS}
                            activeSegment={activeTab}
                            onSegmentChange={(tab) => {
                                setActiveTab(tab);
                                setSearchQuery('');
                            }}
                        />
                    }
                />
            )}

            {/* Floating Toast HUD */}
            {toastState && (
                <Animated.View
                    style={[
                        styles.floatingToastContainer,
                        {
                            top: (insets.top > 0 ? insets.top : 20) + 52,
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-16, 0],
                                    }),
                                },
                                {
                                    scale: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <SwiftUIToastHUD
                        message={toastState.message}
                        icon={toastState.icon}
                        iconColor={toastState.iconColor}
                        isDark={isDark}
                    />
                </Animated.View>
            )}

            <ScrollView
                ref={scrollViewRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentContainerStyle={{ paddingBottom: (insets.bottom > 0 ? insets.bottom : 16) + 80, paddingTop: 0 }}
                stickyHeaderIndices={[1]}
            >
                {/* Hero Section - Edge-to-Edge with Blended Gradient (Mobile Native Only) */}
                {Platform.OS !== 'web' && (
                    <View style={styles.heroContainer}>
                        <View style={[styles.heroImage, { backgroundColor: isDark ? '#000000' : '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
                            {channelAvatarUri ? (
                                <Image
                                    source={{ uri: channelAvatarUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : tenantLogo ? (
                                tenantLogo.toLowerCase().endsWith('.svg') || tenantLogo.includes('.svg') ? (
                                    <SvgUri uri={tenantLogo} width={110} height={110} />
                                ) : (
                                    <Image
                                        source={{ uri: tenantLogo }}
                                        style={{ width: 120, height: 120 }}
                                        resizeMode="contain"
                                    />
                                )
                            ) : (
                                <FormaLogo size={80} isDark={isDark} />
                            )}
                        </View>

                        <LinearGradient
                            colors={[
                                'transparent',
                                isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                                isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                                isDark ? '#000000' : '#F2F2F7'
                            ]}
                            style={[StyleSheet.absoluteFill, { top: '40%' }]}
                            locations={[0, 0.3, 0.7, 1]}
                        />

                        <View style={[styles.heroContent, { paddingBottom: 8 }]}>
                            <View style={styles.heroTextRow}>
                                <View style={{ flex: 1 }}>
                                    <BlurView
                                        intensity={30}
                                        tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                        style={[styles.smallPill, {
                                            alignSelf: 'flex-start',
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                                            marginBottom: 6,
                                            overflow: 'hidden'
                                        }]}
                                    >
                                        <Text style={[styles.smallPillText, { color: textColor, fontSize: 10, fontWeight: '700' }]}>{displayCode}</Text>
                                    </BlurView>
                                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>{displayName}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Sticky Segmented Control & Pinned Message Layer */}
                <View
                    pointerEvents={(isSelectMode || isDocSelectMode || isMediaSelectMode || isLinkSelectMode) ? 'none' : 'box-none'}
                    style={[
                        styles.stickySegmentedControlContainer,
                        { paddingTop: Platform.OS === 'ios' ? insets.top + 55 : (Platform.OS === 'web' ? 0 : 8) },
                        (isSelectMode || isDocSelectMode || isMediaSelectMode || isLinkSelectMode) && { opacity: 0 }
                    ]}
                >
                    {Platform.OS !== 'web' && (
                        <SegmentedControl
                            segments={CHAT_SEGMENTS}
                            activeSegment={activeTab}
                            onSegmentChange={(tab) => {
                                setActiveTab(tab);
                                setSearchQuery('');
                                messageLayouts.current = {};
                                sectionLayouts.current = {};
                                itemLayouts.current = {};
                                if (tab === 'chat') {
                                    setFloatingDateLabel('Today');
                                } else if (tab === 'documents') {
                                    setFloatingDateLabel(groupedDocSections[0]?.title || 'This Month');
                                } else if (tab === 'media') {
                                    setFloatingDateLabel('This Month');
                                } else if (tab === 'links') {
                                    setFloatingDateLabel(groupedLinkSections[0]?.title || 'This Month');
                                } else if (tab === 'actions') {
                                    setFloatingDateLabel('This Month');
                                }
                                if (isDocSelectMode) {
                                    setIsDocSelectMode(false);
                                    setSelectedDocIds([]);
                                }
                                if (isMediaSelectMode) {
                                    setIsMediaSelectMode(false);
                                    setSelectedMediaIds([]);
                                }
                                if (isLinkSelectMode) {
                                    setIsLinkSelectMode(false);
                                    setSelectedLinkIds([]);
                                }
                            }}
                            style={styles.topSegmentedControl}
                        />
                    )}

                    {/* Former Member History Access Notice Banner */}
                    {membership.status === 'former' && (
                        <View style={[styles.formerMemberBanner, {
                            backgroundColor: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)',
                            borderColor: isDark ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.2)',
                        }]}>
                            <Ionicons name="information-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                            <Text style={[styles.formerMemberText, { color: isDark ? '#FF807B' : '#D70015' }]}>
                                You are a former member of this channel. You can view message history up to your departure, but cannot send new messages.
                            </Text>
                        </View>
                    )}

                    {/* Sticky Floating Native SwiftUI Liquid Glass Pinned Message Banner */}
                    {activeTab === 'chat' && currentPinned && (
                        <View style={styles.pinnedBannerWrapper}>
                            <View style={styles.pinnedBannerContainer}>
                                {Platform.OS === 'ios' ? (
                                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <SwiftUIGlassEffectContainer modifiers={[
                                                frame({ maxWidth: Infinity, height: 48 }),
                                                cornerRadius(24)
                                            ]}>
                                                <SwiftUIHStack alignment="center" modifiers={[
                                                    frame({ maxWidth: Infinity, height: 48 }),
                                                    glassEffect({ shape: 'capsule' })
                                                ]}>
                                                    <SwiftUISpacer />
                                                </SwiftUIHStack>
                                            </SwiftUIGlassEffectContainer>
                                        </Host>
                                    </View>
                                ) : (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderRadius: 24 }]} />
                                )}

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        handleScrollToMessage(currentPinned.id);
                                        if (pinnedMessages.length > 1) {
                                            setCurrentPinnedIndex((prev) => (prev + 1) % pinnedMessages.length);
                                        }
                                    }}
                                    style={styles.pinnedBannerInner}
                                >
                                    {/* WhatsApp-style left vertical track indicator */}
                                    {pinnedMessages.length > 1 ? (
                                        <View style={{ width: 3, height: 26, justifyContent: 'space-between', marginRight: 10, paddingVertical: 1 }}>
                                            {pinnedMessages.map((_, idx) => (
                                                <View
                                                    key={idx}
                                                    style={{
                                                        flex: 1,
                                                        marginVertical: 1,
                                                        borderRadius: 1.5,
                                                        backgroundColor: idx === activePinnedIndex
                                                            ? (isDark ? FormaBlue[400] : FormaBlue[700])
                                                            : (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)'),
                                                    }}
                                                />
                                            ))}
                                        </View>
                                    ) : (
                                        <View
                                            style={{
                                                width: 3,
                                                height: 24,
                                                borderRadius: 1.5,
                                                backgroundColor: isDark ? FormaBlue[400] : FormaBlue[700],
                                                marginRight: 10,
                                            }}
                                        />
                                    )}

                                    <View style={{ marginRight: 8 }}>
                                        <PlatformIcon name="pin.fill" size={14} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                    </View>

                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={[styles.pinnedBannerTitle, { color: isDark ? FormaBlue[400] : FormaBlue[700] }]}>
                                            {pinnedMessages.length > 1 ? `Pinned message • ${activePinnedIndex + 1} of ${pinnedMessages.length}` : 'Pinned message'}
                                        </Text>
                                        <Text style={[styles.pinnedBannerText, { color: textColor }]} numberOfLines={1}>
                                            {currentPinned.sender}: {currentPinned.text || (currentPinned.attachment ? currentPinned.attachment.name : (currentPinned.media ? 'Photo' : 'Message'))}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            handleTogglePin(currentPinned.id);
                                        }}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                        style={{ padding: 6 }}
                                        activeOpacity={0.6}
                                    >
                                        <PlatformIcon name="xmark" size={13} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Floating Context-Sensitive Date Header (Auto Fade Out across all tabs) */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            activeTab === 'chat' ? styles.floatingDateBadgeWrapper : styles.floatingDateBadgeWrapperRight,
                            { opacity: floatingDateOpacity }
                        ]}
                    >
                        <View style={styles.floatingDateContainer}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ maxWidth: Infinity, height: 28 }),
                                        cornerRadius(14)
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ maxWidth: Infinity, height: 28 }),
                                            glassEffect({ shape: 'capsule' })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]} />
                            )}
                            <View style={styles.floatingDateInner}>
                                <Text style={[styles.floatingDateText, { color: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)' }]}>
                                    {floatingDateLabel}
                                </Text>
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* Scrollable Content Area */}
                <View style={[styles.content, { marginTop: 8 }]}>
                    {/* TAB 1: CHAT MESSAGES */}
                    {activeTab === 'chat' && (
                        <View style={[styles.chatSection, { opacity: isChatReady ? 1 : 0 }]}>
                            {messages.length === 0 ? (
                                <View style={styles.emptyStateCard}>
                                    <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon
                                            name="bubble.left.and.bubble.right"
                                            size={32}
                                            tintColor={subtextColor}
                                        />
                                    </View>
                                    <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                                        Welcome to {displayName}
                                    </Text>
                                    <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                                        {displayCode.includes('gen') || (params as any).category === 'general'
                                            ? 'This is the official workspace general channel. All team members can communicate and share announcements here.'
                                            : channelId.startsWith('dept-') || (params as any).category === 'department'
                                            ? `This is the dedicated department channel for ${displayName}. Start collaborating with your department team.`
                                            : channelId.startsWith('proj-') || (params as any).category === 'project'
                                            ? `This is the collaboration channel for ${displayName}. Coordinate tasks and share project updates.`
                                            : 'This is the start of the channel. Send a message below to begin collaborating.'}
                                    </Text>
                                    <View style={[styles.emptyStateBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={subtextColor} style={{ marginRight: 6 }} />
                                        <Text style={[styles.emptyStateBadgeText, { color: subtextColor }]}>
                                            Send a message to start the conversation
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                messages.map((item, index) => {
                                const isAnnouncementMsg = Boolean(item.isAnnouncement || item.linkedRecord?.type === 'announcement' || item.forwardedFrom === 'Announcements' || item.forwardedFrom?.toLowerCase() === 'announcements' || item.sender === 'Announcement' || item.sender === 'Announcements');
                                const hasText = !!item.text || !!item.replyTo || isAnnouncementMsg;
                                const hasMedia = !!item.media;
                                const attList = item.attachments || (item.attachment ? [item.attachment] : []);
                                const isSelected = selectedMessageIds.includes(item.id);

                                const prevItem = index > 0 ? messages[index - 1] : null;
                                const itemDateLabel = item.dateLabel || 'Today';
                                const prevDateLabel = prevItem ? (prevItem.dateLabel || 'Today') : null;
                                const showDateSeparator = !prevDateLabel || itemDateLabel !== prevDateLabel;

                                return (
                                <React.Fragment key={item.id ? `${item.id}-${index}` : `msg-${index}`}>
                                    {showDateSeparator && (
                                        <View style={styles.dateSeparatorContainer}>
                                            <View style={[styles.dateSeparatorBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                                                <Text style={[styles.dateSeparatorText, { color: subtextColor }]}>
                                                    {itemDateLabel}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                    <View
                                        onLayout={(e) => {
                                            messageLayouts.current[item.id] = e.nativeEvent.layout.y;
                                        }}
                                        style={[
                                            styles.messageRow,
                                            item.isSelf ? styles.messageRowSelf : styles.messageRowOther,
                                            isSelectMode && { alignItems: 'center' },
                                            isSelectMode && isSelected && {
                                                backgroundColor: isDark ? 'rgba(0, 122, 255, 0.14)' : 'rgba(0, 122, 255, 0.07)',
                                                borderRadius: 16,
                                                paddingHorizontal: 6,
                                                paddingVertical: 4,
                                            },
                                        ]}
                                    >
                                        {isSelectMode && (
                                            <TouchableOpacity
                                                onPress={() => handleToggleSelectMessage(item.id)}
                                                style={{ marginRight: 8, padding: 2 }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                                    size={24}
                                                    color={isSelected ? (isDark ? FormaBlue[400] : FormaBlue[700]) : subtextColor}
                                                />
                                            </TouchableOpacity>
                                        )}

                                        {!item.isSelf && !isSelectMode && (
                                            <View style={[styles.avatar, { backgroundColor: item.avatarBg, overflow: 'hidden' }]}>
                                                {item.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: item.avatarUrl }}
                                                        style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Text style={styles.avatarText}>{(item.sender || 'M').charAt(0).toUpperCase()}</Text>
                                                )}
                                            </View>
                                        )}

                                        <View style={[styles.bubbleContainer, item.isSelf && { alignItems: 'flex-end' }]}>
                                            {!item.isSelf && (
                                                <View style={styles.senderHeader}>
                                                    <Text style={[styles.senderName, { color: textColor }]}>
                                                        {resolveFullName(item.sender, item.userId)}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={{ gap: 4, alignItems: item.isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                                                {/* 1. Text Bubble */}
                                                {hasText && (
                                                    <ContextMenu
                                                        actions={getTextContextMenuActions(item)}
                                                        onPress={(e) => handleMessageContextMenuPress(item, e.nativeEvent.name)}
                                                        previewBackgroundColor="transparent"
                                                        disabled={isSelectMode}
                                                        style={{ borderRadius: 18, alignSelf: item.isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}
                                                    >
                                                        <TouchableOpacity
                                                            activeOpacity={isSelectMode ? 0.75 : 1}
                                                            onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : undefined}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.bubble,
                                                                    isAnnouncementMsg
                                                                        ? { backgroundColor: FormaBlue[700] }
                                                                        : item.isSelf
                                                                        ? styles.bubbleSelf
                                                                        : [
                                                                              styles.bubbleOther,
                                                                              { backgroundColor: bubbleOtherBg },
                                                                          ],
                                                                    highlightedMessageId === item.id && {
                                                                        backgroundColor: isDark ? 'rgba(86, 151, 255, 0.32)' : 'rgba(0, 54, 248, 0.14)',
                                                                    },
                                                                ]}
                                                            >
                                                                {item.isDeleted ? (
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, paddingHorizontal: 2 }}>
                                                                        <Ionicons
                                                                            name="ban-outline"
                                                                            size={14}
                                                                            color={item.isSelf || isAnnouncementMsg ? 'rgba(255,255,255,0.7)' : (isDark ? '#8E8E93' : '#636366')}
                                                                        />
                                                                        <Text
                                                                            style={[
                                                                                styles.messageText,
                                                                                {
                                                                                    fontStyle: 'italic',
                                                                                    color: item.isSelf || isAnnouncementMsg ? 'rgba(255,255,255,0.85)' : (isDark ? '#8E8E93' : '#636366'),
                                                                                }
                                                                            ]}
                                                                        >
                                                                            {item.text}
                                                                        </Text>
                                                                    </View>
                                                                ) : (
                                                                    <>
                                                                        {item.isForwarded && (
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                                                <PlatformIcon
                                                                                    name="arrowshape.turn.up.right.fill"
                                                                                    size={11}
                                                                                    tintColor={item.isSelf || isAnnouncementMsg ? 'rgba(255,255,255,0.75)' : (isDark ? '#8E8E93' : '#636366')}
                                                                                />
                                                                                <Text
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        fontStyle: 'italic',
                                                                                        color: item.isSelf || isAnnouncementMsg ? 'rgba(255,255,255,0.8)' : (isDark ? '#8E8E93' : '#636366'),
                                                                                    }}
                                                                                >
                                                                                    Forwarded message{item.forwardedFrom ? ` from ${item.forwardedFrom}` : ''}
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        {item.isAnnouncement && !item.isForwarded && (
                                                                            <View style={styles.announcementHeader}>
                                                                                <PlatformIcon name="megaphone.fill" size={13} tintColor="#FFFFFF" />
                                                                                <Text style={[styles.announcementTitle, { color: '#FFFFFF' }]}>
                                                                                    SITE ANNOUNCEMENT
                                                                                </Text>
                                                                            </View>
                                                                        )}

                                                                        {item.replyTo && (
                                                                            <TouchableOpacity
                                                                                activeOpacity={0.7}
                                                                                onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => handleScrollToMessage(item.replyTo?.messageId)}
                                                                                style={[
                                                                                    styles.quotedReplyBox,
                                                                                    {
                                                                                        backgroundColor: item.isSelf || isAnnouncementMsg
                                                                                            ? 'rgba(0,0,0,0.18)'
                                                                                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                                                    }
                                                                                ]}
                                                                            >
                                                                                <Text style={[styles.quotedReplySender, { color: item.isSelf || isAnnouncementMsg ? '#FFFFFF' : (isDark ? FormaBlue[400] : FormaBlue[700]) }]}>
                                                                                    {item.replyTo.sender}
                                                                                </Text>
                                                                                <Text style={[styles.quotedReplyText, { color: item.isSelf || isAnnouncementMsg ? 'rgba(255,255,255,0.85)' : subtextColor }]} numberOfLines={1}>
                                                                                    {item.replyTo.text}
                                                                                </Text>
                                                                            </TouchableOpacity>
                                                                        )}

                                                                        {!!item.text && (
                                                                            <FormattedChatMessageText
                                                                                text={item.text}
                                                                                isSelf={!!item.isSelf || isAnnouncementMsg}
                                                                                textColor={isAnnouncementMsg ? '#FFFFFF' : textColor}
                                                                                isDark={isDark}
                                                                            />
                                                                        )}

                                                                        {Boolean(item.linkedRecord?.type === 'announcement' || item.forwardedFrom === 'Announcements') && (
                                                                            <TouchableOpacity
                                                                                activeOpacity={0.75}
                                                                                onPress={() => {
                                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                                    const annId = item.linkedRecord?.id;
                                                                                    router.push({
                                                                                        pathname: '/announcement-detail',
                                                                                        params: annId ? { id: annId } : {},
                                                                                    });
                                                                                }}
                                                                                style={{
                                                                                    flexDirection: 'row',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between',
                                                                                    paddingHorizontal: 12,
                                                                                    paddingVertical: 8,
                                                                                    borderRadius: 12,
                                                                                    marginTop: 8,
                                                                                    backgroundColor: (item.isSelf || isAnnouncementMsg)
                                                                                        ? 'rgba(0, 0, 0, 0.18)'
                                                                                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 54, 248, 0.06)'),
                                                                                    borderWidth: 1,
                                                                                    borderColor: (item.isSelf || isAnnouncementMsg)
                                                                                        ? 'rgba(255, 255, 255, 0.2)'
                                                                                        : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 54, 248, 0.12)'),
                                                                                }}
                                                                            >
                                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                                                    <PlatformIcon
                                                                                        name="megaphone.fill"
                                                                                        size={13}
                                                                                        tintColor={(item.isSelf || isAnnouncementMsg) ? '#FFFFFF' : '#0036F8'}
                                                                                    />
                                                                                    <Text
                                                                                        style={{
                                                                                            fontSize: 12.5,
                                                                                            fontWeight: '600',
                                                                                            color: (item.isSelf || isAnnouncementMsg) ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#0036F8'),
                                                                                        }}
                                                                                        numberOfLines={1}
                                                                                    >
                                                                                        {item.linkedRecord?.title || 'Open Announcement Detail'}
                                                                                    </Text>
                                                                                </View>
                                                                                <PlatformIcon
                                                                                    name="chevron.right"
                                                                                    size={12}
                                                                                    tintColor={(item.isSelf || isAnnouncementMsg) ? 'rgba(255,255,255,0.7)' : (isDark ? '#A1A1A6' : '#8E8E93')}
                                                                                />
                                                                            </TouchableOpacity>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </View>
                                                        </TouchableOpacity>
                                                    </ContextMenu>
                                                )}

                                                {/* 2. Embedded Media */}
                                                {hasMedia && item.media && (
                                                    <ContextMenu
                                                        actions={getMediaContextMenuActions(item)}
                                                        onPress={(e) => handleMessageContextMenuPress(item, e.nativeEvent.name)}
                                                        previewBackgroundColor="transparent"
                                                        disabled={isSelectMode}
                                                        style={{ borderRadius: 18, alignSelf: item.isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}
                                                    >
                                                        <TouchableOpacity 
                                                            activeOpacity={0.92}
                                                            style={[
                                                                styles.mediaContainer,
                                                                highlightedMessageId === item.id && {
                                                                    opacity: 0.85,
                                                                }
                                                            ]}
                                                        >
                                                            {item.media.type !== 'video' ? (
                                                                item.media.thumbnails && item.media.thumbnails.length > 1 ? (
                                                                    <View style={styles.photoGrid}>
                                                                        {item.media.thumbnails.slice(0, 4).map((thumbUri, tIdx) => {
                                                                            const isFourth = tIdx === 3;
                                                                            const extraCount = (item.media?.count || item.media?.thumbnails?.length || 4) - 4;
                                                                            const showMoreOverlay = isFourth && extraCount > 0;
                                                                            const resolvedThumb = typeof thumbUri === 'string' ? thumbUri : ((thumbUri as any)?.uri || (thumbUri as any)?.url || '');
                                                                            return (
                                                                                <TouchableOpacity
                                                                                    key={tIdx}
                                                                                    activeOpacity={0.85}
                                                                                    onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => {
                                                                                        Haptics.selectionAsync();
                                                                                        setActivePhotoIndex(tIdx);
                                                                                        openFilePreview({
                                                                                            type: 'image',
                                                                                            title: item.media?.title || 'Site Photos',
                                                                                            name: item.media?.title || 'Site Photos',
                                                                                            subtitle: `${item.sender} • ${item.time}`,
                                                                                            uploadedBy: item.sender,
                                                                                            time: item.time,
                                                                                            thumbnails: item.media?.thumbnails?.map(t => typeof t === 'string' ? t : ((t as any)?.uri || (t as any)?.url)),
                                                                                            activeIndex: tIdx,
                                                                                        });
                                                                                    }}
                                                                                    style={styles.photoGridTile}
                                                                                >
                                                                                    <Image source={{ uri: resolvedThumb }} style={styles.photoGridImage} resizeMode="cover" />
                                                                                    {showMoreOverlay && (
                                                                                        <View style={styles.photoGridOverlay}>
                                                                                            <Text style={styles.photoGridOverlayText}>+{extraCount + 1}</Text>
                                                                                        </View>
                                                                                    )}
                                                                                </TouchableOpacity>
                                                                            );
                                                                        })}
                                                                    </View>
                                                                ) : (
                                                                    (() => {
                                                                        const photoUri = item.media?.thumbnailUri || (item.media as any)?.uri || (item.media as any)?.url || (item.media as any)?.thumbnailUrl || (item.media?.thumbnails && item.media.thumbnails[0]) || 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80';
                                                                        return (
                                                                            <TouchableOpacity
                                                                                activeOpacity={0.88}
                                                                                onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => {
                                                                                    Haptics.selectionAsync();
                                                                                    setActivePhotoIndex(0);
                                                                                    openFilePreview({
                                                                                        type: 'image',
                                                                                        title: item.media?.title || 'Site Photo',
                                                                                        name: item.media?.title || 'Site Photo',
                                                                                        subtitle: `${item.sender} • ${item.time}`,
                                                                                        uploadedBy: item.sender,
                                                                                        time: item.time,
                                                                                        uri: photoUri,
                                                                                        url: photoUri,
                                                                                    });
                                                                                }}
                                                                                style={styles.singlePhotoWrapper}
                                                                            >
                                                                                <Image
                                                                                    source={{ uri: photoUri }}
                                                                                    style={styles.singlePhotoImage}
                                                                                    resizeMode="cover"
                                                                                />
                                                                            </TouchableOpacity>
                                                                        );
                                                                    })()
                                                                )
                                                            ) : (
                                                                (() => {
                                                                    const videoUri = item.media?.thumbnailUri || (item.media as any)?.uri || (item.media as any)?.url || (item.media as any)?.thumbnailUrl || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80';
                                                                    return (
                                                                        <TouchableOpacity
                                                                            activeOpacity={0.88}
                                                                            onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => {
                                                                                Haptics.selectionAsync();
                                                                                setIsVideoPlaying(true);
                                                                                openFilePreview({
                                                                                    type: 'video',
                                                                                    title: item.media?.title || 'Site Video Clip',
                                                                                    name: item.media?.title || 'Site Video Clip',
                                                                                    subtitle: `${item.sender} • ${item.media?.duration || '00:24'}`,
                                                                                    uploadedBy: item.sender,
                                                                                    time: item.media?.duration || '00:24',
                                                                                    uri: videoUri,
                                                                                    url: videoUri,
                                                                                });
                                                                            }}
                                                                            style={styles.videoWrapper}
                                                                        >
                                                                            <Image
                                                                                source={{ uri: videoUri }}
                                                                                style={styles.videoThumbnail}
                                                                                resizeMode="cover"
                                                                            />
                                                                            <View style={styles.videoPlayOverlay} pointerEvents="none">
                                                                        {Platform.OS === 'ios' ? (
                                                                            <Host style={{ width: 50, height: 50 }} colorScheme="dark">
                                                                                <SwiftUIGlassEffectContainer modifiers={[
                                                                                    frame({ width: 50, height: 50 }),
                                                                                    cornerRadius(25),
                                                                                    glassEffect({ shape: 'circle' }),
                                                                                ]}>
                                                                                    <SwiftUIImage
                                                                                        systemName="play.fill"
                                                                                        size={20}
                                                                                        color="#FFFFFF"
                                                                                    />
                                                                                </SwiftUIGlassEffectContainer>
                                                                            </Host>
                                                                        ) : (
                                                                            <View style={styles.videoPlayCircle}>
                                                                                <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                    {Platform.OS === 'ios' ? (
                                                                        <View style={styles.videoDurationBadgeContainer} pointerEvents="none">
                                                                            <Host style={styles.videoDurationHost} colorScheme="dark">
                                                                                <SwiftUIGlassEffectContainer modifiers={[
                                                                                    frame({ width: 62, height: 24 }),
                                                                                    cornerRadius(12),
                                                                                    glassEffect({ shape: 'capsule' }),
                                                                                ]}>
                                                                                    <SwiftUIHStack alignment="center" spacing={4} modifiers={[
                                                                                        frame({ width: 62, height: 24 }),
                                                                                    ]}>
                                                                                        <SwiftUIImage systemName="video.fill" size={10} color="#FFFFFF" />
                                                                                        <SwiftUIText size={11} weight="bold" color="#FFFFFF">
                                                                                            {item.media.duration || '00:24'}
                                                                                        </SwiftUIText>
                                                                                    </SwiftUIHStack>
                                                                                </SwiftUIGlassEffectContainer>
                                                                            </Host>
                                                                        </View>
                                                                    ) : (
                                                                        <View style={styles.videoDurationBadge}>
                                                                            <Ionicons name="videocam" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                                                                            <Text style={styles.videoDurationText}>{item.media.duration || '00:24'}</Text>
                                                                        </View>
                                                                    )}
                                                                </TouchableOpacity>
                                                            );
                                                        })()
                                                    )}
                                                        </TouchableOpacity>
                                                    </ContextMenu>
                                        )}

                                                {/* 3. Attachments */}
                                                {attList.map((att, attIdx) => {
                                                    const isImg = att.type === 'image' || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(att.name || att.url || att.uri || '');
                                                    const fileUri = att.url || att.uri;

                                                    if (isImg && fileUri) {
                                                        return (
                                                            <ContextMenu
                                                                key={attIdx}
                                                                actions={getMediaContextMenuActions(item)}
                                                                onPress={(e) => handleMessageContextMenuPress(item, e.nativeEvent.name, att)}
                                                                previewBackgroundColor="transparent"
                                                                disabled={isSelectMode}
                                                                style={{ borderRadius: 18, alignSelf: item.isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}
                                                            >
                                                                <TouchableOpacity
                                                                    activeOpacity={0.88}
                                                                    onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => {
                                                                        Haptics.selectionAsync();
                                                                        openFilePreview({
                                                                            id: `att-${item.id}-${attIdx}`,
                                                                            type: 'image',
                                                                            title: att.name || 'Photo',
                                                                            name: att.name || 'Photo',
                                                                            subtitle: `${item.sender} • ${item.time}`,
                                                                            uploadedBy: item.sender,
                                                                            time: item.time,
                                                                            uri: fileUri,
                                                                            url: fileUri,
                                                                        });
                                                                    }}
                                                                    style={[
                                                                        styles.singlePhotoWrapper,
                                                                        {
                                                                            marginBottom: attIdx < attList.length - 1 ? 6 : 0,
                                                                        }
                                                                    ]}
                                                                >
                                                                    <Image
                                                                        source={{ uri: fileUri }}
                                                                        style={styles.singlePhotoImage}
                                                                        resizeMode="cover"
                                                                    />
                                                                </TouchableOpacity>
                                                            </ContextMenu>
                                                        );
                                                    }

                                                    return (
                                                        <ContextMenu
                                                            key={attIdx}
                                                            actions={getDocContextMenuActions(item, att)}
                                                            onPress={(e) => handleMessageContextMenuPress(item, e.nativeEvent.name, att)}
                                                            previewBackgroundColor="transparent"
                                                            disabled={isSelectMode}
                                                            style={{ borderRadius: 18, alignSelf: item.isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}
                                                        >
                                                            <TouchableOpacity
                                                                activeOpacity={0.75}
                                                                onPress={isSelectMode ? () => handleToggleSelectMessage(item.id) : () => {
                                                                    openFilePreview({
                                                                        id: `att-${item.id}-${attIdx}`,
                                                                        name: att.name,
                                                                        title: att.name,
                                                                        size: att.size,
                                                                        type: att.type || (/\.pdf$/i.test(att.name) ? 'pdf' : 'document'),
                                                                        url: att.url || att.uri,
                                                                        uri: att.uri || att.url,
                                                                        uploadedBy: item.sender,
                                                                        sender: item.sender,
                                                                        time: item.time,
                                                                        subtitle: `${att.size} • Shared by ${item.sender}`,
                                                                    });
                                                                }}
                                                            >
                                                            <View
                                                                style={[
                                                                    styles.docBubble,
                                                                    item.isSelf
                                                                        ? styles.docBubbleSelf
                                                                        : [styles.docBubbleOther, { backgroundColor: bubbleOtherBg }],
                                                                    highlightedMessageId === item.id && {
                                                                        backgroundColor: isDark ? 'rgba(86, 151, 255, 0.32)' : 'rgba(0, 54, 248, 0.14)',
                                                                    },
                                                                ]}
                                                            >
                                                                <DocPagePreview fileName={att.name} isDark={isDark} />
                                                                <View style={{ flex: 1, marginRight: 8, marginLeft: 2 }}>
                                                                    <Text
                                                                        style={[styles.docFileName, { color: item.isSelf ? '#FFFFFF' : textColor }]}
                                                                        numberOfLines={1}
                                                                        ellipsizeMode="middle"
                                                                    >
                                                                        {att.name}
                                                                    </Text>
                                                                    <Text style={[styles.docFileSize, { color: item.isSelf ? 'rgba(255,255,255,0.7)' : subtextColor }]}>
                                                                        {att.size}
                                                                    </Text>
                                                                </View>
                                                                <TouchableOpacity
                                                                    activeOpacity={0.7}
                                                                    onPress={(e) => {
                                                                        e.stopPropagation();
                                                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                                        showToast(`Downloading ${truncateMiddleFileName(att.name)}`, 'arrow.down.to.line', FormaBlue[500]);
                                                                    }}
                                                                    style={[styles.docDownloadBtn, { backgroundColor: item.isSelf ? 'rgba(255,255,255,0.22)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}
                                                                >
                                                                    <PlatformIcon
                                                                        name="arrow.down"
                                                                        size={14}
                                                                        tintColor={item.isSelf ? '#FFFFFF' : (isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)')}
                                                                    />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </TouchableOpacity>
                                                    </ContextMenu>
                                                );
                                            })}
                                            </View>

                                            <View style={[styles.metaRow, { alignItems: 'center' }]}>
                                                {item.isPinned && (
                                                    <PlatformIcon name="pin.fill" size={12} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} style={{ marginRight: 3 }} />
                                                )}
                                                {item.isSaved && (
                                                    <Ionicons name="bookmark" size={12} color="#FF9500" style={{ marginRight: 2 }} />
                                                )}
                                                {item.isEdited && (
                                                    <Text style={[styles.timeText, { color: subtextColor, fontStyle: 'italic', marginRight: 3 }]}>
                                                        Edited
                                                    </Text>
                                                )}
                                                <Text style={[styles.timeText, { color: subtextColor }]}>{item.time}</Text>
                                                {item.isSelf && <Ionicons name="checkmark-done" size={16} color={FormaBlue[700]} />}

                                                {item.reactions && item.reactions.length > 0 && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 }}>
                                                        {item.reactions.map((r: { emoji: string; count: number }, idx: number) => (
                                                            <BouncyReactionBadge
                                                                key={`${item.id}-${r.emoji}-${idx}`}
                                                                emoji={r.emoji}
                                                                count={r.count}
                                                                isSelected={item.myReaction === r.emoji}
                                                                isDark={isDark}
                                                                onPress={() => toggleReaction(item.id, r.emoji)}
                                                            />
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </React.Fragment>
                                );
                            }))}
                        </View>
                    )}

                    {/* TAB 2: DOCUMENTS (Sleek Pill Cards with Native iOS ContextMenu) */}
                    {activeTab === 'documents' && (
                        <View style={styles.filterSection}>
                            {filteredDocs.length === 0 ? (
                                <View style={styles.emptyStateCard}>
                                    <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon name="doc.text" size={32} tintColor={subtextColor} />
                                    </View>
                                    <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Documents Shared</Text>
                                    <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                                        PDFs, sheets, and documents sent in this channel will appear here.
                                    </Text>
                                </View>
                            ) : (!searchQuery.trim() && docFilterType === 'all' && (docSortMode === 'date-desc' || docSortMode === 'date-asc')) ? (
                                 /* Grouped by Date Sections with Subtle Header + Count */
                                 groupedDocSections.map((section) => (
                                     <View 
                                         key={section.title} 
                                         style={{ marginBottom: 14 }}
                                         onLayout={(e) => {
                                             sectionLayouts.current[section.title] = {
                                                 y: e.nativeEvent.layout.y,
                                                 height: e.nativeEvent.layout.height,
                                                 items: section.data,
                                             };
                                         }}
                                     >
                                         <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                             {section.title} ({section.data.length})
                                         </Text>
                                         <View style={{ gap: 10 }}>
                                             {section.data.map((doc) => {
                                                 const isSaved = savedDocIds.includes(doc.id);
                                                 const isSelected = selectedDocIds.includes(doc.id);
                                                 return (
                                                     <View key={doc.id}>
                                                         <ContextMenu
                                                             actions={getDocCardContextMenuActions(doc)}
                                                             previewBackgroundColor="transparent"
                                                             disabled={isDocSelectMode}
                                                             style={{ borderRadius: 20 }}
                                                             onPress={(e) => handleDocActionPress(doc, e.nativeEvent.name)}
                                                         >
                                                             <TouchableOpacity
                                                                 activeOpacity={isDocSelectMode ? 0.85 : 0.75}
                                                                 onPress={() => {
                                                                     if (isDocSelectMode) {
                                                                         handleToggleSelectDoc(doc.id);
                                                                     } else {
                                                                         Haptics.selectionAsync();
                                                                         openFilePreview({
                                                                             id: doc.id,
                                                                             name: doc.name,
                                                                             title: doc.name,
                                                                             size: doc.size,
                                                                             type: doc.type || 'document',
                                                                             url: doc.url || doc.uri,
                                                                             uri: doc.uri || doc.url,
                                                                             uploadedBy: doc.uploadedBy,
                                                                             time: doc.time,
                                                                             date: doc.date,
                                                                             dateLabel: doc.dateLabel,
                                                                             subtitle: `${doc.size} • ${doc.uploadedBy} • ${doc.time}`,
                                                                         });
                                                                     }
                                                                 }}
                                                             >
                                                                 <GlassView 
                                                                     intensity={isDark ? 25 : 60} 
                                                                     tint={isDark ? 'dark' : 'light'} 
                                                                     style={[
                                                                         styles.filterCard, 
                                                                         { backgroundColor: bubbleOtherBg, borderRadius: 20 },
                                                                         isDocSelectMode && isSelected && {
                                                                             backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
                                                                         }
                                                                     ]}
                                                                 >
                                                                     {isDocSelectMode && (
                                                                         <View style={{ marginRight: 10 }}>
                                                                             <Ionicons
                                                                                 name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                                                                 size={22}
                                                                                 color={isSelected ? (isDark ? FormaBlue[400] : FormaBlue[700]) : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                                                                             />
                                                                         </View>
                                                                     )}
                                                                     <DocPagePreview fileName={doc.name} isDark={isDark} />
                                                                     <View style={{ flex: 1, marginRight: 8 }}>
                                                                         <Text
                                                                             style={[styles.filterCardTitle, { color: textColor }]}
                                                                             numberOfLines={2}
                                                                             ellipsizeMode="middle"
                                                                         >
                                                                             {doc.name}
                                                                         </Text>
                                                                         <Text style={[styles.filterCardSubtitle, { color: subtextColor }]}>
                                                                             {doc.size} • {doc.time}
                                                                         </Text>
                                                                     </View>
                                                                     {isSaved && !isDocSelectMode && (
                                                                         <View style={{ paddingRight: 4 }}>
                                                                             <PlatformIcon name="bookmark.fill" size={15} tintColor="#FFCC00" />
                                                                         </View>
                                                                     )}
                                                                 </GlassView>
                                                             </TouchableOpacity>
                                                         </ContextMenu>
                                                     </View>
                                                 );
                                             })}
                                         </View>
                                     </View>
                                 ))
                             ) : (
                                 /* Flat Clean List when Searching, Filtering, or Sorting by Name/Size */
                                 <View style={{ gap: 10 }}>
                                     <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginBottom: 4, paddingHorizontal: 4 }}>
                                         {docFilterType !== 'all' ? (docFilterType === 'saved' ? 'Bookmarked' : docFilterType.toUpperCase()) : 'Results'} ({filteredDocs.length})
                                     </Text>
                                     {filteredDocs.map((doc) => {
                                         const isSaved = savedDocIds.includes(doc.id);
                                         const isSelected = selectedDocIds.includes(doc.id);
                                         return (
                                             <View
                                                 key={doc.id}
                                                 onLayout={(e) => {
                                                     itemLayouts.current[doc.id] = {
                                                         y: e.nativeEvent.layout.y,
                                                         height: e.nativeEvent.layout.height,
                                                         item: doc,
                                                     };
                                                 }}
                                             >
                                                 <ContextMenu
                                                     actions={getDocCardContextMenuActions(doc)}
                                                     previewBackgroundColor="transparent"
                                                     style={{ borderRadius: 20 }}
                                                     disabled={isDocSelectMode}
                                                     onPress={(e) => handleDocActionPress(doc, e.nativeEvent.name)}
                                                 >
                                                     <TouchableOpacity
                                                         activeOpacity={isDocSelectMode ? 0.85 : 0.75}
                                                         onPress={() => {
                                                             if (isDocSelectMode) {
                                                                 handleToggleSelectDoc(doc.id);
                                                             } else {
                                                                 Haptics.selectionAsync();
                                                                 openFilePreview({
                                                                     id: doc.id,
                                                                     name: doc.name,
                                                                     title: doc.name,
                                                                     size: doc.size,
                                                                     type: doc.type || 'document',
                                                                     url: doc.url || doc.uri,
                                                                     uri: doc.uri || doc.url,
                                                                     uploadedBy: doc.uploadedBy,
                                                                     time: doc.time,
                                                                     date: doc.date,
                                                                     dateLabel: doc.dateLabel,
                                                                     subtitle: `${doc.size} • ${doc.uploadedBy} • ${doc.time}`,
                                                                 });
                                                             }
                                                         }}
                                                     >
                                                         <GlassView 
                                                             intensity={isDark ? 25 : 60} 
                                                             tint={isDark ? 'dark' : 'light'} 
                                                             style={[
                                                                 styles.filterCard, 
                                                                 { backgroundColor: bubbleOtherBg, borderRadius: 20 },
                                                                 isDocSelectMode && isSelected && {
                                                                     backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
                                                                 }
                                                             ]}
                                                         >
                                                             {isDocSelectMode && (
                                                                 <View style={{ marginRight: 10 }}>
                                                                     <Ionicons
                                                                         name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                                                         size={22}
                                                                         color={isSelected ? (isDark ? FormaBlue[400] : FormaBlue[700]) : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                                                                     />
                                                                 </View>
                                                             )}
                                                             <DocPagePreview fileName={doc.name} isDark={isDark} />
                                                             <View style={{ flex: 1, marginRight: 8 }}>
                                                                 <Text
                                                                     style={[styles.filterCardTitle, { color: textColor }]}
                                                                     numberOfLines={1}
                                                                     ellipsizeMode="middle"
                                                                 >
                                                                     {doc.name}
                                                                 </Text>
                                                                 <Text style={[styles.filterCardSubtitle, { color: subtextColor }]}>
                                                                     {doc.size} • {doc.time}
                                                                 </Text>
                                                             </View>
                                                             {isSaved && !isDocSelectMode && (
                                                                 <View style={{ paddingRight: 4 }}>
                                                                     <PlatformIcon name="bookmark.fill" size={15} tintColor="#FFCC00" />
                                                                 </View>
                                                             )}
                                                         </GlassView>
                                                     </TouchableOpacity>
                                                 </ContextMenu>
                                              </View>
                                          );
                                      })}
                                  </View>
                              )}
                          </View>
                      )}
                                                                 {/* TAB 3: MEDIA (3-column tight square grid with video duration badge) */}
                     {activeTab === 'media' && (
                         <View style={styles.filterSection}>
                             {filteredMedia.length === 0 ? (
                                 <View style={styles.emptyStateCard}>
                                     <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                         <PlatformIcon name="photo" size={32} tintColor={subtextColor} />
                                     </View>
                                     <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Photos or Videos</Text>
                                     <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                                         Photos and videos shared in this channel will appear here.
                                     </Text>
                                 </View>
                             ) : (
                                 <>
                                     <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                         {mediaFilterType === 'photos'
                                             ? `Photos (${filteredMedia.length})`
                                             : mediaFilterType === 'videos'
                                             ? `Videos (${filteredMedia.length})`
                                             : `Photos & Videos (${filteredMedia.length})`}
                                     </Text>
                                     <View style={styles.mediaGrid}>
                                         {filteredMedia.map((media) => {
                                             const isSelected = selectedMediaIds.includes(media.id);
                                             const isSaved = savedMediaIds.includes(media.id);
                                             return (
                                                 <ContextMenu
                                                     key={media.id}
                                                     actions={isMediaSelectMode ? [] : getMediaCardContextMenuActions(media)}
                                                     dropdownMenuMode={false}
                                                     disabled={isMediaSelectMode}
                                                     onPress={(e) => handleMediaActionPress(media, e.nativeEvent.name)}
                                                     style={styles.mediaGridItem}
                                                 >
                                                     <TouchableOpacity 
                                                         onLayout={(e) => {
                                                             itemLayouts.current[media.id] = {
                                                                 y: e.nativeEvent.layout.y,
                                                                 height: e.nativeEvent.layout.height,
                                                                 item: media,
                                                             };
                                                         }}
                                                         activeOpacity={isMediaSelectMode ? 0.85 : 0.7} 
                                                         onPress={() => {
                                                             if (isMediaSelectMode) {
                                                                 handleToggleSelectMedia(media.id);
                                                             } else {
                                                                 Haptics.selectionAsync();
                                                                 const mediaIdx = filteredMedia.findIndex((m) => m.id === media.id);
                                                                 openFilePreview({
                                                                     id: media.id,
                                                                     name: media.title || '',
                                                                     title: media.title || '',
                                                                     type: media.isVideo ? 'video' : 'image',
                                                                     size: (media as any).size || '',
                                                                     uploadedBy: media.uploadedBy,
                                                                     time: media.time,
                                                                     uri: media.uri,
                                                                     url: media.uri,
                                                                     duration: media.duration,
                                                                     activeIndex: mediaIdx >= 0 ? mediaIdx : 0,
                                                                     gallery: filteredMedia.map((m) => ({
                                                                         id: m.id,
                                                                         title: m.title || '',
                                                                         name: m.title || '',
                                                                         type: m.isVideo ? 'video' : 'image',
                                                                         uri: m.uri,
                                                                         url: m.uri,
                                                                         duration: m.duration || '00:24',
                                                                         uploadedBy: m.uploadedBy,
                                                                         time: m.time,
                                                                         size: (m as any).size || '',
                                                                     })),
                                                                 });
                                                             }
                                                         }}
                                                         style={[
                                                             styles.mediaGridImageContainer,
                                                             isMediaSelectMode && isSelected && {
                                                                 borderWidth: 2.5,
                                                                 borderColor: isDark ? FormaBlue[400] : FormaBlue[600],
                                                             }
                                                         ]}
                                                     >
                                                         <Image
                                                             source={{ uri: media.uri }}
                                                             style={[
                                                                 styles.mediaGridImage,
                                                                 isMediaSelectMode && isSelected && { opacity: 0.85 }
                                                             ]}
                                                             resizeMode="cover"
                                                         />
                                                         {media.isVideo && (
                                                             <View style={styles.mediaVideoBadge}>
                                                                 <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
                                                                 <Ionicons name="videocam" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                                                                 <Text style={styles.mediaVideoDuration}>{media.duration || '00:30'}</Text>
                                                             </View>
                                                         )}
                                                         {isSaved && !isMediaSelectMode && (
                                                             <View style={styles.mediaSavedBadge}>
                                                                 <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
                                                                 <Ionicons name="bookmark" size={10} color="#FFCC00" />
                                                             </View>
                                                         )}
                                                         {isMediaSelectMode && (
                                                             <View style={styles.mediaSelectCheckWrapper}>
                                                                 <View style={[
                                                                     styles.mediaSelectCheckCircle,
                                                                     isSelected && { backgroundColor: isDark ? FormaBlue[400] : FormaBlue[600], borderColor: isDark ? FormaBlue[400] : FormaBlue[600] }
                                                                 ]}>
                                                                     {isSelected && (
                                                                         <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                                                     )}
                                                                 </View>
                                                             </View>
                                                         )}
                                                     </TouchableOpacity>
                                                 </ContextMenu>
                                             );
                                         })}
                                     </View>
                                 </>
                             )}
                         </View>
                     )}

                     {/* TAB 4: LINKS (Sleek Glass Cards with Date Sections, Native ContextMenu & Selection) */}
                     {activeTab === 'links' && (
                         <View style={styles.filterSection}>
                             {filteredLinks.length === 0 ? (
                                 <View style={styles.emptyStateCard}>
                                     <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                         <PlatformIcon name="link" size={30} tintColor={subtextColor} />
                                     </View>
                                     <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Links Shared</Text>
                                     <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                                         Web links and URLs shared in this channel will appear here.
                                     </Text>
                                 </View>
                             ) : (!searchQuery.trim() && linkFilterType === 'all' && (linkSortMode === 'date-desc' || linkSortMode === 'date-asc')) ? (
                                 groupedLinkSections.map((section) => (
                                     <View
                                         key={section.title}
                                         style={{ marginBottom: 14 }}
                                         onLayout={(e) => {
                                             sectionLayouts.current[section.title] = {
                                                 y: e.nativeEvent.layout.y,
                                                 height: e.nativeEvent.layout.height,
                                                 items: section.data,
                                             };
                                         }}
                                     >
                                         <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                             {section.title} ({section.data.length})
                                         </Text>
                                         {section.data.map((link) => {
                                             const isSaved = savedLinkIds.includes(link.id);
                                             const isSelected = selectedLinkIds.includes(link.id);
                                             return (
                                                 <View key={link.id} style={{ marginBottom: 8 }}>
                                                      <ContextMenu
                                                          actions={isLinkSelectMode ? [] : getLinkCardContextMenuActions(link)}
                                                          previewBackgroundColor="transparent"
                                                          disabled={isLinkSelectMode}
                                                          onPress={(e) => handleLinkActionPress(link, e.nativeEvent.name)}
                                                          style={{ borderRadius: 16 }}
                                                      >
                                                          <TouchableOpacity
                                                              onLayout={(e) => {
                                                                  itemLayouts.current[link.id] = {
                                                                      y: e.nativeEvent.layout.y,
                                                                      height: e.nativeEvent.layout.height,
                                                                      item: link,
                                                                  };
                                                              }}
                                                              activeOpacity={isLinkSelectMode ? 0.85 : 0.75}
                                                              onPress={async () => {
                                                                  if (isLinkSelectMode) {
                                                                      handleToggleSelectLink(link.id);
                                                                  } else {
                                                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                      try {
                                                                          await WebBrowser.openBrowserAsync(link.url, {
                                                                              presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
                                                                              controlsColor: '#007AFF',
                                                                          });
                                                                      } catch {
                                                                          Linking.openURL(link.url);
                                                                      }
                                                                  }
                                                              }}
                                                              style={styles.linkCardTouchable}
                                                          >
                                                              <GlassView
                                                                  intensity={isDark ? 25 : 60}
                                                                  tint={isDark ? 'dark' : 'light'}
                                                                  style={[
                                                                      styles.linkPillCard,
                                                                      { backgroundColor: bubbleOtherBg },
                                                                      isLinkSelectMode && isSelected && {
                                                                          backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
                                                                      }
                                                                  ]}
                                                              >
                                                                  {isLinkSelectMode ? (
                                                                      <View style={styles.linkIconBadge}>
                                                                          <PlatformIcon
                                                                              name={isSelected ? "checkmark.circle.fill" : "circle"}
                                                                              size={22}
                                                                              tintColor={isSelected ? (isDark ? FormaBlue[400] : FormaBlue[600]) : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')}
                                                                          />
                                                                      </View>
                                                                  ) : (
                                                                      <View style={[styles.linkIconBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                                                          <LinkFaviconOrIcon url={link.url} isDark={isDark} />
                                                                      </View>
                                                                  )}
                                                                  <View style={{ flex: 1, marginRight: 6 }}>
                                                                      {!!link.title && (
                                                                          <Text style={[styles.linkPillTitle, { color: textColor }]} numberOfLines={1}>
                                                                              {link.title}
                                                                          </Text>
                                                                      )}
                                                                      <Text style={[styles.linkPillUrl, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }]} numberOfLines={1}>
                                                                          {link.url}
                                                                      </Text>
                                                                      <Text style={[styles.linkPillSubtitle, { color: subtextColor }]}>
                                                                          {link.sharedBy} • {link.time}
                                                                      </Text>
                                                                  </View>
                                                                  {isSaved && !isLinkSelectMode && (
                                                                      <View style={{ marginLeft: 4 }}>
                                                                          <PlatformIcon name="bookmark.fill" size={14} tintColor="#FFCC00" />
                                                                      </View>
                                                                  )}
                                                              </GlassView>
                                                          </TouchableOpacity>
                                                      </ContextMenu>
                                                  </View>
                                              );
                                          })}
                                     </View>
                                 ))
                             ) : (
                                 /* Flat List for Search or Filtered */
                                 <View>
                                     <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                         {linkFilterType === 'saved'
                                             ? `Saved Links (${filteredLinks.length})`
                                             : `Shared Links (${filteredLinks.length})`}
                                     </Text>
                                     {filteredLinks.map((link) => {
                                         const isSaved = savedLinkIds.includes(link.id);
                                         const isSelected = selectedLinkIds.includes(link.id);
                                         return (
                                             <View key={link.id} style={{ marginBottom: 8 }}>
                                                 <ContextMenu
                                                     title={link.title || link.url}
                                                     actions={isLinkSelectMode ? [] : getLinkCardContextMenuActions(link)}
                                                     dropdownMenuMode={false}
                                                     disabled={isLinkSelectMode}
                                                     onPress={(e) => handleLinkActionPress(link, e.nativeEvent.name)}
                                                     style={{ borderRadius: 16, overflow: 'hidden' }}
                                                 >
                                                     <TouchableOpacity
                                                         onLayout={(e) => {
                                                             itemLayouts.current[link.id] = {
                                                                 y: e.nativeEvent.layout.y,
                                                                 height: e.nativeEvent.layout.height,
                                                                 item: link,
                                                             };
                                                         }}
                                                         activeOpacity={isLinkSelectMode ? 0.85 : 0.7}
                                                         onPress={async () => {
                                                             if (isLinkSelectMode) {
                                                                 handleToggleSelectLink(link.id);
                                                             } else {
                                                                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                 try {
                                                                     await WebBrowser.openBrowserAsync(link.url, {
                                                                         presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
                                                                         controlsColor: '#007AFF',
                                                                     });
                                                                 } catch {
                                                                     Linking.openURL(link.url);
                                                                 }
                                                             }
                                                         }}
                                                         style={styles.linkCardTouchable}
                                                     >
                                                         <GlassView
                                                             intensity={isDark ? 20 : 50}
                                                             tint={isDark ? 'dark' : 'light'}
                                                             style={[
                                                                 styles.linkPillCard,
                                                                 { backgroundColor: bubbleOtherBg, borderColor: borderTint },
                                                                 isLinkSelectMode && isSelected && {
                                                                     backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
                                                                 }
                                                             ]}
                                                         >
                                                             {isLinkSelectMode ? (
                                                                 <View style={styles.linkIconBadge}>
                                                                     <PlatformIcon
                                                                         name={isSelected ? "checkmark.circle.fill" : "circle"}
                                                                         size={22}
                                                                         tintColor={isSelected ? (isDark ? FormaBlue[400] : FormaBlue[600]) : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')}
                                                                     />
                                                                 </View>
                                                             ) : (
                                                                 <View style={[styles.linkIconBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                                                     <LinkFaviconOrIcon url={link.url} isDark={isDark} />
                                                                 </View>
                                                             )}
                                                             <View style={{ flex: 1, marginRight: 6 }}>
                                                                 {!!link.title && (
                                                                     <Text style={[styles.linkPillTitle, { color: textColor }]} numberOfLines={1}>
                                                                         {link.title}
                                                                     </Text>
                                                                 )}
                                                                 <Text style={[styles.linkPillUrl, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }]} numberOfLines={1}>
                                                                     {link.url}
                                                                 </Text>
                                                                 <Text style={[styles.linkPillSubtitle, { color: subtextColor }]}>
                                                                     {link.sharedBy} • {link.time}
                                                                 </Text>
                                                             </View>
                                                             {isSaved && !isLinkSelectMode && (
                                                                 <View style={{ marginLeft: 4 }}>
                                                                     <PlatformIcon name="bookmark.fill" size={14} tintColor="#FFCC00" />
                                                                 </View>
                                                             )}
                                                         </GlassView>
                                                     </TouchableOpacity>
                                                 </ContextMenu>
                                             </View>
                                         );
                                     })}
                                 </View>
                             )}
                         </View>
                     )}

                     {/* TAB 5: ACTIONS */}
                     {activeTab === "actions" && (
                         <View style={styles.filterSection}>
                             {filteredActions.length === 0 ? (
                                 <View style={styles.emptyStateCard}>
                                     <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                         <Ionicons name="checkbox-outline" size={32} color={subtextColor} />
                                     </View>
                                     <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Actions Found</Text>
                                     <Text style={[styles.emptyStateSubtitle, { color: subtextColor }]}>
                                         Task action items created in this channel will appear here.
                                     </Text>
                                 </View>
                             ) : (
                                 <>
                                     <Text style={[styles.filterTitle, { color: textColor }]}>Channel Actions ({filteredActions.length})</Text>
                                     {filteredActions.map((action) => (
                                         <View
                                             key={action.id}
                                             onLayout={(e) => {
                                                 itemLayouts.current[action.id] = {
                                                     y: e.nativeEvent.layout.y,
                                                     height: e.nativeEvent.layout.height,
                                                     item: action,
                                                 };
                                             }}
                                             style={{ marginBottom: 8 }}
                                         >
                                             <ContextMenu
                                                 title={action.title}
                                                 actions={getActionCardContextMenuActions(action)}
                                                 dropdownMenuMode={false}
                                                 onPress={(e) => handleActionCardPress(action, e.nativeEvent.name)}
                                                 style={{ borderRadius: 16, overflow: "hidden" }}
                                             >
                                                 <TouchableOpacity
                                                     activeOpacity={0.75}
                                                     onPress={() => handleActionCardPress(action, "Open Detail")}
                                                 >
                                                     <GlassView intensity={isDark ? 20 : 50} tint={isDark ? "dark" : "light"} style={[styles.filterCard, { backgroundColor: bubbleOtherBg, borderColor: borderTint }]}>
                                                         <View style={[styles.filterIconBadge, { backgroundColor: isDark ? "rgba(86,151,255,0.18)" : "rgba(0,54,248,0.1)" }]}>
                                                             <Ionicons name="checkbox-outline" size={22} color={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                                         </View>
                                                         <View style={{ flex: 1 }}>
                                                             <Text style={[styles.filterCardTitle, { color: textColor }]} numberOfLines={1}>{action.title}</Text>
                                                             <Text style={[styles.filterCardSubtitle, { color: subtextColor }]}>Assignee: {action.assignee} • Priority: {action.priority}</Text>
                                                         </View>
                                                         <View style={[styles.statusBadge, { backgroundColor: action.status === "Completed" ? "rgba(52,199,89,0.15)" : (isDark ? "rgba(86,151,255,0.18)" : "rgba(0,54,248,0.1)") }]}>
                                                             <Text style={[styles.statusBadgeText, { color: action.status === "Completed" ? "#34C759" : (isDark ? FormaBlue[400] : FormaBlue[700]) }]}>{action.status}</Text>
                                                         </View>
                                                     </GlassView>
                                                 </TouchableOpacity>
                                             </ContextMenu>
                                         </View>
                                     ))}
                                 </>
                             )}
                         </View>
                      )}
                </View>
            </ScrollView>

            {/* Floating Bottom Bar: Multi-Select Actions Toolbar */}
            {activeTab === 'chat' && isSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.multiSelectToolbarRow}>
                        {/* 1. Left: Cancel (Capsule) */}
                        <BouncyToolbarButton
                            onPress={handleExitSelectMode}
                            style={styles.selectCancelBtn}
                        >
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 18, trailing: 18 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                            )}
                            <Text style={[styles.selectCancelText, { color: textColor }]}>
                                Cancel
                            </Text>
                        </BouncyToolbarButton>

                        {/* 2. Center: Copy, Forward, Share (Circle Buttons) */}
                        <View style={styles.selectCenterGroup}>
                            <BouncyToolbarButton
                                onPress={handleCopySelected}
                                disabled={selectedMessageIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="doc.on.doc" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleForwardSelected}
                                disabled={selectedMessageIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrowshape.turn.up.right" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleShareSelected}
                                disabled={selectedMessageIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="square.and.arrow.up" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>
                        </View>

                        {/* 3. Right: Delete (Circle with Pull-Down Context Menu) */}
                        <ContextMenu
                            actions={multiSelectDeleteActions}
                            dropdownMenuMode={true}
                            disabled={selectedMessageIds.length === 0}
                            onPress={(e) => handleDeleteAction(e.nativeEvent.name)}
                        >
                            <BouncyToolbarButton
                                onPress={Platform.OS === 'android' ? handleDeleteSelected : undefined}
                                disabled={selectedMessageIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="trash" size={18} tintColor="#FF453A" />
                            </BouncyToolbarButton>
                        </ContextMenu>
                    </View>
                </View>
            )}

            {/* Floating Bottom Bar: Chat Input Bar in 'chat' tab (Normal Mode) */}
            {activeTab === 'chat' && !isSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        {
                            bottom: keyboardHeight > 0
                                ? keyboardHeight + 16
                                : (insets.bottom > 0 ? insets.bottom + 6 : 12)
                        }
                    ]}
                    pointerEvents="box-none"
                >
                    {/* Floating Bubble Liquid Glass Scroll To Bottom Button */}
                    {showScrollBottom && (
                        <BouncyScrollToBottomButton
                            isDark={isDark}
                            onPress={() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                                setShowScrollBottom(false);
                            }}
                        />
                    )}

                    {/* Replying Banner (Single Clean Liquid Glass Capsule) */}
                    {replyingTo && (
                        <View style={[
                            styles.bannerCapsuleWrapper,
                            {
                                backgroundColor: isDark ? 'rgba(30, 30, 32, 0.96)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            }
                        ]}>
                            {Platform.OS === 'ios' && (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ maxWidth: Infinity, height: 48 }),
                                        cornerRadius(24)
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ maxWidth: Infinity, height: 48 }),
                                            glassEffect({ shape: 'capsule' })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            )}
                            <View style={styles.replyBannerInner}>
                                <View style={{ paddingLeft: 6, paddingRight: 2 }}>
                                    <PlatformIcon name="arrowshape.turn.up.left.fill" size={15} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                </View>
                                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                    <Text style={[styles.replySender, { color: isDark ? FormaBlue[400] : FormaBlue[700] }]}>
                                        Replying to {replyingTo.sender}
                                    </Text>
                                    <Text style={[styles.replyText, { color: subtextColor }]} numberOfLines={1}>
                                        {replyingTo.text || (replyingTo.attachment ? replyingTo.attachment.name : (replyingTo.media ? 'Media' : 'Message'))}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setReplyingTo(null);
                                    }}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    style={styles.replyCloseBtn}
                                    activeOpacity={0.6}
                                >
                                    <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Editing Banner (Single Clean Liquid Glass Capsule) */}
                    {editingMessage && (
                        <View style={[
                            styles.bannerCapsuleWrapper,
                            {
                                backgroundColor: isDark ? 'rgba(30, 30, 32, 0.96)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            }
                        ]}>
                            {Platform.OS === 'ios' && (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ maxWidth: Infinity, height: 48 }),
                                        cornerRadius(24)
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ maxWidth: Infinity, height: 48 }),
                                            glassEffect({ shape: 'capsule' })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            )}
                            <View style={styles.replyBannerInner}>
                                <View style={{ paddingLeft: 6, paddingRight: 2 }}>
                                    <PlatformIcon name="pencil" size={15} tintColor="#FF9500" />
                                </View>
                                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                    <Text style={[styles.replySender, { color: '#FF9500' }]}>
                                        Editing Message
                                    </Text>
                                    <Text style={[styles.replyText, { color: subtextColor }]} numberOfLines={1}>
                                        {editingMessage.text}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setEditingMessage(null);
                                        setInputText('');
                                        setInputKey((k) => k + 1);
                                    }}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    style={styles.replyCloseBtn}
                                    activeOpacity={0.6}
                                >
                                    <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Staged Attachments Preview Bar (WhatsApp / Telegram style) */}
                    {stagedAttachments.length > 0 && (
                        <View style={{ width: '100%', marginBottom: 6 }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingTop: 8, paddingBottom: 6, paddingHorizontal: 8, gap: 12, alignItems: 'center' }}
                            >
                                {stagedAttachments.map((att) => (
                                    <View
                                        key={att.id}
                                        style={{
                                            position: 'relative',
                                            borderRadius: 14,
                                            overflow: 'visible',
                                        }}
                                    >
                                        {att.type === 'image' || att.type === 'video' ? (
                                            <View
                                                style={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 14,
                                                    overflow: 'hidden',
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                    borderWidth: StyleSheet.hairlineWidth,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                <Image
                                                    source={{ uri: att.uri }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                                {att.type === 'video' && (
                                                    <View
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: 4,
                                                            left: 4,
                                                            backgroundColor: 'rgba(0,0,0,0.6)',
                                                            paddingHorizontal: 4,
                                                            paddingVertical: 2,
                                                            borderRadius: 4,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                        }}
                                                    >
                                                        <PlatformIcon name="play.fill" size={8} tintColor="#FFFFFF" />
                                                        {att.duration && (
                                                            <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '600' }}>
                                                                {att.duration}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <View
                                                style={{
                                                    height: 60,
                                                    minWidth: 140,
                                                    maxWidth: 200,
                                                    borderRadius: 14,
                                                    backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(242,242,247,0.95)',
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 8,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    borderWidth: StyleSheet.hairlineWidth,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 10,
                                                        backgroundColor: att.docType === 'xlsx' ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <PlatformIcon
                                                        name={att.docType === 'xlsx' ? 'tablecells' : 'doc.fill'}
                                                        size={18}
                                                        tintColor={att.docType === 'xlsx' ? '#34C759' : '#FF3B30'}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: '600',
                                                            color: isDark ? '#FFFFFF' : '#000000',
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {att.name}
                                                    </Text>
                                                    {att.size && (
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                color: isDark ? '#8E8E93' : '#6E6E73',
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {att.size}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                        {/* Top Right Close 'x' Button */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setStagedAttachments(prev => prev.filter(item => item.id !== att.id));
                                            }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{
                                                position: 'absolute',
                                                top: -6,
                                                right: -6,
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                backgroundColor: isDark ? '#3A3A3C' : '#8E8E93',
                                                borderWidth: 1.5,
                                                borderColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 2,
                                            }}
                                        >
                                            <PlatformIcon name="xmark" size={9} tintColor="#FFFFFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {membership.canWrite ? (
                        <SwiftUIChatInputBar
                            key={`input-bar-${editingMessage?.id || 'idle'}-${inputKey}`}
                            placeholder={editingMessage ? 'Edit message...' : (stagedAttachments.length > 0 ? 'Add a caption...' : `Message ${displayCode}...`)}
                            value={inputText}
                            onChangeText={setInputText}
                            onSend={handleSendMessage}
                            onAttach={handleAttachAction}
                            onAttachSelect={handleAttachSelect}
                            hasAttachments={stagedAttachments.length > 0}
                            isDark={isDark}
                        />
                    ) : (
                        <View style={[styles.disabledInputBar, {
                            backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.95)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }]}>
                            <PlatformIcon name="lock.fill" size={14} tintColor={isDark ? '#8E8E93' : '#6E6E73'} />
                            <Text style={[styles.disabledInputText, { color: isDark ? '#8E8E93' : '#6E6E73' }]}>
                                Messaging is disabled for former members
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Floating Bottom Bar: Document Multi-Select Actions Toolbar */}
            {activeTab === 'documents' && isDocSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.multiSelectToolbarRow}>
                        {/* 1. Left: Cancel (Capsule) */}
                        <BouncyToolbarButton
                            onPress={handleExitDocSelectMode}
                            style={styles.selectCancelBtn}
                        >
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 18, trailing: 18 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                            )}
                            <Text style={[styles.selectCancelText, { color: textColor }]}>
                                Cancel
                            </Text>
                        </BouncyToolbarButton>

                        {/* 2. Center: Bookmark, Forward, Share, Download (Circle Buttons) */}
                        <View style={styles.selectCenterGroup}>
                            <BouncyToolbarButton
                                onPress={handleBookmarkSelectedDocs}
                                disabled={selectedDocIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="bookmark" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleForwardSelectedDocs}
                                disabled={selectedDocIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrowshape.turn.up.right" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleShareSelectedDocs}
                                disabled={selectedDocIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="square.and.arrow.up" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleDownloadSelectedDocs}
                                disabled={selectedDocIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrow.down.to.line" size={18} tintColor={textColor} />
                            </BouncyToolbarButton>
                        </View>

                        {/* 3. Right: Delete (Circle with Pull-Down Context Menu) */}
                        <ContextMenu
                            actions={multiSelectDocDeleteActions}
                            dropdownMenuMode={true}
                            disabled={selectedDocIds.length === 0}
                            onPress={(e) => handleDeleteDocBatchAction(e.nativeEvent.name)}
                        >
                            <BouncyToolbarButton
                                onPress={Platform.OS === 'android' ? () => handleDeleteDocBatchAction('Delete for Everyone') : undefined}
                                disabled={selectedDocIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="trash" size={18} tintColor="#FF453A" />
                            </BouncyToolbarButton>
                        </ContextMenu>
                    </View>
                </View>
            )}

            {/* Floating Bottom Bar: Search Bar with Sort & Filter in 'documents' & 'links' tabs */}
            {((activeTab === 'documents' && !isDocSelectMode) || (activeTab === 'links' && !isLinkSelectMode)) && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        {
                            bottom: keyboardHeight > 0
                                ? keyboardHeight + 16
                                : (insets.bottom > 0 ? insets.bottom + 10 : 16)
                        }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.floatingSearchToolbarRow}>
                        {/* 1. Left: Expandable Liquid Glass Search Bar */}
                        <View style={[styles.floatingSearchCapsule, { flex: 1 }]}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ height: 44 }),
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 14, trailing: 14 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                            )}
                            <View style={styles.searchInnerRow}>
                                <PlatformIcon name="magnifyingglass" size={16} tintColor={isDark ? '#8E8E93' : '#9CA3AF'} />
                                <TextInput
                                    placeholder={`Search ${activeTab === 'documents' ? 'documents' : activeTab}...`}
                                    placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onFocus={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setIsSearchExpanded(true);
                                    }}
                                    onBlur={() => {
                                        if (!searchQuery) {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setIsSearchExpanded(false);
                                        }
                                    }}
                                    style={[styles.floatingSearchInput, { color: textColor }]}
                                />
                                {(isSearchExpanded || searchQuery.length > 0) && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setSearchQuery('');
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setIsSearchExpanded(false);
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        style={{ paddingLeft: 6 }}
                                    >
                                        <PlatformIcon
                                            name="xmark.circle.fill"
                                            size={16}
                                            tintColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)'}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* 2. Right: Sort & Filter Native Context Menu Pull-downs (Docs) */}
                        {!isSearchExpanded && activeTab === 'documents' && (
                            <View style={styles.floatingSearchActionsGroup}>
                                {/* Filter Button with Context Menu */}
                                <ContextMenu
                                    actions={docFilterActions}
                                    dropdownMenuMode={true}
                                    onPress={(e) => handleDocFilterAction(e.nativeEvent.name)}
                                >
                                    <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIGlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUISpacer />
                                                    </SwiftUIHStack>
                                                </SwiftUIGlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                        )}
                                        <PlatformIcon
                                            name={docFilterType !== 'all' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                                            size={18}
                                            tintColor={docFilterType !== 'all' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                        />
                                    </BouncyToolbarButton>
                                </ContextMenu>

                                {/* Sort Button with Context Menu */}
                                <ContextMenu
                                    actions={docSortActions}
                                    dropdownMenuMode={true}
                                    onPress={(e) => handleDocSortAction(e.nativeEvent.name)}
                                >
                                    <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIGlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUISpacer />
                                                    </SwiftUIHStack>
                                                </SwiftUIGlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                        )}
                                        <PlatformIcon
                                            name="arrow.up.arrow.down"
                                            size={18}
                                            tintColor={docSortMode !== 'date-desc' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                        />
                                    </BouncyToolbarButton>
                                </ContextMenu>
                            </View>
                        )}

                        {/* 2. Right: Sort & Filter Native Context Menu Pull-downs (Links) */}
                        {!isSearchExpanded && activeTab === 'links' && (
                            <View style={styles.floatingSearchActionsGroup}>
                                {/* Filter Button for Links */}
                                <ContextMenu
                                    actions={linkFilterActions}
                                    dropdownMenuMode={true}
                                    onPress={(e) => handleLinkFilterAction(e.nativeEvent.name)}
                                >
                                    <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIGlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUISpacer />
                                                    </SwiftUIHStack>
                                                </SwiftUIGlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                        )}
                                        <PlatformIcon
                                            name={linkFilterType !== 'all' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                                            size={18}
                                            tintColor={linkFilterType !== 'all' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                        />
                                    </BouncyToolbarButton>
                                </ContextMenu>

                                {/* Sort Button for Links */}
                                <ContextMenu
                                    actions={linkSortActions}
                                    dropdownMenuMode={true}
                                    onPress={(e) => handleLinkSortAction(e.nativeEvent.name)}
                                >
                                    <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIGlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUISpacer />
                                                    </SwiftUIHStack>
                                                </SwiftUIGlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                        )}
                                        <PlatformIcon
                                            name="arrow.up.arrow.down"
                                            size={18}
                                            tintColor={linkSortMode !== 'date-desc' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                        />
                                    </BouncyToolbarButton>
                                </ContextMenu>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Floating Bottom Bar: Links Multi-Select Actions Toolbar */}
            {activeTab === 'links' && isLinkSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.multiSelectToolbarRow}>
                        {/* 1. Left: Cancel (Capsule) */}
                        <BouncyToolbarButton
                            onPress={handleExitLinkSelectMode}
                            style={styles.selectCancelBtn}
                        >
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 18, trailing: 18 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                            )}
                            <Text style={[styles.selectCancelText, { color: textColor }]}>
                                Cancel
                            </Text>
                        </BouncyToolbarButton>

                        {/* 2. Center: Bookmark, Copy, Forward, Share (Circle Buttons) */}
                        <View style={styles.selectCenterGroup}>
                            <BouncyToolbarButton
                                onPress={handleBookmarkSelectedLinks}
                                disabled={selectedLinkIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="bookmark" size={18} tintColor={selectedLinkIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleCopySelectedLinks}
                                disabled={selectedLinkIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="doc.on.doc" size={18} tintColor={selectedLinkIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleForwardSelectedLinks}
                                disabled={selectedLinkIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrowshape.turn.up.right" size={18} tintColor={selectedLinkIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleShareSelectedLinks}
                                disabled={selectedLinkIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="square.and.arrow.up" size={18} tintColor={selectedLinkIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>
                        </View>

                        {/* 3. Right: Delete (Circle with Pull-Down Context Menu) */}
                        <ContextMenu
                            actions={multiSelectLinkDeleteActions}
                            dropdownMenuMode={true}
                            onPress={(e) => handleDeleteLinkBatchAction(e.nativeEvent.name)}
                            disabled={selectedLinkIds.length === 0}
                        >
                            <BouncyToolbarButton
                                disabled={selectedLinkIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="trash" size={18} tintColor={selectedLinkIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : '#FF453A'} />
                            </BouncyToolbarButton>
                        </ContextMenu>
                    </View>
                </View>
            )}

            {/* Floating Bottom Bar: Media Tab (Normal Mode - Select Capsule on Left, Sort & Filter on Right) */}
            {activeTab === 'media' && !isMediaSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.floatingSearchToolbarRow}>
                        {/* 1. Left: Select Capsule Button */}
                        <BouncyToolbarButton
                            onPress={() => handleEnterMediaSelectMode()}
                            style={styles.selectCancelBtn}
                        >
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 18, trailing: 18 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                            )}
                            <Text style={[styles.selectCancelText, { color: textColor }]}>
                                Select
                            </Text>
                        </BouncyToolbarButton>

                        <View style={{ flex: 1 }} />

                        {/* 2. Right: Filter & Sort */}
                        <View style={styles.floatingSearchActionsGroup}>
                            {/* Filter Button for Media */}
                            <ContextMenu
                                actions={mediaFilterActions}
                                dropdownMenuMode={true}
                                onPress={(e) => handleMediaFilterAction(e.nativeEvent.name)}
                            >
                                <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <SwiftUIGlassEffectContainer modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' })
                                            ]}>
                                                <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                    <SwiftUISpacer />
                                                </SwiftUIHStack>
                                            </SwiftUIGlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                    )}
                                    <PlatformIcon
                                        name={mediaFilterType !== 'all' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                                        size={18}
                                        tintColor={mediaFilterType !== 'all' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                    />
                                </BouncyToolbarButton>
                            </ContextMenu>

                            {/* Sort Button for Media */}
                            <ContextMenu
                                actions={mediaSortActions}
                                dropdownMenuMode={true}
                                onPress={(e) => handleMediaSortAction(e.nativeEvent.name)}
                            >
                                <BouncyToolbarButton style={styles.selectActionCircleBtn}>
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <SwiftUIGlassEffectContainer modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' })
                                            ]}>
                                                <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                    <SwiftUISpacer />
                                                </SwiftUIHStack>
                                            </SwiftUIGlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                    )}
                                    <PlatformIcon
                                        name="arrow.up.arrow.down"
                                        size={18}
                                        tintColor={mediaSortMode !== 'date-desc' ? (isDark ? FormaBlue[400] : FormaBlue[700]) : textColor}
                                    />
                                </BouncyToolbarButton>
                            </ContextMenu>
                        </View>
                    </View>
                </View>
            )}

            {/* Floating Bottom Bar: Media Multi-Select Actions Toolbar */}
            {activeTab === 'media' && isMediaSelectMode && (
                <View
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.multiSelectToolbarRow}>
                        {/* 1. Left: Cancel (Capsule) */}
                        <BouncyToolbarButton
                            onPress={handleExitMediaSelectMode}
                            style={styles.selectCancelBtn}
                        >
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 18, trailing: 18 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                            )}
                            <Text style={[styles.selectCancelText, { color: textColor }]}>
                                Cancel
                            </Text>
                        </BouncyToolbarButton>

                        {/* 2. Center: Bookmark, Forward, Share, Download/Save to Photos (Circle Buttons) */}
                        <View style={styles.selectCenterGroup}>
                            <BouncyToolbarButton
                                onPress={handleBookmarkSelectedMedia}
                                disabled={selectedMediaIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="bookmark" size={18} tintColor={selectedMediaIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleForwardSelectedMedia}
                                disabled={selectedMediaIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrowshape.turn.up.right" size={18} tintColor={selectedMediaIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleShareSelectedMedia}
                                disabled={selectedMediaIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="square.and.arrow.up" size={18} tintColor={selectedMediaIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>

                            <BouncyToolbarButton
                                onPress={handleSaveSelectedMedia}
                                disabled={selectedMediaIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="arrow.down.to.line" size={18} tintColor={selectedMediaIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                            </BouncyToolbarButton>
                        </View>

                        {/* 3. Right: Delete (Circle with Pull-Down Context Menu) */}
                        <ContextMenu
                            actions={multiSelectMediaDeleteActions}
                            dropdownMenuMode={true}
                            onPress={(e) => handleDeleteMediaBatchAction(e.nativeEvent.name)}
                            disabled={selectedMediaIds.length === 0}
                        >
                            <BouncyToolbarButton
                                disabled={selectedMediaIds.length === 0}
                                style={styles.selectActionCircleBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <PlatformIcon name="trash" size={18} tintColor={selectedMediaIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : '#FF453A'} />
                            </BouncyToolbarButton>
                        </ContextMenu>
                    </View>
                </View>
            )}

            {/* Native SwiftUI Liquid Glass Forward Sheet */}
            <SwiftUIForwardSheet
                visible={!!forwardTargetMessages}
                onClose={() => setForwardTargetMessages(null)}
                messageCount={forwardTargetMessages?.length || 1}
                channels={accessibleForwardChannels}
                onForwardToChannel={async (ch) => {
                    const msgs = forwardTargetMessages || [];
                    setForwardTargetMessages(null);
                    if (isSelectMode) handleExitSelectMode();
                    if (isDocSelectMode) handleExitDocSelectMode();

                    // Send forwarded messages to the target channel
                    for (const m of msgs) {
                        try {
                            await sendChatMessage(ch.id, {
                                text: m.text || '',
                                userId: user?.id,
                                senderName: profile?.full_name || profile?.nickname || user?.email?.split('@')[0] || 'Me',
                                senderRole: profile?.role || 'Member',
                                media: m.media,
                                attachment: m.attachment,
                                attachments: m.attachments,
                                workspaceId: activeWorkspace?.id || null,
                                tenantId: activeTenant?.id || null,
                            });
                        } catch (e) {
                            console.error('Error forwarding message:', e);
                        }
                    }
                    showToast(`Forwarded to ${ch.code}`);
                }}
                isDark={isDark}
            />

            {/* Channel Info & Saved Messages Modal */}
            <Modal
                visible={isChannelInfoVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsChannelInfoVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setIsChannelInfoVisible(false)}
                    />
                    <GlassView
                        intensity={isDark ? 55 : 90}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                            styles.forwardModalContent,
                            {
                                backgroundColor: isDark ? 'rgba(20,20,22,0.95)' : 'rgba(255,255,255,0.96)',
                                borderColor: borderTint,
                                maxHeight: '82%',
                                paddingBottom: (insets.bottom > 0 ? insets.bottom : 16) + 12,
                            }
                        ]}
                    >
                        <View style={styles.forwardHandle} />
                        
                        {/* Channel Header Info */}
                        <View style={{ alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderTint }}>
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                                <TenantBrandLogo tenant={activeTenant} size={30} isDark={isDark} />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>{displayName}</Text>
                            <Text style={{ fontSize: 13, color: subtextColor, marginTop: 2 }}>{displayCode} • {displayMembers} Members</Text>
                        </View>

                        {/* Segmented Filter: Saved Messages vs Pinned vs Details */}
                        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderTint }}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setChannelInfoTab('saved');
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 7,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    backgroundColor: channelInfoTab === 'saved' ? (isDark ? FormaBlue[600] : FormaBlue[700]) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: channelInfoTab === 'saved' ? '#FFFFFF' : subtextColor }}>
                                    Bookmarks ({messages.filter((m) => m.isSaved).length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setChannelInfoTab('pinned');
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 7,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    backgroundColor: channelInfoTab === 'pinned' ? (isDark ? FormaBlue[600] : FormaBlue[700]) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: channelInfoTab === 'pinned' ? '#FFFFFF' : subtextColor }}>
                                    Pinned ({messages.filter((m) => m.isPinned).length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setChannelInfoTab('info');
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 7,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    backgroundColor: channelInfoTab === 'info' ? (isDark ? FormaBlue[600] : FormaBlue[700]) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: channelInfoTab === 'info' ? '#FFFFFF' : subtextColor }}>
                                    Details
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* List Content */}
                        <ScrollView style={{ flexGrow: 0, maxHeight: 320, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                            {channelInfoTab === 'saved' && (
                                <View style={{ paddingVertical: 8, gap: 10 }}>
                                    {messages.filter((m) => m.isSaved).length === 0 ? (
                                        <View style={{ padding: 24, alignItems: 'center' }}>
                                            <Ionicons name="bookmark-outline" size={32} color={subtextColor} style={{ marginBottom: 8, opacity: 0.6 }} />
                                            <Text style={{ color: subtextColor, fontSize: 14, textAlign: 'center' }}>
                                                No bookmarked messages yet. Long-press any message in chat and tap 'Bookmark' to save it here.
                                            </Text>
                                        </View>
                                    ) : (
                                        messages.filter((m) => m.isSaved).map((savedMsg) => (
                                            <View
                                                key={savedMsg.id}
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderWidth: 1,
                                                    borderColor: borderTint,
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? FormaBlue[400] : FormaBlue[700] }}>
                                                        {savedMsg.sender}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: subtextColor }}>{savedMsg.time}</Text>
                                                </View>
                                                <Text style={{ fontSize: 14, color: textColor, marginBottom: 8 }} numberOfLines={2}>
                                                    {formatMessagePreviewSnippet(savedMsg) || 'Message'}
                                                </Text>
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            handleToggleSave(savedMsg.id);
                                                        }}
                                                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                                                    >
                                                        <Text style={{ fontSize: 12, color: subtextColor }}>Remove</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setIsChannelInfoVisible(false);
                                                            handleScrollToMessage(savedMsg.id);
                                                        }}
                                                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: isDark ? FormaBlue[600] : FormaBlue[700] }}
                                                    >
                                                        <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>Jump to Chat</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}

                            {channelInfoTab === 'pinned' && (
                                <View style={{ paddingVertical: 8, gap: 10 }}>
                                    {messages.filter((m) => m.isPinned).length === 0 ? (
                                        <View style={{ padding: 24, alignItems: 'center' }}>
                                            <Ionicons name="pin-outline" size={32} color={subtextColor} style={{ marginBottom: 8, opacity: 0.6 }} />
                                            <Text style={{ color: subtextColor, fontSize: 14, textAlign: 'center' }}>
                                                No pinned messages in this channel.
                                            </Text>
                                        </View>
                                    ) : (
                                        messages.filter((m) => m.isPinned).map((pinnedMsg) => (
                                            <View
                                                key={pinnedMsg.id}
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderWidth: 1,
                                                    borderColor: borderTint,
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? FormaBlue[400] : FormaBlue[700] }}>
                                                        {pinnedMsg.sender}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: subtextColor }}>{pinnedMsg.time}</Text>
                                                </View>
                                                <Text style={{ fontSize: 14, color: textColor, marginBottom: 8 }} numberOfLines={2}>
                                                    {pinnedMsg.text || 'Pinned attachment/media'}
                                                </Text>
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setIsChannelInfoVisible(false);
                                                            handleScrollToMessage(pinnedMsg.id);
                                                        }}
                                                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: isDark ? FormaBlue[600] : FormaBlue[700] }}
                                                    >
                                                        <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>Jump to Chat</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}

                            {channelInfoTab === 'info' && (
                                <View style={{ paddingVertical: 12, gap: 12 }}>
                                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: subtextColor, textTransform: 'uppercase' }}>Description</Text>
                                        <Text style={{ fontSize: 14, color: textColor, marginTop: 4 }}>
                                            Primary coordination channel for site construction, architectural drawings, and milestone sign-offs.
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? FormaBlue[400] : FormaBlue[700] }}>
                                                {messages.filter(m => !!m.attachment || !!m.attachments).length}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>Documents</Text>
                                        </View>
                                        <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? FormaBlue[400] : FormaBlue[700] }}>
                                                {messages.filter(m => !!m.media).length}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>Media</Text>
                                        </View>
                                        <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? FormaBlue[400] : FormaBlue[700] }}>
                                                {messages.filter(m => !!m.hasLink).length}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>Links</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.forwardCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                            onPress={() => setIsChannelInfoVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.forwardCancelText, { color: textColor }]}>Close</Text>
                        </TouchableOpacity>
                    </GlassView>
                </View>
            </Modal>

            {/* Native SwiftUI Liquid Glass Document Info Sheet */}
            <SwiftUIDocInfoSheet
                visible={!!docInfoTarget}
                onClose={() => setDocInfoTarget(null)}
                doc={docInfoTarget}
                isSaved={docInfoTarget ? savedDocIds.includes(docInfoTarget.id) : false}
                onToggleSave={() => {
                    if (!docInfoTarget) return;
                    const isSaved = savedDocIds.includes(docInfoTarget.id);
                    setSavedDocIds(prev => isSaved ? prev.filter(id => id !== docInfoTarget.id) : [...prev, docInfoTarget.id]);
                    showToast(isSaved ? 'Removed from Saved' : 'Saved to Bookmarks', 'bookmark.fill', '#FFCC00');
                }}
                onForward={() => {
                    if (docInfoTarget) {
                        const target = docInfoTarget;
                        setDocInfoTarget(null);
                        setForwardTargetMessages([{
                            id: target.id,
                            sender: target.uploadedBy,
                            text: target.name,
                            time: target.time,
                            type: 'file',
                            fileData: { name: target.name, size: target.size, type: 'doc' },
                        } as any]);
                    }
                }}
                onShare={() => {
                    if (docInfoTarget) {
                        Share.share({ message: `Forma Project File: ${docInfoTarget.name}` }).catch(() => {});
                    }
                }}
                onDownload={() => {
                    if (docInfoTarget) {
                        showToast(`Downloading ${truncateMiddleFileName(docInfoTarget.name)}`, 'arrow.down.to.line', FormaBlue[500]);
                    }
                }}
                onDelete={() => {
                    if (docInfoTarget) {
                        const target = docInfoTarget;
                        setDocInfoTarget(null);
                        setDocsList(prev => prev.filter(d => d.id !== target.id));
                        showToast('Deleted document', 'trash.fill', '#FF453A');
                    }
                }}
                isDark={isDark}
            />

            {/* Global Multi-Tenant Forma Universal File Viewer */}
            <FormaUniversalFileViewer
                visible={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
                isDark={isDark}
                isBookmarked={previewItem?.id ? savedDocIds.includes(previewItem.id) || savedMediaIds.includes(previewItem.id) : false}
                onToggleBookmark={() => {
                    if (!previewItem) return;
                    if (previewItem.id) {
                        if (savedDocIds.includes(previewItem.id)) {
                            setSavedDocIds(prev => prev.filter(id => id !== previewItem.id));
                        } else {
                            setSavedDocIds(prev => [...prev, previewItem.id!]);
                        }
                    }
                }}
                onGetInfo={() => {
                    if (!previewItem) return;
                    setDocInfoTarget({
                        id: previewItem.id || 'preview-doc',
                        name: previewItem.name || previewItem.title || 'document.pdf',
                        size: previewItem.size || '2.4 MB',
                        uploadedBy: previewItem.uploadedBy || previewItem.sender || 'You',
                        time: previewItem.time || '09:15 AM',
                    });
                }}
                activePhotoIndex={activePhotoIndex}
                setActivePhotoIndex={setActivePhotoIndex}
                isVideoPlaying={isVideoPlaying}
                setIsVideoPlaying={setIsVideoPlaying}
                videoProgress={videoProgress}
                setVideoProgress={setVideoProgress}
                videoDurationSec={videoDurationSec}
                photoScrollRef={photoScrollRef}
            />

            {/* Android Attachment Bottom Sheet Menu */}
            <AndroidAttachmentSheet
                visible={isAndroidAttachSheetVisible}
                onClose={() => setIsAndroidAttachSheetVisible(false)}
                onSelect={(action) => handleAttachSelect(action)}
                isDark={isDark}
            />

            {/* Sliding Floating Channel Info Panel on Web Desktop */}
            {isChatInfoVisible && (
                <Animated.View
                    style={[
                        styles.chatInfoSlidePanel,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            transform: [
                                {
                                    translateX: chatInfoSlideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [420, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <ChatInfoContent
                        channelId={channelId}
                        initialName={displayName}
                        initialCode={displayCode}
                        initialMembers={displayMembers}
                        category={(params as any).category || (displayCode.includes('gen') ? 'general' : channelId.startsWith('dept-') ? 'department' : channelId.startsWith('proj-') ? 'project' : 'manual')}
                        isEmbedded={true}
                        onClose={() => toggleChatInfo(false)}
                    />
                </Animated.View>
            )}
        </View>
    );
}

export default function ChatDetailScreen() {
    return <ChatDetailContent />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    chatInfoSlidePanel: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 380,
        maxWidth: 'calc(100% - 24px)' as any,
        zIndex: 999,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 12,
        }),
    },
    emptyStateCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        paddingHorizontal: 24,
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 32,
    },
    emptyStateIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    emptyStateSubtitle: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 290,
    },
    emptyStateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 18,
    },
    emptyStateBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    formerMemberBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    formerMemberText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    disabledInputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 24,
        marginHorizontal: 16,
        borderWidth: 1,
        gap: 8,
    },
    disabledInputText: {
        fontSize: 13,
        fontWeight: '500',
    },
    heroContainer: {
        height: 240,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    heroTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    smallPill: {
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 0.5,
    },
    smallPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    stickySegmentedControlContainer: {
        zIndex: 9999,
        elevation: 9999,
        alignItems: 'center',
        paddingBottom: 12,
        marginTop: Platform.OS === 'ios' ? -115 : 4,
    },
    topSegmentedControl: {
        maxWidth: '100%',
        marginHorizontal: 20,
    },
    content: {
        paddingHorizontal: 16,
    },

    /* Chat Section */
    chatSection: {
        gap: 14,
    },
    dateSeparatorContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    dateSeparatorBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4.5,
        borderRadius: 12,
    },
    dateSeparatorText: {
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    floatingDateBadgeWrapper: {
        position: 'absolute',
        bottom: -32,
        alignSelf: 'center',
        zIndex: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingDateBadgeWrapperRight: {
        position: 'absolute',
        bottom: -32,
        right: 14,
        zIndex: 20,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    floatingDateContainer: {
        height: 28,
        minWidth: 70,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingDateInner: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingDateText: {
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    messageRow: {
        flexDirection: 'row',
        gap: 10,
        maxWidth: Platform.OS === 'web' ? '76%' : '82%',
        marginVertical: 2,
    },
    messageRowOther: {
        alignSelf: 'flex-start',
    },
    messageRowSelf: {
        alignSelf: 'flex-end',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    bubbleContainer: {
        flexShrink: 1,
        maxWidth: '100%',
    },
    senderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '700',
    },
    roleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '600',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        maxWidth: '100%',
        alignSelf: 'flex-start',
    },
    bubbleSelf: {
        backgroundColor: FormaBlue[400],
        alignSelf: 'flex-end',
    },
    bubbleOther: {},
    messageText: {
        fontSize: 15,
        lineHeight: 21,
        ...(Platform.OS === 'web' ? ({
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
        } as any) : {}),
    },
    announcementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 6,
    },
    announcementTitle: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    /* Embedded Media (Photo Grid & Video) - Clean borderless full bleed */
    mediaContainer: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 250,
        gap: 4,
        borderRadius: 18,
        overflow: 'hidden',
    },
    photoGridTile: {
        width: 123,
        height: 110,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    photoGridImage: {
        width: '100%',
        height: '100%',
    },
    photoGridOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoGridOverlayText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '500',
    },
    singlePhotoWrapper: {
        width: 250,
        height: 180,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
    },
    singlePhotoImage: {
        width: '100%',
        height: '100%',
    },
    videoWrapper: {
        width: 250,
        height: 165,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    videoPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    videoDurationBadgeContainer: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    videoDurationHost: {
        width: 62,
        height: 24,
    },
    videoDurationBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 11,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    videoDurationText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },

    /* Direct Document Bubble (Primary Card, Not Box-in-a-Box) */
    docBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 18,
        width: 250,
        gap: 10,
    },
    docBubbleSelf: {
        backgroundColor: FormaBlue[400],
    },
    docBubbleOther: {},
    docIconBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docFileName: {
        fontSize: 13.5,
        fontWeight: '600',
        marginBottom: 2,
    },
    docFileSize: {
        fontSize: 11,
    },
    docDownloadBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    timeText: {
        fontSize: 11,
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    reactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 14,
        overflow: 'hidden',
    },
    reactionText: {
        fontSize: 12,
        fontWeight: '600',
    },

    /* Floating Liquid Glass Input Bar (Anchored right above screen bottom) */
    floatingInputWrapper: {
        position: 'absolute',
        left: 14,
        right: 14,
        zIndex: 99,
    },

    /* Filter Views (Docs, Media, Links, Actions) */
    filterSection: {
        gap: 10,
    },
    filterTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },

    /* Docs Tab: Clean Pill Cards */
    docPillCard: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 24,
        borderWidth: 1,
    },
    docPillTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        marginBottom: 3,
    },
    docPillSubtitle: {
        fontSize: 12,
    },

    /* Media Tab: Gallery Grid (WhatsApp / iOS Photos style) */
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    galleryTileWrapper: {
        width: '32%',
        aspectRatio: 1,
    },
    galleryTile: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Links Tab: Clean Pill Cards */
    linkPillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
    },
    linkIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    linkCardTouchable: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    linkPillTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    linkPillUrl: {
        fontSize: 12.5,
        fontWeight: '500',
        marginBottom: 2,
    },
    linkPillSubtitle: {
        fontSize: 11,
        fontWeight: '500',
    },

    /* Actions Tab */
    filterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 20,
        gap: 12,
    },
    filterIconBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0,54,248,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    filterCardSubtitle: {
        fontSize: 11.5,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    /* Quoted Reply inside Message Bubble (Seamless WhatsApp / Telegram style) */
    quotedReplyBox: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 8,
    },
    quotedReplySender: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    quotedReplyText: {
        fontSize: 12,
        lineHeight: 16,
    },

    /* Pinned Message Banner */
    pinnedBannerWrapper: {
        width: '100%',
        paddingHorizontal: 16,
        marginTop: 8,
    },
    pinnedBannerContainer: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
    },
    pinnedBannerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 48,
        width: '100%',
    },
    pinnedBannerTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 1,
    },
    pinnedBannerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    scrollToBottomBtn: {
        alignSelf: 'flex-end',
        width: 38,
        height: 38,
        borderRadius: 19,
        marginBottom: 8,
        marginRight: 0,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    multiSelectToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 4,
    },
    selectCancelBtn: {
        height: 44,
        paddingHorizontal: 20,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    selectCancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    selectCenterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    selectActionCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    floatingSearchToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    floatingSearchCapsule: {
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    searchInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: '100%',
        gap: 8,
    },
    floatingSearchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
    },
    floatingSearchActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectBtnFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    selectCircleFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    forwardSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 12,
    },
    forwardSendBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    forwardModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    forwardHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    forwardHeader: {
        marginBottom: 12,
    },
    forwardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    forwardSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    forwardChannelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    forwardIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forwardChannelName: {
        fontSize: 15,
        fontWeight: '600',
    },
    forwardChannelCode: {
        fontSize: 12,
        marginTop: 1,
    },
    forwardCancelBtn: {
        marginTop: 14,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forwardCancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    bannerCapsuleWrapper: {
        width: '100%',
        height: 48,
        marginBottom: 8,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {}),
    },
    replyBannerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        width: '100%',
    },
    replyIconPill: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    replyCloseBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    replySender: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 1,
    },
    replyText: {
        fontSize: 12,
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2.5,
        marginHorizontal: -16,
    },
    mediaGridItem: {
        width: '32.7%',
        aspectRatio: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
    },
    mediaGridImageContainer: {
        width: '100%',
        height: '100%',
        position: Platform.OS === 'web' ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    mediaGridImage: {
        width: '100%',
        height: '100%',
        ...(Platform.OS === 'web' ? { objectFit: 'cover' as any } : {}),
    },
    mediaVideoBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 12,
        overflow: 'hidden',
    },
    mediaVideoDuration: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    mediaSelectCheckWrapper: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 10,
    },
    mediaSavedBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    mediaSelectCheckCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingToastContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 9999,
        elevation: 99,
    },
});

const previewStyles = StyleSheet.create({
    fullscreenContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.96)',
        justifyContent: 'space-between',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 6,
        backgroundColor: 'transparent',
        zIndex: 50,
    },
    topBarActionBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarBubbleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 0,
    },
    topBarBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarCenter: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    topBarSubtitle: {
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 11.5,
        marginTop: 1,
        fontWeight: '500',
        textAlign: 'center',
    },
    bodyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
    videoPlayerWrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayerImage: {
        width: '100%',
        height: '100%',
    },
    videoCenterPlayContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoCenterPlayFallback: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    videoBottomBarContainer: {
        width: '100%',
        paddingBottom: 2,
    },
    videoGlassCapsule: {
        width: '100%',
        backgroundColor: 'rgba(28, 28, 30, 0.65)',
    },
    videoControlsInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 6,
        paddingRight: 16,
        paddingVertical: 5,
        gap: 8,
    },
    videoPlayToggleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoSliderWrapper: {
        flex: 1,
        height: 36,
        justifyContent: 'center',
    },
    swiftUiHost: {
        height: 36,
        width: '100%',
        justifyContent: 'center',
    },
    fallbackProgressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    fallbackProgressFill: {
        height: '100%',
        backgroundColor: '#0A84FF',
        borderRadius: 2,
    },
    videoTimeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    docViewerWrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfPaperSheet: {
        width: '100%',
        height: 520,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'space-between',
    },
    pdfSheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottomWidth: 1.5,
        borderBottomColor: '#0F172A',
    },
    pdfCompanyText: {
        fontSize: 10.5,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 0.5,
    },
    pdfProjectTitleText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#475569',
        marginTop: 2,
    },
    pdfScaleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 0.8,
        borderColor: '#CBD5E1',
    },
    pdfScaleText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#334155',
        letterSpacing: 0.4,
    },
    pdfDrawingCanvas: {
        flex: 1,
        marginVertical: 8,
        justifyContent: 'space-between',
    },
    pdfGridHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 4,
    },
    pdfGridLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#0284C7',
    },
    pdfPlanFrame: {
        flex: 1,
        borderWidth: 1.2,
        borderColor: '#0284C7',
        borderStyle: 'dashed',
        borderRadius: 4,
        backgroundColor: '#F0F9FF',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfColumnA: {
        position: 'absolute',
        top: 14,
        left: 14,
        width: 14,
        height: 14,
        backgroundColor: '#0F172A',
        borderRadius: 2,
    },
    pdfColumnB: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 14,
        height: 14,
        backgroundColor: '#0F172A',
        borderRadius: 2,
    },
    pdfColumnC: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        width: 14,
        height: 14,
        backgroundColor: '#0F172A',
        borderRadius: 2,
    },
    pdfColumnD: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 14,
        height: 14,
        backgroundColor: '#0F172A',
        borderRadius: 2,
    },
    pdfGirderSpanX: {
        position: 'absolute',
        top: 20,
        left: 28,
        right: 28,
        height: 2,
        backgroundColor: '#0284C7',
    },
    pdfGirderSpanY: {
        position: 'absolute',
        left: 20,
        top: 28,
        bottom: 28,
        width: 2,
        backgroundColor: '#0284C7',
    },
    pdfBraceLeft: {
        position: 'absolute',
        width: '70%',
        height: 1,
        backgroundColor: '#94A3B8',
        transform: [{ rotate: '25deg' }],
    },
    pdfBraceRight: {
        position: 'absolute',
        width: '70%',
        height: 1,
        backgroundColor: '#94A3B8',
        transform: [{ rotate: '-25deg' }],
    },
    pdfDimLineX: {
        position: 'absolute',
        top: 2,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: '#94A3B8',
    },
    pdfDimLineY: {
        position: 'absolute',
        right: 2,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: '#94A3B8',
    },
    pdfDimText: {
        fontSize: 7.5,
        fontWeight: '700',
        color: '#475569',
    },
    pdfTargetBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#0284C7',
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10,
    },
    pdfTargetText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0284C7',
        letterSpacing: 0.5,
    },
    pdfTitleBlockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
    },
    pdfTitleBlockInfo: {
        flex: 1,
        paddingRight: 8,
    },
    pdfDwgTitle: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    pdfDwgMeta: {
        fontSize: 7.5,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    pdfApprovedStamp: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1.5,
        borderColor: '#0284C7',
        borderRadius: 4,
        alignItems: 'center',
        backgroundColor: 'rgba(2, 132, 199, 0.05)',
        transform: [{ rotate: '-4deg' }],
    },
    pdfStampTextTop: {
        fontSize: 8,
        fontWeight: '900',
        color: '#0284C7',
        letterSpacing: 0.5,
    },
    pdfStampTextSub: {
        fontSize: 6.5,
        fontWeight: '800',
        color: '#0284C7',
    },
    pdfStampTextId: {
        fontSize: 6,
        fontWeight: '700',
        color: '#64748B',
    },
    pdfTableContainer: {
        flex: 1,
        marginTop: 8,
    },
    pdfTableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRadius: 3,
    },
    pdfTableTh: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    pdfTableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderBottomWidth: 0.6,
        borderBottomColor: '#E2E8F0',
    },
    pdfTableTd: {
        fontSize: 7.5,
        color: '#1E293B',
    },
    pdfNotesBlock: {
        marginTop: 10,
        padding: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#0284C7',
    },
    pdfNotesTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 3,
    },
    pdfNotesItem: {
        fontSize: 7,
        color: '#475569',
        lineHeight: 10.5,
    },
    pdfDetailCanvas: {
        flex: 1,
        marginTop: 8,
        justifyContent: 'space-between',
    },
    pdfBaseplateDiagram: {
        height: 140,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 16,
        position: 'relative',
    },
    pdfColumnFlangeLeft: {
        position: 'absolute',
        top: 20,
        bottom: 30,
        left: '42%',
        width: 6,
        backgroundColor: '#0F172A',
    },
    pdfColumnWeb: {
        position: 'absolute',
        top: 20,
        bottom: 30,
        left: '42%',
        right: '42%',
        height: 3,
        backgroundColor: '#0F172A',
    },
    pdfColumnFlangeRight: {
        position: 'absolute',
        top: 20,
        bottom: 30,
        right: '42%',
        width: 6,
        backgroundColor: '#0F172A',
    },
    pdfBaseplatePlate: {
        width: 140,
        height: 8,
        backgroundColor: '#334155',
        borderRadius: 1,
    },
    pdfGroutLayer: {
        width: 150,
        height: 5,
        backgroundColor: '#94A3B8',
        marginTop: 1,
    },
    pdfConcretePedestal: {
        width: 170,
        height: 14,
        backgroundColor: '#E2E8F0',
        borderWidth: 0.8,
        borderColor: '#CBD5E1',
        marginTop: 1,
    },
    pdfDetailCallouts: {
        padding: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        gap: 2,
    },
    pdfCalloutText: {
        fontSize: 7.5,
        color: '#334155',
        fontWeight: '600',
    },
    pdfSignoffRow: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
    },
    pdfSignBox: {
        flex: 1,
        padding: 4,
        borderWidth: 0.8,
        borderColor: '#94A3B8',
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    pdfSignRole: {
        fontSize: 6,
        fontWeight: '800',
        color: '#64748B',
    },
    pdfSignName: {
        fontSize: 8,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 2,
    },
    pdfSignDate: {
        fontSize: 6.5,
        color: '#94A3B8',
    },
    docFloatingPagePill: {
        position: 'absolute',
        bottom: 14,
        alignSelf: 'center',
        zIndex: 50,
    },
    docFloatingPillInner: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        backgroundColor: 'rgba(28, 28, 30, 0.75)',
    },
    docFloatingPillText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    thumbnailStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        gap: 10,
        paddingHorizontal: 8,
    },
    thumbnailItem: {
        width: 50,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2.5,
        backgroundColor: '#1E293B',
    },
    thumbnailItemInactive: {
        borderColor: 'transparent',
        opacity: 0.65,
    },
    thumbnailItemActive: {
        borderColor: '#0A84FF',
        opacity: 1,
    },
    thumbnailItemImg: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    formerMemberBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    formerMemberText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    disabledInputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 24,
        marginHorizontal: 16,
        borderWidth: 1,
        gap: 8,
    },
    disabledInputText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
