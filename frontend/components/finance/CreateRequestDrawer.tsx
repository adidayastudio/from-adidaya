import { transactionCategoriesFor, transactionCategoryValue } from '@/lib/financeTransactionCategories';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TouchableWithoutFeedback,
    Modal, 
    ScrollView, 
    TextInput, 
    Alert, 
    Image, 
    ActivityIndicator, 
    Platform,
    KeyboardAvoidingView,
    Switch,
    Animated,
    useWindowDimensions
} from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { 
    uploadFinanceFileBase64, 
    fetchProjects,
    fetchBeneficiaryAccounts,
    saveBeneficiaryAccount,
    resolveFinanceUrl
} from '@/lib/api/finance';
import { 
    Category, 
    PurchaseStage, 
    UNIT_OPTIONS
} from './constants';
import {
    getFinanceCategories,
    getFinanceCategoriesSnapshot,
    subscribeFinanceCategories,
    getFinanceExpenseTypes,
    getFinanceTaxRules,
    getFinancePaymentTerms,
    getFinanceFieldRules,
    getFinanceDocumentRules,
    getFinanceGeneralSettings,
    generateDocumentCode,
    calculateTaxBreakdown,
    validateFinanceForm,
    fetchOrganizationDepartments,
    OrganizationDepartmentItem,
    FinanceCategory,
    FinanceExpenseType,
    FinanceTaxRule,
    FinancePaymentTerm,
    FinanceFieldRulesSettings,
    FinanceDocumentRulesSettings,
    FinanceGeneralSettings,
    DEFAULT_FINANCE_GENERAL_SETTINGS,
    DEFAULT_FINANCE_DOCUMENT_RULES,
} from '@/lib/api/financeSetup';

interface CreateRequestDrawerProps {
    visible: boolean;
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
    origin?: string;
    destination?: string;
    distance?: number;
}

interface FinanceImage {
    uri: string;
    width?: number;
    height?: number;
    path?: string;
    fileName?: string | null;
    mimeType?: string;
    base64?: string | null;
    documentKind?: 'invoice' | 'expense_proof';
}

// Priority color mapping
const PRIORITY_COLORS: Record<string, { bg: string; bgDark: string; border: string; borderDark: string; text: string }> = {
    URGENT: { bg: 'rgba(255,59,48,0.08)', bgDark: 'rgba(255,59,48,0.15)', border: 'rgba(255,59,48,0.25)', borderDark: 'rgba(255,59,48,0.4)', text: '#FF3B30' },
    HIGH: { bg: 'rgba(255,149,0,0.08)', bgDark: 'rgba(255,149,0,0.15)', border: 'rgba(255,149,0,0.25)', borderDark: 'rgba(255,149,0,0.4)', text: '#FF9500' },
    MEDIUM: { bg: 'rgba(0,122,255,0.08)', bgDark: 'rgba(0,122,255,0.15)', border: 'rgba(0,122,255,0.25)', borderDark: 'rgba(0,122,255,0.4)', text: '#007AFF' },
    LOW: { bg: 'rgba(142,142,147,0.08)', bgDark: 'rgba(142,142,147,0.15)', border: 'rgba(142,142,147,0.25)', borderDark: 'rgba(142,142,147,0.4)', text: '#8E8E93' },
};

export const CreateRequestDrawer: React.FC<CreateRequestDrawerProps> = ({ 
    visible, 
    onClose, 
    initialType = 'purchase',
    locked = false,
    editRequest = null,
    isEmbedded = false,
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,120,128,0.06)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,120,128,0.12)';
    
    const { addPurchasingRequest, addReimburseRequest, updatePurchasingRequest, updateReimburseRequest } = useFinance();
    const isEditMode = !!editRequest?.id;

    // Tab Type
    const [activeTab, setActiveTab] = useState<'purchase' | 'reimburse'>(initialType);
    
    // Core Fields
    const [projects, setProjects] = useState<any[]>([]);
    const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>([]);
    const [setupCategories, setSetupCategories] = useState<FinanceCategory[]>(getFinanceCategoriesSnapshot);
    useEffect(() => subscribeFinanceCategories(setSetupCategories), []);
    const [projectCode, setProjectCode] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
    const [stage, setStage] = useState<PurchaseStage>('PLANNED');
    const [isDraft, setIsDraft] = useState(false);
    
    // Vendor / Payment Info
    const [vendorName, setVendorName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    // Beneficiary Account Search & Save
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
    const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState('');
    const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
    const [saveAccountToggle, setSaveAccountToggle] = useState(false);

    // Items list
    const [purchaseItems, setPurchaseItems] = useState<RequestItem[]>([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
    const [reimburseItems, setReimburseItems] = useState<RequestItem[]>([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);

    // Multiple Proof Images
    const [purchaseImages, setPurchaseImages] = useState<FinanceImage[]>([]);
    const [reimburseImages, setReimburseImages] = useState<FinanceImage[]>([]);
    
    // LiquidDatePicker state
    const [activeDatePicker, setActiveDatePicker] = useState<'invoice' | 'target' | null>(null);

    // Animation state
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

    // Unit selector state
    const [selectedItemIdForUnit, setSelectedItemIdForUnit] = useState<string | null>(null);

    // Additional Notes
    const [notes, setNotes] = useState('');

    const showSaveToggle = useMemo(() => {
        if (!accountNumber.trim()) return false;
        const alreadyExists = savedAccounts.some(acc => 
            (acc.account_number || '').trim() === accountNumber.trim()
        );
        return !alreadyExists;
    }, [accountNumber, savedAccounts]);

    useEffect(() => {
        if (!showSaveToggle) {
            setSaveAccountToggle(false);
        }
    }, [showSaveToggle]);

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return 'Select date...';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = d.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeSelect, setActiveSelect] = useState<'target' | 'category' | 'subcategory' | 'stage' | 'unit' | null>(null);

    const resetCreateForm = () => {
        setProjectCode('');
        setDepartmentId('');
        setCategory('');
        setSubcategory('');
        setTitle('');
        setVendorName('');
        setBankName('');
        setAccountNumber('');
        setAccountName('');
        setNotes('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setTargetDate(new Date().toISOString().split('T')[0]);
        setPriority('MEDIUM');
        setStage('PLANNED');
        setIsDraft(false);
        setPurchaseItems([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
        setReimburseItems([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
        setPurchaseImages([]);
        setReimburseImages([]);
        setSaveAccountToggle(false);
        setBeneficiarySearchQuery('');
        setShowBeneficiaryDropdown(false);
    };

    const applyEditRequest = (req: any, fetchedProjects: any[], fetchedDepts: OrganizationDepartmentItem[] = []) => {
        const tab = req.moduleType === 'reimbursement' ? 'reimburse' : 'purchase';
        setActiveTab(tab);

        const project = fetchedProjects.find(p => p.id === req.project_id);
        setProjectCode(project ? project.project_code : (req.project?.project_code || req.project || ''));
        const dept = fetchedDepts.find(d => d.id === req.department_id);
        setDepartmentId(dept ? dept.id : (req.department_id || req.department?.id || ''));
        setTitle(req.title || req.description || '');

        setNotes(req.notes || '');
        setInvoiceDate(req.date || new Date().toISOString().split('T')[0]);
        setTargetDate(req.target_date || new Date().toISOString().split('T')[0]);
        setIsDraft(req.statusTag === 'draft');
        
        const catValue = tab === 'purchase' ? (req.type || req.category) : req.category;
        setCategory(catValue || '');
        setSubcategory(req.subcategory || '');

        setPriority((req.priority || 'MEDIUM').toUpperCase());
        setStage((req.purchase_stage || 'PLANNED').toUpperCase());

        setVendorName(req.vendor || '');
        setBankName(req.beneficiary_bank || '');
        setAccountNumber(req.beneficiary_number || '');
        setAccountName(req.beneficiary_name || '');

        const mappedItems = (req.items || []).map((item: any, i: number) => ({
            id: item.id || String(i + 1),
            name: item.name || '',
            qty: item.qty || 1,
            unit: item.unit || 'pcs',
            price: item.unit_price || item.unitPrice || 0,
            origin: item.origin || '',
            destination: item.destination || '',
            distance: item.distance || 0,
        }));

        if (tab === 'purchase') {
            setPurchaseItems(mappedItems.length > 0 ? mappedItems : [{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
        } else {
            setReimburseItems(mappedItems.length > 0 ? mappedItems : [{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
        }

        const loadInvoices = async () => {
            let initialImages: any[] = [];
            if (req.invoices?.length) {
                initialImages = req.invoices.map((inv: any) => ({
                    uri: '',
                    path: inv.invoice_url,
                    fileName: inv.invoice_name || 'Invoice',
                    mimeType: 'image/jpeg',
                    documentKind: 'invoice',
                }));
            } else if (req.invoice_url) {
                const urls = req.invoice_url.split(',').map((url: string) => url.trim()).filter(Boolean);
                initialImages = urls.map((url: string, i: number) => ({
                    uri: '',
                    path: url,
                    fileName: `Invoice #${i + 1}`,
                    mimeType: 'image/jpeg',
                    documentKind: 'invoice',
                }));
            }

            if (tab === 'reimburse' && req.expense_proof_url) {
                initialImages = [
                    ...initialImages,
                    ...String(req.expense_proof_url).split(',').map((path: string) => path.trim()).filter(Boolean).map((path: string, index: number) => ({
                        uri: '',
                        path,
                        fileName: `Expense Payment Proof ${index + 1}`,
                        mimeType: 'image/jpeg',
                        documentKind: 'expense_proof',
                    })),
                ];
            }
            
            if (tab === 'purchase') {
                setPurchaseImages(initialImages);
            } else {
                setReimburseImages(initialImages);
            }

            if (initialImages.length > 0) {
                try {
                    const resolved = await Promise.all(
                        initialImages.map(async (img) => {
                            const resolvedUri = await resolveFinanceUrl(img.path || img.uri);
                            return {
                                ...img,
                                uri: resolvedUri || img.path || '',
                            };
                        })
                    );
                    if (tab === 'purchase') {
                        setPurchaseImages(resolved);
                    } else {
                        setReimburseImages(resolved);
                    }
                } catch (e) {
                    console.log("Error resolving edit request images:", e);
                }
            }
        };

        loadInvoices();
    };

    // Sync active tab and fetch options
    useEffect(() => {
        if (visible) {
            Promise.all([
                fetchProjects(),
                fetchOrganizationDepartments()
            ]).then(([fetchedProjects, fetchedDepts]) => {
                setProjects(fetchedProjects);
                setDepartments(fetchedDepts);
                if (editRequest) {
                    applyEditRequest(editRequest, fetchedProjects, fetchedDepts);
                } else {
                    resetCreateForm();
                    setActiveTab(initialType);
                }
            }).catch(err => console.error("Error loading finance drawer options:", err));

            fetchBeneficiaryAccounts().then(setSavedAccounts).catch(err => console.log("Error loading beneficiaries", err));
            getFinanceCategories().then(setSetupCategories).catch(err => console.log("Error loading finance categories", err));
            setBeneficiarySearchQuery('');
            setShowBeneficiaryDropdown(false);
            setSaveAccountToggle(false);
        }
    }, [visible, initialType, editRequest?.id]);

    // Reset fields when tab changes
    const handleTabChange = (tab: 'purchase' | 'reimburse') => {
        setActiveTab(tab);
        setCategory('');
        setSubcategory('');
        setTitle('');
    };

    // Recalculate trip item prices if subcategory changes (e.g. switching between Motorcycle and Car)
    useEffect(() => {
        if (activeTab === 'reimburse' && category === 'TRANSPORTATION') {
            const isPersonal = subcategory === 'MOTOR_PERSONAL' || subcategory === 'CAR_PERSONAL';
            const isTripContext = subcategory && subcategory !== 'FUEL' && subcategory !== 'PARKING' && subcategory !== 'TOLL';
            
            setReimburseItems(prev => prev.map(item => {
                if (isPersonal) {
                    const rate = subcategory === 'CAR_PERSONAL' ? 6000 : 3000;
                    return {
                        ...item,
                        unit: 'km',
                        qty: 1,
                        price: (item.distance || 0) * rate
                    };
                } else if (isTripContext) {
                    return {
                        ...item,
                        unit: 'trip',
                        qty: 1,
                        price: item.price || 0
                    };
                } else {
                    return {
                        ...item,
                        unit: 'pcs',
                        qty: 1,
                        price: item.price || 0
                    };
                }
            }));
        }
    }, [subcategory, activeTab, category]);

    // Helper functions for items
    const handleAddItem = () => {
        if (activeTab === 'purchase') {
            setPurchaseItems([...purchaseItems, { id: Math.random().toString(), name: '', qty: 1, unit: 'pcs', price: 0 }]);
        } else {
            const isPersonal = category === 'TRANSPORTATION' && (subcategory === 'MOTOR_PERSONAL' || subcategory === 'CAR_PERSONAL');
            const isTripContext = category === 'TRANSPORTATION' && subcategory && subcategory !== 'FUEL' && subcategory !== 'PARKING' && subcategory !== 'TOLL';
            setReimburseItems([...reimburseItems, { 
                id: Math.random().toString(), 
                name: '', 
                qty: 1, 
                unit: isPersonal ? 'km' : (isTripContext ? 'trip' : 'pcs'), 
                price: 0,
                origin: '',
                destination: '',
                distance: 0
            }]);
        }
    };

    const handleRemoveItem = (id: string) => {
        if (activeTab === 'purchase') {
            if (purchaseItems.length > 1) {
                setPurchaseItems(purchaseItems.filter(item => item.id !== id));
            }
        } else {
            if (reimburseItems.length > 1) {
                setReimburseItems(reimburseItems.filter(item => item.id !== id));
            }
        }
    };

    const handleUpdateItem = (id: string, field: string, value: any) => {
        if (activeTab === 'purchase') {
            setPurchaseItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        } else {
            setReimburseItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        }
    };

    const handleUpdateItemFields = (id: string, updates: Partial<RequestItem>) => {
        if (activeTab === 'purchase') {
            setPurchaseItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        } else {
            setReimburseItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        }
    };

    const activeItems = activeTab === 'purchase' ? purchaseItems : reimburseItems;

    const totalAmount = useMemo(() => {
        return activeItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    }, [activeItems]);

    // Image Picker
    const pickImage = async (documentKind: 'invoice' | 'expense_proof' = 'invoice') => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            allowsMultipleSelection: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (activeTab === 'purchase') {
                setPurchaseImages(prev => [...prev, ...result.assets]);
            } else {
                setReimburseImages(prev => [...prev, ...result.assets.map(asset => ({ ...asset, documentKind }))]);
            }
        }
    };

    const handleSubmit = async (asDraft = false) => {
        if ((!projectCode && !departmentId) || !category || activeItems.some(i => !i.name)) {
            Alert.alert('Informasi', 'Silakan pilih proyek atau departemen, kategori, dan isi nama item terlebih dahulu.');
            return;
        }

        if (activeTab === 'reimburse' && activeItems.some(item => item.qty === 0 || item.price === 0)) {
            Alert.alert('Actual Amount Required', 'Every reimbursement item must have an actual non-zero quantity and unit price.');
            return;
        }
        if (activeTab === 'reimburse' && !asDraft) {
            if (!reimburseImages.some(file => file.documentKind === 'invoice') || !reimburseImages.some(file => file.documentKind === 'expense_proof')) {
                Alert.alert('Documents Required', 'Attach one invoice and one expense payment proof.');
                return;
            }
            if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
                Alert.alert('Reimbursement Account Required', 'Complete the bank account that will receive the reimbursement.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const activeImages = activeTab === 'purchase' ? purchaseImages : reimburseImages;
            let uploadedUrls: string[] = [];
            
            for (const img of activeImages) {
                const isLocal = img.uri.startsWith('file://') || img.uri.startsWith('content://') || img.uri.startsWith('ph://');
                if (!isLocal) {
                    uploadedUrls.push(img.path || img.uri);
                    continue;
                }
                
                let base64 = img.base64;
                if (!base64) {
                    try {
                        base64 = await FileSystem.readAsStringAsync(img.uri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                    } catch (readErr) {
                        console.error("Error reading file base64:", readErr);
                        throw new Error(`Failed to read file data for ${img.fileName || 'file'}`);
                    }
                }
                if (base64) {
                    const ext = img.uri.split('.').pop() || 'jpg';
                    const mime = img.mimeType || 'image/jpeg';
                    const url = await uploadFinanceFileBase64(base64, ext, mime, activeTab);
                    uploadedUrls.push(url);
                }
            }

            // Save Beneficiary Account if Save switch is on
            if (saveAccountToggle && bankName && accountNumber && accountName) {
                const alreadyExists = savedAccounts.some(acc => acc.account_number === accountNumber && acc.bank_name.toLowerCase() === bankName.toLowerCase());
                if (!alreadyExists) {
                    await saveBeneficiaryAccount({
                        bank_name: bankName,
                        account_number: accountNumber,
                        account_name: accountName
                    });
                }
            }

            const selectedProject = projects.find(p => p.project_code === projectCode);
            const selectedDept = departments.find(d => d.id === departmentId);
            const statusTag = editRequest?.statusTag;

            if (activeTab === 'purchase') {
                const autoTitle = purchaseItems.map(i => i.name.trim()).filter(Boolean).join(', ') || 'Purchase Request';
                const purchasePayload = {
                    title: autoTitle,
                    project_id: selectedProject?.id || null,
                    department_id: selectedDept?.id || null,
                    department_name: selectedDept?.name || undefined,
                    department_code: selectedDept?.code || undefined,
                    date: invoiceDate,
                    target_date: targetDate || undefined,
                    description: autoTitle,
                    type: category,
                    subcategory,
                    priority,
                    amount: totalAmount,
                    approval_status: asDraft ? 'DRAFT' : 'SUBMITTED',
                    purchase_stage: stage,
                    beneficiary_bank: bankName || undefined,
                    beneficiary_number: accountNumber || undefined,
                    beneficiary_name: accountName || undefined,
                    vendor: vendorName || undefined,
                    items: purchaseItems.map(i => ({
                        name: i.name,
                        qty: i.qty,
                        unit: i.unit,
                        unit_price: i.price,
                        total: i.qty * i.price
                    })),
                    invoice_url: uploadedUrls[0] || undefined,
                    invoices: uploadedUrls.map((url, index) => ({
                        invoice_url: url,
                        invoice_name: `Invoice #${index + 1}`
                    })),
                    notes: notes || undefined,
                    statusTag,
                    isDraft: asDraft
                } as any;

                if (isEditMode) {
                    await updatePurchasingRequest(editRequest.id, purchasePayload);
                } else {
                    await addPurchasingRequest(purchasePayload);
                }
            } else {
                const reimbursementNames = reimburseItems.map(item => item.name.trim()).filter(Boolean);
                const reimbursementTitle = reimbursementNames.length <= 1
                    ? (reimbursementNames[0] || 'Reimbursement Request')
                    : `${reimbursementNames[0]}, ${reimbursementNames[1]}${reimbursementNames.length > 2 ? ` +${reimbursementNames.length - 2}` : ''}`;
                const reimbursePayload = {
                    title: reimbursementTitle,
                    project_id: selectedProject?.id || null,
                    department_id: selectedDept?.id || null,
                    department_name: selectedDept?.name || undefined,
                    department_code: selectedDept?.code || undefined,
                    date: invoiceDate,
                    description: reimbursementTitle,
                    category,
                    subcategory,
                    amount: totalAmount,
                    status: asDraft ? 'DRAFT' : 'SUBMITTED',
                    priority,
                    beneficiary_bank: bankName || undefined,
                    beneficiary_number: accountNumber || undefined,
                    beneficiary_name: accountName || undefined,
                    details: category === 'TRANSPORTATION' ? {
                        origin: reimburseItems[0]?.origin || '',
                        destination: reimburseItems[0]?.destination || '',
                        distance: reimburseItems[0]?.distance || 0
                    } : undefined,
                    items: reimburseItems.map(i => {
                        if (category === 'TRANSPORTATION') {
                            if (subcategory === 'MOTOR_PERSONAL' || subcategory === 'CAR_PERSONAL') {
                                const rate = subcategory === 'CAR_PERSONAL' ? 6000 : 3000;
                                const estPrice = (i.distance || 0) * rate;
                                return {
                                    name: `Trip: ${i.origin || ''} to ${i.destination || ''} (${i.distance || 0} km - System Est: Rp ${estPrice.toLocaleString('id-ID')})`,
                                    qty: i.qty,
                                    unit: i.unit,
                                    unitPrice: i.price,
                                    total: i.qty * i.price
                                };
                            } else if (subcategory !== 'FUEL' && subcategory !== 'PARKING' && subcategory !== 'TOLL') {
                                return {
                                    name: `Trip: ${i.origin || ''} to ${i.destination || ''} (${i.distance || 0} km)`,
                                    qty: i.qty,
                                    unit: i.unit,
                                    unitPrice: i.price,
                                    total: i.qty * i.price
                                };
                            }
                        }
                        return {
                            name: i.name,
                            qty: i.qty,
                            unit: i.unit,
                            unitPrice: i.price,
                            total: i.qty * i.price
                        };
                    }),
                    invoice_url: uploadedUrls.filter((_, index) => activeImages[index]?.documentKind === 'invoice').join(','),
                    expense_proof_url: uploadedUrls.filter((_, index) => activeImages[index]?.documentKind === 'expense_proof').join(','),
                    notes: notes || undefined,
                    statusTag,
                    isDraft: asDraft
                } as any;

                if (isEditMode) {
                    await updateReimburseRequest(editRequest.id, reimbursePayload);
                } else {
                    await addReimburseRequest(reimbursePayload);
                }
            }

            Alert.alert('Success', isEditMode
                ? 'Request updated successfully!'
                : (asDraft ? 'Draft saved.' : 'Request submitted successfully.'));
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeImages = activeTab === 'purchase' ? purchaseImages : reimburseImages;

    const SelectModal = () => {
        if (!activeSelect) return null;
        
        let options: {value: string, label: string}[] = [];
        let modalTitle = '';
        
        if (activeSelect === 'target') {
            options = [
                ...projects.map(p => ({ value: `prj:${p.project_code}`, label: `Project: ${p.project_code} - ${p.project_name}` })),
                ...departments.map(d => ({ value: `dept:${d.id}`, label: `Dept: ${d.code ? `${d.code} - ` : ''}${d.name}` }))
            ];
            modalTitle = 'Select Project or Department';
        } else if (activeSelect === 'category') {
            options = transactionCategoriesFor(setupCategories, activeTab === 'purchase' ? 'purchasing' : 'reimbursement').map(item => ({ value: transactionCategoryValue(item, activeTab === 'purchase' ? 'purchasing' : 'reimbursement'), label: item.name }));
            modalTitle = 'Select Category';
        } else if (activeSelect === 'subcategory' && category) {
            const workflow = activeTab === 'purchase' ? 'purchasing' : 'reimbursement';
            options = (setupCategories.find(item => transactionCategoryValue(item, workflow) === category || item.name === category)?.subcategories || [])
                .filter(item => !item.isArchived && (!item.legacyValues || !!item.legacyValues[workflow]))
                .map(item => ({ value: transactionCategoryValue(item, workflow), label: item.name }));
            modalTitle = 'Select Subcategory';
        } else if (activeSelect === 'stage') {
            options = [
                { value: 'PLANNED', label: 'Planned (Estimation)' },
                { value: 'INVOICED', label: 'Invoiced (Billed)' },
                { value: 'RECEIVED', label: 'Received (Goods)' },
                { value: 'PAID', label: 'Paid (Completed)' }
            ];
            modalTitle = 'Select Order Stage';
        } else if (activeSelect === 'unit') {
            options = UNIT_OPTIONS;
            modalTitle = 'Select Unit';
        }

        return (
            <Modal visible={!!activeSelect} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <GlassView intensity={40} tint={isDark ? 'dark' : 'light'} style={[s.modalContent, { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textColor }]}>{modalTitle}</Text>
                            <TouchableOpacity onPress={() => setActiveSelect(null)} style={[s.headerCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,128,0.1)' }]}>
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {options.map((opt, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[s.modalOption, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={() => {
                                        if (activeSelect === 'target') {
                                            if (opt.value.startsWith('prj:')) {
                                                setProjectCode(opt.value.replace('prj:', ''));
                                                setDepartmentId('');
                                            } else if (opt.value.startsWith('dept:')) {
                                                setDepartmentId(opt.value.replace('dept:', ''));
                                                setProjectCode('');
                                            }
                                        }
                                        if (activeSelect === 'category') {
                                            setCategory(opt.value);
                                            setSubcategory('');
                                        }
                                        if (activeSelect === 'subcategory') setSubcategory(opt.value);
                                        if (activeSelect === 'stage') setStage(opt.value as PurchaseStage);
                                        if (activeSelect === 'unit' && selectedItemIdForUnit) {
                                            handleUpdateItem(selectedItemIdForUnit, 'unit', opt.value);
                                            setSelectedItemIdForUnit(null);
                                        }
                                        setActiveSelect(null);
                                    }}
                                >
                                    <Text style={[s.modalOptionText, { color: textColor }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                            {options.length === 0 && (
                                <Text style={{ color: subtextColor, textAlign: 'center', marginVertical: 20 }}>No options available.</Text>
                            )}
                        </ScrollView>
                    </GlassView>
                </View>
            </Modal>
        );
    };

    const sheetTitle = isEditMode
        ? (activeTab === 'purchase' ? 'Edit Purchase Request' : 'Edit Reimburse Request')
        : (activeTab === 'purchase' ? 'Purchase Request' : 'Reimburse Request');

    const submitLabel = isSubmitting
        ? 'Saving...'
        : isEditMode
            ? (isDraft ? 'Save Draft' : 'Save Changes')
            : (isDraft ? 'Save Draft' : (activeTab === 'purchase' ? 'Submit Request' : 'Submit Claim'));

    const canSaveAsDraft = !isEditMode || ['draft', 'revision', 'rejected'].includes(editRequest?.statusTag);
    const scrollBg = isDark ? '#1C1C1E' : '#F2F2F7';

    const renderInnerContent = () => (
        <View style={[
            isEmbedded ? s.embeddedContent : s.innerContentContainer, 
            { backgroundColor: isDark ? '#1C1C1E' : (isEmbedded ? '#F2F2F7' : '#FFFFFF') }
        ]}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[s.headerTitle, { color: textColor }]}>
                    {sheetTitle}
                </Text>
                <TouchableOpacity onPress={handleDismiss} disabled={isSubmitting} style={[s.headerCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,128,0.1)' }]}>
                    <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                </TouchableOpacity>
            </View>

                        {/* Segmented Control for Request Type */}
                        {!locked && (
                            <View style={s.tabWrapper}>
                                <View style={[s.tabBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,120,128,0.08)' }]}>
                                    <TouchableOpacity 
                                        style={[s.tabItem, activeTab === 'purchase' && [s.tabActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]]}
                                        onPress={() => handleTabChange('purchase')}
                                    >
                                        <Text style={[s.tabText, { color: activeTab === 'purchase' ? textColor : subtextColor }]}>Purchase</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[s.tabItem, activeTab === 'reimburse' && [s.tabActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]]}
                                        onPress={() => handleTabChange('reimburse')}
                                    >
                                        <Text style={[s.tabText, { color: activeTab === 'reimburse' ? textColor : subtextColor }]}>Reimburse</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            
                            {/* Section 1: General Information */}
                            <Text style={s.sectionTitleHeader}>General Information</Text>
                            <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                <TouchableOpacity style={s.listRow} onPress={() => setActiveSelect('target')}>
                                    <Text style={[s.listRowLabel, { color: textColor }]}>Project / Dept</Text>
                                    <View style={s.listRowValue}>
                                        <Text style={[s.listRowValueText, { color: (projectCode || departmentId) ? textColor : subtextColor }]}>
                                            {(() => {
                                                if (projectCode) {
                                                    const p = projects.find(prj => prj.project_code === projectCode);
                                                    return p ? `${p.project_code} - ${p.project_name}` : projectCode;
                                                }
                                                if (departmentId) {
                                                    const d = departments.find(dept => dept.id === departmentId);
                                                    return d ? `${d.code ? `${d.code} - ` : ''}${d.name}` : 'Department';
                                                }
                                                return 'Select Project or Department';
                                            })()}
                                        </Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TouchableOpacity style={s.listRow} onPress={() => setActiveDatePicker('invoice')}>
                                    <Text style={[s.listRowLabel, { color: textColor }]}>Invoice Date</Text>
                                    <View style={[s.dateCapsule, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(120,120,128,0.12)' }]}>
                                        <Text style={[s.dateCapsuleText, { color: textColor }]}>{formatDateDisplay(invoiceDate)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {activeTab === 'purchase' && (
                                    <>
                                        <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                        <TouchableOpacity style={s.listRow} onPress={() => setActiveDatePicker('target')}>
                                            <Text style={[s.listRowLabel, { color: textColor }]}>Target Date</Text>
                                            <View style={[s.dateCapsule, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(120,120,128,0.12)' }]}>
                                                <Text style={[s.dateCapsuleText, { color: textColor }]}>{formatDateDisplay(targetDate)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TouchableOpacity style={s.listRow} onPress={() => setActiveSelect('category')}>
                                    <Text style={[s.listRowLabel, { color: textColor }]}>Category</Text>
                                    <View style={s.listRowValue}>
                                        <Text style={[s.listRowValueText, { color: category ? textColor : subtextColor }]}>
                                            {category ? setupCategories.find(item => transactionCategoryValue(item, activeTab === 'purchase' ? 'purchasing' : 'reimbursement') === category || item.name === category)?.name || category : 'Select Category'}
                                        </Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TouchableOpacity 
                                    style={s.listRow} 
                                    onPress={() => category ? setActiveSelect('subcategory') : Alert.alert('Pick Category First')}
                                    disabled={!category}
                                >
                                    <Text style={[s.listRowLabel, { color: category ? textColor : subtextColor }]}>Subcategory</Text>
                                    <View style={s.listRowValue}>
                                        <Text style={[s.listRowValueText, { color: subcategory ? textColor : subtextColor }]}>
                                            {subcategory ? setupCategories.flatMap(item => item.subcategories).find(item => transactionCategoryValue(item, activeTab === 'purchase' ? 'purchasing' : 'reimbursement') === subcategory || item.name === subcategory)?.name || subcategory : (category ? 'Select Subcategory' : 'Select Category First')}
                                        </Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <View style={s.priorityListRow}>
                                    <Text style={[s.listRowLabel, { color: textColor }]}>Priority</Text>
                                    <View style={[s.prioritySegmentWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,120,128,0.08)' }]}>
                                        {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => {
                                            const isSelected = priority === p;
                                            return (
                                                <TouchableOpacity 
                                                    key={p} 
                                                    style={[s.prioritySegmentItem, isSelected && [s.tabActive, { backgroundColor: isDark ? '#636366' : '#FFF' }]]}
                                                    onPress={() => setPriority(p)}
                                                >
                                                    <Text style={[s.prioritySegmentText, { color: isSelected ? textColor : subtextColor, fontWeight: isSelected ? '700' : '500' }]}>{p}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {activeTab === 'purchase' && (
                                    <>
                                        <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                        <TouchableOpacity style={s.listRow} onPress={() => setActiveSelect('stage')}>
                                            <Text style={[s.listRowLabel, { color: textColor }]}>Order Stage</Text>
                                            <View style={s.listRowValue}>
                                                <Text style={[s.listRowValueText, { color: stage ? textColor : subtextColor }]}>
                                                    {stage ? (stage === 'PLANNED' ? 'Planned (Estimation)' : (stage === 'INVOICED' ? 'Invoiced (Billed)' : (stage === 'RECEIVED' ? 'Received (Goods)' : 'Paid (Completed)'))) : 'Select Stage'}
                                                </Text>
                                                <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {/* Section 2: Items & Pricing */}
                            {activeItems.map((item, index) => {
                                const isTripContext = activeTab === 'reimburse' && 
                                                      category === 'TRANSPORTATION' && 
                                                      subcategory &&
                                                      subcategory !== 'FUEL' && 
                                                      subcategory !== 'PARKING' && 
                                                      subcategory !== 'TOLL';
                                const hasSystemEstimation = isTripContext && 
                                                            (subcategory === 'MOTOR_PERSONAL' || subcategory === 'CAR_PERSONAL');
                                const rate = subcategory === 'CAR_PERSONAL' ? 6000 : 3000;
                                
                                return (
                                    <React.Fragment key={item.id}>
                                        <Text style={s.sectionTitleHeader}>{isTripContext ? `Trip Details #${index + 1}` : `Item #${index + 1}`}</Text>
                                        <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            {isTripContext ? (
                                                /* Trip Context Layout in Form Row style */
                                                <>
                                                    <TextInput
                                                        style={[s.inputRow, { color: textColor }]}
                                                        placeholder="Origin (From)"
                                                        placeholderTextColor={subtextColor}
                                                        value={item.origin || ''}
                                                        onChangeText={(v) => {
                                                            const updatedName = hasSystemEstimation 
                                                                ? `Trip: ${v} to ${item.destination || ''}`
                                                                : `Trip: ${v} to ${item.destination || ''} (${item.distance || 0} km)`;
                                                            handleUpdateItemFields(item.id, { origin: v, name: updatedName });
                                                        }}
                                                    />
                                                    
                                                    <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                                    <TextInput
                                                        style={[s.inputRow, { color: textColor }]}
                                                        placeholder="Destination (To)"
                                                        placeholderTextColor={subtextColor}
                                                        value={item.destination || ''}
                                                        onChangeText={(v) => {
                                                            const updatedName = hasSystemEstimation 
                                                                ? `Trip: ${item.origin || ''} to ${v}`
                                                                : `Trip: ${item.origin || ''} to ${v} (${item.distance || 0} km)`;
                                                            handleUpdateItemFields(item.id, { destination: v, name: updatedName });
                                                        }}
                                                    />

                                                    <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                                    <View style={[s.listRow, { paddingRight: 0 }]}>
                                                        <Text style={[s.listRowLabel, { color: textColor }]}>Distance</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', width: 140 }}>
                                                            <TextInput
                                                                style={[s.inputRow, { flex: 1, textAlign: 'right', paddingRight: 8, color: textColor }]}
                                                                placeholder="0"
                                                                placeholderTextColor={subtextColor}
                                                                keyboardType="numeric"
                                                                value={item.distance ? item.distance.toString() : ''}
                                                                onChangeText={(v) => {
                                                                    const dist = parseInt(v.replace(/[^0-9]/g, '')) || 0;
                                                                    const updatedName = hasSystemEstimation
                                                                        ? `Trip: ${item.origin || ''} to ${item.destination || ''}`
                                                                        : `Trip: ${item.origin || ''} to ${item.destination || ''} (${dist} km)`;
                                                                    handleUpdateItemFields(item.id, { distance: dist, name: updatedName });
                                                                }}
                                                            />
                                                            <Text style={{ color: subtextColor, fontSize: 16, paddingRight: 16, fontWeight: '600' }}>km</Text>
                                                        </View>
                                                    </View>

                                                    {hasSystemEstimation && (
                                                        <>
                                                            <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                                            <View style={s.listRow}>
                                                                <Text style={[s.listRowLabel, { color: textColor }]}>System Est.</Text>
                                                                <Text style={[s.listRowValueText, { color: textColor, fontWeight: '600' }]}>
                                                                    {`Rp ${rate.toLocaleString('id-ID')} x ${item.distance || 0} km = Rp ${((item.distance || 0) * rate).toLocaleString('id-ID')}`}
                                                                </Text>
                                                            </View>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                /* Standard Item Name */
                                                <>
                                                    <TextInput
                                                        style={[s.inputRow, { color: textColor }]}
                                                        placeholder="Item Name / Description"
                                                        placeholderTextColor={subtextColor}
                                                        value={item.name}
                                                        onChangeText={(v) => handleUpdateItem(item.id, 'name', v)}
                                                    />
                                                </>
                                            )}

                                            <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                            <View style={[s.listRow, { paddingRight: 0 }]}>
                                                <Text style={[s.listRowLabel, { color: textColor }]}>Quantity</Text>
                                                <TextInput
                                                    style={[s.inputRow, { width: 100, textAlign: 'right', paddingRight: 16, color: textColor }]}
                                                    placeholder="1"
                                                    placeholderTextColor={subtextColor}
                                                    keyboardType="numbers-and-punctuation"
                                                    value={item.qtyInput ?? item.qty.toString()}
                                                    onChangeText={(v) => {
                                                        if (/^-?\d*(?:[.,]\d*)?$/.test(v)) {
                                                            handleUpdateItemFields(item.id, { qtyInput: v, qty: Number(v.replace(',', '.')) || 0 });
                                                        }
                                                    }}
                                                />
                                            </View>

                                            <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                            <TouchableOpacity 
                                                style={s.listRow} 
                                                onPress={() => {
                                                    setSelectedItemIdForUnit(item.id);
                                                    setActiveSelect('unit');
                                                }}
                                            >
                                                <Text style={[s.listRowLabel, { color: textColor }]}>Unit</Text>
                                                <View style={s.listRowValue}>
                                                    <Text style={[s.listRowValueText, { color: textColor, fontWeight: '600' }]}>
                                                        {item.unit || 'pcs'}
                                                    </Text>
                                                    <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                                                </View>
                                            </TouchableOpacity>

                                            <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                            <View style={[s.listRow, { paddingRight: 0 }]}>
                                                <Text style={[s.listRowLabel, { color: textColor }]}>Unit Price</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, maxWidth: 240, marginLeft: 16 }}>
                                                    <Text style={{ color: subtextColor, fontSize: 16 }}>Rp</Text>
                                                    <TextInput
                                                        style={[s.inputRow, { flex: 1, minWidth: 0, width: 0, textAlign: 'right', paddingRight: 16, color: textColor }]}
                                                        placeholder="0"
                                                        placeholderTextColor={subtextColor}
                                                        keyboardType="numbers-and-punctuation"
                                                        value={item.priceInput ?? (item.price === 0 ? '' : item.price.toString())}
                                                        onChangeText={(v) => {
                                                            if (/^-?\d*(?:[.,]\d*)?$/.test(v)) {
                                                                handleUpdateItemFields(item.id, { priceInput: v, price: Number(v.replace(',', '.')) || 0 });
                                                            }
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                            <View style={s.listRow}>
                                                <Text style={[s.listRowLabel, { color: textColor }]}>Item Total</Text>
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#159957' }}>
                                                    Rp {(item.qty * item.price).toLocaleString('id-ID')}
                                                </Text>
                                            </View>

                                            {activeItems.length > 1 && (
                                                <>
                                                    <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                                    <TouchableOpacity 
                                                        style={[s.listRow, { justifyContent: 'center' }]} 
                                                        onPress={() => handleRemoveItem(item.id)}
                                                    >
                                                        <PlatformIcon name="minus.circle.fill" size={16} tintColor="#FF3B30" />
                                                        <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Remove Item</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    </React.Fragment>
                                );
                            })}

                            <TouchableOpacity 
                                style={[s.addItemBtn, { borderColor: isDark ? 'rgba(21,153,87,0.3)' : 'rgba(21,153,87,0.25)', width: '90%', marginHorizontal: '5%' }]} 
                                onPress={handleAddItem}
                            >
                               <PlatformIcon name="plus.circle.fill" size={16} tintColor="#159957" />
                               <Text style={s.addItemText}>Add Another Item</Text>
                            </TouchableOpacity>

                            <Text style={s.sectionTitleHeader}>Total Estimation</Text>
                            <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                <View style={s.listRow}>
                                    <Text style={[s.listRowLabel, { fontWeight: '700', color: textColor }]}>
                                        {activeTab === 'purchase' ? 'Estimated Total' : 'Total Reimbursement'}
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#159957' }}>
                                        Rp {totalAmount.toLocaleString('id-ID')}
                                    </Text>
                                </View>
                            </View>

                            {/* Section 3: Vendor & Payment Destination */}
                            <Text style={s.sectionTitleHeader}>
                                {activeTab === 'purchase' ? 'Vendor & Bank Account' : 'Payment Destination'}
                            </Text>
                            <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                {activeTab === 'purchase' && (
                                    <>
                                        <TextInput
                                            style={[s.inputRow, { color: textColor }]}
                                            placeholder="Vendor Name (Optional)"
                                            placeholderTextColor={subtextColor}
                                            value={vendorName}
                                            onChangeText={setVendorName}
                                        />
                                        <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                    </>
                                )}

                                <TextInput
                                    style={[s.inputRow, { color: textColor }]}
                                    placeholder="Search Saved Accounts..."
                                    placeholderTextColor={subtextColor}
                                    value={beneficiarySearchQuery}
                                    onChangeText={(text) => {
                                        setBeneficiarySearchQuery(text);
                                        setShowBeneficiaryDropdown(true);
                                    }}
                                    onFocus={() => {
                                        setShowBeneficiaryDropdown(true);
                                    }}
                                />

                                {showBeneficiaryDropdown && beneficiarySearchQuery.trim().length > 0 && (
                                    <View style={[s.dropdownContainer, { backgroundColor: isDark ? '#2C2C2E' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginHorizontal: 16 }]}>
                                        <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                                            {(savedAccounts.filter(acc => 
                                                (acc.bank_name || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase()) ||
                                                (acc.account_number || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase()) ||
                                                (acc.account_name || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase())
                                            )).map((acc, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[s.dropdownItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                                    onPress={() => {
                                                        setBankName(acc.bank_name);
                                                        setAccountNumber(acc.account_number);
                                                        setAccountName(acc.account_name);
                                                        setBeneficiarySearchQuery('');
                                                        setShowBeneficiaryDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[s.dropdownItemTitle, { color: textColor }]}>{acc.account_name}</Text>
                                                    <Text style={[s.dropdownItemSubtitle, { color: subtextColor }]}>{acc.bank_name} • {acc.account_number}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {(savedAccounts.filter(acc => 
                                                (acc.bank_name || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase()) ||
                                                (acc.account_number || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase()) ||
                                                (acc.account_name || '').toLowerCase().includes(beneficiarySearchQuery.toLowerCase())
                                            )).length === 0 && (
                                                <Text style={{ color: subtextColor, textAlign: 'center', paddingVertical: 12, fontSize: 13 }}>No matching saved accounts.</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TextInput
                                    style={[s.inputRow, { color: textColor }]}
                                    placeholder="Bank Name"
                                    placeholderTextColor={subtextColor}
                                    value={bankName}
                                    onChangeText={setBankName}
                                />

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TextInput
                                    style={[s.inputRow, { color: textColor }]}
                                    placeholder="Account Number"
                                    placeholderTextColor={subtextColor}
                                    keyboardType="numeric"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                />

                                <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />

                                <TextInput
                                    style={[s.inputRow, { color: textColor }]}
                                    placeholder="Account Holder Name"
                                    placeholderTextColor={subtextColor}
                                    value={accountName}
                                    onChangeText={setAccountName}
                                />

                                {showSaveToggle && (
                                    <>
                                        <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                        <View style={s.listRow}>
                                            <Text style={[s.listRowLabel, { color: textColor }]}>Save to Shared Beneficiary List</Text>
                                            <Switch
                                                value={saveAccountToggle}
                                                onValueChange={setSaveAccountToggle}
                                                trackColor={{ false: '#767577', true: '#159957' }}
                                                thumbColor={Platform.OS === 'ios' ? '#fff' : (saveAccountToggle ? '#fff' : '#f4f3f4')}
                                            />
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Section 4: Receipts Box / Invoice Proof */}
                            <Text style={s.sectionTitleHeader}>
                                {activeTab === 'purchase' ? 'Invoice Proof' : 'Required Documents'}
                            </Text>
                            <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                {(activeTab === 'purchase' ? [
                                    { kind: 'invoice' as const, label: 'Pick Invoice File/Images' },
                                ] : [
                                    { kind: 'invoice' as const, label: 'Add Invoice Files' },
                                    { kind: 'expense_proof' as const, label: 'Add Payment Proof Files' },
                                ]).map(option => (
                                    <TouchableOpacity
                                        key={option.kind}
                                        style={[s.listRow, { justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginHorizontal: 12, marginTop: 12, borderRadius: 22, minHeight: 44 }]}
                                        onPress={() => pickImage(option.kind)}
                                    >
                                        <PlatformIcon name="camera.fill" size={16} tintColor={subtextColor} />
                                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginLeft: 8 }}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}

                                {activeImages.length > 0 && (
                                    <>
                                        {activeImages.map((img, idx) => {
                                            const isImage = img.mimeType?.startsWith('image/') || 
                                                            /\.(jpg|jpeg|png|heic|heif|webp|gif)$/i.test(img.uri);
                                            return (
                                                <React.Fragment key={idx}>
                                                    <View style={[s.rowSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
                                                    <View style={[s.listRow, { paddingVertical: 8 }]}>
                                                        {isImage ? (
                                                            <View style={{ width: 80, height: 50, borderRadius: 6, overflow: 'hidden', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderWidth: 1, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }}>
                                                                <Image source={{ uri: img.uri }} style={{ width: 80, height: 50 }} resizeMode="cover" />
                                                            </View>
                                                        ) : (
                                                            <View style={{ width: 50, height: 50, borderRadius: 6, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }}>
                                                                <PlatformIcon name="doc.text.fill" size={24} tintColor={isDark ? '#FFD60A' : '#BF5AF2'} />
                                                            </View>
                                                        )}
                                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }} numberOfLines={1}>
                                                                {activeTab === 'reimburse'
                                                                    ? (img.documentKind === 'expense_proof' ? 'Expense Payment Proof' : 'Invoice')
                                                                    : (isImage ? `Proof #${idx + 1}` : (img.fileName || 'Document'))}
                                                            </Text>
                                                            <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>
                                                                {activeTab === 'reimburse'
                                                                    ? (img.documentKind === 'expense_proof' ? 'Mandatory proof of personal payment' : 'Mandatory invoice document')
                                                                    : (isImage ? 'Image' : 'PDF Document')}
                                                            </Text>
                                                        </View>
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                const updated = activeImages.filter((_, i) => i !== idx);
                                                                if (activeTab === 'purchase') {
                                                                    setPurchaseImages(updated);
                                                                } else {
                                                                    setReimburseImages(updated);
                                                                }
                                                            }}
                                                        >
                                                            <PlatformIcon name="trash.fill" size={18} tintColor="#FF3B30" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </React.Fragment>
                                            );
                                        })}
                                    </>
                                )}
                            </View>

                            {/* Section 5: Additional Notes */}
                            <Text style={s.sectionTitleHeader}>Additional Notes</Text>
                            <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                <TextInput
                                    style={[s.notesInputRow, { color: textColor }]}
                                    placeholder="Add notes or specifications..."
                                    placeholderTextColor={subtextColor}
                                    multiline
                                    numberOfLines={3}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>

                            {/* Section 6: Submission Option */}
                            {canSaveAsDraft && (
                                <>
                                    <Text style={s.sectionTitleHeader}>Submission Option</Text>
                                    <View style={[s.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <View style={s.listRow}>
                                            <Text style={[s.listRowLabel, { color: textColor }]}>Save as Draft</Text>
                                            <Switch
                                                value={isDraft}
                                                onValueChange={setIsDraft}
                                                trackColor={{ false: '#767577', true: '#159957' }}
                                                thumbColor={Platform.OS === 'ios' ? '#fff' : (isDraft ? '#fff' : '#f4f3f4')}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        {/* Sticky Action Buttons Footer */}
                        <View style={s.stickyFooter}>
                            <View style={s.btnRow}>
                                <TouchableOpacity 
                                    style={[s.draftBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} 
                                    onPress={handleDismiss}
                                    disabled={isSubmitting}
                                >
                                    <Text style={[s.draftBtnText, { color: textColor }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[s.submitBtn, { backgroundColor: '#159957' }]} 
                                    onPress={() => handleSubmit(isDraft)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={s.submitBtnText}>{submitLabel}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* LiquidDatePicker Modal */}
                        <LiquidDatePicker
                            visible={activeDatePicker !== null}
                            onClose={() => setActiveDatePicker(null)}
                            onSelect={(date) => {
                                if (activeDatePicker === 'invoice') {
                                    setInvoiceDate(date);
                                } else if (activeDatePicker === 'target') {
                                    setTargetDate(date);
                                }
                            }}
                            currentDate={activeDatePicker === 'target' ? targetDate : invoiceDate}
                            title={activeDatePicker === 'target' ? 'Select Target Date' : 'Select Invoice Date'}
                        />

                        <SelectModal />
        </View>
    );

    if (!visible) return null;

    if (isEmbedded) {
        return (
            <View style={s.embeddedContainer}>
                {renderInnerContent()}
            </View>
        );
    }

    return (
        <Modal 
            visible={visible} 
            transparent={true}
            animationType="none" 
            onRequestClose={handleDismiss}
            statusBarTranslucent={true}
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[s.drawerOverlay, isDesktop && s.modalOverlayWeb]}>
                    <TouchableWithoutFeedback onPress={handleDismiss}>
                        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
                    </TouchableWithoutFeedback>
                    <Animated.View
                        style={[
                            s.drawerContentSheet,
                            isDesktop && s.modalContentWeb,
                            {
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
                        {renderInnerContent()}
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const s = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    embeddedContent: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 0,
        overflow: 'hidden',
    },
    container: { 
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 12,
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '800',
        letterSpacing: -0.5
    },
    headerCloseBtn: { 
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabWrapper: {
        paddingHorizontal: 24,
        marginTop: 8,
        marginBottom: 12,
    },
    tabBg: {
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        padding: 3,
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        height: '100%',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
    },
    scrollContent: { 
        paddingHorizontal: 16, 
        paddingTop: 8,
        paddingBottom: 24 
    },
    sectionTitleHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 16,
        marginBottom: 8,
        marginTop: 16,
    },
    section: {
        borderRadius: 24,
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    listRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    listRowLabel: {
        fontSize: 16,
    },
    listRowValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    listRowValueText: {
        fontSize: 15,
    },
    dateCapsule: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    dateCapsuleText: {
        fontSize: 15,
        fontWeight: '500',
    },
    rowSeparator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    priorityListRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    prioritySegmentWrapper: {
        height: 38,
        borderRadius: 20,
        flexDirection: 'row',
        padding: 2,
        alignItems: 'center',
        marginTop: 4,
    },
    prioritySegmentItem: {
        flex: 1,
        height: '100%',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    prioritySegmentText: {
        fontSize: 13,
    },
    inputRow: {
        height: 44,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    notesInputRow: {
        minHeight: 88,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        textAlignVertical: 'top',
    },
    addItemBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 8, 
        alignSelf: 'center', 
        marginTop: 16,
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addItemText: { 
        color: '#159957', 
        fontSize: 15, 
        fontWeight: '700' 
    },
    dropdownContainer: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 8,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    dropdownItemTitle: {
        fontSize: 15,
        fontWeight: '700'
    },
    dropdownItemSubtitle: {
        fontSize: 12,
        marginTop: 2
    },
    stickyFooter: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 0,
    },
    btnRow: { 
        flexDirection: 'row', 
        gap: 12, 
    },
    draftBtn: { 
        flex: 1, 
        height: 52, 
        borderRadius: 26, 
        borderWidth: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    draftBtnText: { 
        fontSize: 16, 
        fontWeight: '700' 
    },
    submitBtn: { 
        flex: 1.5, 
        height: 52, 
        borderRadius: 26, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#159957',
        shadowColor: '#159957',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitBtnText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '700' 
    },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end'
    },
    modalContent: { 
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28, 
        padding: 24,
        maxHeight: '80%'
    },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: '800' 
    },
    modalOption: { 
        paddingVertical: 16, 
        borderBottomWidth: 1 
    },
    modalOptionText: { 
        fontSize: 15, 
        fontWeight: '600' 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20 
    },
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    modalOverlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawerContentSheet: {
        height: '90%',
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: 'hidden',
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
    innerContentContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});
