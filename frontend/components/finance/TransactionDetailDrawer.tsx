import { isFinanceSuperadmin } from '@/lib/financeRoles';
import { useUserContext } from '@/context/UserProvider';
import { FinanceAttachmentPreview } from './FinanceAttachmentPreview';
import { resolveFinanceUrl } from '@/lib/api/finance';
import { financeProofs, resolveFinanceAttachments } from '@/lib/financeAttachments';
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal, ScrollView, Platform, Alert, Clipboard, Linking, Image, ActivityIndicator, Share, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import { supabase } from '@/lib/supabase';
import { getFinanceStatusBackground, getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { exportFinanceRequestAsPdf } from './utils/financeRequestPdfTemplate';
import {
    getFinanceApprovalMatrixSettings,
    evaluateApprovalChain,
    FinanceApprovalMatrixSettings,
    DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
    FinanceApproverLevel,
} from '@/lib/api/financeSetup';

import { requestAttachments, splitReferenceNotes } from '@/lib/financeRequestPresentation';

const getFinanceFileUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return ''; // A failed signed URL must not masquerade as an available file.
};

interface TransactionDetailDrawerProps {
    visible: boolean;
    onClose: () => void;
    request: any | null;
    actions?: { id: string, label: string, color: string, type: string, icon?: string }[];
    onAction?: (actionId: string, request: any) => void;
    isEmbedded?: boolean;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({ visible, onClose, request, actions = [], onAction, isEmbedded = false }) => {
    const { profile } = useUserContext();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const [activeDocUrl, setActiveDocUrl] = React.useState<string | null>(null);
    const [resolvedInvoices, setResolvedInvoices] = React.useState<{ url: string; name: string; path: string }[]>([]);
    const [resolvedProofs, setResolvedProofs] = React.useState<{ url: string; name: string; path: string }[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [approvalMatrix, setApprovalMatrix] = React.useState<FinanceApprovalMatrixSettings>(DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        if (Platform.OS === 'web' && !isEmbedded) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: false,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]).start(() => {
                onClose();
            });
        } else {
            onClose();
        }
    };

    React.useEffect(() => {
        if (visible) {
            getFinanceApprovalMatrixSettings().then(setApprovalMatrix).catch(console.warn);
        }
    }, [visible]);

    const approvalChain = React.useMemo(() => {
        if (!request) return [];
        const isReimburse = !request.purchase_stage && !request.vendor;
        const docKey = isReimburse ? 'reimbursement_request' : 'purchasing_request';
        const total = typeof request.amount === 'number' ? request.amount : (parseFloat(request.amount) || 0);
        return evaluateApprovalChain(docKey, request.department_id, total, approvalMatrix);
    }, [request, approvalMatrix]);

    const getInvoiceList = (req: any) => {
        if (!req) return [];
        const attachments = requestAttachments(req);
        if (attachments && attachments.length > 0) {
            return attachments.map((att: any, i: number) => ({
                path: att.invoice_url || att.url || att.path,
                name: att.invoice_name || (attachments.length === 1 ? 'Receipt' : `Receipt ${i + 1}`)
            })).filter(att => !!att.path);
        }
        const raw = req.invoice_url || req.receipt_url || req.attachment_url || req.file_url;
        if (raw) {
            const paths = String(raw).split(',').map((p: string) => p.trim()).filter(Boolean);
            return paths.map((p, i) => ({
                path: p,
                name: paths.length === 1 ? 'Receipt' : `Receipt ${i + 1}`
            }));
        }
        return [];
    };

    const getProofList = (req: any) => financeProofs(req);

    React.useEffect(() => {
        let isCurrent = true;

        if (!visible || !request) {
            setResolvedInvoices([]);
            setResolvedProofs([]);
            setActiveDocUrl(null);
            setIsLoadingDocs(false);
            return;
        }

        // Clear previous states immediately on request changes to prevent race conditions or stale states
        setResolvedInvoices([]);
        setResolvedProofs([]);
        setActiveDocUrl(null);

        const loadUrls = async () => {
            setIsLoadingDocs(true);
            try {
                const [invoices, proofs] = await Promise.all([
                    resolveFinanceAttachments(getInvoiceList(request), resolveFinanceUrl),
                    resolveFinanceAttachments(getProofList(request), resolveFinanceUrl),
                ]);
                if (isCurrent) {
                    setResolvedInvoices(invoices);
                    setResolvedProofs(proofs);
                }
            } catch (e) {
                console.error("Error loading files in parallel:", e);
            } finally {
                if (isCurrent) {
                    setIsLoadingDocs(false);
                }
            }
        };

        loadUrls();

        return () => {
            isCurrent = false;
        };
    }, [request, visible]);

    if (!request) return null;

    const isRejectedStatus = (request.statusTag === 'rejected' || (request.status || '').toLowerCase() === 'rejected');
    const isRevisionStatus = (request.statusTag === 'revision' || ['need revision', 'revision', 'need_revision'].includes((request.status || '').toLowerCase()));

    const showReasonSection = !!(isRejectedStatus || isRevisionStatus || request.revision_reason || request.rejection_reason);
    const reasonTitle = isRejectedStatus ? 'Rejection Reason' : 'Revision Note';
    const reasonColor = isRejectedStatus ? '#FF3B30' : '#FF9500';
    const reasonText = isRejectedStatus 
        ? (request.rejection_reason || request.revision_reason || 'No rejection note provided')
        : (request.revision_reason || request.rejection_reason || 'No revision note provided');

    const getStatusColor = (status: string) => {
        return getFinanceStatusColor(status, isDark);
    };

    const getFinancialStatusTextColor = (status: string) => {
        return getFinanceStatusColor(status, isDark);
    };

    const getFinancialStatusBgColor = (status: string) => {
        return getFinanceStatusBackground(status, isDark);
    };

    const getPriorityTextColor = (priority: string) => {
        if (isDark) return '#FFFFFF';

        switch (priority?.toLowerCase()) {
            case 'urgent': case 'high': return '#FF3B30';
            case 'medium': return '#FF9500';
            case 'low': return '#34C759';
            default: return '#8E8E93';
        }
    };

    const getPriorityBgColor = (priority: string) => {
        if (isDark) {
            switch (priority?.toLowerCase()) {
                case 'urgent': case 'high': return 'rgba(255, 69, 58, 0.38)';
                case 'medium': return 'rgba(255, 159, 10, 0.42)';
                case 'low': return 'rgba(48, 209, 88, 0.35)';
                default: return 'rgba(142, 142, 147, 0.35)';
            }
        }

        switch (priority?.toLowerCase()) {
            case 'urgent': case 'high': return 'rgba(255, 59, 48, 0.15)';
            case 'medium': return 'rgba(255, 149, 0, 0.15)';
            case 'low': return 'rgba(52, 199, 89, 0.15)';
            default: return 'rgba(142, 142, 147, 0.15)';
        }
    };

    const formatLabelValue = (str: string) => {
        if (!str) return '-';
        if (str === '-') return '-';
        const ACRONYMS = new Set([
            'MEP', 'HSE', 'IT', 'HR', 'PPN', 'PPH', 'PPH21', 'PPH23', 'PO', 'RE',
            'HVAC', 'AC', 'LED', 'UV', 'ID', 'ATK', 'KPR', 'SHM', 'IMB', 'PBG',
            'CV', 'PT', 'BCA', 'BRI', 'BNI', 'BTN', 'BSI', 'IDR', 'USD', 'EUR', 'SGD'
        ]);
        return str
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => {
                const upper = word.toUpperCase();
                if (ACRONYMS.has(upper)) return upper;
                if (word.length === 0) return '';
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    };

    // Progress steps
    const progressSteps = [
        { label: 'Submitted', key: 'submitted' },
        { label: 'Approved', key: 'approved' },
        { label: 'Paid', key: 'paid' },
        { label: 'Received', key: 'received' },
    ];

    const getActiveStepIndex = () => {
        const approval = request.approval_status?.toUpperCase();
        const financial = request.financial_status?.toUpperCase();
        const status = request.status?.toUpperCase();

        if (financial === 'PAID' || status === 'PAID') return 2;
        if (approval === 'APPROVED' || status === 'APPROVED') return 1;
        if (approval === 'REJECTED' || status === 'REJECTED') return -1; // rejected
        return 0; // submitted/pending
    };

    const activeStepIndex = getActiveStepIndex();
    const isRejected = activeStepIndex === -1;

    // Check if overdue (target_date passed and not paid)
    const isOverdue = request.target_date && new Date(request.target_date) < new Date() && activeStepIndex < 3;

    const formatAmount = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return String(amount);
        return `Rp${num.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false,
        }).replace(',', ' ·');
    };

    const copyAmount = async () => {
        const num = typeof request.amount === 'string' ? request.amount : String(request.amount);
        try {
            Clipboard.setString(num);
            Alert.alert('Success', 'Amount copied to clipboard');
        } catch { }
    };

    const copyAccountNumber = async () => {
        if (!request.beneficiary_number) return;
        try {
            Clipboard.setString(String(request.beneficiary_number));
            Alert.alert('Success', 'Account number copied to clipboard');
        } catch { }
    };

    const handleOpenInvoice = () => {
        if (resolvedInvoices.length === 0) return;
        if (resolvedInvoices.length === 1) {
            setActiveDocUrl(resolvedInvoices[0].url);
        } else {
            Alert.alert(
                'Select Invoice',
                'Please select an invoice to open:',
                [
                    ...resolvedInvoices.map((inv) => ({
                        text: inv.name,
                        onPress: () => setActiveDocUrl(inv.url)
                    })),
                    { text: 'Cancel', style: 'cancel' as const }
                ]
            );
        }
    };

    const handleOpenProof = () => {
        if (resolvedProofs.length === 0) return;
        if (resolvedProofs.length === 1) {
            setActiveDocUrl(resolvedProofs[0].url);
        } else {
            Alert.alert(
                'Select Payment Proof',
                'Please select a payment proof to open:',
                [
                    ...resolvedProofs.map((proof) => ({
                        text: proof.name,
                        onPress: () => setActiveDocUrl(proof.url)
                    })),
                    { text: 'Cancel', style: 'cancel' as const }
                ]
            );
        }
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

    const handleDownloadFile = async () => {
        if (!activeDocUrl) return;
        setIsDownloading(true);
        try {
            // Clean dynamic/signed URL from query parameters to extract the file extension safely
            const cleanUrl = activeDocUrl.split('?')[0];
            const originalFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'document.pdf';
            // Clean special chars or spaces from filename
            const filename = decodeURIComponent(originalFilename).replace(/\s+/g, '_');
            const extension = filename.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension);

            if (Platform.OS === 'web') {
                const response = await fetch(activeDocUrl);
                if (!response.ok) throw new Error('File could not be downloaded from the server.');
                const url = URL.createObjectURL(await response.blob());
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = filename;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                return;
            }
            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            // Download file locally
            const downloadResult = await FileSystem.downloadAsync(activeDocUrl, localUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file, server responded with status: ${downloadResult.status}`);
            }

            if (isImage) {
                // Image -> save to Photos Gallery
                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync(true);
                    if (status === 'granted') {
                        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                        Alert.alert('Success', 'Image successfully saved to photo gallery!');
                    } else {
                        // Fallback to sharing dialog if gallery permission is denied
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(downloadResult.uri);
                        } else {
                            Alert.alert('Permission Denied', 'Media Library permission is required to save photos.');
                        }
                    }
                } catch (mediaError: any) {
                    console.log("Media Library error, falling back to sharing:", mediaError);
                    Alert.alert('MediaLibrary Debug', `Error: ${mediaError?.message || mediaError}`);
                    // Fallback to sharing dialog
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri);
                    } else {
                        Alert.alert('Download Error', 'Unable to save to gallery or share the image.');
                    }
                }
            } else {
                // Non-image -> save to Files app/directory
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
                            Alert.alert('Success', 'File successfully saved to your chosen folder!');
                        } else {
                            // Fallback to share sheet if directory permission denied/cancelled
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(downloadResult.uri);
                            }
                        }
                    } catch (safError) {
                        console.log("SAF error, falling back to Sharing:", safError);
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(downloadResult.uri);
                        } else {
                            Alert.alert('Error', 'Unable to save or share the file.');
                        }
                    }
                } else {
                    // iOS standard sharing prompt has "Save to Files" option natively
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri);
                    } else {
                        Alert.alert('Error', 'Sharing is not available on this device.');
                    }
                }
            }
        } catch (error: any) {
            console.error("Error downloading file:", error);
            Alert.alert('Download Error', error.message || 'Failed to download file.');
        } finally {
            setIsDownloading(false);
        }
    };

    const getInvoiceCount = () => {
        return getInvoiceList(request).length;
    };

    const getProofCount = () => {
        return getProofList(request).length;
    };

    const invoiceCount = getInvoiceCount();
    const proofCount = getProofCount();

    const projectCode = request.project_obj?.project_code || request.project?.project_code || request.project || 'NA';
    const projectName = request.project_obj?.project_name || request.project?.project_name || '';
    const projectDisplayText = projectName && projectName !== projectCode ? `${projectCode} - ${projectName}` : projectCode;
    const showTripDetails = (request.category || request.type || request.subcategory)?.toUpperCase() === 'TRANSPORTATION' && request.details && (request.details.origin || request.details.destination);


    const handleSharePdf = async () => {
        setIsExporting(true);
        try {
            await exportFinanceRequestAsPdf({
                request,
                tenant: activeTenant,
                invoices: resolvedInvoices,
                proofs: resolvedProofs,
                approvalChain,
            });
        } catch (e: any) {
            Alert.alert('Export Failed', e.message || 'Could not export PDF document.');
        } finally {
            setIsExporting(false);
        }
    };

    const renderInnerBody = () => (
        <View style={isEmbedded ? [s.embeddedContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : { flex: 1, width: '100%', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14 }]}>
                <Text style={[s.headerRef, { color: textColor }]}>{request.ref || 'Request Detail'}</Text>
                <View style={s.headerActions}>
                    <TouchableOpacity
                        style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginRight: 8 }]}
                        activeOpacity={0.7}
                        onPress={handleSharePdf}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color={textColor} />
                        ) : (
                            <PlatformIcon name="square.and.arrow.up" size={15} tintColor={textColor} />
                        )}
                    </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close request detail" onPress={handleDismiss} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                </View>
            </View>

                    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

                         {/* Rejection / Revision Reason */}
                         {showReasonSection ? (
                             <View style={[
                                 s.rejectionCard,
                                 {
                                     backgroundColor: isRejectedStatus
                                         ? (isDark ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.05)')
                                         : (isDark ? 'rgba(255,149,0,0.1)' : 'rgba(255,149,0,0.05)'),
                                     borderColor: isRejectedStatus
                                         ? (isDark ? 'rgba(255,59,48,0.3)' : 'rgba(255,59,48,0.2)')
                                         : (isDark ? 'rgba(255,149,0,0.3)' : 'rgba(255,149,0,0.2)')
                                 }
                             ]}>
                                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                     <Ionicons
                                         name={isRejectedStatus ? "alert-circle" : "warning"}
                                         size={16}
                                         color={reasonColor}
                                     />
                                     <Text style={[s.rejectionTitle, { color: reasonColor }]}>{reasonTitle}</Text>
                                 </View>
                                 <Text style={[s.rejectionText, { color: textColor }]}>{reasonText}</Text>
                             </View>
                         ) : null}



                         {/* Approval Chain Card */}
                         {approvalChain.length > 0 && (
                             <>
                                 <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>APPROVAL WORKFLOW</Text>
                                 <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                     {approvalChain.map((approver, idx) => {
                                         const isLast = idx === approvalChain.length - 1;
                                         const isApproved = activeStepIndex >= 1;
                                         const stepStatus = isApproved ? 'Approved' : (idx === 0 ? 'Pending' : 'Submitted');
                                         const stepDate = isApproved ? (request.approved_at || request.updated_at) : null;
                                         return (
                                             <React.Fragment key={approver.id || idx}>
                                                 <View style={{ paddingVertical: 10 }}>
                                                     <Text style={{ color: textColor, fontWeight: '700', fontSize: 14, marginBottom: 5 }}>Request Approval</Text>
                                                     <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                         <View style={{ flex: 1 }}>
                                                             <Text style={{ color: textColor, fontWeight: '600', fontSize: 14 }}>
                                                                 {approvalChain.length > 1 ? `L${idx + 1} · ` : ''}{approver.positionTitle || 'Approver'}
                                                             </Text>
                                                             <Text style={{ color: subtextColor, fontSize: 12 }}>
                                                                 {approver.personName || 'Designated Role'}
                                                             </Text>
                                                         </View>
                                                         <View style={{ alignItems: 'flex-end' }}>
                                                             <Text style={{ color: getStatusColor(stepStatus), fontSize: 12, fontWeight: '700' }}>{stepStatus}</Text>
                                                             {stepDate ? <Text style={{ color: subtextColor, fontSize: 11, marginTop: 2 }}>{formatDateTime(stepDate)}</Text> : null}
                                                         </View>
                                                     </View>
                                                 </View>
                                                 {!isLast && (
                                                     <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                                 )}
                                             </React.Fragment>
                                         );
                                     })}
                                 </View>
                             </>
                         )}

                        {/* General Information Card */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>GENERAL INFORMATION</Text>
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Request Type</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>
                                    {request.purchase_stage || request.purchase_stage_id || request.vendor ? 'Purchase' : 'Reimburse'}
                                </Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Department</Text>
                                <Text style={[s.infoValue, { color: textColor, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                                    {(() => {
                                        const dept = request.department || (request.department_id ? {
                                            id: request.department_id,
                                            name: request.department_name || 'Department',
                                            code: request.department_code,
                                        } : null);
                                        return dept ? `${dept.code ? `${dept.code} - ` : ''}${dept.name}` : '-';
                                    })()}
                                </Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Project</Text>
                                <Text style={[s.infoValue, { color: textColor, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>{projectDisplayText !== 'NA' ? projectDisplayText : '-'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Submitter</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{request.submitted_by_name || request.approved_by_name || '-'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Invoice Date</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{formatDate(request.date || request.created_at)}</Text>
                            </View>
                            {request.target_date && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Target Date</Text>
                                        <Text style={[s.infoValue, { color: isOverdue ? '#FF3B30' : textColor, fontWeight: isOverdue ? '700' : '400' }]}>
                                            {formatDate(request.target_date)}
                                        </Text>
                                    </View>
                                </>
                            )}
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Category</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{formatLabelValue(request.type || request.category)}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Subcategory</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{formatLabelValue(request.subcategory)}</Text>
                            </View>
                            {request.priority && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Priority</Text>
                                        <View style={[s.priorityBadge, { backgroundColor: getPriorityBgColor(request.priority) }]}>
                                            <Text style={[s.priorityBadgeText, { color: getPriorityTextColor(request.priority), fontWeight: '700' }]}>
                                                {formatLabelValue(request.priority)}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                            {request.purchase_stage && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Order Stage</Text>
                                        <Text style={[s.infoValue, { color: textColor }]}>{formatLabelValue(request.purchase_stage)}</Text>
                                    </View>
                                </>
                            )}
                            {request.vendor && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Vendor</Text>
                                        <Text style={[s.infoValue, { color: textColor }]}>{request.vendor}</Text>
                                    </View>
                                </>
                            )}
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Description</Text>
                                <Text style={[s.infoValue, { color: textColor, flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                                    {request.title || request.description || '-'}
                                </Text>
                            </View>
                        </View>

                        {/* Amount & Status Card */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>AMOUNT & STATUS</Text>
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Total Amount</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[s.amountText, { color: '#007AFF', fontWeight: '700' }]}>{formatAmount(request.amount)}</Text>
                                    <TouchableOpacity onPress={copyAmount} hitSlop={15}>
                                        <PlatformIcon name="doc.on.doc" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Finance Status</Text>
                                <View style={[s.statusBadge, { backgroundColor: getFinancialStatusBgColor(request.status) }]}>
                                    <Text style={[s.statusBadgeText, { color: getFinancialStatusTextColor(request.status), fontWeight: '700' }]}>
                                        {formatLabelValue(request.status || 'PENDING')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Payment Details Card */}
                        {request.beneficiary_name && (
                            <>
                                <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>PAYMENT DETAILS</Text>
                                <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                    <View style={[s.infoRow, { paddingVertical: 6 }]}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>{request.beneficiary_bank}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>{request.beneficiary_number}</Text>
                                                    <TouchableOpacity onPress={copyAccountNumber} hitSlop={15}>
                                                        <PlatformIcon name="doc.on.doc" size={14} tintColor={subtextColor} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <Text style={{ fontSize: 13, color: subtextColor }}>{request.beneficiary_name}</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Items List Card */}
                        {request.items && request.items.length > 0 && (
                            <>
                                <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>ITEMS LIST ({request.items.length})</Text>
                                <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                    {request.items.map((item: any, idx: number) => (
                                        <View key={idx}>
                                            {idx > 0 && <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                                            <View style={[s.infoRow, { paddingVertical: 8 }]}>
                                                <View style={{ flex: 1, marginRight: 12 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }} numberOfLines={1}>{item.name}</Text>
                                                    <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>
                                                        {`${item.qty} ${item.unit} × ${formatAmount(item.unit_price || item.unitPrice)}`}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>{formatAmount(item.total)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Trip Details Card */}
                        {showTripDetails && (
                            <>
                                <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>TRIP DETAILS</Text>
                                <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Origin</Text>
                                        <Text style={[s.infoValue, { color: textColor }]}>{request.details.origin || '-'}</Text>
                                    </View>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Destination</Text>
                                        <Text style={[s.infoValue, { color: textColor }]}>{request.details.destination || '-'}</Text>
                                    </View>
                                    {request.details.distance ? (
                                        <>
                                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                            <View style={s.infoRow}>
                                                <Text style={[s.infoLabel, { color: subtextColor }]}>Distance</Text>
                                                <Text style={[s.infoValue, { color: textColor }]}>{`${request.details.distance} km`}</Text>
                                            </View>
                                        </>
                                    ) : null}
                                </View>
                            </>
                        )}

                        {/* Documents & Proofs Card */}
<Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>DOCUMENTS & PROOFS</Text><View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}><View style={s.infoRow}><Text style={[s.infoLabel, { color: subtextColor }]}>Receipt / Invoice</Text><Text style={[s.infoValue, { color: subtextColor }]}>{getInvoiceList(request).length} Files</Text></View>
{getInvoiceList(request).map((file, index) => { const resolved = resolvedInvoices.find(item => item.path === file.path); return <View key={file.path} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: textColor, fontSize: 14 }} numberOfLines={1}>{index + 1}. {file.name}</Text>{(isLoadingDocs || !resolved) && <Text style={{ color: subtextColor, fontSize: 11, marginTop: 4 }}>{isLoadingDocs ? 'Loading…' : 'File unavailable'}</Text>}</View><TouchableOpacity accessibilityLabel={`View ${file.name}`} disabled={isLoadingDocs || !resolved} onPress={() => resolved && setActiveDocUrl(resolved.url)} style={[s.docBadgeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', opacity: isLoadingDocs || !resolved ? 0.4 : 1 }]}><Text style={[s.docBadgeText, { color: textColor }]}>View</Text></TouchableOpacity></View>; })}
{!getInvoiceList(request).length && <Text style={{ color: subtextColor, paddingBottom: 12 }}>No Receipt / Invoice</Text>}<View style={[s.separator, { backgroundColor: isDark ? '#242424' : '#E5E7EB' }]} /><View style={s.infoRow}><Text style={[s.infoLabel, { color: subtextColor }]}>Payment Proof</Text><Text style={[s.infoValue, { color: subtextColor }]}>{getProofList(request).length} Files</Text></View>
{getProofList(request).map((file, index) => { const resolved = resolvedProofs.find(item => item.path === file.path); return <View key={file.path} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: textColor, fontSize: 14 }} numberOfLines={1}>{index + 1}. {file.name}</Text>{(isLoadingDocs || !resolved) && <Text style={{ color: subtextColor, fontSize: 11, marginTop: 4 }}>{isLoadingDocs ? 'Loading…' : 'File unavailable'}</Text>}</View><TouchableOpacity accessibilityLabel={`View ${file.name}`} disabled={isLoadingDocs || !resolved} onPress={() => resolved && setActiveDocUrl(resolved.url)} style={[s.docBadgeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', opacity: isLoadingDocs || !resolved ? 0.4 : 1 }]}><Text style={[s.docBadgeText, { color: textColor }]}>View</Text></TouchableOpacity></View>; })}
{!getProofList(request).length && <Text style={{ color: subtextColor, paddingBottom: 12 }}>No Payment Proof</Text>}</View>
                        {/* Additional Notes Card */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>ADDITIONAL NOTES</Text>
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            {request.notes ? (
                                <Text style={[s.notesText, { color: textColor }]}>
                                    &quot;{request.notes}&quot;
                                </Text>
                            ) : (
                                <Text style={[s.notesPlaceholder, { color: subtextColor }]}>
                                    No notes provided
                                </Text>
                            )}
                        </View>

                        {isFinanceSuperadmin(activeTenant?.role || profile?.role) && onAction && <TouchableOpacity accessibilityLabel="Edit Transaction" onPress={() => onAction('admin_edit', request)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8 }}><Ionicons name="create-outline" size={15} color="#159957" /><Text style={{ color: '#159957', fontSize: 13, fontWeight: '600' }}>Edit Transaction</Text></TouchableOpacity>}

                        <View style={{ height: 24 }} />

                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        {actions && actions.length > 0 ? (
                            <View style={{ gap: 12, width: '100%' }}>
                                {/* Row 1: Icons & Secondary Action */}
                                {actions.some(a => ['delete', 'reject', 'revision', 'edit', 'cancel_submit'].includes(a.id)) && (
                                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                        {actions.filter(a => ['delete', 'reject'].includes(a.id)).map(action => (
                                            <TouchableOpacity
                                                key={action.id}
                                                style={[s.iconBtn, { backgroundColor: isDark ? `${action.color}25` : `${action.color}15` }]}
                                                onPress={() => onAction?.(action.id, request)}
                                            >
                                                <PlatformIcon name={action.icon as any} size={20} tintColor={action.color} />
                                            </TouchableOpacity>
                                        ))}
                                        
                                        {actions.filter(a => ['revision', 'edit', 'cancel_submit'].includes(a.id)).map(action => (
                                            <TouchableOpacity
                                                key={action.id}
                                                style={[s.secondaryBtn, { backgroundColor: isDark ? `${action.color}25` : `${action.color}15`, flex: 1 }]}
                                                onPress={() => onAction?.(action.id, request)}
                                            >
                                                <PlatformIcon name={action.icon as any} size={18} tintColor={action.color} />
                                                <Text style={[s.secondaryBtnText, { color: action.color, marginLeft: 6 }]}>{action.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Row 2: Primary Actions */}
                                {actions.filter(a => ['approve', 'pay', 'submit', 'open_module'].includes(a.id) || (a.type === 'primary' && !['revision', 'edit', 'cancel_submit', 'delete', 'reject'].includes(a.id))).map(action => (
                                    <TouchableOpacity
                                        key={action.id}
                                        style={[s.primaryBtn, { backgroundColor: action.color, width: '100%' }]}
                                        onPress={() => onAction?.(action.id, request)}
                                    >
                                        {action.icon ? (
                                            <PlatformIcon name={action.icon as any} size={18} tintColor="#FFF" />
                                        ) : null}
                                        <Text style={[s.primaryBtnText, { color: '#FFF', marginLeft: action.icon ? 6 : 0 }]}>{action.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                    </View>
        </View>
    );

    const renderDocumentViewer = () => (
        activeDocUrl ? (
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}>
                <View style={s.viewerOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setActiveDocUrl(null)}
                    />
                    <View style={s.viewerContainer}>
                        <FinanceAttachmentPreview url={activeDocUrl} />
                    </View>
                    <TouchableOpacity
                        style={s.viewerCloseBtn}
                        onPress={() => setActiveDocUrl(null)}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.viewerDownloadBtn}
                        onPress={handleDownloadFile}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="download-outline" size={20} color="#FFF" />
                        )}
                        <Text style={s.viewerDownloadBtnText}>
                            {isDownloading ? 'Downloading...' : 'Download File'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        ) : null
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {renderInnerBody()}
                {renderDocumentViewer()}
            </View>
        );
    }

    return (
        <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleDismiss} statusBarTranslucent={true}>
            <View style={[s.drawerOverlay, isDesktop && s.modalOverlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        s.drawerContentSheet,
                        isDesktop && s.modalContentWeb,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 500 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 0 : 600, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {renderInnerBody()}
                </Animated.View>
            </View>
            {renderDocumentViewer()}
        </Modal>
    );
};

const s = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawerContentSheet: {
        height: '92%',
        width: '100%',
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
    modalOverlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    modalContentWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 480,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 12,
    },
    headerRef: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
        flex: 1,
        marginRight: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    exportBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 28,
        paddingTop: 8,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    priorityBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    docBadgeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressStep: {
        alignItems: 'center',
        flex: 1,
    },
    progressDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressStepLabel: {
        fontSize: 11,
        textAlign: 'center',
    },
    progressStepDate: {
        fontSize: 9,
        marginTop: 2,
    },
    footer: {
        width: '100%',
        paddingHorizontal: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    iconBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 26,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 26,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    rejectionCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    rejectionTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    rejectionText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    notesText: {
        fontSize: 14,
        fontStyle: 'italic',
        fontWeight: '500',
        lineHeight: 20,
    },
    notesPlaceholder: {
        fontSize: 14,
        fontStyle: 'italic',
        fontWeight: '500',
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
