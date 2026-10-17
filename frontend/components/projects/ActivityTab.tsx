import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    ScrollView,
    Platform,
    Share,
    Alert,
    Clipboard,
} from 'react-native';
import { Host, GlassEffectContainer, HStack, Spacer, frame, cornerRadius, glassEffect } from '@/lib/swiftui';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Project, saveProjectMeta } from '@/lib/api/projects';
import { SwiftUIAddActivitySheet, ActivityLog } from './SwiftUIAddActivitySheet';
import type { DateRangeValue } from './SwiftUIDateRangeSheet';
import { FormaUniversalFileViewer } from '@/components/chat/FormaUniversalFileViewer';
import { FilePreviewItem } from '@/lib/filePreviewStrategy';
import { SwiftUIForwardSheet, ForwardChannel } from '@/components/chat/SwiftUIForwardSheet';
import { DocPagePreview } from '@/components/chat/SwiftUIDocInfoSheet';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { Task, Action } from '@/constants/MockData';
import { getUserAccessibleChannels, sendChatMessage } from '@/lib/api/chat';
import { useTenantContext } from '@/context/TenantContext';
import * as Haptics from 'expo-haptics';

interface ActivityTabProps {
    project: Project;
    isDark: boolean;
    searchQuery?: string;
    activeFilter?: 'all' | 'updates' | 'works' | 'modules';
    dateRange?: DateRangeValue;
    onRefresh?: () => void;
    onOpenAddActivity?: () => void;
    onClearFilters?: () => void;
    onOpenDateRange?: () => void;
    onSelectTab?: (tab: string) => void;
}

export interface ActivityFeedItem extends ActivityLog {
    displayKind?: 'member_update' | 'work_event' | 'module_event';
    sectionDate?: 'Today' | 'Yesterday' | 'Earlier';
    attachment?: {
        name: string;
        size: string;
        type: 'pdf' | 'doc' | 'image';
    };
    secondaryValue?: string;
    commentPreview?: {
        author: string;
        text: string;
    };
    isEdited?: boolean;
    isCreatedByMe?: boolean;
}

export const getWorkItemVisuals = (
    type?: 'milestone' | 'task' | 'action',
    status?: string,
    title?: string,
    activityType?: string
) => {
    const s = (status || '').toLowerCase();
    const t = (title || '').toLowerCase();
    const act = (activityType || '').toLowerCase();

    // 2. MILESTONE
    if (type === 'milestone') {
        const isCompleted = s.includes('complete') || s.includes('done') || s.includes('reached') || t.includes('reached') || t.includes('completed') || t.includes('done');
        const isInProgress = s.includes('progress') || s.includes('active') || t.includes('progress') || t.includes('started');

        if (isCompleted) {
            return {
                label: 'Milestone Completed',
                icon: 'diamond.fill',
                color: '#34C759',
                bg: 'rgba(52, 199, 89, 0.14)',
            };
        }
        if (isInProgress) {
            return {
                label: 'Milestone in Progress',
                icon: 'play.fill',
                color: '#007AFF',
                bg: 'rgba(0, 122, 255, 0.12)',
            };
        }
        return {
            label: 'Milestone Added',
            icon: 'flag.fill',
            color: '#8E8E93',
            bg: 'rgba(142, 142, 147, 0.14)',
        };
    }

    // 3. TASK
    if (type === 'task') {
        const isCompleted = s.includes('complete') || s.includes('done') || t.includes('completed') || t.includes('done');
        const isOverdue = s.includes('overdue') || s.includes('late') || t.includes('overdue') || t.includes('late');
        const isInProgress = s.includes('progress') || s.includes('active') || t.includes('progress');

        if (isCompleted) {
            return {
                label: 'Task Completed',
                icon: 'checkmark.circle.fill',
                color: '#34C759',
                bg: 'rgba(52, 199, 89, 0.14)',
            };
        }
        if (isOverdue) {
            return {
                label: 'Task Overdue',
                icon: 'exclamationmark.triangle.fill',
                color: '#FF3B30',
                bg: 'rgba(255, 59, 48, 0.14)',
            };
        }
        if (isInProgress) {
            return {
                label: 'Task in Progress',
                icon: 'play.fill',
                color: '#007AFF',
                bg: 'rgba(0, 122, 255, 0.12)',
            };
        }
        return {
            label: 'Task Added',
            icon: 'scope',
            color: '#8E8E93',
            bg: 'rgba(142, 142, 147, 0.14)',
        };
    }

    // 4. ACTION
    if (type === 'action') {
        const isCompleted = s.includes('complete') || s.includes('done') || t.includes('completed') || t.includes('done');
        const isInProgress = s.includes('progress') || s.includes('active') || s.includes('pending') || t.includes('progress');

        if (isCompleted) {
            return {
                label: 'Action Completed',
                icon: 'checkmark.circle.fill',
                color: '#34C759',
                bg: 'rgba(52, 199, 89, 0.14)',
            };
        }
        if (isInProgress) {
            return {
                label: 'Action in Progress',
                icon: 'play.fill',
                color: '#007AFF',
                bg: 'rgba(0, 122, 255, 0.12)',
            };
        }
        return {
            label: 'Action Added',
            icon: 'bolt.fill',
            color: '#8E8E93',
            bg: 'rgba(142, 142, 147, 0.14)',
        };
    }

    return {
        label: 'Work Item',
        icon: 'checkmark.circle.fill',
        color: '#007AFF',
        bg: 'rgba(0, 122, 255, 0.12)',
    };
};

export const getModuleTheme = (mod?: string) => {
    switch (mod?.toLowerCase()) {
        case 'finance':
            return { label: 'Finance', icon: 'creditcard.fill', color: '#159957' };
        case 'resources':
            return { label: 'Resources', icon: 'archivebox.fill', color: '#D97A32' };
        case 'people':
            return { label: 'People', icon: 'person.2.fill', color: '#2467B2' };
        case 'clock':
            return { label: 'Clock', icon: 'clock.fill', color: '#0EA5C6' };
        case 'report':
            return { label: 'Reports', icon: 'doc.text.fill', color: '#168C7A' };
        case 'crew':
            return { label: 'Crew', icon: 'person.3.fill', color: '#C0448F' };
        case 'ai':
            return { label: 'Forma AI', icon: 'sparkles', color: '#6847D9' };
        default:
            return { label: 'Module', icon: 'square.grid.2x2.fill', color: '#007AFF' };
    }
};

export const DEFAULT_MOCK_FEED_ITEMS: ActivityFeedItem[] = [];

export const normalizeFeedItem = (item: any): ActivityFeedItem => {
    let displayKind: 'member_update' | 'work_event' | 'module_event' = item.displayKind || 'member_update';
    if (!item.displayKind) {
        if (item.activityType === 'module_linked') {
            displayKind = 'module_event';
        } else if (item.activityType === 'work_related' && !item.images?.length && !item.attachment) {
            displayKind = 'work_event';
        } else {
            displayKind = 'member_update';
        }
    }
    return {
        ...item,
        displayKind,
        sectionDate: item.sectionDate || 'Today',
    };
};

export function ActivityTab({
    project,
    isDark,
    searchQuery = '',
    activeFilter = 'all',
    dateRange,
    onRefresh,
    onOpenAddActivity,
    onClearFilters,
    onOpenDateRange,
    onSelectTab,
}: ActivityTabProps) {
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const compactBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const formaBlue = '#007AFF';

    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [previewItem, setPreviewItem] = useState<FilePreviewItem | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);

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

    useEffect(() => {
        if (project.meta?.activities && Array.isArray(project.meta.activities) && project.meta.activities.length > 0) {
            const userCustomActivities = project.meta.activities
                .filter((a: any) => a.id && !a.id.startsWith('feed-') && !a.id.startsWith('log-'))
                .map(normalizeFeedItem);
            setActivities(userCustomActivities);
        } else {
            setActivities([]);
        }
    }, [project.meta?.activities]);

    const saveActivitiesToDb = async (updated: ActivityFeedItem[]) => {
        setActivities(updated);
        try {
            const nextMeta = {
                ...(project.meta || {}),
                activities: updated,
            };
            await saveProjectMeta(project.id, nextMeta);
            if (onRefresh) onRefresh();
        } catch (e) {
            console.error('Error saving activities:', e);
        }
    };

    const { activeTenant, activeWorkspace, tenantRole } = useTenantContext();
    const [forwardActivityItem, setForwardActivityItem] = useState<ActivityFeedItem | null>(null);
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

    const handleForwardActivityToChannel = async (channel: ForwardChannel) => {
        if (!forwardActivityItem) return;
        const item = forwardActivityItem;
        setForwardActivityItem(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const messageText = `📢 *Forwarded Activity Update* (${project.title || 'Project'}):\n` +
            `${item.authorName} (${item.authorRole || 'Member'})\n` +
            `${item.title ? `*${item.title}*\n` : ''}${item.description || ''}`;

        try {
            await sendChatMessage(channel.id, {
                text: messageText,
                senderName: item.authorName || 'Project Member',
                senderRole: item.authorRole || 'Member',
                workspaceId: activeWorkspace?.id || null,
                tenantId: activeTenant?.id || null,
                media: item.images && item.images.length > 0 ? item.images.map((img, i) => ({ id: `fwd-${i}`, url: img, type: 'image' })) : undefined,
                attachment: item.attachment ? {
                    id: `fwd-att-${Date.now()}`,
                    name: item.attachment.name,
                    size: item.attachment.size,
                    type: item.attachment.type,
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

    const handleLike = (id: string) => {
        Haptics.selectionAsync();
        const updated = activities.map(act => {
            if (act.id === id) {
                const liked = !act.hasLiked;
                return {
                    ...act,
                    hasLiked: liked,
                    likes: liked ? (act.likes || 0) + 1 : Math.max(0, (act.likes || 1) - 1),
                };
            }
            return act;
        });
        saveActivitiesToDb(updated);
    };

    const handleAddComment = (activityId: string, text: string) => {
        const updated = activities.map(act => {
            if (act.id === activityId) {
                const comments = act.comments || [];
                const newComment = {
                    id: `c-${Date.now()}`,
                    author: 'You',
                    text,
                    timestamp: 'Just now',
                };
                return {
                    ...act,
                    comments: [...comments, newComment],
                    commentPreview: {
                        author: 'You',
                        text,
                    },
                };
            }
            return act;
        });

        saveActivitiesToDb(updated);
    };

    const [editingActivity, setEditingActivity] = useState<ActivityFeedItem | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    const handleDeleteActivity = (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const updated = activities.filter(a => a.id !== id);
        saveActivitiesToDb(updated);
    };

    const handleSaveEditedActivity = async (updatedLog: ActivityLog) => {
        const updated = activities.map(a => {
            if (a.id === updatedLog.id) {
                return {
                    ...a,
                    ...updatedLog,
                    isEdited: true,
                };
            }
            return a;
        });
        await saveActivitiesToDb(updated);
        setIsEditSheetOpen(false);
        setEditingActivity(null);
    };

    const handleDownloadMedia = (item: ActivityFeedItem) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const name = item.attachment?.name || item.title || 'media file';
        Alert.alert('Download', `Downloading "${name}" to your device photos/files.`);
    };

    const getCardContextMenuActions = (item: ActivityFeedItem): ContextMenuAction[] => {
        const hasMedia = Boolean((item.images && item.images.length > 0) || item.attachment);
        const isCreatedByMe = Boolean(
            item.isCreatedByMe ||
            item.authorName === 'Rizky Firmansyah' ||
            item.authorName === 'You' ||
            item.authorName === 'Manu Travo'
        );

        const actions: ContextMenuAction[] = [
            {
                title: 'Copy Text',
                systemIcon: 'doc.on.doc',
            },
        ];

        if (hasMedia) {
            const isDoc = Boolean(item.attachment);
            actions.push({
                title: isDoc ? 'Download' : 'Download Media',
                systemIcon: isDoc ? 'arrow.down.to.line' : 'arrow.down.circle',
            });
        }

        // 2. Share Actions
        actions.push(
            {
                title: 'Share to Chat',
                systemIcon: 'paperplane',
            },
            {
                title: 'Share via...',
                systemIcon: 'square.and.arrow.up',
            }
        );

        // 3. Open Linked Work (Milestone / Task / Action / Module)
        if (item.workSource) {
            const workType = item.workSource.type;
            const title = workType === 'milestone' 
                ? 'Open Milestone' 
                : workType === 'action' 
                ? 'Open Action' 
                : 'Open Task';
            const systemIcon = workType === 'milestone' 
                ? 'diamond' 
                : workType === 'action' 
                ? 'bolt' 
                : 'checkmark.circle';

            actions.push({
                title,
                systemIcon,
            });
        } else if (item.moduleSource) {
            const modTheme = getModuleTheme(item.moduleSource.target);
            actions.push({
                title: `Open ${modTheme.label}`,
                systemIcon: modTheme.icon || 'arrow.up.right.square',
            });
        }

        // 4. Edit Post & Delete Post (for own posts)
        if (isCreatedByMe) {
            actions.push({
                title: 'Edit Post',
                systemIcon: 'pencil',
            });
            actions.push({
                title: 'Delete Post',
                systemIcon: 'trash',
                destructive: true,
            });
        }

        return actions;
    };

    const handleCardContextMenuPress = async (action: string, item: ActivityFeedItem) => {
        Haptics.selectionAsync();
        if (action === 'Copy Text') {
            const textToCopy = `${item.title ? `${item.title}\n` : ''}${item.description || ''}`.trim();
            Clipboard.setString(textToCopy);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (action === 'Download' || action === 'Download Media') {
            handleDownloadMedia(item);
        } else if (action === 'Share to Chat') {
            setForwardActivityItem(item);
        } else if (action === 'Share via...' || action.includes('Share via')) {
            try {
                await Share.share({
                    message: `${item.authorName} (${item.authorRole || 'Team'}):\n${item.title ? `*${item.title}*\n` : ''}${item.description}\n\nShared via Forma`,
                    title: item.title || 'Project Activity',
                });
            } catch (err) {
                console.warn('Share error:', err);
            }
        } else if (action.startsWith('Open Milestone') || action.startsWith('Open Task') || action.startsWith('Open Action') || action.startsWith('Open Linked Work')) {
            if (item.workSource) {
                handleOpenWorkItem(item.workSource);
            } else if (onSelectTab) {
                onSelectTab('work');
            } else {
                handleOpenDetail(item);
            }
        } else if (action.startsWith('Open ')) {
            if (item.workSource) {
                handleOpenWorkItem(item.workSource);
            } else if (onSelectTab) {
                onSelectTab('work');
            } else {
                handleOpenDetail(item);
            }
        } else if (action === 'Edit' || action === 'Edit Post') {
            setEditingActivity(item);
            setIsEditSheetOpen(true);
        } else if (action === 'Delete' || action === 'Delete Post') {
            Alert.alert(
                'Delete Post',
                'Are you sure you want to delete this activity post?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDeleteActivity(item.id),
                    },
                ]
            );
        }
    };

    const handleOpenDetail = (item: ActivityFeedItem) => {
        Haptics.selectionAsync();
        router.push({
            pathname: '/project-activity-details/[id]',
            params: {
                id: item.id,
                projectId: project.id,
            },
        });
    };

    const handleOpenMediaPreview = (images: string[], initialIndex: number, item?: ActivityFeedItem) => {
        Haptics.selectionAsync();
        const gallery = images.map((uri, idx) => {
            const isVideo = uri.endsWith('.mp4') || uri.endsWith('.mov') || uri.includes('video');
            return {
                id: `act-media-${idx}`,
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

    // Filter Logic
    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            // 1. Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = a.title?.toLowerCase().includes(q);
                const matchDesc = a.description?.toLowerCase().includes(q);
                const matchAuthor = a.authorName?.toLowerCase().includes(q);
                const matchWork = a.workSource?.title?.toLowerCase().includes(q);
                const matchMod = a.moduleSource?.documentRef?.toLowerCase().includes(q);
                const matchSec = a.secondaryValue?.toLowerCase().includes(q);

                if (!matchTitle && !matchDesc && !matchAuthor && !matchWork && !matchMod && !matchSec) {
                    return false;
                }
            }

            // 2. Type Filter
            if (activeFilter === 'updates' && a.displayKind !== 'member_update' && a.activityType !== 'member_update') return false;
            if (activeFilter === 'works' && a.displayKind !== 'work_event' && a.activityType !== 'work_related') return false;
            if (activeFilter === 'modules' && a.displayKind !== 'module_event' && a.activityType !== 'module_linked') return false;

            // 3. Date Range Filter
            if (dateRange?.startDate && dateRange?.endDate) {
                const start = dateRange.startDate.getTime();
                const end = dateRange.endDate.getTime();
                let actTime = Date.now();
                if (a.timestamp && a.timestamp.includes('-')) {
                    const parsed = new Date(a.timestamp).getTime();
                    if (!isNaN(parsed)) actTime = parsed;
                }
                if (actTime < start || actTime > end) {
                    return false;
                }
            }

            return true;
        });
    }, [activities, searchQuery, activeFilter, dateRange]);

    // Grouping items by sectionDate (Today, Yesterday, Earlier)
    const groupedSections = useMemo(() => {
        const sections: { title: string; data: ActivityFeedItem[] }[] = [];
        const groups: { [key: string]: ActivityFeedItem[] } = {};

        filteredActivities.forEach(item => {
            const sectionKey = item.sectionDate || 'Today';
            if (!groups[sectionKey]) {
                groups[sectionKey] = [];
            }
            groups[sectionKey].push(item);
        });

        const order = ['Today', 'Yesterday', 'Earlier'];
        order.forEach(key => {
            if (groups[key] && groups[key].length > 0) {
                sections.push({ title: key, data: groups[key] });
            }
        });

        // Add any remaining keys
        Object.keys(groups).forEach(key => {
            if (!order.includes(key) && groups[key].length > 0) {
                sections.push({ title: key, data: groups[key] });
            }
        });

        return sections;
    }, [filteredActivities]);

    const hasActiveFilters = Boolean(
        (activeFilter && activeFilter !== 'all') || 
        dateRange?.startDate || 
        searchQuery.trim().length > 0
    );

    // Twitter/X Style Media Grid Layout with Tap to Preview
    const renderTwitterStyleMediaGrid = (images: string[], item?: ActivityFeedItem) => {
        if (!images || images.length === 0) return null;
        const count = Math.min(images.length, 4);

        if (count === 1) {
            return (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleOpenMediaPreview(images, 0, item);
                    }}
                    style={styles.gridSingleWrapper}
                >
                    <Image source={{ uri: images[0] }} style={styles.gridSingleImage} resizeMode="cover" />
                </TouchableOpacity>
            );
        }

        if (count === 2) {
            return (
                <View style={styles.gridTwoColumns}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenMediaPreview(images, 0, item);
                        }}
                        style={{ flex: 1 }}
                    >
                        <Image source={{ uri: images[0] }} style={styles.gridHalfImage} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenMediaPreview(images, 1, item);
                        }}
                        style={{ flex: 1 }}
                    >
                        <Image source={{ uri: images[1] }} style={styles.gridHalfImage} resizeMode="cover" />
                    </TouchableOpacity>
                </View>
            );
        }

        if (count === 3) {
            return (
                <View style={styles.gridThreeLayout}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenMediaPreview(images, 0, item);
                        }}
                        style={{ flex: 1.4 }}
                    >
                        <Image source={{ uri: images[0] }} style={styles.gridThreeLeftImage} resizeMode="cover" />
                    </TouchableOpacity>
                    <View style={styles.gridThreeRightCol}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleOpenMediaPreview(images, 1, item);
                            }}
                            style={{ flex: 1 }}
                        >
                            <Image source={{ uri: images[1] }} style={styles.gridThreeSmallImage} resizeMode="cover" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleOpenMediaPreview(images, 2, item);
                            }}
                            style={{ flex: 1 }}
                        >
                            <Image source={{ uri: images[2] }} style={styles.gridThreeSmallImage} resizeMode="cover" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        // 4 images (2x2 grid)
        return (
            <View style={styles.gridFourLayout}>
                {images.slice(0, 4).map((img, i) => (
                    <TouchableOpacity
                        key={i}
                        activeOpacity={0.9}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenMediaPreview(images, i, item);
                        }}
                        style={styles.gridQuarterWrapper}
                    >
                        <Image source={{ uri: img }} style={styles.gridQuarterImage} resizeMode="cover" />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Active Filter Chips / Status Banner */}
            {hasActiveFilters && (
                <View style={styles.activeFilterBanner}>
                    <View style={styles.activeFilterRow}>
                        <PlatformIcon name="line.3.horizontal.decrease" size={15} tintColor={formaBlue} />
                        <Text style={[styles.activeFilterText, { color: textColor }]}>
                            {searchQuery.trim() ? `Search: "${searchQuery}"` : ''}
                            {activeFilter !== 'all' ? `${searchQuery.trim() ? ' · ' : ''}Type: ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}` : ''}
                            {dateRange?.label ? ` · Date: ${dateRange.label}` : ''}
                        </Text>
                    </View>
                    {onClearFilters && (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                onClearFilters();
                            }}
                            style={[styles.clearFilterBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                        >
                            <Text style={[styles.clearFilterText, { color: textColor }]}>Clear</Text>
                            <Ionicons name="close" size={12} color={textColor} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Empty State */}
            {filteredActivities.length === 0 ? (
                <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                    <PlatformIcon name="bubble.left.and.bubble.right.fill" size={38} tintColor={subtextColor} />
                    <Text style={[styles.emptyTitle, { color: textColor }]}>No Activity Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                        Project updates, work progress, and linked module activity will appear here.
                    </Text>
                    {onOpenAddActivity && (
                        <TouchableOpacity
                            style={styles.emptyCtaButton}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onOpenAddActivity();
                            }}
                        >
                            <Text style={styles.emptyCtaText}>Post Update</Text>
                        </TouchableOpacity>
                    )}
                </GlassView>
            ) : (
                <View style={styles.sectionsContainer}>
                    {groupedSections.map((section) => (
                        <View key={section.title} style={styles.sectionBlock}>
                            {/* Section Header - Floating Pill Badge with Native Liquid GlassEffect */}
                            <View style={styles.dateSeparatorContainer}>
                                <View style={styles.dateSeparatorPill}>
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <GlassEffectContainer modifiers={[
                                                frame({ height: 28 }),
                                                cornerRadius(14),
                                                glassEffect({ shape: 'capsule' })
                                            ]}>
                                                <HStack alignment="center" modifiers={[frame({ height: 28 })]}>
                                                    <Spacer />
                                                </HStack>
                                            </GlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderRadius: 14 }]} />
                                    )}
                                    <View style={styles.dateSeparatorInner}>
                                        <Text style={[styles.dateSeparatorText, { color: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)' }]}>
                                            {section.title}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.sectionItemsList}>
                                {section.data.map((item) => {
                                    const isWorkEvent = item.displayKind === 'work_event';
                                    const isModuleEvent = item.displayKind === 'module_event';
                                    const isMemberUpdate = !isWorkEvent && !isModuleEvent;

                                    // --- 1. MEMBER UPDATE (Large Social Card) ---
                                    if (isMemberUpdate) {
                                        const workVisuals = item.workSource 
                                            ? getWorkItemVisuals(item.workSource.type, item.workSource.status, item.workSource.title, item.activityType) 
                                            : null;

                                        return (
                                            <View key={item.id}>
                                                <ContextMenu
                                                    actions={getCardContextMenuActions(item)}
                                                    onPress={(e) => handleCardContextMenuPress(e.nativeEvent.name, item)}
                                                    previewBackgroundColor="transparent"
                                                    style={{ borderRadius: 20 }}
                                                >
                                                    <TouchableOpacity
                                                        activeOpacity={0.85}
                                                        onPress={() => handleOpenDetail(item)}
                                                    >
                                                        <GlassView
                                                            intensity={isDark ? 25 : 60}
                                                            tint={isDark ? 'dark' : 'light'}
                                                            style={[styles.memberCard, { backgroundColor: cardBgColor, borderRadius: 20 }]}
                                                        >
                                                            {/* Header: Avatar, Name, Role · Timestamp */}
                                                            <View style={styles.cardHeader}>
                                                                <View style={[styles.avatarCircle, { backgroundColor: workVisuals ? workVisuals.color : formaBlue }]}>
                                                                    <Text style={styles.avatarInitials}>
                                                                        {item.authorName ? item.authorName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U'}
                                                                    </Text>
                                                                </View>

                                                                <View style={styles.authorDetails}>
                                                                    <Text style={[styles.authorName, { color: textColor }]}>
                                                                        {item.authorName}
                                                                    </Text>
                                                                    <Text style={[styles.authorRole, { color: subtextColor }]}>
                                                                        {item.authorRole || 'Project Member'} · {item.timestamp}
                                                                        {item.isEdited && (
                                                                            <Text style={{ fontStyle: 'italic', opacity: 0.85 }}> · (edited)</Text>
                                                                        )}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            {/* Optional Title */}
                                                            {Boolean(item.title) && (
                                                                <Text style={[styles.cardTitleText, { color: textColor }]}>
                                                                    {item.title}
                                                                </Text>
                                                            )}

                                                            {/* Body / Caption */}
                                                            <Text style={[styles.cardCaptionText, { color: textColor }]}>
                                                                {item.description}
                                                            </Text>

                                                            {/* Media Grid (Twitter/X style max 4 with tap to preview) */}
                                                            {item.images && item.images.length > 0 && renderTwitterStyleMediaGrid(item.images, item)}

                                                            {/* Attachment Card with DocPagePreview */}
                                                            {item.attachment && (
                                                                <TouchableOpacity
                                                                    activeOpacity={0.85}
                                                                    onPress={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenAttachment(item.attachment, item);
                                                                    }}
                                                                    style={[styles.attachmentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
                                                                >
                                                                    <DocPagePreview fileName={item.attachment.name} isDark={isDark} />
                                                                    <View style={{ flex: 1, marginRight: 8 }}>
                                                                        <Text style={[styles.attachmentName, { color: textColor }]} numberOfLines={1} ellipsizeMode="middle">
                                                                            {item.attachment.name}
                                                                        </Text>
                                                                        <Text style={[styles.attachmentSize, { color: subtextColor }]}>
                                                                            {item.attachment.size || 'Document'} • {item.timestamp}
                                                                        </Text>
                                                                    </View>
                                                                    <PlatformIcon name="arrow.down.circle" size={20} tintColor={subtextColor} />
                                                                </TouchableOpacity>
                                                            )}

                                                            {/* Compact Linked-Work Chip below Media (Clickable to open Drawer) */}
                                                            {item.workSource && workVisuals && (
                                                                <TouchableOpacity
                                                                    activeOpacity={0.75}
                                                                    onPress={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenWorkItem(item.workSource);
                                                                    }}
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
                                                                        {workVisuals.label} · {item.workSource.title}
                                                                    </Text>
                                                                    <PlatformIcon
                                                                        name="chevron.right"
                                                                        size={11}
                                                                        tintColor={workVisuals.color}
                                                                    />
                                                                </TouchableOpacity>
                                                            )}

                                                            {/* Footer Stats Row: Likes, Comments, Send/Share (SF Pro Icons) */}
                                                            <View style={styles.cardFooterStats}>
                                                                <TouchableOpacity
                                                                    style={styles.statCounter}
                                                                    onPress={() => handleLike(item.id)}
                                                                >
                                                                    <PlatformIcon
                                                                        name={item.hasLiked ? 'heart.fill' : 'heart'}
                                                                        size={17}
                                                                        tintColor={item.hasLiked ? '#FF3B30' : subtextColor}
                                                                    />
                                                                    <Text style={[styles.statNumber, { color: item.hasLiked ? '#FF3B30' : subtextColor }]}>
                                                                        {item.likes || 0}
                                                                    </Text>
                                                                </TouchableOpacity>

                                                                <TouchableOpacity
                                                                    style={styles.statCounter}
                                                                    onPress={() => handleOpenDetail(item)}
                                                                >
                                                                    <PlatformIcon
                                                                        name="bubble.left"
                                                                        size={16}
                                                                        tintColor={subtextColor}
                                                                    />
                                                                    <Text style={[styles.statNumber, { color: subtextColor }]}>
                                                                        {item.comments?.length || 0}
                                                                    </Text>
                                                                </TouchableOpacity>

                                                                <ContextMenu
                                                                    actions={[
                                                                        { title: 'Share to Chat', systemIcon: 'bubble.left.and.bubble.right' },
                                                                        { title: 'Copy Text', systemIcon: 'doc.on.doc' },
                                                                        { title: 'Share via...', systemIcon: 'square.and.arrow.up' },
                                                                    ]}
                                                                    dropdownMenuMode={true}
                                                                    onPress={(e) => {
                                                                        Haptics.selectionAsync();
                                                                        const action = e.nativeEvent.name;
                                                                        if (action === 'Share to Chat') {
                                                                            setForwardActivityItem(item);
                                                                        } else if (action === 'Copy Text') {
                                                                            const textToCopy = `${item.title ? `${item.title}\n` : ''}${item.description || ''}`.trim();
                                                                            Clipboard.setString(textToCopy);
                                                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                                        } else if (action === 'Share via...' || action.includes('Share')) {
                                                                            try {
                                                                                Share.share({
                                                                                    message: `${item.authorName} (${item.authorRole || 'Team'}):\n${item.title ? `*${item.title}*\n` : ''}${item.description}\n\nShared via Forma`,
                                                                                    title: item.title || 'Project Activity',
                                                                                });
                                                                            } catch (err) {
                                                                                console.warn('Share error:', err);
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <TouchableOpacity
                                                                        style={styles.statCounter}
                                                                        activeOpacity={0.7}
                                                                    >
                                                                        <PlatformIcon
                                                                            name="paperplane"
                                                                            size={16}
                                                                            tintColor={subtextColor}
                                                                        />
                                                                    </TouchableOpacity>
                                                                </ContextMenu>
                                                            </View>

                                                            {/* Optional One-Comment Preview */}
                                                            {item.commentPreview && (
                                                                <View style={[styles.oneCommentPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                                                                    <Text style={[styles.commentPreviewAuthor, { color: textColor }]}>
                                                                        {item.commentPreview.author}:{' '}
                                                                        <Text style={[styles.commentPreviewText, { color: subtextColor }]}>
                                                                            {item.commentPreview.text}
                                                                        </Text>
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                </ContextMenu>
                                            </View>
                                        );
                                    }

                                    // --- 2. WORK ACTIVITY (Compact Chronological System/Work Row - Borderless) ---
                                    if (isWorkEvent) {
                                        const workVisuals = getWorkItemVisuals(
                                            item.workSource?.type, 
                                            item.workSource?.status, 
                                            item.title || item.workSource?.title, 
                                            item.activityType
                                        );

                                        return (
                                            <View key={item.id}>
                                                <ContextMenu
                                                    actions={getCardContextMenuActions(item)}
                                                    onPress={(e) => handleCardContextMenuPress(e.nativeEvent.name, item)}
                                                    previewBackgroundColor="transparent"
                                                    style={{ borderRadius: 20 }}
                                                >
                                                    <TouchableOpacity
                                                        activeOpacity={0.85}
                                                        onPress={() => {
                                                            if (item.workSource) {
                                                                handleOpenWorkItem(item.workSource);
                                                            } else {
                                                                handleOpenDetail(item);
                                                            }
                                                        }}
                                                    >
                                                        <GlassView
                                                            intensity={isDark ? 25 : 60}
                                                            tint={isDark ? 'dark' : 'light'}
                                                            style={[styles.compactEventRow, { backgroundColor: compactBgColor, borderRadius: 20 }]}
                                                        >
                                                            <View style={[
                                                                styles.eventIconCircle,
                                                                {
                                                                    backgroundColor: isDark ? `${workVisuals.color}25` : `${workVisuals.color}15`
                                                                }
                                                            ]}>
                                                                <PlatformIcon
                                                                    name={workVisuals.icon}
                                                                    size={18}
                                                                    tintColor={workVisuals.color}
                                                                />
                                                            </View>

                                                            <View style={styles.eventTextColumn}>
                                                                <Text style={[styles.eventTitle, { color: textColor }]} numberOfLines={2}>
                                                                    {item.workSource?.title || item.title}
                                                                </Text>
                                                                <Text style={[styles.eventMetadata, { color: subtextColor }]} numberOfLines={1}>
                                                                    {item.authorName} · {item.timestamp}
                                                                    {item.isEdited && ' · (edited)'}
                                                                </Text>
                                                            </View>

                                                            {Boolean(item.secondaryValue) && (
                                                                <Text style={[
                                                                    styles.eventSecondaryValue,
                                                                    { color: workVisuals.color }
                                                                ]} numberOfLines={1}>
                                                                    {item.secondaryValue}
                                                                </Text>
                                                            )}

                                                            <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                </ContextMenu>
                                            </View>
                                        );
                                    }

                                    // --- 3. MODULE ACTIVITY (Compact Chronological System Row - Borderless) ---
                                    if (isModuleEvent) {
                                        const modTheme = getModuleTheme(item.moduleSource?.target || item.moduleSource?.module);

                                        return (
                                            <View key={item.id}>
                                                <ContextMenu
                                                    actions={getCardContextMenuActions(item)}
                                                    onPress={(e) => handleCardContextMenuPress(e.nativeEvent.name, item)}
                                                    previewBackgroundColor="transparent"
                                                    style={{ borderRadius: 20 }}
                                                >
                                                    <TouchableOpacity
                                                        activeOpacity={0.85}
                                                        onPress={() => handleOpenDetail(item)}
                                                    >
                                                        <GlassView
                                                            intensity={isDark ? 25 : 60}
                                                            tint={isDark ? 'dark' : 'light'}
                                                            style={[styles.compactEventRow, { backgroundColor: compactBgColor, borderRadius: 20 }]}
                                                        >
                                                            <View style={[
                                                                styles.eventIconCircle,
                                                                {
                                                                    backgroundColor: isDark ? `${modTheme.color}25` : `${modTheme.color}15`
                                                                }
                                                            ]}>
                                                                <PlatformIcon
                                                                    name={modTheme.icon}
                                                                    size={18}
                                                                    tintColor={modTheme.color}
                                                                />
                                                            </View>

                                                            <View style={styles.eventTextColumn}>
                                                                <Text style={[styles.eventTitle, { color: textColor }]} numberOfLines={2}>
                                                                    {item.title || item.description}
                                                                </Text>
                                                                <Text style={[styles.eventMetadata, { color: subtextColor }]} numberOfLines={1}>
                                                                    {modTheme.label} · {item.timestamp}
                                                                    {item.isEdited && ' · (edited)'}
                                                                </Text>
                                                            </View>

                                                            {Boolean(item.secondaryValue) && (
                                                                <Text style={[styles.eventSecondaryValue, { color: textColor }]} numberOfLines={1}>
                                                                    {item.secondaryValue}
                                                                </Text>
                                                            )}

                                                            <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                </ContextMenu>
                                            </View>
                                        );
                                    }

                                    return null;
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Bottom spacer for floating bottom toolbar */}
            <View style={{ height: 100 }} />

            {/* Global Forma Universal File & Media Viewer */}
            <FormaUniversalFileViewer
                visible={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
                isDark={isDark}
            />

            {/* Native SwiftUI Liquid Glass Forward Sheet */}
            <SwiftUIForwardSheet
                visible={!!forwardActivityItem}
                onClose={() => setForwardActivityItem(null)}
                messageCount={1}
                channels={accessibleForwardChannels}
                onForwardToChannel={handleForwardActivityToChannel}
                isDark={isDark}
            />

            {/* Edit Activity Sheet */}
            <SwiftUIAddActivitySheet
                isOpened={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingActivity(null);
                }}
                initialActivity={editingActivity}
                onSave={async (updatedLog) => {
                    await handleSaveEditedActivity(updatedLog);
                }}
                defaultProjectId={project?.id}
            />

            {/* Native Task Detail Sheet */}
            <SwiftUITaskDetailSheet
                isOpened={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                onTaskUpdated={() => {
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Native Action Detail Sheet */}
            <SwiftUIActionDetailSheet
                isOpened={!!selectedAction}
                onClose={() => setSelectedAction(null)}
                action={selectedAction}
                onStatusChange={() => {
                    if (onRefresh) onRefresh();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    activeFilterBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        marginBottom: 4,
    },
    activeFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    activeFilterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    clearFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    clearFilterText: {
        fontSize: 11,
        fontWeight: '600',
    },
    sectionsContainer: {
        gap: 20,
    },
    sectionBlock: {
        gap: 12,
    },
    dateSeparatorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 6,
    },
    dateSeparatorPill: {
        height: 28,
        minWidth: 70,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateSeparatorInner: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateSeparatorText: {
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 4,
    },
    sectionItemsList: {
        gap: 12,
    },
    contextMenuWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    contextMenuCompactWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardTouchable: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    memberCard: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    authorDetails: {
        flex: 1,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '700',
    },
    authorRole: {
        fontSize: 12,
        marginTop: 1,
    },
    cardTitleText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
        marginBottom: 6,
    },
    cardCaptionText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
        opacity: 0.9,
    },
    // Twitter/X Media Layout Styles
    gridSingleWrapper: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    gridSingleImage: {
        width: '100%',
        height: '100%',
    },
    gridTwoColumns: {
        flexDirection: 'row',
        gap: 8,
        height: 180,
        marginBottom: 12,
    },
    gridHalfImage: {
        flex: 1,
        height: '100%',
        borderRadius: 14,
    },
    gridThreeLayout: {
        flexDirection: 'row',
        gap: 8,
        height: 200,
        marginBottom: 12,
    },
    gridThreeLeftImage: {
        flex: 1.4,
        height: '100%',
        borderRadius: 14,
    },
    gridThreeRightCol: {
        flex: 1,
        gap: 8,
    },
    gridThreeSmallImage: {
        flex: 1,
        width: '100%',
        borderRadius: 12,
    },
    gridFourLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    gridQuarterWrapper: {
        width: '48.5%',
        height: 110,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gridQuarterImage: {
        width: '100%',
        height: '100%',
    },
    // Attachment Document Card
    attachmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    attachmentName: {
        fontSize: 13,
        fontWeight: '600',
    },
    attachmentSize: {
        fontSize: 11,
        marginTop: 2,
    },
    // Linked Work Chip
    linkedWorkChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        marginBottom: 12,
    },
    linkedWorkChipText: {
        fontSize: 12,
        fontWeight: '600',
        flexShrink: 1,
        flexWrap: 'wrap',
        lineHeight: 16,
    },
    // Footer Stats (Icon Only + Number)
    cardFooterStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        paddingTop: 4,
    },
    statCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statNumber: {
        fontSize: 13,
        fontWeight: '600',
    },
    oneCommentPreview: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    commentPreviewAuthor: {
        fontSize: 12,
        fontWeight: '700',
    },
    commentPreviewText: {
        fontSize: 12,
        fontWeight: '400',
    },
    // Compact Event Row Styles (Work & Module events)
    compactEventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
        overflow: 'hidden',
    },
    eventIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventTextColumn: {
        flex: 1,
        gap: 2,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 19,
    },
    eventMetadata: {
        fontSize: 12,
        lineHeight: 16,
    },
    eventSecondaryValue: {
        fontSize: 13,
        fontWeight: '700',
        maxWidth: '40%',
        textAlign: 'right',
    },
    // Empty State Card
    emptyCard: {
        borderRadius: 20,
        padding: 36,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    emptyCtaButton: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#007AFF',
    },
    emptyCtaText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
