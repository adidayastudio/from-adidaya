import React, { useState } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { useUserContext } from '@/context/UserProvider';
import { getConsolidationRequestIssues, PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { formatDepartmentCode, generateDocumentCode } from '@/lib/api/financeSetup';
import { getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export interface SwiftUIConsolidationDetailSheetProps {
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
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

export const SwiftUIConsolidationDetailSheet: React.FC<SwiftUIConsolidationDetailSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUIConsolidationDetailSheet.ios').SwiftUIConsolidationDetailSheet;
        return <Comp {...props} />;
    }

    const {
        isOpened,
        onClose,
        consolidation,
        onOpenAddRequests,
        onOpenRequest,
        isPaymentMode = false,
    } = props;

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isApprovalConfirmationOpen, setIsApprovalConfirmationOpen] = useState(false);
    const [approvedAmountInput, setApprovedAmountInput] = useState('');
    const [approvalNote, setApprovalNote] = useState('');

    if (!consolidation) return null;

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

    const isDraft = ['Draft', 'Revision'].includes(consolidation.status);
    const isPending = consolidation.status === 'Pending';
    const isApproved = ['Approved', 'Paying', 'Partially Paid'].includes(consolidation.status);
    const isCancelled = consolidation.status === 'Cancelled';
    const displayStatus = isPaymentMode && consolidation.status === 'Approved' ? 'Pending' : consolidation.status;
    const requests = consolidation.requests || [];
    const incompleteRequests = requests
        .map((request) => ({
            reference: request.shortRef || request.ref || request.cardRef || 'Request',
            issues: getConsolidationRequestIssues(request),
        }))
        .filter((request) => request.issues.length > 0);

    const sequence = consolidation.document_number?.match(/(\d+)$/)?.[1];
    const documentNumber = sequence
        ? generateDocumentCode('purchasing_consolidation', new Date(consolidation.created_at), Number(sequence), documentRules)
        : consolidation.document_number;

    const createdAudit = consolidation.audit_trail?.find((audit) => audit.action === 'created');
    const submitter = consolidation.created_by_name || createdAudit?.actor_name || profile?.full_name || 'Unknown';

    const approvalChain = consolidation.approval_chain || [];
    const completedApprovalLevels = new Set(
        (consolidation.audit_trail || [])
            .filter((audit) => audit.action === 'approval_level_approved')
            .map((audit) => Number(audit.details?.approval_level))
    );
    const currentApprovalIndex = approvalChain.findIndex((_, index) => !completedApprovalLevels.has(index));
    const currentApprover = approvalChain[currentApprovalIndex];

    const normalizedIdentity = [
        profile?.full_name,
        profile?.nickname,
        profile?.email,
        profile?.job_title,
        profile?.position,
        profile?.role,
    ]
        .map((val) => String(val || '').toLowerCase().trim())
        .filter(Boolean);

    const matchesCurrentUser = (approver: any) =>
        Boolean(
            approver &&
                (approver.userId === user?.id ||
                    normalizedIdentity.includes(String(approver.personName || '').toLowerCase().trim()) ||
                    normalizedIdentity.includes(String(approver.positionTitle || '').toLowerCase().trim()))
        );

    const canReview = isPending && matchesCurrentUser(currentApprover);
    const canCancelSubmission = isPending && consolidation.created_by === user?.id && !canReview;
    const canCancelApproval =
        consolidation.status === 'Approved' && matchesCurrentUser(approvalChain[approvalChain.length - 1]);

    const handleCancelConsolidation = () => {
        const doWithdraw = async () => {
            setIsSubmitting(true);
            try {
                await cancelConsolidation(consolidation.id);
                onClose();
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(error.message || 'Failed to withdraw consolidation');
                } else {
                    Alert.alert('Error', error.message || 'Failed to withdraw consolidation');
                }
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to withdraw this consolidation? All included requests will be released back to the eligible pool.')) {
                doWithdraw();
            }
        } else {
            Alert.alert(
                'Withdraw Consolidation',
                'Are you sure you want to withdraw this consolidation? All included requests will be released back to the eligible pool.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Withdraw',
                        style: 'destructive',
                        onPress: doWithdraw,
                    },
                ]
            );
        }
    };

    const handleDeleteConsolidation = () => {
        const doDelete = async () => {
            setIsSubmitting(true);
            try {
                await deleteConsolidation(consolidation.id);
                onClose();
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(error.message || 'Failed to delete consolidation');
                } else {
                    Alert.alert('Error', error.message || 'Failed to delete consolidation');
                }
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this consolidation? This action cannot be undone.')) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Delete Consolidation',
                'Are you sure you want to delete this consolidation? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: doDelete,
                    },
                ]
            );
        }
    };

    const handleSubmit = async () => {
        if (requests.length === 0) {
            const msg = 'Please add at least one request before submitting.';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Cannot Submit', msg);
            }
            return;
        }

        const doSubmit = async () => {
            setIsSubmitting(true);
            try {
                await submitConsolidation(consolidation.id);
                onClose();
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(error.message || 'Failed to submit consolidation');
                } else {
                    Alert.alert('Error', error.message || 'Failed to submit consolidation');
                }
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Submit ${documentNumber || 'this consolidation'} for approval?`)) {
                doSubmit();
            }
        } else {
            Alert.alert(
                'Submit Consolidation',
                `Submit ${documentNumber || 'this consolidation'} for approval?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Submit',
                        onPress: doSubmit,
                    },
                ]
            );
        }
    };

    const handleCancelSubmission = () => {
        const doCancel = async () => {
            setIsSubmitting(true);
            try {
                await cancelConsolidationSubmission(consolidation.id);
                onClose();
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(error.message || 'Failed to cancel submission.');
                } else {
                    Alert.alert('Error', error.message || 'Failed to cancel submission.');
                }
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Return this Consolidation to Draft?')) {
                doCancel();
            }
        } else {
            Alert.alert('Cancel Submission', 'Return this Consolidation to Draft?', [
                { text: 'Keep Submitted', style: 'cancel' },
                {
                    text: 'Cancel Submission',
                    style: 'destructive',
                    onPress: doCancel,
                },
            ]);
        }
    };

    const handleCancelApproval = () => {
        const doCancel = async () => {
            setIsSubmitting(true);
            try {
                await cancelConsolidationApproval(consolidation.id);
                onClose();
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(error.message || 'Failed to cancel approval.');
                } else {
                    Alert.alert('Error', error.message || 'Failed to cancel approval.');
                }
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Return this Consolidation to the final approval step?')) {
                doCancel();
            }
        } else {
            Alert.alert('Cancel Approval', 'Return this Consolidation to the final approval step?', [
                { text: 'Keep Approved', style: 'cancel' },
                {
                    text: 'Cancel Approval',
                    style: 'destructive',
                    onPress: doCancel,
                },
            ]);
        }
    };

    const performApprove = async (approvedAmount?: number, note?: string) => {
        setIsSubmitting(true);
        try {
            await approveConsolidation(consolidation.id, currentApprovalIndex, approvalChain.length, approvedAmount, note);
            setIsApprovalConfirmationOpen(false);
            onClose();
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(error.message || 'Failed to approve Consolidation.');
            } else {
                Alert.alert('Error', error.message || 'Failed to approve Consolidation.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = () => {
        setApprovedAmountInput(String(consolidation.approved_amount || consolidation.total_amount));
        setApprovalNote('');
        setIsApprovalConfirmationOpen(true);
    };

    const handleReviewWithReason = (action: 'Reject' | 'Revise') => {
        if (Platform.OS === 'web') {
            const promptText = window.prompt(`Enter reason to ${action.toLowerCase()} this Consolidation:`);
            if (!promptText?.trim()) return;
            const doAction = async () => {
                setIsSubmitting(true);
                try {
                    if (action === 'Reject') await rejectConsolidation(consolidation.id, promptText.trim());
                    else await reviseConsolidation(consolidation.id, promptText.trim());
                    onClose();
                } catch (error: any) {
                    window.alert(error.message || `Failed to ${action.toLowerCase()} Consolidation.`);
                } finally {
                    setIsSubmitting(false);
                }
            };
            doAction();
        } else {
            Alert.prompt?.(
                `${action} Consolidation`,
                `Enter reason to ${action.toLowerCase()} this Consolidation:`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: action,
                        style: action === 'Reject' ? 'destructive' : 'default',
                        onPress: async (promptText?: string) => {
                            if (!promptText?.trim()) return;
                            setIsSubmitting(true);
                            try {
                                if (action === 'Reject') await rejectConsolidation(consolidation.id, promptText.trim());
                                else await reviseConsolidation(consolidation.id, promptText.trim());
                                onClose();
                            } catch (error: any) {
                                Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} Consolidation.`);
                            } finally {
                                setIsSubmitting(false);
                            }
                        },
                    },
                ]
            );
        }
    };

    const approvalStatus = (index: number) => {
        if (isApproved || consolidation.status === 'Paid') return 'Approved';
        if (consolidation.status === 'Rejected') return 'Rejected';
        if (consolidation.status === 'Cancelled') return 'Cancelled';
        if (completedApprovalLevels.has(index)) return 'Approved';
        if (isPending) return index === currentApprovalIndex ? 'Pending' : 'Submitted';
        return 'Draft';
    };

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        s.dialogCard,
                        {
                            backgroundColor: modalBg,
                            borderColor: cardBorder,
                        },
                    ]}
                >
                    {/* Drawer Handle */}
                    <View
                        style={[
                            s.dragHandle,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)' },
                        ]}
                    />

                    {/* Header */}
                    <View style={s.headerRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[s.titleText, { color: textColor }]}>
                                {documentNumber}
                            </Text>
                            <Text
                                style={[
                                    s.subtitleText,
                                    { color: getFinanceStatusColor(displayStatus, isDark), fontWeight: '700' },
                                ]}
                            >
                                {displayStatus}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={s.closeButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <PlatformIcon name="xmark.circle.fill" size={24} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollContent}
                    >
                        {/* Incomplete warning if any */}
                        {incompleteRequests.length > 0 && (
                            <View style={[s.warningCard, { borderColor: '#FF3B30' }]}>
                                <Text style={s.warningTitle}>{`Incomplete Requests (${incompleteRequests.length})`}</Text>
                                {incompleteRequests.map((r) => (
                                    <View key={r.reference} style={{ marginTop: 4 }}>
                                        <Text style={{ color: '#FF3B30', fontWeight: '700', fontSize: 13 }}>{r.reference}</Text>
                                        {r.issues.map((issue) => (
                                            <Text key={issue} style={{ color: '#FF3B30', fontSize: 12 }}>{`• ${issue}`}</Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* General Info */}
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>General Information</Text>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Submitter</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{submitter}</Text>
                            </View>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Consolidated Date</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{formatDate(consolidation.created_at)}</Text>
                            </View>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Total Requests</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{String(requests.length)}</Text>
                            </View>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Total Items</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{String(consolidation.items_count)}</Text>
                            </View>
                            <View style={[s.infoRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 8 }]}>
                                <Text style={[s.infoTotalLabel, { color: textColor }]}>Total Nominal</Text>
                                <Text style={[s.infoTotalValue, { color: '#007AFF' }]}>{formatCurrency(consolidation.total_amount)}</Text>
                            </View>
                        </View>

                        {/* Included Requests */}
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>{`Included Requests (${requests.length})`}</Text>
                            {requests.map((request: any, idx: number) => {
                                const requestRef = request.shortRef || request.ref || request.cardRef || 'PR';
                                const itemCount = request.items?.length || 1;
                                const status = getRequestStatus(request);
                                const isLast = idx === requests.length - 1;
                                return (
                                    <TouchableOpacity
                                        key={request.id}
                                        activeOpacity={0.7}
                                        onPress={() => onOpenRequest?.(request)}
                                        style={[
                                            s.requestItemRow,
                                            !isLast && { borderBottomWidth: 1, borderBottomColor: cardBorder },
                                        ]}
                                    >
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[s.reqRef, { color: textColor }]}>{requestRef}</Text>
                                                <Text style={[s.reqStatusBadge, { color: getFinanceStatusColor(status, isDark) }]}>
                                                    {status}
                                                </Text>
                                            </View>
                                            <Text style={[s.reqTitle, { color: textColor }]} numberOfLines={1}>
                                                {request.title || request.description || 'Purchase Request'}
                                            </Text>
                                            <Text style={[s.reqMeta, { color: subtextColor }]}>
                                                {`${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`}
                                            </Text>
                                        </View>
                                        <Text style={[s.reqAmount, { color: textColor }]}>
                                            {formatCurrency(request.amount || 0)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {isDraft && onOpenAddRequests && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={onOpenAddRequests}
                                    style={s.addReqBtn}
                                >
                                    <PlatformIcon name="plus" size={14} tintColor="#007AFF" />
                                    <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 14 }}>Add Request</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Approval Chain */}
                        {approvalChain.length > 0 && (
                            <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>Approval Workflow</Text>
                                {approvalChain.map((tier: any, index: number) => {
                                    const status = approvalStatus(index);
                                    const position = tier.positionTitle || 'Approver';
                                    return (
                                        <View key={tier.id || index} style={s.approvalTierRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.tierPosition, { color: textColor }]}>
                                                    {approvalChain.length > 1 ? `L${index + 1} · ${position}` : position}
                                                </Text>
                                                <Text style={[s.tierPerson, { color: subtextColor }]}>
                                                    {tier.personName || 'Designated Role'}
                                                </Text>
                                            </View>
                                            <Text style={[s.tierStatus, { color: getFinanceStatusColor(status, isDark) }]}>
                                                {status}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    {Boolean(isDraft || canCancelSubmission || canReview || canCancelApproval || isCancelled) && (
                        <View style={[s.actionRow, { borderTopColor: cardBorder }]}>
                            {isDraft && (
                                <>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={handleCancelConsolidation}
                                        disabled={isSubmitting}
                                        style={[s.actionBtn, { borderColor: cardBorder }, isSubmitting && { opacity: 0.5 }]}
                                    >
                                        <Text style={[s.actionBtnText, { color: '#FF3B30' }]}>Withdraw</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleSubmit}
                                        disabled={isSubmitting || requests.length === 0}
                                        style={[
                                            s.actionBtnPrimary,
                                            { backgroundColor: '#007AFF' },
                                            (isSubmitting || requests.length === 0) && { opacity: 0.5 },
                                        ]}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <Text style={s.actionBtnPrimaryText}>
                                                {consolidation.status === 'Revision' ? 'Resubmit' : 'Submit'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}

                            {isCancelled && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleDeleteConsolidation}
                                    disabled={isSubmitting}
                                    style={[
                                        s.actionBtn,
                                        { borderColor: '#FF3B30', width: '100%', backgroundColor: 'rgba(255, 59, 48, 0.08)' },
                                        isSubmitting && { opacity: 0.5 },
                                    ]}
                                >
                                    <Text style={[s.actionBtnText, { color: '#FF3B30', fontWeight: '700' }]}>
                                        {isSubmitting ? 'Deleting...' : 'Delete Consolidation'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {canCancelSubmission && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleCancelSubmission}
                                    disabled={isSubmitting}
                                    style={[s.actionBtn, { borderColor: cardBorder, width: '100%' }]}
                                >
                                    <Text style={[s.actionBtnText, { color: '#FF3B30' }]}>Cancel Submission</Text>
                                </TouchableOpacity>
                            )}

                            {canReview && (
                                <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleReviewWithReason('Reject')}
                                        disabled={isSubmitting}
                                        style={[s.actionBtn, { flex: 1, borderColor: cardBorder }]}
                                    >
                                        <Text style={[s.actionBtnText, { color: '#FF3B30' }]}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleReviewWithReason('Revise')}
                                        disabled={isSubmitting}
                                        style={[s.actionBtn, { flex: 1, borderColor: cardBorder }]}
                                    >
                                        <Text style={[s.actionBtnText, { color: '#FF9500' }]}>Revise</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleApprove}
                                        disabled={isSubmitting}
                                        style={[s.actionBtnPrimary, { flex: 1, backgroundColor: '#34C759' }]}
                                    >
                                        <Text style={s.actionBtnPrimaryText}>Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {canCancelApproval && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleCancelApproval}
                                    disabled={isSubmitting}
                                    style={[s.actionBtn, { borderColor: cardBorder, width: '100%' }]}
                                >
                                    <Text style={[s.actionBtnText, { color: '#FF3B30' }]}>Cancel Approval</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    dialogCard: {
        width: '100%',
        maxWidth: 580,
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 14,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
    },
    dragHandle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        gap: 12,
        paddingVertical: 4,
    },
    sectionCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    warningCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    warningTitle: {
        color: '#FF3B30',
        fontWeight: '700',
        fontSize: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    infoLabel: {
        fontSize: 14,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoTotalValue: {
        fontSize: 17,
        fontWeight: '700',
    },
    requestItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        gap: 12,
    },
    reqRef: {
        fontSize: 14,
        fontWeight: '700',
    },
    reqStatusBadge: {
        fontSize: 11,
        fontWeight: '700',
    },
    reqTitle: {
        fontSize: 13,
    },
    reqMeta: {
        fontSize: 12,
    },
    reqAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    addReqBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 4,
    },
    approvalTierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    tierPosition: {
        fontSize: 13,
        fontWeight: '600',
    },
    tierPerson: {
        fontSize: 12,
    },
    tierStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    actionBtn: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionBtnPrimary: {
        flex: 1.5,
        height: 46,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default SwiftUIConsolidationDetailSheet;
