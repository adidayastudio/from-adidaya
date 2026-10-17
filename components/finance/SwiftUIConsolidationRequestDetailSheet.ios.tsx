import React, { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Clipboard, Dimensions, Image as RNImage, UIManager, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { BottomSheet, Button, DateTimePicker, Host, HStack, Picker, Section, Spacer, Switch, TextField, Text as SwiftUIText, VStack, ZStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, frame, ignoreSafeArea, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import { getConsolidationRequestIssues, PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { fetchBeneficiaryAccounts, resolveFinanceUrl, uploadFinanceFileBase64 } from '@/lib/api/finance';
import { attachmentKind, readPurchasingNotes, requestAttachments, splitReferenceNotes } from '@/lib/financeRequestPresentation';
import { evaluateApprovalChain, getFinanceApprovalMatrixSettings, getFinancePaymentTerms, getFinanceTaxRules } from '@/lib/api/financeSetup';
import { UNIT_OPTIONS } from './constants';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { getFinanceStatusBackground, getFinanceStatusColor } from '@/lib/financeStatusPresentation';

let WebView: any = null;
let isWebViewAvailable = false;
try {
    const { WebView: NativeWebView } = require('react-native-webview');
    WebView = NativeWebView;
    isWebViewAvailable = !!UIManager.getViewManagerConfig('RNCWebView');
} catch {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
    isOpened: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
    request: any | null;
    onChanged?: (request: any | null) => void;
    canProcessPayment?: boolean;
    onProcessPayment?: (request: any) => void;
    isPaymentMode?: boolean;
}

const money = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(value || 0).replace('IDR', 'Rp');

const date = (value?: string) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '';
const label = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) : '-';

export const SwiftUIConsolidationRequestDetailSheet: React.FC<Props> = ({ isOpened, onClose, consolidation, request, onChanged, canProcessPayment = false, onProcessPayment, isPaymentMode = false }) => {
    const { resolvedTheme } = useTheme();
    const { fundingSources, removeRequestFromConsolidation, updateConsolidationRequest } = useFinance();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [taxName, setTaxName] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [taxAmount, setTaxAmount] = useState('');
    const [taxType, setTaxType] = useState('addition');
    const [vendor, setVendor] = useState('');
    const [bank, setBank] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [discountType, setDiscountType] = useState('NONE');
    const [discountValue, setDiscountValue] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [paymentTermDays, setPaymentTermDays] = useState('');
    const [invoiceFiles, setInvoiceFiles] = useState<{ uri: string; name: string; mimeType?: string }[]>([]);
    const [invoiceAvailable, setInvoiceAvailable] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
    const [consolidationNotes, setConsolidationNotes] = useState('');
    const [taxRules, setTaxRules] = useState<any[]>([]);
    const [taxRuleIndex, setTaxRuleIndex] = useState(0);
    const [paymentTermsList, setPaymentTermsList] = useState<any[]>([]);
    const [paymentTermIndex, setPaymentTermIndex] = useState(0);
    const [approvalGroups, setApprovalGroups] = useState<Array<{ title: string; chain: any[] }>>([]);
    const [hydrationKey, setHydrationKey] = useState(0);
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
    const [accountSearch, setAccountSearch] = useState('');
    const [savedAccountIndex, setSavedAccountIndex] = useState(0);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewTitle, setPreviewTitle] = useState('Document Preview');

    useEffect(() => {
        if (!request || !consolidation || !isOpened) return;
        setEditing(false);
        setPreviewUrl('');
        const requestItems = (request.items || []).map((item: any) => ({ ...item }));
        setItems(requestItems.length ? requestItems : [{
            id: 'legacy-item',
            name: request.title || request.description || 'Requested Item',
            qty: Number(request.quantity) || 1,
            unit: request.unit || 'pcs',
            unit_price: Number(request.subtotal_amount ?? request.amount) || 0,
            total: Number(request.subtotal_amount ?? request.amount) || 0,
        }]);
        setTaxName(request.tax_name || '');
        setTaxRate(request.tax_rate != null ? String(request.tax_rate) : '');
        setTaxAmount(request.tax_amount != null ? String(request.tax_amount) : '');
        setTaxType(request.tax_type || 'addition');
        setVendor(request.vendor || '');
        setBank(request.beneficiary_bank || '');
        setAccountNumber(request.beneficiary_number || '');
        setAccountName(request.beneficiary_name || '');
        setSourceId(request.source_of_fund_id || '');
        setPaymentDate(request.payment_date || '');
        setDiscountType(String(request.discount_type || 'NONE').toUpperCase());
        setDiscountValue(String(request.discount_value ?? ''));
        setPaymentTerms(request.payment_term_name || '');
        setPaymentTermDays(String(request.payment_term_days ?? ''));
        const invoiceUrls = String(request.consolidation_invoice_url || '').split(',').map((value: string) => value.trim()).filter(Boolean);
        const invoiceNames = String(request.consolidation_invoice_name || '').split(',').map((value: string) => value.trim());
        setInvoiceFiles(invoiceUrls.map((uri: string, index: number) => ({ uri, name: invoiceNames[index] || `Invoice ${index + 1}` })));
        setInvoiceAvailable(invoiceUrls.length > 0);
        setInvoiceNumber(request.consolidation_invoice_number || request.invoice_number || '');
        setInvoiceDate(new Date(request.consolidation_invoice_date || request.invoice_date || Date.now()));
        setConsolidationNotes(request.consolidation_notes || '');
        setHydrationKey(key => key + 1);
        Promise.all([getFinanceTaxRules(), getFinancePaymentTerms(), getFinanceApprovalMatrixSettings(), fetchBeneficiaryAccounts()]).then(([taxes, terms, matrix, accounts]) => {
            const availableTaxes = [{ id: 'none', name: 'No Tax / Deduction', rate: 0, taxType: 'vat' }, ...taxes.filter(item => item.active !== false)];
            const availableTerms = [{ id: 'not_specified', name: 'Not Specified', days: 0 }, ...terms.filter(item => item.status === 'active')];
            setTaxRules(availableTaxes);
            setPaymentTermsList(availableTerms);
            setSavedAccounts(accounts);
            setTaxRuleIndex(Math.max(0, availableTaxes.findIndex(item => item.id === request.tax_rule_id || item.name === request.tax_name)));
            setPaymentTermIndex(Math.max(0, availableTerms.findIndex(item => item.id === request.payment_term_id || item.name === request.payment_term_name)));
            setApprovalGroups([
                { title: 'Request Approval', chain: evaluateApprovalChain('purchasing_request', request.department_id, request._originalRequest?.amount || request.amount, matrix) },
                { title: 'Consolidation Approval', chain: consolidation.approval_chain || evaluateApprovalChain('purchasing_consolidation', null, consolidation.total_amount, matrix) },
                { title: 'Payment Approval', chain: evaluateApprovalChain('purchasing_payment', request.department_id, request.amount, matrix) },
            ]);
        });
    }, [request, isOpened, consolidation]);

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unit_price) || 0), 0), [items]);
    const discountAmount = discountType.toUpperCase() === 'PERCENT'
        ? Math.round(subtotal * Math.min(100, Math.max(0, Number(discountValue) || 0)) / 100)
        : discountType.toUpperCase() === 'FIXED' ? Math.min(subtotal, Number(discountValue) || 0) : 0;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const activeTax = taxRules[taxRuleIndex];
    const activePaymentTerm = paymentTermsList[paymentTermIndex];
    const original = request?._originalRequest || request;
    const calculatedTargetDate = useMemo(() => {
        if (!activePaymentTerm?.days) return original?.target_date;
        const target = new Date(invoiceDate);
        target.setDate(target.getDate() + Number(activePaymentTerm.days));
        return target.toISOString().split('T')[0];
    }, [activePaymentTerm, invoiceDate, original?.target_date]);
    const calculatedTaxRate = editing && activeTax ? Number(activeTax.rate) || 0 : Number(taxRate) || 0;
    const calculatedTaxType = editing && activeTax ? activeTax.taxType : taxType;
    const calculatedTaxName = editing && activeTax ? activeTax.name : taxName;
    const effectiveTax = editing
        ? (calculatedTaxRate ? discountedSubtotal * calculatedTaxRate / 100 : 0)
        : (calculatedTaxRate ? discountedSubtotal * calculatedTaxRate / 100 : Number(taxAmount) || 0);
    const total = Math.max(0, discountedSubtotal + (calculatedTaxType?.toLowerCase() === 'withholding' ? -effectiveTax : effectiveTax));

    if (!request || !consolidation) return null;

    const requestRef = request.shortRef || request.ref || request.cardRef || 'PR';
    const incompleteIssues = getConsolidationRequestIssues(request);
    const originalNotes = splitReferenceNotes(readPurchasingNotes(original.notes || '').notes).notes;
    const attachmentGroups = ['IMAGE', 'LINK', 'DOCUMENT', 'RECEIPT', 'INVOICE'].map(kind => ({
        kind,
        files: requestAttachments(original).filter(file => attachmentKind(file) === kind),
    })).filter(group => group.files.length > 0);
    const department = original.department?.code || original.department?.name || original.department_code || original.project || 'Unassigned';
    const editable = ['Draft', 'Revision'].includes(consolidation.status);
    const updateItem = (index: number, values: any) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));

    const handlePickInvoice = () => Alert.alert('Attach Invoice', 'Choose invoice source', [
        {
            text: 'Photo Library',
            onPress: async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
                if (!result.canceled && result.assets.length) {
                    setInvoiceFiles(current => [...current, ...result.assets.map(asset => ({
                        uri: asset.uri,
                        name: asset.fileName || asset.uri.split('/').pop() || 'Invoice.jpg',
                        mimeType: asset.mimeType || 'image/jpeg',
                    }))]);
                }
            },
        },
        {
            text: 'Files',
            onPress: async () => {
                const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
                if (!result.canceled && result.assets.length) {
                    setInvoiceFiles(current => [...current, ...result.assets.map(asset => ({
                        uri: asset.uri,
                        name: asset.name || 'Invoice',
                        mimeType: asset.mimeType || 'application/octet-stream',
                    }))]);
                }
            },
        },
        { text: 'Cancel', style: 'cancel' },
    ]);
    const copyValue = (value: string | number, name: string) => {
        Clipboard.setString(String(value));
        Alert.alert('Copied', `${name} copied to clipboard.`);
    };

    const openPreview = async (file: any, title: string) => {
        const rawUrl = file.invoice_url || file.url || '';
        if (!rawUrl) return;
        const resolvedUrl = await resolveFinanceUrl(rawUrl);
        if (title === 'Links') {
            await openBrowserAsync(resolvedUrl, { presentationStyle: WebBrowserPresentationStyle.FORM_SHEET });
            return;
        }
        setPreviewTitle(file.invoice_name || file.name || title);
        setPreviewUrl(resolvedUrl);
    };

    const handleOpenDocuments = (files: any[], title: string) => {
        if (files.length === 1) {
            openPreview(files[0], title);
            return;
        }
        ActionSheetIOS.showActionSheetWithOptions({
            options: ['Cancel', ...files.map((file, index) => file.invoice_name || file.name || `${title} ${index + 1}`)],
            cancelButtonIndex: 0,
        }, index => {
            if (index > 0) openPreview(files[index - 1], title);
        });
    };

    const handleRemove = () => Alert.alert(
        'Remove Request',
        `Remove ${requestRef} from Consolidation ${consolidation.document_number}?`,
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    await removeRequestFromConsolidation(consolidation.id, request.id);
                    onChanged?.(null);
                    onClose();
                },
            },
        ]
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!invoiceAvailable || !invoiceFiles.length) {
                Alert.alert('Invoice Required', 'Add an invoice before saving this Consolidation Request.');
                return;
            }
            const uploadedInvoices = await Promise.all(invoiceFiles.map(async file => {
                if (!file.uri.startsWith('file://')) return file;
                const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
                const extension = file.name.split('.').pop() || 'pdf';
                const normalizedExtension = extension.toLowerCase();
                const contentType = file.mimeType
                    || (normalizedExtension === 'pdf' ? 'application/pdf' : normalizedExtension === 'jpg' ? 'image/jpeg' : `image/${normalizedExtension}`);
                return { ...file, uri: await uploadFinanceFileBase64(base64, extension, contentType, 'purchase') };
            }));
            const values = {
                items: items.map(item => ({
                    qty: Number(item.qty) || 0,
                    unit: item.unit || 'pcs',
                    unit_price: Number(item.unit_price) || 0,
                    total: (Number(item.qty) || 0) * (Number(item.unit_price) || 0),
                })),
                amount: total,
                tax_rule_id: activeTax?.id === 'none' ? null : activeTax?.id,
                tax_name: calculatedTaxName?.trim() || 'No Tax / Deduction',
                tax_rate: calculatedTaxRate,
                tax_amount: effectiveTax,
                tax_type: calculatedTaxType || 'vat',
                vendor: vendor.trim(),
                beneficiary_bank: bank.trim(),
                beneficiary_number: accountNumber.trim(),
                beneficiary_name: accountName.trim(),
                source_of_fund_id: sourceId.trim(),
                payment_date: paymentDate.trim(),
                discount_type: discountType.trim().toUpperCase() || 'NONE',
                discount_value: Number(discountValue) || 0,
                discount_amount: discountAmount,
                subtotal_amount: subtotal,
                payment_term_id: activePaymentTerm?.id === 'not_specified' ? null : activePaymentTerm?.id,
                payment_term_name: activePaymentTerm?.name || paymentTerms.trim(),
                payment_term_days: Number(activePaymentTerm?.days ?? paymentTermDays) || 0,
                consolidation_invoice_url: uploadedInvoices.map(file => file.uri).join(','),
                consolidation_invoice_name: uploadedInvoices.map(file => file.name).join(','),
                consolidation_invoice_number: invoiceNumber.trim(),
                consolidation_invoice_date: invoiceDate.toISOString().split('T')[0],
                target_date: calculatedTargetDate,
                consolidation_notes: consolidationNotes.trim(),
            };
            const changed = values.items.some((item, index) =>
                item.qty !== Number(original.items?.[index]?.qty || 0)
                || item.unit !== String(original.items?.[index]?.unit || 'pcs')
                || item.unit_price !== Number(original.items?.[index]?.unit_price || 0)
            ) || [
                ['tax_name', values.tax_name], ['tax_rate', values.tax_rate], ['tax_amount', values.tax_amount],
                ['tax_type', values.tax_type], ['vendor', values.vendor], ['beneficiary_bank', values.beneficiary_bank],
                ['beneficiary_number', values.beneficiary_number], ['beneficiary_name', values.beneficiary_name],
                ['source_of_fund_id', values.source_of_fund_id], ['payment_date', values.payment_date],
                ['discount_type', values.discount_type], ['discount_value', values.discount_value],
                ['payment_term_name', values.payment_term_name], ['payment_term_days', values.payment_term_days],
                ['consolidation_invoice_url', values.consolidation_invoice_url],
                ['consolidation_invoice_number', values.consolidation_invoice_number],
                ['consolidation_invoice_date', values.consolidation_invoice_date],
                ['target_date', values.target_date],
                ['consolidation_notes', values.consolidation_notes],
            ].some(([key, value]) => String(value || '') !== String(original[key] || ''));
            await updateConsolidationRequest(consolidation.id, request.id, changed ? values : null);
            onChanged?.(changed
                ? { ...request, ...values, _consolidationUpdated: true, _originalRequest: original }
                : { ...original, _consolidationUpdated: false });
            setEditing(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#6E6E73';
    const priority = String(original.priority || 'medium').toLowerCase();
    const priorityColor = priority === 'low' ? '#34C759' : priority === 'medium' ? '#FF9500' : '#FF3B30';
    const priorityBg = priority === 'low' ? 'rgba(52,199,89,0.15)' : priority === 'medium' ? 'rgba(255,149,0,0.15)' : 'rgba(255,59,48,0.15)';
    const displayedTargetDate = editing ? calculatedTargetDate : request.target_date;
    const targetDate = displayedTargetDate ? new Date(displayedTargetDate) : null;
    const isOverdue = Boolean(targetDate && targetDate.getTime() < new Date().setHours(0, 0, 0, 0));
    const requestPaymentHistory = request._payment_history || [];
    const batchPaymentHistory = (consolidation.audit_trail || []).filter((audit: any) =>
        audit.action === 'payment_batch_processed' && audit.details?.paid_request_ids?.includes(request.id)
    );
    const paymentHistory = requestPaymentHistory.map((payment: any) => {
        const paymentTime = new Date(payment.created_at || payment.details?.payment_date || 0).getTime();
        const matchingBatch = batchPaymentHistory
            .map((batch: any) => ({ batch, distance: Math.abs(new Date(batch.created_at || batch.details?.payment_date || 0).getTime() - paymentTime) }))
            .sort((a: any, b: any) => a.distance - b.distance)[0]?.batch;
        return matchingBatch ? {
            ...payment,
            details: { ...(matchingBatch.details || {}), ...(payment.details || {}) },
        } : payment;
    });
    const totalPaid = Number(request._paid_amount || 0);
    const remainingAmount = Math.max(0, Number(request.amount || 0) - totalPaid);
    const status = totalPaid >= Number(request.amount || 0) && Number(request.amount || 0) > 0
        ? 'Paid'
        : totalPaid > 0
            ? 'Partially Paid'
            : original.status || (['Draft', 'Pending'].includes(consolidation.status) ? 'Consolidated' : 'Approved');
    const fallbackSource = fundingSources.find(source => source.id === request.source_of_fund_id);
    const fallbackSourceName = fallbackSource
        ? `${fallbackSource.provider || fallbackSource.name}${fallbackSource.provider && fallbackSource.name ? ` · ${fallbackSource.name}` : ''}`
        : request.source_of_fund_id;
    const discountTypeIndex = discountType === 'PERCENT' ? 1 : discountType === 'FIXED' ? 2 : 0;
    const taxOptions = taxRules.map(rule => rule.rate ? `${rule.name} (${rule.rate}% ${rule.taxType === 'withholding' ? 'Potongan (-)' : 'Pajak (+)'})` : rule.name);
    const filteredAccounts = savedAccounts.filter(account => {
        const query = accountSearch.toLowerCase();
        return !query || [account.account_name, account.bank_name, account.account_number, account.vendor_name].some(value => String(value || '').toLowerCase().includes(query));
    });
    const savedAccountOptions = ['Select Saved Account', ...filteredAccounts.map(account => `${account.account_name} (${account.bank_name} - ${account.account_number})`)];
    const documentLabels: Record<string, string> = {
        IMAGE: 'Photo References', LINK: 'Links', DOCUMENT: 'Document References', RECEIPT: 'Receipt', INVOICE: 'Invoice',
    };
    const approvalStatus = (group: string, index: number) => {
        if (group === 'Request Approval') return 'Approved';
        if (group === 'Consolidation Approval') {
            if (['Approved', 'Paying', 'Partially Paid', 'Paid'].includes(consolidation.status)) return 'Approved';
            if (consolidation.status === 'Rejected') return 'Rejected';
            if (consolidation.status === 'Cancelled') return 'Cancelled';
            if (consolidation.status === 'Pending') return index === 0 ? 'Pending' : 'Submitted';
            return 'Draft';
        }
        if (status === 'Paid') return isPaymentMode ? 'Paid' : 'Approved';
        if (status === 'Partially Paid') return isPaymentMode ? 'Partially Paid' : 'Submitted';
        if (isPaymentMode) return index === 0 ? 'Pending' : 'Submitted';
        return status === 'Approved' ? 'Submitted' : 'Draft';
    };
    const emptyApprovalStatus = (group: string) => {
        if (group === 'Request Approval') return 'Approved';
        if (group === 'Consolidation Approval' && ['Approved', 'Paying', 'Partially Paid', 'Paid'].includes(consolidation.status)) return 'Approved';
        if (group === 'Payment Approval' && status === 'Paid') return isPaymentMode ? 'Paid' : 'Approved';
        if (group === 'Payment Approval' && status === 'Partially Paid') return isPaymentMode ? 'Partially Paid' : 'Submitted';
        if (group === 'Payment Approval' && isPaymentMode) return 'Pending';
        return consolidation.status === 'Draft' ? 'Draft' : 'Submitted';
    };

    const approvalTimestamp = (group: string, index: number, status: string) => {
        if (!['Approved', 'Partially Paid', 'Paid', 'Rejected', 'Cancelled'].includes(status)) return '';
        if (group === 'Request Approval') return original.approved_at || original.updated_at;
        if (group === 'Consolidation Approval') {
            const audit = (consolidation.audit_trail || []).find(item =>
                item.action === 'approval_level_approved' && Number(item.details?.approval_level) === index
            ) || (consolidation.audit_trail || []).find(item => item.action === status.toLowerCase() || (status === 'Approved' && item.action === 'approved'));
            return audit?.created_at || consolidation.approved_at || '';
        }
        const payment = [...paymentHistory].reverse().find(item => item.created_at || item.payment_date);
        return payment?.created_at || payment?.payment_date || request.payment_date || '';
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet isOpened={isOpened} presentationDetents={[0.85, 'large']} presentationDragIndicator="visible" onIsOpenedChange={opened => { if (!opened) onClose(); }}>
                <ZStack>
                    <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background('clear')]}>
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <VStack alignment="leading" spacing={3}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>{requestRef}</SwiftUIText>
                            <HStack spacing={8}>
                                <SwiftUIText size={13} weight="semibold" color={getFinanceStatusColor(isPaymentMode ? status : 'Approved', isDark)}>{isPaymentMode ? status : 'Approved'}</SwiftUIText>
                                {request._consolidationUpdated ? <SwiftUIText size={13} weight="semibold" color="#FF9500">Updated</SwiftUIText> : null}
                            </HStack>
                        </VStack>
                        <Spacer />
                        <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={onClose} />
                    </HStack>

                    <NativeFinanceList key={`${request.id}-${hydrationKey}-${editing ? 'edit' : 'view'}`} backgroundColor={isDark ? '#000000' : '#FFFFFF'}>
                        {incompleteIssues.length > 0 ? (
                            <Section title="Incomplete Information">
                                {incompleteIssues.map(issue => <SwiftUIText key={issue} color="#FF3B30">{`• ${issue}`}</SwiftUIText>)}
                            </Section>
                        ) : null}
                        <Section title="General Information">
                            <HStack><SwiftUIText color={subtextColor}>Request Type</SwiftUIText><Spacer /><SwiftUIText color={textColor}>Purchase</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Department</SwiftUIText><Spacer /><SwiftUIText color={textColor} weight="semibold">{department}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Submitter</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{original.submitted_by_name || original.created_by_name || original.approved_by_name || '-'}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Target Date</SwiftUIText><Spacer /><SwiftUIText color={isOverdue ? '#FF3B30' : textColor} weight={isOverdue ? 'semibold' : 'regular'}>{date(displayedTargetDate)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Category</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{label(original.type || original.category)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Subcategory</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{label(original.subcategory)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Priority</SwiftUIText><Spacer /><SwiftUIText color={priorityColor} weight="semibold" modifiers={[padding({ vertical: 6, horizontal: 14 }), background(priorityBg), cornerRadius(16)]}>{label(priority)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Description</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{original.title || original.description || '-'}</SwiftUIText></HStack>
                        </Section>

                        <Section title="Amount & Status">
                            <HStack><SwiftUIText color={subtextColor}>Original Amount</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{money(original.amount)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText weight="bold" color={textColor}>Consolidation Amount</SwiftUIText><Spacer /><SwiftUIText weight="bold" color="#007AFF">{money(editing ? total : request.amount)}</SwiftUIText><Button systemImage="square.on.square" variant="plain" onPress={() => copyValue(editing ? total : request.amount, 'Amount')} /></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Status</SwiftUIText><Spacer /><SwiftUIText color={getFinanceStatusColor(status, isDark)} weight="semibold" modifiers={[padding({ vertical: 6, horizontal: 14 }), background(getFinanceStatusBackground(status, isDark)), cornerRadius(16)]}>{label(status)}</SwiftUIText></HStack>
                        </Section>

                        {isPaymentMode ? (
                            <Section title="Payment Summary & History">
                                <HStack><SwiftUIText color={subtextColor}>Paid</SwiftUIText><Spacer /><SwiftUIText color="#34C759" weight="semibold">{money(totalPaid)}</SwiftUIText></HStack>
                                <HStack><SwiftUIText color={subtextColor}>Remaining</SwiftUIText><Spacer /><SwiftUIText color={remainingAmount > 0 ? '#FF9500' : '#34C759'} weight="semibold">{money(remainingAmount)}</SwiftUIText></HStack>
                                {!paymentHistory.length ? <SwiftUIText color={subtextColor}>No payments recorded.</SwiftUIText> : null}
                                {paymentHistory.map((payment: any, index: number) => (
                                    <VStack key={payment.id || index} alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                        <HStack><SwiftUIText weight="semibold" color={textColor}>{`Payment ${index + 1}`}</SwiftUIText><Spacer /><SwiftUIText weight="semibold" color={textColor}>{money(Number(payment.details?.amount || (paymentHistory.length === 1 ? totalPaid : 0)))}</SwiftUIText></HStack>
                                        <HStack><SwiftUIText size={12} color={subtextColor}>Source of Funds</SwiftUIText><Spacer /><SwiftUIText size={12} color={textColor}>{payment.details?.source_of_fund_name || fallbackSourceName || '-'}</SwiftUIText></HStack>
                                        <HStack><SwiftUIText size={12} color={subtextColor}>Pay Date</SwiftUIText><Spacer /><SwiftUIText size={12} color={textColor}>{dateTime(payment.created_at || payment.details?.payment_date || request.payment_date)}</SwiftUIText></HStack>
                                        <VStack alignment="leading" spacing={2}><SwiftUIText size={12} color={subtextColor}>Payment Notes</SwiftUIText><SwiftUIText size={12} color={textColor}>{payment.details?.payment_notes || '-'}</SwiftUIText></VStack>
                                    </VStack>
                                ))}
                            </Section>
                        ) : null}

                        <Section title="Payment Details">
                            {editing ? (
                                <>
                                    <TextField placeholder="Search Saved Accounts..." defaultValue={accountSearch} onChangeText={setAccountSearch} />
                                    <Picker
                                        label="Quick Select"
                                        options={savedAccountOptions}
                                        selectedIndex={savedAccountIndex}
                                        onOptionSelected={event => {
                                            const index = event.nativeEvent.index;
                                            setSavedAccountIndex(index);
                                            if (index > 0) {
                                                const account = filteredAccounts[index - 1];
                                                setBank(account.bank_name || '');
                                                setAccountNumber(account.account_number || '');
                                                setAccountName(account.account_name || '');
                                                if (account.vendor_name) setVendor(account.vendor_name);
                                            }
                                        }}
                                        variant="menu"
                                        modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                    />
                                    <TextField placeholder="Bank" defaultValue={bank} onChangeText={setBank} />
                                    <TextField placeholder="Account number" defaultValue={accountNumber} keyboardType="numeric" onChangeText={setAccountNumber} />
                                    <TextField placeholder="Account holder" defaultValue={accountName} onChangeText={setAccountName} />
                                </>
                            ) : (
                                <>
                                    <HStack><SwiftUIText color={subtextColor}>Bank</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{bank || '-'}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Account Number</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{accountNumber || '-'}</SwiftUIText>{accountNumber ? <Button systemImage="square.on.square" variant="plain" onPress={() => copyValue(accountNumber, 'Account number')} /> : null}</HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Account Holder</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{accountName || '-'}</SwiftUIText></HStack>
                                </>
                            )}
                        </Section>

                        <Section title={`Item List (${items.length})`}>
                            {items.map((item, index) => (
                                <VStack key={item.id || index} alignment="leading" spacing={7} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>{item.name || item.item_name || `Item ${index + 1}`}</SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>Item identity locked</SwiftUIText>
                                    {editing ? (
                                        <VStack spacing={8}>
                                            <HStack spacing={10}>
                                                <TextField placeholder="Quantity" defaultValue={String(item.qty || '')} keyboardType="decimal-pad" onChangeText={value => updateItem(index, { qty: Number(value) || 0 })} />
                                                <Picker
                                                    options={UNIT_OPTIONS.map(unit => unit.label)}
                                                    selectedIndex={Math.max(0, UNIT_OPTIONS.findIndex(unit => unit.value === item.unit))}
                                                    onOptionSelected={event => updateItem(index, { unit: UNIT_OPTIONS[event.nativeEvent.index]?.value || 'pcs' })}
                                                    variant="menu"
                                                    modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                                />
                                            </HStack>
                                            <TextField placeholder="Unit price" defaultValue={String(item.unit_price || '')} keyboardType="decimal-pad" onChangeText={value => updateItem(index, { unit_price: Number(value) || 0 })} />
                                            <HStack><SwiftUIText color={subtextColor}>Line Total</SwiftUIText><Spacer /><SwiftUIText color={textColor} weight="semibold">{money((Number(item.qty) || 0) * (Number(item.unit_price) || 0))}</SwiftUIText></HStack>
                                        </VStack>
                                    ) : (
                                        <HStack><SwiftUIText color={subtextColor}>{`${item.qty} × ${money(item.unit_price)}`}</SwiftUIText><Spacer /><SwiftUIText color={textColor} weight="semibold">{money(item.total)}</SwiftUIText></HStack>
                                    )}
                                </VStack>
                            ))}
                        </Section>

                        <Section title="Commercial Details">
                            {editing ? (
                                <>
                                    <TextField placeholder="Vendor" defaultValue={vendor} onChangeText={setVendor} />
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Discount</SwiftUIText>
                                        <Picker
                                            options={['None', '% Percent', 'Rp Fixed']}
                                            selectedIndex={discountTypeIndex}
                                            onOptionSelected={event => {
                                                setDiscountType(event.nativeEvent.index === 1 ? 'PERCENT' : event.nativeEvent.index === 2 ? 'FIXED' : 'NONE');
                                                setDiscountValue('');
                                            }}
                                            variant="segmented"
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    </VStack>
                                    {discountTypeIndex > 0 ? <TextField placeholder={discountTypeIndex === 1 ? 'Enter percentage (1 - 100)' : 'Enter amount (Rp)'} defaultValue={discountValue} keyboardType="decimal-pad" onChangeText={setDiscountValue} /> : null}
                                    <Picker
                                        label="Tax / Deduction"
                                        options={taxOptions}
                                        selectedIndex={taxRuleIndex}
                                        onOptionSelected={event => setTaxRuleIndex(event.nativeEvent.index)}
                                        variant="menu"
                                        modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                    />
                                    <Picker
                                        label="Payment Term"
                                        options={paymentTermsList.map(term => term.name)}
                                        selectedIndex={paymentTermIndex}
                                        onOptionSelected={event => setPaymentTermIndex(event.nativeEvent.index)}
                                        variant="menu"
                                        modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                    />
                                    <HStack><SwiftUIText color={subtextColor}>Subtotal</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{money(subtotal)}</SwiftUIText></HStack>
                                    {discountAmount > 0 ? <HStack><SwiftUIText color="#FF3B30">{discountTypeIndex === 1 ? `Discount (${discountValue}%)` : 'Discount'}</SwiftUIText><Spacer /><SwiftUIText color="#FF3B30">{`- ${money(discountAmount)}`}</SwiftUIText></HStack> : null}
                                    {effectiveTax > 0 ? <HStack><SwiftUIText color={subtextColor}>{`${calculatedTaxName} (${calculatedTaxRate}%)`}</SwiftUIText><Spacer /><SwiftUIText color={calculatedTaxType === 'withholding' ? '#FF9500' : '#007AFF'}>{`${calculatedTaxType === 'withholding' ? '-' : '+'} ${money(effectiveTax)}`}</SwiftUIText></HStack> : null}
                                    <HStack><SwiftUIText weight="bold" color={textColor}>Grand Total</SwiftUIText><Spacer /><SwiftUIText weight="bold" color="#007AFF">{money(total)}</SwiftUIText></HStack>
                                </>
                            ) : (
                                <>
                                    <HStack><SwiftUIText color={subtextColor}>Vendor</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{vendor || '-'}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Subtotal</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{money(request.subtotal_amount ?? subtotal)}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Discount</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{discountType === 'NONE' ? 'None' : discountType === 'PERCENT' ? `${discountValue}% · ${money(request.discount_amount || discountAmount)}` : money(request.discount_amount || discountAmount)}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Tax / Deduction</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{effectiveTax ? `${taxName} (${taxRate}%) · ${taxType === 'withholding' ? '-' : '+'} ${money(effectiveTax)}` : 'None'}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText color={subtextColor}>Payment Terms</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{paymentTerms || '-'}</SwiftUIText></HStack>
                                    <HStack><SwiftUIText weight="bold" color={textColor}>Grand Total</SwiftUIText><Spacer /><SwiftUIText weight="bold" color="#007AFF">{money(request.amount)}</SwiftUIText></HStack>
                                </>
                            )}
                        </Section>

                        <Section title="Documents & References">
                            {attachmentGroups.map(group => (
                                <HStack key={group.kind}>
                                    <SwiftUIText color={textColor}>{documentLabels[group.kind]}</SwiftUIText><Spacer />
                                    <Button variant="glass" color="gray" onPress={() => handleOpenDocuments(group.files, documentLabels[group.kind])}>
                                        <SwiftUIText size={13} weight="semibold" color={textColor}>{`${group.files.length} ${group.kind === 'LINK' ? (group.files.length === 1 ? 'Link' : 'Links') : (group.files.length === 1 ? 'File' : 'Files')}`}</SwiftUIText>
                                    </Button>
                                </HStack>
                            ))}
                            {attachmentGroups.length === 0 ? <SwiftUIText color={subtextColor}>No original references</SwiftUIText> : null}
                        </Section>

                        <Section title="Invoice Details">
                            {editing ? (
                                <>
                                    <Switch value={invoiceAvailable} onValueChange={setInvoiceAvailable} label="Has Invoice" color="#007AFF" />
                                    {invoiceAvailable ? (
                                        <VStack spacing={8} modifiers={[padding({ top: 4 })]}>
                                            <TextField placeholder="Invoice Number (Optional)" defaultValue={invoiceNumber} onChangeText={setInvoiceNumber} />
                                            <DateTimePicker title="Invoice Date (Optional)" initialDate={invoiceDate.toISOString()} onDateSelected={setInvoiceDate} variant="compact" displayedComponents="date" />
                                            <HStack alignment="center">
                                                <SwiftUIText color={subtextColor}>Invoice File</SwiftUIText><Spacer />
                                                {invoiceFiles.length ? <Button variant="glass" color="gray" onPress={() => handleOpenDocuments(invoiceFiles.map(file => ({ invoice_url: file.uri, invoice_name: file.name })), 'Consolidation Invoice')}><SwiftUIText size={13} weight="semibold" color={textColor}>{`${invoiceFiles.length} ${invoiceFiles.length === 1 ? 'File' : 'Files'}`}</SwiftUIText></Button> : null}
                                                <Button systemImage="plus" variant="plain" color="#007AFF" onPress={handlePickInvoice}>{invoiceFiles.length ? 'Add' : 'Attach Invoice'}</Button>
                                                {invoiceFiles.length ? <Button systemImage="xmark.circle.fill" variant="plain" color="#FF3B30" onPress={() => setInvoiceFiles([])} /> : null}
                                            </HStack>
                                        </VStack>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    {invoiceFiles.length ? <HStack><SwiftUIText color={subtextColor}>Invoice Number</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{invoiceNumber || '-'}</SwiftUIText></HStack> : null}
                                    {invoiceFiles.length ? <HStack><SwiftUIText color={subtextColor}>Invoice Date</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{date(request.consolidation_invoice_date || request.invoice_date)}</SwiftUIText></HStack> : null}
                                    <HStack><SwiftUIText color={subtextColor}>Invoice File</SwiftUIText><Spacer />{invoiceFiles.length ? <Button variant="glass" color="gray" onPress={() => handleOpenDocuments(invoiceFiles.map(file => ({ invoice_url: file.uri, invoice_name: file.name })), 'Consolidation Invoice')}><SwiftUIText color={textColor}>{`${invoiceFiles.length} ${invoiceFiles.length === 1 ? 'File' : 'Files'}`}</SwiftUIText></Button> : <SwiftUIText color="#FF3B30">Required</SwiftUIText>}</HStack>
                                </>
                            )}
                        </Section>

                        <Section title="Notes">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={12} color={subtextColor}>Original Request Notes</SwiftUIText>
                                <SwiftUIText color={originalNotes ? textColor : subtextColor}>{originalNotes || 'No notes provided'}</SwiftUIText>
                            </VStack>
                            {editing ? <TextField placeholder="Consolidation notes" defaultValue={consolidationNotes} onChangeText={setConsolidationNotes} /> : <HStack><SwiftUIText color={subtextColor}>Consolidation Notes</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{consolidationNotes || '-'}</SwiftUIText></HStack>}
                        </Section>

                        <Section title="Approval Workflow">
                            {approvalGroups.map(group => (
                                <VStack key={group.title} alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={14} weight="bold" color={textColor}>{group.title}</SwiftUIText>
                                    {group.chain.length ? group.chain.map((approver, index) => {
                                        const stepStatus = approvalStatus(group.title, index);
                                        const timestamp = approvalTimestamp(group.title, index, stepStatus);
                                        const position = approver.positionTitle || 'Approver';
                                        return <HStack key={approver.id || index}>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={14} weight="semibold" color={textColor}>{group.chain.length > 1 ? `L${index + 1} · ${position}` : position}</SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>{approver.personName || '-'}</SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <VStack alignment="trailing" spacing={2}>
                                                <SwiftUIText size={12} weight="semibold" color={getFinanceStatusColor(stepStatus, isDark)}>{stepStatus}</SwiftUIText>
                                                {timestamp ? <SwiftUIText size={11} color={subtextColor}>{dateTime(timestamp)}</SwiftUIText> : null}
                                            </VStack>
                                        </HStack>;
                                    }) : (
                                        <HStack>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={14} weight="semibold" color={textColor}>{original.approved_by_position || 'Approver'}</SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>{group.title === 'Request Approval' ? original.approved_by_name || '-' : 'Not assigned'}</SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <VStack alignment="trailing" spacing={2}>
                                                <SwiftUIText size={12} color={getFinanceStatusColor(emptyApprovalStatus(group.title), isDark)}>{emptyApprovalStatus(group.title)}</SwiftUIText>
                                                {approvalTimestamp(group.title, 0, emptyApprovalStatus(group.title)) ? <SwiftUIText size={11} color={subtextColor}>{dateTime(approvalTimestamp(group.title, 0, emptyApprovalStatus(group.title)))}</SwiftUIText> : null}
                                            </VStack>
                                        </HStack>
                                    )}
                                </VStack>
                            ))}
                        </Section>
                    </NativeFinanceList>

                    {editable ? (
                        <HStack spacing={10} modifiers={[padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }), frame({ maxWidth: Infinity })]}>
                            {editing ? null : (
                                <Button role="destructive" variant="glass" color="red" onPress={handleRemove}>
                                    <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={17} weight="semibold" color="#FF3B30">Remove</SwiftUIText><Spacer /></HStack>
                                </Button>
                            )}
                            <Button variant="glassProminent" color="#007AFF" disabled={saving} onPress={editing ? handleSave : () => setEditing(true)}>
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={17} weight="semibold" color="#FFFFFF">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Edit Request'}</SwiftUIText><Spacer /></HStack>
                            </Button>
                        </HStack>
                    ) : null}
                    {canProcessPayment && request.financial_status !== 'PAID' && request.status !== 'Paid' && onProcessPayment ? (
                        <Button variant="glassProminent" color="#007AFF" onPress={() => onProcessPayment(request)} modifiers={[padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }), frame({ maxWidth: Infinity })]}>
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}><Spacer /><SwiftUIText size={17} weight="semibold" color="#FFFFFF">Pay Request</SwiftUIText><Spacer /></HStack>
                        </Button>
                    ) : null}
                    </VStack>

                    <BottomSheet isOpened={!!previewUrl} presentationDetents={[0.85]} onIsOpenedChange={opened => { if (!opened) setPreviewUrl(''); }}>
                        <VStack spacing={16} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background('clear'), padding({ all: 20 })]}>
                            <HStack alignment="center">
                                <SwiftUIText size={20} weight="bold" color={textColor}>{previewTitle}</SwiftUIText>
                                <Spacer />
                                <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={() => setPreviewUrl('')} />
                            </HStack>
                            <View style={{ width: SCREEN_WIDTH - 40, height: SCREEN_HEIGHT * 0.66, borderRadius: 24, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' }}>
                                {/\.(jpg|jpeg|png|webp|gif|heic|heif)(\?.*)?$/i.test(previewUrl) || previewUrl.startsWith('file://') ? (
                                    <RNImage source={{ uri: previewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                ) : isWebViewAvailable && WebView ? (
                                    <WebView source={{ uri: previewUrl }} style={{ width: SCREEN_WIDTH - 40, height: SCREEN_HEIGHT * 0.66 }} scalesPageToFit />
                                ) : (
                                    <SwiftUIText color={subtextColor}>Preview unavailable</SwiftUIText>
                                )}
                            </View>
                        </VStack>
                    </BottomSheet>
                </ZStack>
            </BottomSheet>
        </Host>
    );
};
