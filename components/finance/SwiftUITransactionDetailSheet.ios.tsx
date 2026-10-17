import { attachmentKind, requestAttachments, splitReferenceNotes } from '@/lib/financeRequestPresentation';
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Alert, Share, Image as RNImage, Modal, Pressable, Clipboard, Text as RNText, TouchableOpacity, Linking, Dimensions, ScrollView, ActionSheetIOS, UIManager } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

// Safe lazy loading of react-native-webview to avoid crash if the native module is not compiled in the binary
let WebView: any = null;
let isWebViewAvailable = false;
try {
    const { WebView: WV } = require('react-native-webview');
    WebView = WV;
    isWebViewAvailable = !!UIManager.getViewManagerConfig('RNCWebView');
} catch (e) {
    // Silently handled — opens in browser instead
}
import {
    Host,
    Section,
    Button,
    BottomSheet,
    HStack,
    VStack,
    ZStack,
    Spacer,
    Image as SwiftUIImage,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, frame, background, ignoreSafeArea, tint, foregroundColor, cornerRadius, buttonStyle, shadow } from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { PlatformIcon } from '../ui/PlatformIcon';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { getFinanceStatusBackground, getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { exportFinanceRequestAsPdf, exportFinanceRequestAsJpg } from './utils/financeRequestPdfTemplate';
import {
    getFinanceDocumentRules,
    getFinanceApprovalMatrixSettings,
    evaluateApprovalChain,
    FinanceApprovalMatrixSettings,
    DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
    FinanceApproverLevel,
    formatDepartmentCode,
} from '@/lib/api/financeSetup';

interface SwiftUITransactionDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    request: any | null;
    actions?: { id: string; label: string; color: string; type: string; icon: string }[];
    onAction?: (actionId: string, request: any) => void;
}

export const SwiftUITransactionDetailSheet: React.FC<SwiftUITransactionDetailSheetProps> = ({
    isOpened,
    onClose,
    request,
    actions = [],
    onAction
}) => {
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const [isFullDetent, setIsFullDetent] = useState(false);
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';

    const isPresentedNatively = React.useRef(false);
    const [resolvedInvoices, setResolvedInvoices] = useState<{ url: string; name: string; path: string }[]>([]);
    const [resolvedExpenseProofs, setResolvedExpenseProofs] = useState<{ url: string; name: string; path: string }[]>([]);
    const [resolvedProofs, setResolvedProofs] = useState<{ url: string; name: string; path: string }[]>([]);
    const [isResolvingInvoice, setIsResolvingInvoice] = useState(false);
    const [isResolvingProof, setIsResolvingProof] = useState(false);
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState('Document Preview');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [documentRules, setDocumentRules] = useState<Awaited<ReturnType<typeof getFinanceDocumentRules>> | null>(null);
    const [approvalMatrix, setApprovalMatrix] = useState<FinanceApprovalMatrixSettings>(DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS);

    useEffect(() => {
        if (isOpened) {
            getFinanceApprovalMatrixSettings().then(setApprovalMatrix).catch(console.warn);
            getFinanceDocumentRules().then(setDocumentRules).catch(console.warn);
        }
    }, [isOpened]);

    const approvalChain = useMemo(() => {
        if (!request) return [];
        const isReimburse = request.moduleType === 'reimbursement' || (!request.purchase_stage && !request.approval_status);
        const docKey = isReimburse ? 'reimbursement_request' : 'purchasing_request';
        const total = typeof request.amount === 'number' ? request.amount : (parseFloat(request.amount) || 0);
        return evaluateApprovalChain(docKey, request.department_id, total, approvalMatrix);
    }, [request, approvalMatrix]);

    // Helpers
    const resolveFinanceUrl = async (path: string): Promise<string> => {
        if (!path) return '';

        // If it's a local file path, return it directly
        if (path.startsWith('file://') || path.startsWith('ph://')) {
            return path;
        }

        // If it is already a full URL, return it directly. Skip splitting/resigning.
        if (path.startsWith('http')) {
            return path;
        }

        const cleanPath = path;
        // Predict the bucket to avoid sequential checks
        const isAttachment = cleanPath.includes('purchase/') || cleanPath.includes('reimbursement/') || path.includes('finance_attachments');
        const primaryBucket = isAttachment ? 'finance_attachments' : 'finance-documents';
        const secondaryBucket = isAttachment ? 'finance-documents' : 'finance_attachments';

        try {
            // Check both buckets in parallel to halve worst-case network latency
            const [res1, res2] = await Promise.all([
                supabase.storage.from(primaryBucket).createSignedUrl(cleanPath, 3600).catch(() => ({ data: null })),
                supabase.storage.from(secondaryBucket).createSignedUrl(cleanPath, 3600).catch(() => ({ data: null }))
            ]);
            if (res1?.data?.signedUrl) return res1.data.signedUrl;
            if (res2?.data?.signedUrl) return res2.data.signedUrl;
        } catch (e) {
            console.log("Error resolving finance URL in parallel:", e);
        }

        // Final fallback
        return `https://fmgcvwximerhgjgctpsp.supabase.co/storage/v1/object/public/${primaryBucket}/${cleanPath}`;
    };

    const invoiceCount = useMemo(() => requestAttachments(request).length, [request]);

    const proofCount = useMemo(() => {
        if (!request) return 0;
        if (request.payment_proof_url && typeof request.payment_proof_url === 'string') {
            return request.payment_proof_url.split(',').map((p: string) => p.trim()).filter(Boolean).length;
        }
        return 0;
    }, [request]);

    // Silent background load URLs on mount / request change
    useEffect(() => {
        let isCurrent = true;

        if (!isOpened) {
            isPresentedNatively.current = false;
            setResolvedInvoices([]);
            setResolvedExpenseProofs([]);
            setResolvedProofs([]);
            setIsResolvingInvoice(false);
            setIsResolvingProof(false);
            setActiveDocUrl(null);
            setIsDownloading(false);
            return;
        }
        if (!request) return;

        // Clear previous state immediately on request change to avoid stale state/race conditions!
        setResolvedInvoices([]);
        setResolvedExpenseProofs([]);
        setResolvedProofs([]);
        setActiveDocUrl(null);

        const loadUrls = async () => {
            setIsResolvingInvoice(invoiceCount > 0);
            setIsResolvingProof(proofCount > 0);
            try {
                // Invoices
                let invList: { url: string; name: string; path: string }[] = [];
                if (requestAttachments(request).length > 0) {
                    const resolved = await Promise.all(
                        requestAttachments(request).map(async (inv: any, i: number) => {
                            const url = await resolveFinanceUrl(inv.invoice_url);
                            return url ? {
                                url,
                                name: request.moduleType === 'reimbursement' ? `Invoice #${i + 1}` : (inv.invoice_name || `Receipt ${i + 1}`),
                                path: inv.invoice_url
                            } : null;
                        })
                    );
                    invList = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
                } else if (request.invoice_url && typeof request.invoice_url === 'string') {
                    const paths = request.invoice_url.split(',').map((p: string) => p.trim()).filter(Boolean);
                    const resolved = await Promise.all(
                        paths.map(async (p: string, i: number) => {
                            const url = await resolveFinanceUrl(p);
                            return url ? {
                                url,
                                name: paths.length === 1 ? 'Receipt' : `Receipt ${i + 1}`,
                                path: p
                            } : null;
                        })
                    );
                    invList = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
                }
                
                if (isCurrent) {
                    setResolvedInvoices(invList);
                    setIsResolvingInvoice(false);
                }

                if (request.expense_proof_url) {
                    const paths = String(request.expense_proof_url).split(',').map(path => path.trim()).filter(Boolean);
                    const resolved = await Promise.all(paths.map(async (path, index) => {
                        const url = await resolveFinanceUrl(path);
                        return url ? { url, name: `Proof #${index + 1}`, path } : null;
                    }));
                    if (isCurrent) {
                        setResolvedExpenseProofs(resolved.filter((item): item is NonNullable<typeof item> => item !== null));
                    }
                }

                // Proofs
                let proofList: { url: string; name: string; path: string }[] = [];
                if (request.payment_proof_url && typeof request.payment_proof_url === 'string') {
                    const paths = request.payment_proof_url.split(',').map((p: string) => p.trim()).filter(Boolean);
                    const resolved = await Promise.all(
                        paths.map(async (p: string, i: number) => {
                            const url = await resolveFinanceUrl(p);
                            return url ? {
                                url,
                                name: paths.length === 1 ? 'Payment Proof' : `Proof ${i + 1}`,
                                path: p
                            } : null;
                        })
                    );
                    proofList = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
                }
                
                if (isCurrent) {
                    setResolvedProofs(proofList);
                    setIsResolvingProof(false);
                }
            } catch (e) {
                console.error("Error loading files in parallel background:", e);
                if (isCurrent) {
                    setIsResolvingInvoice(false);
                    setIsResolvingProof(false);
                }
            }
        };

        loadUrls();

        return () => {
            isCurrent = false;
        };
    }, [request, isOpened, invoiceCount, proofCount]);



    const isOverdue = useMemo(() => {
        if (!request || !request.target_date) return false;
        const isPaid = (request.financial_status || request.status)?.toUpperCase() === 'PAID';
        if (isPaid) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(request.target_date);
        target.setHours(0, 0, 0, 0);
        return target < today;
    }, [request]);



    if (!request) return null;

    const isRejectedStatus = (request.statusTag === 'rejected' || (request.status || '').toLowerCase() === 'rejected');
    const isRevisionStatus = (request.statusTag === 'revision' || ['need revision', 'revision', 'need_revision'].includes((request.status || '').toLowerCase()));

    const showReasonSection = !!(isRejectedStatus || isRevisionStatus || request.revision_reason || request.rejection_reason);
    const reasonTitle = isRejectedStatus ? 'Rejection Reason' : 'Revision Note';
    const reasonColor = isRejectedStatus ? '#FF3B30' : '#FF9500';
    const reasonText = isRejectedStatus 
        ? (request.rejection_reason || request.revision_reason || 'No rejection note provided')
        : (request.revision_reason || request.rejection_reason || 'No revision note provided');

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

    const formatAmount = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return String(amount);
        return `Rp${num.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    const formatLabelValue = (str: string) => {
        if (!str) return '-';
        if (str === '-') return '-';
        // Known abbreviations/acronyms that should stay uppercase
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

    const handleOpenDocument = (docs: { url: string; name: string }[], defaultTitle: string) => {
        if (docs.length === 0) return;
        
        const isPreviewable = (url: string) => {
            const isImage = /\.(jpg|jpeg|png|heic|heif|webp|gif)/i.test(url) || url.startsWith('ph://') || url.startsWith('file://');
            const isPdf = /\.pdf/i.test(url);
            return isImage || (isPdf && isWebViewAvailable);
        };

        setActiveDocTitle(defaultTitle);

        if (docs.length === 1) {
            const doc = docs[0];
            if (isPreviewable(doc.url)) {
                setActiveDocUrl(doc.url);
            } else {
                openBrowserAsync(doc.url, { presentationStyle: WebBrowserPresentationStyle.FORM_SHEET }).catch(() => {
                    Alert.alert('Error', 'Unable to open preview.');
                });
            }
        } else {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', ...docs.map(d => d.name)],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        const doc = docs[buttonIndex - 1];
                        if (isPreviewable(doc.url)) {
                            setActiveDocUrl(doc.url);
                        } else {
                            openBrowserAsync(doc.url, { presentationStyle: WebBrowserPresentationStyle.FORM_SHEET }).catch(() => {
                                Alert.alert('Error', 'Unable to open preview.');
                            });
                        }
                    }
                }
            );
        }
    };

    const handleDownloadFile = async () => {
        if (!activeDocUrl) return;
        setIsDownloading(true);
        try {
            // Extract the filename and clean it
            const cleanUrl = activeDocUrl.split('?')[0];
            const originalFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'document.png';
            const filename = decodeURIComponent(originalFilename).replace(/\s+/g, '_');
            const extension = filename.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension);

            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            // Download file locally
            const downloadResult = await FileSystem.downloadAsync(activeDocUrl, localUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file, server responded with status: ${downloadResult.status}`);
            }

            if (isImage) {
                // iOS save to photo library
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
            } else {
                // Non-image e.g. PDF
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device.');
                }
            }
        } catch (error: any) {
            console.error("Download error:", error);
            try {
                const cleanUrl = activeDocUrl.split('?')[0];
                const originalFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'document.png';
                const filename = decodeURIComponent(originalFilename).replace(/\s+/g, '_');
                const localUri = `${FileSystem.cacheDirectory}${filename}`;
                const downloadResult = await FileSystem.downloadAsync(activeDocUrl, localUri);
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    Alert.alert('Error', 'Unable to save to gallery or share the image.');
                }
            } catch (shareErr) {
                Alert.alert('Download Error', 'Unable to download or share the document.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenInvoice = () => {
        if (resolvedInvoices.length > 0) {
            handleOpenDocument(resolvedInvoices, 'Receipt / Invoice');
        } else {
            Alert.alert('Loading', 'Receipt file is still loading in the background. Please wait a moment.');
        }
    };

    const handleOpenProof = () => {
        if (resolvedProofs.length > 0) {
            handleOpenDocument(resolvedProofs, 'Payment Proof');
        } else {
            Alert.alert('Loading', 'Payment proof file is still loading in the background. Please wait a moment.');
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

    const department = request.department || (request.department_id ? {
        id: request.department_id,
        name: request.department_name || 'Department',
        code: request.department_code,
    } : null);
    const isPurchasing = request.moduleType === 'purchasing' || Boolean(request.purchase_stage);
    const isReimbursement = !isPurchasing;
    const consolidationEnabled = documentRules ? (isPurchasing ? documentRules.purchasing : documentRules.reimbursement).levels.consolidation.enabled : true;

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

    const handleShareJpg = async () => {
        setIsExporting(true);
        try {
            await exportFinanceRequestAsJpg({
                request,
                tenant: activeTenant,
                invoices: resolvedInvoices,
                proofs: resolvedProofs,
                approvalChain,
            });
        } catch (e: any) {
            Alert.alert('Export Failed', e.message || 'Could not export JPG image.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenShareMenu = () => {
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title: `Share ${request?.ref || 'Finance Request'}`,
                options: ['Cancel', 'Export as PDF', 'Export as JPG'],
                cancelButtonIndex: 0,
            },
            (buttonIndex) => {
                if (buttonIndex === 1) handleSharePdf();
                else if (buttonIndex === 2) handleShareJpg();
            }
        );
    };
    const cleanNotes = splitReferenceNotes(request.notes || '').notes;
    const displayItems = request.items?.length ? request.items : (request.description ? [{
        id: 'legacy-item',
        name: request.description,
        qty: Number(request.quantity) || 1,
        unit: request.unit || 'pcs',
        unit_price: Number(request.subtotal_amount ?? request.amount) || 0,
        total: Number(request.subtotal_amount ?? request.amount) || 0,
    }] : []);
    const taxSummary = (() => {
        const name = request.tax_name || 'Not recorded';
        const rate = request.tax_rate != null && !String(name).includes(`${request.tax_rate}%`)
            ? `${request.tax_rate}%`
            : '';
        const amount = request.tax_amount != null
            ? `${request.tax_type === 'withholding' ? '− ' : ''}${formatAmount(request.tax_amount)}`
            : '';
        return [name, rate, amount].filter(Boolean).join(' · ');
    })();
    const attachmentGroups = [
        { kind: 'INVOICE', label: 'Invoice' },
        { kind: 'RECEIPT', label: 'Receipt' },
        { kind: 'IMAGE', label: 'Photo References' },
        { kind: 'DOCUMENT', label: 'Document References' },
        { kind: 'LINK', label: 'Links' },
    ].filter(group => !isReimbursement || ['INVOICE', 'RECEIPT'].includes(group.kind)).map(group => ({ ...group, files: resolvedInvoices.filter(file => {
        const original = requestAttachments(request).find(attachment => attachment.invoice_url === file.path);
        return attachmentKind(original || {}) === group.kind;
    }) }));
    const projectCode = formatDepartmentCode(request.project_obj?.project_code || request.project?.project_code || request.project) || 'NA';
    const projectName = request.project_obj?.project_name || request.project?.project_name || '';
    const projectDisplayText = projectName && projectName !== projectCode ? `${projectCode} - ${projectName}` : projectCode;

    const showTripDetails = (request.category || request.type || request.subcategory)?.toUpperCase() === 'TRANSPORTATION' && request.details && (request.details.origin || request.details.destination);

    console.log('[SwiftUITransactionDetailSheet] Render props/state:', { isOpened });

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.9, 'large']}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    console.log('[SwiftUITransactionDetailSheet] onIsOpenedChange:', opened, 'wasPresented:', isPresentedNatively.current);
                    if (opened) {
                        isPresentedNatively.current = true;
                    } else {
                        if (isPresentedNatively.current) {
                            isPresentedNatively.current = false;
                            console.log('[SwiftUITransactionDetailSheet] Calling onClose()');
                            onClose();
                        }
                    }
                }}
            >
                <ZStack>
                    <View
                        pointerEvents="none"
                        onLayout={(event) => {
                            const sheetHeight = event.nativeEvent.layout.height;
                            const screenHeight = Dimensions.get('window').height;
                            setIsFullDetent(sheetHeight >= screenHeight * 0.92);
                        }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundColor: sheetBg,
                        }}
                    />
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg)
                    ]}>
                            {/* Custom SwiftUI Header */}
                            <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                                <SwiftUIText size={22} weight="bold" color={textColor}>
                                    {request.shortRef || request.ref || 'Request Detail'}
                                </SwiftUIText>
                                <Spacer />
                                <HStack spacing={8}>
                                    <Button
                                        systemImage="square.and.arrow.up"
                                        variant="glass"
                                        color="gray"
                                        onPress={handleOpenShareMenu}
                                        modifiers={[shadow({ radius: 0, x: 0, y: 0, color: 'transparent' })]}
                                    />
                                    <Button
                                        systemImage="xmark"
                                        role="cancel"
                                        variant="glass"
                                        color="gray"
                                        onPress={onClose}
                                        modifiers={[shadow({ radius: 0, x: 0, y: 0, color: 'transparent' })]}
                                    />
                                </HStack>
                            </HStack>

                            {/* SwiftUI Form Details */}
                            <NativeFinanceList backgroundColor={isDark ? '#000000' : '#FFFFFF'}>
                                {/* Revision / Rejection reason note */}
                                {showReasonSection && (
                                    <Section title={reasonTitle}>
                                        <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                            <SwiftUIText 
                                                color={reasonColor} 
                                                weight="medium"
                                                size={15}
                                            >
                                                {reasonText}
                                            </SwiftUIText>
                                        </VStack>
                                    </Section>
                                )}

                                {/* General Information */}
                                <Section title="General Information">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Request Type</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{request.moduleType === 'reimbursement' || (!request.purchase_stage && !request.approval_status) ? 'Reimburse' : 'Purchase'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Department</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText weight="bold" color={textColor}>{department ? `${department.code ? `${department.code} - ` : ''}${department.name}` : '-'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText weight="bold" color={textColor}>{projectDisplayText !== 'NA' ? projectDisplayText : '-'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Submitter</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{request.submitted_by_name || request.approved_by_name || '-'}</SwiftUIText>
                                    </HStack>
                                    {request.target_date && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Target Date</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={isOverdue ? '#FF3B30' : textColor} weight={isOverdue ? 'semibold' : 'regular'}>
                                                {formatDate(request.target_date)}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Category</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{formatLabelValue(request.type || request.category)}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Subcategory</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{formatLabelValue(request.subcategory)}</SwiftUIText>
                                    </HStack>
                                    {request.priority && (
                                        <HStack alignment="center">
                                            <SwiftUIText color={subtextColor}>Priority</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText
                                                size={14}
                                                weight={['urgent', 'high'].includes(request.priority.toLowerCase()) ? 'bold' : 'semibold'}
                                                color={getPriorityTextColor(request.priority)}
                                                modifiers={[
                                                    padding({ vertical: 6, horizontal: 14 }),
                                                    background(getPriorityBgColor(request.priority)),
                                                    cornerRadius(16),
                                                    foregroundColor(getPriorityTextColor(request.priority))
                                                ]}
                                            >
                                                {formatLabelValue(request.priority)}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Description</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{request.title || request.description || '-'}</SwiftUIText>
                                    </HStack>
                                </Section>

                                {/* Amount & Status */}
                                <Section title="Amount & Status">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Total Amount</SwiftUIText>
                                        <Spacer />
                                        <HStack spacing={6}>
                                            <SwiftUIText weight="bold" color="#007AFF" size={17}>{formatAmount(request.amount)}</SwiftUIText>
                                            <Button
                                                systemImage="square.on.square"
                                                variant="plain"
                                                onPress={copyAmount}
                                            />
                                        </HStack>
                                    </HStack>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Finance Status</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText
                                            size={14}
                                            weight="bold"
                                            color={getFinancialStatusTextColor(request.status)}
                                            modifiers={[
                                                padding({ vertical: 6, horizontal: 14 }),
                                                background(getFinancialStatusBgColor(request.status)),
                                                cornerRadius(16),
                                                foregroundColor(getFinancialStatusTextColor(request.status))
                                            ]}
                                        >
                                            {formatLabelValue(request.status || 'PENDING')}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                {/* Payment Destination - 2 Column Row Style matched perfectly with form layout */}
                                {request.beneficiary_name && (
                                    <Section title="Payment Details">
                                        <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 6 })]}>
                                            <HStack alignment="center">
                                                <SwiftUIText weight="bold" color={textColor}>
                                                    {request.beneficiary_bank}
                                                </SwiftUIText>
                                                <Spacer />
                                                <HStack alignment="center" spacing={4}>
                                                    <SwiftUIText weight="bold" color={textColor}>
                                                        {request.beneficiary_number}
                                                    </SwiftUIText>
                                                    <Button
                                                        systemImage="square.on.square"
                                                        variant="plain"
                                                        onPress={copyAccountNumber}
                                                    />
                                                </HStack>
                                            </HStack>
                                            <SwiftUIText size={13} color={subtextColor}>
                                                {request.beneficiary_name}
                                            </SwiftUIText>
                                        </VStack>
                                    </Section>
                                )}

                                {/* Items details */}
                                {displayItems.length > 0 && (
                                    <Section title={`Items List (${displayItems.length})`}>
                                        {displayItems.map((item: any, idx: number) => (
                                            <VStack key={idx} alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                                <HStack>
                                                    <SwiftUIText color={textColor}>{item.name || item.item_name}</SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText color={textColor}>{formatAmount(item.total)}</SwiftUIText>
                                                </HStack>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {`${item.qty} ${item.unit} × ${formatAmount(item.unit_price || item.unitPrice)}`}
                                                </SwiftUIText>
                                            </VStack>
                                        ))}
                                    </Section>
                                )}

                                {isPurchasing && displayItems.length === 0 && (
                                    <Section title="Item Details">
                                        <SwiftUIText color={subtextColor}>No item details recorded</SwiftUIText>
                                    </Section>
                                )}

                                {isPurchasing && (
                                    <Section title="Commercial Details">
                                        {[
                                            ['Preferred Vendor', request.vendor || 'Not specified'],
                                            ['Subtotal', request.subtotal_amount != null ? formatAmount(request.subtotal_amount) : (request.items?.length ? formatAmount(request.items.reduce((sum: number, item: any) => sum + Number(item.total ?? item.qty * item.unit_price), 0)) : 'Not recorded')],
                                            ['Discount', request.discount_type != null ? (request.discount_type === 'NONE' ? 'None' : `${request.discount_type === 'PERCENT' ? `${request.discount_value}% · ` : ''}${formatAmount(request.discount_amount || 0)}`) : 'Not recorded'],
                                            ['Tax / Deduction', taxSummary],
                                            ['Payment Terms', request.payment_term_name || 'Not recorded'],
                                            ['Grand Total', formatAmount(request.amount)],
                                        ].map(([label, value]) => (
                                            <HStack key={label}>
                                                <SwiftUIText color={subtextColor}>{label}</SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText color={textColor} weight={label === 'Grand Total' ? 'bold' : 'regular'}>{value}</SwiftUIText>
                                            </HStack>
                                        ))}
                                        {request.invoice_number ? <HStack><SwiftUIText color={subtextColor}>Invoice Number</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{request.invoice_number}</SwiftUIText></HStack> : null}
                                        {request.invoice_date ? <HStack><SwiftUIText color={subtextColor}>Invoice Date</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{formatDate(request.invoice_date)}</SwiftUIText></HStack> : null}
                                    </Section>
                                )}

                                {isReimbursement && (
                                    <Section title="Actual Commercial Details">
                                        {[
                                            ['Merchant / Vendor', request.vendor || 'Not specified'],
                                            ['Actual Subtotal', formatAmount(request.subtotal_amount ?? request.amount)],
                                            ['Actual Discount', request.discount_type && request.discount_type !== 'NONE' ? formatAmount(request.discount_amount || 0) : 'None'],
                                            ['Actual Tax / Deduction', request.tax_name ? taxSummary : 'None'],
                                            ['Reimbursement Total', formatAmount(request.amount)],
                                            ['Invoice Number', request.invoice_number || 'Not recorded'],
                                            ['Expense Date', formatDate(request.date)],
                                        ].map(([label, value]) => (
                                            <HStack key={label}>
                                                <SwiftUIText color={subtextColor}>{label}</SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText color={textColor} weight={label === 'Reimbursement Total' ? 'bold' : 'regular'}>{value}</SwiftUIText>
                                            </HStack>
                                        ))}
                                    </Section>
                                )}

                                {/* Trip Details (Transportation Reimbursement) */}
                                {showTripDetails && (
                                    <Section title="Trip Details">
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Origin</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{request.details.origin || '-'}</SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Destination</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{request.details.destination || '-'}</SwiftUIText>
                                        </HStack>
                                        {request.details.distance && (
                                            <HStack>
                                                <SwiftUIText color={subtextColor}>Distance</SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText color={textColor}>{`${request.details.distance} km`}</SwiftUIText>
                                            </HStack>
                                        )}
                                    </Section>
                                )}

                                {/* Attachments & Uploads */}
                                <Section title={isReimbursement ? 'Documents' : 'Documents & References'}>
                                    {attachmentGroups.filter(group => group.files.length > 0).map(group => (
                                        <HStack key={group.kind}>
                                            <SwiftUIText color={textColor}>{group.label}</SwiftUIText>
                                            <Spacer />
                                            <Button variant="glass" color="gray" onPress={() => handleOpenDocument(group.files, group.label)}>
                                                <SwiftUIText size={13} weight="semibold" color={textColor}>{`${group.files.length} ${group.kind === 'LINK' ? (group.files.length === 1 ? 'Link' : 'Links') : (group.files.length === 1 ? 'File' : 'Files')}`}</SwiftUIText>
                                            </Button>
                                        </HStack>
                                    ))}
                                    {isResolvingInvoice && <SwiftUIText size={14} color={subtextColor}>Loading attachments…</SwiftUIText>}
                                    {!isResolvingInvoice && resolvedInvoices.length === 0 && <SwiftUIText size={14} color={subtextColor}>No attachments</SwiftUIText>}
                                    {isReimbursement && (
                                        <HStack>
                                            <SwiftUIText color={textColor}>Expense Payment Proof</SwiftUIText>
                                            <Spacer />
                                            {resolvedExpenseProofs.length > 0 ? (
                                                <Button variant="glass" color="gray" onPress={() => handleOpenDocument(resolvedExpenseProofs, 'Expense Payment Proof')}>
                                                    <SwiftUIText size={13} weight="semibold" color={textColor}>{`${resolvedExpenseProofs.length} File${resolvedExpenseProofs.length > 1 ? 's' : ''}`}</SwiftUIText>
                                                </Button>
                                            ) : (
                                                <SwiftUIText size={14} color="#FF3B30">Required</SwiftUIText>
                                            )}
                                        </HStack>
                                    )}
                                    {(isReimbursement || !consolidationEnabled) && (proofCount > 0 || String(request.status || '').toUpperCase() === 'PAID') && (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>{isReimbursement ? 'Reimbursement Payment Proof' : 'Payment Proof'}</SwiftUIText>
                                        <Spacer />
                                        {proofCount > 0 ? (
                                            <Button
                                                onPress={handleOpenProof}
                                                variant="glassProminent"
                                                color="gray"
                                                disabled={isResolvingProof}
                                                modifiers={[
                                                    foregroundColor(textColor)
                                                ]}
                                            >
                                                {isResolvingProof ? (
                                                    <SwiftUIText size={13} weight="semibold">Loading...</SwiftUIText>
                                                ) : (
                                                    <SwiftUIText size={13} weight="semibold">{`${proofCount} File${proofCount > 1 ? 's' : ''}`}</SwiftUIText>
                                                )}
                                            </Button>
                                        ) : (
                                            <SwiftUIText color={subtextColor} size={14}>No Proof</SwiftUIText>
                                        )}
                                    </HStack>
                                    )}
                                </Section>

                                {/* Additional Notes */}
                                <Section title="Additional Notes">
                                    <VStack alignment="leading" modifiers={[padding({ vertical: 6 })]}>
                                        {cleanNotes ? (
                                            <SwiftUIText color={textColor}>{cleanNotes}</SwiftUIText>
                                        ) : (
                                            <SwiftUIText color={subtextColor}>No notes provided</SwiftUIText>
                                        )}
                                    </VStack>
                                </Section>

                                {approvalChain.length > 0 && (
                                    <Section title="Approval Workflow">
                                        {approvalChain.map((approver, idx) => {
                                            const approval = (request.approval_status || request.status || request.statusTag || '').toUpperCase();
                                            const isApproved = approval === 'APPROVED' || approval === 'PAID';
                                            const stepStatus = isApproved ? 'Approved' : (idx === 0 ? 'Pending' : 'Submitted');
                                            const stepDate = isApproved ? (request.approved_at || request.updated_at) : null;
                                            return (
                                                <VStack key={approver.id || idx} alignment="leading" spacing={4} modifiers={[padding({ vertical: 2 })]}>
                                                    <SwiftUIText weight="bold" size={14} color={textColor}>Request Approval</SwiftUIText>
                                                    <HStack alignment="center">
                                                        <VStack alignment="leading" spacing={2}>
                                                        <SwiftUIText weight="semibold" size={14} color={textColor}>
                                                            {`${approvalChain.length > 1 ? `L${idx + 1} · ` : ''}${approver.positionTitle || 'Approver'}`}
                                                        </SwiftUIText>
                                                        <SwiftUIText size={12} color={subtextColor}>
                                                            {approver.personName || 'Designated Role'}
                                                        </SwiftUIText>
                                                        </VStack>
                                                        <Spacer />
                                                        <VStack alignment="trailing" spacing={2}>
                                                            <SwiftUIText size={12} weight="bold" color={getFinanceStatusColor(stepStatus, isDark)}>{stepStatus}</SwiftUIText>
                                                            {stepDate ? <SwiftUIText size={11} color={subtextColor}>{formatDateTime(stepDate)}</SwiftUIText> : null}
                                                        </VStack>
                                                    </HStack>
                                                </VStack>
                                            );
                                        })}
                                    </Section>
                                )}
                            </NativeFinanceList>

                            {/* Sticky Action Footer - 100% Native SwiftUI Sleek and Slim (height: 42) */}
                            {actions && actions.length > 0 && (
                                <VStack spacing={12} modifiers={[
                                    background(sheetBg),
                                    padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                                    frame({ maxWidth: Infinity })
                                ]}>
                                    {/* Row 1: Secondary/Icon Actions */}
                                    {actions.some(a => ['delete', 'reject', 'revision', 'edit', 'cancel_submit'].includes(a.id)) && (
                                        <HStack spacing={12}>
                                            {actions.filter(a => ['delete', 'reject'].includes(a.id)).map(action => (
                                                <Button
                                                    key={action.id}
                                                    variant="glass"
                                                    color="red"
                                                    systemImage={action.id === 'delete' ? 'trash' : 'xmark'}
                                                    onPress={() => onAction?.(action.id, request)}
                                                    modifiers={[
                                                        frame({ width: 56, height: 48 }),
                                                        cornerRadius(12),
                                                        shadow({ radius: 0, x: 0, y: 0, color: 'transparent' })
                                                    ]}
                                                />
                                            ))}

                                            {actions.filter(a => ['revision', 'edit', 'cancel_submit'].includes(a.id)).map(action => (
                                                <Button
                                                    key={action.id}
                                                    onPress={() => onAction?.(action.id, request)}
                                                    modifiers={[
                                                        buttonStyle('glass'),
                                                        frame({ maxWidth: Infinity }),
                                                        background(isDark ? `${action.color}30` : `${action.color}18`),
                                                        cornerRadius(999)
                                                    ]}
                                                >
                                                    <HStack alignment="center" spacing={6} modifiers={[
                                                        frame({ maxWidth: Infinity }),
                                                        frame({ height: 42 })
                                                    ]}>
                                                        <Spacer />
                                                        <SwiftUIImage systemName={action.icon as any} size={15} color={action.color} />
                                                        <SwiftUIText weight="bold" size={17} color={action.color}>
                                                            {action.label}
                                                        </SwiftUIText>
                                                        <Spacer />
                                                    </HStack>
                                                </Button>
                                            ))}
                                        </HStack>
                                    )}

                                    {/* Row 2: Primary Actions */}
                                    {actions.filter(a => ['approve', 'pay', 'submit'].includes(a.id)).map(action => (
                                        <Button
                                            key={action.id}
                                            variant="glassProminent"
                                            color={action.color}
                                            onPress={() => onAction?.(action.id, request)}
                                            modifiers={[
                                                frame({ maxWidth: Infinity })
                                            ]}
                                        >
                                            <HStack alignment="center" spacing={6} modifiers={[
                                                frame({ maxWidth: Infinity }),
                                                frame({ height: 42 })
                                            ]}>
                                                <Spacer />
                                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">{action.label}</SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    ))}
                                </VStack>
                            )}
                        </VStack>
                        {/* Premium Native Full-App Image & PDF Preview Sheet nested inside the main detail sheet ZStack (as a sibling overlay) */}
                        <BottomSheet
                            isOpened={!!activeDocUrl}
                            presentationDetents={[0.85]} // Native iOS 85% Height matching main drawer!
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
                                            onPress={handleDownloadFile}
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
                                            {activeDocUrl.toLowerCase().includes('.pdf') && WebView ? (
                                                <WebView
                                                    source={{ uri: activeDocUrl }}
                                                    style={{ width: SCREEN_WIDTH * 0.88, height: SCREEN_HEIGHT * 0.58, backgroundColor: 'transparent' }}
                                                    scalesPageToFit={true}
                                                />
                                            ) : (
                                                <RNImage
                                                    source={{ uri: activeDocUrl }}
                                                    style={{ width: SCREEN_WIDTH * 0.88, height: SCREEN_HEIGHT * 0.58 }}
                                                    resizeMode="contain"
                                                />
                                            )}
                                        </View>
                                    </VStack>
                                ) : (
                                    <Spacer />
                                )}
                            </VStack>
                        </BottomSheet>
                    </ZStack>
                </BottomSheet>
        </Host>
    );
};;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
    badge: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    viewerImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.58,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    modalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 30,
        paddingBottom: 10,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    docCard: {
        width: SCREEN_WIDTH * 0.8,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    docCardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    docCardSub: {
        fontSize: 14,
    },
    browserButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        marginTop: 8,
    },
    browserButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    rnModalContainer: {
        flex: 1,
        alignItems: 'center',
    },
    rnModalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    rnModalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    rnCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rnModalScrollContent: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingBottom: 80,
    },
    rnDocItemContainer: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 36,
    },
    rnDocItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    rnImageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.58,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    rnBrowserButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        marginTop: 8,
    },
    rnBrowserButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    rnDownloadButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    viewerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 40,
        overflow: 'hidden',
        zIndex: 9999,
    },
    viewerContainer: {
        width: '100%',
        height: '75%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerFullImage: {
        width: '90%',
        height: '90%',
    },
    viewerCloseBtn: {
        position: 'absolute',
        top: 30,
        right: 24,
        padding: 10,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
    },
    viewerDownloadBtn: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        gap: 8,
        zIndex: 10000,
    },
    viewerDownloadBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
