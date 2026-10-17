import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Share,
    Alert,
    Clipboard,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getProjectById, Project, saveProjectMeta } from '@/lib/api/projects';
import { ActivityFeedItem, DEFAULT_MOCK_FEED_ITEMS, normalizeFeedItem, getWorkItemVisuals } from '@/components/projects/ActivityTab';
import { DocPagePreview } from '@/components/chat/SwiftUIDocInfoSheet';
import { FormaUniversalFileViewer } from '@/components/chat/FormaUniversalFileViewer';
import { FilePreviewItem } from '@/lib/filePreviewStrategy';
import { SwiftUIForwardSheet, ForwardChannel } from '@/components/chat/SwiftUIForwardSheet';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { Task, Action } from '@/constants/MockData';
import { getUserAccessibleChannels, sendChatMessage } from '@/lib/api/chat';
import { useTenantContext } from '@/context/TenantContext';
import { Host, GlassEffectContainer as SwiftUIGlassEffectContainer, HStack as SwiftUIHStack, Spacer as SwiftUISpacer, glassEffect, frame, cornerRadius, padding as swiftUIPadding } from '@/lib/swiftui';

export default function ProjectActivityDetailsScreen() {
    const { id, projectId } = useLocalSearchParams<{ id: string; projectId?: string }>();
    const activityId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
    const currentProjectId = typeof projectId === 'string' ? projectId : Array.isArray(projectId) ? projectId[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const formaBlue = '#0036F8';
    const cardBgColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.9)';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const scrollRef = useRef<ScrollView>(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [project, setProject] = useState<Project | null>(null);
    const [activity, setActivity] = useState<ActivityFeedItem | null>(null);
    const [allActivities, setAllActivities] = useState<ActivityFeedItem[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [previewItem, setPreviewItem] = useState<FilePreviewItem | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);

    const likeScale = useSharedValue(1);
    const likeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    // Load Project & Find Activity
    const loadData = useCallback(async () => {
        let initialList: ActivityFeedItem[] = [];
        if (currentProjectId) {
            try {
                const p = await getProjectById(currentProjectId);
                if (p) {
                    setProject(p);
                    const rawLogs = p.meta?.activities || p.meta?.activityLogs || (p as any).activityLogs || [];
                    if (Array.isArray(rawLogs) && rawLogs.length > 0) {
                        initialList = rawLogs.map(normalizeFeedItem);
                    }
                }
            } catch (err) {
                console.warn('Error loading project for activity details:', err);
            }
        }
        setAllActivities(initialList);
        const target = initialList.find(a => a.id === activityId);
        setActivity(target || null);
    }, [currentProjectId, activityId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleLike = () => {
        if (!activity) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        likeScale.value = withSpring(0.75, { damping: 10, stiffness: 350 }, () => {
            likeScale.value = withSpring(1.0, { damping: 8, stiffness: 300 });
        });

        const updatedLiked = !activity.hasLiked;
        const updatedCount = updatedLiked ? (activity.likes || 0) + 1 : Math.max(0, (activity.likes || 1) - 1);
        const updatedItem = {
            ...activity,
            hasLiked: updatedLiked,
            likes: updatedCount,
        };

        setActivity(updatedItem);

        const updatedList = allActivities.map(a => a.id === activity.id ? updatedItem : a);
        setAllActivities(updatedList);

        if (project?.id) {
            saveProjectMeta(project.id, { activityLogs: updatedList });
        }
    };

    const handleAddComment = () => {
        if (!commentInput.trim() || !activity) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newComment = {
            id: `c-${Date.now()}`,
            author: 'You',
            text: commentInput.trim(),
            timestamp: 'Just now',
        };

        const existingComments = activity.comments || [];
        const updatedComments = [...existingComments, newComment];
        const updatedItem: ActivityFeedItem = {
            ...activity,
            comments: updatedComments,
            commentPreview: {
                author: newComment.author,
                text: newComment.text,
            },
        };

        setActivity(updatedItem);
        setCommentInput('');
        Keyboard.dismiss();

        const updatedList = allActivities.map(a => a.id === activity.id ? updatedItem : a);
        setAllActivities(updatedList);

        if (project?.id) {
            saveProjectMeta(project.id, { activityLogs: updatedList });
        }
    };

    const handleShare = async () => {
        if (!activity) return;
        try {
            await Share.share({
                message: `${activity.authorName} on ${project?.title || 'Project'}:\n${activity.title ? `*${activity.title}*\n` : ''}${activity.description}\n\nShared via Forma`,
            });
        } catch (err) {
            console.warn('Error sharing activity:', err);
        }
    };

    const { activeTenant, activeWorkspace, tenantRole } = useTenantContext();
    const [isForwardSheetVisible, setIsForwardSheetVisible] = useState(false);
    const [accessibleForwardChannels, setAccessibleForwardChannels] = useState<ForwardChannel[]>([]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const channels = await getUserAccessibleChannels({
                    tenantId: activeTenant?.id,
                    workspaceId: activeWorkspace?.id,
                    tenantRole,
                });
                const mapped: ForwardChannel[] = channels.map(c => ({
                    id: c.id,
                    code: c.code,
                    name: c.name,
                    icon: 'chatbubbles',
                    avatarUri: c.avatar || null,
                }));
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
    }, [activeTenant?.id, activeWorkspace?.id, tenantRole]);

    const handleForwardToChannel = async (channel: ForwardChannel) => {
        if (!activity) return;
        setIsForwardSheetVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const messageText = `📢 *Forwarded Activity Update* (${project?.title || 'Project'}):\n` +
            `${activity.authorName} (${activity.authorRole || 'Member'})\n` +
            `${activity.title ? `*${activity.title}*\n` : ''}${activity.description || ''}`;

        try {
            await sendChatMessage(channel.id, {
                text: messageText,
                senderName: activity.authorName || 'Project Member',
                senderRole: activity.authorRole || 'Member',
                workspaceId: activeWorkspace?.id || null,
                tenantId: activeTenant?.id || null,
                media: activity.images && activity.images.length > 0 ? activity.images.map((img, i) => ({ id: `fwd-${i}`, url: img, type: 'image' })) : undefined,
                attachment: activity.attachment ? {
                    id: `fwd-att-${Date.now()}`,
                    name: activity.attachment.name,
                    size: activity.attachment.size,
                    type: activity.attachment.type,
                } : undefined,
            });
            Alert.alert(
                'Forwarded Successfully',
                `Activity update forwarded to ${channel.code}.`,
                [
                    { text: 'OK', style: 'default' },
                    {
                        text: 'View in Chat',
                        onPress: () => {
                            router.push({
                                pathname: '/chat-details/[id]',
                                params: { id: channel.id, name: channel.name, code: channel.code }
                            });
                        }
                    }
                ]
            );
        } catch (e) {
            console.error('Error forwarding activity to chat:', e);
            Alert.alert('Forwarded', `Activity update shared to ${channel.code}.`);
        }
    };

    const activityShareActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Share to Chat', systemIcon: 'bubble.left.and.bubble.right' },
        { title: 'Copy Text', systemIcon: 'doc.on.doc' },
        { title: 'Share via...', systemIcon: 'square.and.arrow.up' },
    ], []);

    const handleShareMenuPress = (actionName: string) => {
        if (!activity) return;
        Haptics.selectionAsync();
        if (actionName === 'Share to Chat') {
            setIsForwardSheetVisible(true);
        } else if (actionName === 'Copy Text') {
            const textToCopy = `${activity.title ? `${activity.title}\n` : ''}${activity.description || ''}`.trim();
            Clipboard.setString(textToCopy);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (actionName === 'Share via...' || actionName.includes('Share')) {
            handleShare();
        }
    };

    const handleOpenMediaPreview = (images: string[], initialIndex: number, item?: ActivityFeedItem) => {
        Haptics.selectionAsync();
        const gallery = images.map((uri, idx) => {
            const isVideo = uri.endsWith('.mp4') || uri.endsWith('.mov') || uri.includes('video');
            return {
                id: `detail-media-${idx}`,
                title: item?.title || item?.description || 'Activity Media',
                name: isVideo ? `Video_${idx + 1}.mp4` : `Photo_${idx + 1}.jpg`,
                uri: uri,
                url: uri,
                type: isVideo ? 'video' : 'image',
                uploadedBy: item?.authorName || 'Project Member',
                time: item?.timestamp || 'Today',
            };
        });
        const selected = gallery[initialIndex] || gallery[0];
        router.push({
            pathname: '/file-preview',
            params: {
                id: selected.id,
                title: selected.title,
                name: selected.name,
                uri: selected.uri,
                url: selected.uri,
                type: selected.type,
                uploadedBy: selected.uploadedBy,
                time: selected.time,
                activeIndex: initialIndex.toString(),
                gallery: JSON.stringify(gallery),
            },
        });
    };

    const handleOpenAttachment = (attachment: any, item?: ActivityFeedItem) => {
        Haptics.selectionAsync();
        router.push({
            pathname: '/file-preview',
            params: {
                id: `att-${Date.now()}`,
                name: attachment.name,
                title: attachment.name,
                size: attachment.size,
                type: attachment.type,
                uploadedBy: item?.authorName || 'Project Member',
                time: item?.timestamp || 'Today',
            },
        });
    };

    const isMilestone = activity?.workSource?.type === 'milestone';
    const isTask = activity?.workSource?.type === 'task';
    const isAction = activity?.workSource?.type === 'action';
    const workVisuals = activity?.workSource 
        ? getWorkItemVisuals(activity.workSource.type, activity.workSource.status, activity.workSource.title, activity.activityType) 
        : null;

    const handleOpenWorkItem = (workSource?: { type: 'milestone' | 'task' | 'action'; id?: string; title: string; status?: string }) => {
        if (!workSource) return;
        Haptics.selectionAsync();
        if (workSource.type === 'task') {
            const isCompleted = (workSource.status || '').toLowerCase().includes('complete') || (workSource.status || '').toLowerCase().includes('done');
            const taskObj: Task = {
                id: workSource.id || `task-${Date.now()}`,
                title: workSource.title,
                project: project?.title || 'Project',
                projectCode: project?.code || 'PRJ',
                status: isCompleted ? 'done' : 'in_progress',
                priority: 'high',
                dueDate: 'Today',
                description: `Linked work task: ${workSource.title}`,
            };
            setSelectedTask(taskObj);
        } else if (workSource.type === 'action') {
            const isCompleted = (workSource.status || '').toLowerCase().includes('complete') || (workSource.status || '').toLowerCase().includes('done');
            const actionObj: Action = {
                id: workSource.id || `act-${Date.now()}`,
                title: workSource.title,
                project: project?.title || 'Project',
                projectCode: project?.code || 'PRJ',
                module: 'project',
                date: '2026-09-14',
                status: isCompleted ? 'done' : 'in_progress',
                priority: 'high',
                dueDate: 'Today',
                description: `Linked work action: ${workSource.title}`,
            } as any;
            setSelectedAction(actionObj);
        } else if (workSource.type === 'milestone') {
            if (project?.id) {
                router.push(`/project-milestones/${project.id}` as any);
            }
        }
    };

    const headerActions: HeaderToolbarAction[] = [
        {
            id: 'share',
            icon: 'share-outline',
            image: 'square.and.arrow.up',
            title: 'Share Activity',
            menuActions: activityShareActions,
            onMenuPress: (e) => handleShareMenuPress(e.nativeEvent.name),
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTransparent: Platform.OS === 'ios',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTitle: 'Activity Details',
                    headerBackTitle: project?.title || 'Project',
                    headerBackButtonDisplayMode: 'minimal',
                    headerTintColor: isDark ? '#FFFFFF' : '#000000',
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerRight: () => (
                        <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderToolbar actions={headerActions} isDark={isDark} textColor={isDark ? '#FFFFFF' : '#000000'} />
                        </View>
                    ),
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollArea}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingTop: insets.top + 60,
                            paddingBottom: insets.bottom + 100,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onScroll={(e) => {
                        const y = e.nativeEvent.contentOffset.y;
                        setShowBackToTop(y > 180);
                    }}
                    scrollEventThrottle={16}
                >
                    {activity && (
                        <Animated.View entering={FadeInDown.duration(280)}>
                            {/* 1. Main Social Card */}
                            <GlassView
                                intensity={isDark ? 12 : 25}
                                style={[styles.mainCard, { backgroundColor: cardBgColor }]}
                            >
                                {/* Author Row */}
                                <View style={styles.authorRow}>
                                    <View style={[
                                        styles.avatarCircle,
                                        { backgroundColor: workVisuals ? workVisuals.color : formaBlue }
                                    ]}>
                                        <Text style={styles.avatarInitials}>
                                            {activity.authorName ? activity.authorName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U'}
                                        </Text>
                                    </View>
                                    <View style={styles.authorDetails}>
                                        <Text style={[styles.authorName, { color: textColor }]}>
                                            {activity.authorName}
                                        </Text>
                                        <Text style={[styles.authorRole, { color: subtextColor }]}>
                                            {activity.authorRole || 'Project Member'} · {activity.timestamp}
                                            {activity.isEdited && (
                                                <Text style={{ fontStyle: 'italic', opacity: 0.85 }}> · (edited)</Text>
                                            )}
                                        </Text>
                                    </View>
                                </View>

                                {/* Optional Title */}
                                {Boolean(activity.title) && (
                                    <Text style={[styles.postTitle, { color: textColor }]}>
                                        {activity.title}
                                    </Text>
                                )}

                                {/* Caption / Description */}
                                <Text style={[styles.postDescription, { color: textColor }]} selectable>
                                    {activity.description}
                                </Text>

                                {/* Media List / Grid */}
                                {activity.images && activity.images.length > 0 && (
                                    <View style={styles.mediaContainer}>
                                        {activity.images.map((imgUri, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                activeOpacity={0.9}
                                                onPress={() => handleOpenMediaPreview(activity.images!, idx, activity)}
                                                style={styles.detailImageWrapper}
                                            >
                                                <Image source={{ uri: imgUri }} style={styles.detailImage} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Attachment Card with DocPagePreview */}
                                {activity.attachment && (
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => handleOpenAttachment(activity.attachment, activity)}
                                        style={[styles.attachmentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
                                    >
                                        <DocPagePreview fileName={activity.attachment.name} isDark={isDark} />
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={[styles.attachmentName, { color: textColor }]} numberOfLines={1} ellipsizeMode="middle">
                                                {activity.attachment.name}
                                            </Text>
                                            <Text style={[styles.attachmentSize, { color: subtextColor }]}>
                                                {activity.attachment.size || 'Document'} • {activity.timestamp}
                                            </Text>
                                        </View>
                                        <PlatformIcon name="arrow.down.circle" size={20} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                )}

                                {/* Compact Linked-Work Chip below Media (Clickable to open Drawer) */}
                                {activity.workSource && workVisuals && (
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => handleOpenWorkItem(activity.workSource)}
                                        style={[
                                            styles.linkedWorkChip,
                                            {
                                                backgroundColor: workVisuals.bg,
                                            }
                                        ]}
                                    >
                                        <PlatformIcon
                                            name={workVisuals.icon}
                                            size={13}
                                            tintColor={workVisuals.color}
                                        />
                                        <Text style={[
                                            styles.linkedWorkChipText,
                                            { color: workVisuals.color }
                                        ]}>
                                            {workVisuals.label} · {activity.workSource.title}
                                        </Text>
                                        <PlatformIcon
                                            name="chevron.right"
                                            size={11}
                                            tintColor={workVisuals.color}
                                        />
                                    </TouchableOpacity>
                                )}

                                {/* Interaction Stats Row: Icon Only + Number + Send (SF Pro Icons) */}
                                <View style={styles.interactionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionCounter}
                                        onPress={handleToggleLike}
                                    >
                                        <Animated.View style={likeAnimatedStyle}>
                                            <PlatformIcon
                                                name={activity.hasLiked ? 'heart.fill' : 'heart'}
                                                size={18}
                                                tintColor={activity.hasLiked ? '#FF3B30' : subtextColor}
                                            />
                                        </Animated.View>
                                        <Text style={[styles.actionCounterText, { color: activity.hasLiked ? '#FF3B30' : subtextColor }]}>
                                            {activity.likes || 0}
                                        </Text>
                                    </TouchableOpacity>

                                    <View style={styles.actionCounter}>
                                        <PlatformIcon name="bubble.left" size={16} tintColor={subtextColor} />
                                        <Text style={[styles.actionCounterText, { color: subtextColor }]}>
                                            {activity.comments?.length || 0}
                                        </Text>
                                    </View>

                                    <ContextMenu
                                        actions={activityShareActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => handleShareMenuPress(e.nativeEvent.name)}
                                    >
                                        <TouchableOpacity
                                            style={styles.actionCounter}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon name="paperplane" size={16} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    </ContextMenu>
                                </View>
                            </GlassView>

                            {/* 2. Comments Section */}
                            <View style={styles.commentsSection}>
                                <Text style={[styles.sectionHeading, { color: subtextColor }]}>
                                    Comments ({activity.comments?.length || 0})
                                </Text>

                                {(!activity.comments || activity.comments.length === 0) ? (
                                    <GlassView
                                        intensity={isDark ? 10 : 20}
                                        style={[styles.emptyCommentsCard, { backgroundColor: cardBgColor }]}
                                    >
                                        <Ionicons name="chatbubbles-outline" size={28} color={subtextColor} style={{ marginBottom: 6 }} />
                                        <Text style={[styles.emptyCommentsTitle, { color: textColor }]}>
                                            No comments yet
                                        </Text>
                                        <Text style={[styles.emptyCommentsSub, { color: subtextColor }]}>
                                            Be the first to share feedback or congratulations!
                                        </Text>
                                    </GlassView>
                                ) : (
                                    <View style={styles.commentsList}>
                                        {activity.comments.map((comment) => (
                                            <GlassView
                                                key={comment.id}
                                                intensity={isDark ? 12 : 25}
                                                style={[styles.commentBubble, { backgroundColor: cardBgColor }]}
                                            >
                                                <View style={styles.commentHeader}>
                                                    <View style={[styles.commentAvatar, { backgroundColor: comment.author === 'You' ? formaBlue : '#8E8E93' }]}>
                                                        <Text style={styles.commentAvatarText}>
                                                            {comment.author ? comment.author.charAt(0).toUpperCase() : 'U'}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.commentAuthorName, { color: textColor }]}>
                                                            {comment.author}
                                                        </Text>
                                                        <Text style={[styles.commentTimestamp, { color: subtextColor }]}>
                                                            {comment.timestamp}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.commentBodyText, { color: textColor }]}>
                                                    {comment.text}
                                                </Text>
                                            </GlassView>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>

                {/* Floating Back to Top Button */}
                {showBackToTop && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                        style={[
                            styles.backToTopButtonWrapper,
                            { bottom: Math.max(insets.bottom, 12) + 64 }
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                scrollRef.current?.scrollTo({ y: 0, animated: true });
                            }}
                            style={styles.backToTopButton}
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
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)', borderRadius: 22 }]} />
                            )}
                            <PlatformIcon name="chevron.up" size={18} tintColor={textColor} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* 3. Floating Liquid Glass Comment Input Bar */}
                <View style={[
                    styles.floatingInputWrapper,
                    { bottom: Math.max(insets.bottom, 12) + 4 }
                ]} pointerEvents="box-none">
                    <View style={styles.floatingInputCapsule}>
                        {Platform.OS === 'ios' ? (
                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer modifiers={[
                                    frame({ height: 50 }),
                                    cornerRadius(25),
                                    glassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftUIHStack alignment="center" modifiers={[
                                        frame({ height: 50 }),
                                    ]}>
                                        <SwiftUISpacer />
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </Host>
                        ) : (
                            <View style={[styles.floatingInputFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.88)' : 'rgba(255,255,255,0.88)' }]} />
                        )}

                        <View style={styles.inputInnerRow}>
                            <TextInput
                                placeholder="Write a comment..."
                                placeholderTextColor={subtextColor}
                                value={commentInput}
                                onChangeText={setCommentInput}
                                style={[styles.floatingTextInputField, { color: textColor }]}
                                returnKeyType="send"
                                onSubmitEditing={handleAddComment}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.floatingSendBtn,
                                    {
                                        backgroundColor: commentInput.trim() ? formaBlue : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'),
                                    }
                                ]}
                                disabled={!commentInput.trim()}
                                onPress={handleAddComment}
                            >
                                <Ionicons
                                    name="arrow-up"
                                    size={18}
                                    color={commentInput.trim() ? '#FFFFFF' : subtextColor}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Global Forma Universal File & Media Viewer */}
            <FormaUniversalFileViewer
                visible={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
                isDark={isDark}
            />

            {/* Native SwiftUI Liquid Glass Forward Sheet */}
            <SwiftUIForwardSheet
                visible={isForwardSheetVisible}
                onClose={() => setIsForwardSheetVisible(false)}
                messageCount={1}
                channels={accessibleForwardChannels}
                onForwardToChannel={handleForwardToChannel}
                isDark={isDark}
            />

            {/* Native Task Detail Sheet */}
            <SwiftUITaskDetailSheet
                isOpened={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                onTaskUpdated={() => loadData()}
            />

            {/* Native Action Detail Sheet */}
            <SwiftUIActionDetailSheet
                isOpened={!!selectedAction}
                onClose={() => setSelectedAction(null)}
                action={selectedAction}
                onStatusChange={() => {
                    loadData();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 20,
    },
    mainCard: {
        borderRadius: 24,
        padding: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    authorDetails: {
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    authorRole: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    postTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    postDescription: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
        marginBottom: 12,
    },
    mediaContainer: {
        gap: 12,
        marginVertical: 10,
    },
    detailImageWrapper: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
    },
    detailImage: {
        width: '100%',
        height: 240,
    },
    attachmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 12,
        marginVertical: 8,
    },
    attachmentName: {
        fontSize: 14,
        fontWeight: '600',
    },
    attachmentSize: {
        fontSize: 12,
        marginTop: 2,
    },
    linkedWorkChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        maxWidth: '100%',
        marginVertical: 8,
    },
    linkedWorkChipText: {
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
        flexWrap: 'wrap',
        lineHeight: 18,
    },
    interactionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        paddingTop: 6,
        marginTop: 4,
    },
    actionCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionCounterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    commentsSection: {
        gap: 12,
        marginTop: 18,
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '700',
        paddingHorizontal: 4,
    },
    emptyCommentsCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCommentsTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptyCommentsSub: {
        fontSize: 13,
        textAlign: 'center',
    },
    commentsList: {
        gap: 10,
    },
    commentBubble: {
        borderRadius: 18,
        padding: 14,
        gap: 8,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentAvatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    commentAuthorName: {
        fontSize: 14,
        fontWeight: '700',
    },
    commentTimestamp: {
        fontSize: 11,
        marginTop: 1,
    },
    commentBodyText: {
        fontSize: 14,
        lineHeight: 20,
    },
    backToTopButtonWrapper: {
        position: 'absolute',
        right: 16,
        zIndex: 50,
    },
    backToTopButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    floatingInputWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 50,
    },
    floatingInputCapsule: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    floatingInputFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 25,
    },
    inputInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 18,
        paddingRight: 6,
        height: 50,
    },
    floatingTextInputField: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        fontWeight: '500',
    },
    floatingSendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
