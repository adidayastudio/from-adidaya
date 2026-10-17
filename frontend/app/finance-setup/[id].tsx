import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    StatusBar as RNStatusBar,
    Switch,
    TextInput,
    Alert,
    RefreshControl,
    ActionSheetIOS,
    Share,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { DynamicIslandToastHUD } from '@/components/ui/DynamicIslandToastHUD';
import { triggerDynamicIslandFeedback } from '@/lib/native/dynamicIsland';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import {
    FinanceSetupModule,
    FINANCE_SETUP_MENU_ITEMS,
} from '@/components/finance/setup/FinanceTeamSetupTab';
import {
    FinanceGeneralSettings,
    DEFAULT_FINANCE_GENERAL_SETTINGS,
    getFinanceGeneralSettings,
    saveFinanceGeneralSettings,
    FinanceDocumentRulesSettings,
    DEFAULT_FINANCE_DOCUMENT_RULES,
    getFinanceDocumentRules,
    saveFinanceDocumentRules,
    FinanceCategory,
    DEFAULT_FINANCE_CATEGORIES,
    getFinanceCategories,
    saveFinanceCategories,
    FinanceExpenseType,
    DEFAULT_FINANCE_EXPENSE_TYPES_LIST,
    getFinanceExpenseTypes,
    saveFinanceExpenseTypes,
    FinanceTaxRule,
    DEFAULT_FINANCE_TAX_RULES,
    getFinanceTaxRules,
    saveFinanceTaxRules,
    FinanceAccount,
    DEFAULT_FINANCE_ACCOUNTS,
    getFinanceAccounts,
    saveFinanceAccounts,
    FinancePaymentTerm,
    DEFAULT_FINANCE_PAYMENT_TERMS,
    getFinancePaymentTerms,
    saveFinancePaymentTerms,
    FinancePaymentCycle,
    DEFAULT_FINANCE_PAYMENT_CYCLES,
    getFinancePaymentCycles,
    saveFinancePaymentCycles,
    FinanceBankAccount,
    DEFAULT_FINANCE_BANK_ACCOUNTS,
    getFinanceBankAccounts,
    saveFinanceBankAccounts,
    FinanceApprovalMatrixSettings,
    DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
    getFinanceApprovalMatrixSettings,
    saveFinanceApprovalMatrixSettings,
    OrganizationDepartmentItem,
    OrganizationPositionItem,
    OrganizationEmployeeItem,
    fetchOrganizationDepartments,
    fetchOrganizationPositions,
    fetchOrganizationEmployees,
    FinanceFieldRulesSettings,
    getFinanceFieldRules,
    saveFinanceFieldRules,
    getDefaultFieldRulesMap,
    FinanceNotificationRulesSettings,
    DEFAULT_FINANCE_NOTIFICATION_SETTINGS,
    getFinanceNotificationRules,
    saveFinanceNotificationRules,
} from '@/lib/api/financeSetup';
import { FinanceGeneralSettingsSection } from '@/components/finance/setup/FinanceGeneralSettingsSection';
import { FinanceDocumentRulesSection } from '@/components/finance/setup/FinanceDocumentRulesSection';
import { FinanceTransactionCategoriesSection } from '@/components/finance/setup/FinanceTransactionCategoriesSection';
import { FinanceExpenseTypesSection } from '@/components/finance/setup/FinanceExpenseTypesSection';
import { FinanceExpenseTypesGuideSheet } from '@/components/finance/setup/FinanceExpenseTypesGuideSheet';
import { FinanceTaxRulesSection } from '@/components/finance/setup/FinanceTaxRulesSection';
import { FinanceTaxRulesGuideSheet } from '@/components/finance/setup/FinanceTaxRulesGuideSheet';
import { FinanceAccountsSection } from '@/components/finance/setup/FinanceAccountsSection';
import { FinanceAccountsGuideSheet } from '@/components/finance/setup/FinanceAccountsGuideSheet';
import { FinancePaymentTermsSection } from '@/components/finance/setup/FinancePaymentTermsSection';
import { FinancePaymentTermsGuideSheet } from '@/components/finance/setup/FinancePaymentTermsGuideSheet';
import { FinancePaymentCyclesSection } from '@/components/finance/setup/FinancePaymentCyclesSection';
import { FinancePaymentCyclesGuideSheet } from '@/components/finance/setup/FinancePaymentCyclesGuideSheet';
import { FinanceBankAccountsSection } from '@/components/finance/setup/FinanceBankAccountsSection';
import { FinanceBankAccountsGuideSheet } from '@/components/finance/setup/FinanceBankAccountsGuideSheet';
import { FinanceApprovalMatrixSection } from '@/components/finance/setup/FinanceApprovalMatrixSection';
import { FinanceApprovalMatrixGuideSheet } from '@/components/finance/setup/FinanceApprovalMatrixGuideSheet';
import { FinanceFieldRulesSection } from '@/components/finance/setup/FinanceFieldRulesSection';
import { FinanceFieldRulesGuideSheet } from '@/components/finance/setup/FinanceFieldRulesGuideSheet';
import { FinanceNotificationRulesSection } from '@/components/finance/setup/FinanceNotificationRulesSection';
import { FinanceAuditLogSection } from '@/components/finance/setup/FinanceAuditLogSection';
import { useFinance } from '@/context/FinanceContext';

export default function FinanceSetupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const { updateDocumentRules } = useFinance();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [activeModule, setActiveModule] = useState<FinanceSetupModule>(
        (id as FinanceSetupModule) || 'general_settings'
    );
    const [refreshing, setRefreshing] = useState(false);

    // Sheets State
    const [isAddCategorySheetOpen, setIsAddCategorySheetOpen] = useState(false);
    const [isCategoryGuideSheetOpen, setIsCategoryGuideSheetOpen] = useState(false);

    const [isAddExpenseTypeSheetOpen, setIsAddExpenseTypeSheetOpen] = useState(false);
    const [isExpenseTypeGuideSheetOpen, setIsExpenseTypeGuideSheetOpen] = useState(false);

    const [isAddTaxRuleSheetOpen, setIsAddTaxRuleSheetOpen] = useState(false);
    const [isTaxRulesGuideSheetOpen, setIsTaxRulesGuideSheetOpen] = useState(false);

    const [isAddAccountSheetOpen, setIsAddAccountSheetOpen] = useState(false);
    const [isAccountsGuideSheetOpen, setIsAccountsGuideSheetOpen] = useState(false);

    const [isAddPaymentTermSheetOpen, setIsAddPaymentTermSheetOpen] = useState(false);
    const [isPaymentTermsGuideSheetOpen, setIsPaymentTermsGuideSheetOpen] = useState(false);

    const [isAddPaymentCycleSheetOpen, setIsAddPaymentCycleSheetOpen] = useState(false);
    const [isPaymentCyclesGuideSheetOpen, setIsPaymentCyclesGuideSheetOpen] = useState(false);

    const [isAddBankAccountSheetOpen, setIsAddBankAccountSheetOpen] = useState(false);
    const [isBankAccountsGuideSheetOpen, setIsBankAccountsGuideSheetOpen] = useState(false);

    const [isAddApprovalTierSheetOpen, setIsAddApprovalTierSheetOpen] = useState(false);
    const [isApprovalMatrixGuideSheetOpen, setIsApprovalMatrixGuideSheetOpen] = useState(false);

    const [isFieldRulesGuideSheetOpen, setIsFieldRulesGuideSheetOpen] = useState(false);
    const [fieldRules, setFieldRules] = useState<FinanceFieldRulesSettings>({});
    const [isAddCustomRuleSheetOpen, setIsAddCustomRuleSheetOpen] = useState(false);

    // Dynamic Island Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useSharedValue(0);
    const toastTranslateY = useSharedValue(-20);
    const toastScale = useSharedValue(0.9);

    const animatedToastStyle = useAnimatedStyle(() => ({
        opacity: toastOpacity.value,
        transform: [
            { translateY: toastTranslateY.value },
            { scale: toastScale.value },
        ],
    }));

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        toastOpacity.value = withTiming(1, { duration: 180 });
        toastTranslateY.value = withSpring(0, { damping: 14, stiffness: 200 });
        toastScale.value = withSpring(1, { damping: 14, stiffness: 200 });
        setTimeout(() => {
            toastOpacity.value = withTiming(0, { duration: 200 });
            toastTranslateY.value = withTiming(-14, { duration: 200 });
            toastScale.value = withTiming(0.95, { duration: 200 });
            setTimeout(() => setToastMessage(null), 220);
        }, 2200);
    }, [toastOpacity, toastTranslateY, toastScale]);

    // General Settings State
    const [generalSettings, setGeneralSettings] = useState<FinanceGeneralSettings>(
        DEFAULT_FINANCE_GENERAL_SETTINGS
    );

    // Document Rules State
    const [documentRules, setDocumentRules] = useState<FinanceDocumentRulesSettings>(
        DEFAULT_FINANCE_DOCUMENT_RULES
    );

    // Transaction Categories State
    const [categories, setCategories] = useState<FinanceCategory[]>(DEFAULT_FINANCE_CATEGORIES);

    // Expense Types State
    const [expenseTypes, setExpenseTypes] = useState<FinanceExpenseType[]>(DEFAULT_FINANCE_EXPENSE_TYPES_LIST);

    // Tax Rules State
    const [taxRules, setTaxRules] = useState<FinanceTaxRule[]>(DEFAULT_FINANCE_TAX_RULES);

    // Accounts State
    const [accounts, setAccounts] = useState<FinanceAccount[]>(DEFAULT_FINANCE_ACCOUNTS);

    // Payment Terms State
    const [paymentTerms, setPaymentTerms] = useState<FinancePaymentTerm[]>(DEFAULT_FINANCE_PAYMENT_TERMS);

    // Payment Cycles State
    const [paymentCycles, setPaymentCycles] = useState<FinancePaymentCycle[]>(DEFAULT_FINANCE_PAYMENT_CYCLES);

    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);

    // Approval Matrix Settings State
    const [approvalSettings, setApprovalSettings] = useState<FinanceApprovalMatrixSettings>(
        DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS
    );

    // Notification Rules State
    const [notificationSettings, setNotificationSettings] = useState<FinanceNotificationRulesSettings>(
        DEFAULT_FINANCE_NOTIFICATION_SETTINGS
    );

    // Organization Database State
    const [orgDepartments, setOrgDepartments] = useState<OrganizationDepartmentItem[]>([]);
    const [orgPositions, setOrgPositions] = useState<OrganizationPositionItem[]>([]);
    const [orgEmployees, setOrgEmployees] = useState<OrganizationEmployeeItem[]>([]);

    const loadSettings = useCallback(async () => {
        const [
            generalData,
            docRulesData,
            categoriesData,
            expenseTypesData,
            taxRulesData,
            accountsData,
            paymentTermsData,
            paymentCyclesData,
            bankAccountsData,
            approvalSettingsData,
            fieldRulesData,
            notificationData,
            deptsData,
            positionsData,
            employeesData,
        ] = await Promise.all([
            getFinanceGeneralSettings(),
            getFinanceDocumentRules(activeTenant?.id),
            getFinanceCategories(),
            getFinanceExpenseTypes(),
            getFinanceTaxRules(),
            getFinanceAccounts(),
            getFinancePaymentTerms(),
            getFinancePaymentCycles(),
            getFinanceBankAccounts(),
            getFinanceApprovalMatrixSettings(),
            getFinanceFieldRules(),
            getFinanceNotificationRules(),
            fetchOrganizationDepartments(),
            fetchOrganizationPositions(),
            fetchOrganizationEmployees(),
        ]);
        setGeneralSettings(generalData);
        setDocumentRules(docRulesData);
        setCategories(categoriesData);
        setExpenseTypes(expenseTypesData);
        setTaxRules(taxRulesData);
        setAccounts(accountsData);
        setPaymentTerms(paymentTermsData);
        setPaymentCycles(paymentCyclesData);
        setBankAccounts(bankAccountsData);
        setApprovalSettings(approvalSettingsData);
        setFieldRules(fieldRulesData);
        setNotificationSettings(notificationData);
        setOrgDepartments(deptsData);
        setOrgPositions(positionsData);
        setOrgEmployees(employeesData);
    }, [activeTenant?.id]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    useEffect(() => {
        if (id) {
            setActiveModule(id as FinanceSetupModule);
        }
    }, [id]);

    const handleUpdateGeneralSettings = async (updated: FinanceGeneralSettings) => {
        setGeneralSettings(updated);
        showToast('Settings saved');
        triggerDynamicIslandFeedback({
            title: 'Finance Settings',
            message: 'Settings updated successfully',
            status: 'Saved',
        });
        try {
            await saveFinanceGeneralSettings(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const handleUpdateDocumentRules = async (updated: FinanceDocumentRulesSettings) => {
        setDocumentRules(updated);
        showToast('Document rules saved');
        triggerDynamicIslandFeedback({
            title: 'Document Rules',
            message: 'Document workflows updated',
            status: 'Saved',
        });
        try {
            if (updateDocumentRules) {
                await updateDocumentRules(updated);
            } else {
                await saveFinanceDocumentRules(updated, activeTenant?.id);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to save document rules');
        }
    };

    const handleUpdateCategories = async (updated: FinanceCategory[]) => {
        setCategories(updated);
        triggerDynamicIslandFeedback({
            title: 'Categories',
            message: 'Transaction categories updated',
            status: 'Saved',
        });
        try {
            await saveFinanceCategories(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save categories');
        }
    };

    const handleUpdateExpenseTypes = async (updated: FinanceExpenseType[]) => {
        setExpenseTypes(updated);
        triggerDynamicIslandFeedback({
            title: 'Expense Types',
            message: 'Expense types updated',
            status: 'Saved',
        });
        try {
            await saveFinanceExpenseTypes(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save expense types');
        }
    };

    const handleUpdateTaxRules = async (updated: FinanceTaxRule[]) => {
        setTaxRules(updated);
        triggerDynamicIslandFeedback({
            title: 'Tax Rules',
            message: 'Tax rules updated',
            status: 'Saved',
        });
        try {
            await saveFinanceTaxRules(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save tax rules');
        }
    };

    const handleUpdateAccounts = async (updated: FinanceAccount[]) => {
        setAccounts(updated);
        triggerDynamicIslandFeedback({
            title: 'Accounts',
            message: 'Finance accounts updated',
            status: 'Saved',
        });
        try {
            await saveFinanceAccounts(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save accounts');
        }
    };

    const handleUpdatePaymentTerms = async (updated: FinancePaymentTerm[]) => {
        setPaymentTerms(updated);
        triggerDynamicIslandFeedback({
            title: 'Payment Terms',
            message: 'Payment terms updated',
            status: 'Saved',
        });
        try {
            await saveFinancePaymentTerms(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save payment terms');
        }
    };

    const handleUpdatePaymentCycles = async (updated: FinancePaymentCycle[]) => {
        setPaymentCycles(updated);
        triggerDynamicIslandFeedback({
            title: 'Payment Cycles',
            message: 'Payment cycles updated',
            status: 'Saved',
        });
        try {
            await saveFinancePaymentCycles(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save payment cycles');
        }
    };

    const handleUpdateBankAccounts = async (updated: FinanceBankAccount[]) => {
        setBankAccounts(updated);
        triggerDynamicIslandFeedback({
            title: 'Bank Accounts',
            message: 'Bank accounts updated',
            status: 'Saved',
        });
        try {
            await saveFinanceBankAccounts(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save bank accounts');
        }
    };

    const handleUpdateApprovalSettings = async (updated: FinanceApprovalMatrixSettings) => {
        setApprovalSettings(updated);
        triggerDynamicIslandFeedback({
            title: 'Approval Matrix',
            message: 'Approval flows updated',
            status: 'Saved',
        });
        try {
            await saveFinanceApprovalMatrixSettings(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save approval matrix');
        }
    };

    const handleUpdateFieldRules = async (updated: FinanceFieldRulesSettings) => {
        setFieldRules(updated);
        triggerDynamicIslandFeedback({
            title: 'Field Rules',
            message: 'Field requirements updated',
            status: 'Saved',
        });
        try {
            await saveFinanceFieldRules(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save field rules');
        }
    };

    const handleUpdateNotificationSettings = async (updated: FinanceNotificationRulesSettings) => {
        setNotificationSettings(updated);
        triggerDynamicIslandFeedback({
            title: 'Notifications',
            message: 'Notification rules updated',
            status: 'Saved',
        });
        try {
            await saveFinanceNotificationRules(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to save notification rules');
        }
    };

    const handleResetAllFieldRules = () => {
        Alert.alert(
            'Reset to Forma Preset',
            'Reset all field requirements across all documents to the recommended Forma Presets for your current workflow?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset to Preset',
                    style: 'destructive',
                    onPress: async () => {
                        const presetMap = getDefaultFieldRulesMap(documentRules);
                        setFieldRules(presetMap);
                        showToast('Reset to Forma Preset');
                        triggerDynamicIslandFeedback({
                            title: 'Field Rules',
                            message: 'Reset to Forma Preset',
                            status: 'Saved',
                        });
                        try {
                            await saveFinanceFieldRules(presetMap);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to reset field rules');
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadSettings();
        setTimeout(() => {
            setRefreshing(false);
        }, 600);
    }, [loadSettings]);

    const currentItemConfig = useMemo(() => {
        return (
            FINANCE_SETUP_MENU_ITEMS.find((m) => m.id === activeModule) ||
            FINANCE_SETUP_MENU_ITEMS[0]
        );
    }, [activeModule]);

    // Group Sub-Segment Selector (Tabs for same group)
    const groupSegments: Segment[] = useMemo(() => {
        const groupItems = FINANCE_SETUP_MENU_ITEMS.filter((item) => item.group === currentItemConfig.group);
        return groupItems.map((item) => ({
            id: item.id,
            label: item.shortLabel || item.title,
            icon: item.icon,
        }));
    }, [currentItemConfig.group]);

    // Header Toolbar Actions
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (activeModule === 'transaction_categories') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Resource Mapping',
                    onPress: () => {
                        setIsCategoryGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Category',
                    onPress: () => {
                        setIsAddCategorySheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'expense_types') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Expense Types',
                    onPress: () => {
                        setIsExpenseTypeGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Expense Type',
                    onPress: () => {
                        setIsAddExpenseTypeSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'tax_rules') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Tax Rules',
                    onPress: () => {
                        setIsTaxRulesGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Tax Rule',
                    onPress: () => {
                        setIsAddTaxRuleSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'accounts') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Accounts',
                    onPress: () => {
                        setIsAccountsGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Account',
                    onPress: () => {
                        setIsAddAccountSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'payment_terms') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Payment Terms',
                    onPress: () => {
                        setIsPaymentTermsGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Payment Term',
                    onPress: () => {
                        setIsAddPaymentTermSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'payment_cycles') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Payment Cycles',
                    onPress: () => {
                        setIsPaymentCyclesGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Payment Cycle',
                    onPress: () => {
                        setIsAddPaymentCycleSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'bank_accounts') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Bank Accounts',
                    onPress: () => {
                        setIsBankAccountsGuideSheetOpen(true);
                    },
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Bank Account',
                    onPress: () => {
                        setIsAddBankAccountSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'approval_matrix') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Approval Matrix',
                    onPress: () => {
                        setIsApprovalMatrixGuideSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'field_requirements') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Field Rules',
                    onPress: () => {
                        setIsFieldRulesGuideSheetOpen(true);
                    },
                },
                {
                    id: 'reset',
                    icon: 'refresh-outline',
                    image: 'arrow.counterclockwise',
                    title: 'Reset to Forma Preset',
                    onPress: handleResetAllFieldRules,
                },
            ];
        }
        if (activeModule === 'audit_logs') {
            return [
                {
                    id: 'export_audit_logs',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    title: 'Export',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (Platform.OS === 'ios') {
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    options: ['Cancel', 'Export as CSV', 'Export as JSON', 'Export Summary Report'],
                                    cancelButtonIndex: 0,
                                    userInterfaceStyle: isDark ? 'dark' : 'light',
                                    title: 'Export Audit Logs',
                                },
                                async (buttonIndex) => {
                                    if (buttonIndex === 0) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    const placeholder = 'No audit log entries to export with current filters.';
                                    if (buttonIndex === 1) {
                                        await Share.share({
                                            title: 'Finance Audit Log Export (CSV)',
                                            message: placeholder,
                                        });
                                    } else if (buttonIndex === 2) {
                                        await Share.share({
                                            title: 'Finance Audit Log Export (JSON)',
                                            message: placeholder,
                                        });
                                    } else if (buttonIndex === 3) {
                                        await Share.share({
                                            title: 'Finance Audit Log Summary',
                                            message: placeholder,
                                        });
                                    }
                                }
                            );
                        } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await Share.share({
                                title: 'Finance Audit Log Export (CSV)',
                                message: 'No audit log entries to export with current filters.',
                            });
                        }
                    },
                },
            ];
        }
        return [];
    }, [activeModule, documentRules, showToast, isDark, textColor]);

    const renderSettingRow = (label: string, subtitle: string, rightContent: React.ReactNode, isLast = false) => (
        <View key={label}>
            <View style={s.settingRow}>
                <View style={s.settingTextCol}>
                    <Text style={[s.settingLabel, { color: textColor }]}>{label}</Text>
                    {!!subtitle && (
                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                <View style={s.settingRightCol}>{rightContent}</View>
            </View>
            {!isLast && (
                <View
                    style={[
                        s.divider,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                />
            )}
        </View>
    );

    const renderModuleBody = () => {
        switch (activeModule) {
            case 'general_settings':
                return (
                    <FinanceGeneralSettingsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={generalSettings}
                        onUpdateSettings={handleUpdateGeneralSettings}
                    />
                );

            case 'document_rules':
                return (
                    <FinanceDocumentRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        rules={documentRules}
                        onUpdateRules={handleUpdateDocumentRules}
                    />
                );
            case 'transaction_categories':
                return (
                    <FinanceTransactionCategoriesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        categories={categories}
                        expenseTypesList={expenseTypes.filter((e) => e.active !== false).map((e) => e.name)}
                        onUpdateCategories={handleUpdateCategories}
                        isAddCategorySheetOpen={isAddCategorySheetOpen}
                        onCloseAddCategorySheet={() => setIsAddCategorySheetOpen(false)}
                        isGuideSheetOpen={isCategoryGuideSheetOpen}
                        onCloseGuideSheet={() => setIsCategoryGuideSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'expense_types':
                return (
                    <FinanceExpenseTypesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        expenseTypes={expenseTypes}
                        onUpdateExpenseTypes={handleUpdateExpenseTypes}
                        isAddSheetOpen={isAddExpenseTypeSheetOpen}
                        onCloseAddSheet={() => setIsAddExpenseTypeSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'tax_rules':
                return (
                    <FinanceTaxRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        taxRules={taxRules}
                        onUpdateTaxRules={handleUpdateTaxRules}
                        isAddSheetOpen={isAddTaxRuleSheetOpen}
                        onCloseAddSheet={() => setIsAddTaxRuleSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'accounts':
                return (
                    <FinanceAccountsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        accounts={accounts}
                        onUpdateAccounts={handleUpdateAccounts}
                        isAddSheetOpen={isAddAccountSheetOpen}
                        onCloseAddSheet={() => setIsAddAccountSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'payment_terms':
                return (
                    <FinancePaymentTermsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        terms={paymentTerms}
                        onUpdateTerms={handleUpdatePaymentTerms}
                        isAddSheetOpen={isAddPaymentTermSheetOpen}
                        onCloseAddSheet={() => setIsAddPaymentTermSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'payment_cycles':
                return (
                    <FinancePaymentCyclesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cycles={paymentCycles}
                        onUpdateCycles={handleUpdatePaymentCycles}
                        isAddSheetOpen={isAddPaymentCycleSheetOpen}
                        onCloseAddSheet={() => setIsAddPaymentCycleSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'bank_accounts':
                return (
                    <FinanceBankAccountsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        accounts={bankAccounts}
                        onUpdateAccounts={handleUpdateBankAccounts}
                        isAddSheetOpen={isAddBankAccountSheetOpen}
                        onCloseAddSheet={() => setIsAddBankAccountSheetOpen(false)}
                        onShowToast={showToast}
                    />
                );

            case 'approval_matrix':
                return (
                    <FinanceApprovalMatrixSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={approvalSettings}
                        documentRules={documentRules}
                        departments={orgDepartments}
                        positions={orgPositions}
                        employees={orgEmployees}
                        onUpdateSettings={handleUpdateApprovalSettings}
                        onShowToast={showToast}
                    />
                );

            case 'field_requirements':
                return (
                    <FinanceFieldRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        documentRules={documentRules}
                        fieldRules={fieldRules}
                        onUpdateFieldRules={handleUpdateFieldRules}
                        onShowToast={showToast}
                        isGuideSheetOpen={isFieldRulesGuideSheetOpen}
                        onCloseGuideSheet={() => setIsFieldRulesGuideSheetOpen(false)}
                    />
                );

            case 'notification_rules':
                return (
                    <FinanceNotificationRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        documentRules={documentRules}
                        notificationSettings={notificationSettings}
                        onUpdateSettings={handleUpdateNotificationSettings}
                        onShowToast={showToast}
                        isAddCustomRuleSheetOpen={isAddCustomRuleSheetOpen}
                        onCloseAddCustomRuleSheet={() => setIsAddCustomRuleSheetOpen(false)}
                    />
                );

            case 'audit_logs':
                return (
                    <FinanceAuditLogSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: currentItemConfig.title,
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerRight: toolbarActions.length > 0
                        ? () => (
                            <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                                <HeaderToolbar
                                    key={`header-toolbar-${activeModule}`}
                                    actions={toolbarActions}
                                    isDark={isDark}
                                    textColor={textColor}
                                    maxDirectActions={2}
                                />
                            </View>
                        )
                        : undefined,
                }}
            />


            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
                }
            >
                {/* Group Sub-Segment Selector */}
                {groupSegments.length > 1 && (
                    <View style={s.segmentedWrapper}>
                        <SegmentedControl
                            segments={groupSegments}
                            activeSegment={activeModule}
                            onSegmentChange={(newId) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveModule(newId as FinanceSetupModule);
                            }}
                        />
                    </View>
                )}


                {/* Main Settings Card */}
                {renderModuleBody()}
            </ScrollView>

            {/* Dynamic Island Toast HUD */}
            {toastMessage && (
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            top: Platform.OS === 'ios' ? insets.top + 54 : (RNStatusBar.currentHeight || 24) + 54,
                            left: 0,
                            right: 0,
                            alignItems: 'center',
                            zIndex: 9999,
                        },
                        animatedToastStyle,
                    ]}
                    pointerEvents="none"
                >
                    <DynamicIslandToastHUD
                        title={currentItemConfig.title || 'Finance Settings'}
                        message={toastMessage || ''}
                        isDark={isDark}
                    />
                </Animated.View>
            )}

            {/* Expense Types Guide Sheet */}
            <FinanceExpenseTypesGuideSheet
                visible={isExpenseTypeGuideSheetOpen}
                onClose={() => setIsExpenseTypeGuideSheetOpen(false)}
            />

            {/* Tax Rules Guide Sheet */}
            <FinanceTaxRulesGuideSheet
                visible={isTaxRulesGuideSheetOpen}
                onClose={() => setIsTaxRulesGuideSheetOpen(false)}
            />

            {/* Accounts Guide Sheet */}
            <FinanceAccountsGuideSheet
                visible={isAccountsGuideSheetOpen}
                onClose={() => setIsAccountsGuideSheetOpen(false)}
            />

            {/* Payment Terms Guide Sheet */}
            <FinancePaymentTermsGuideSheet
                visible={isPaymentTermsGuideSheetOpen}
                onClose={() => setIsPaymentTermsGuideSheetOpen(false)}
            />

            {/* Payment Cycles Guide Sheet */}
            <FinancePaymentCyclesGuideSheet
                visible={isPaymentCyclesGuideSheetOpen}
                onClose={() => setIsPaymentCyclesGuideSheetOpen(false)}
            />

            {/* Bank Accounts Guide Sheet */}
            <FinanceBankAccountsGuideSheet
                visible={isBankAccountsGuideSheetOpen}
                onClose={() => setIsBankAccountsGuideSheetOpen(false)}
            />

            {/* Approval Matrix Guide Sheet */}
            <FinanceApprovalMatrixGuideSheet
                visible={isApprovalMatrixGuideSheetOpen}
                onClose={() => setIsApprovalMatrixGuideSheetOpen(false)}
            />

            {/* Field Rules Guide Sheet */}
            <FinanceFieldRulesGuideSheet
                visible={isFieldRulesGuideSheetOpen}
                onClose={() => setIsFieldRulesGuideSheetOpen(false)}
            />
        </>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 14,
    },
    segmentedWrapper: {
        marginBottom: 4,
    },
    sectionHeader: {
        paddingHorizontal: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    menuList: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    settingTextCol: {
        flex: 1,
        gap: 2,
    },
    settingRightCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    valueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: 'rgba(0,122,255,0.12)',
    },
    badgePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
    },
    headerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginRight: 4,
    },
});


