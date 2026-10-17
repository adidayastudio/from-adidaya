import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    RefreshControl,
    ActionSheetIOS,
    Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
    getFinanceCategoriesSnapshot,
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
import { useTenantContext } from '@/context/TenantContext';

interface FinanceSetupDetailPaneProps {
    moduleId: FinanceSetupModule;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export function FinanceSetupDetailPane({
    moduleId,
    isDark,
    textColor,
    subtextColor,
}: FinanceSetupDetailPaneProps) {
    const { updateDocumentRules } = useFinance();
    const { activeTenant } = useTenantContext();
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

    // State
    const [saveError, setSaveError] = useState('');
    const [generalSettings, setGeneralSettings] = useState<FinanceGeneralSettings>(DEFAULT_FINANCE_GENERAL_SETTINGS);
    const [documentRules, setDocumentRules] = useState<FinanceDocumentRulesSettings>(DEFAULT_FINANCE_DOCUMENT_RULES);
    const [categories, setCategories] = useState<FinanceCategory[]>(getFinanceCategoriesSnapshot);
    const [expenseTypes, setExpenseTypes] = useState<FinanceExpenseType[]>(DEFAULT_FINANCE_EXPENSE_TYPES_LIST);
    const [taxRules, setTaxRules] = useState<FinanceTaxRule[]>(DEFAULT_FINANCE_TAX_RULES);
    const [accounts, setAccounts] = useState<FinanceAccount[]>(DEFAULT_FINANCE_ACCOUNTS);
    const [paymentTerms, setPaymentTerms] = useState<FinancePaymentTerm[]>(DEFAULT_FINANCE_PAYMENT_TERMS);
    const [paymentCycles, setPaymentCycles] = useState<FinancePaymentCycle[]>(DEFAULT_FINANCE_PAYMENT_CYCLES);
    const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);
    const [approvalSettings, setApprovalSettings] = useState<FinanceApprovalMatrixSettings>(DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS);
    const [notificationSettings, setNotificationSettings] = useState<FinanceNotificationRulesSettings>(DEFAULT_FINANCE_NOTIFICATION_SETTINGS);
    const [orgDepartments, setOrgDepartments] = useState<OrganizationDepartmentItem[]>([]);
    const [orgPositions, setOrgPositions] = useState<OrganizationPositionItem[]>([]);
    const [orgEmployees, setOrgEmployees] = useState<OrganizationEmployeeItem[]>([]);

    const loadSettings = useCallback(async () => {
        // Load local categories independently of slower organization requests.
        const categoriesRequest = getFinanceCategories().then(data => { setCategories(data); return data; });
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
            categoriesRequest,
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadSettings();
        setRefreshing(false);
    }, [loadSettings]);

    const currentItemConfig = useMemo(() => {
        return (
            FINANCE_SETUP_MENU_ITEMS.find((m) => m.id === moduleId) ||
            FINANCE_SETUP_MENU_ITEMS[0]
        );
    }, [moduleId]);

    // Save Handlers
    const handleUpdateGeneralSettings = async (updated: FinanceGeneralSettings) => {
        try {
            setSaveError('');
            await saveFinanceGeneralSettings(updated);
            setGeneralSettings(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save general settings', e);
        }
    };

    const handleUpdateDocumentRules = async (updated: FinanceDocumentRulesSettings) => {
        try {
            setSaveError('');
            if (updateDocumentRules) {
                await updateDocumentRules(updated);
            } else {
                await saveFinanceDocumentRules(updated, activeTenant?.id);
            }
            setDocumentRules(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save document rules', e);
        }
    };

    const handleUpdateCategories = async (updated: FinanceCategory[]) => {
        try {
            setSaveError('');
            await saveFinanceCategories(updated);
            setCategories(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save categories', e);
        }
    };

    const handleUpdateExpenseTypes = async (updated: FinanceExpenseType[]) => {
        try {
            setSaveError('');
            await saveFinanceExpenseTypes(updated);
            setExpenseTypes(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save expense types', e);
        }
    };

    const handleUpdateTaxRules = async (updated: FinanceTaxRule[]) => {
        try {
            setSaveError('');
            await saveFinanceTaxRules(updated);
            setTaxRules(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save tax rules', e);
        }
    };

    const handleUpdateAccounts = async (updated: FinanceAccount[]) => {
        try {
            setSaveError('');
            await saveFinanceAccounts(updated);
            setAccounts(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save accounts', e);
        }
    };

    const handleUpdatePaymentTerms = async (updated: FinancePaymentTerm[]) => {
        try {
            setSaveError('');
            await saveFinancePaymentTerms(updated);
            setPaymentTerms(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save payment terms', e);
        }
    };

    const handleUpdatePaymentCycles = async (updated: FinancePaymentCycle[]) => {
        try {
            setSaveError('');
            await saveFinancePaymentCycles(updated);
            setPaymentCycles(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save payment cycles', e);
        }
    };

    const handleUpdateBankAccounts = async (updated: FinanceBankAccount[]) => {
        try {
            setSaveError('');
            await saveFinanceBankAccounts(updated);
            setBankAccounts(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save bank accounts', e);
        }
    };

    const handleUpdateApprovalSettings = async (updated: FinanceApprovalMatrixSettings) => {
        try {
            setSaveError('');
            await saveFinanceApprovalMatrixSettings(updated);
            setApprovalSettings(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save approval settings', e);
        }
    };

    const handleUpdateFieldRules = async (updated: FinanceFieldRulesSettings) => {
        try {
            setSaveError('');
            await saveFinanceFieldRules(updated);
            setFieldRules(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save field rules', e);
        }
    };

    const handleResetAllFieldRules = async () => {
        const defaults = getDefaultFieldRulesMap();
        setFieldRules(defaults);
        try {
            await saveFinanceFieldRules(defaults);
        } catch (e) {
            console.error('Failed to reset field rules', e);
        }
    };

    const handleUpdateNotificationSettings = async (updated: FinanceNotificationRulesSettings) => {
        try {
            setSaveError('');
            await saveFinanceNotificationRules(updated);
            setNotificationSettings(updated);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Settings could not be saved.');
            console.error('Failed to save notification settings', e);
        }
    };

    // Header Toolbar Actions
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (moduleId === 'transaction_categories') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Resource Mapping',
                    onPress: () => setIsCategoryGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Category',
                    onPress: () => setIsAddCategorySheetOpen(true),
                },
            ];
        }
        if (moduleId === 'expense_types') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Expense Types',
                    onPress: () => setIsExpenseTypeGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Expense Type',
                    onPress: () => setIsAddExpenseTypeSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'tax_rules') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Tax Rules',
                    onPress: () => setIsTaxRulesGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Tax Rule',
                    onPress: () => setIsAddTaxRuleSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'accounts') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Accounts',
                    onPress: () => setIsAccountsGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Account',
                    onPress: () => setIsAddAccountSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'payment_terms') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Payment Terms',
                    onPress: () => setIsPaymentTermsGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Payment Term',
                    onPress: () => setIsAddPaymentTermSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'payment_cycles') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Payment Cycles',
                    onPress: () => setIsPaymentCyclesGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Payment Cycle',
                    onPress: () => setIsAddPaymentCycleSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'bank_accounts') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Bank Accounts',
                    onPress: () => setIsBankAccountsGuideSheetOpen(true),
                },
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Bank Account',
                    onPress: () => setIsAddBankAccountSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'approval_matrix') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Approval Matrix',
                    onPress: () => setIsApprovalMatrixGuideSheetOpen(true),
                },
            ];
        }
        if (moduleId === 'field_requirements') {
            return [
                {
                    id: 'info',
                    icon: 'information-circle-outline',
                    image: 'info.circle',
                    title: 'About Field Rules',
                    onPress: () => setIsFieldRulesGuideSheetOpen(true),
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
        if (moduleId === 'audit_logs') {
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
                                        await Share.share({ title: 'Finance Audit Log Export (CSV)', message: placeholder });
                                    } else if (buttonIndex === 2) {
                                        await Share.share({ title: 'Finance Audit Log Export (JSON)', message: placeholder });
                                    } else if (buttonIndex === 3) {
                                        await Share.share({ title: 'Finance Audit Log Summary', message: placeholder });
                                    }
                                }
                            );
                        } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await Share.share({ title: 'Finance Audit Log Export (CSV)', message: 'No audit log entries to export with current filters.' });
                        }
                    },
                },
            ];
        }
        return [];
    }, [moduleId, isDark, textColor]);

    const renderModuleBody = () => {
        switch (moduleId) {
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
                        onShowToast={() => {}}
                    />
                );
            case 'expense_types':
                return (
                    <FinanceExpenseTypesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        expenseTypes={expenseTypes}
                        accounts={accounts}
                        taxRules={taxRules}
                        onUpdateExpenseTypes={handleUpdateExpenseTypes}
                        isAddSheetOpen={isAddExpenseTypeSheetOpen}
                        onCloseAddSheet={() => setIsAddExpenseTypeSheetOpen(false)}
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
                        onShowToast={() => {}}
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
        <View style={[styles.root, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* Top Pane Header */}
            <View style={styles.topHeader}>
                <View style={styles.headerTitleCol}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>
                        {currentItemConfig.title}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: subtextColor }]} numberOfLines={1}>
                        {currentItemConfig.subtitle}
                    </Text>
                </View>
                {toolbarActions.length > 0 && (
                    <HeaderToolbar
                        key={`pane-toolbar-${moduleId}`}
                        actions={toolbarActions}
                        isDark={isDark}
                        textColor={textColor}
                        maxDirectActions={2}
                        primaryActionBgColor="#159957"
                        primaryActionTextColor="#FFFFFF"
                        primaryActionShadow={false}
                    />
                )}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#159957" />
                }
            >
                {!!saveError && <Text accessibilityRole="alert" style={{ color: '#FF453A', fontSize: 13, marginBottom: 12 }}>{saveError}</Text>}
                {renderModuleBody()}
            </ScrollView>

            {/* Guide Sheets & Modals */}
            <FinanceExpenseTypesGuideSheet
                visible={isExpenseTypeGuideSheetOpen}
                onClose={() => setIsExpenseTypeGuideSheetOpen(false)}
            />
            <FinanceTaxRulesGuideSheet
                visible={isTaxRulesGuideSheetOpen}
                onClose={() => setIsTaxRulesGuideSheetOpen(false)}
            />
            <FinanceAccountsGuideSheet
                visible={isAccountsGuideSheetOpen}
                onClose={() => setIsAccountsGuideSheetOpen(false)}
            />
            <FinancePaymentTermsGuideSheet
                visible={isPaymentTermsGuideSheetOpen}
                onClose={() => setIsPaymentTermsGuideSheetOpen(false)}
            />
            <FinancePaymentCyclesGuideSheet
                visible={isPaymentCyclesGuideSheetOpen}
                onClose={() => setIsPaymentCyclesGuideSheetOpen(false)}
            />
            <FinanceBankAccountsGuideSheet
                visible={isBankAccountsGuideSheetOpen}
                onClose={() => setIsBankAccountsGuideSheetOpen(false)}
            />
            <FinanceApprovalMatrixGuideSheet
                visible={isApprovalMatrixGuideSheetOpen}
                onClose={() => setIsApprovalMatrixGuideSheetOpen(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        height: '100%',
        overflow: 'hidden',
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 0,
    },
    headerTitleCol: {
        flex: 1,
        gap: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 60,
        paddingHorizontal: 24,
        maxWidth: 840,
        width: '100%',
        alignSelf: 'center',
    },
});
