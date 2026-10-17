import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    Image,
    Platform,
    Alert,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { GlassView } from '@/components/ui/GlassView';
import { PillButton } from '@/components/ui/PillButton';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Action, Task, TASKS } from '@/constants/MockData';
import { getTasks, getTaskComments, addTaskCommentApi, deleteActionApi } from '@/lib/api/tasks';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { PeopleActionWorkSurface } from '@/components/people/actions/PeopleActionWorkSurface';

const formatCardDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    if (!dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return dateStr;
    
    const currentYear = new Date().getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monthIndex] || '';
    
    if (year === currentYear) {
        return `${day} ${month}`;
    } else {
        return `${day} ${month} ${year}`;
    }
};

export interface SwiftUIActionDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    action: Action | null;
    onStatusChange: (
        id: string,
        nextStatus: Action['status'],
        actionTypeOverride?: 'approve' | 'reject' | 'revision' | 'dispute' | 'confirm',
        newAmount?: number
    ) => void;
    setActionsList: React.Dispatch<React.SetStateAction<Action[]>>;
    isEmbedded?: boolean;
}

export const SwiftUIActionDetailSheet: React.FC<SwiftUIActionDetailSheetProps> = ({
    isOpened,
    onClose,
    action,
    onStatusChange,
    setActionsList,
    isEmbedded = false,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#6e6e73';

    const [messageText, setMessageText] = useState('');
    const [pendingActionType, setPendingActionType] = useState<'revision' | 'reject' | null>(null);
    const [isAdjustingAmount, setIsAdjustingAmount] = useState(false);
    const [adjustedAmount, setAdjustedAmount] = useState('0');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [actionComments, setActionComments] = useState<any[]>([]);

    // Document Preview and Download States
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState('Document Preview');
    const [isDownloading, setIsDownloading] = useState(false);

    const isPreviewable = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'pdf'].includes(ext || '');
    };

    const getMimeType = (ext: string) => {
        switch (ext) {
            case 'pdf': return 'application/pdf';
            case 'doc': return 'application/msword';
            case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'xls': return 'application/vnd.ms-excel';
            case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'png': return 'image/png';
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'webp': return 'image/webp';
            case 'gif': return 'image/gif';
            default: return 'application/octet-stream';
        }
    };

    const handleDownloadFileDirect = async (url: string) => {
        if (!url) return;
        setIsDownloading(true);
        try {
            const cleanUrl = url.split('?')[0];
            const originalFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'document.bin';
            const filename = decodeURIComponent(originalFilename).replace(/\s+/g, '_');
            const extension = filename.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension);

            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(url, localUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file, server responded with status: ${downloadResult.status}`);
            }

            if (isImage) {
                const { status } = await MediaLibrary.requestPermissionsAsync(true);
                if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                    Alert.alert('Success', 'Image successfully saved to photo gallery!');
                } else {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri);
                    } else {
                        Alert.alert('Permission Denied', 'Media Library permission is required to save photos.');
                    }
                }
            } else {
                if (Platform.OS === 'android') {
                    try {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                        if (permissions.granted) {
                            const mimeType = getMimeType(extension);
                            const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                permissions.directoryUri,
                                filename,
                                mimeType
                            );
                            const fileContent = await FileSystem.readAsStringAsync(downloadResult.uri, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            await FileSystem.writeAsStringAsync(destinationUri, fileContent, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            Alert.alert('Success', 'File successfully saved!');
                        } else {
                            if (await Sharing.isAvailableAsync()) {
                                  await Sharing.shareAsync(downloadResult.uri);
                            }
                        }
                    } catch (safError) {
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(downloadResult.uri);
                        } else {
                            Alert.alert('Error', 'Unable to save or share the file.');
                        }
                    }
                } else {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri);
                    } else {
                        Alert.alert('Error', 'Sharing is not available on this device.');
                    }
                }
            }
        } catch (error: any) {
            console.error("Download error:", error);
            Alert.alert('Download Error', error.message || 'Failed to download document.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleViewPress = (url: string, name: string) => {
        if (isPreviewable(name)) {
            setActiveDocTitle(name);
            setActiveDocUrl(url);
        } else {
            Alert.alert(
                'Direct Download',
                `Format file ini tidak didukung untuk preview. Apakah Anda ingin langsung mengunduh ${name}?`,
                [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Unduh', onPress: () => handleDownloadFileDirect(url) }
                ]
            );
        }
    };

    const chatScrollViewRef = useRef<ScrollView>(null);
    const chatInputRef = useRef<TextInput>(null);

    const [relatedTask, setRelatedTask] = useState<Task | null>(null);

    const originalAttachments = useMemo(() => {
        if (!action) return [];
        if (relatedTask) {
            return relatedTask.attachments || [];
        }
        return action.attachments || [];
    }, [action, relatedTask]);

    useEffect(() => {
        if (isOpened && action) {
            setMessageText('');
            setPendingActionType(null);
            setIsAdjustingAmount(false);
            setIsHistoryExpanded(false);
            setActiveDocUrl(null);
            if (action.details?.amount !== undefined) {
                setAdjustedAmount(action.details.amount.toString());
            }

            if (action.relatedTaskId) {
                getTasks().then(tasks => {
                    const found = tasks.find(t => t.id === action.relatedTaskId);
                    setRelatedTask(found || null);
                }).catch(err => {
                    console.error("Error fetching related task:", err);
                    setRelatedTask(null);
                });

                getTaskComments(action.relatedTaskId).then(comments => {
                    setActionComments(comments);
                }).catch(err => {
                    console.error("Error fetching task comments:", err);
                    setActionComments([]);
                });
            } else {
                setRelatedTask(null);
                setActionComments(action.comments || []);
            }
        } else {
            setRelatedTask(null);
            setActionComments([]);
        }
    }, [isOpened, action]);

    if (!action) return null;

    const handleSendMessage = () => {
        if (!messageText.trim()) return;

        const text = messageText.trim();
        setMessageText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (action.relatedTaskId) {
            addTaskCommentApi(action.relatedTaskId, text).then(newComment => {
                if (newComment) {
                    setActionComments(prev => [...prev, newComment]);
                }
            }).catch(err => {
                console.error("Error adding task comment:", err);
            });
        } else {
            const newMessage = {
                id: Date.now().toString(),
                author: 'Manu Travo',
                text,
                timestamp: new Date().toISOString(),
                role: 'staff' as const
            };

            const updatedAction = {
                ...action,
                comments: [...(action.comments || []), newMessage]
            };

            setActionsList(prev => prev.map(a => a.id === action.id ? updatedAction : a));
            setActionComments(prev => [...prev, newMessage]);
        }

        // Chain the pending action completion
        if (pendingActionType) {
            const finalStatus = pendingActionType === 'revision' ? 'revision' : (pendingActionType === 'reject' ? 'rejected' : 'completed');
            onStatusChange(action.id, finalStatus, pendingActionType);
            setPendingActionType(null);
            setTimeout(() => onClose(), 800);
        }

        // Scroll to bottom after state update
        setTimeout(() => {
            chatScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleDelete = () => {
        const doDelete = async () => {
            try {
                const success = await deleteActionApi(action.id);
                if (success) {
                    setActionsList(prev => prev.filter(a => a.id !== action.id));
                    onClose();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('Failed to delete action.');
                    } else {
                        Alert.alert('Error', 'Failed to delete action.');
                    }
                }
            } catch (err) {
                console.error('Delete action error:', err);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this action?')) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Delete Action',
                'Are you sure you want to delete this action?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: doDelete,
                    }
                ]
            );
        }
    };

    const handleLinkNavigation = () => {
        const targetModule = action.module;
        let routePath = '';

        onClose();

        if (targetModule === 'finance') {
            const reqId = action.relatedTaskId?.startsWith('req-') ? action.relatedTaskId : undefined;
            if (reqId) {
                routePath = `/(tabs)/home/finance?requestId=${reqId}&requestType=purchasing`;
            } else {
                routePath = `/(tabs)/home/finance`;
            }
        } else if (targetModule === 'tracking') {
            routePath = `/(tabs)/home/activity`;
        } else if (targetModule === 'people') {
            routePath = `/(tabs)/home/people`;
        } else if (targetModule === 'clock') {
            routePath = `/(tabs)/home/clock-module`;
        } else if (targetModule === 'crew') {
            routePath = `/(tabs)/home/crew-module`;
        }

        if (routePath) {
            router.push(routePath as any);
        }
    };

    const hexToRgba = (hex: string, opacity: number) => {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${opacity})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent': return isDark ? '#FF453A' : '#FF3B30';
            case 'high': return isDark ? '#FF9F0A' : '#FF9500';
            case 'medium':
            case 'low':
            default: return isDark ? '#98989D' : '#8E8E93';
        }
    };

    const getStatusStyles = (s: Action['status']) => {
        switch (s) {
            case 'urgent': return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Urgent' };
            case 'pending': return { color: isDark ? '#0A84FF' : '#007AFF', label: 'Pending' };
            case 'completed': return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
            case 'revision': return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
            case 'rejected': return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Rejected' };
            default: return { color: isDark ? '#98989D' : '#8E8E93', label: 'Unknown' };
        }
    };

    const getModuleLabel = (module: Action['module']) => {
        switch (module) {
            case 'finance': return 'Finance';
            case 'tracking': return 'Tracking';
            case 'people': return 'People';
            case 'clock': return 'Clock';
            case 'crew': return 'Crew';
            default: return 'Other';
        }
    };

    const getModuleBadgeInfo = (module: Action['module']) => {
        switch (module) {
            case 'finance': return { label: 'FIN', color: '#FF2D55', icon: 'creditcard.fill' };
            case 'resources': return { label: 'RES', color: '#F08C45', icon: 'archivebox.fill' };
            case 'people': return { label: 'PEO', color: '#10B981', icon: 'person.2.fill' };
            case 'clock': return { label: 'CLK', color: '#0284C7', icon: 'clock.fill' };
            case 'report': return { label: 'RPT', color: '#14B8A6', icon: 'doc.text.fill' };
            case 'crew': return { label: 'CREW', color: '#8B5CF6', icon: 'person.3.fill' };
            case 'project': return { label: 'PRJ', color: '#0036F8', icon: 'folder.fill' };
            case 'forma_ai': return { label: 'AI', color: '#6366F1', icon: 'sparkles' };
            case 'tracking': return { label: 'TRK', color: '#64748B', icon: 'target' };
            default: return { label: 'OTH', color: '#8E8E93', icon: 'bolt.fill' };
        }
    };

    const renderModuleDetails = () => {
        if (!action.details) return null;

        const { details, module } = action;

        return (
            <View style={[styles.moduleDetailsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                {module === 'finance' && details.amount !== undefined && (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                                <Text style={{ fontSize: 13, color: subtextColor, marginBottom: 4 }}>Total Amount</Text>
                                <Text style={{ fontSize: 24, fontWeight: '800', color: textColor }}>
                                    {details.currency || 'IDR'} {details.amount.toLocaleString()}
                                </Text>
                            </View>
                            {!!details.invoiceUrl && (
                                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="document-text" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {details.spendingItems && details.spendingItems.length > 0 && (
                            <View style={{ marginTop: 8, gap: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }}>Itemized Request</Text>
                                {details.spendingItems.map((item, idx) => (
                                    <View key={item.id || idx.toString()} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: idx < details.spendingItems!.length - 1 ? 0.5 : 0, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                        <Text style={{ fontSize: 14, color: subtextColor, flex: 1 }}>{item.name}</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                            {item.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {module === 'clock' && !!details.clockIn && (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 12 }}>
                                <Text style={{ fontSize: 12, color: subtextColor, marginBottom: 4 }}>Clock In</Text>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>{details.clockIn}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 12 }}>
                                <Text style={{ fontSize: 12, color: subtextColor, marginBottom: 4 }}>Clock Out</Text>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>{details.clockOut}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 14, color: subtextColor }}>Total / Overtime</Text>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                                {details.totalHours}h <Text style={{ color: '#FF9F0A' }}>({details.overtimeHours}h OT)</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {(module === 'people' || action.sourceInfo?.module === 'people') && (
                    <PeopleActionWorkSurface
                        action={action}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        onActionCompleted={() => {
                            onStatusChange(action.id, 'completed', 'confirm');
                            onClose();
                        }}
                    />
                )}

                {details.photoUrls && details.photoUrls.length > 0 && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: textColor, marginBottom: 12 }}>Proof Attachment</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {details.photoUrls.map((url, idx) => (
                                <TouchableOpacity key={idx} onPress={() => handleViewPress(url, `Proof_${idx + 1}.jpg`)} style={{ width: 200, height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
                                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    const getTaskStatusStyles = (s: string) => {
        switch (s) {
            case 'in_progress': return { color: isDark ? '#B5B3FF' : '#5856D6', label: 'In Progress' };
            case 'submitted': return { color: isDark ? '#32ADE6' : '#007AFF', label: 'Submitted' };
            case 'revision': return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
            case 'done': return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
            default: return { color: isDark ? '#98989D' : '#8E8E93', label: 'To-Do' };
        }
    };

    const priorityColor = getPriorityColor(relatedTask ? relatedTask.priority : action.priority);
    const statusStyle = relatedTask ? getTaskStatusStyles(relatedTask.status) : getStatusStyles(action.status);
    const currentActionType = (action.actionType || (['review', 'approval', 'dispute', 'confirmation'].includes(action.type) ? action.type : undefined)) as any;

    if (!isOpened || !action) return null;

    const renderDocumentViewer = () => {
        if (!activeDocUrl) return null;
        return (
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 99999, elevation: 99999 }]}>
                <View style={styles.viewerOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setActiveDocUrl(null)}
                    />
                    <View style={styles.viewerContainer}>
                        <Image
                            source={{ uri: activeDocUrl }}
                            style={styles.viewerImage}
                            resizeMode="contain"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.viewerCloseBtn}
                        onPress={() => setActiveDocUrl(null)}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.viewerDownloadBtn}
                        onPress={() => handleDownloadFileDirect(activeDocUrl)}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="download-outline" size={20} color="#FFF" />
                        )}
                        <Text style={styles.viewerDownloadBtnText}>
                            {isDownloading ? 'Downloading...' : 'Download File'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderInnerContent = () => (
        <View style={isEmbedded ? [styles.embeddedContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : { flexShrink: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 22 : 24 }}>
            {/* Header */}
            <View style={[styles.modalHeader, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={isEmbedded ? 2 : undefined}>{action.title}</Text>
                <HeaderCircleButton
                    type="close"
                    onPress={onClose}
                    isDark={isDark}
                    size={32}
                />
            </View>

            <ScrollView
                ref={chatScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: isEmbedded ? 48 : 24, paddingHorizontal: isEmbedded ? 24 : 0, paddingTop: isEmbedded ? 16 : 0, maxWidth: isEmbedded ? 840 : undefined, width: '100%', alignSelf: 'center' }}
            >
                            {/* Meta Info */}
                            <View style={styles.modalInfoCard}>
                                {relatedTask ? (
                                    <>
                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Project</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[styles.projectBadgeText, { color: textColor, fontSize: 13 }]}>
                                                        {relatedTask.projectCode}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                    {relatedTask.project}
                                                </Text>
                                            </View>
                                        </View>

                                        {!!relatedTask.wbs && (
                                            <View style={styles.modalInfoRow}>
                                                <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>WBS</Text>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                                    {relatedTask.wbs}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Deadline</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                                    {`${formatCardDate(relatedTask.dueDate)}${relatedTask.dueTime ? ` @ ${relatedTask.dueTime}` : ''}`}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Priority</Text>
                                            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                                                <View style={[StyleSheet.absoluteFill, { backgroundColor: getPriorityColor(relatedTask.priority) + 'A6' }]} />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                                                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                                                         {((relatedTask.priority || 'medium').charAt(0).toUpperCase() + (relatedTask.priority || 'medium').slice(1))}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={[styles.modalInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Status</Text>
                                            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                                                <View style={[StyleSheet.absoluteFill, { backgroundColor: getTaskStatusStyles(relatedTask.status).color + 'A6' }]} />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{getTaskStatusStyles(relatedTask.status).label}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Project</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[styles.projectBadgeText, { color: textColor, fontSize: 13 }]}>
                                                        {action.projectCode || 'GEN'}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                    {action.project || 'General Module'}
                                                </Text>
                                            </View>
                                        </View>

                                        {!!action.wbs && (
                                            <View style={styles.modalInfoRow}>
                                                <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>WBS</Text>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                                    {action.wbs}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Deadline</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                                    {formatCardDate(action.date || '')}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Priority</Text>
                                            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                                                <View style={[StyleSheet.absoluteFill, { backgroundColor: getPriorityColor(action.priority || 'medium') + 'A6' }]} />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                                                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                                                         {((action.priority || 'medium').charAt(0).toUpperCase() + (action.priority || 'medium').slice(1))}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Status</Text>
                                            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                                                <View style={[StyleSheet.absoluteFill, { backgroundColor: getStatusStyles(action.status).color + 'A6' }]} />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{getStatusStyles(action.status).label}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={[styles.modalInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                            <Text style={[styles.modalInfoLabel, { color: subtextColor }]}>Module</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <PlatformIcon name={getModuleBadgeInfo(action.module).icon as any} size={16} tintColor={textColor} />
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }}>{getModuleLabel(action.module)}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Module Details */}
                            {!relatedTask && renderModuleDetails()}

                            {/* Description */}
                            {!!(relatedTask ? relatedTask.description : action.description) && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Description</Text>
                                    <Text style={{ color: isDark ? 'rgba(255,255,255,0.85)' : subtextColor, fontSize: 14, lineHeight: 22 }}>
                                        {relatedTask ? relatedTask.description : action.description}
                                    </Text>

                                    {!relatedTask && !!action.proofUrl && (
                                        <TouchableOpacity
                                            onPress={handleLinkNavigation}
                                            style={styles.proofLinkButton}
                                        >
                                            <Ionicons name="link" size={14} color="#007AFF" style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>{action.proofLabel || 'View Proof'}</Text>
                                            <Ionicons name="chevron-forward" size={12} color="#007AFF" style={{ marginLeft: 4 }} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Subtasks */}
                            {relatedTask?.subtasks && relatedTask.subtasks.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                                        Subtasks ({relatedTask.subtasks.filter(s => s.isDone).length}/{relatedTask.subtasks.length})
                                    </Text>
                                    <View style={styles.modalSubtaskList}>
                                        {relatedTask.subtasks.map(sub => (
                                            <View
                                                key={sub.id}
                                                style={[styles.modalSubtaskItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            >
                                                <View
                                                    style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }, sub.isDone && { backgroundColor: '#34C759', borderColor: '#34C759' }]}
                                                >
                                                    {sub.isDone && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                                </View>
                                                <Text style={[
                                                    styles.modalSubtaskText,
                                                    {
                                                        color: sub.isDone ? subtextColor : textColor,
                                                        textDecorationLine: sub.isDone ? 'line-through' : 'none'
                                                    }
                                                ]}>
                                                    {sub.title}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Checklist */}
                            {relatedTask?.checklistItems && relatedTask.checklistItems.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                                        Checklist ({relatedTask.checklistItems.filter(item => item.isChecked).length}/{relatedTask.checklistItems.length})
                                    </Text>
                                    <View style={styles.modalSubtaskList}>
                                        {relatedTask.checklistItems.map(item => (
                                            <View
                                                key={item.id}
                                                style={[styles.modalSubtaskItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            >
                                                <View
                                                    style={[{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }, item.isChecked && { backgroundColor: '#007AFF', borderColor: '#007AFF' }]}
                                                >
                                                    {item.isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                                </View>
                                                <Text style={[
                                                    styles.modalSubtaskText,
                                                    {
                                                        color: item.isChecked ? subtextColor : textColor,
                                                        textDecorationLine: item.isChecked ? 'line-through' : 'none'
                                                    }
                                                ]}>
                                                    {item.title}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Submitter */}
                            {!relatedTask && !!action.submitter && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Submitter</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={[styles.avatarChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                                                {action.submitter.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                            {action.submitter}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Assignees */}
                            {relatedTask?.assignees && relatedTask.assignees.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Assignees</Text>
                                    <View style={{ gap: 8 }}>
                                        {relatedTask.assignees.map(a => (
                                            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={[styles.avatarChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                                                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                                                        {((a.name || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
                                                    {a.name}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Attachments Section */}
                            {originalAttachments.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Original Attachments</Text>
                                    <View style={{ gap: 8 }}>
                                        {originalAttachments.map(att => (
                                            <View key={att.id} style={[styles.documentItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                    <Ionicons name="document-text-outline" size={16} color="#007AFF" />
                                                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                        {att.name}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => handleViewPress(att.uri, att.name)}
                                                    style={styles.viewDocButton}
                                                >
                                                    <Text style={styles.viewDocButtonText}>View Document</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Submitted Proofs Section */}
                            {(relatedTask?.status === 'submitted' || relatedTask?.status === 'done') && relatedTask?.submissionAttachments && relatedTask.submissionAttachments.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Submitted Proofs</Text>
                                    {!!relatedTask.submissionNote && (
                                        <View style={[styles.notesContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(142,142,147,0.15)', marginBottom: 8 }]}>
                                            <Text style={[styles.notesText, { color: subtextColor, fontSize: 12, fontWeight: '600', fontStyle: 'italic' }]}>"{relatedTask.submissionNote}"</Text>
                                        </View>
                                    )}
                                    <View style={{ gap: 8 }}>
                                        {relatedTask.submissionAttachments.map(att => (
                                            <View key={att.id} style={[styles.documentItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                    <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                                                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                        {att.name}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => handleViewPress(att.uri, att.name)}
                                                    style={styles.viewDocButton}
                                                >
                                                    <Text style={styles.viewDocButtonText}>View Document</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* History */}
                            {!relatedTask && action.history && action.history.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isHistoryExpanded ? 16 : 0, marginTop: 10 }}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setIsHistoryExpanded(!isHistoryExpanded);
                                        }}
                                    >
                                        <Text style={[styles.modalSectionTitle, { color: textColor, marginBottom: 0, marginTop: 0 }]}>History</Text>
                                        <Ionicons name={isHistoryExpanded ? "chevron-up" : "chevron-down"} size={20} color={subtextColor} />
                                    </TouchableOpacity>

                                    {isHistoryExpanded && (
                                        <View style={{ gap: 10 }}>
                                            {action.history.map((h, i) => (
                                                <View key={h.id} style={{ flexDirection: 'row', gap: 12 }}>
                                                    <View style={{ alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? '#007AFF' : subtextColor, marginTop: 4 }} />
                                                        {i < (action.history?.length || 0) - 1 && (
                                                            <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(142,142,147,0.3)', marginVertical: 4 }} />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, paddingBottom: i < (action.history?.length || 0) - 1 ? 12 : 0 }}>
                                                        <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }}>{h.action}</Text>
                                                        <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>
                                                            {h.user} • {new Date(h.timestamp).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                        {!!h.details && (
                                                            <Text style={{ fontSize: 12, color: subtextColor, fontStyle: 'italic', marginTop: 4 }}>"{h.details}"</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Discussion */}
                            <View style={styles.modalSubtaskSection}>
                                <Text style={[styles.modalSectionTitle, { color: textColor }]}>Discussion</Text>
                                {actionComments && actionComments.length > 0 ? (
                                    <View style={{ gap: 12 }}>
                                        {actionComments.map(comment => {
                                            const isMe = comment.role === 'staff';

                                            return (
                                                <View
                                                    key={comment.id}
                                                    style={{
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                        maxWidth: '85%',
                                                        marginBottom: 4
                                                    }}
                                                >
                                                    {!isMe && (
                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor, marginBottom: 4, marginLeft: 4 }}>
                                                            {comment.author}
                                                        </Text>
                                                    )}
                                                    <View
                                                        style={{
                                                            paddingVertical: 8,
                                                            paddingHorizontal: 16,
                                                            borderRadius: 20,
                                                            borderBottomRightRadius: isMe ? 4 : 20,
                                                            borderBottomLeftRadius: isMe ? 20 : 4,
                                                            backgroundColor: isMe ? '#007AFF' : (isDark ? '#3A3A3C' : '#E9E9EB'),
                                                            borderWidth: isMe ? 0 : 1,
                                                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 16, color: isMe ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#1C1C1E'), lineHeight: 21 }}>
                                                            {comment.text}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 4, paddingHorizontal: 4, alignItems: 'center' }}>
                                                        <Text style={{ fontSize: 10, color: subtextColor, opacity: 0.8 }}>
                                                            {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => chatInputRef.current?.focus()}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                                            paddingHorizontal: 16,
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                            borderStyle: 'dashed',
                                            width: '100%'
                                        }}
                                    >
                                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={subtextColor} />
                                        <Text style={{ flex: 1, color: subtextColor, fontSize: 14, fontWeight: '500' }}>
                                            No discussion started. Send message to start discussion.
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {/* Actions Row */}
                        <View style={{ flexDirection: 'column', gap: 12, marginTop: 24 }}>
                            <View style={[styles.chatInputRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <TextInput
                                    ref={chatInputRef}
                                    placeholder={pendingActionType === 'revision' ? 'Send Revision Message...' : pendingActionType === 'reject' ? 'Send Rejection Message...' : 'Send Message...'}
                                    placeholderTextColor={subtextColor}
                                    value={messageText}
                                    onChangeText={setMessageText}
                                    style={{ flex: 1, color: textColor, fontSize: 16 }}
                                    returnKeyType="send"
                                    onSubmitEditing={handleSendMessage}
                                />
                                <TouchableOpacity
                                    onPress={handleSendMessage}
                                    style={[styles.sendButton, { backgroundColor: messageText.trim() ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }]}
                                    disabled={!messageText.trim()}
                                >
                                    <Ionicons name="arrow-up" size={18} color="white" />
                                </TouchableOpacity>
                            </View>

                            {action.status === 'pending' || action.status === 'urgent' ? (
                                <>

                                    {(action.actionType === 'review' || action.actionType === 'approval' || !action.actionType) && (
                                        <View style={{ flexDirection: 'column', gap: 12 }}>
                                            {action.module === 'finance' && isAdjustingAmount && (
                                                <View style={[styles.adjustAmountContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: textColor, marginBottom: 8 }}>Final Approved Amount</Text>
                                                    <View style={[styles.adjustInputRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                                        <Text style={{ fontSize: 16, fontWeight: '700', color: subtextColor, marginRight: 8 }}>{action.details?.currency || 'IDR'}</Text>
                                                        <TextInput
                                                            value={adjustedAmount}
                                                            onChangeText={setAdjustedAmount}
                                                            keyboardType="numeric"
                                                            style={{ flex: 1, fontSize: 18, fontWeight: '700', color: textColor }}
                                                        />
                                                    </View>
                                                </View>
                                            )}
                                            <View style={{ flexDirection: 'column', gap: 10 }}>
                                                {isAdjustingAmount ? (
                                                    <>
                                                        <PillButton
                                                            label="Confirm Approval"
                                                            onPress={() => {
                                                                const finalAmount = parseInt(adjustedAmount.replace(/[^0-9]/g, ''), 10);
                                                                onStatusChange(action.id, 'completed', 'approve', isNaN(finalAmount) ? undefined : finalAmount);
                                                                setIsAdjustingAmount(false);
                                                                setTimeout(() => onClose(), 300);
                                                            }}
                                                            variant="solid"
                                                            color="blue"
                                                            style={{ width: '100%' }}
                                                            icon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
                                                        />
                                                        <PillButton
                                                            label="Cancel"
                                                            onPress={() => setIsAdjustingAmount(false)}
                                                            variant="tinted"
                                                            color="neutral"
                                                            style={{ width: '100%' }}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                                            <PillButton
                                                                label="Reject"
                                                                onPress={() => {
                                                                    setPendingActionType('reject');
                                                                    setTimeout(() => chatInputRef.current?.focus(), 100);
                                                                }}
                                                                variant="muted"
                                                                color="neutral"
                                                                textColor={isDark ? '#FF8A8A' : '#FF3B30'}
                                                                style={{ flex: 1 }}
                                                                icon={<Ionicons name="close" size={18} color={isDark ? '#FF8A8A' : '#FF3B30'} />}
                                                            />
                                                            <PillButton
                                                                label="Revision"
                                                                onPress={() => {
                                                                    setPendingActionType('revision');
                                                                    setTimeout(() => chatInputRef.current?.focus(), 100);
                                                                }}
                                                                variant="muted"
                                                                color="neutral"
                                                                textColor={isDark ? '#FFCC80' : '#FF9500'}
                                                                style={{ flex: 1 }}
                                                                icon={<Ionicons name="refresh" size={18} color={isDark ? '#FFCC80' : '#FF9500'} />}
                                                            />
                                                        </View>
                                                        <PillButton
                                                            label="Approve"
                                                            onPress={() => {
                                                                if (action.module === 'finance' && action.details?.amount !== undefined) {
                                                                    setAdjustedAmount(action.details.amount.toString());
                                                                    setIsAdjustingAmount(true);
                                                                } else {
                                                                    onStatusChange(action.id, 'completed', 'approve');
                                                                    setTimeout(() => onClose(), 300);
                                                                }
                                                            }}
                                                            variant="solid"
                                                            color="blue"
                                                            style={{ width: '100%' }}
                                                            icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                                                        />
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    {action.actionType === 'dispute' && (
                                        <View style={{ flexDirection: 'column', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <PillButton
                                                    label="Reject"
                                                    onPress={() => {
                                                        setPendingActionType('reject');
                                                        setTimeout(() => chatInputRef.current?.focus(), 100);
                                                    }}
                                                    variant="muted"
                                                    color="neutral"
                                                    textColor={isDark ? '#FF8A8A' : '#FF3B30'}
                                                    style={{ flex: 1 }}
                                                    icon={<Ionicons name="close" size={18} color={isDark ? '#FF8A8A' : '#FF3B30'} />}
                                                />
                                                <PillButton
                                                    label="Revision"
                                                    onPress={() => {
                                                        setPendingActionType('revision');
                                                        setTimeout(() => chatInputRef.current?.focus(), 100);
                                                    }}
                                                    variant="muted"
                                                    color="neutral"
                                                    textColor={isDark ? '#FFCC80' : '#FF9500'}
                                                    style={{ flex: 1 }}
                                                    icon={<Ionicons name="refresh" size={18} color={isDark ? '#FFCC80' : '#FF9500'} />}
                                                />
                                            </View>
                                            <PillButton
                                                label="Accept"
                                                onPress={() => {
                                                    onStatusChange(action.id, 'completed', 'dispute');
                                                    setTimeout(() => onClose(), 300);
                                                }}
                                                variant="solid"
                                                color="blue"
                                                style={{ width: '100%' }}
                                                icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                                            />
                                        </View>
                                    )}

                                    {action.actionType === 'confirmation' && (
                                        <PillButton
                                            label="Confirm"
                                            onPress={() => {
                                                onStatusChange(action.id, 'completed', 'confirm');
                                                setTimeout(() => onClose(), 300);
                                            }}
                                            variant="solid"
                                            color="blue"
                                            style={{ width: '100%' }}
                                            icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
                                        />
                                    )}

                                    {(!currentActionType || currentActionType === 'sign_off' || currentActionType === 'acknowledgement') && (
                                        <PillButton
                                            label="Mark as Completed"
                                            onPress={() => {
                                                onStatusChange(action.id, 'completed');
                                                setTimeout(() => onClose(), 300);
                                            }}
                                            variant="solid"
                                            color="blue"
                                            style={{ width: '100%' }}
                                        />
                                    )}
                                </>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                    </TouchableOpacity>

                                    {action.status === 'completed' ? (
                                        <View style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            height: 48,
                                            borderRadius: 999,
                                            backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.08)',
                                            borderWidth: 1,
                                            borderColor: 'rgba(52,199,89,0.2)'
                                        }}>
                                            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                            <Text style={{ color: '#34C759', fontSize: 15, fontWeight: '700' }}>
                                                {currentActionType === 'approval' ? 'Action Approved' : 'Action Completed'}
                                            </Text>
                                        </View>
                                    ) : action.status === 'rejected' ? (
                                        <View style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            height: 48,
                                            borderRadius: 999,
                                            backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)',
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,59,48,0.2)'
                                        }}>
                                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                            <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '700' }}>Request Rejected</Text>
                                        </View>
                                    ) : (
                                        <View style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            height: 48,
                                            borderRadius: 999,
                                            backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.08)',
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,149,0,0.2)'
                                        }}>
                                            <Ionicons name="alert-circle" size={20} color="#FF9500" />
                                            <Text style={{ color: '#FF9500', fontSize: 15, fontWeight: '700' }}>Revision Requested</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
            </View>
        );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                {renderInnerContent()}
                {renderDocumentViewer()}
            </View>
        );
    }

    return (
        <Modal visible={isOpened} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]} />
                    {renderInnerContent()}
                </View>
            </View>
            {renderDocumentViewer()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        height: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    modalContent: {
        borderRadius: Platform.OS === 'ios' ? 56 : 40,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
    },
    modalDragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
        marginRight: 16,
    },
    modalInfoCard: {
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(142,142,147,0.15)',
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(142,142,147,0.1)',
        paddingBottom: 8,
    },
    modalInfoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    projectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    projectBadgeText: {
        fontWeight: '800',
    },
    moduleDetailsContainer: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    modalSubtaskSection: {
        marginTop: 16,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    proofLinkButton: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: '#007AFF30',
        alignSelf: 'flex-start',
    },
    modalSubtaskList: {
        gap: 8,
        marginTop: 4,
    },
    modalSubtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    modalSubtaskText: {
        flex: 1,
        fontSize: 14,
    },
    avatarChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    adjustAmountContainer: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    adjustInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        paddingLeft: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(142,142,147,0.15)',
        marginBottom: 4,
    },
    viewDocButton: {
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    viewDocButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#007AFF',
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerContainer: {
        width: '95%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
    },
    viewerCloseBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    viewerDownloadBtn: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    viewerDownloadBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    notesContainer: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(142,142,147,0.15)',
        marginBottom: 8,
    },
    notesText: {
        fontSize: 12,
        fontWeight: '600',
        fontStyle: 'italic',
    },
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
