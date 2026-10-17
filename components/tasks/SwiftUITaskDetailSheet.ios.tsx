import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Platform, Alert, Image as RNImage, Linking, Dimensions, UIManager, View } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    ZStack,
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button,
    Form,
    Section,
    TextField,
    List
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Task, TaskAttachment } from '@/constants/MockData';
import { SwiftUITransactionDetailSheet } from '@/components/finance/SwiftUITransactionDetailSheet';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { uploadTaskAttachment, deleteTaskApi, updateTaskApi, getTaskComments, addTaskCommentApi } from '@/lib/api/tasks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export interface SwiftUITaskDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    task: Task | null;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const SwiftUITaskDetailSheet: React.FC<SwiftUITaskDetailSheetProps> = React.memo(({
    isOpened,
    onClose,
    task,
    setTasks,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';

    const [selectedTask, setSelectedTask] = useState<Task | null>(task);
    const [pendingAttachments, setPendingAttachments] = useState<TaskAttachment[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showFinanceDrawer, setShowFinanceDrawer] = useState(false);

    // Document Preview and Download States
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState('Document Preview');
    const [isDownloading, setIsDownloading] = useState(false);

    const isPreviewable = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png'].includes(ext || '');
    };

    const handleDownloadFileDirect = async (url: string) => {
        if (!url) return;
        setIsDownloading(true);
        try {
            const cleanUrl = url.split('?')[0];
            const originalFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'document.png';
            const filename = decodeURIComponent(originalFilename).replace(/\s+/g, '_');
            const extension = filename.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension);

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
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device.');
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
        const ext = name.split('.').pop()?.toLowerCase();
        if (isPreviewable(name)) {
            setActiveDocTitle(name);
            setActiveDocUrl(url);
        } else if (ext === 'pdf') {
            openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.FORM_SHEET }).catch(() => {
                Alert.alert('Error', 'Unable to open preview.');
            });
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
            setPendingAttachments(task.attachments || []);
            getTaskComments(task.id).then(dbComments => {
                setSelectedTask(prev => prev && prev.id === task.id ? { ...prev, comments: dbComments } : prev);
            });
        } else {
            setPendingAttachments([]);
            setIsHistoryExpanded(false);
        }
    }, [task, isOpened]);

    const sourceIndicatorText = useMemo(() => {
        if (!selectedTask) return '';
        if (selectedTask.sourceInfo) {
            const mod = selectedTask.sourceInfo.module ? selectedTask.sourceInfo.module.charAt(0).toUpperCase() + selectedTask.sourceInfo.module.slice(1) : '';
            const feat = selectedTask.sourceInfo.feature ? selectedTask.sourceInfo.feature.charAt(0).toUpperCase() + selectedTask.sourceInfo.feature.slice(1) : '';
            return feat ? `${mod} · ${feat}` : mod;
        }
        if (selectedTask.linkedModule?.target === 'finance') return 'Finance · Purchasing';
        if (selectedTask.linkedModule?.target === 'resources') return 'Resources · Receiving';
        if (selectedTask.linkedModule?.target === 'people') return 'People · Employment';
        if (selectedTask.linkedModule?.target === 'clock') return 'Clock · Attendance';
        if (selectedTask.linkedModule?.target === 'report') return 'Reports · Daily Report';
        return '';
    }, [selectedTask]);

    const deadlineInfo = useMemo(() => {
        if (!selectedTask) return { formattedDate: '', targetHealthNote: undefined, isAtRisk: false };

        const targetDate = selectedTask.moduleDetails?.targetDate; // e.g., "15 Sep 2026" or "15 Sep"

        if (selectedTask.isSystemGenerated && (selectedTask.sourceInfo?.module === 'finance' || selectedTask.title.startsWith('Revise '))) {
            const dateStr = formatCardDate(selectedTask.dueDate || '2026-09-14');
            const timeStr = selectedTask.dueTime || '12:00';
            const formatted = `${dateStr} · ${timeStr}`;

            if (selectedTask.priority === 'urgent' && selectedTask.dueDate === '2026-09-15') {
                return {
                    formattedDate: formatted,
                    targetHealthNote: 'Target At Risk',
                    isAtRisk: true,
                };
            }

            const targetFormatted = targetDate ? (targetDate.includes('2026') ? targetDate.replace(/\s*2026/, '') : targetDate) : '15 Sep';
            return {
                formattedDate: formatted,
                targetHealthNote: `Before Payment Target · ${targetFormatted}`,
                isAtRisk: false,
            };
        }

        const formatted = `${formatCardDate(selectedTask.dueDate)}${selectedTask.dueTime ? ` · ${selectedTask.dueTime}` : ''}`;
        return {
            formattedDate: formatted,
            targetHealthNote: undefined,
            isAtRisk: false,
        };
    }, [selectedTask]);

    const discussionComments = useMemo(() => {
        if (!selectedTask) return [];
        const base = [...(selectedTask.comments || [])];
        if (selectedTask.revisionRequest) {
            const hasRevNote = base.some(c => c.text === selectedTask.revisionRequest?.note || c.id === 'rev-note-initial');
            if (!hasRevNote) {
                base.unshift({
                    id: 'rev-note-initial',
                    author: selectedTask.revisionRequest.requestedBy,
                    text: selectedTask.revisionRequest.note,
                    timestamp: selectedTask.revisionRequest.requestedAt || new Date().toISOString(),
                    role: 'manager'
                });
            }
        }
        return base;
    }, [selectedTask]);

    const financeRequestData = useMemo(() => {
        if (!selectedTask) return null;
        const docNo = selectedTask.moduleDetails?.documentNumber || selectedTask.title.replace(/^Revise\s+/i, '');
        const amount = selectedTask.moduleDetails?.requestedAmount || 45000000;
        const isReimbursement = docNo.includes('RF-') || docNo.includes('RP-') || docNo.includes('RR-');

        return {
            id: `fin-req-${selectedTask.id}`,
            document_number: docNo,
            request_number: docNo,
            title: selectedTask.moduleDetails?.itemsSummary || selectedTask.title,
            description: selectedTask.revisionRequest?.note || selectedTask.description,
            project_name: selectedTask.project,
            project_code: selectedTask.projectCode,
            amount: amount,
            currency: selectedTask.moduleDetails?.currency || 'IDR',
            status: 'need revision',
            date: selectedTask.dueDate || new Date().toISOString(),
            created_at: selectedTask.dueDate || new Date().toISOString(),
            requester: 'Manu Travo',
            requester_name: 'Manu Travo',
            department: selectedTask.moduleDetails?.department || 'Construction',
            vendor_name: 'PT Semen Indonesia',
            items: [
                { id: '1', name: selectedTask.moduleDetails?.itemsSummary || 'Portland Cement Grade A · 500 bags', quantity: 500, unit_price: 90000, amount }
            ],
            moduleType: isReimbursement ? 'reimbursement' : 'purchasing',
            approval_chain: [
                { level: 1, approver_name: 'Andi Wijaya (Project Manager)', status: 'rejected', is_current: true }
            ]
        };
    }, [selectedTask]);

    const handleAction = async (action: 'start' | 'submit' | 'approve' | 'revision' | 'cancel' | 'cancel_submission') => {
        if (!selectedTask) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let nextStatus = selectedTask.status;
        if (action === 'start') nextStatus = 'in_progress';
        else if (action === 'submit') nextStatus = 'submitted';
        else if (action === 'approve') nextStatus = 'done';
        else if (action === 'revision') nextStatus = 'revision';
        else if (action === 'cancel') nextStatus = 'todo';
        else if (action === 'cancel_submission') nextStatus = 'in_progress';

        const success = await updateTaskApi(selectedTask.id, { status: nextStatus });
        if (success) {
            setTasks(prev => {
                return prev.map(t => {
                    if (t.id === selectedTask.id) {
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

                        const updatedTask = { ...t, status: nextStatus as Task['status'], startedAt, history };
                        setSelectedTask(updatedTask);
                        return updatedTask;
                    }
                    return t;
                });
            });
        } else {
            Alert.alert('Error', 'Failed to update task status.');
        }
    };

    const handleDeepLinkNavigation = () => {
        if (!selectedTask) return;
        onClose();
        if (selectedTask.sourceInfo?.route) {
            router.push(selectedTask.sourceInfo.route as any);
            return;
        }
        if (selectedTask.linkedModule?.route) {
            router.push(selectedTask.linkedModule.route as any);
            return;
        }
        if (selectedTask.linkedModule?.target === 'people') {
            router.push('/(tabs)/home/people' as any);
            return;
        }
        if (selectedTask.linkedModule?.target === 'resources') {
            router.push('/(tabs)/home/resources' as any);
            return;
        }
        if (selectedTask.linkedModule?.target === 'clock') {
            router.push('/(tabs)/home/clock-module' as any);
            return;
        }
        if (selectedTask.linkedModule?.target === 'report') {
            router.push('/(tabs)/home/report' as any);
            return;
        }
        router.push('/(tabs)/home/finance' as any);
    };

    const sendMessage = async (text: string) => {
        if (!selectedTask) return;
        if (!text.trim()) return;

        const newComment = await addTaskCommentApi(selectedTask.id, text.trim());
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

    const handleSendMessage = () => {
        if (!messageText.trim()) return;
        sendMessage(messageText);
        setMessageText('');
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent':
                return '#FF3B30';
            case 'high':
                return '#FF9500';
            case 'medium':
            case 'low':
            default:
                return '#8E8E93';
        }
    };

    const getStatusStyles = (s: string) => {
        switch (s) {
            case 'in_progress': return { color: '#5856D6', label: 'In Progress' };
            case 'submitted': return { color: '#007AFF', label: 'Submitted' };
            case 'revision': return { color: '#FF9500', label: 'Revision' };
            case 'done': return { color: '#34C759', label: 'Done' };
            default: return { color: '#8E8E93', label: 'To Do' };
        }
    };

    const statusStyle = getStatusStyles(selectedTask?.status ?? 'todo');
    const priorityColor = getPriorityColor(selectedTask?.priority ?? 'medium');
    const isRevisionTask = !!selectedTask?.revisionRequest || selectedTask?.title.startsWith('Revise ');

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened && !!selectedTask}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                {!selectedTask ? (
                    <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background(sheetBg)]}>
                        <Spacer />
                    </VStack>
                ) : (
                <ZStack>
                    {showFinanceDrawer ? (
                        <VStack spacing={0} modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background(sheetBg)
                        ]}>
                            {/* In-drawer Finance Detail Header */}
                            <HStack alignment="center" spacing={12} modifiers={[padding({ top: 18, leading: 18, trailing: 18, bottom: 10 })]}>
                                <Button
                                    variant="glass"
                                    color="#007AFF"
                                    onPress={() => setShowFinanceDrawer(false)}
                                    modifiers={[frame({ height: 34 }), cornerRadius(17)]}
                                >
                                    <HStack alignment="center" spacing={4} modifiers={[padding({ horizontal: 10 })]}>
                                        <Image systemName="chevron.backward" size={13} color="#007AFF" />
                                        <SwiftUIText size={13} weight="semibold" color="#007AFF">Back to Task</SwiftUIText>
                                    </HStack>
                                </Button>
                                <Spacer />
                                <SwiftUIText size={16} weight="bold" color={textColor}>
                                    {selectedTask.moduleDetails?.documentNumber || selectedTask.title.replace(/^Revise\s+/i, '')}
                                </SwiftUIText>
                                <Spacer />
                                <Button
                                    systemImage="xmark"
                                    role="cancel"
                                    color="gray"
                                    onPress={onClose}
                                />
                            </HStack>

                            <Form modifiers={[background(sheetBg)]}>
                                <Section title="Document Information">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Document Type</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">
                                            {selectedTask.moduleDetails?.documentType || 'Purchase Request'}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                        <Spacer />
                                        <HStack modifiers={[
                                            padding({ horizontal: 10, vertical: 4 }),
                                            background('rgba(255, 149, 0, 0.15)'),
                                            cornerRadius(12)
                                        ]}>
                                            <SwiftUIText size={12} weight="bold" color="#FF9500">
                                                Need Revision
                                            </SwiftUIText>
                                        </HStack>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Department</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {selectedTask.moduleDetails?.department || 'Construction'}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {`${selectedTask.projectCode || 'PRG'} · ${selectedTask.project || 'Precision Gym'}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Target Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {selectedTask.moduleDetails?.targetDate || '15 Sep 2026'}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Financial Breakdown">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Total Amount</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={17} weight="bold" color="#007AFF">
                                            {`${selectedTask.moduleDetails?.currency || 'IDR'} ${(selectedTask.moduleDetails?.requestedAmount || 45000000).toLocaleString('id-ID')}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Vendor / Payee</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">
                                            PT Semen Indonesia
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Payment Method</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            Bank Transfer · BCA
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Items & Scope">
                                    <VStack spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                        <HStack>
                                            <SwiftUIText weight="semibold" color={textColor}>
                                                {selectedTask.moduleDetails?.itemsSummary || 'Portland Cement Grade A · 500 bags'}
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor} size={13}>
                                                500 bags × IDR 90.000
                                            </SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} size={14} weight="medium">
                                                {`${selectedTask.moduleDetails?.currency || 'IDR'} ${(selectedTask.moduleDetails?.requestedAmount || 45000000).toLocaleString('id-ID')}`}
                                            </SwiftUIText>
                                        </HStack>
                                    </VStack>
                                </Section>

                                {selectedTask.revisionRequest && (
                                    <Section title="Revision Note from Approver">
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor} size={12}>
                                                {`${selectedTask.revisionRequest.requestedBy} · ${selectedTask.revisionRequest.requestedAt}`}
                                            </SwiftUIText>
                                            <SwiftUIText color="#FF9500" size={14} weight="medium">
                                                {`"${selectedTask.revisionRequest.note}"`}
                                            </SwiftUIText>
                                        </VStack>
                                    </Section>
                                )}

                                <Section title="Approval History">
                                    <HStack alignment="center" spacing={10} modifiers={[padding({ vertical: 4 })]}>
                                        <Image systemName="exclamationmark.circle.fill" size={16} color="#FF9500" />
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={13} weight="semibold" color={textColor}>
                                                1. Project Manager · Andi Wijaya
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color="#FF9500">
                                                Requested Revision · 13 Sep 2026, 15:20
                                            </SwiftUIText>
                                        </VStack>
                                    </HStack>
                                    <HStack alignment="center" spacing={10} modifiers={[padding({ vertical: 4 })]}>
                                        <Image systemName="clock" size={16} color={subtextColor} />
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={13} weight="semibold" color={subtextColor}>
                                                2. Technical Director · Bambang Sudiro
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color={subtextColor}>
                                                Pending
                                            </SwiftUIText>
                                        </VStack>
                                    </HStack>
                                </Section>
                            </Form>

                            {/* Module Bottom Action */}
                            <VStack spacing={8} modifiers={[padding({ horizontal: 20, top: 12, bottom: 22 }), background(sheetBg)]}>
                                <Button
                                    variant="glassProminent"
                                    color="#007AFF"
                                    onPress={handleDeepLinkNavigation}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                        <Spacer />
                                        <Image systemName="arrow.right.circle" size={16} color="#FFFFFF" />
                                        <SwiftUIText weight="bold" size={16} color="#FFFFFF">
                                            {selectedTask.linkedModule?.actionLabel || (selectedTask.linkedModule?.target === 'people' ? 'Open in People' : 'Open in Module')}
                                        </SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </VStack>
                        </VStack>
                    ) : (
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg)
                    ]}>
                    {/* Header with Title only */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {selectedTask.title}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form Content */}
                    <Form modifiers={[background(sheetBg)]}>
                        {/* 1. TASK INFORMATION */}
                        <Section title="Task Information">
                            <HStack>
                                <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                <Spacer />
                                <HStack spacing={6} alignment="center">
                                    <HStack modifiers={[
                                        padding({ horizontal: 8, vertical: 4 }),
                                        background(isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                                        cornerRadius(12)
                                    ]}>
                                        <SwiftUIText size={11} weight="bold" color={textColor}>
                                            {selectedTask.projectCode || 'PRG'}
                                        </SwiftUIText>
                                    </HStack>
                                    <SwiftUIText color={textColor} weight="medium">
                                        {selectedTask.project || 'Precision Gym'}
                                    </SwiftUIText>
                                </HStack>
                            </HStack>

                            <HStack>
                                <SwiftUIText color={subtextColor}>Source</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {sourceIndicatorText || 'General'}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText color={subtextColor}>Deadline</SwiftUIText>
                                <Spacer />
                                <VStack alignment="trailing" spacing={2}>
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {deadlineInfo.formattedDate}
                                    </SwiftUIText>
                                    {!!deadlineInfo.targetHealthNote && (
                                        <SwiftUIText size={12} color={deadlineInfo.isAtRisk ? '#FF3B30' : subtextColor}>
                                            {deadlineInfo.targetHealthNote}
                                        </SwiftUIText>
                                    )}
                                </VStack>
                            </HStack>

                            {!!selectedTask.priority && (
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Priority</SwiftUIText>
                                    <Spacer />
                                    <HStack modifiers={[
                                        padding({ horizontal: 10, vertical: 4 }),
                                        background(priorityColor + '20'),
                                        cornerRadius(12)
                                    ]}>
                                        <SwiftUIText size={12} weight="bold" color={priorityColor}>
                                            {((selectedTask.priority || 'medium').charAt(0).toUpperCase() + (selectedTask.priority || 'medium').slice(1))}
                                        </SwiftUIText>
                                    </HStack>
                                </HStack>
                            )}

                            <HStack>
                                <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                <Spacer />
                                <HStack modifiers={[
                                    padding({ horizontal: 10, vertical: 4 }),
                                    background(statusStyle.color + '20'),
                                    cornerRadius(12)
                                ]}>
                                    <SwiftUIText size={12} weight="bold" color={statusStyle.color}>
                                        {statusStyle.label}
                                    </SwiftUIText>
                                </HStack>
                            </HStack>
                        </Section>

                        {/* 2. REVISION REQUEST SECTION (Free-form Revision Note only, no Approver Attachment) */}
                        {selectedTask.revisionRequest ? (
                            <Section title="Revision Request">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Requested By</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {selectedTask.revisionRequest.requestedBy}
                                    </SwiftUIText>
                                </HStack>

                                <HStack>
                                    <SwiftUIText color={subtextColor}>Requested At</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {selectedTask.revisionRequest.requestedAt}
                                    </SwiftUIText>
                                </HStack>

                                <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIText color={subtextColor} size={13}>Revision Note</SwiftUIText>
                                    <SwiftUIText color={textColor} size={15} weight="medium">
                                        {`"${selectedTask.revisionRequest.note}"`}
                                    </SwiftUIText>
                                </VStack>
                            </Section>
                        ) : (
                            <>
                                {!!selectedTask.description && (
                                    <Section title="Description">
                                        <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                            {selectedTask.description}
                                        </SwiftUIText>
                                    </Section>
                                )}
                                {!selectedTask.isSystemGenerated && selectedTask.checklistItems && selectedTask.checklistItems.length > 0 && (
                                    <Section title={`Checklist (${selectedTask.checklistItems.filter(item => item.isChecked).length}/${selectedTask.checklistItems.length})`}>
                                        {selectedTask.checklistItems.map(item => (
                                            <HStack key={item.id} alignment="center" spacing={12} modifiers={[padding({ vertical: 4 })]}>
                                                <Image 
                                                    systemName={item.isChecked ? "checkmark.square.fill" : "square"} 
                                                    size={18} 
                                                    color={item.isChecked ? "#007AFF" : textColor} 
                                                />
                                                <SwiftUIText color={item.isChecked ? subtextColor : textColor}>
                                                    {item.title}
                                                </SwiftUIText>
                                            </HStack>
                                        ))}
                                    </Section>
                                )}
                            </>
                        )}

                        {/* 3. MODULE DETAILS (Render only if task is linked to an external module) */}
                        {Boolean(selectedTask.moduleDetails || (selectedTask.linkedModule && selectedTask.linkedModule.target !== 'project')) && (
                            <Section title="Module Details">
                                <VStack spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>
                                            {selectedTask.moduleDetails?.documentType || (
                                                selectedTask.linkedModule?.target === 'finance' ? 'Finance Document' :
                                                selectedTask.linkedModule?.target === 'clock' ? 'Clock & Attendance' :
                                                selectedTask.linkedModule?.target === 'resources' ? 'Resources & Procurement' :
                                                selectedTask.linkedModule?.target === 'people' ? 'People & HR' :
                                                selectedTask.linkedModule?.target === 'report' ? 'Daily / Progress Report' :
                                                selectedTask.linkedModule?.target === 'crew' ? 'Crew & Field' :
                                                selectedTask.linkedModule?.target === 'project' ? 'Project Workspace' :
                                                selectedTask.linkedModule?.target === 'tracking' ? 'Tracking Milestone' :
                                                selectedTask.linkedModule?.target === 'forma_ai' ? 'Forma AI' :
                                                'Linked Module'
                                            )}
                                        </SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="bold">
                                            {selectedTask.moduleDetails?.documentNumber || selectedTask.title.replace(/^Revise\s+/i, '')}
                                        </SwiftUIText>
                                    </HStack>

                                    {selectedTask.moduleDetails?.requestedAmount !== undefined && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Requested Amount</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} weight="bold">
                                                {`${selectedTask.moduleDetails.currency || 'IDR'} ${selectedTask.moduleDetails.requestedAmount.toLocaleString()}`}
                                            </SwiftUIText>
                                        </HStack>
                                    )}

                                    {!!selectedTask.moduleDetails?.itemsSummary && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Items</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} size={14}>
                                                {selectedTask.moduleDetails.itemsSummary}
                                            </SwiftUIText>
                                        </HStack>
                                    )}

                                    {/* View Detail & Linked Action */}
                                    {selectedTask.linkedModule && (
                                        <HStack spacing={10} modifiers={[padding({ top: 8 })]}>
                                            {selectedTask.linkedModule.target === 'finance' && (
                                                <Button
                                                    variant="glass"
                                                    color="#007AFF"
                                                    onPress={() => setShowFinanceDrawer(true)}
                                                    modifiers={[frame({ maxWidth: Infinity, height: 36 }), cornerRadius(10)]}
                                                >
                                                    <HStack alignment="center" spacing={6}>
                                                        <Image systemName="doc.text.magnifyingglass" size={13} color="#007AFF" />
                                                        <SwiftUIText size={13} weight="semibold" color="#007AFF">View Detail</SwiftUIText>
                                                    </HStack>
                                                </Button>
                                            )}
                                            <Button
                                                variant="glass"
                                                color="#007AFF"
                                                onPress={handleDeepLinkNavigation}
                                                modifiers={[frame({ maxWidth: Infinity, height: 36 }), cornerRadius(10)]}
                                            >
                                                <HStack alignment="center" spacing={6}>
                                                    <Image systemName="arrow.right.circle" size={13} color="#007AFF" />
                                                    <SwiftUIText size={13} weight="semibold" color="#007AFF">
                                                        {selectedTask.linkedModule.actionLabel || (selectedTask.linkedModule.target === 'people' ? 'Open in People' : 'Open in Module')}
                                                    </SwiftUIText>
                                                </HStack>
                                            </Button>
                                        </HStack>
                                    )}
                                </VStack>
                            </Section>
                        )}

                        {/* 4. DISCUSSION */}
                        <Section title="Discussion">
                            {selectedTask.status === 'todo' ? (
                                <HStack spacing={10} alignment="center" modifiers={[
                                    padding({ all: 12 }),
                                    background(isDark ? '#2C2C2E' : '#F2F2F7'),
                                    cornerRadius(12),
                                    frame({ maxWidth: Infinity })
                                ]}>
                                    <Image systemName="lock.fill" size={14} color={subtextColor} />
                                    <SwiftUIText color={subtextColor} size={13}>
                                        Start this task to participate in discussion.
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            ) : (
                                <>
                                    {discussionComments.length > 0 ? (
                                        <VStack spacing={8} modifiers={[padding({ vertical: 6 })]}>
                                            {discussionComments.map(comment => {
                                                const isMe = comment.role === 'staff';
                                                return (
                                                    <HStack key={comment.id} modifiers={[frame({ maxWidth: Infinity })]}>
                                                        {isMe && <Spacer />}
                                                        <VStack
                                                            alignment={isMe ? 'trailing' : 'leading'}
                                                            modifiers={[padding({ vertical: 2 })]}
                                                        >
                                                            {!isMe && (
                                                                <SwiftUIText size={11} weight="semibold" color={subtextColor} modifiers={[padding({ leading: 4, bottom: 2 })]}>
                                                                    {comment.author}
                                                                </SwiftUIText>
                                                            )}
                                                            <VStack modifiers={[
                                                                padding({ vertical: 8, horizontal: 14 }),
                                                                background(isMe ? '#007AFF' : (isDark ? '#3A3A3C' : '#E9E9EB')),
                                                                cornerRadius(16),
                                                            ]}>
                                                                <SwiftUIText color={isMe ? '#FFFFFF' : textColor} size={15}>
                                                                    {comment.text}
                                                                </SwiftUIText>
                                                            </VStack>
                                                            <HStack spacing={4} modifiers={[padding({ horizontal: 4, top: 2 })]}>
                                                                <SwiftUIText size={9} color={subtextColor}>
                                                                    {comment.timestamp.includes('T') ? new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (comment.timestamp.split('·')[1]?.trim() || comment.timestamp)}
                                                                </SwiftUIText>
                                                            </HStack>
                                                        </VStack>
                                                        {!isMe && <Spacer />}
                                                    </HStack>
                                                );
                                            })}
                                        </VStack>
                                    ) : (
                                        <HStack spacing={10} alignment="center" modifiers={[
                                            padding({ all: 12 }),
                                            background(isDark ? '#2C2C2E' : '#F2F2F7'),
                                            cornerRadius(12),
                                            frame({ maxWidth: Infinity })
                                        ]}>
                                            <Image systemName="bubble" size={16} color={subtextColor} />
                                            <SwiftUIText color={subtextColor} size={13}>
                                                No discussion messages yet.
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    )}
                                </>
                            )}
                        </Section>
                    </Form>

                    {/* Chat input footer (only active when In Progress) */}
                    {selectedTask.status === 'in_progress' && (
                        <HStack spacing={8} alignment="center" modifiers={[
                            padding({ horizontal: 20, vertical: 8 }),
                            background(isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
                            cornerRadius(24),
                            padding({ horizontal: 20, top: 4, bottom: 8 })
                        ]}>
                            <TextField
                                placeholder="Send Message..."
                                defaultValue={messageText}
                                onChangeText={setMessageText}
                                modifiers={[frame({ maxWidth: Infinity }), tint('#007AFF')]}
                            />
                            <Button
                                systemImage="arrow.up.circle.fill"
                                color="#007AFF"
                                onPress={handleSendMessage}
                                modifiers={[frame({ width: 32, height: 32 })]}
                            />
                        </HStack>
                    )}

                    {/* Bottom CTA Row */}
                    <VStack spacing={12} modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 22 }),
                        background(sheetBg)
                    ]}>
                        {selectedTask.status === 'todo' && (
                            <Button
                                variant="glassProminent"
                                color="#007AFF"
                                onPress={() => handleAction('start')}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="bold" size={17} color="#FFFFFF">Start Task</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        {selectedTask.status === 'in_progress' && (
                            selectedTask.isSystemGenerated ? (
                                <Button
                                    variant="glassProminent"
                                    color="#007AFF"
                                    onPress={handleDeepLinkNavigation}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                        <Spacer />
                                        <SwiftUIText weight="bold" size={17} color="#FFFFFF">
                                            {selectedTask.linkedModule?.actionLabel || (selectedTask.linkedModule?.target === 'people' ? 'Open in People' : (isRevisionTask ? 'Revise in Finance' : 'Open in Module'))}
                                        </SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            ) : (
                                <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                                    {selectedTask.linkedModule && (
                                        <Button
                                            variant="glass"
                                            color="#007AFF"
                                            onPress={handleDeepLinkNavigation}
                                            modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                        >
                                            <HStack alignment="center" spacing={6} modifiers={[frame({ height: 42 })]}>
                                                <Spacer />
                                                <SwiftUIText weight="semibold" size={15} color="#007AFF">
                                                    {selectedTask.linkedModule.actionLabel || (selectedTask.linkedModule.target === 'people' ? 'Open in People' : 'Open in Module')}
                                                </SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    )}
                                    <Button
                                        variant="glassProminent"
                                        color="#34C759"
                                        onPress={() => handleAction('approve')}
                                        modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                    >
                                        <HStack alignment="center" spacing={6} modifiers={[frame({ height: 42 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="bold" size={15} color="#FFFFFF">Mark as Done</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </HStack>
                            )
                        )}

                        {selectedTask.status === 'done' && (
                            <HStack alignment="center" spacing={8} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 }),
                                background(isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.08)'),
                                cornerRadius(999)
                            ]}>
                                <Spacer />
                                <Image systemName="checkmark.seal.fill" size={18} color="#34C759" />
                                <SwiftUIText size={15} weight="bold" color="#34C759">Task Completed</SwiftUIText>
                                <Spacer />
                            </HStack>
                        )}
                    </VStack>
                    </VStack>
                    )}

                {/* Preview Sheet */}
                <BottomSheet
                    isOpened={!!activeDocUrl}
                    presentationDetents={[0.85]}
                    onIsOpenedChange={(opened) => {
                        if (!opened) setActiveDocUrl(null);
                    }}
                >
                    <VStack spacing={16} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                        padding({ all: 20 })
                    ]}>
                        <HStack alignment="center">
                            <SwiftUIText size={20} weight="bold" color={textColor}>{activeDocTitle}</SwiftUIText>
                            <Spacer />
                            <HStack spacing={12}>
                                <Button
                                    systemImage="square.and.arrow.up"
                                    variant="glass"
                                    color="gray"
                                    onPress={() => handleDownloadFileDirect(activeDocUrl!)}
                                    disabled={isDownloading}
                                />
                                <Button
                                    systemImage="xmark"
                                    role="cancel"
                                    variant="glass"
                                    color="gray"
                                    onPress={() => setActiveDocUrl(null)}
                                />
                            </HStack>
                        </HStack>

                        {activeDocUrl ? (
                            <VStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
                                <View style={{ width: SCREEN_WIDTH * 0.9, height: SCREEN_HEIGHT * 0.60, borderRadius: 24, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' }}>
                                    <RNImage
                                        source={{ uri: activeDocUrl }}
                                        style={{ width: SCREEN_WIDTH * 0.88, height: SCREEN_HEIGHT * 0.58 }}
                                        resizeMode="contain"
                                    />
                                </View>
                            </VStack>
                        ) : (
                            <Spacer />
                        )}
                    </VStack>
                </BottomSheet>
                </ZStack>
                )}
            </BottomSheet>
        </Host>
    );
});


