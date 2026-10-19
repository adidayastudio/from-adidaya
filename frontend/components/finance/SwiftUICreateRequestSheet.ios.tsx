import { transactionCategoriesFor, transactionCategoryValue } from '@/lib/financeTransactionCategories';
import { attachmentKind, requestAttachments, splitReferenceNotes } from '@/lib/financeRequestPresentation';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, Image as RNImage, StyleSheet, View, Dimensions } from 'react-native';
import { 
    Host,
    Image as SwiftUIImage,
    Form, 
    Section, 
    TextField, 
    Switch, 
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    DateTimePicker,
    LabeledContent,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import type { TextFieldRef } from '@expo/ui/swift-ui';
import { padding, frame, background, ignoreSafeArea, tint, disabled, foregroundColor, foregroundStyle, cornerRadius } from '@expo/ui/swift-ui/modifiers';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { isLocalFinanceAttachment, uploadFinanceAttachment } from '@/lib/uploadFinanceAttachment';
import * as DocumentPicker from 'expo-document-picker';
import { 
    fetchBeneficiaryAccounts,
    saveBeneficiaryAccount,
    fetchProjects,
} from '@/lib/api/finance';
import { 
    UNIT_OPTIONS,
} from './constants';
import {
    getFinanceCategories,
    getFinanceCategoriesSnapshot,
    subscribeFinanceCategories,
    getFinanceTaxRules,
    getFinancePaymentTerms,
    getFinanceFieldRules,
    getFinanceDocumentRules,
    calculateTaxBreakdown,
    fetchOrganizationDepartments,
    OrganizationDepartmentItem,
    FinanceCategory,
    FinanceTaxRule,
    FinancePaymentTerm,
    FinanceFieldRulesSettings,
    FinanceDocumentRulesSettings,
    DEFAULT_FINANCE_DOCUMENT_RULES,
} from '@/lib/api/financeSetup';

interface SwiftUICreateRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    initialType?: 'purchase' | 'reimburse';
    locked?: boolean;
    editRequest?: any | null;
    isEmbedded?: boolean;
}

interface RequestItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
    qtyInput?: string;
    priceInput?: string;
}

interface UploadedFile {
    uri: string;
    name: string;
    mimeType?: string;
    base64?: string;
    path?: string;
}

interface ReferenceItem {
    id: string;
    type: 'image' | 'file' | 'link';
    name: string;
    uri?: string;
    url?: string;
    mimeType?: string;
    base64?: string;
    path?: string;
    host?: string;
}

type DiscountType = 'none' | 'percent' | 'fixed';

// System Fallbacks
const SYSTEM_FALLBACK_CATEGORY: FinanceCategory = {
    id: 'general_purchasing',
    code: 'GP',
    name: 'General Purchasing',
    defaultExpenseType: 'General',
    resourceMapping: 'General' as any,
    subcategories: [],
};

const SYSTEM_FALLBACK_TAX: FinanceTaxRule = {
    id: 'none',
    code: 'NONE',
    name: 'No Tax / Deduction (0%)',
    rate: 0,
    taxType: 'vat',
    active: true,
};

const SYSTEM_FALLBACK_PAYMENT_TERM: FinancePaymentTerm = {
    id: 'not_specified',
    code: 'UNSPECIFIED',
    name: 'Not Specified',
    days: 0,
    isDefault: true,
    status: 'active',
};

export const SwiftUICreateRequestSheet: React.FC<SwiftUICreateRequestSheetProps> = ({
    isOpened,
    onClose,
    initialType = 'purchase',
    locked = false,
    editRequest = null,
    isEmbedded = false,
}) => {
    const { addPurchasingRequest, addReimburseRequest, updatePurchasingRequest, updateReimburseRequest } = useFinance();
    const isEditMode = !!editRequest?.id;
    const requestType = editRequest?.moduleType === 'reimbursement' ? 'reimburse' : initialType;
    const isReimburse = requestType === 'reimburse';
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#159957' : '#1C1C1E')];
    const textFieldModifiers = [tint('#159957')];
    
    // Core Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitInFlight = useRef(false);
    const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
    const [requestTitle, setRequestTitle] = useState('');

    // 1. General Information State
    const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [targetIndex, setTargetIndex] = useState<number>(0);
    const [neededByDate, setNeededByDate] = useState<Date>(new Date());
    const [categoryIndex, setCategoryIndex] = useState<number>(0);
    const [subCategoryIndex, setSubCategoryIndex] = useState<number>(0);
    const [priorityIndex, setPriorityIndex] = useState<number>(1); // 1 = MEDIUM

    // Master Setup States
    const [categoriesList, setCategoriesList] = useState<FinanceCategory[]>(getFinanceCategoriesSnapshot);
    useEffect(() => subscribeFinanceCategories(setCategoriesList), []);
    const [taxRulesList, setTaxRulesList] = useState<FinanceTaxRule[]>([]);
    const [paymentTermsList, setPaymentTermsList] = useState<FinancePaymentTerm[]>([]);
    const [fieldRules, setFieldRules] = useState<FinanceFieldRulesSettings>({});
    const [docRules, setDocRules] = useState<FinanceDocumentRulesSettings>(DEFAULT_FINANCE_DOCUMENT_RULES);

    // 2. Requested Items State
    const [items, setItems] = useState<RequestItem[]>([
        { id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }
    ]);
    const [itemHydrationKey, setItemHydrationKey] = useState(0);

    // 3. Preferred Vendor & Commercial Details State
    const [vendorName, setVendorName] = useState('');
    const [selectedVendorIndex, setSelectedVendorIndex] = useState<number>(0);
    const [discountTypeIndex, setDiscountTypeIndex] = useState<number>(0); // 0 = None, 1 = %, 2 = Rp
    const [discountValue, setDiscountValue] = useState<string>('');
    const discountPercentRef = useRef<TextFieldRef>(null);
    const discountFixedRef = useRef<TextFieldRef>(null);
    const [taxRuleIndex, setTaxRuleIndex] = useState<number>(0);
    const [paymentTermIndex, setPaymentTermIndex] = useState<number>(0);

    // 4. Conditional Invoice Details State
    const [invoiceAvailable, setInvoiceAvailable] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoicePrintedDate, setInvoicePrintedDate] = useState<Date>(new Date());
    const [invoiceDocuments, setInvoiceDocuments] = useState<UploadedFile[]>([]);
    const [expenseProofDocuments, setExpenseProofDocuments] = useState<UploadedFile[]>([]);

    // 5. Payment Destination State
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
    const [selectedSavedAccountIndex, setSelectedSavedAccountIndex] = useState<number>(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [saveAccountToggle, setSaveAccountToggle] = useState(false);

    // 6. References State (Images, Docs, URLs)
    const [references, setReferences] = useState<ReferenceItem[]>([]);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [linkError, setLinkError] = useState('');

    // 7. Additional Notes State
    const [notes, setNotes] = useState('');

    // ==========================================
    // OPTIONS & MEMOS
    // ==========================================

    // Target (Project or Department) Options
    const targetPickerOptions = useMemo(() => {
        return [
            'Select Project or Department',
            ...projects.map(p => `Project: ${p.project_code} - ${p.project_name}`),
            ...departments.map(d => `Dept: ${d.code ? `${d.code} - ` : ''}${d.name}`)
        ];
    }, [projects, departments]);

    const selectedTarget = useMemo(() => {
        if (targetIndex <= 0) return null;
        if (targetIndex <= projects.length) {
            return { type: 'project' as const, project: projects[targetIndex - 1] };
        }
        const dIdx = targetIndex - 1 - projects.length;
        return departments[dIdx] ? { type: 'department' as const, department: departments[dIdx] } : null;
    }, [targetIndex, projects, departments]);

    // Categories & Subcategories
    const activeCategoryOptions = useMemo(() => {
        const activeCats = transactionCategoriesFor(categoriesList, isReimburse ? 'reimbursement' : 'purchasing');
        if (activeCats.length > 0) {
            return [
                { value: '', label: 'Select Category', subcategories: [] },
                ...activeCats.map(c => ({ value: c.id, label: c.name, subcategories: c.subcategories || [] }))
            ];
        }
        return [
            { value: '', label: 'Select Category', subcategories: [] },
            { value: SYSTEM_FALLBACK_CATEGORY.id, label: SYSTEM_FALLBACK_CATEGORY.name, subcategories: [] }
        ];
    }, [categoriesList, isReimburse]);

    const selectedCategory = useMemo(() => {
        return activeCategoryOptions[categoryIndex] || null;
    }, [categoryIndex, activeCategoryOptions]);

    const activeSubcategories = useMemo(() => {
        if (!selectedCategory || !selectedCategory.value) return [];
        return (selectedCategory.subcategories || []).filter(item => !item.isArchived && (!item.legacyValues || !!item.legacyValues[isReimburse ? 'reimbursement' : 'purchasing']));
    }, [selectedCategory, isReimburse]);

    const subcategoryOptions = useMemo(() => {
        if (!selectedCategory || !selectedCategory.value) {
            return ['Select Category First'];
        }
        if (activeSubcategories.length === 0) {
            return ['No Subcategories Available'];
        }
        return ['Select Subcategory', ...activeSubcategories.map(s => s.name || String(s))];
    }, [selectedCategory, activeSubcategories]);

    // Taxes
    const activeTaxRulesList = useMemo(() => {
        const active = taxRulesList.filter(t => t.active !== false);
        if (active.length > 0) {
            return [SYSTEM_FALLBACK_TAX, ...active];
        }
        return [SYSTEM_FALLBACK_TAX];
    }, [taxRulesList]);

    const taxOptions = useMemo(() => {
        return activeTaxRulesList.map(t => {
            if (t.rate === 0) return t.name;
            const sign = t.taxType === 'withholding' ? 'Potongan (-)' : 'Pajak (+)';
            return `${t.name} (${t.rate}% ${sign})`;
        });
    }, [activeTaxRulesList]);

    const activeTaxRule = useMemo(() => {
        return activeTaxRulesList[taxRuleIndex] || SYSTEM_FALLBACK_TAX;
    }, [taxRuleIndex, activeTaxRulesList]);

    // Payment Terms
    const activePaymentTermsList = useMemo(() => {
        const active = paymentTermsList.filter(p => p.status === 'active');
        if (active.length > 0) {
            return [SYSTEM_FALLBACK_PAYMENT_TERM, ...active];
        }
        return [SYSTEM_FALLBACK_PAYMENT_TERM];
    }, [paymentTermsList]);

    const paymentTermOptions = useMemo(() => {
        return activePaymentTermsList.map(p => p.name);
    }, [activePaymentTermsList]);

    const activePaymentTerm = useMemo(() => {
        return activePaymentTermsList[paymentTermIndex] || SYSTEM_FALLBACK_PAYMENT_TERM;
    }, [paymentTermIndex, activePaymentTermsList]);

    // Priority
    const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];
    const priority = priorityOptions[priorityIndex]?.toUpperCase() || 'MEDIUM';

    const priorityColor = useMemo(() => {
        switch (priorityIndex) {
            case 0: return isDark ? '#FFFFFF' : '#8E8E93';
            case 1: return '#007AFF';
            case 2: return '#FF9500';
            case 3: return '#FF3B30';
            default: return '#8E8E93';
        }
    }, [priorityIndex, isDark]);

    // Calculations: Subtotal -> Discount -> Tax/Deduction -> Grand Total
    const subtotalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0);
    }, [items]);

    useEffect(() => {
        if (discountTypeIndex !== 2 || discountValue === '') return;
        const maximum = Math.max(0, subtotalAmount);
        if (Number(discountValue) > maximum) {
            const value = String(maximum);
            setDiscountValue(value);
            discountFixedRef.current?.setText(value);
        }
    }, [discountTypeIndex, discountValue, subtotalAmount]);

    const discountAmount = useMemo(() => {
        if (discountTypeIndex === 0) return 0; // None
        const cleanVal = parseFloat(discountValue.replace(/[^0-9.]/g, '')) || 0;
        if (discountTypeIndex === 1) { // %
            const pct = Math.min(100, Math.max(0, cleanVal));
            const factor = 100;
            return Math.round(((subtotalAmount * pct) / 100) * factor) / factor;
        }
        // 2 = Rp
        return Math.min(Math.max(0, subtotalAmount), cleanVal);
    }, [discountTypeIndex, discountValue, subtotalAmount]);

    const netSubtotal = useMemo(() => {
        return subtotalAmount - discountAmount;
    }, [subtotalAmount, discountAmount]);

    const taxBreakdown = useMemo(() => {
        return calculateTaxBreakdown(netSubtotal, activeTaxRule);
    }, [netSubtotal, activeTaxRule]);

    const grandTotal = useMemo(() => {
        return taxBreakdown.total;
    }, [taxBreakdown]);

    // Filtered Saved Accounts
    const filteredAccounts = useMemo(() => {
        if (!accountSearchQuery.trim()) return savedAccounts;
        const query = accountSearchQuery.toLowerCase();
        return savedAccounts.filter(acc => 
            (acc.account_name || '').toLowerCase().includes(query) ||
            (acc.bank_name || '').toLowerCase().includes(query) ||
            (acc.account_number || '').toLowerCase().includes(query) ||
            (acc.vendor_name || '').toLowerCase().includes(query)
        );
    }, [accountSearchQuery, savedAccounts]);

    const quickSelectOptions = useMemo(() => {
        return ['Select Saved Account', ...filteredAccounts.map(acc => `${acc.account_name} (${acc.bank_name} - ${acc.account_number})`)];
    }, [filteredAccounts]);

    // Saved Vendors list from directory
    const savedVendors = useMemo(() => {
        const names = new Set<string>();
        savedAccounts.forEach(acc => {
            if (acc.vendor_name?.trim()) names.add(acc.vendor_name.trim());
            else if (acc.account_name?.trim()) names.add(acc.account_name.trim());
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [savedAccounts]);

    const savedVendorOptions = useMemo(() => {
        return ['Select Saved Vendor', ...savedVendors];
    }, [savedVendors]);

    // Reset Form
    const resetCreateForm = () => {
        setTargetIndex(0);
        setRequestTitle('');
        setNeededByDate(new Date());
        setCategoryIndex(0);
        setSubCategoryIndex(0);
        setPriorityIndex(1);
        setItems([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
        setVendorName('');
        setSelectedVendorIndex(0);
        setDiscountTypeIndex(0);
        setDiscountValue('');
        setTaxRuleIndex(0);
        setPaymentTermIndex(0);
        setInvoiceAvailable(false);
        setInvoiceNumber('');
        setInvoicePrintedDate(new Date());
        setInvoiceDocuments([]);
        setExpenseProofDocuments([]);
        setSavedAccounts([]);
        setSelectedSavedAccountIndex(0);
        setAccountSearchQuery('');
        setBankName('');
        setAccountNumber('');
        setAccountName('');
        setSaveAccountToggle(false);
        setReferences([]);
        setShowLinkInput(false);
        setLinkValue('');
        setLinkError('');
        setNotes('');
    };

    // Apply Edit Mode Request
    const applyEditRequest = (req: any, fetchedDepts: OrganizationDepartmentItem[], fetchedCategories: FinanceCategory[], fetchedProjects: any[] = []) => {
        if (req.project_id) {
            const pIdx = fetchedProjects.findIndex(p => p.id === req.project_id);
            if (pIdx >= 0) setTargetIndex(pIdx + 1);
        } else if (req.department_id) {
            const dIdx = fetchedDepts.findIndex(d => d.id === req.department_id);
            if (dIdx >= 0) setTargetIndex(fetchedProjects.length + dIdx + 1);
        }

        if (isReimburse && req.date) {
            setInvoicePrintedDate(new Date(req.date));
        } else if (req.target_date) {
            setNeededByDate(new Date(req.target_date));
        }

        const activeFetchedCategories = transactionCategoriesFor(fetchedCategories, isReimburse ? 'reimbursement' : 'purchasing');
        const categoryName = req.type || req.category;
        let categoryMatchIndex = activeFetchedCategories.findIndex(category =>
            category.id === categoryName || category.name === categoryName || transactionCategoryValue(category, isReimburse ? 'reimbursement' : 'purchasing') === categoryName
        );
        if (categoryMatchIndex < 0 && req.subcategory) {
            categoryMatchIndex = activeFetchedCategories.findIndex(category =>
                category.subcategories?.some(subcategory =>
                    subcategory.id === req.subcategory || subcategory.name === req.subcategory || transactionCategoryValue(subcategory, isReimburse ? 'reimbursement' : 'purchasing') === req.subcategory
                )
            );
        }
        setCategoryIndex(categoryMatchIndex >= 0 ? categoryMatchIndex + 1 : 0);

        const pOpts = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const pIdx = pOpts.indexOf((req.priority || 'MEDIUM').toUpperCase());
        setPriorityIndex(pIdx >= 0 ? pIdx : 1);

        setVendorName(req.vendor || '');
        setRequestTitle(req.title || req.description || '');
        setBankName(req.beneficiary_bank || '');
        setAccountNumber(req.beneficiary_number || '');
        setAccountName(req.beneficiary_name || '');
        setNotes(splitReferenceNotes(req.notes || '').notes);

        const mappedItems = (req.items || []).map((item: any, i: number) => ({
            id: item.id || String(i + 1),
            name: item.name || item.item_name || item.description || '',
            qty: item.qty ?? item.quantity ?? 1,
            unit: item.unit || 'pcs',
            price: item.unit_price ?? item.unitPrice ?? item.price ?? 0,
        }));
        const recoveredLegacyItem: RequestItem = {
            id: 'legacy-1',
            name: req.description && req.description !== 'Purchase Request' ? req.description : '',
            qty: Number(req.quantity) || 1,
            unit: req.unit || 'pcs',
            price: Number(req.subtotal_amount ?? req.amount) || 0,
        };
        setItems(mappedItems.length > 0 ? mappedItems : [recoveredLegacyItem]);
        setItemHydrationKey(key => key + 1);

        const attachments = requestAttachments(req);
        const invoiceFiles = attachments.filter(file => ['INVOICE', 'RECEIPT'].includes(attachmentKind(file)));
        setInvoiceAvailable(invoiceFiles.length > 0);
        setInvoiceNumber(req.invoice_number || invoiceFiles[0]?.invoice_name || '');
        setInvoiceDocuments(invoiceFiles.map((file, index) => ({
            uri: file.invoice_url,
            path: file.invoice_url,
            name: file.invoice_name || `Invoice ${index + 1}`,
            mimeType: 'application/pdf',
        })));
        setExpenseProofDocuments(String(req.expense_proof_url || '').split(',').map((path: string) => path.trim()).filter(Boolean).map((path: string, index: number) => ({
            uri: path,
            path,
            name: `Expense Payment Proof ${index + 1}`,
            mimeType: 'application/pdf',
        })));
        setReferences(attachments.filter(file => !['INVOICE', 'RECEIPT'].includes(attachmentKind(file))).map((file, index) => ({
            id: file.id || `existing-${index}`,
            type: attachmentKind(file) === 'LINK' ? 'link' : attachmentKind(file) === 'IMAGE' ? 'image' : 'file',
            name: file.invoice_name || file.invoice_url,
            uri: file.invoice_url,
            path: file.invoice_url,
            url: attachmentKind(file) === 'LINK' ? file.invoice_url : undefined,
        })));

    };

    // Fetch setup & data on open
    useEffect(() => {
        if (!isOpened) return;

        Promise.all([
            fetchOrganizationDepartments(),
            getFinanceCategories(),
            getFinanceTaxRules(),
            getFinancePaymentTerms(),
            getFinanceFieldRules(),
            getFinanceDocumentRules(),
            fetchBeneficiaryAccounts(),
            fetchProjects(),
        ]).then(([depts, cats, taxes, terms, fields, docs, beneficiaries, projs]) => {
            setDepartments(depts);
            setCategoriesList(cats);
            setTaxRulesList(taxes);
            setPaymentTermsList(terms);
            setFieldRules(fields);
            setDocRules(docs);
            setSavedAccounts(beneficiaries);
            setProjects(projs);

            if (editRequest) {
                applyEditRequest(editRequest, depts, cats, projs);
                const taxOptions = [{ ...SYSTEM_FALLBACK_TAX }, ...taxes.filter(tax => tax.active !== false)];
                const termOptions = [{ ...SYSTEM_FALLBACK_PAYMENT_TERM }, ...terms.filter(term => term.status === 'active')];
                setTaxRuleIndex(Math.max(0, taxOptions.findIndex(tax => tax.id === editRequest.tax_rule_id)));
                setPaymentTermIndex(Math.max(0, termOptions.findIndex(term => term.id === editRequest.payment_term_id)));
                setDiscountTypeIndex(editRequest.discount_type === 'PERCENT' ? 1 : editRequest.discount_type === 'FIXED' ? 2 : 0);
                setDiscountValue(String(editRequest.discount_value ?? editRequest.discount_amount ?? ''));
                if (editRequest.invoice_date) setInvoicePrintedDate(new Date(editRequest.invoice_date));
            } else {
                resetCreateForm();
            }
        }).catch(err => console.error("Error loading PR setup data:", err));
    }, [isOpened, editRequest?.id]);

    // Reset subcategory when category changes
    useEffect(() => {
        setSubCategoryIndex(0);
    }, [categoryIndex]);

    useEffect(() => {
        if (!editRequest?.subcategory || activeSubcategories.length === 0) return;
        const index = activeSubcategories.findIndex(subcategory =>
            subcategory.id === editRequest.subcategory || subcategory.name === editRequest.subcategory || transactionCategoryValue(subcategory, isReimburse ? 'reimbursement' : 'purchasing') === editRequest.subcategory
        );
        setSubCategoryIndex(index >= 0 ? index + 1 : 0);
    }, [editRequest?.id, editRequest?.subcategory, activeSubcategories]);

    // Line items handlers
    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Math.random().toString(), name: '', qty: 1, unit: 'pcs', price: 0 }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleUpdateItem = (id: string, updates: Partial<RequestItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    // Reference Picker Handlers
    const handleAddPhotoReference = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newRefs: ReferenceItem[] = result.assets.map(asset => ({
                    id: Math.random().toString(),
                    type: 'image',
                    name: asset.fileName || asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`,
                    uri: asset.uri,
                    mimeType: asset.mimeType || 'image/jpeg',
                }));
                setReferences(prev => [...prev, ...newRefs]);
            }
        } catch (err) {
            console.error("ImagePicker Error:", err);
        }
    };

    const handleAddDocumentReference = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
                multiple: true
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newRefs: ReferenceItem[] = result.assets.map(asset => ({
                    id: Math.random().toString(),
                    type: 'file',
                    name: asset.name || asset.uri.split('/').pop() || `doc-${Date.now()}`,
                    uri: asset.uri,
                    mimeType: asset.mimeType || 'application/pdf',
                }));
                setReferences(prev => [...prev, ...newRefs]);
            }
        } catch (err) {
            console.error("DocumentPicker Error:", err);
        }
    };

    const handleAddLinkReference = () => {
        setShowLinkInput(true);
    };

    const handleSaveLinkReference = () => {
        const input = linkValue.trim();
        try {
            if (!input || /\s/.test(input)) throw new Error('Invalid URL');
            const normalized = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
            const parsed = new URL(normalized);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
                throw new Error('Invalid URL');
            }
            const host = parsed.hostname.replace(/^www\./, '');
            setReferences(prev => [...prev, {
                id: Math.random().toString(),
                type: 'link',
                name: parsed.href,
                url: parsed.href,
                host,
            }]);
            setShowLinkInput(false);
            setLinkValue('');
            setLinkError('');
        } catch {
            setLinkError('Enter a valid website link, for example https://shopee.com.');
        }
    };

    const handleRemoveReference = (id: string) => {
        setReferences(prev => prev.filter(r => r.id !== id));
    };

    // Invoice Document Picker
    const handlePickInvoiceDocument = async () => {
        Alert.alert(
            'Upload Invoice Document',
            'Select source for the official invoice document:',
            [
                {
                    text: 'Photo Library',
                    onPress: async () => {
                        const res = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsMultipleSelection: true,
                            quality: 0.8,
                        });
                        if (!res.canceled && res.assets?.length) {
                            setInvoiceDocuments(current => [...current, ...res.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.fileName || 'Invoice_Document.jpg',
                                mimeType: asset.mimeType || 'image/jpeg',
                            }))]);
                        }
                    }
                },
                {
                    text: 'Files / PDF',
                    onPress: async () => {
                        const res = await DocumentPicker.getDocumentAsync({
                            type: ['application/pdf', 'image/*'],
                            copyToCacheDirectory: true,
                            multiple: true,
                        });
                        if (!res.canceled && res.assets?.length) {
                            setInvoiceDocuments(current => [...current, ...res.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.name || 'Invoice_Document.pdf',
                                mimeType: asset.mimeType || 'application/pdf',
                            }))]);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handlePickExpenseProof = async () => {
        Alert.alert(
            'Upload Payment Proof',
            'Attach proof that this expense has already been paid.',
            [
                {
                    text: 'Photo Library',
                    onPress: async () => {
                        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
                        if (!res.canceled && res.assets?.length) {
                            setExpenseProofDocuments(current => [...current, ...res.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.fileName || 'Payment_Proof.jpg',
                                mimeType: asset.mimeType || 'image/jpeg',
                            }))]);
                        }
                    },
                },
                {
                    text: 'Files / PDF',
                    onPress: async () => {
                        const res = await DocumentPicker.getDocumentAsync({
                            type: ['application/pdf', 'image/*'],
                            copyToCacheDirectory: true,
                            multiple: true,
                        });
                        if (!res.canceled && res.assets?.length) {
                            setExpenseProofDocuments(current => [...current, ...res.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.name || 'Payment_Proof.pdf',
                                mimeType: asset.mimeType || 'application/pdf',
                            }))]);
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
    };

    // Submit / Save Draft Handler
    const handleSaveOrSubmit = async (asDraft = false) => {
        if (submitInFlight.current) return;
        if (!selectedTarget) {
            Alert.alert('Selection Required', 'Please select a Project or Department for this request.');
            return;
        }

        const validItems = items.filter(item => item.name.trim().length > 0);
        if (validItems.length === 0) {
            Alert.alert('Item Required', 'Please provide at least one item description and quantity.');
            return;
        }

        if (validItems.some(item => !Number.isFinite(item.qty) || !Number.isFinite(item.price)
            || [item.qtyInput, item.priceInput].some(value => value !== undefined && value !== '' && !Number.isFinite(Number(value.replace(',', '.')))))) {
            Alert.alert('Invalid Amount', 'Enter a valid quantity and price. Negative numbers and decimals are allowed.');
            return;
        }
        if (isReimburse && !asDraft && validItems.some(item => item.qty === 0 || item.price === 0)) {
            Alert.alert('Actual Amount Required', 'Every reimbursement item must have an actual non-zero quantity and unit price.');
            return;
        }

        if (isReimburse && !asDraft) {
            if (invoiceDocuments.length === 0) {
                Alert.alert('Invoice Required', 'At least one invoice document is required for reimbursement.');
                return;
            }
            if (expenseProofDocuments.length === 0) {
                Alert.alert('Payment Proof Required', 'Attach proof that the expense has already been paid.');
                return;
            }
            if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
                Alert.alert('Reimbursement Account Required', 'Complete the bank account that will receive the reimbursement.');
                return;
            }
        }

        // Validate Discount if % or Rp is selected
        if (discountTypeIndex === 1) {
            const pct = parseFloat(discountValue) || 0;
            if (pct <= 0 || pct > 100) {
                Alert.alert('Invalid Discount', 'Please enter a valid discount percentage between 1% and 100%.');
                return;
            }
        } else if (discountTypeIndex === 2) {
            const amt = parseFloat(discountValue.replace(/[^0-9.]/g, '')) || 0;
            if (amt <= 0) {
                Alert.alert('Invalid Discount', 'Please enter a valid discount amount greater than Rp 0.');
                return;
            }
            if (amt > subtotalAmount) {
                Alert.alert('Invalid Discount', 'Discount amount cannot exceed the subtotal.');
                return;
            }
        }

        submitInFlight.current = true;
        setIsSubmitting(true);
        try {
            const filesToUpload = [
                ...((isReimburse || invoiceAvailable) ? invoiceDocuments : []),
                ...(isReimburse ? expenseProofDocuments : []),
                ...(isReimburse ? [] : references.filter((ref): ref is ReferenceItem & { uri: string } => ref.type !== 'link' && Boolean(ref.uri))),
            ];
            const total = filesToUpload.filter(isLocalFinanceAttachment).length;
            setUploadProgress(total ? { done: 0, total } : null);
            const onUploaded = () => setUploadProgress(previous => previous ? { ...previous, done: previous.done + 1 } : previous);
            const uploadDocuments = async (files: UploadedFile[], folder: string) => {
                const urls: string[] = [];
                for (const file of files) urls.push(await uploadFinanceAttachment(file, folder, onUploaded));
                return urls;
            };

            const uploadedInvoiceUrls = await uploadDocuments(
                (isReimburse || invoiceAvailable) ? invoiceDocuments : [],
                isReimburse ? 'reimburse' : 'purchase',
            );
            const uploadedExpenseProofUrls = isReimburse
                ? await uploadDocuments(expenseProofDocuments, 'reimburse')
                : [];

            // Upload References (Images & Files)
            const uploadedReferences: Array<{ url: string; name: string; type: string }> = [];
            for (const ref of isReimburse ? [] : references) {
                if (ref.type === 'link') {
                    uploadedReferences.push({
                        url: ref.url || ref.name,
                        name: ref.host ? `[Link: ${ref.host}] ${ref.name}` : ref.name,
                        type: 'LINK',
                    });
                } else if (ref.uri) {
                    const url = await uploadFinanceAttachment(ref as ReferenceItem & { uri: string }, 'purchase', onUploaded);
                    uploadedReferences.push({ url, name: ref.name, type: ref.type === 'image' ? 'IMAGE' : 'DOCUMENT' });
                }
            }

            setUploadProgress(null);

            // Save Beneficiary Account if Save Switch is ON
            if (saveAccountToggle && bankName && accountNumber && accountName) {
                const alreadyExists = savedAccounts.some(acc => 
                    acc.account_number === accountNumber && 
                    (acc.bank_name || '').toLowerCase() === bankName.toLowerCase()
                );
                if (!alreadyExists) {
                    await saveBeneficiaryAccount({
                        bank_name: bankName,
                        account_number: accountNumber,
                        account_name: accountName,
                        vendor_name: vendorName || undefined,
                    });
                }
            }

            const itemNames = validItems.map(item => item.name.trim()).filter(Boolean);
            const reimbursementTitle = itemNames.length <= 1
                ? (itemNames[0] || 'Reimbursement Request')
                : `${itemNames[0]}, ${itemNames[1]}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`;
            const reqDescription = isReimburse
                ? reimbursementTitle
                : (requestTitle.trim() || itemNames.join(', ') || 'Purchase Request');
            const workflow = isReimburse ? 'reimbursement' : 'purchasing';
            const selectedSubcategory = subCategoryIndex > 0 ? activeSubcategories[subCategoryIndex - 1] : undefined;
            const selectedSubcategoryName = selectedSubcategory ? transactionCategoryValue(selectedSubcategory, workflow) : undefined;
            const selectedCategoryRecord = categoriesList.find(item => item.id === selectedCategory?.value);
            const selectedCategoryName = selectedCategoryRecord ? transactionCategoryValue(selectedCategoryRecord, workflow) : SYSTEM_FALLBACK_CATEGORY.name;

            const structuredNotes = notes.trim();

            if (isReimburse) {
                const reimbursePayload = {
                    title: reimbursementTitle,
                    department_id: selectedTarget.type === 'department' ? selectedTarget.department.id : null,
                    department_name: selectedTarget.type === 'department' ? selectedTarget.department.name : undefined,
                    department_code: selectedTarget.type === 'department' ? selectedTarget.department.code : undefined,
                    project_id: selectedTarget.type === 'project' ? selectedTarget.project.id : null,
                    category: selectedCategoryName,
                    subcategory: selectedSubcategoryName,
                    date: invoicePrintedDate.toISOString().split('T')[0],
                    target_date: null,
                    description: reimbursementTitle,
                    amount: grandTotal,
                    status: asDraft ? 'DRAFT' : 'SUBMITTED',
                    invoice_url: uploadedInvoiceUrls.join(','),
                    expense_proof_url: uploadedExpenseProofUrls.join(','),
                    invoice_number: invoiceNumber.trim(),
                    invoice_date: invoicePrintedDate.toISOString().split('T')[0],
                    vendor: vendorName.trim() || undefined,
                    subtotal_amount: subtotalAmount,
                    discount_type: discountTypeIndex === 1 ? 'PERCENT' : (discountTypeIndex === 2 ? 'FIXED' : 'NONE'),
                    discount_value: Number(discountValue) || 0,
                    discount_amount: discountAmount,
                    tax_name: activeTaxRule.name,
                    tax_type: activeTaxRule.taxType,
                    tax_rate: activeTaxRule.rate,
                    tax_amount: taxBreakdown.taxAmount,
                    beneficiary_bank: bankName.trim() || undefined,
                    beneficiary_number: accountNumber.trim() || undefined,
                    beneficiary_name: accountName.trim() || undefined,
                    priority,
                    items: validItems.map(item => ({
                        name: item.name,
                        qty: item.qty,
                        unit: item.unit,
                        unitPrice: item.price,
                        total: item.qty * item.price,
                    })),
                    notes: structuredNotes || undefined,
                    statusTag: asDraft ? 'draft' : 'pending',
                    isDraft: asDraft,
                } as any;

                if (isEditMode) {
                    await updateReimburseRequest(editRequest.id, reimbursePayload);
                } else {
                    await addReimburseRequest(reimbursePayload);
                }

                Alert.alert(
                    'Success',
                    isEditMode
                        ? 'Reimbursement Request updated successfully!'
                        : (asDraft ? 'Draft saved successfully.' : 'Reimbursement Request submitted for approval!'),
                );
                onClose();
                return;
            }

            // Combine invoices & documents
            const allInvoicesPayload: Array<{ invoice_url: string; invoice_name: string; notes: string }> = [];
            uploadedInvoiceUrls.forEach((url, index) => {
                allInvoicesPayload.push({
                    invoice_url: url,
                    invoice_name: uploadedInvoiceUrls.length === 1 ? (invoiceNumber || 'Official Invoice') : `${invoiceNumber || 'Official Invoice'} #${index + 1}`,
                    notes: JSON.stringify({ attachmentKind: 'INVOICE' }),
                });
            });
            uploadedReferences.forEach(ref => {
                allInvoicesPayload.push({
                    invoice_url: ref.url,
                    invoice_name: ref.name,
                    notes: JSON.stringify({ attachmentKind: ref.type }),
                });
            });

            const purchasePayload = {
                title: reqDescription,
                department_id: selectedTarget.type === 'department' ? selectedTarget.department.id : null,
                department_name: selectedTarget.type === 'department' ? selectedTarget.department.name : undefined,
                department_code: selectedTarget.type === 'department' ? selectedTarget.department.code : undefined,
                project_id: selectedTarget.type === 'project' ? selectedTarget.project.id : null,
                target_date: neededByDate.toISOString().split('T')[0],
                description: reqDescription,
                type: selectedCategoryName,
                subcategory: selectedSubcategoryName,
                priority,
                amount: grandTotal,
                approval_status: asDraft ? 'DRAFT' : 'SUBMITTED',
                beneficiary_bank: bankName || undefined,
                beneficiary_number: accountNumber || undefined,
                beneficiary_name: accountName || undefined,
                vendor: vendorName || undefined,
                discount_type: discountTypeIndex === 1 ? 'PERCENT' : (discountTypeIndex === 2 ? 'FIXED' : 'NONE'),
                discount_value: Number(discountValue) || 0,
                discount_amount: discountAmount,
                tax_rule_id: activeTaxRule.id !== 'none' ? activeTaxRule.id : null,
                tax_name: activeTaxRule.name,
                tax_type: activeTaxRule.taxType,
                tax_rate: activeTaxRule.rate,
                tax_amount: taxBreakdown.taxAmount,
                subtotal_amount: subtotalAmount,
                payment_term_name: activePaymentTerm.name,
                payment_term_days: activePaymentTerm.days,
                invoice_number: invoiceAvailable ? invoiceNumber : '',
                invoice_date: invoiceAvailable ? invoicePrintedDate.toISOString().split('T')[0] : null,
                payment_term_id: activePaymentTerm.id !== 'not_specified' ? activePaymentTerm.id : null,
                items: validItems.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    unit_price: i.price,
                    total: i.qty * i.price
                })),
                invoice_url: allInvoicesPayload.map(file => file.invoice_url).join(',') || null,
                invoices: allInvoicesPayload,
                notes: structuredNotes || undefined,
                statusTag: asDraft ? 'draft' : 'pending',
                isDraft: asDraft,
            } as any;

            if (isEditMode) {
                await updatePurchasingRequest(editRequest.id, purchasePayload);
            } else {
                await addPurchasingRequest(purchasePayload);
            }

            Alert.alert(
                'Success',
                isEditMode
                    ? 'Purchase Request updated successfully!'
                    : (asDraft ? 'Draft saved successfully.' : 'Purchase Request submitted for approval!')
            );
            onClose();
        } catch (error: any) {
            console.error(`${isReimburse ? 'Reimbursement' : 'Purchase'} Submit Error:`, error);
            Alert.alert('Error', error.message || `Failed to submit ${isReimburse ? 'Reimbursement' : 'Purchase'} Request.`);
        } finally {
            submitInFlight.current = false;
            setUploadProgress(null);
            setIsSubmitting(false);
        }
    };

    const renderInnerContent = () => (
        <VStack spacing={0} modifiers={[
            ignoreSafeArea({ edges: 'bottom' }),
            background(sheetBg),
            frame({ maxWidth: Infinity, maxHeight: Infinity })
        ]}>
            {/* Header */}
            <HStack alignment="center" modifiers={[padding({ top: isEmbedded ? 16 : 20, leading: 20, trailing: 20, bottom: 8 })]}>
                <VStack alignment="leading" spacing={2}>
                    <SwiftUIText size={20} weight="bold" color={textColor}>
                        {isEditMode
                            ? `Edit ${isReimburse ? 'Reimbursement' : 'Purchase'} Request`
                            : `${isReimburse ? 'Reimbursement' : 'Purchase'} Request`}
                    </SwiftUIText>
                </VStack>
                <Spacer />
                <Button
                    systemImage="xmark"
                    role="cancel"
                    variant="glass"
                    color="gray"
                    onPress={onClose}
                    disabled={isSubmitting}
                />
            </HStack>

            {/* Scrollable Form */}
            <Form modifiers={[background(sheetBg), foregroundColor(textColor), frame({ maxWidth: Infinity })]}>
                        
                        {/* 1. General Information */}
                        <Section title="General Information">
                            <Picker
                                label="Project / Dept"
                                options={targetPickerOptions}
                                selectedIndex={targetIndex}
                                onOptionSelected={(e) => setTargetIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <DateTimePicker
                                title={isReimburse ? 'Expense Date' : 'Needed By'}
                                initialDate={(isReimburse ? invoicePrintedDate : neededByDate).toISOString()}
                                onDateSelected={(date) => isReimburse ? setInvoicePrintedDate(date) : setNeededByDate(date)}
                                variant="compact"
                                displayedComponents="date"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <Picker
                                label="Transaction Category"
                                options={activeCategoryOptions.map(c => c.label)}
                                selectedIndex={categoryIndex}
                                onOptionSelected={(e) => setCategoryIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            {selectedCategory && selectedCategory.value !== '' && activeSubcategories.length > 0 && (
                                <Picker
                                    label="Subcategory"
                                    options={subcategoryOptions}
                                    selectedIndex={subCategoryIndex}
                                    onOptionSelected={(e) => setSubCategoryIndex(e.nativeEvent.index)}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            )}

                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Priority</SwiftUIText>
                                <Picker
                                    options={priorityOptions}
                                    selectedIndex={priorityIndex}
                                    onOptionSelected={(e) => setPriorityIndex(e.nativeEvent.index)}
                                    variant="segmented"
                                    modifiers={[tint(priorityColor)]}
                                />
                            </VStack>
                        </Section>

                        {/* 2. Requested Items */}
                        <Section title={isReimburse ? 'Actual Expense Items' : 'Requested Items'}>
                            {items.map((item, index) => (
                                <VStack key={item.id} spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                    <HStack alignment="center">
                                        <SwiftUIText weight="bold" size={14} color={textColor}>
                                            {`Item #${index + 1}`}
                                        </SwiftUIText>
                                        <Spacer />
                                        {items.length > 1 && (
                                            <Button
                                                systemImage="minus.circle.fill"
                                                variant="plain"
                                                modifiers={[foregroundColor('#FF3B30')]}
                                                onPress={() => handleRemoveItem(item.id)}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </HStack>

                                    <TextField
                                        key={`item-name-${item.id}-${itemHydrationKey}`}
                                        placeholder="Item / Description"
                                        defaultValue={item.name}
                                        onChangeText={(v) => handleUpdateItem(item.id, { name: v })}
                                        modifiers={textFieldModifiers}
                                    />

                                    <HStack spacing={10}>
                                        <TextField
                                            key={`item-qty-${item.id}-${itemHydrationKey}`}
                                            placeholder="Quantity"
                                            defaultValue={item.qty !== 0 ? String(item.qty) : ''}
                                            keyboardType="numbers-and-punctuation"
                                            onChangeText={(v) => {
                                                handleUpdateItem(item.id, {
                                                    qtyInput: v,
                                                    qty: /^-?\d*(?:[.,]\d*)?$/.test(v) ? Number(v.replace(',', '.')) || 0 : NaN,
                                                });
                                            }}
                                            modifiers={textFieldModifiers}
                                        />
                                        <Picker
                                            key={`item-unit-${item.id}-${itemHydrationKey}`}
                                            options={UNIT_OPTIONS.map(u => u.label)}
                                            selectedIndex={Math.max(0, UNIT_OPTIONS.findIndex(u => u.value === item.unit))}
                                            onOptionSelected={(e) => {
                                                const selectedUnit = UNIT_OPTIONS[e.nativeEvent.index]?.value || 'pcs';
                                                handleUpdateItem(item.id, { unit: selectedUnit });
                                            }}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    </HStack>

                                    <TextField
                                        key={`item-price-${item.id}-${itemHydrationKey}`}
                                        placeholder="Unit Price (Rp)"
                                        defaultValue={item.price !== 0 ? String(item.price) : ''}
                                        keyboardType="numbers-and-punctuation"
                                        onChangeText={(v) => {
                                            handleUpdateItem(item.id, {
                                                priceInput: v,
                                                price: /^-?\d*(?:[.,]\d*)?$/.test(v) ? Number(v.replace(',', '.')) || 0 : NaN,
                                            });
                                        }}
                                        modifiers={textFieldModifiers}
                                    />

                                    <HStack alignment="center" modifiers={[padding({ top: 2, bottom: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Item Total</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={14} weight="semibold" color="#159957">
                                            {`Rp ${((item.qty || 0) * (item.price || 0)).toLocaleString('id-ID')}`}
                                        </SwiftUIText>
                                    </HStack>
                                </VStack>
                            ))}

                            <Button
                                systemImage="plus.circle.fill"
                                onPress={handleAddItem}
                                variant="plain"
                                color="#159957"
                            >
                                Add Another Item
                            </Button>
                        </Section>

                        {/* 3. Preferred Vendor (Optional) */}
                        <Section title={isReimburse ? 'Merchant / Vendor' : 'Preferred Vendor'}>
                            {savedVendors.length > 0 && (
                                <Picker
                                    label="Select Saved Vendor"
                                    options={savedVendorOptions}
                                    selectedIndex={selectedVendorIndex}
                                    onOptionSelected={(e) => {
                                        const idx = e.nativeEvent.index;
                                        setSelectedVendorIndex(idx);
                                        if (idx > 0) {
                                            setVendorName(savedVendors[idx - 1]);
                                        }
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            )}

                            <TextField
                                placeholder={isReimburse ? 'Merchant / Vendor Name' : 'Preferred Vendor Name'}
                                defaultValue={vendorName}
                                onChangeText={(v) => {
                                    setVendorName(v);
                                    setSelectedVendorIndex(0);
                                }}
                                modifiers={textFieldModifiers}
                            />
                        </Section>

                        {/* 4. Commercial Details */}
                        <Section title={isReimburse ? 'Actual Amount Details' : 'Commercial Details'}>
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Discount</SwiftUIText>
                                <Picker
                                    options={['None', '% Percent', 'Rp Fixed']}
                                    selectedIndex={discountTypeIndex}
                                    onOptionSelected={(e) => {
                                        setDiscountTypeIndex(e.nativeEvent.index);
                                        setDiscountValue('');
                                    }}
                                    variant="segmented"
                                    modifiers={[tint('#159957')]}
                                />
                            </VStack>

                            {discountTypeIndex === 1 && (
                                <VStack alignment="leading" spacing={2}>
                                    <TextField
                                        ref={discountPercentRef}
                                        key={`discount-pct-${discountTypeIndex}`}
                                        placeholder="Enter percentage (1 - 100)"
                                        defaultValue={discountValue}
                                        keyboardType="decimal-pad"
                                        onChangeText={(v) => {
                                            // Strip everything except digits and decimal point
                                            let clean = v.replace(',', '.').replace(/[^0-9.]/g, '');
                                            const parts = clean.split('.');
                                            if (parts.length > 2) {
                                                clean = parts[0] + '.' + parts.slice(1).join('');
                                            }
                                            // Clamp to 100 max
                                            const num = parseFloat(clean);
                                            if (!isNaN(num) && num > 100) {
                                                clean = '100';
                                            }
                                            // If input was dirty (had letters), imperatively fix the displayed text
                                            if (clean !== v) {
                                                discountPercentRef.current?.setText(clean);
                                            }
                                            setDiscountValue(clean);
                                        }}
                                        modifiers={textFieldModifiers}
                                    />
                                    {parseFloat(discountValue) > 0 && (
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {`Discount: ${discountValue}% of subtotal = Rp ${Math.round(subtotalAmount * (parseFloat(discountValue) / 100)).toLocaleString('id-ID')}`}
                                        </SwiftUIText>
                                    )}
                                </VStack>
                            )}

                            {discountTypeIndex === 2 && (
                                <VStack alignment="leading" spacing={2}>
                                    <TextField
                                        ref={discountFixedRef}
                                        key={`discount-fixed-${discountTypeIndex}`}
                                        placeholder="Enter amount (Rp)"
                                        defaultValue={discountValue}
                                        keyboardType="decimal-pad"
                                        onChangeText={(v) => {
                                            const normalized = v.replace(',', '.');
                                            if (!/^\d*(?:\.\d*)?$/.test(normalized)) {
                                                discountFixedRef.current?.setText(discountValue);
                                                return;
                                            }
                                            const clean = normalized;
                                            let finalValue = clean;
                                            // Clamp to subtotal max
                                            const num = parseFloat(clean);
                                            if (!isNaN(num) && num > Math.max(0, subtotalAmount)) {
                                                finalValue = String(Math.max(0, subtotalAmount));
                                            }
                                            // If input was dirty, imperatively fix the displayed text
                                            if (finalValue !== v) {
                                                discountFixedRef.current?.setText(finalValue);
                                            }
                                            setDiscountValue(finalValue);
                                        }}
                                        modifiers={textFieldModifiers}
                                    />
                                    {parseFloat(discountValue) > 0 && (
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {`Discount: Rp ${parseFloat(discountValue).toLocaleString('id-ID')}`}
                                        </SwiftUIText>
                                    )}
                                </VStack>
                            )}

                            <Picker
                                label="Tax / Deduction"
                                options={taxOptions}
                                selectedIndex={taxRuleIndex}
                                onOptionSelected={(e) => setTaxRuleIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            {!isReimburse && (
                                <Picker
                                    label="Payment Term"
                                    options={paymentTermOptions}
                                    selectedIndex={paymentTermIndex}
                                    onOptionSelected={(e) => setPaymentTermIndex(e.nativeEvent.index)}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            )}
                        </Section>

                        {/* 5. Conditional Invoice Details */}
                        <Section title="Invoice Details">
                            {!isReimburse && (
                                <Switch
                                    value={invoiceAvailable}
                                    onValueChange={setInvoiceAvailable}
                                    label="Has Invoice"
                                    color="#159957"
                                />
                            )}

                            {(isReimburse || invoiceAvailable) && (
                                <VStack spacing={8} modifiers={[padding({ top: 4 })]}>
                                    <TextField
                                        placeholder="Invoice Number (Optional)"
                                        defaultValue={invoiceNumber}
                                        onChangeText={setInvoiceNumber}
                                        modifiers={textFieldModifiers}
                                    />

                                    <DateTimePicker
                                        title="Invoice Date"
                                        initialDate={invoicePrintedDate.toISOString()}
                                        onDateSelected={(date) => setInvoicePrintedDate(date)}
                                        variant="compact"
                                        displayedComponents="date"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />

                                    <VStack alignment="leading" spacing={6}>
                                        {invoiceDocuments.map((file, index) => (
                                            <HStack key={`${file.uri}-${index}`} alignment="center">
                                                <SwiftUIText size={13} color={textColor}>{file.name}</SwiftUIText>
                                                <Spacer />
                                                <Button systemImage="xmark.circle.fill" variant="plain" modifiers={[foregroundColor('#FF3B30')]} onPress={() => setInvoiceDocuments(current => current.filter((_, itemIndex) => itemIndex !== index))} />
                                            </HStack>
                                        ))}
                                        <Button systemImage="arrow.up.doc" variant="plain" color="#159957" onPress={handlePickInvoiceDocument}>
                                            {invoiceDocuments.length > 0 ? 'Add Invoice Files' : 'Attach Invoice Files'}
                                        </Button>
                                    </VStack>

                                    {isReimburse && (
                                        <VStack alignment="leading" spacing={6}>
                                            <SwiftUIText color={subtextColor}>Expense Payment Proof</SwiftUIText>
                                            {expenseProofDocuments.map((file, index) => (
                                                <HStack key={`${file.uri}-${index}`} alignment="center">
                                                    <SwiftUIText size={13} color={textColor}>{file.name}</SwiftUIText>
                                                    <Spacer />
                                                    <Button systemImage="xmark.circle.fill" variant="plain" modifiers={[foregroundColor('#FF3B30')]} onPress={() => setExpenseProofDocuments(current => current.filter((_, itemIndex) => itemIndex !== index))} />
                                                </HStack>
                                            ))}
                                            <Button systemImage="arrow.up.doc" variant="plain" color="#159957" onPress={handlePickExpenseProof}>
                                                {expenseProofDocuments.length > 0 ? 'Add Payment Proof Files' : 'Attach Payment Proof Files'}
                                            </Button>
                                        </VStack>
                                    )}
                                </VStack>
                            )}
                        </Section>

                        {/* 5. Total Summary */}
                        <Section title="Total Summary">
                            <HStack alignment="center" modifiers={[padding({ vertical: 2 })]}>
                                <SwiftUIText color={subtextColor}>Subtotal</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {`Rp ${subtotalAmount.toLocaleString('id-ID')}`}
                                </SwiftUIText>
                            </HStack>

                            {discountAmount > 0 && (
                                <HStack alignment="center" modifiers={[padding({ vertical: 2 })]}>
                                    <SwiftUIText color="#FF3B30">
                                        {discountTypeIndex === 1 ? `Discount (${discountValue}%)` : 'Discount'}
                                    </SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color="#FF3B30" weight="semibold">
                                        {`- Rp ${discountAmount.toLocaleString('id-ID')}`}
                                    </SwiftUIText>
                                </HStack>
                            )}

                            {activeTaxRule.id !== 'none' && activeTaxRule.rate > 0 && (
                                <HStack alignment="center" modifiers={[padding({ vertical: 2 })]}>
                                    <SwiftUIText color={subtextColor}>
                                        {`${activeTaxRule.name} (${activeTaxRule.rate}%)`}
                                    </SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={activeTaxRule.taxType === 'withholding' ? '#FF9500' : '#159957'}>
                                        {`${activeTaxRule.taxType === 'withholding' ? '-' : '+'} Rp ${taxBreakdown.taxAmount.toLocaleString('id-ID')}`}
                                    </SwiftUIText>
                                </HStack>
                            )}

                            <HStack alignment="center" modifiers={[padding({ top: 6, bottom: 4 })]}>
                                <SwiftUIText size={16} weight="bold" color={textColor}>Grand Total</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={20} weight="heavy" color="#159957">
                                    {`Rp ${grandTotal.toLocaleString('id-ID')}`}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {/* 6. Payment Destination */}
                        <Section title={isReimburse ? 'Reimbursement Destination' : 'Payment Destination'}>
                            <TextField
                                placeholder="Search Saved Accounts..."
                                defaultValue={accountSearchQuery}
                                onChangeText={setAccountSearchQuery}
                                modifiers={textFieldModifiers}
                            />

                            <Picker
                                label="Quick Select"
                                options={filteredAccounts.length > 0 ? quickSelectOptions : ['No saved accounts']}
                                selectedIndex={filteredAccounts.length > 0 ? selectedSavedAccountIndex : 0}
                                onOptionSelected={(e) => {
                                    if (filteredAccounts.length === 0) return;
                                    const idx = e.nativeEvent.index;
                                    setSelectedSavedAccountIndex(idx);
                                    if (idx > 0) {
                                        const acc = filteredAccounts[idx - 1];
                                        setBankName(acc.bank_name || '');
                                        setAccountNumber(acc.account_number || '');
                                        setAccountName(acc.account_name || '');
                                        if (acc.vendor_name && !vendorName) {
                                            setVendorName(acc.vendor_name);
                                        }
                                    } else {
                                        setBankName('');
                                        setAccountNumber('');
                                        setAccountName('');
                                    }
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <TextField
                                placeholder="Bank Name (e.g. BCA, Mandiri, BNI)"
                                defaultValue={bankName}
                                onChangeText={setBankName}
                                modifiers={textFieldModifiers}
                            />

                            <TextField
                                placeholder="Account Number"
                                defaultValue={accountNumber}
                                keyboardType="numeric"
                                onChangeText={setAccountNumber}
                                modifiers={textFieldModifiers}
                            />

                            <TextField
                                placeholder="Account Holder Name"
                                defaultValue={accountName}
                                onChangeText={setAccountName}
                                modifiers={textFieldModifiers}
                            />

                            {accountNumber.trim().length > 0 && (
                                <Switch
                                    value={saveAccountToggle}
                                    onValueChange={setSaveAccountToggle}
                                    label="Save to Beneficiary Accounts"
                                    color="#159957"
                                />
                            )}
                        </Section>

                        {/* 7. References (Photo, Document, Link) */}
                        {!isReimburse && <Section title="References">
                            {[
                                { label: 'Add Photo', icon: 'photo' as const, action: handleAddPhotoReference },
                                { label: 'Add Document', icon: 'doc.text' as const, action: handleAddDocumentReference },
                                { label: 'Add Link', icon: 'link' as const, action: handleAddLinkReference },
                            ].map(({ label, icon, action }) => (
                                <HStack key={label} spacing={12} modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIImage systemName={icon} size={20} color={textColor} modifiers={[frame({ width: 28 })]} />
                                    <SwiftUIText size={16} color={textColor} lineLimit={1}>{label}</SwiftUIText>
                                    <Spacer />
                                    <Button systemImage="plus" variant="glass" color="#159957" onPress={action} />
                                </HStack>
                            ))}

                            {showLinkInput && (
                                <VStack alignment="leading" spacing={12} modifiers={[padding({ vertical: 8 })]}>
                                    <TextField
                                        placeholder="https://example.com"
                                        defaultValue={linkValue}
                                        keyboardType="url"
                                        onChangeText={(value) => { setLinkValue(value); setLinkError(''); }}
                                        modifiers={textFieldModifiers}
                                    />
                                    {linkError !== '' && <SwiftUIText size={12} color="#FF3B30">{linkError}</SwiftUIText>}
                                    <HStack spacing={12}>
                                        <Spacer />
                                        <Button variant="glass" color="gray" onPress={() => {
                                            setShowLinkInput(false);
                                            setLinkValue('');
                                            setLinkError('');
                                        }}>Cancel</Button>
                                        <Button variant="glassProminent" color="#159957" disabled={!linkValue.trim()} onPress={handleSaveLinkReference}>
                                            <SwiftUIText color="#FFFFFF" weight="semibold">Add Link</SwiftUIText>
                                        </Button>
                                    </HStack>
                                </VStack>
                            )}

                            {references.map((ref) => (
                                <HStack key={ref.id} spacing={12} alignment="center" modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIImage
                                        systemName={ref.type === 'link' ? 'link' : ref.type === 'image' ? 'photo' : 'doc.text'}
                                        size={20}
                                        color={textColor}
                                        modifiers={[frame({ width: 28, height: 40 })]}
                                    />
                                    <VStack alignment="leading" spacing={3}>
                                        <SwiftUIText size={14} weight="medium" color={textColor} lineLimit={1}>
                                            {ref.type === 'link' ? (ref.host || ref.name) : ref.name}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={subtextColor} lineLimit={1}>
                                            {ref.type === 'link' ? (ref.url || ref.name) : ref.type === 'image' ? 'Photo attached' : 'Document attached'}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Button systemImage="xmark" variant="glass" color="gray" onPress={() => handleRemoveReference(ref.id)} />
                                </HStack>
                            ))}
                        </Section>}

                        {/* 8. Additional Notes */}
                        <Section title="Additional Notes">
                            <TextField
                                placeholder="Add notes or specifications…"
                                defaultValue={notes}
                                onChangeText={setNotes}
                                modifiers={textFieldModifiers}
                            />
                        </Section>

                    </Form>

                    {/* Footer Actions (Save Draft & Submit Request) */}
                    <HStack spacing={12} modifiers={[
                        padding({ leading: 20, trailing: 20, top: 12, bottom: 34 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <Button variant="glass" color="gray" disabled={isSubmitting} onPress={() => handleSaveOrSubmit(true)}>
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                <Spacer />
                                <SwiftUIText size={17} weight="semibold" color={textColor} lineLimit={1}>Save Draft</SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                        <Button variant="glassProminent" color="#159957" disabled={isSubmitting} onPress={() => handleSaveOrSubmit(false)}>
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                <Spacer />
                                <SwiftUIText size={17} weight="semibold" color="#FFFFFF" lineLimit={1}>
                                    {isSubmitting ? (uploadProgress ? `Uploading (${uploadProgress.done}/${uploadProgress.total})...` : 'Saving request...') : 'Submit Request'}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
    );

    if (isEmbedded) {
        return (
            <Host style={{ flex: 1, width: '100%', height: '100%' }} colorScheme={isDark ? 'dark' : 'light'}>
                {renderInnerContent()}
            </Host>
        );
    }

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.92]}
                onIsOpenedChange={(opened) => {
                    if (!opened && !submitInFlight.current) onClose();
                }}
            >
                {renderInnerContent()}
            </BottomSheet>
        </Host>
    );
};
