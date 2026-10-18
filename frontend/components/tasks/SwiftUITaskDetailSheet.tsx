import { SegmentedControl } from '@/components/ui/SegmentedControl';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    Alert,
    Dimensions,
    StyleSheetProperties,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { FormaBlue } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PillButton } from '@/components/ui/PillButton';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { Task, TaskAttachment, PROJECTS } from '@/constants/MockData';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { uploadTaskAttachment, deleteTaskApi, updateTaskApi, getTaskComments, addTaskCommentApi } from '@/lib/api/tasks';
import { PeopleTaskWorkSurface } from '@/components/people/tasks/PeopleTaskWorkSurface';

let WebView: any = null;
try {
    const { WebView: WV } = require('react-native-webview');
    WebView = WV;
} catch (e) {
    // Silently handled
}


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

const getInitials = (nameOrEmail?: string) => {
    if (!nameOrEmail) return 'U';
    const clean = nameOrEmail.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
};

const TEAM = [
    { id: '1', name: 'Manu Travo' },
    { id: '2', name: 'Ahmad' },
    { id: '3', name: 'Siti' },
    { id: '4', name: 'Budi' },
    { id: '5', name: 'Joko' },
];

export interface SwiftUITaskDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    task: Task | null;
    setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
    onTaskUpdated?: () => void;
    isEmbedded?: boolean;
}

export const SwiftUITaskDetailSheet: React.FC<SwiftUITaskDetailSheetProps> = ({
    isOpened,
    onClose,
    task,
    setTasks,
    onTaskUpdated,
    isEmbedded = false,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const formatDisplayTime = (time?: string) => {
        if (!time) return '';
        const parts = time.trim().split(':');
        if (parts.length >= 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return time;
    };

    const [selectedTask, setSelectedTask] = useState<Task | null>(task);

    useEffect(() => {
        setSelectedTask(task);
    }, [task]);

    const [pendingAttachments, setPendingAttachments] = useState<TaskAttachment[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const chatInputRef = useRef<TextInput>(null);
    const sectionScrollRef = useRef<ScrollView>(null);
    const sectionOffsets = useRef<Record<string, number>>({ info: 0 });
    const [activeSection, setActiveSection] = useState('info');

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


    useEffect(() => {
        setSelectedTask(task);
        if (task) {
            setPendingAttachments(task.submissionAttachments || []);
            // Fetch comments from database on load
            getTaskComments(task.id).then(dbComments => {
                setSelectedTask(prev => prev && prev.id === task.id ? { ...prev, comments: dbComments } : prev);
            });
        } else {
            setPendingAttachments([]);
            setIsHistoryExpanded(false);
        }
    }, [task, isOpened]);

    if (!selectedTask) return null;

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos to attach files.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsUploading(true);
            try {
                const newAttachments: TaskAttachment[] = [];
                for (let i = 0; i < result.assets.length; i++) {
                    const asset = result.assets[i];
                    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64
                    });
                    const ext = asset.uri.split('.').pop() || 'jpg';
                    const mimeType = asset.mimeType || 'image/jpeg';
                    const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                    newAttachments.push({
                        id: `att-${Date.now()}-${i}`,
                        uri: asset.uri,
                        path: uploadedPath,
                        name: asset.fileName || `Photo ${pendingAttachments.length + i + 1}.${ext}`,
                        type: 'image' as const,
                    });
                }
                setPendingAttachments(prev => [...prev, ...newAttachments]);
            } catch (err) {
                console.error('Upload error:', err);
                Alert.alert('Upload Failed', 'Could not upload attachment.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow camera access to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const asset = result.assets[0];
            setIsUploading(true);
            try {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64
                });
                const ext = asset.uri.split('.').pop() || 'jpg';
                const mimeType = asset.mimeType || 'image/jpeg';
                const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                setPendingAttachments(prev => [...prev, {
                    id: `att-${Date.now()}`,
                    uri: asset.uri,
                    path: uploadedPath,
                    name: asset.fileName || `Photo ${prev.length + 1}.${ext}`,
                    type: 'image' as const,
                }]);
            } catch (err) {
                console.error('Upload error:', err);
                Alert.alert('Upload Failed', 'Could not upload photo.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const removeAttachment = (attId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPendingAttachments(prev => prev.filter(a => a.id !== attId));
    };

    const submitWithAttachments = async (taskId: string) => {
        setIsUploading(true);
        const success = await updateTaskApi(taskId, {
            status: 'submitted',
            submissionAttachments: pendingAttachments
        });
        setIsUploading(false);
        if (success) {
            setTasks(prev => {
                return prev.map(t => {
                    if (t.id === taskId) {
                        const updatedTask = { ...t, status: 'submitted' as Task['status'], submissionAttachments: pendingAttachments };
                        setSelectedTask(updatedTask);
                        return updatedTask;
                    }
                    return t;
                });
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Alert.alert('Error', 'Failed to submit task with attachments.');
        }
    };

    const handleDelete = () => {
        const doDelete = async () => {
            try {
                const success = await deleteTaskApi(selectedTask.id);
                if (success) {
                    if (setTasks) {
                        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                    }
                    if (onTaskUpdated) {
                        onTaskUpdated();
                    }
                    onClose();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('Failed to delete task.');
                    } else {
                        Alert.alert('Error', 'Failed to delete task.');
                    }
                }
            } catch (err) {
                console.error('Delete task error:', err);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this task?')) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Delete Task',
                'Are you sure you want to delete this task?',
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

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent':
                return isDark ? '#FF453A' : '#FF3B30';
            case 'high':
                return isDark ? '#FF9F0A' : '#FF9500';
            case 'medium':
            case 'low':
            default:
                return isDark ? '#98989D' : '#8E8E93';
        }
    };

    const getStatusStyles = (s: string) => {
        switch (s) {
            case 'in_progress': return { color: isDark ? '#B5B3FF' : '#5856D6', label: 'In Progress' };
            case 'submitted': return { color: isDark ? '#32ADE6' : '#007AFF', label: 'Submitted' };
            case 'revision': return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
            case 'done': return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
            default: return { color: isDark ? '#98989D' : '#8E8E93', label: 'To-Do' };
        }
    };

    const handleAction = async (taskId: string, action: 'start' | 'submit' | 'approve' | 'revision' | 'cancel' | 'cancel_submission') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let nextStatus: Task['status'] = selectedTask.status;
        if (action === 'start') nextStatus = 'in_progress';
        else if (action === 'submit') nextStatus = 'submitted';
        else if (action === 'approve') nextStatus = 'done';
        else if (action === 'revision') nextStatus = 'revision';
        else if (action === 'cancel') nextStatus = 'todo';
        else if (action === 'cancel_submission') nextStatus = 'in_progress';

        const success = await updateTaskApi(taskId, { status: nextStatus });
        if (success) {
            setTasks(prev => {
                return prev.map(t => {
                    if (t.id === taskId) {
                        let startedAt = t.startedAt;
                        const history = t.history || [];
                        const userName = 'Manu Travo';

                        if (action === 'start') {
                            const isRevision = t.status === 'revision';
                            startedAt = new Date().toISOString();
                            history.unshift({
                                id: `h-${Date.now()}`,
                                action: isRevision ? 'Started Revision' : 'Started Task',
                                timestamp: startedAt,
                                user: userName
                            });
                        }
                        else if (action === 'submit') {
                            history.unshift({
                                id: `h-${Date.now()}`,
                                action: 'Submitted for Review',
                                timestamp: new Date().toISOString(),
                                user: userName
                            });
                        }
                        else if (action === 'approve') {
                            history.unshift({
                                id: `h-${Date.now()}`,
                                action: 'Approved',
                                timestamp: new Date().toISOString(),
                                user: 'Ahmad (Manager)'
                            });
                        }
                        else if (action === 'revision') {
                            history.unshift({
                                id: `h-${Date.now()}`,
                                action: 'Requested Revision',
                                timestamp: new Date().toISOString(),
                                user: 'Ahmad (Manager)'
                            });
                        }
                        else if (action === 'cancel_submission') {
                            history.unshift({
                                id: `h-${Date.now()}`,
                                action: 'Cancelled Submission',
                                timestamp: new Date().toISOString(),
                                user: userName
                            });
                        }

                        const updatedTask = { ...t, status: nextStatus, startedAt, history };
                        setSelectedTask(updatedTask);
                        return updatedTask;
                    }
                    return t;
                });
            });
            if (action === 'approve') {
                setTimeout(() => onClose(), 500);
            }
        } else {
            Alert.alert('Error', 'Failed to update task status on the server.');
        }
    };

    const toggleModalSubtask = async (taskId: string, subtaskId: string) => {
        const updatedSubtasks = selectedTask.subtasks?.map(s =>
            s.id === subtaskId ? { ...s, isDone: !s.isDone } : s
        ) || [];

        const success = await updateTaskApi(taskId, { subtasks: updatedSubtasks });
        if (success) {
            setTasks(prev => prev.map(t => {
                if (t.id === taskId && t.subtasks) {
                    return { ...t, subtasks: updatedSubtasks };
                }
                return t;
            }));

            setSelectedTask(prev => {
                if (!prev || !prev.subtasks) return prev;
                return { ...prev, subtasks: updatedSubtasks };
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Alert.alert('Error', 'Failed to update subtask.');
        }
    };

    const toggleModalChecklistItem = (taskId: string, itemId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId && t.checklistItems) {
                return {
                    ...t,
                    checklistItems: t.checklistItems.map(item =>
                        item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
                    )
                };
            }
            return t;
        }));

        setSelectedTask(prev => {
            if (!prev || !prev.checklistItems) return prev;
            return {
                ...prev,
                checklistItems: prev.checklistItems.map(item =>
                    item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
                )
            };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;

        const msgText = messageText.trim();
        setMessageText('');

        const newComment = await addTaskCommentApi(selectedTask.id, msgText);
        if (newComment) {
            setTasks(prev => prev.map(t => {
                if (t.id === selectedTask.id) {
                    return {
                        ...t,
                        comments: [...(t.comments || []), newComment]
                    };
                }
                return t;
            }));

            setSelectedTask(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    comments: [...(prev.comments || []), newComment]
                };
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Alert.alert('Error', 'Failed to post comment.');
        }
    };

    const handleLinkNavigation = () => {
        if (!selectedTask.linkedModule) return;
        const targetModule = selectedTask.linkedModule.target;
        const targetRoute = selectedTask.linkedModule.route;
        let routePath = '';

        onClose();

        if (targetModule === 'finance') {
            const match = targetRoute.match(/req-(\w+)/);
            const reqId = match ? match[0] : undefined;
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

    if (!isOpened || !selectedTask) return null;

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
                        {activeDocUrl.toLowerCase().includes('.pdf') && WebView ? (
                            <WebView
                                source={{ uri: activeDocUrl }}
                                style={{ width: SCREEN_WIDTH * 0.9, height: SCREEN_HEIGHT * 0.7, backgroundColor: 'transparent' }}
                                scalesPageToFit={true}
                            />
                        ) : (
                            <Image
                                source={{ uri: activeDocUrl }}
                                style={styles.viewerImage}
                                contentFit="contain"
                            />
                        )}
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
            <View style={[styles.modalHeader, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14 }]}>
                <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={isEmbedded ? 2 : undefined}>{selectedTask.title}</Text>
                <HeaderCircleButton
                    type="close"
                    onPress={onClose}
                    isDark={isDark}
                    size={32}
                />
            </View>

            <View style={{ paddingHorizontal: isEmbedded ? 24 : 0, paddingBottom: 12 }}>
                <SegmentedControl fullWidth segments={[
                    { id: 'info', label: 'Info' },
                    { id: 'attachments', label: 'Attachments' },
                    { id: 'discussion', label: 'Discussion' },
                ]} activeSegment={activeSection} onSegmentChange={(section) => {
                    setActiveSection(section);
                    sectionScrollRef.current?.scrollTo({ y: sectionOffsets.current[section] || 0, animated: true });
                }} />
            </View>
            <ScrollView
                ref={sectionScrollRef}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: isEmbedded ? 48 : 24, paddingHorizontal: isEmbedded ? 24 : 0, paddingTop: isEmbedded ? 16 : 0, maxWidth: isEmbedded ? 840 : undefined, width: '100%', alignSelf: 'center' }}
            >
                            <View style={[detailStyles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                {/* Project */}
                                <View style={[detailStyles.infoRow, detailStyles.infoRowBorder, { borderBottomColor: dividerColor }]}>
                                    <Text style={[detailStyles.infoLabel, { color: subtextColor }]}>Project</Text>
                                    <View style={detailStyles.infoValueRow}>
                                        <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', marginRight: 0, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }]}>
                                            <Text style={[styles.projectBadgeText, { color: isDark ? '#E5E5EA' : '#636366' }]}>
                                                {selectedTask.projectCode || 'GEN'}
                                            </Text>
                                        </View>
                                        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                                            {selectedTask.project}
                                        </Text>
                                    </View>
                                </View>

                                {/* WBS (if valid) */}
                                {!!selectedTask.wbs && selectedTask.wbs.trim() !== '' && !selectedTask.wbs.endsWith('-') && (
                                    <View style={[detailStyles.infoRow, detailStyles.infoRowBorder, { borderBottomColor: dividerColor }]}>
                                        <Text style={[detailStyles.infoLabel, { color: subtextColor }]}>WBS</Text>
                                        <View style={detailStyles.infoValueRow}>
                                            <Ionicons name="layers-outline" size={15} color={subtextColor} />
                                            <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }}>
                                                {selectedTask.wbs}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Deadline */}
                                <View style={[detailStyles.infoRow, detailStyles.infoRowBorder, { borderBottomColor: dividerColor }]}>
                                    <Text style={[detailStyles.infoLabel, { color: subtextColor }]}>Deadline</Text>
                                    <View style={detailStyles.infoValueRow}>
                                        <Ionicons name="calendar-outline" size={15} color={subtextColor} />
                                        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }}>
                                            {formatCardDate(selectedTask.dueDate)}{selectedTask.dueTime ? ` · ${formatDisplayTime(selectedTask.dueTime)}` : ''}
                                        </Text>
                                    </View>
                                </View>

                                {/* Priority */}
                                <View style={[detailStyles.infoRow, detailStyles.infoRowBorder, { borderBottomColor: dividerColor }]}>
                                    <Text style={[detailStyles.infoLabel, { color: subtextColor }]}>Priority</Text>
                                    <View style={[detailStyles.priorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) + '18' }]}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getPriorityColor(selectedTask.priority) }} />
                                        <Text style={{ color: getPriorityColor(selectedTask.priority), fontSize: 12, fontWeight: '700' }}>
                                            {((selectedTask.priority || 'medium').charAt(0).toUpperCase() + (selectedTask.priority || 'medium').slice(1))}
                                        </Text>
                                    </View>
                                </View>

                                {/* Status */}
                                <View style={[detailStyles.infoRow, { borderBottomWidth: 0 }]}>
                                    <Text style={[detailStyles.infoLabel, { color: subtextColor }]}>Status</Text>
                                    <View style={[detailStyles.statusBadge, { backgroundColor: getStatusStyles(selectedTask.status).color + '18' }]}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getStatusStyles(selectedTask.status).color }} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: getStatusStyles(selectedTask.status).color }}>
                                            {getStatusStyles(selectedTask.status).label}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* People Task Actionable Work Surface */}
                            {(selectedTask.linkedModule?.target === 'people' || selectedTask.sourceInfo?.module === 'people') && (
                                <View style={[styles.modalSubtaskSection, { borderTopWidth: 0, paddingTop: 4 }]}>
                                    <PeopleTaskWorkSurface
                                        task={selectedTask}
                                        isDark={isDark}
                                        textColor={textColor}
                                        subtextColor={subtextColor}
                                        onTaskUpdated={(updatedTask) => {
                                            setSelectedTask(updatedTask);
                                            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                                        }}
                                    />
                                </View>
                            )}

                            {!!selectedTask.description && (selectedTask.linkedModule?.target !== 'people' && selectedTask.sourceInfo?.module !== 'people') && (
                                <View style={[styles.modalSubtaskSection, { borderTopWidth: 0, paddingTop: 4 }]}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Description</Text>
                                    <Text style={{ color: subtextColor, fontSize: 13, lineHeight: 20 }}>
                                        {selectedTask.description}
                                    </Text>
                                </View>
                            )}

                            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                                        Subtasks ({selectedTask.subtasks.filter(s => s.isDone).length}/{selectedTask.subtasks.length})
                                    </Text>
                                    <View style={styles.modalSubtaskList}>
                                        {selectedTask.subtasks.map(sub => (
                                            <TouchableOpacity
                                                key={sub.id}
                                                style={[styles.modalSubtaskItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                                onPress={() => toggleModalSubtask(selectedTask.id, sub.id)}
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
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {selectedTask.checklistItems && selectedTask.checklistItems.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                                        Checklist ({selectedTask.checklistItems.filter(item => item.isChecked).length}/{selectedTask.checklistItems.length})
                                    </Text>
                                    <View style={styles.modalSubtaskList}>
                                        {selectedTask.checklistItems.map(item => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.modalSubtaskItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                                onPress={() => toggleModalChecklistItem(selectedTask.id, item.id)}
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
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View onLayout={e => { sectionOffsets.current.attachments = e.nativeEvent.layout.y; }} />
                            {/* Attachments Section */}
                            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Attachments</Text>
                                    <View style={{ gap: 8 }}>
                                        {selectedTask.attachments.map(att => {
                                            const isImg = att.type === 'image' || att.name.endsWith('.jpg') || att.name.endsWith('.png') || att.name.endsWith('.jpeg');
                                            const isLink = !isImg && (
                                                att.name.includes('.com') || att.name.includes('.org') || att.name.includes('.net') ||
                                                att.name.includes('.id') || att.name.includes('.io') || att.name.includes('.app') ||
                                                att.uri.startsWith('http://') || att.uri.startsWith('https://') ||
                                                att.name.startsWith('http://') || att.name.startsWith('https://')
                                            );
                                            return (
                                                <View key={att.id} style={[styles.documentItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                        <Ionicons name={isImg ? "image-outline" : (isLink ? "link-outline" : "document-text-outline")} size={16} color="#007AFF" />
                                                        <Text style={{ color: textColor, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                            {att.name}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            if (isLink) {
                                                                let target = att.uri || att.name;
                                                                if (!target.startsWith('http://') && !target.startsWith('https://')) {
                                                                    target = `https://${target}`;
                                                                }
                                                                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                                                    window.open(target, '_blank', 'noopener,noreferrer');
                                                                } else {
                                                                    Linking.openURL(target).catch(() => {
                                                                        Alert.alert('Error', 'Unable to open link');
                                                                    });
                                                                }
                                                            } else {
                                                                handleViewPress(att.uri, att.name);
                                                            }
                                                        }}
                                                        style={styles.viewDocButton}
                                                    >
                                                        <Text style={styles.viewDocButtonText}>{isLink ? 'Open' : 'View'}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Submitted Proofs Section */}
                            {(selectedTask.status === 'submitted' || selectedTask.status === 'done') && selectedTask.submissionAttachments && selectedTask.submissionAttachments.length > 0 && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Submitted Proofs</Text>
                                    {!!selectedTask.submissionNote && (
                                        <View style={[styles.notesContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }]}>
                                            <Text style={[styles.notesText, { color: subtextColor }]}>"{selectedTask.submissionNote}"</Text>
                                        </View>
                                    )}
                                    <View style={{ gap: 8 }}>
                                        {selectedTask.submissionAttachments.map(att => (
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

                            {/* Submit Proof Section */}
                            {(selectedTask.status === 'in_progress' || selectedTask.status === 'revision') && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                                        Submit Proofs {pendingAttachments.length > 0 ? `(${pendingAttachments.length})` : ''}
                                    </Text>

                                    {pendingAttachments.length > 0 && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                {pendingAttachments.map(att => (
                                                    <View key={att.id} style={{ position: 'relative' }}>
                                                        <Image
                                                            source={{ uri: att.uri }}
                                                            style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }}
                                                        />
                                                        <TouchableOpacity
                                                            onPress={() => removeAttachment(att.id)}
                                                            style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 }}
                                                        >
                                                            <Ionicons name="close" size={14} color={isDark ? '#FFFFFF' : '#000000'} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    )}

                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={pickImage}
                                            style={[styles.attachButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 9999 }]}
                                        >
                                            <Ionicons name="images-outline" size={18} color={textColor} />
                                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>Gallery</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={takePhoto}
                                            style={[styles.attachButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 9999 }]}
                                        >
                                            <Ionicons name="camera-outline" size={18} color={textColor} />
                                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>Camera</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {pendingAttachments.length === 0 && (
                                        <Text style={{ color: subtextColor, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                                            Attach proof of work to submit this task.
                                        </Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.modalSubtaskSection}>
                                <Text style={[styles.modalSectionTitle, { color: textColor }]}>Assignees</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {selectedTask.assignees.map(a => {
                                        const avatarUrl = a.avatar || (a as any).avatar_url;
                                        const initials = getInitials(a.name);
                                        return (
                                            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                                                {avatarUrl ? (
                                                    <Image
                                                        source={{ uri: avatarUrl }}
                                                        style={{ width: 22, height: 22, borderRadius: 11 }}
                                                        contentFit="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.miniAvatar, { backgroundColor: '#1677D2', borderColor: 'transparent', width: 22, height: 22, borderRadius: 11, overflow: 'hidden' }]}>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
                                                            {initials}
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{a.name}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {selectedTask.history && selectedTask.history.length > 0 && (
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
                                            {selectedTask.history.map((h, i) => (
                                                <View key={h.id} style={{ flexDirection: 'row', gap: 12 }}>
                                                    <View style={{ alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? '#007AFF' : subtextColor, marginTop: 4 }} />
                                                        {i < (selectedTask.history?.length || 0) - 1 && (
                                                            <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(142,142,147,0.3)', marginVertical: 4 }} />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, paddingBottom: i < (selectedTask.history?.length || 0) - 1 ? 12 : 0 }}>
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

                            <View onLayout={e => { sectionOffsets.current.discussion = e.nativeEvent.layout.y; }} />
                            {selectedTask.status !== 'todo' && (
                                <View style={styles.modalSubtaskSection}>
                                    <Text style={[styles.modalSectionTitle, { color: textColor }]}>Discussion</Text>
                                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                                        <View style={{ gap: 12 }}>
                                            {selectedTask.comments.map(comment => {
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
                            )}



                        {selectedTask.status !== 'todo' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingLeft: 16, paddingRight: 8, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                    <TextInput
                                        ref={chatInputRef}
                                        placeholder="Send Message..."
                                        placeholderTextColor={subtextColor}
                                        value={messageText}
                                        onChangeText={setMessageText}
                                        style={{ flex: 1, color: textColor, fontSize: 16 }}
                                        returnKeyType="send"
                                        onSubmitEditing={handleSendMessage}
                                    />
                                    <TouchableOpacity
                                        onPress={handleSendMessage}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: messageText.trim() ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        disabled={!messageText.trim()}
                                    >
                                        <Ionicons name="arrow-up" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}

            </ScrollView>
            <View style={{ flexShrink: 0, paddingTop: 12, paddingBottom: isEmbedded ? 24 : 0,
                paddingHorizontal: isEmbedded ? 24 : 0, width: '100%', maxWidth: isEmbedded ? 840 : undefined,
                alignSelf: 'center', gap: 12, backgroundColor: isEmbedded ? (isDark ? '#000000' : '#F2F2F7') : 'transparent' }}>
                            {selectedTask.taskType === 'linked_module' && selectedTask.linkedModule ? (
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 0, marginBottom: 0 }}>
                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                    </TouchableOpacity>
                                    <PillButton
                                        label={selectedTask.linkedModule.actionLabel}
                                        onPress={handleLinkNavigation}
                                        variant="solid"
                                        color="blue"
                                        noShadow
                                        icon={<Ionicons name={
                                             selectedTask.linkedModule.target === 'finance' ? 'cash' :
                                                 selectedTask.linkedModule.target === 'tracking' ? 'stats-chart' :
                                                     selectedTask.linkedModule.target === 'people' ? 'person' :
                                                         selectedTask.linkedModule.target === 'clock' ? 'time' :
                                                             'hammer'
                                         } size={16} color="#FFFFFF" />}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            ) : (
                                <>
                                    {selectedTask.status === 'todo' && (
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 0, marginBottom: 0 }}>
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>
                                            <PillButton
                                                label="Start Task"
                                                onPress={() => handleAction(selectedTask.id, 'start')}
                                                variant="solid"
                                                color="blue"
                                                noShadow
                                                icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                    )}
                                    {selectedTask.status === 'in_progress' && (
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 0, marginBottom: 0 }}>
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>

                                            <PillButton
                                                label={
                                                    isUploading
                                                        ? 'Uploading files...'
                                                        : selectedTask.taskType === 'checklist'
                                                            ? (selectedTask.checklistItems?.every(i => i.isChecked)
                                                                ? 'Submit Inspection'
                                                                : `Check all items (${selectedTask.checklistItems?.filter(i => i.isChecked).length}/${selectedTask.checklistItems?.length})`)
                                                            : (pendingAttachments.length > 0 ? `Submit (${pendingAttachments.length} file${pendingAttachments.length > 1 ? 's' : ''})` : 'Attach files to submit')
                                                }
                                                onPress={() => {
                                                    if (selectedTask.taskType === 'checklist') {
                                                        if (selectedTask.checklistItems?.every(i => i.isChecked)) {
                                                            handleAction(selectedTask.id, 'submit');
                                                            onClose();
                                                        } else {
                                                            Alert.alert('Incomplete Checklist', 'Please complete all inspection items before submitting.');
                                                        }
                                                    } else {
                                                        pendingAttachments.length > 0 ? submitWithAttachments(selectedTask.id) : pickImage();
                                                    }
                                                }}
                                                variant="solid"
                                                color={
                                                    selectedTask.taskType === 'checklist'
                                                        ? (selectedTask.checklistItems?.every(i => i.isChecked) ? 'blue' : 'neutral')
                                                        : (pendingAttachments.length > 0 ? 'blue' : 'neutral')
                                                }
                                                disabled={isUploading}
                                                noShadow
                                                icon={<Ionicons name={
                                                    selectedTask.taskType === 'checklist'
                                                        ? (selectedTask.checklistItems?.every(i => i.isChecked) ? 'paper-plane' : 'list')
                                                        : (pendingAttachments.length > 0 ? 'paper-plane' : 'attach')
                                                } size={16} color="#FFFFFF" />}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                    )}
                                    {selectedTask.status === 'revision' && (
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 0, marginBottom: 0 }}>
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>

                                            <PillButton
                                                label="Restart Task"
                                                onPress={() => handleAction(selectedTask.id, 'start')}
                                                variant="solid"
                                                color="orange"
                                                noShadow
                                                icon={<Ionicons name="refresh" size={16} color="#FFFFFF" />}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                    )}
                                    {selectedTask.status === 'submitted' && (
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 0, marginBottom: 0 }}>
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>

                                            <PillButton
                                                label="Cancel Submission"
                                                onPress={() => handleAction(selectedTask.id, 'cancel_submission')}
                                                variant="solid"
                                                color="orange"
                                                noShadow
                                                icon={<Ionicons name="close-circle" size={16} color="#FFFFFF" />}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                    )}
                                    {selectedTask.status === 'done' && (
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center', marginTop: 0, marginBottom: 0 }}>
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>

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
                                                <Text style={{ color: '#34C759', fontSize: 15, fontWeight: '700' }}>Task Completed</Text>
                                            </View>
                                        </View>
                                    )}
                                </>
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
        <Modal
            visible={isOpened}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={{ flex: 1 }} />
                </TouchableOpacity>

                <View
                    style={[
                        styles.modalContent,
                        {
                            maxHeight: '85%',
                        }
                    ]}
                >
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
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
        marginRight: 16,
    },
    modalSubtaskSection: {
        paddingTop: 8,
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 10,
    },
    modalSubtaskList: {
        gap: 8,
    },
    modalSubtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        gap: 12,
    },
    modalSubtaskText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    miniAvatarText: {
        fontSize: 8,
        fontWeight: '800',
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        flex: 1,
        justifyContent: 'center',
    },
    modalActionsSection: {
        paddingTop: 16,
        marginTop: 8,
    },
    modalInfoCard: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(142,142,147,0.15)',
    },
    modalInfoLabel: {
        fontSize: 14,
        fontWeight: '500',
        width: 80,
    },
    projectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        marginRight: 4,
    },
    projectBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
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
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const detailStyles = StyleSheet.create({
    infoCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 2,
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        minHeight: 46,
    },
    infoRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '70%',
        justifyContent: 'flex-end',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 9999,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 9999,
    },
});
