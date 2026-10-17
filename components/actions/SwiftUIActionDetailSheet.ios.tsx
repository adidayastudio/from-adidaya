import React, { useState, useEffect, useMemo } from 'react';
import { Image as RNImage, Alert, Dimensions, View } from 'react-native';
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
    TextField
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Action, Task, TASKS } from '@/constants/MockData';
import { getTasks, getTaskComments, addTaskCommentApi, deleteActionApi, createTaskApi } from '@/lib/api/tasks';
import { SwiftUITransactionDetailSheet } from '@/components/finance/SwiftUITransactionDetailSheet';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

const formatCardDate = (dateStr: string) => {
    if (!dateStr) return '';
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
}

export const SwiftUIActionDetailSheet: React.FC<SwiftUIActionDetailSheetProps> = ({
    isOpened,
    onClose,
    action,
    onStatusChange,
    setActionsList,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';

    const [selectedAction, setSelectedAction] = useState<Action | null>(action);
    const [messageText, setMessageText] = useState('');
    const [showFinanceDrawer, setShowFinanceDrawer] = useState(false);
    const [actionComments, setActionComments] = useState<any[]>([]);

    // Document Preview
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState('Document Preview');
    const [isDownloading, setIsDownloading] = useState(false);

    const currentAction = action || selectedAction;

    useEffect(() => {
        if (action) {
            setSelectedAction(action);
            setMessageText('');
            setShowFinanceDrawer(false);
            setActiveDocUrl(null);
            setActionComments(action.comments || []);
        }
    }, [action]);

    const sourceIndicatorText = useMemo(() => {
        if (!currentAction) return '';
        if (currentAction.sourceInfo) {
            const mod = currentAction.sourceInfo.module ? currentAction.sourceInfo.module.charAt(0).toUpperCase() + currentAction.sourceInfo.module.slice(1) : '';
            const feat = currentAction.sourceInfo.feature ? currentAction.sourceInfo.feature.charAt(0).toUpperCase() + currentAction.sourceInfo.feature.slice(1) : '';
            return feat ? `${mod} · ${feat}` : mod;
        }
        if (currentAction.module === 'finance') return 'Finance · Purchasing';
        if (currentAction.module === 'resources') return 'Resources · Receiving';
        if (currentAction.module === 'people') return 'People · Employment';
        if (currentAction.module === 'clock') return 'Clock · Attendance';
        if (currentAction.module === 'report') return 'Reports · Daily Report';
        if (currentAction.module) {
            return currentAction.module.charAt(0).toUpperCase() + currentAction.module.slice(1);
        }
        return 'General Action';
    }, [currentAction]);

    const approvalStepText = useMemo(() => {
        if (!currentAction) return '1 of 1 · Approver';
        if (currentAction.approvalStep) {
            return `${currentAction.approvalStep.current} of ${currentAction.approvalStep.total} · ${currentAction.approvalStep.roleName}`;
        }
        return '2 of 3 · Project Manager';
    }, [currentAction]);

    const deadlineInfo = useMemo(() => {
        if (!currentAction) return { formattedDate: '', targetHealthNote: undefined, isAtRisk: false };

        const targetDate = currentAction.moduleDetails?.targetDate;

        if (currentAction.module === 'finance' || currentAction.sourceInfo?.module === 'finance' || (currentAction.title || '').startsWith('Approve ')) {
            const dateStr = formatCardDate(currentAction.date || '2026-09-14');
            const formatted = `${dateStr} · 12:00`;

            if (currentAction.priority === 'urgent' && currentAction.date === '2026-09-13') {
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

        const formatted = `${formatCardDate(currentAction.date)}${currentAction.date ? ' · 18:00' : ''}`;
        return {
            formattedDate: formatted,
            targetHealthNote: undefined,
            isAtRisk: false,
        };
    }, [currentAction]);

    const financeRequestData = useMemo(() => {
        if (!currentAction || currentAction.module !== 'finance') return null;
        const isReimbursement = currentAction.title.includes('RF-') || currentAction.title.includes('RP-') || currentAction.title.includes('RR-');
        const docNo = currentAction.moduleDetails?.documentNumber || currentAction.title.replace(/^(Approve|Review|Revise|Process|Prepare)\s+/i, '');
        const amount = currentAction.moduleDetails?.requestedAmount || currentAction.details?.amount || 45000000;
        return {
            id: `fin-req-${currentAction.id}`,
            document_number: docNo,
            request_number: docNo,
            title: currentAction.description || currentAction.title,
            description: currentAction.description,
            project_name: currentAction.project,
            project_code: currentAction.projectCode,
            amount: amount,
            currency: currentAction.moduleDetails?.currency || currentAction.details?.currency || 'IDR',
            status: currentAction.status === 'urgent' || currentAction.status === 'pending' ? 'submitted' : currentAction.status,
            date: currentAction.date || new Date().toISOString(),
            created_at: currentAction.date || new Date().toISOString(),
            requester: currentAction.requesterInfo?.name || currentAction.submitter || 'Budi Santoso',
            requester_name: currentAction.requesterInfo?.name || currentAction.submitter || 'Budi Santoso',
            department: currentAction.moduleDetails?.department || 'Construction',
            vendor_name: 'PT Semen Indonesia',
            items: currentAction.moduleDetails?.spendingItems || currentAction.details?.spendingItems || [
                { id: '1', name: currentAction.moduleDetails?.itemsSummary || 'Portland Cement Grade A · 500 bags', quantity: 500, unit_price: 90000, amount }
            ],
            attachments: currentAction.details?.invoiceUrl ? [{ uri: currentAction.details.invoiceUrl, name: 'Invoice_Attachment.pdf', type: 'file' }] : [],
            moduleType: isReimbursement ? 'reimbursement' : 'purchasing',
            approval_chain: [
                { level: 1, approver_name: 'Manu Travo (Site Director)', status: 'pending', is_current: true },
                { level: 2, approver_name: 'Head of Finance', status: 'upcoming', is_current: false }
            ]
        };
    }, [currentAction]);

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
                throw new Error(`Failed to download file, status: ${downloadResult.status}`);
            }

            if (isImage) {
                const { status } = await MediaLibrary.requestPermissionsAsync(true);
                if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                    Alert.alert('Success', 'Image saved to photo gallery!');
                } else if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri);
                }
            } else if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadResult.uri);
            }
        } catch (error: any) {
            Alert.alert('Download Error', error.message || 'Failed to download document.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !currentAction) return;
        const text = messageText.trim();
        setMessageText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newMessage = {
            id: Date.now().toString(),
            author: 'Manu Travo',
            text,
            timestamp: new Date().toISOString(),
            role: 'staff' as const
        };

        const updatedAction = {
            ...currentAction,
            comments: [...(currentAction.comments || []), newMessage]
        };

        setActionsList(prev => prev.map(a => a.id === currentAction.id ? updatedAction : a));
        setSelectedAction(updatedAction);
        setActionComments(prev => [...prev, newMessage]);
    };

    const handleDeepLinkNavigation = () => {
        if (!currentAction) return;
        onClose();
        if (currentAction.sourceInfo?.route) {
            router.push(currentAction.sourceInfo.route as any);
            return;
        }
        router.push('/(tabs)/home/finance' as any);
    };

    const handleApprovePress = () => {
        if (!currentAction) return;
        const docNo = currentAction.moduleDetails?.documentNumber || currentAction.title.replace(/^(Approve|Review)\s+/i, '');
        const amount = currentAction.moduleDetails?.requestedAmount || currentAction.details?.amount || 45000000;
        const formattedAmount = Number(amount).toLocaleString('id-ID');
        const subText = `${docNo} • ${currentAction.project || 'Precision Gym'}`;
        const isReimbursement = currentAction.title.includes('RF-') || currentAction.title.includes('RP-') || currentAction.sourceInfo?.recordType === 'reimbursement';

        if (!isReimbursement) {
            // Purchase Request approval with editable amount (identical to Finance)
            Alert.prompt(
                `Approve ${docNo}`,
                `${subText}\n\nAdjust if the approved amount differs from the requested total:`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Approve',
                        style: 'default',
                        onPress: (approvedAmountStr?: string) => {
                            const parsedAmount = parseInt(approvedAmountStr?.replace(/[^0-9]/g, '') || '', 10) || amount;
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onStatusChange(currentAction.id, 'completed', 'approve', parsedAmount);
                            onClose();
                        }
                    }
                ],
                'plain-text',
                formattedAmount,
                'numeric'
            );
        } else {
            // Reimbursement approval with full nominal display
            Alert.alert(
                `Approve ${docNo}`,
                `${subText}\n\nApprove the full reimbursement amount of Rp${formattedAmount}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Approve',
                        style: 'default',
                        onPress: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onStatusChange(currentAction.id, 'completed', 'approve');
                            onClose();
                        }
                    }
                ]
            );
        }
    };

    const handleRevisionPress = () => {
        if (!currentAction) return;
        const docNo = currentAction.moduleDetails?.documentNumber || currentAction.title.replace(/^(Approve|Review)\s+/i, '');
        const subText = `${docNo} • ${currentAction.project || 'Precision Gym'}`;
        Alert.prompt(
            'Request Revision',
            `${subText}\n\nExplain what needs to be revised:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    style: 'default',
                    onPress: async (note?: string) => {
                        if (!note || !note.trim()) {
                            Alert.alert('Revision Note Required', 'Please explain what needs to be revised.');
                            return;
                        }
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                        // Auto-generate linked Revision Task for the requester
                        await createTaskApi({
                            title: `Revise ${docNo}`,
                            projectId: currentAction.projectCode || 'PRG',
                            dueDate: currentAction.date || new Date().toISOString().split('T')[0],
                            dueTime: '12:00',
                            status: 'todo',
                            priority: 'urgent',
                            taskType: 'linked_module',
                            isSystemGenerated: true,
                            sourceInfo: {
                                module: 'finance',
                                feature: 'purchasing',
                                recordType: 'purchase_request',
                                recordNumber: docNo,
                                route: `/(tabs)/home/finance?requestId=req-${docNo.toLowerCase()}&requestType=purchasing&openEdit=true`,
                                actionType: 'revision',
                            },
                            revisionRequest: {
                                requestedBy: 'Manu Travo · Project Manager',
                                requestedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                note: note.trim(),
                            },
                            moduleDetails: {
                                documentNumber: docNo,
                                documentType: currentAction.moduleDetails?.documentType || 'Purchase Request',
                                requestedAmount: currentAction.moduleDetails?.requestedAmount || 45000000,
                                currency: currentAction.moduleDetails?.currency || 'IDR',
                                itemsSummary: currentAction.moduleDetails?.itemsSummary || 'Portland Cement Grade A · 500 bags',
                                department: currentAction.moduleDetails?.department || 'Construction',
                                targetDate: currentAction.moduleDetails?.targetDate || '15 Sep 2026'
                            },
                            linkedModule: {
                                target: 'finance',
                                actionLabel: 'Revise in Finance',
                                route: `/(tabs)/home/finance?requestId=req-${docNo.toLowerCase()}&requestType=purchasing&openEdit=true`
                            },
                            assignees: [{ id: '1', name: currentAction.requesterInfo?.name || currentAction.submitter || 'Requester' }]
                        }, ['1']);

                        onStatusChange(currentAction.id, 'revision', 'revision');
                        onClose();
                    }
                }
            ],
            'plain-text',
            '',
            'default'
        );
    };

    const handleRejectPress = () => {
        if (!currentAction) return;
        const docNo = currentAction.moduleDetails?.documentNumber || currentAction.title.replace(/^(Approve|Review)\s+/i, '');
        const subText = `${docNo} • ${currentAction.project || 'Precision Gym'}`;
        Alert.prompt(
            `Reject ${docNo}`,
            `${subText}\n\nExplain why this request is rejected:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: (reason?: string) => {
                        if (!reason || !reason.trim()) {
                            Alert.alert('Reject Reason Required', 'Please explain why this request is being rejected.');
                            return;
                        }
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        onStatusChange(currentAction.id, 'rejected', 'reject');
                        onClose();
                    }
                }
            ],
            'plain-text',
            '',
            'default'
        );
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent': return '#FF3B30';
            case 'high': return '#FF9500';
            case 'medium':
            case 'low':
            default: return '#8E8E93';
        }
    };

    const getStatusStyles = (s: Action['status']) => {
        switch (s) {
            case 'urgent': return { color: '#007AFF', label: 'Pending' };
            case 'pending': return { color: '#007AFF', label: 'Pending' };
            case 'completed': return { color: '#34C759', label: 'Approved' };
            case 'revision': return { color: '#FF9500', label: 'Revision' };
            case 'rejected': return { color: '#FF3B30', label: 'Rejected' };
            default: return { color: '#8E8E93', label: 'Pending' };
        }
    };

    const priorityColor = getPriorityColor(currentAction?.priority ?? 'urgent');
    const statusStyle = getStatusStyles(currentAction?.status ?? 'pending');
    const isPendingDecision = currentAction?.status === 'pending' || currentAction?.status === 'urgent';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened && !!currentAction}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                {!currentAction ? (
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
                                        <SwiftUIText size={13} weight="semibold" color="#007AFF">Back to Action</SwiftUIText>
                                    </HStack>
                                </Button>
                                <Spacer />
                                <SwiftUIText size={16} weight="bold" color={textColor}>
                                    {currentAction.moduleDetails?.documentNumber || currentAction.title.replace(/^(Approve|Review|Revise|Process|Prepare)\s+/i, '')}
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
                                <Section title="Document Overview">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Document Type</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">
                                            {currentAction.moduleDetails?.documentType || 'Purchase Request'}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                        <Spacer />
                                        <HStack modifiers={[
                                            padding({ horizontal: 10, vertical: 4 }),
                                            background('rgba(0, 122, 255, 0.15)'),
                                            cornerRadius(12)
                                        ]}>
                                            <SwiftUIText size={12} weight="bold" color="#007AFF">
                                                Pending Review
                                            </SwiftUIText>
                                        </HStack>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Department</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {currentAction.moduleDetails?.department || 'Construction'}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {`${currentAction.projectCode || 'PRG'} · ${currentAction.project || 'Precision Gym'}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Target Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="medium">
                                            {currentAction.moduleDetails?.targetDate || '15 Sep 2026'}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Financial Breakdown">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Total Amount</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={17} weight="bold" color="#007AFF">
                                            {`${currentAction.moduleDetails?.currency || 'IDR'} ${(currentAction.moduleDetails?.requestedAmount || 45000000).toLocaleString('id-ID')}`}
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
                                                {currentAction.moduleDetails?.itemsSummary || 'Portland Cement Grade A · 500 bags'}
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor} size={13}>
                                                500 bags × IDR 90.000
                                            </SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} size={14} weight="medium">
                                                {`${currentAction.moduleDetails?.currency || 'IDR'} ${(currentAction.moduleDetails?.requestedAmount || 45000000).toLocaleString('id-ID')}`}
                                            </SwiftUIText>
                                        </HStack>
                                    </VStack>
                                </Section>

                                <Section title="Approval Hierarchy">
                                    <HStack alignment="center" spacing={10} modifiers={[padding({ vertical: 4 })]}>
                                        <Image systemName="clock.fill" size={16} color="#007AFF" />
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={13} weight="semibold" color={textColor}>
                                                {approvalStepText}
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color="#007AFF">
                                                Pending your decision
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
                                            {currentAction.module === 'people' ? 'Open in People' : 'Open in Module'}
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
                    {/* Header with Title */}
                    <VStack spacing={2} modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <HStack alignment="center">
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                {currentAction.title}
                            </SwiftUIText>
                            <Spacer />
                            <Button
                                systemImage="xmark"
                                role="cancel"
                                color="gray"
                                onPress={onClose}
                            />
                        </HStack>
                    </VStack>

                    {/* Scrollable Form Content */}
                    <Form modifiers={[background(sheetBg)]}>
                        {/* 1. ACTION INFORMATION */}
                        <Section title="Action Information">
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
                                            {currentAction.projectCode || 'PRG'}
                                        </SwiftUIText>
                                    </HStack>
                                    <SwiftUIText color={textColor} weight="medium">
                                        {currentAction.project || 'Precision Gym'}
                                    </SwiftUIText>
                                </HStack>
                            </HStack>

                            <HStack>
                                <SwiftUIText color={subtextColor}>Source</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {sourceIndicatorText || 'Finance · Purchasing'}
                                </SwiftUIText>
                            </HStack>

                            <HStack>
                                <SwiftUIText color={subtextColor}>Approval Step</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {approvalStepText}
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

                            <HStack>
                                <SwiftUIText color={subtextColor}>Priority</SwiftUIText>
                                <Spacer />
                                <HStack modifiers={[
                                    padding({ horizontal: 10, vertical: 4 }),
                                    background(priorityColor + '20'),
                                    cornerRadius(12)
                                ]}>
                                    <SwiftUIText size={12} weight="bold" color={priorityColor}>
                                        {((currentAction.priority || 'urgent').charAt(0).toUpperCase() + (currentAction.priority || 'urgent').slice(1))}
                                    </SwiftUIText>
                                </HStack>
                            </HStack>

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

                        {/* 2. MODULE DETAILS (Render only if action is linked to an external module or has moduleDetails) */}
                        {Boolean(currentAction.moduleDetails || (currentAction.module && currentAction.module !== 'project')) && (
                            <Section title="Module Details">
                                <VStack spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>
                                            {currentAction.moduleDetails?.documentType || (
                                                currentAction.module === 'finance' ? 'Finance Document' :
                                                currentAction.module === 'clock' ? 'Clock & Attendance' :
                                                currentAction.module === 'resources' ? 'Resources & Procurement' :
                                                currentAction.module === 'people' ? 'People & HR' :
                                                currentAction.module === 'report' ? 'Daily / Progress Report' :
                                                currentAction.module === 'crew' ? 'Crew & Field' :
                                                currentAction.module === 'project' ? 'Project Workspace' :
                                                currentAction.module === 'tracking' ? 'Tracking Milestone' :
                                                currentAction.module === 'forma_ai' ? 'Forma AI' :
                                                'Linked Module'
                                            )}
                                        </SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="bold">
                                            {currentAction.moduleDetails?.documentNumber || currentAction.title}
                                        </SwiftUIText>
                                    </HStack>

                                    {currentAction.moduleDetails?.requestedAmount !== undefined && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Amount</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} weight="bold">
                                                {`${currentAction.moduleDetails.currency || 'IDR'} ${currentAction.moduleDetails.requestedAmount.toLocaleString()}`}
                                            </SwiftUIText>
                                        </HStack>
                                    )}

                                    {!!currentAction.moduleDetails?.itemsSummary && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Items</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} size={14}>
                                                {currentAction.moduleDetails.itemsSummary}
                                            </SwiftUIText>
                                        </HStack>
                                    )}

                                    {currentAction.moduleDetails?.targetDate && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Target Date</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>
                                                {currentAction.moduleDetails.targetDate}
                                            </SwiftUIText>
                                        </HStack>
                                    )}

                                    {/* View Detail & Linked Action */}
                                    {(currentAction.module || currentAction.deepLinkTarget) && (
                                        <HStack spacing={10} modifiers={[padding({ top: 8 })]}>
                                            {currentAction.module === 'finance' && (
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
                                                        {currentAction.module === 'people' ? 'Open in People' : 'Open in Module'}
                                                    </SwiftUIText>
                                                </HStack>
                                            </Button>
                                        </HStack>
                                    )}
                                </VStack>
                            </Section>
                        )}

                        {/* 3. DESCRIPTION */}
                        {!!currentAction.description && (
                            <Section title="Description">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {currentAction.description}
                                </SwiftUIText>
                            </Section>
                        )}

                        {/* 4. REQUESTED BY / SUBMITTER */}
                        <Section title="Requested By">
                            <HStack alignment="center" spacing={12} modifiers={[padding({ vertical: 4 })]}>
                                <HStack alignment="center" modifiers={[
                                    padding({ horizontal: 10, vertical: 6 }),
                                    background(isDark ? '#2C2C2E' : '#E5E5EA'),
                                    cornerRadius(14)
                                ]}>
                                    <SwiftUIText size={12} weight="bold" color={textColor}>
                                        {currentAction.requesterInfo?.avatar || 'BS'}
                                    </SwiftUIText>
                                </HStack>
                                <VStack spacing={2}>
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {currentAction.requesterInfo?.name || currentAction.submitter || 'Budi Santoso'}
                                    </SwiftUIText>
                                    <SwiftUIText color={subtextColor} size={13}>
                                        {`${currentAction.requesterInfo?.role || 'Site Engineer'} · ${currentAction.requesterInfo?.department || 'Construction'}`}
                                    </SwiftUIText>
                                </VStack>
                            </HStack>
                        </Section>

                        {/* 5. DISCUSSION */}
                        <Section title="Discussion">
                            {actionComments && actionComments.length > 0 ? (
                                <VStack spacing={8} modifiers={[padding({ vertical: 6 })]}>
                                    {actionComments.map(comment => {
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
                                                            {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        </Section>
                    </Form>

                    {/* Chat input footer */}
                    {isPendingDecision && (
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

                    {/* Sticky Bottom Actions */}
                    <VStack spacing={10} modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 22 }),
                        background(sheetBg)
                    ]}>
                        {isPendingDecision ? (
                            <VStack spacing={10}>
                                <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                                    <Button
                                        onPress={handleRejectPress}
                                        modifiers={[
                                            buttonStyle('glass'),
                                            frame({ maxWidth: Infinity }),
                                            background(isDark ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255, 59, 48, 0.15)'),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17} color="#FF3B30">Reject</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>

                                    <Button
                                        onPress={handleRevisionPress}
                                        modifiers={[
                                            buttonStyle('glass'),
                                            frame({ maxWidth: Infinity }),
                                            background(isDark ? 'rgba(255, 149, 0, 0.25)' : 'rgba(255, 149, 0, 0.15)'),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17} color="#FF9500">Revision</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </HStack>

                                <Button
                                    variant="glassProminent"
                                    color="#007AFF"
                                    onPress={handleApprovePress}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                        <Spacer />
                                        <SwiftUIText weight="bold" size={17} color="#FFFFFF">Approve</SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </VStack>
                        ) : (
                            <HStack alignment="center" spacing={8} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 }),
                                background(currentAction.status === 'completed' ? (isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.08)') : (isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.08)')),
                                cornerRadius(999)
                            ]}>
                                <Spacer />
                                <Image 
                                    systemName={currentAction.status === 'completed' ? "checkmark.seal.fill" : (currentAction.status === 'rejected' ? "xmark.circle.fill" : "arrow.uturn.backward.circle.fill")} 
                                    size={18} 
                                    color={currentAction.status === 'completed' ? "#34C759" : (currentAction.status === 'rejected' ? "#FF3B30" : "#FF9500")} 
                                />
                                <SwiftUIText size={15} weight="bold" color={currentAction.status === 'completed' ? "#34C759" : (currentAction.status === 'rejected' ? "#FF3B30" : "#FF9500")}>
                                    {currentAction.status === 'completed' ? 'Action Approved' : (currentAction.status === 'rejected' ? 'Request Rejected' : 'Revision Requested')}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        )}
                    </VStack>
                    </VStack>
                    )}
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
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
