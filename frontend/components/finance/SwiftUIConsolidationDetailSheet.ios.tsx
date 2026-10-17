import React, { useState } from 'react';
import { Alert, Dimensions, View } from 'react-native';
import {
    BottomSheet,
    Button,
    Form,
    Host,
    HStack,
    Section,
    Spacer,
    TextField,
    Text as SwiftUIText,
    VStack,
    ZStack,
} from '@expo/ui/swift-ui';
import { background, cornerRadius, foregroundColor, frame, ignoreSafeArea, padding } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { getConsolidationRequestIssues, PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { formatDepartmentCode, generateDocumentCode } from '@/lib/api/financeSetup';
import { useFinance } from '@/context/FinanceContext';
import { useUserContext } from '@/context/UserProvider';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { getFinanceStatusColor } from '@/lib/financeStatusPresentation';

interface SwiftUIConsolidationDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
    onOpenAddRequests?: () => void;
    onOpenRequest?: (request: any) => void;
    onOpenPayModal?: (consolidation: PurchasingConsolidationItem) => void;
    isPaymentMode?: boolean;
}

function formatCurrency(amount: number) {
    const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('IDR', 'Rp');
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function getRequestStatus(request: any) {
    if (request.financial_status === 'PAID' || request.status === 'Paid') return 'Paid';
    if (request.approval_status === 'APPROVED') return 'Approved';
    if (request.approval_status === 'SUBMITTED') return 'Pending';
    return request.status || 'Approved';
}

function getRequestBadges(request: any) {
    const project = typeof request.project === 'string' ? request.project : request.project?.project_code;
    const codes = [
        formatDepartmentCode(request.department?.code || request.department_code),
        formatDepartmentCode(request.project_obj?.project_code || project),
    ].filter(Boolean);
    return [...new Set(codes)];
}

export const SwiftUIConsolidationDetailSheet: React.FC<SwiftUIConsolidationDetailSheetProps> = ({
    isOpened,
    onClose,
    consolidation,
    onOpenAddRequests,
    onOpenRequest,
    isPaymentMode = false,
}) => {
    const { resolvedTheme } = useTheme();
    const {
        documentRules,
        submitConsolidation,
        cancelConsolidation,
        deleteConsolidation,
        cancelConsolidationSubmission,
        cancelConsolidationApproval,
        approveConsolidation,
        rejectConsolidation,
        reviseConsolidation,
    } = useFinance();
    const { profile, user } = useUserContext();
    const [isFullDetent, setIsFullDetent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isApprovalConfirmationOpen, setIsApprovalConfirmationOpen] = useState(false);
    const [approvedAmountInput, setApprovedAmountInput] = useState('');
    const [approvalNote, setApprovalNote] = useState('');

    if (!consolidation) return null;

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#6E6E73';
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';
    const isDraft = ['Draft', 'Revision'].includes(consolidation.status);
    const isPending = consolidation.status === 'Pending';
    const isApproved = ['Approved', 'Paying', 'Partially Paid'].includes(consolidation.status);
    const isCancelled = consolidation.status === 'Cancelled';
    const displayStatus = isPaymentMode && consolidation.status === 'Approved' ? 'Pending' : consolidation.status;
    const requests = consolidation.requests || [];
    const incompleteRequests = requests.map(request => ({
        reference: request.shortRef || request.ref || request.cardRef || 'Request',
        issues: getConsolidationRequestIssues(request),
    })).filter(request => request.issues.length > 0);
    const sequence = consolidation.document_number?.match(/(\d+)$/)?.[1];
    const documentNumber = sequence
        ? generateDocumentCode('purchasing_consolidation', new Date(consolidation.created_at), Number(sequence), documentRules)
        : consolidation.document_number;
    const createdAudit = consolidation.audit_trail?.find(audit => audit.action === 'created');
    const submitter = consolidation.created_by_name || createdAudit?.actor_name || profile?.full_name || 'Unknown';
    const workflowHistory = (consolidation.audit_trail || []).filter(audit =>
        ['submitted', 'submission_cancelled', 'approval_level_approved', 'approval_cancelled', 'revision_requested', 'approved', 'rejected', 'cancelled'].includes(audit.action)
    );
    const paymentHistory = (consolidation.audit_trail || [])
        .filter(audit => audit.action === 'payment_batch_processed')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const approvalChain = consolidation.approval_chain || [];
    const completedApprovalLevels = new Set(
        (consolidation.audit_trail || [])
            .filter(audit => audit.action === 'approval_level_approved')
            .map(audit => Number(audit.details?.approval_level))
    );
    const currentApprovalIndex = approvalChain.findIndex((_, index) => !completedApprovalLevels.has(index));
    const currentApprover = approvalChain[currentApprovalIndex];
    const normalizedIdentity = [profile?.full_name, profile?.nickname, profile?.email, profile?.job_title, profile?.position, profile?.role]
        .map(value => String(value || '').toLowerCase().trim())
        .filter(Boolean);
    const matchesCurrentUser = (approver: any) => Boolean(approver && (
        approver.userId === user?.id
        || normalizedIdentity.includes(String(approver.personName || '').toLowerCase().trim())
        || normalizedIdentity.includes(String(approver.positionTitle || '').toLowerCase().trim())
    ));
    const canReview = isPending && matchesCurrentUser(currentApprover);
    const canCancelSubmission = isPending && consolidation.created_by === user?.id && !canReview;
    const canCancelApproval = consolidation.status === 'Approved' && matchesCurrentUser(approvalChain[approvalChain.length - 1]);

    const handleCancelConsolidation = () => {
        Alert.alert(
            'Withdraw Consolidation',
            'Are you sure you want to withdraw this consolidation? All included requests will be released back to the eligible pool.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await cancelConsolidation(consolidation.id);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to withdraw consolidation');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteConsolidation = () => {
        Alert.alert(
            'Delete Consolidation',
            'Are you sure you want to delete this consolidation? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await deleteConsolidation(consolidation.id);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete consolidation');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSubmit = async () => {
        if (requests.length === 0) {
            Alert.alert('Cannot Submit', 'Please add at least one request before submitting.');
            return;
        }
        setIsSubmitting(true);
        try {
            await submitConsolidation(consolidation.id);
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit consolidation');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelSubmission = () => Alert.alert(
        'Cancel Submission',
        'Return this Consolidation to Draft?',
        [
            { text: 'Keep Submitted', style: 'cancel' },
            {
                text: 'Cancel Submission',
                style: 'destructive',
                onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        await cancelConsolidationSubmission(consolidation.id);
                        onClose();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to cancel submission.');
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]
    );

    const handleCancelApproval = () => Alert.alert(
        'Cancel Approval',
        'Return this Consolidation to the final approval step?',
        [
            { text: 'Keep Approved', style: 'cancel' },
            {
                text: 'Cancel Approval',
                style: 'destructive',
                onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        await cancelConsolidationApproval(consolidation.id);
                        onClose();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to cancel approval.');
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]
    );

    const performApprove = async (approvedAmount?: number, approvalNote?: string) => {
        setIsSubmitting(true);
        try {
            await approveConsolidation(consolidation.id, currentApprovalIndex, approvalChain.length, approvedAmount, approvalNote);
            setIsApprovalConfirmationOpen(false);
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve Consolidation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = () => {
        setApprovedAmountInput(String(consolidation.approved_amount || consolidation.total_amount));
        setApprovalNote('');
        setIsApprovalConfirmationOpen(true);
    };

    const handleReviewWithReason = (action: 'Reject' | 'Revise') => Alert.prompt(
        `${action} Consolidation`,
        `Enter a reason to ${action.toLowerCase()} this Consolidation.`,
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: action,
                style: action === 'Reject' ? 'destructive' : 'default',
                onPress: async (reason?: string) => {
                    if (!reason?.trim()) {
                        Alert.alert('Reason Required', `Please provide a reason to ${action.toLowerCase()}.`);
                        return;
                    }
                    setIsSubmitting(true);
                    try {
                        if (action === 'Reject') await rejectConsolidation(consolidation.id, reason.trim());
                        else await reviseConsolidation(consolidation.id, reason.trim());
                        onClose();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} Consolidation.`);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ],
        'plain-text'
    );

    const approvalStatus = (index: number) => {
        if (isApproved || consolidation.status === 'Paid') return 'Approved';
        if (consolidation.status === 'Rejected') return 'Rejected';
        if (consolidation.status === 'Cancelled') return 'Cancelled';
        if (completedApprovalLevels.has(index)) return 'Approved';
        if (isPending) return index === currentApprovalIndex ? 'Pending' : 'Submitted';
        return 'Draft';
    };

    return (
        <>
            <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
                <BottomSheet
                    isOpened={isOpened}
                    presentationDetents={[0.85, 'large']}
                    presentationDragIndicator="visible"
                    onIsOpenedChange={(opened) => {
                        if (!opened) onClose();
                    }}
                >
                    <ZStack>
                        <View
                            pointerEvents="none"
                            onLayout={(event) => {
                                setIsFullDetent(event.nativeEvent.layout.height >= Dimensions.get('window').height * 0.88);
                            }}
                            style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: sheetBg }}
                        />
                        <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background(sheetBg)]}>
                            <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                                <SwiftUIText size={22} weight="bold" color={textColor}>{documentNumber}</SwiftUIText>
                                <Spacer />
                                <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={onClose} />
                            </HStack>

                            <NativeFinanceList backgroundColor={isDark ? '#000000' : '#FFFFFF'}>
                                {incompleteRequests.length > 0 ? (
                                    <Section title={`Incomplete Requests (${incompleteRequests.length})`}>
                                        {incompleteRequests.map(request => (
                                            <VStack key={request.reference} alignment="leading" spacing={3} modifiers={[padding({ vertical: 3 })]}>
                                                <SwiftUIText weight="bold" color="#FF3B30">{request.reference}</SwiftUIText>
                                                {request.issues.map(issue => <SwiftUIText key={issue} size={13} color="#FF3B30">{`• ${issue}`}</SwiftUIText>)}
                                            </VStack>
                                        ))}
                                    </Section>
                                ) : null}
                                <Section title="General Information">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Submitter</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">{submitter}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Consolidated Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{formatDate(consolidation.created_at)}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={getFinanceStatusColor(displayStatus, isDark)} weight="bold">{displayStatus}</SwiftUIText>
                                    </HStack>
                                    {consolidation.notes ? (
                                        <VStack alignment="leading" spacing={4}>
                                            <SwiftUIText color={subtextColor}>Notes</SwiftUIText>
                                            <SwiftUIText color={textColor}>{consolidation.notes}</SwiftUIText>
                                        </VStack>
                                    ) : null}
                                </Section>

                                <Section title="Summary">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Total Requests</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">{String(requests.length)}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Total Items</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor} weight="semibold">{String(consolidation.items_count)}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={16} color={textColor} weight="bold">Total Nominal</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={18} color="#007AFF" weight="bold">{formatCurrency(consolidation.total_amount)}</SwiftUIText>
                                    </HStack>
                                    {consolidation.approved_amount ? (
                                        <HStack>
                                            <SwiftUIText size={16} color={textColor} weight="bold">Approved Nominal</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText size={18} color="#34C759" weight="bold">{formatCurrency(consolidation.approved_amount)}</SwiftUIText>
                                        </HStack>
                                    ) : null}
                                </Section>

                                {isPaymentMode && (paymentHistory.length || consolidation.total_paid_amount > 0) ? (
                                    <Section title="Payment Details">
                                        <HStack><SwiftUIText color={subtextColor}>Workflow</SwiftUIText><Spacer /><SwiftUIText color={getFinanceStatusColor(consolidation.status === 'Paid' ? 'Paid' : 'Paying', isDark)} weight="bold">{consolidation.status === 'Paid' ? 'Paid' : 'Paying'}</SwiftUIText></HStack>
                                        <HStack><SwiftUIText color={subtextColor}>Paid</SwiftUIText><Spacer /><SwiftUIText color="#34C759" weight="semibold">{formatCurrency(consolidation.total_paid_amount)}</SwiftUIText></HStack>
                                        <HStack><SwiftUIText color={subtextColor}>Remaining</SwiftUIText><Spacer /><SwiftUIText color={consolidation.total_amount > consolidation.total_paid_amount ? '#FF9500' : '#34C759'} weight="semibold">{formatCurrency(Math.max(0, consolidation.total_amount - consolidation.total_paid_amount))}</SwiftUIText></HStack>
                                        {paymentHistory.map((payment, index) => (
                                            <VStack key={payment.id} alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                                <HStack><SwiftUIText weight="semibold" color={textColor}>{`Payment ${index + 1}`}</SwiftUIText><Spacer /><SwiftUIText weight="semibold" color={textColor}>{formatCurrency(Number(payment.details?.amount || 0))}</SwiftUIText></HStack>
                                                <HStack><SwiftUIText size={12} color={subtextColor}>Source of Funds</SwiftUIText><Spacer /><SwiftUIText size={12} color={textColor}>{payment.details?.source_of_fund_name || '-'}</SwiftUIText></HStack>
                                                <HStack><SwiftUIText size={12} color={subtextColor}>Pay Date</SwiftUIText><Spacer /><SwiftUIText size={12} color={textColor}>{formatDateTime(payment.created_at || payment.details?.payment_date)}</SwiftUIText></HStack>
                                                <VStack alignment="leading" spacing={2}><SwiftUIText size={12} color={subtextColor}>Payment Notes</SwiftUIText><SwiftUIText size={12} color={textColor}>{payment.details?.payment_notes || '-'}</SwiftUIText></VStack>
                                            </VStack>
                                        ))}
                                    </Section>
                                ) : null}

                                <Section title={`Included Requests (${requests.length})`}>
                                    {requests.length === 0 ? (
                                        <SwiftUIText color={subtextColor}>No requests in this consolidation.</SwiftUIText>
                                    ) : requests.map((request: any) => {
                                        const requestRef = request.shortRef || request.ref || request.cardRef || 'PR';
                                        const itemCount = request.items?.length || 1;
                                        const status = getRequestStatus(request);
                                        const badges = getRequestBadges(request);
                                        return (
                                            <Button key={request.id} variant="plain" onPress={() => onOpenRequest?.(request)}>
                                            <VStack alignment="leading" spacing={5} modifiers={[padding({ vertical: 4 }), frame({ maxWidth: Infinity })]}>
                                                <HStack alignment="center">
                                                    <SwiftUIText size={15} weight="semibold" color={textColor}>{requestRef}</SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText size={15} weight="semibold" color={textColor}>{formatCurrency(request.amount || 0)}</SwiftUIText>
                                                </HStack>
                                                <SwiftUIText size={13} color={textColor} lineLimit={2}>
                                                    {request.title || request.description || 'Purchase Request'}
                                                </SwiftUIText>
                                                <HStack alignment="center" spacing={6}>
                                                    {badges.map(code => (
                                                        <SwiftUIText
                                                            key={code}
                                                            size={10}
                                                            weight="bold"
                                                            color={subtextColor}
                                                            modifiers={[
                                                                padding({ vertical: 3, horizontal: 7 }),
                                                                background('rgba(142,142,147,0.12)'),
                                                                cornerRadius(10),
                                                            ]}
                                                        >
                                                            {code}
                                                        </SwiftUIText>
                                                    ))}
                                                    <SwiftUIText size={12} color={subtextColor}>
                                                        {`${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`}
                                                    </SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText size={12} weight="bold" color={getFinanceStatusColor(status, isDark)}>{status}</SwiftUIText>
                                                    {request._consolidationUpdated ? <SwiftUIText size={12} weight="bold" color="#FF9500">Updated</SwiftUIText> : null}
                                                </HStack>
                                            </VStack>
                                            </Button>
                                        );
                                    })}

                                    {isDraft && onOpenAddRequests ? (
                                        <Button variant="glass" color="#007AFF" onPress={onOpenAddRequests}>
                                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 38 })]}>
                                                <Spacer />
                                                <SwiftUIText size={15} weight="semibold" color="#007AFF">Add Request</SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    ) : null}
                                </Section>

                                {(consolidation.approval_chain?.length || workflowHistory.length) ? (
                                    <Section title="Approval Workflow">
                                        {(consolidation.approval_chain || []).map((tier, index) => {
                                            const status = approvalStatus(index);
                                            const approvalAudit = (consolidation.audit_trail || []).find(audit =>
                                                audit.action === 'approval_level_approved' && Number(audit.details?.approval_level) === index
                                            ) || (status === 'Approved' ? (consolidation.audit_trail || []).find(audit => audit.action === 'approved') : undefined);
                                            const terminalAudit = status === 'Rejected'
                                                ? (consolidation.audit_trail || []).find(audit => audit.action === 'rejected')
                                                : status === 'Cancelled'
                                                    ? (consolidation.audit_trail || []).find(audit => audit.action === 'cancelled')
                                                    : approvalAudit;
                                            const position = tier.positionTitle || 'Approver';
                                            return (
                                                <VStack key={tier.id || index} alignment="leading" spacing={5} modifiers={[padding({ vertical: 4 })]}>
                                                    <SwiftUIText size={14} weight="bold" color={textColor}>Consolidation Approval</SwiftUIText>
                                                    <HStack alignment="center">
                                                        <VStack alignment="leading" spacing={2}>
                                                            <SwiftUIText size={14} weight="semibold" color={textColor}>
                                                                {approvalChain.length > 1 ? `L${index + 1} · ${position}` : position}
                                                            </SwiftUIText>
                                                            <SwiftUIText size={12} color={subtextColor}>{tier.personName || 'Designated Role'}</SwiftUIText>
                                                        </VStack>
                                                        <Spacer />
                                                        <VStack alignment="trailing" spacing={2}>
                                                            <SwiftUIText size={12} weight="bold" color={getFinanceStatusColor(status, isDark)}>{status}</SwiftUIText>
                                                            {terminalAudit?.created_at ? <SwiftUIText size={11} color={subtextColor}>{formatDateTime(terminalAudit.created_at)}</SwiftUIText> : null}
                                                        </VStack>
                                                    </HStack>
                                                </VStack>
                                            );
                                        })}
                                        {consolidation.rejection_reason ? (
                                            <VStack alignment="leading" spacing={2} modifiers={[padding({ vertical: 2 })]}>
                                                <SwiftUIText size={13} weight="semibold" color="#FF3B30">Rejection Reason</SwiftUIText>
                                                <SwiftUIText size={12} color={textColor}>{consolidation.rejection_reason}</SwiftUIText>
                                            </VStack>
                                        ) : null}
                                    </Section>
                                ) : null}
                            </NativeFinanceList>

                            {isDraft || canCancelSubmission || canReview || canCancelApproval || isCancelled ? (
                                <VStack spacing={10} modifiers={[
                                    padding({ leading: 20, trailing: 20, top: 12, bottom: 34 }),
                                    background(sheetBg),
                                    frame({ maxWidth: Infinity }),
                                ]}>
                                    {isDraft ? (
                                        <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                                            <Button role="destructive" variant="glass" color="red" disabled={isSubmitting} onPress={handleCancelConsolidation}>
                                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                                    <Spacer />
                                                    <SwiftUIText size={17} weight="semibold" color="#FF3B30">Withdraw</SwiftUIText>
                                                    <Spacer />
                                                </HStack>
                                            </Button>
                                            <Button variant="glassProminent" color="#007AFF" disabled={isSubmitting || requests.length === 0} onPress={handleSubmit}>
                                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                                    <Spacer />
                                                    <SwiftUIText size={17} weight="semibold" color="#FFFFFF">
                                                        {isSubmitting ? 'Submitting...' : consolidation.status === 'Revision' ? 'Resubmit' : 'Submit'}
                                                    </SwiftUIText>
                                                    <Spacer />
                                                </HStack>
                                            </Button>
                                        </HStack>
                                    ) : null}

                                    {isCancelled ? (
                                        <Button role="destructive" variant="glass" color="red" disabled={isSubmitting} onPress={handleDeleteConsolidation}>
                                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                                <Spacer />
                                                <SwiftUIText size={17} weight="semibold" color="#FF3B30">
                                                    {isSubmitting ? 'Deleting...' : 'Delete Consolidation'}
                                                </SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    ) : null}

                                    {canCancelSubmission ? (
                                        <Button role="destructive" variant="glass" color="red" disabled={isSubmitting} onPress={handleCancelSubmission}>
                                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                                <Spacer /><SwiftUIText size={17} weight="semibold" color="#FF3B30">Cancel Submission</SwiftUIText><Spacer />
                                            </HStack>
                                        </Button>
                                    ) : null}

                                    {canReview ? (
                                        <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
                                            <Button role="destructive" variant="glass" color="red" disabled={isSubmitting} onPress={() => handleReviewWithReason('Reject')}>
                                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={15} weight="semibold" color="#FF3B30">Reject</SwiftUIText><Spacer /></HStack>
                                            </Button>
                                            <Button variant="glass" color="#FF9500" disabled={isSubmitting} onPress={() => handleReviewWithReason('Revise')}>
                                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={15} weight="semibold" color="#FF9500">Revise</SwiftUIText><Spacer /></HStack>
                                            </Button>
                                            <Button variant="glassProminent" color="#34C759" disabled={isSubmitting} onPress={handleApprove}>
                                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={15} weight="semibold" color="#FFFFFF">Approve</SwiftUIText><Spacer /></HStack>
                                            </Button>
                                        </HStack>
                                    ) : null}

                                    {canCancelApproval ? (
                                        <Button role="destructive" variant="glass" color="red" disabled={isSubmitting} onPress={handleCancelApproval}>
                                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                                <Spacer /><SwiftUIText size={17} weight="semibold" color="#FF3B30">Cancel Approval</SwiftUIText><Spacer />
                                            </HStack>
                                        </Button>
                                    ) : null}

                                </VStack>
                            ) : null}
                        </VStack>

                        <BottomSheet
                            isOpened={isApprovalConfirmationOpen}
                            presentationDetents={[0.65]}
                            onIsOpenedChange={opened => setIsApprovalConfirmationOpen(opened)}
                        >
                            <VStack spacing={14} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background('clear'), padding({ all: 20 })]}>
                                <HStack alignment="center">
                                    <SwiftUIText size={20} weight="bold" color={textColor}>Approve Consolidation</SwiftUIText>
                                    <Spacer />
                                    <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={() => setIsApprovalConfirmationOpen(false)} />
                                </HStack>
                                <Form modifiers={[background('clear'), foregroundColor(textColor)]}>
                                    {currentApprovalIndex === approvalChain.length - 1 ? (
                                        <Section title="Final Approved Amount">
                                            <TextField placeholder="Approved amount" defaultValue={approvedAmountInput} keyboardType="numeric" onChangeText={setApprovedAmountInput} />
                                        </Section>
                                    ) : null}
                                    <Section title="Approval Note (Optional)">
                                        <TextField placeholder="Add a note" defaultValue={approvalNote} onChangeText={setApprovalNote} />
                                    </Section>
                                </Form>
                                <Button
                                    variant="glassProminent"
                                    color="#34C759"
                                    disabled={isSubmitting}
                                    onPress={() => {
                                        const isFinalLevel = currentApprovalIndex === approvalChain.length - 1;
                                        const amount = Number(approvedAmountInput.replace(/[^0-9]/g, ''));
                                        if (isFinalLevel && !(amount > 0)) {
                                            Alert.alert('Invalid Amount', 'Enter a valid approved amount.');
                                            return;
                                        }
                                        performApprove(isFinalLevel ? amount : undefined, approvalNote.trim() || undefined);
                                    }}
                                    modifiers={[frame({ maxWidth: Infinity })]}
                                >
                                    <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                        <Spacer /><SwiftUIText size={17} weight="semibold" color="#FFFFFF">{isSubmitting ? 'Approving...' : 'Approve'}</SwiftUIText><Spacer />
                                    </HStack>
                                </Button>
                            </VStack>
                        </BottomSheet>
                    </ZStack>
                </BottomSheet>
            </Host>

        </>
    );
};
