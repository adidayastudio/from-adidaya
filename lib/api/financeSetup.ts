import { importAdidayaTransactionCategories } from '@/lib/financeTransactionCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export type RoundingMethod = 'standard' | 'down' | 'up' | 'none';

export interface CurrencyOption {
    code: string;
    name: string;
    symbol: string;
    display: string;
}

export interface TimezoneOption {
    id: string; // e.g. 'Asia/Jakarta'
    label: string; // e.g. 'Asia/Jakarta (GMT+7)'
    region: string; // e.g. 'Western Indonesia Time (WIB)'
    gmtOffset: string; // 'GMT+7'
}

export interface FinanceGeneralSettings {
    baseCurrency: string; // e.g. 'IDR'
    currencyCode: string; // 'IDR'
    currencyName: string; // 'Indonesian Rupiah'
    currencySymbol: string; // 'Rp'
    decimalPrecision: number; // 0, 1, 2, 3, 4
    roundingMethod: RoundingMethod;
    timezone: string; // 'Asia/Jakarta'
    timezoneLabel: string; // 'Asia/Jakarta (GMT+7)'
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', display: 'IDR — Indonesian Rupiah (Rp)' },
    { code: 'USD', name: 'US Dollar', symbol: '$', display: 'USD — US Dollar ($)' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', display: 'SGD — Singapore Dollar (S$)' },
    { code: 'EUR', name: 'Euro', symbol: '€', display: 'EUR — Euro (€)' },
    { code: 'GBP', name: 'British Pound', symbol: '£', display: 'GBP — British Pound (£)' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', display: 'JPY — Japanese Yen (¥)' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', display: 'AUD — Australian Dollar (A$)' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', display: 'MYR — Malaysian Ringgit (RM)' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', display: 'THB — Thai Baht (฿)' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', display: 'CNY — Chinese Yuan (¥)' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', display: 'PHP — Philippine Peso (₱)' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', display: 'INR — Indian Rupee (₹)' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', display: 'AED — UAE Dirham (AED)' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', display: 'SAR — Saudi Riyal (SAR)' },
];

export const DECIMAL_PRECISION_OPTIONS = [
    { value: 0, label: '0 decimals', description: 'Whole numbers only (e.g. 12,346)' },
    { value: 1, label: '1 decimal', description: 'One decimal place (e.g. 12,345.7)' },
    { value: 2, label: '2 decimals', description: 'Standard financial format (e.g. 12,345.67)' },
    { value: 3, label: '3 decimals', description: 'High precision rates (e.g. 12,345.670)' },
    { value: 4, label: '4 decimals', description: 'Extended precision for exchange rates (e.g. 12,345.6700)' },
];

export const ROUNDING_METHOD_OPTIONS: Array<{
    value: RoundingMethod;
    title: string;
    description: string;
}> = [
    {
        value: 'standard',
        title: 'Standard Rounding',
        description: 'Round to the nearest value.',
    },
    {
        value: 'down',
        title: 'Round Down',
        description: 'Always round toward the lower value.',
    },
    {
        value: 'up',
        title: 'Round Up',
        description: 'Always round toward the higher value.',
    },
    {
        value: 'none',
        title: 'No Rounding',
        description: 'Keep the original value where supported.',
    },
];

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
    { id: 'Asia/Jakarta', label: 'Asia/Jakarta (GMT+7)', region: 'Western Indonesia (WIB)', gmtOffset: 'GMT+7' },
    { id: 'Asia/Makassar', label: 'Asia/Makassar (GMT+8)', region: 'Central Indonesia (WITA)', gmtOffset: 'GMT+8' },
    { id: 'Asia/Jayapura', label: 'Asia/Jayapura (GMT+9)', region: 'Eastern Indonesia (WIT)', gmtOffset: 'GMT+9' },
    { id: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)', region: 'Singapore / Malaysia (SGT)', gmtOffset: 'GMT+8' },
    { id: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)', region: 'Indochina Time (ICT)', gmtOffset: 'GMT+7' },
    { id: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)', region: 'Japan Standard Time (JST)', gmtOffset: 'GMT+9' },
    { id: 'Asia/Seoul', label: 'Asia/Seoul (GMT+9)', region: 'Korea Standard Time (KST)', gmtOffset: 'GMT+9' },
    { id: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (GMT+8)', region: 'Hong Kong (HKT)', gmtOffset: 'GMT+8' },
    { id: 'Europe/London', label: 'Europe/London (GMT+0)', region: 'United Kingdom (GMT/BST)', gmtOffset: 'GMT+0' },
    { id: 'Europe/Paris', label: 'Europe/Paris (GMT+1)', region: 'Central European Time (CET)', gmtOffset: 'GMT+1' },
    { id: 'America/New_York', label: 'America/New_York (GMT-5)', region: 'Eastern Time (ET)', gmtOffset: 'GMT-5' },
    { id: 'America/Chicago', label: 'America/Chicago (GMT-6)', region: 'Central Time (CT)', gmtOffset: 'GMT-6' },
    { id: 'America/Denver', label: 'America/Denver (GMT-7)', region: 'Mountain Time (MT)', gmtOffset: 'GMT-7' },
    { id: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)', region: 'Pacific Time (PT)', gmtOffset: 'GMT-8' },
    { id: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10)', region: 'Australian Eastern Time (AEST)', gmtOffset: 'GMT+10' },
    { id: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)', region: 'Gulf Standard Time (GST)', gmtOffset: 'GMT+4' },
    { id: 'Asia/Riyadh', label: 'Asia/Riyadh (GMT+3)', region: 'Arabia Standard Time (AST)', gmtOffset: 'GMT+3' },
    { id: 'UTC', label: 'UTC (GMT+0)', region: 'Coordinated Universal Time', gmtOffset: 'GMT+0' },
];

export const DEFAULT_FINANCE_GENERAL_SETTINGS: FinanceGeneralSettings = {
    baseCurrency: 'IDR',
    currencyCode: 'IDR',
    currencyName: 'Indonesian Rupiah',
    currencySymbol: 'Rp',
    decimalPrecision: 2,
    roundingMethod: 'standard',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'Asia/Jakarta (GMT+7)',
};

const FINANCE_GENERAL_SETTINGS_KEY = 'forma_finance_general_settings';

export async function getFinanceGeneralSettings(): Promise<FinanceGeneralSettings> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_GENERAL_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_FINANCE_GENERAL_SETTINGS,
                ...parsed,
            };
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load general settings', e);
    }
    return DEFAULT_FINANCE_GENERAL_SETTINGS;
}

export async function saveFinanceGeneralSettings(settings: FinanceGeneralSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_GENERAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save general settings', e);
        throw e;
    }
}

/**
 * Applies decimal precision and rounding method to a numeric value
 */
export function calculateFormattedAmount(
    amount: number,
    symbol: string,
    precision: number,
    roundingMethod: RoundingMethod
): string {
    const factor = Math.pow(10, precision);
    let roundedValue = amount;

    if (roundingMethod === 'standard') {
        roundedValue = Math.round(amount * factor) / factor;
    } else if (roundingMethod === 'down') {
        roundedValue = Math.floor(amount * factor) / factor;
    } else if (roundingMethod === 'up') {
        roundedValue = Math.ceil(amount * factor) / factor;
    } else if (roundingMethod === 'none') {
        roundedValue = amount;
    }

    let formatted: string;
    if (roundingMethod === 'none') {
        const str = String(amount);
        const parts = str.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts[1] ? `${integerPart}.${parts[1]}` : integerPart;
    } else {
        const parts = roundedValue.toFixed(precision).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = precision > 0 && parts[1] !== undefined
            ? `${integerPart}.${parts[1]}`
            : integerPart;
    }

    if (symbol) {
        return `${symbol} ${formatted}`;
    }
    return formatted;
}

// ============================================================================
// DOCUMENT RULES (3-Level Workflow Architecture)
// ============================================================================

export type SequenceScope = 'global' | 'contextual' | 'reference' | 'project' | 'department';
export type SequenceReset = 'never' | 'monthly' | 'yearly';
export type DocumentLevelType = 'request' | 'consolidation' | 'payment';

export interface DocumentLevelConfig {
    id: DocumentLevelType;
    levelNumber: 1 | 2 | 3;
    systemLevel: 'Request' | 'Consolidation' | 'Payment';
    recommendedName: string;
    recommendedCode: string;
    customName: string;
    customCode: string;
    enabled: boolean;
    sequenceLength: number;
    sequenceScope: SequenceScope;
    sequenceReset: SequenceReset;
}

export interface DocumentWorkflowConfig {
    workflowType: 'purchasing' | 'reimbursement';
    title: string;
    supportingText: string;
    levels: {
        request: DocumentLevelConfig;
        consolidation: DocumentLevelConfig;
        payment: DocumentLevelConfig;
    };
}

export interface FinanceDocumentRulesSettings {
    purchasing: DocumentWorkflowConfig;
    reimbursement: DocumentWorkflowConfig;
}

export const SEQUENCE_RESET_OPTIONS: Array<{
    value: SequenceReset;
    label: string;
    description: string;
}> = [
    {
        value: 'never',
        label: 'Never',
        description: 'Sequence continues incrementing indefinitely without resetting.',
    },
    {
        value: 'monthly',
        label: 'Monthly',
        description: 'Restart sequence from 1 at the beginning of each calendar month.',
    },
    {
        value: 'yearly',
        label: 'Yearly',
        description: 'Restart sequence from 1 on the 1st of January every year.',
    },
];

export const SEQUENCE_LENGTH_OPTIONS = [
    { value: 3, label: '3 Digits', preview: '001' },
    { value: 4, label: '4 Digits', preview: '0001' },
    { value: 5, label: '5 Digits', preview: '00001' },
    { value: 6, label: '6 Digits', preview: '000001' },
];

export const DEFAULT_FINANCE_DOCUMENT_RULES: FinanceDocumentRulesSettings = {
    purchasing: {
        workflowType: 'purchasing',
        title: 'Purchasing',
        supportingText: 'Configure documents used for purchasing transactions.',
        levels: {
            request: {
                id: 'request',
                levelNumber: 1,
                systemLevel: 'Request',
                recommendedName: 'Purchase Request',
                recommendedCode: 'PR',
                customName: 'Purchase Request',
                customCode: 'PR',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
            consolidation: {
                id: 'consolidation',
                levelNumber: 2,
                systemLevel: 'Consolidation',
                recommendedName: 'Purchase Order',
                recommendedCode: 'PO',
                customName: 'Purchase Order',
                customCode: 'PO',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
            payment: {
                id: 'payment',
                levelNumber: 3,
                systemLevel: 'Payment',
                recommendedName: 'Purchase Payment',
                recommendedCode: 'PP',
                customName: 'Purchase Payment',
                customCode: 'PP',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
        },
    },
    reimbursement: {
        workflowType: 'reimbursement',
        title: 'Reimbursement',
        supportingText: 'Configure documents used for employee reimbursement transactions.',
        levels: {
            request: {
                id: 'request',
                levelNumber: 1,
                systemLevel: 'Request',
                recommendedName: 'Reimbursement Request',
                recommendedCode: 'RR',
                customName: 'Reimbursement Request',
                customCode: 'RR',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
            consolidation: {
                id: 'consolidation',
                levelNumber: 2,
                systemLevel: 'Consolidation',
                recommendedName: 'Reimbursement Batch',
                recommendedCode: 'RB',
                customName: 'Reimbursement Batch',
                customCode: 'RB',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
            payment: {
                id: 'payment',
                levelNumber: 3,
                systemLevel: 'Payment',
                recommendedName: 'Reimbursement Payment',
                recommendedCode: 'RP',
                customName: 'Reimbursement Payment',
                customCode: 'RP',
                enabled: true,
                sequenceLength: 5,
                sequenceScope: 'global',
                sequenceReset: 'yearly',
            },
        },
    },
};

const FINANCE_DOCUMENT_RULES_KEY = 'forma_finance_document_rules_v2';

export function generateDocumentNumberPreview(
    code: string,
    sequenceLength: number = 5,
    scope: SequenceScope = 'global',
    reset: SequenceReset = 'yearly',
    orgPrefix: string = 'ADY',
    parentRefNumber: string = '00001'
): string {
    const cleanCode = (code || 'PR').trim().toUpperCase().slice(0, 3);
    const len = Math.max(1, Math.min(10, sequenceLength || 5));
    const seqNum = '1'.padStart(len, '0');

    const now = new Date();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[now.getMonth()] || 'IX';
    const year = now.getFullYear();

    if (scope === 'reference') {
        return `${orgPrefix}/FIN/${parentRefNumber}/${cleanCode}-${seqNum}/${romanMonth}/${year}`;
    } else if (scope === 'contextual' || scope === 'project' || scope === 'department') {
        return `${orgPrefix}/FIN/PRJ/${cleanCode}-${seqNum}/${romanMonth}/${year}`;
    } else {
        return `${orgPrefix}/FIN/${cleanCode}-${seqNum}/${romanMonth}/${year}`;
    }
}

export function generateDocumentNumberShortPreview(
    code: string,
    sequenceLength: number = 5,
    scope: SequenceScope = 'global',
    parentRefNumber: string = '00001'
): string {
    const cleanCode = (code || 'PR').trim().toUpperCase().slice(0, 3);
    const len = Math.max(1, Math.min(10, sequenceLength || 5));
    const seqNum = '1'.padStart(len, '0');

    if (scope === 'reference') {
        const trimmedRef = parentRefNumber.replace(/^0+/, '') || '1';
        return `${trimmedRef}/${cleanCode}-${seqNum}`;
    } else if (scope === 'contextual' || scope === 'project' || scope === 'department') {
        return `PRJ/${cleanCode}-${seqNum}`;
    } else {
        return `${cleanCode}-${seqNum}`;
    }
}

async function resolveActiveTenantId(tenantId?: string): Promise<string | null> {
    if (tenantId) return tenantId;
    try {
        const stored = await AsyncStorage.getItem('forma:active_tenant_id');
        if (stored) return stored;
        const storedTenant = await AsyncStorage.getItem('forma:active_tenant');
        if (storedTenant) {
            const parsed = JSON.parse(storedTenant);
            if (parsed?.id) return parsed.id;
        }
    } catch {
        // noop
    }
    return null;
}

let cachedDocumentRules: FinanceDocumentRulesSettings | null = null;

function normalizeDocumentRules(parsed: any): FinanceDocumentRulesSettings {
    if (!parsed) return DEFAULT_FINANCE_DOCUMENT_RULES;
    return {
        ...DEFAULT_FINANCE_DOCUMENT_RULES,
        ...parsed,
        purchasing: {
            ...DEFAULT_FINANCE_DOCUMENT_RULES.purchasing,
            ...parsed.purchasing,
            title: 'Purchasing',
            levels: {
                request: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.purchasing.levels.request,
                    ...(parsed.purchasing?.levels?.request || {}),
                },
                consolidation: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.purchasing.levels.consolidation,
                    ...(parsed.purchasing?.levels?.consolidation || {}),
                    enabled: parsed.purchasing?.levels?.consolidation?.enabled !== undefined
                        ? (parsed.purchasing.levels.consolidation.enabled === true || parsed.purchasing.levels.consolidation.enabled === 'true')
                        : true,
                },
                payment: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.purchasing.levels.payment,
                    ...(parsed.purchasing?.levels?.payment || {}),
                },
            },
        },
        reimbursement: {
            ...DEFAULT_FINANCE_DOCUMENT_RULES.reimbursement,
            ...parsed.reimbursement,
            title: 'Reimbursement',
            levels: {
                request: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.reimbursement.levels.request,
                    ...(parsed.reimbursement?.levels?.request || {}),
                },
                consolidation: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.reimbursement.levels.consolidation,
                    ...(parsed.reimbursement?.levels?.consolidation || {}),
                    enabled: parsed.reimbursement?.levels?.consolidation?.enabled !== undefined
                        ? (parsed.reimbursement.levels.consolidation.enabled === true || parsed.reimbursement.levels.consolidation.enabled === 'true')
                        : true,
                },
                payment: {
                    ...DEFAULT_FINANCE_DOCUMENT_RULES.reimbursement.levels.payment,
                    ...(parsed.reimbursement?.levels?.payment || {}),
                },
            },
        },
    };
}

export async function getFinanceDocumentRules(tenantId?: string): Promise<FinanceDocumentRulesSettings> {
    try {
        const resolvedTenantId = await resolveActiveTenantId(tenantId);
        const storageKey = resolvedTenantId
            ? `${FINANCE_DOCUMENT_RULES_KEY}_${resolvedTenantId}`
            : FINANCE_DOCUMENT_RULES_KEY;

        // 1. Read Local Storage first
        const rawLocal = (await AsyncStorage.getItem(storageKey)) || (await AsyncStorage.getItem(FINANCE_DOCUMENT_RULES_KEY));
        let localRules: any = null;
        if (rawLocal) {
            try {
                localRules = JSON.parse(rawLocal);
            } catch {}
        }
        const localUpdatedAt = Number(localRules?._updated_at || 0);

        // 2. Try reading from Database (chat_channels tenant config)
        if (resolvedTenantId) {
            try {
                const configId = `tenant-finance-config-${resolvedTenantId}`;
                const { data, error } = await supabase
                    .from('chat_channels')
                    .select('meta')
                    .eq('id', configId)
                    .maybeSingle();

                if (!error && data?.meta?.document_rules) {
                    const cloudRules = data.meta.document_rules as any;
                    const cloudUpdatedAt = Number(cloudRules?._updated_at || 0);

                    // If local is newer than cloud, do NOT overwrite local with stale cloud data.
                    // Instead, push local to cloud in the background.
                    if (localRules && localUpdatedAt > cloudUpdatedAt) {
                        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedTenantId);
                        supabase.from('chat_channels').upsert({
                            id: configId,
                            code: `#cfg-fin-${resolvedTenantId.slice(0, 6)}`,
                            name: 'Tenant Finance Settings',
                            category: 'general',
                            tenant_id: isUuid ? resolvedTenantId : null,
                            meta: { ...(data?.meta || {}), document_rules: localRules },
                            is_archived: true,
                        }).then(() => {}, () => {});
                        const normalized = normalizeDocumentRules(localRules);
                        cachedDocumentRules = normalized;
                        return normalized;
                    }

                    const normalized = normalizeDocumentRules(cloudRules);
                    cachedDocumentRules = normalized;
                    await AsyncStorage.setItem(storageKey, JSON.stringify(cloudRules));
                    await AsyncStorage.setItem(FINANCE_DOCUMENT_RULES_KEY, JSON.stringify(cloudRules));
                    return normalized;
                }
            } catch (cloudErr) {
                console.warn('[FinanceSetup] Cloud sync read failed for document_rules:', cloudErr);
            }
        }

        if (localRules) {
            const normalized = normalizeDocumentRules(localRules);
            cachedDocumentRules = normalized;
            return normalized;
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load document rules', e);
    }
    return cachedDocumentRules || DEFAULT_FINANCE_DOCUMENT_RULES;
}

export async function saveFinanceDocumentRules(rules: FinanceDocumentRulesSettings, tenantId?: string): Promise<void> {
    try {
        const resolvedTenantId = await resolveActiveTenantId(tenantId);
        const storageKey = resolvedTenantId
            ? `${FINANCE_DOCUMENT_RULES_KEY}_${resolvedTenantId}`
            : FINANCE_DOCUMENT_RULES_KEY;

        const rulesWithTime = {
            ...rules,
            _updated_at: Date.now(),
        };

        cachedDocumentRules = normalizeDocumentRules(rulesWithTime);

        // 1. Save locally
        await AsyncStorage.setItem(storageKey, JSON.stringify(rulesWithTime));
        await AsyncStorage.setItem(FINANCE_DOCUMENT_RULES_KEY, JSON.stringify(rulesWithTime));

        // 2. Persist to Supabase Database
        if (resolvedTenantId) {
            try {
                const configId = `tenant-finance-config-${resolvedTenantId}`;
                const { data } = await supabase
                    .from('chat_channels')
                    .select('meta')
                    .eq('id', configId)
                    .maybeSingle();

                const currentMeta = data?.meta || {};
                const updatedMeta = { ...currentMeta, document_rules: rulesWithTime };

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedTenantId);
                const { error: upsertErr } = await supabase.from('chat_channels').upsert({
                    id: configId,
                    code: `#cfg-fin-${resolvedTenantId.slice(0, 6)}`,
                    name: 'Tenant Finance Settings',
                    category: 'general',
                    tenant_id: isUuid ? resolvedTenantId : null,
                    meta: updatedMeta,
                    is_archived: true,
                });

                if (upsertErr) {
                    console.warn('[FinanceSetup] Cloud sync save failed for document_rules:', upsertErr);
                }
            } catch (cloudErr) {
                console.warn('[FinanceSetup] Cloud sync save failed for document_rules:', cloudErr);
            }
        }
    } catch (e) {
        console.error('[FinanceSetup] Failed to save document rules', e);
        throw e;
    }
}

// ============================================================================
// TRANSACTION CATEGORIES & RESOURCE MAPPING
// ============================================================================

export type ResourceTypeOption = 'Material' | 'Tools' | 'Assets' | 'Services' | 'None';

export const RESOURCE_TYPE_OPTIONS: Array<{
    value: ResourceTypeOption;
    label: string;
    description: string;
    icon: string;
}> = [
    {
        value: 'Material',
        label: 'Material',
        description: 'Consumable goods, stock, and project materials.',
        icon: 'shippingbox',
    },
    {
        value: 'Tools',
        label: 'Tools',
        description: 'Reusable tools and operational equipment.',
        icon: 'hammer',
    },
    {
        value: 'Assets',
        label: 'Assets',
        description: 'Long-term organizational assets such as machines, vehicles, and facilities.',
        icon: 'car',
    },
    {
        value: 'Services',
        label: 'Services',
        description: 'External services without a physical inventory item.',
        icon: 'briefcase',
    },
    {
        value: 'None',
        label: 'None',
        description: 'No linked resource type for general operational entries.',
        icon: 'minus.circle',
    },
];

export type SubcategoryExpenseTypeOption = 'Inherit from Category' | string;
export type SubcategoryResourceTypeOption = 'Inherit from Category' | ResourceTypeOption;

export interface FinanceSubcategory {
    legacyValues?: Partial<Record<'purchasing' | 'reimbursement', string>>;
    id: string;
    code: string;
    name: string;
    defaultExpenseType: SubcategoryExpenseTypeOption;
    resourceMapping: SubcategoryResourceTypeOption;
    isArchived?: boolean;
}

export interface FinanceCategory {
    legacyValues?: Partial<Record<'purchasing' | 'reimbursement', string>>;
    id: string;
    code: string;
    name: string;
    defaultExpenseType: string;
    resourceMapping: ResourceTypeOption;
    subcategories: FinanceSubcategory[];
    isArchived?: boolean;
}

export interface FinanceExpenseType {
    id: string;
    code: string;
    name: string;
    tax?: string;
    defaultTaxRule?: string;
    defaultAccount?: string;
    active: boolean;
}

export type TaxType = 'vat' | 'withholding' | 'final' | 'exempt' | 'custom';

export interface FinanceTaxRule {
    id: string;
    code: string;
    name: string;
    rate: number;
    taxType: TaxType;
    description?: string;
    defaultAccount?: string;
    active: boolean;
}

export interface TaxRuleOption {
    id: string;
    label: string;
    code: string;
    description: string;
}

export const TAX_TYPE_OPTIONS: Array<{ value: TaxType; label: string }> = [
    { value: 'vat', label: 'VAT/PPN (Value Added Tax)' },
    { value: 'withholding', label: 'WHT/PPh (Withholding Tax)' },
    { value: 'final', label: 'Final Tax/PPh Final (Construction & Rental)' },
    { value: 'exempt', label: 'Tax Exempt/Non-Taxable' },
    { value: 'custom', label: 'Custom/Other Tax' },
];

export const TAX_RULE_OPTIONS: TaxRuleOption[] = [
    { id: 'none', label: 'None', code: 'NONE', description: 'No tax calculation applied' },
    { id: 'ppn_11', label: 'PPN 11%', code: 'PPN11', description: 'Value Added Tax (11%)' },
    { id: 'ppn_12', label: 'PPN 12%', code: 'PPN12', description: 'Value Added Tax (12%)' },
    { id: 'pph_23', label: 'PPh 23 (2%)', code: 'PPH23', description: 'Withholding Tax on Services (2%)' },
    { id: 'pph_21', label: 'PPh 21 (5%)', code: 'PPH21', description: 'Individual Income Tax (5%)' },
    { id: 'pph_4_2', label: 'PPh Final 4(2) (1.75%)', code: 'PPH42', description: 'Final Construction Services Tax' },
    { id: 'non_taxable', label: 'Non-Taxable', code: 'NON', description: 'Tax-exempt expense classification' },
];

export const DEFAULT_FINANCE_TAX_RULES: FinanceTaxRule[] = [
    {
        id: 'tax_1',
        code: 'PPN11',
        name: 'PPN 11%',
        rate: 11,
        taxType: 'vat',
        description: 'Value Added Tax (Standard Rate 11%)',
        defaultAccount: '2-1100 PPN Masukan',
        active: true,
    },
    {
        id: 'tax_2',
        code: 'PPN12',
        name: 'PPN 12%',
        rate: 12,
        taxType: 'vat',
        description: 'Value Added Tax (Upcoming Rate 12%)',
        defaultAccount: '2-1100 PPN Masukan',
        active: true,
    },
    {
        id: 'tax_3',
        code: 'PPH23',
        name: 'PPh 23 (2%)',
        rate: 2,
        taxType: 'withholding',
        description: 'Withholding Tax on Vendor Services & Rentals (2%)',
        defaultAccount: '2-1200 PPh 23 Terutang',
        active: true,
    },
    {
        id: 'tax_4',
        code: 'PPH21',
        name: 'PPh 21 (5%)',
        rate: 5,
        taxType: 'withholding',
        description: 'Individual Income Tax Withholding Tier 1 (5%)',
        defaultAccount: '2-1210 PPh 21 Terutang',
        active: true,
    },
    {
        id: 'tax_5',
        code: 'PPH42',
        name: 'PPh Final 4(2) (1.75%)',
        rate: 1.75,
        taxType: 'final',
        description: 'Final Construction Implementation Services Tax (1.75%)',
        defaultAccount: '2-1220 PPh Final 4(2) Terutang',
        active: true,
    },
    {
        id: 'tax_6',
        code: 'NON',
        name: 'Non-Taxable',
        rate: 0,
        taxType: 'exempt',
        description: 'Tax-exempt classification for non-tax transactions',
        defaultAccount: 'None',
        active: true,
    },
];

export const TAX_ACCOUNT_OPTIONS: AccountOption[] = [
    { id: 'none', label: 'None', code: 'NONE', description: 'No tax account assigned' },
    { id: '2-1100', label: '2-1100 PPN Masukan', code: '2-1100', description: 'Input VAT/Prepaid Tax' },
    { id: '2-1101', label: '2-1101 PPN Keluaran', code: '2-1101', description: 'Output VAT/Collected Tax' },
    { id: '2-1200', label: '2-1200 PPh 23 Terutang', code: '2-1200', description: 'Withholding Tax Payable (PPh 23)' },
    { id: '2-1210', label: '2-1210 PPh 21 Terutang', code: '2-1210', description: 'Income Tax Payable (PPh 21)' },
    { id: '2-1220', label: '2-1220 PPh Final 4(2) Terutang', code: '2-1220', description: 'Final Tax Payable (PPh 4(2))' },
];

export type AccountType =
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'cost_of_sales'
    | 'expense'
    | 'marketing'
    | 'other_income'
    | 'other_expense'
    | 'other';

export interface FinanceAccount {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    description?: string;
    active: boolean;
}

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string; group: string }> = [
    { value: 'asset', label: '1 · Assets (Aset/Kas)', group: '1' },
    { value: 'liability', label: '2 · Liabilities (Kewajiban/Utang/Pajak)', group: '2' },
    { value: 'equity', label: '3 · Equity (Modal/Ekuitas)', group: '3' },
    { value: 'revenue', label: '4 · Revenue (Pendapatan/Penjualan)', group: '4' },
    { value: 'cost_of_sales', label: '5 · Cost of Sales (Beban Pokok Proyek)', group: '5' },
    { value: 'expense', label: '6 · Operating Expense (Beban Operasional)', group: '6' },
    { value: 'marketing', label: '7 · Selling & Marketing (Beban Pemasaran)', group: '7' },
    { value: 'other_income', label: '8 · Other Income (Pendapatan Lain-lain)', group: '8' },
    { value: 'other_expense', label: '9 · Other Expense (Beban Lain/Kustom)', group: '9' },
];

export const DEFAULT_FINANCE_ACCOUNTS: FinanceAccount[] = [
    {
        id: 'acc_5100',
        code: '5-1000',
        name: 'Project Procurement',
        type: 'cost_of_sales',
        description: 'Direct project purchasing & materials',
        active: true,
    },
    {
        id: 'acc_5101',
        code: '5-1001',
        name: 'Direct Material Costs',
        type: 'cost_of_sales',
        description: 'Raw construction and project supplies',
        active: true,
    },
    {
        id: 'acc_5102',
        code: '5-1002',
        name: 'Subcontractor & Vendor Fees',
        type: 'cost_of_sales',
        description: 'External trade and sub-contractor fees',
        active: true,
    },
    {
        id: 'acc_5103',
        code: '5-1003',
        name: 'Heavy Equipment Rental',
        type: 'cost_of_sales',
        description: 'Machinery, crane, and scaffolding rentals',
        active: true,
    },
    {
        id: 'acc_6101',
        code: '6-1001',
        name: 'Office Supplies & Stationary',
        type: 'expense',
        description: 'General administrative and office supplies',
        active: true,
    },
    {
        id: 'acc_6102',
        code: '6-1002',
        name: 'Software & Utilities',
        type: 'expense',
        description: 'Internet, electricity, software subscriptions',
        active: true,
    },
    {
        id: 'acc_6201',
        code: '6-2001',
        name: 'Meals & Per Diem Expense',
        type: 'expense',
        description: 'Daily staff allowances and food expenses',
        active: true,
    },
    {
        id: 'acc_6202',
        code: '6-2002',
        name: 'Travel & Transportation',
        type: 'expense',
        description: 'Fuel, tolls, parking, and transit fares',
        active: true,
    },
    {
        id: 'acc_2100',
        code: '2-1100',
        name: 'PPN Masukan (Input Tax)',
        type: 'liability',
        description: 'Value Added Tax paid on purchases/Prepaid Tax',
        active: true,
    },
    {
        id: 'acc_2101',
        code: '2-1101',
        name: 'PPN Keluaran (Output Tax)',
        type: 'liability',
        description: 'Value Added Tax collected from customers',
        active: true,
    },
    {
        id: 'acc_2200',
        code: '2-1200',
        name: 'PPh 23 Terutang',
        type: 'liability',
        description: 'Withholding Tax Payable on services and rentals',
        active: true,
    },
    {
        id: 'acc_2210',
        code: '2-1210',
        name: 'PPh 21 Terutang',
        type: 'liability',
        description: 'Individual income tax payable withheld from payroll',
        active: true,
    },
    {
        id: 'acc_2220',
        code: '2-1220',
        name: 'PPh Final 4(2) Terutang',
        type: 'liability',
        description: 'Final construction tax payable',
        active: true,
    },
    {
        id: 'acc_1001',
        code: '1-1001',
        name: 'Petty Cash',
        type: 'asset',
        description: 'Cash on hand for operational reimbursements',
        active: true,
    },
    {
        id: 'acc_1002',
        code: '1-1002',
        name: 'Bank Operational Account',
        type: 'asset',
        description: 'Primary corporate checking account',
        active: true,
    },
];

export interface AccountOption {
    id: string;
    label: string;
    code: string;
    description: string;
}

export const ACCOUNT_OPTIONS: AccountOption[] = [
    { id: 'none', label: 'None', code: 'NONE', description: 'No default account assigned' },
    { id: '5-1000', label: '5-1000 Project Procurement', code: '5-1000', description: 'Direct project purchasing & materials' },
    { id: '5-1001', label: '5-1001 Direct Material Costs', code: '5-1001', description: 'Raw construction and project supplies' },
    { id: '5-1002', label: '5-1002 Subcontractor & Vendor Fees', code: '5-1002', description: 'External trade and sub-contractor fees' },
    { id: '5-1003', label: '5-1003 Heavy Equipment Rental', code: '5-1003', description: 'Machinery and scaffolding rentals' },
    { id: '6-1001', label: '6-1001 Office Supplies & Stationary', code: '6-1001', description: 'General administrative supplies' },
    { id: '6-1002', label: '6-1002 Software & Utilities', code: '6-1002', description: 'Internet, electricity, software subscriptions' },
    { id: '6-2001', label: '6-2001 Meals & Per Diem Expense', code: '6-2001', description: 'Daily staff allowances and food expenses' },
    { id: '6-2002', label: '6-2002 Travel & Transportation', code: '6-2002', description: 'Fuel, tolls, parking, and transit fares' },
];

export const DEFAULT_FINANCE_EXPENSE_TYPES_LIST: FinanceExpenseType[] = [
    { id: '1', code: 'MAT', name: 'Direct Material & Supplies', tax: 'PPN 11%', defaultTaxRule: 'PPN 11%', defaultAccount: '5-1001 Direct Material Costs', active: true },
    { id: '2', code: 'SUB', name: 'Vendor / Subcontractor Service', tax: 'PPh 23 (2%)', defaultTaxRule: 'PPh 23 (2%)', defaultAccount: '5-1002 Subcontractor & Vendor Fees', active: true },
    { id: '3', code: 'MLS', name: 'Meals & Per Diem Allowance', tax: 'Non-Taxable', defaultTaxRule: 'Non-Taxable', defaultAccount: '6-2001 Meals & Per Diem Expense', active: true },
    { id: '4', code: 'TRV', name: 'Fuel & Mileage Reimbursement', tax: 'Non-Taxable', defaultTaxRule: 'Non-Taxable', defaultAccount: '6-2002 Travel & Transportation', active: true },
    { id: '5', code: 'PP', name: 'Project Purchase', tax: 'PPN 11%', defaultTaxRule: 'PPN 11%', defaultAccount: '5-1000 Project Procurement', active: true },
    { id: '6', code: 'ADM', name: 'Office Supplies & Admin', tax: 'Non-Taxable', defaultTaxRule: 'Non-Taxable', defaultAccount: '6-1001 Office Supplies & Stationary', active: true },
    { id: '7', code: 'EQP', name: 'Equipment Rental', tax: 'PPh 23 (2%)', defaultTaxRule: 'PPh 23 (2%)', defaultAccount: '5-1003 Heavy Equipment Rental', active: true },
    { id: '8', code: 'UTL', name: 'Utilities & Subscriptions', tax: 'Non-Taxable', defaultTaxRule: 'Non-Taxable', defaultAccount: '6-1002 Software & Utilities', active: true },
];

export const DEFAULT_ACTIVE_EXPENSE_TYPES: string[] = DEFAULT_FINANCE_EXPENSE_TYPES_LIST.map(e => e.name);

const FINANCE_EXPENSE_TYPES_KEY = 'forma_finance_expense_types_v3';

export async function getFinanceExpenseTypes(): Promise<FinanceExpenseType[]> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_EXPENSE_TYPES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, index: number) => {
                    const fallbackDefault = DEFAULT_FINANCE_EXPENSE_TYPES_LIST.find(
                        (d) => d.id === item.id || d.name === item.name || d.code === item.code
                    ) || DEFAULT_FINANCE_EXPENSE_TYPES_LIST[index];

                    return {
                        id: item.id || `exp_${Date.now()}_${index}`,
                        code: item.code || fallbackDefault?.code || `E${index + 1}`,
                        name: item.name || fallbackDefault?.name || '',
                        tax: item.tax || item.defaultTaxRule || fallbackDefault?.defaultTaxRule || 'Non-Taxable',
                        defaultTaxRule: item.defaultTaxRule || item.tax || fallbackDefault?.defaultTaxRule || 'Non-Taxable',
                        defaultAccount: (item.defaultAccount && item.defaultAccount !== 'None')
                            ? item.defaultAccount
                            : (fallbackDefault?.defaultAccount || 'None'),
                        active: item.active !== false,
                    };
                });
            }
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load expense types', e);
    }
    return DEFAULT_FINANCE_EXPENSE_TYPES_LIST;
}

export async function saveFinanceExpenseTypes(types: FinanceExpenseType[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_EXPENSE_TYPES_KEY, JSON.stringify(types));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save expense types', e);
        throw e;
    }
}

const FINANCE_TAX_RULES_KEY = 'forma_finance_tax_rules_v1';

export async function getFinanceTaxRules(): Promise<FinanceTaxRule[]> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_TAX_RULES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, index: number) => {
                    const fallbackDefault = DEFAULT_FINANCE_TAX_RULES.find(
                        (d) => d.id === item.id || d.name === item.name || d.code === item.code
                    ) || DEFAULT_FINANCE_TAX_RULES[index];

                    return {
                        id: item.id || `tax_${Date.now()}_${index}`,
                        code: item.code || fallbackDefault?.code || `T${index + 1}`,
                        name: item.name || fallbackDefault?.name || '',
                        rate: typeof item.rate === 'number' ? item.rate : (fallbackDefault?.rate ?? 0),
                        taxType: (['vat', 'withholding', 'final', 'exempt', 'custom'].includes(item.taxType)
                            ? item.taxType
                            : (fallbackDefault?.taxType || 'vat')) as TaxType,
                        description: item.description || fallbackDefault?.description || '',
                        defaultAccount: (item.defaultAccount && item.defaultAccount !== 'None')
                            ? item.defaultAccount
                            : (fallbackDefault?.defaultAccount || 'None'),
                        active: item.active !== false,
                    };
                });
            }
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load tax rules', e);
    }
    return DEFAULT_FINANCE_TAX_RULES;
}

export async function saveFinanceTaxRules(rules: FinanceTaxRule[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_TAX_RULES_KEY, JSON.stringify(rules));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save tax rules', e);
        throw e;
    }
}

const FINANCE_ACCOUNTS_KEY = 'forma_finance_accounts_v1';

export async function getFinanceAccounts(): Promise<FinanceAccount[]> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_ACCOUNTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, index: number) => {
                    const fallbackDefault = DEFAULT_FINANCE_ACCOUNTS.find(
                        (d) => d.id === item.id || d.name === item.name || d.code === item.code
                    ) || DEFAULT_FINANCE_ACCOUNTS[index];

                    return {
                        id: item.id || `acc_${Date.now()}_${index}`,
                        code: item.code || fallbackDefault?.code || `A${index + 1}`,
                        name: item.name || fallbackDefault?.name || '',
                        type: (['cost_of_sales', 'expense', 'marketing', 'asset', 'liability', 'equity', 'revenue', 'other_income', 'other_expense', 'other'].includes(item.type)
                            ? item.type
                            : (fallbackDefault?.type || 'cost_of_sales')) as AccountType,
                        description: item.description || fallbackDefault?.description || '',
                        active: item.active !== false,
                    };
                });
            }
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load accounts', e);
    }
    return DEFAULT_FINANCE_ACCOUNTS;
}

export async function saveFinanceAccounts(accounts: FinanceAccount[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save accounts', e);
        throw e;
    }
}

export interface FinancePaymentTerm {
    id: string;
    code: string; // e.g. 'COD', 'NET14'
    name: string; // e.g. 'Cash on Delivery (COD)', 'Net 14 Days'
    days: number; // calendar days before payment is due (>= 0)
    isDefault: boolean; // only one can be workspace default
    status: 'active' | 'archived';
    isSystem?: boolean;
    inUse?: boolean; // historical transactions reference
    description?: string;
}

export const PAYMENT_TERM_PRESETS: Array<{
    name: string;
    code: string;
    days: number;
    description: string;
}> = [
    { name: 'Cash on Delivery (COD)', code: 'COD', days: 0, description: 'Due immediately upon receipt' },
    { name: 'Net 7 Days', code: 'NET7', days: 7, description: 'Due in 7 calendar days' },
    { name: 'Net 14 Days', code: 'NET14', days: 14, description: 'Due in 14 calendar days' },
    { name: 'Net 30 Days', code: 'NET30', days: 30, description: 'Due in 30 calendar days' },
    { name: 'Net 45 Days', code: 'NET45', days: 45, description: 'Due in 45 calendar days' },
    { name: 'Net 60 Days', code: 'NET60', days: 60, description: 'Due in 60 calendar days' },
];

export const DEFAULT_FINANCE_PAYMENT_TERMS: FinancePaymentTerm[] = [
    {
        id: 'term_cod',
        code: 'COD',
        name: 'Cash on Delivery (COD)',
        days: 0,
        isDefault: true,
        status: 'active',
        isSystem: true,
        inUse: true,
        description: 'Payment due immediately upon delivery / receipt',
    },
    {
        id: 'term_net7',
        code: 'NET7',
        name: 'Net 7 Days',
        days: 7,
        isDefault: false,
        status: 'active',
        isSystem: true,
        inUse: false,
        description: 'Payment due within 7 calendar days',
    },
    {
        id: 'term_net14',
        code: 'NET14',
        name: 'Net 14 Days',
        days: 14,
        isDefault: false,
        status: 'active',
        isSystem: true,
        inUse: false,
        description: 'Payment due within 14 calendar days',
    },
    {
        id: 'term_net30',
        code: 'NET30',
        name: 'Net 30 Days',
        days: 30,
        isDefault: false,
        status: 'active',
        isSystem: true,
        inUse: false,
        description: 'Payment due within 30 calendar days',
    },
];

const FINANCE_PAYMENT_TERMS_KEY = 'forma_finance_payment_terms_v1';

export async function getFinancePaymentTerms(): Promise<FinancePaymentTerm[]> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_PAYMENT_TERMS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, index: number) => {
                    const fallbackDefault = DEFAULT_FINANCE_PAYMENT_TERMS.find(
                        (d) => d.id === item.id || d.name === item.name || d.code === item.code
                    ) || DEFAULT_FINANCE_PAYMENT_TERMS[index];

                    return {
                        id: item.id || `term_${Date.now()}_${index}`,
                        code: (item.code || fallbackDefault?.code || `TERM${index + 1}`).toUpperCase(),
                        name: item.name || fallbackDefault?.name || '',
                        days: typeof item.days === 'number' ? Math.max(0, item.days) : (fallbackDefault?.days ?? 0),
                        isDefault: !!item.isDefault,
                        status: item.status === 'archived' ? 'archived' : 'active',
                        isSystem: !!item.isSystem || !!fallbackDefault?.isSystem,
                        inUse: !!item.inUse || !!fallbackDefault?.inUse,
                        description: item.description || fallbackDefault?.description || '',
                    };
                });
            }
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load payment terms', e);
    }
    return DEFAULT_FINANCE_PAYMENT_TERMS;
}

export async function saveFinancePaymentTerms(terms: FinancePaymentTerm[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_PAYMENT_TERMS_KEY, JSON.stringify(terms));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save payment terms', e);
        throw e;
    }
}

/**
 * Calculates due date from a base date and payment term days.
 */
export function calculateDueDate(baseDate: Date | string | number, dueDays: number): Date {
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) {
        return new Date();
    }
    d.setDate(d.getDate() + Math.max(0, dueDays));
    return d;
}

/**
 * Returns human-readable label for due days
 */
export function formatDueDaysLabel(days: number): string {
    if (days <= 0) {
        return 'Due immediately';
    }
    if (days === 1) {
        return 'Due in 1 calendar day';
    }
    return `Due in ${days} calendar days`;
}

// ============================================================================
// PAYMENT CYCLES (Disbursement & Batch Scheduling Architecture)
// ============================================================================

export type PaymentCycleFrequency = 'weekly' | 'biweekly' | 'twice_monthly' | 'monthly';
export type CutoffOptionType = 'days_before' | 'specific_day' | 'specific_date' | 'same_day';

export interface FinancePaymentCycle {
    id: string;
    name: string;
    frequency: PaymentCycleFrequency;
    
    // Schedule parameters based on frequency
    dayOfWeek?: string; // 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
    startDate?: string; // Anchor date for Every 2 Weeks (e.g. '2026-09-04')
    firstPaymentDate?: number; // 1..31 (e.g. 1)
    secondPaymentDate?: number; // 1..31 (e.g. 15)
    monthlyPaymentDate?: number; // 1..31 (e.g. 25)
    
    // Cut-off rule
    cutoffType: CutoffOptionType;
    cutoffDaysBefore?: number; // 1, 2, 3, etc.
    cutoffDayOfWeek?: string; // 'Thursday'
    cutoffDate?: number; // 20
    
    status: 'active' | 'inactive';
    isDefault?: boolean;
    inUse?: boolean;
    description?: string;
}

export const PAYMENT_CYCLE_PRESETS: Array<{
    name: string;
    frequency: PaymentCycleFrequency;
    dayOfWeek?: string;
    startDate?: string;
    firstPaymentDate?: number;
    secondPaymentDate?: number;
    monthlyPaymentDate?: number;
    cutoffType: CutoffOptionType;
    cutoffDaysBefore?: number;
    cutoffDayOfWeek?: string;
    cutoffDate?: number;
    description: string;
}> = [
    {
        name: 'Weekly Vendor Settlement',
        frequency: 'weekly',
        dayOfWeek: 'Friday',
        cutoffType: 'specific_day',
        cutoffDayOfWeek: 'Thursday',
        description: 'Every Friday · Cut-off Thursday',
    },
    {
        name: 'Reimbursement Cycle',
        frequency: 'twice_monthly',
        firstPaymentDate: 1,
        secondPaymentDate: 15,
        cutoffType: 'days_before',
        cutoffDaysBefore: 2,
        description: '1st & 15th · Cut-off 2 days before',
    },
    {
        name: 'Monthly Payroll',
        frequency: 'monthly',
        monthlyPaymentDate: 25,
        cutoffType: 'specific_date',
        cutoffDate: 20,
        description: '25th of each month · Cut-off 20th',
    },
    {
        name: 'Bi-Weekly Contractor Run',
        frequency: 'biweekly',
        dayOfWeek: 'Friday',
        startDate: '2026-09-04',
        cutoffType: 'days_before',
        cutoffDaysBefore: 1,
        description: 'Every other Friday · Cut-off 1 day before',
    },
];

export const DEFAULT_FINANCE_PAYMENT_CYCLES: FinancePaymentCycle[] = [
    {
        id: 'cycle_weekly_vendor',
        name: 'Weekly Vendor Settlement',
        frequency: 'weekly',
        dayOfWeek: 'Friday',
        cutoffType: 'specific_day',
        cutoffDayOfWeek: 'Thursday',
        status: 'active',
        isDefault: true,
        inUse: true,
        description: 'Processed every Friday for approved vendor bills received before Thursday.',
    },
    {
        id: 'cycle_twice_monthly_reimburse',
        name: 'Reimbursement Cycle',
        frequency: 'twice_monthly',
        firstPaymentDate: 1,
        secondPaymentDate: 15,
        cutoffType: 'days_before',
        cutoffDaysBefore: 2,
        status: 'active',
        isDefault: false,
        inUse: true,
        description: 'Scheduled batch on 1st & 15th of each month with 2 days lead time.',
    },
    {
        id: 'cycle_monthly_payroll',
        name: 'Monthly Payroll',
        frequency: 'monthly',
        monthlyPaymentDate: 25,
        cutoffType: 'specific_date',
        cutoffDate: 20,
        status: 'active',
        isDefault: false,
        inUse: true,
        description: 'Monthly payroll disbursement on the 25th with cut-off on the 20th.',
    },
];

const FINANCE_PAYMENT_CYCLES_KEY = 'forma_finance_payment_cycles_v2';

export async function getFinancePaymentCycles(): Promise<FinancePaymentCycle[]> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_PAYMENT_CYCLES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item: any, index: number) => {
                    const fallbackDefault = DEFAULT_FINANCE_PAYMENT_CYCLES.find(
                        (d) => d.id === item.id || d.name === item.name
                    ) || DEFAULT_FINANCE_PAYMENT_CYCLES[index];

                    // Handle legacy data where Bi-Weekly was incorrectly labeled for 1st & 15th
                    let freq: PaymentCycleFrequency = item.frequency || fallbackDefault?.frequency || 'weekly';
                    if (item.name?.toLowerCase().includes('1st & 15th') || item.day?.includes('1st & 15th')) {
                        freq = 'twice_monthly';
                    }

                    return {
                        id: item.id || `cycle_${Date.now()}_${index}`,
                        name: item.name || fallbackDefault?.name || `Payment Cycle ${index + 1}`,
                        frequency: freq,
                        dayOfWeek: item.dayOfWeek || fallbackDefault?.dayOfWeek || 'Friday',
                        startDate: item.startDate || fallbackDefault?.startDate || '2026-09-04',
                        firstPaymentDate: item.firstPaymentDate ?? fallbackDefault?.firstPaymentDate ?? 1,
                        secondPaymentDate: item.secondPaymentDate ?? fallbackDefault?.secondPaymentDate ?? 15,
                        monthlyPaymentDate: item.monthlyPaymentDate ?? fallbackDefault?.monthlyPaymentDate ?? 25,
                        cutoffType: item.cutoffType || fallbackDefault?.cutoffType || 'days_before',
                        cutoffDaysBefore: item.cutoffDaysBefore ?? fallbackDefault?.cutoffDaysBefore ?? 2,
                        cutoffDayOfWeek: item.cutoffDayOfWeek || fallbackDefault?.cutoffDayOfWeek || 'Thursday',
                        cutoffDate: item.cutoffDate ?? fallbackDefault?.cutoffDate ?? 20,
                        status: item.status === 'inactive' ? 'inactive' : 'active',
                        isDefault: !!item.isDefault,
                        inUse: !!item.inUse || !!fallbackDefault?.inUse,
                        description: item.description || fallbackDefault?.description || '',
                    };
                });
            }
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load payment cycles', e);
    }
    return DEFAULT_FINANCE_PAYMENT_CYCLES;
}

export async function saveFinancePaymentCycles(cycles: FinancePaymentCycle[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_PAYMENT_CYCLES_KEY, JSON.stringify(cycles));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save payment cycles', e);
        throw e;
    }
}

/**
 * Helper to convert integer to ordinal string (1 -> "1st", 2 -> "2nd", 3 -> "3rd", 25 -> "25th")
 */
export function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Returns human-readable schedule description for a payment cycle
 */
export function formatCycleSchedule(cycle: Partial<FinancePaymentCycle>): string {
    const freq = cycle.frequency || 'weekly';
    if (freq === 'weekly') {
        return `Every ${cycle.dayOfWeek || 'Friday'}`;
    }
    if (freq === 'biweekly') {
        return `Every other ${cycle.dayOfWeek || 'Friday'}`;
    }
    if (freq === 'twice_monthly') {
        const d1 = cycle.firstPaymentDate || 1;
        const d2 = cycle.secondPaymentDate || 15;
        return `${getOrdinalSuffix(d1)} & ${getOrdinalSuffix(d2)}`;
    }
    if (freq === 'monthly') {
        const d = cycle.monthlyPaymentDate || 25;
        return `${getOrdinalSuffix(d)} of each month`;
    }
    return 'Custom Schedule';
}

/**
 * Returns human-readable cut-off description for a payment cycle
 */
export function formatCycleCutoff(cycle: Partial<FinancePaymentCycle>): string {
    const type = cycle.cutoffType || 'days_before';
    if (type === 'days_before') {
        const days = cycle.cutoffDaysBefore ?? 2;
        if (days === 0) return 'Cut-off on payment day';
        if (days === 1) return 'Cut-off 1 day before';
        return `Cut-off ${days} days before`;
    }
    if (type === 'specific_day') {
        return `Cut-off ${cycle.cutoffDayOfWeek || 'Thursday'}`;
    }
    if (type === 'specific_date') {
        return `Cut-off ${getOrdinalSuffix(cycle.cutoffDate || 20)}`;
    }
    if (type === 'same_day') {
        return 'Cut-off on payment day';
    }
    return 'Cut-off defined';
}

/**
 * Returns combined secondary line (e.g. "Every Friday · Cut-off Thursday")
 */
export function formatCycleSummary(cycle: Partial<FinancePaymentCycle>): string {
    const sched = formatCycleSchedule(cycle);
    const cutoff = formatCycleCutoff(cycle);
    return `${sched} · ${cutoff}`;
}

// ============================================================================
// BANK ACCOUNTS & BENEFICIARIES (Unified Master List Architecture)
// ============================================================================

export type BankAccountOwnerType = 'company' | 'vendor' | 'employee' | 'other';

export interface IndonesianBankItem {
    code: string;
    name: string;
    shortName: string;
    digitsMin: number;
    digitsMax: number;
    digitSample: string;
    description: string;
}

export const INDONESIAN_BANKS_MASTER: IndonesianBankItem[] = [
    { code: 'BCA', name: 'BCA (Bank Central Asia)', shortName: 'BCA', digitsMin: 10, digitsMax: 10, digitSample: '8290129381', description: '10 digits' },
    { code: 'MANDIRI', name: 'Bank Mandiri', shortName: 'Mandiri', digitsMin: 13, digitsMax: 13, digitSample: '1370019283741', description: '13 digits' },
    { code: 'BNI', name: 'Bank BNI', shortName: 'BNI', digitsMin: 10, digitsMax: 10, digitSample: '0281923849', description: '10 digits' },
    { code: 'BRI', name: 'Bank BRI (Bank Rakyat Indonesia)', shortName: 'BRI', digitsMin: 15, digitsMax: 15, digitSample: '001901000123501', description: '15 digits' },
    { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)', shortName: 'BSI', digitsMin: 10, digitsMax: 10, digitSample: '7123456789', description: '10 digits' },
    { code: 'CIMB', name: 'Bank CIMB Niaga', shortName: 'CIMB Niaga', digitsMin: 10, digitsMax: 14, digitSample: '800123456700', description: '10–14 digits' },
    { code: 'PERMATA', name: 'Bank Permata', shortName: 'Permata', digitsMin: 10, digitsMax: 16, digitSample: '0123456789', description: '10–16 digits' },
    { code: 'DANAMON', name: 'Bank Danamon', shortName: 'Danamon', digitsMin: 10, digitsMax: 10, digitSample: '0012345678', description: '10 digits' },
    { code: 'BTPN_JAGO', name: 'Bank Jago', shortName: 'Jago', digitsMin: 12, digitsMax: 12, digitSample: '100123456789', description: '12 digits' },
    { code: 'BCA_DIGITAL', name: 'Blu by BCA Digital', shortName: 'Blu', digitsMin: 10, digitsMax: 10, digitSample: '0012345678', description: '10 digits' },
    { code: 'SEABANK', name: 'SeaBank Indonesia', shortName: 'SeaBank', digitsMin: 12, digitsMax: 12, digitSample: '901234567890', description: '12 digits' },
    { code: 'OCBC', name: 'OCBC NISP', shortName: 'OCBC', digitsMin: 10, digitsMax: 12, digitSample: '123456789012', description: '10–12 digits' },
    { code: 'BTN', name: 'Bank BTN', shortName: 'BTN', digitsMin: 16, digitsMax: 16, digitSample: '0012301500123456', description: '16 digits' },
    { code: 'PANIN', name: 'Bank Panin', shortName: 'Panin', digitsMin: 10, digitsMax: 10, digitSample: '1001234567', description: '10 digits' },
    { code: 'MAYBANK', name: 'Maybank Indonesia', shortName: 'Maybank', digitsMin: 10, digitsMax: 10, digitSample: '1001234567', description: '10 digits' },
    { code: 'MEGA', name: 'Bank Mega', shortName: 'Mega', digitsMin: 10, digitsMax: 10, digitSample: '0101234567', description: '10 digits' },
    { code: 'CUSTOM', name: 'Custom / Other Bank', shortName: 'Custom', digitsMin: 4, digitsMax: 34, digitSample: 'Account Number / IBAN', description: 'Custom / Overseas' },
];

export const MOCK_VENDOR_DIRECTORY = [
    { id: 'v_jaya_beton', name: 'PT Jaya Beton Indonesia', category: 'Material & Concrete' },
    { id: 'v_maju_mandiri', name: 'CV Maju Mandiri Steel', category: 'Fabrication & Rebar' },
    { id: 'v_surya_konstruksi', name: 'PT Surya Konstruksi Perkasa', category: 'Heavy Machinery' },
    { id: 'v_mega_baja', name: 'PT Mega Baja Nusantara', category: 'Structural Steel' },
    { id: 'v_mitra_sarana', name: 'CV Mitra Sarana Logistik', category: 'Freight & Transport' },
    { id: 'v_sinar_abadi', name: 'PT Sinar Abadi Electrical', category: 'MEP & Lighting' },
];

export const MOCK_EMPLOYEE_DIRECTORY = [
    { id: 'e_dimas_arya', name: 'Dimas Arya', role: 'Project Manager', department: 'Operations' },
    { id: 'e_sarah_jenkins', name: 'Sarah Jenkins', role: 'Site Architect', department: 'Design & Engineering' },
    { id: 'e_rio_pratama', name: 'Rio Pratama', role: 'Site Engineer', department: 'Operations' },
    { id: 'e_amanda_lee', name: 'Amanda Lee', role: 'Finance Admin', department: 'Finance' },
    { id: 'e_budi_santoso', name: 'Budi Santoso', role: 'Procurement Specialist', department: 'Procurement' },
    { id: 'e_aditya_putra', name: 'Aditya Putra', role: 'Field Supervisor', department: 'Field Crew' },
];

export interface FinanceBankAccount {
    id: string;
    ownerType: BankAccountOwnerType;
    bank: string; // e.g. 'BCA (Bank Central Asia)'
    bankCode?: string; // e.g. 'BCA'
    accountNumber: string; // e.g. '8290129381' (clean digits)
    accountHolderName: string; // e.g. 'PT Adidaya Kreasi Digital'
    linkedOwnerId?: string; // e.g. 'v_jaya_beton', 'e_dimas_arya'
    linkedOwnerName: string; // e.g. 'PT Adidaya Kreasi Digital', 'PT Jaya Beton Indonesia'
    accountLabel?: string; // e.g. 'Main Operating', 'Petty Cash', 'Project Payments'
    isPrimary: boolean; // Scoped to this owner entity
    status: 'active' | 'archived';
    inUse?: boolean;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const DEFAULT_FINANCE_BANK_ACCOUNTS: FinanceBankAccount[] = [
    // 1. Company Accounts
    {
        id: 'bank_acc_bca_main',
        ownerType: 'company',
        bank: 'BCA (Bank Central Asia)',
        bankCode: 'BCA',
        accountNumber: '8290129381',
        accountHolderName: 'PT Adidaya Kreasi Digital',
        linkedOwnerName: 'PT Adidaya Kreasi Digital',
        accountLabel: 'Main Operating',
        isPrimary: true,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-01',
    },
    {
        id: 'bank_acc_mandiri_ops',
        ownerType: 'company',
        bank: 'Bank Mandiri',
        bankCode: 'MANDIRI',
        accountNumber: '1370019283741',
        accountHolderName: 'PT Adidaya Kreasi Digital',
        linkedOwnerName: 'PT Adidaya Kreasi Digital',
        accountLabel: 'Adidaya Operational Pool',
        isPrimary: false,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-10',
    },
    {
        id: 'bank_acc_bni_petty',
        ownerType: 'company',
        bank: 'Bank BNI',
        bankCode: 'BNI',
        accountNumber: '0281923849',
        accountHolderName: 'PT Adidaya Kreasi Digital',
        linkedOwnerName: 'PT Adidaya Kreasi Digital',
        accountLabel: 'Petty Cash Funding Account',
        isPrimary: false,
        status: 'active',
        inUse: false,
        createdAt: '2026-08-15',
    },
    // 2. Vendor Accounts
    {
        id: 'bank_acc_vendor_jaya_1',
        ownerType: 'vendor',
        bank: 'Bank Mandiri',
        bankCode: 'MANDIRI',
        accountNumber: '1370098765432',
        accountHolderName: 'PT Jaya Beton Indonesia',
        linkedOwnerId: 'v_jaya_beton',
        linkedOwnerName: 'PT Jaya Beton Indonesia',
        accountLabel: 'Main Concrete Supply',
        isPrimary: true,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-20',
    },
    {
        id: 'bank_acc_vendor_jaya_2',
        ownerType: 'vendor',
        bank: 'BCA (Bank Central Asia)',
        bankCode: 'BCA',
        accountNumber: '7120984123',
        accountHolderName: 'PT Jaya Beton Indonesia',
        linkedOwnerId: 'v_jaya_beton',
        linkedOwnerName: 'PT Jaya Beton Indonesia',
        accountLabel: 'Surabaya Branch Payments',
        isPrimary: false,
        status: 'active',
        inUse: false,
        createdAt: '2026-08-22',
    },
    {
        id: 'bank_acc_vendor_maju',
        ownerType: 'vendor',
        bank: 'BCA (Bank Central Asia)',
        bankCode: 'BCA',
        accountNumber: '5270192837',
        accountHolderName: 'CV Maju Mandiri Steel',
        linkedOwnerId: 'v_maju_mandiri',
        linkedOwnerName: 'CV Maju Mandiri Steel',
        accountLabel: 'Primary Steel Account',
        isPrimary: true,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-25',
    },
    // 3. Employee Accounts
    {
        id: 'bank_acc_emp_dimas',
        ownerType: 'employee',
        bank: 'BCA (Bank Central Asia)',
        bankCode: 'BCA',
        accountNumber: '6040192831',
        accountHolderName: 'Dimas Arya',
        linkedOwnerId: 'e_dimas_arya',
        linkedOwnerName: 'Dimas Arya',
        accountLabel: 'Payroll & Claims',
        isPrimary: true,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-28',
    },
    {
        id: 'bank_acc_emp_sarah',
        ownerType: 'employee',
        bank: 'Bank Mandiri',
        bankCode: 'MANDIRI',
        accountNumber: '1180029384756',
        accountHolderName: 'Sarah Jenkins',
        linkedOwnerId: 'e_sarah_jenkins',
        linkedOwnerName: 'Sarah Jenkins',
        accountLabel: 'Reimbursement Account',
        isPrimary: true,
        status: 'active',
        inUse: true,
        createdAt: '2026-08-30',
    },
];

const FINANCE_BANK_ACCOUNTS_KEY = 'forma_finance_bank_accounts_v2';

export async function getFinanceBankAccounts(): Promise<FinanceBankAccount[]> {
    const { data, error } = await supabase.from('funding_sources').select('*').order('position', { ascending: true });
    if (error) throw error;
    return (data || []).filter((row: any) => String(row.type).toUpperCase() !== 'PETTY_CASH').map((row: any) => ({
        id: row.id, ownerType: 'company' as const, bank: row.provider || row.name || '', bankCode: row.provider || '',
        accountNumber: row.account_number || '', accountHolderName: row.account_holder_name || row.account_name || '',
        linkedOwnerId: row.id, linkedOwnerName: row.name || '', accountLabel: row.name || '',
        isPrimary: row.position === 0, status: row.is_active === false || row.is_archived ? 'archived' as const : 'active' as const, createdAt: row.created_at,
    }));
}

export async function saveFinanceBankAccounts(_accounts: FinanceBankAccount[]): Promise<void> {
    throw new Error('Bank accounts are managed in Funding Sources. Please update the account there.');
}

/**
 * Masks account number for secure list scanning (e.g. "8290129381" -> "•••• 9381")
 */
export function maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '•••• ----';
    const clean = accountNumber.replace(/[^0-9A-Za-z]/g, '');
    if (clean.length <= 4) {
        return `•••• ${clean}`;
    }
    const lastFour = clean.slice(-4);
    return `•••• ${lastFour}`;
}

/**
 * Returns human-readable metadata label for bottom line of card
 * e.g. "Company · Main Operating", "Vendor (PT Jaya Beton) · Main Concrete Supply"
 */
export function formatBankAccountMetadata(account: Partial<FinanceBankAccount>): string {
    const typeLabel = account.ownerType
        ? account.ownerType.charAt(0).toUpperCase() + account.ownerType.slice(1)
        : 'Company';

    let ownerSnippet = '';
    const hasExplicitLinked =
        account.linkedOwnerName &&
        account.linkedOwnerName !== 'None' &&
        account.linkedOwnerName !== account.accountHolderName &&
        !account.linkedOwnerName.startsWith('None');

    if (account.ownerType !== 'company' && hasExplicitLinked) {
        ownerSnippet = ` (${account.linkedOwnerName})`;
    }

    const labelPart = account.accountLabel ? ` · ${account.accountLabel}` : '';
    return `${typeLabel}${ownerSnippet}${labelPart}`;
}

/**
 * Returns short bank brand name (e.g. "BCA", "Mandiri", "BNI")
 */
export function getShortBankName(bankFullName: string): string {
    if (!bankFullName) return 'Bank';
    const match = INDONESIAN_BANKS_MASTER.find(
        (b) => b.name.toLowerCase() === bankFullName.toLowerCase() || b.shortName.toLowerCase() === bankFullName.toLowerCase()
    );
    if (match) return match.shortName;
    if (bankFullName.includes('(')) {
        return bankFullName.split('(')[0].trim();
    }
    return bankFullName.replace('Bank ', '').trim();
}



export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
    {
        id: 'cat_mat',
        code: 'MAT',
        name: 'Material',
        defaultExpenseType: 'Project Purchase',
        resourceMapping: 'Material',
        subcategories: [
            {
                id: 'sub_mat_01',
                code: 'MAT-01',
                name: 'Building Materials',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Inherit from Category',
            },
            {
                id: 'sub_mat_02',
                code: 'MAT-02',
                name: 'Finishing & Consumables',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Inherit from Category',
            },
        ],
    },
    {
        id: 'cat_prj',
        code: 'PRJ',
        name: 'Direct Project Expenses',
        defaultExpenseType: 'Project Purchase',
        resourceMapping: 'Material',
        subcategories: [
            {
                id: 'sub_prj_01',
                code: 'PRJ-01',
                name: 'Site Work & Earthmoving',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Inherit from Category',
            },
            {
                id: 'sub_prj_02',
                code: 'PRJ-02',
                name: 'Subcontractor Fabrication',
                defaultExpenseType: 'Vendor / Subcontractor Service',
                resourceMapping: 'Services',
            },
            {
                id: 'sub_prj_03',
                code: 'PRJ-03',
                name: 'Structural Steel & Rebar',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Material',
            },
            {
                id: 'sub_prj_04',
                code: 'PRJ-04',
                name: 'Concrete & Aggregates',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Material',
            },
        ],
    },
    {
        id: 'cat_ops',
        code: 'OPS',
        name: 'Operational & Overhead',
        defaultExpenseType: 'Office Supplies & Admin',
        resourceMapping: 'Services',
        subcategories: [
            {
                id: 'sub_ops_01',
                code: 'OPS-01',
                name: 'Office Rent & Utilities',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Services',
            },
            {
                id: 'sub_ops_02',
                code: 'OPS-02',
                name: 'Software & Cloud Subscriptions',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Services',
            },
            {
                id: 'sub_ops_03',
                code: 'OPS-03',
                name: 'Stationery & Pantry',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Material',
            },
        ],
    },
    {
        id: 'cat_log',
        code: 'LOG',
        name: 'Logistics & Transport',
        defaultExpenseType: 'Fuel & Mileage Reimbursement',
        resourceMapping: 'Services',
        subcategories: [
            {
                id: 'sub_log_01',
                code: 'LOG-01',
                name: 'Fleet Fuel & Tolls',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'None',
            },
            {
                id: 'sub_log_02',
                code: 'LOG-02',
                name: 'Freight & Cargo Shipping',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Services',
            },
            {
                id: 'sub_log_03',
                code: 'LOG-03',
                name: 'Courier & Express Delivery',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Services',
            },
        ],
    },
    {
        id: 'cat_eqp',
        code: 'EQP',
        name: 'Equipment & Rental',
        defaultExpenseType: 'Equipment Rental',
        resourceMapping: 'Tools',
        subcategories: [
            {
                id: 'sub_eqp_01',
                code: 'EQP-01',
                name: 'Heavy Machinery Rental',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Tools',
            },
            {
                id: 'sub_eqp_02',
                code: 'EQP-02',
                name: 'Scaffolding & Safety Gear',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Tools',
            },
            {
                id: 'sub_eqp_03',
                code: 'EQP-03',
                name: 'Surveying Instruments',
                defaultExpenseType: 'Inherit from Category',
                resourceMapping: 'Assets',
            },
        ],
    },
];

const FINANCE_CATEGORIES_KEY = 'forma_finance_transaction_categories_v2';

const categoryListeners = new Set<(items: FinanceCategory[]) => void>();
export function subscribeFinanceCategories(listener: (items: FinanceCategory[]) => void) {
    categoryListeners.add(listener);
    return () => { categoryListeners.delete(listener); };
}
let categoriesSnapshot: FinanceCategory[] = [];
export const getFinanceCategoriesSnapshot = () => categoriesSnapshot;
let categoriesLoading: Promise<FinanceCategory[]> | null = null;
export async function getFinanceCategories(): Promise<FinanceCategory[]> {
    if (categoriesLoading) return categoriesLoading;
    categoriesLoading = (async () => {
        const raw = await AsyncStorage.getItem(FINANCE_CATEGORIES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) throw new Error('Transaction Categories could not be read.');
        const migrationKey = FINANCE_CATEGORIES_KEY + ':adidaya_import_v1';
        if (await AsyncStorage.getItem(migrationKey)) return parsed;
        const imported = importAdidayaTransactionCategories(parsed);
        await AsyncStorage.setItem(FINANCE_CATEGORIES_KEY, JSON.stringify(imported));
        await AsyncStorage.setItem(migrationKey, 'done');
        return imported;
    })().then(data => { categoriesSnapshot = data; return data; }).finally(() => { categoriesLoading = null; });
    return categoriesLoading;
}

export async function saveFinanceCategories(categories: FinanceCategory[]): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_CATEGORIES_KEY, JSON.stringify(categories));
        categoriesSnapshot = categories;
        categoryListeners.forEach(listener => listener(categories));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save transaction categories', e);
        throw e;
    }
}

/**
 * Calculates effective Expense Type and Resource Mapping for a subcategory
 * by applying inheritance from parent Category when specified.
 */
export function getEffectiveSubcategorySettings(
    category: FinanceCategory,
    subcategory: FinanceSubcategory
): {
    expenseType: string;
    isExpenseTypeInherited: boolean;
    resourceMapping: ResourceTypeOption;
    isResourceInherited: boolean;
} {
    const isExpenseTypeInherited =
        !subcategory.defaultExpenseType || subcategory.defaultExpenseType === 'Inherit from Category';
    const effectiveExpenseType = isExpenseTypeInherited
        ? category.defaultExpenseType || 'None'
        : subcategory.defaultExpenseType;

    const isResourceInherited =
        !subcategory.resourceMapping || subcategory.resourceMapping === 'Inherit from Category';
    const effectiveResourceMapping = isResourceInherited
        ? category.resourceMapping || 'None'
        : (subcategory.resourceMapping as ResourceTypeOption);

    return {
        expenseType: effectiveExpenseType,
        isExpenseTypeInherited,
        resourceMapping: effectiveResourceMapping,
        isResourceInherited,
    };
}

// ============================================================================
// DOCUMENT-CENTRIC APPROVAL MATRIX & DEPARTMENT GROUPS
// ============================================================================

export interface OrganizationDepartmentItem {
    id: string;
    name: string;
    code?: string;
}

export interface OrganizationPositionItem {
    id: string;
    title: string;
    defaultPersonName: string;
    departmentId?: string;
}

export interface OrganizationEmployeeItem {
    id: string;
    name: string;
    positionTitle: string;
    departmentId?: string;
    departmentName?: string;
}

export const ORGANIZATION_DEPARTMENTS_MASTER: OrganizationDepartmentItem[] = [
    { id: 'dept-hga', code: 'HGA', name: 'Human Resources & General Affairs' },
    { id: 'dept-fin', code: 'FIN', name: 'Finance & Accounting' },
    { id: 'dept-ops', code: 'OPS', name: 'Operations' },
    { id: 'dept-eng', code: 'ENG', name: 'Engineering' },
    { id: 'dept-pur', code: 'PUR', name: 'Purchasing' },
    { id: 'dept-mkt', code: 'MKT', name: 'Marketing' },
    { id: 'dept-sls', code: 'SLS', name: 'Sales' },
    { id: 'dept-des', code: 'DES', name: 'Design & Creative' },
];

export const ORGANIZATION_POSITIONS_MASTER: OrganizationPositionItem[] = [];

export const ORGANIZATION_EMPLOYEES_MASTER: OrganizationEmployeeItem[] = [];

export function formatDepartmentCode(rawCode?: string, name?: string): string {
    const raw = String(rawCode || '').trim();
    if (raw) {
        // Strip leading number prefix like "4-", "2-", etc.
        const stripped = raw.replace(/^[0-9]+[-_]/, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (stripped) return stripped;
    }
    if (name) {
        return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
    }
    return '';
}

/**
 * Fetches real organization departments from Supabase
 */
export async function fetchOrganizationDepartments(): Promise<OrganizationDepartmentItem[]> {
    try {
        const { data, error } = await supabase
            .from('organization_departments')
            .select('id, name, code, order_index')
            .order('order_index', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map((d: any) => ({
                id: d.id,
                name: d.name,
                code: formatDepartmentCode(d.code, d.name),
            }));
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to fetch organization_departments from Supabase', e);
    }
    return [];
}

/**
 * Fetches real organization positions from Supabase
 */
export async function fetchOrganizationPositions(): Promise<OrganizationPositionItem[]> {
    try {
        const { data, error } = await supabase
            .from('organization_positions')
            .select('id, name, code, department_id, organization_departments(id, name, code)')
            .order('name');
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map((p: any) => ({
                id: p.id,
                title: p.name || p.title || 'Position',
                departmentId: p.department_id || p.organization_departments?.id,
                defaultPersonName: '',
            }));
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to fetch organization_positions from Supabase', e);
    }
    return [];
}

/**
 * Fetches real organization employees (profiles) from Supabase
 */
export async function fetchOrganizationEmployees(): Promise<OrganizationEmployeeItem[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, nickname, job_title, department, department_id, position_id, organization_departments(id, name), organization_positions(id, name)')
            .order('full_name');
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map((prof: any) => {
                const name = prof.full_name || prof.nickname || 'Employee';
                const posTitle = prof.organization_positions?.name || prof.job_title || 'Team Member';
                const deptId = prof.department_id || prof.organization_departments?.id;
                const deptName = prof.organization_departments?.name || prof.department || '';
                return {
                    id: prof.id,
                    name,
                    positionTitle: posTitle,
                    departmentId: deptId,
                    departmentName: deptName,
                };
            });
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to fetch profiles from Supabase', e);
    }
    return [];
}

export interface FinanceApproverLevel {
    id: string;
    level: number;
    positionId?: string;
    positionTitle: string;
    userId?: string;
    personName: string;
}

export interface FinanceDepartmentApprovalGroup {
    id: string;
    name?: string;
    isRemainingDepartments?: boolean;
    departmentIds: string[];
    chain: FinanceApproverLevel[];
}

export interface FinanceDocumentApprovalConfig {
    documentKey: string;
    scope: 'global' | 'department';
    globalChain: FinanceApproverLevel[];
    departmentGroups: FinanceDepartmentApprovalGroup[];
}

export type FinanceApprovalMatrixSettings = Record<string, FinanceDocumentApprovalConfig>;

export const DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS: FinanceApprovalMatrixSettings = {
    purchasing_request: {
        documentKey: 'purchasing_request',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
    purchasing_consolidation: {
        documentKey: 'purchasing_consolidation',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
    purchasing_payment: {
        documentKey: 'purchasing_payment',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
    reimbursement_request: {
        documentKey: 'reimbursement_request',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
    reimbursement_consolidation: {
        documentKey: 'reimbursement_consolidation',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
    reimbursement_payment: {
        documentKey: 'reimbursement_payment',
        scope: 'global',
        globalChain: [],
        departmentGroups: [],
    },
};

const FINANCE_APPROVAL_MATRIX_SETTINGS_KEY = 'forma_finance_approval_matrix_settings_v7_real_data';

export async function getFinanceApprovalMatrixSettings(): Promise<FinanceApprovalMatrixSettings> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_APPROVAL_MATRIX_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
                ...parsed,
            };
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load approval matrix settings', e);
    }
    return DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS;
}

export async function saveFinanceApprovalMatrixSettings(
    settings: FinanceApprovalMatrixSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_APPROVAL_MATRIX_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save approval matrix settings', e);
        throw e;
    }
}

/**
 * Calculates remaining departments that are not explicitly assigned to any group
 */
export function getRemainingDepartmentIds(
    groups: FinanceDepartmentApprovalGroup[],
    allDepartments: OrganizationDepartmentItem[] = ORGANIZATION_DEPARTMENTS_MASTER
): string[] {
    const explicitlyAssigned = new Set<string>();
    groups.forEach((g) => {
        if (!g.isRemainingDepartments) {
            g.departmentIds.forEach((id) => explicitlyAssigned.add(id));
        }
    });
    return allDepartments
        .map((d) => d.id)
        .filter((id) => !explicitlyAssigned.has(id));
}

/**
 * Returns formatted title for a department group
 */
export function getDepartmentGroupTitle(
    group: FinanceDepartmentApprovalGroup,
    allDepartments: OrganizationDepartmentItem[] = ORGANIZATION_DEPARTMENTS_MASTER
): string {
    if (group.isRemainingDepartments) {
        return 'Remaining Departments';
    }
    const names = group.departmentIds
        .map((id) => allDepartments.find((d) => d.id === id)?.name || id)
        .filter(Boolean);
    return names.join(', ') || 'Unassigned Group';
}

// ============================================================================
// FIELD REQUIREMENTS / RULES
// ============================================================================

export interface FinanceFieldRuleItem {
    id: string;
    name: string;
    description: string;
    required: boolean;
    helperText?: string;
}

export interface FinanceDocumentFieldRules {
    docKey: string;
    workflowType: 'purchasing' | 'reimbursement';
    levelType: DocumentLevelType;
    fields: FinanceFieldRuleItem[];
}

export type FinanceFieldRulesSettings = Record<string, Record<string, boolean>>;

const FINANCE_FIELD_RULES_KEY = 'forma_finance_field_rules_v2';

/**
 * Returns canonical Forma Preset field definitions dynamically configured
 * based on whether Consolidation is active in the workflow.
 */
export function getFormaPresetDocumentFieldRules(
    docRules: FinanceDocumentRulesSettings = DEFAULT_FINANCE_DOCUMENT_RULES
): FinanceDocumentFieldRules[] {
    const isPurchasingConsolidationOn = !!docRules.purchasing?.levels?.consolidation?.enabled;
    const isReimbursementConsolidationOn = !!docRules.reimbursement?.levels?.consolidation?.enabled;

    return [
        // 1. Purchasing - Level 1: Request
        {
            docKey: 'purchasing_request',
            workflowType: 'purchasing',
            levelType: 'request',
            fields: isPurchasingConsolidationOn
                ? [
                    {
                        id: 'project',
                        name: 'Project / Cost Center',
                        description: 'Links the request to a project or overhead.',
                        required: true,
                    },
                    {
                        id: 'category',
                        name: 'Category',
                        description: 'Expense category classification.',
                        required: true,
                    },
                    {
                        id: 'target_date',
                        name: 'Target Date',
                        description: 'Requested purchasing deadline.',
                        required: true,
                    },
                    {
                        id: 'items',
                        name: 'Item / Description',
                        description: 'Requested item or service.',
                        required: true,
                    },
                    {
                        id: 'quantity_unit',
                        name: 'Quantity & Unit',
                        description: 'Requested quantity and unit.',
                        required: true,
                    },
                    {
                        id: 'price',
                        name: 'Estimated Price',
                        description: 'Estimated request value.',
                        required: false,
                        helperText: 'Final price can be completed during Consolidation.',
                    },
                    {
                        id: 'vendor',
                        name: 'Vendor / Supplier',
                        description: 'Proposed vendor or supplier.',
                        required: false,
                        helperText: 'Final vendor may be assigned by purchasing team.',
                    },
                    {
                        id: 'bank_account',
                        name: 'Beneficiary Bank Account',
                        description: 'Destination bank account.',
                        required: false,
                        helperText: 'Completed during purchasing realization.',
                    },
                    {
                        id: 'invoice',
                        name: 'Supporting Quotation / Reference',
                        description: 'Optional quotation or reference document.',
                        required: false,
                        helperText: 'Actual invoice may be added later.',
                    },
                    {
                        id: 'priority',
                        name: 'Priority',
                        description: 'Request urgency level.',
                        required: false,
                    },
                    {
                        id: 'subcategory',
                        name: 'Subcategory',
                        description: 'Secondary classification.',
                        required: false,
                    },
                    {
                        id: 'notes',
                        name: 'Notes / Reason',
                        description: 'Specification notes or justification.',
                        required: false,
                    },
                ]
                : [
                    {
                        id: 'project',
                        name: 'Project / Cost Center',
                        description: 'Links the request to a project or overhead.',
                        required: true,
                    },
                    {
                        id: 'category',
                        name: 'Category',
                        description: 'Expense category classification.',
                        required: true,
                    },
                    {
                        id: 'items',
                        name: 'Item / Description',
                        description: 'Requested item or service details.',
                        required: true,
                    },
                    {
                        id: 'quantity_unit',
                        name: 'Quantity & Unit',
                        description: 'Requested quantity and measurement unit.',
                        required: true,
                    },
                    {
                        id: 'price',
                        name: 'Actual / Unit Price',
                        description: 'Final price per unit for direct purchasing.',
                        required: true,
                    },
                    {
                        id: 'vendor',
                        name: 'Vendor / Supplier',
                        description: 'Actual vendor used for the purchase.',
                        required: true,
                    },
                    {
                        id: 'bank_account',
                        name: 'Beneficiary Bank Account',
                        description: 'Beneficiary account for settlement.',
                        required: true,
                    },
                    {
                        id: 'invoice',
                        name: 'Invoice / Receipt Attachment',
                        description: 'Supporting invoice, bill, or receipt proof.',
                        required: true,
                    },
                    {
                        id: 'target_date',
                        name: 'Target Date',
                        description: 'Requested delivery or completion deadline.',
                        required: false,
                    },
                    {
                        id: 'priority',
                        name: 'Priority',
                        description: 'Request urgency level.',
                        required: false,
                    },
                    {
                        id: 'subcategory',
                        name: 'Subcategory',
                        description: 'Secondary expense classification.',
                        required: false,
                    },
                    {
                        id: 'notes',
                        name: 'Notes / Justification',
                        description: 'Additional remarks or purchase reason.',
                        required: false,
                    },
                ],
        },

        // 2. Purchasing - Level 2: Consolidation
        {
            docKey: 'purchasing_consolidation',
            workflowType: 'purchasing',
            levelType: 'consolidation',
            fields: [
                {
                    id: 'items',
                    name: 'Final Item Specification',
                    description: 'Confirmed item names and technical specifications.',
                    required: true,
                },
                {
                    id: 'quantity_unit',
                    name: 'Final Quantity & Unit',
                    description: 'Realized purchasing quantities and measurement units.',
                    required: true,
                },
                {
                    id: 'price',
                    name: 'Actual Unit Price',
                    description: 'Realized / negotiated purchase price per unit.',
                    required: true,
                },
                {
                    id: 'vendor',
                    name: 'Actual Vendor / Supplier',
                    description: 'Selected vendor executing the purchase order.',
                    required: false,
                },
                {
                    id: 'bank_account',
                    name: 'Beneficiary Bank Account',
                    description: 'Destination bank account for vendor settlement.',
                    required: true,
                },
                {
                    id: 'invoice',
                    name: 'Invoice / Tax Invoice (Faktur Pajak)',
                    description: 'Official vendor billing invoice or tax receipt.',
                    required: true,
                },
                {
                    id: 'quotation',
                    name: 'Quotation / Purchase Agreement',
                    description: 'Vendor comparison quotes or contract agreement.',
                    required: false,
                },
                {
                    id: 'payment_terms',
                    name: 'Payment Term',
                    description: 'Agreed payment schedule (COD, Net 30, etc.).',
                    required: false,
                },
                {
                    id: 'notes',
                    name: 'Procurement Notes',
                    description: 'Fulfillment instructions or procurement remarks.',
                    required: false,
                },
            ],
        },

        // 3. Purchasing - Level 3: Payment
        {
            docKey: 'purchasing_payment',
            workflowType: 'purchasing',
            levelType: 'payment',
            fields: [
                {
                    id: 'funding_source',
                    name: 'Funding Source / Account',
                    description: 'Bank account or pool used for disbursement.',
                    required: true,
                },
                {
                    id: 'payment_amount',
                    name: 'Payment Amount',
                    description: 'Settlement amount paid to vendor.',
                    required: true,
                },
                {
                    id: 'payment_date',
                    name: 'Payment Date',
                    description: 'Date bank transfer or payout was executed.',
                    required: true,
                },
                {
                    id: 'beneficiary',
                    name: 'Beneficiary Details',
                    description: 'Verified destination account details.',
                    required: true,
                },
                {
                    id: 'payment_proof',
                    name: 'Proof of Transfer / Receipt',
                    description: 'Bank transfer slip or receipt confirmation.',
                    required: true,
                },
                {
                    id: 'payment_ref',
                    name: 'Payment Reference / Ref ID',
                    description: 'Transaction ID or bank reference number.',
                    required: false,
                },
                {
                    id: 'notes',
                    name: 'Payment Remarks',
                    description: 'Disbursement notes or remarks.',
                    required: false,
                },
            ],
        },

        // 4. Reimbursement - Level 1: Request
        {
            docKey: 'reimbursement_request',
            workflowType: 'reimbursement',
            levelType: 'request',
            fields: [
                {
                    id: 'project',
                    name: 'Project / Cost Center',
                    description: 'Link claim to project or operational overhead.',
                    required: true,
                },
                {
                    id: 'category',
                    name: 'Expense Category',
                    description: 'Expense classification.',
                    required: true,
                },
                {
                    id: 'expense_date',
                    name: 'Expense Date',
                    description: 'Date the expense was incurred.',
                    required: true,
                },
                {
                    id: 'items',
                    name: 'Expense Item / Description',
                    description: 'Description of reimbursable expense.',
                    required: true,
                },
                {
                    id: 'price',
                    name: 'Claim Amount',
                    description: 'Actual expense amount claimed.',
                    required: true,
                },
                {
                    id: 'invoice',
                    name: 'Proof / Receipt Photo',
                    description: 'Receipt, invoice, or ticket attachment.',
                    required: true,
                },
                {
                    id: 'bank_account',
                    name: 'Beneficiary Bank Account',
                    description: 'Employee bank account for payout.',
                    required: true,
                },
                {
                    id: 'subcategory',
                    name: 'Subcategory',
                    description: 'Secondary expense classification.',
                    required: false,
                },
                {
                    id: 'tax_invoice',
                    name: 'Tax Invoice (Faktur Pajak)',
                    description: 'Official tax invoice if applicable.',
                    required: false,
                },
                {
                    id: 'notes',
                    name: 'Notes / Business Purpose',
                    description: 'Business justification for the claim.',
                    required: false,
                },
            ],
        },

        // 5. Reimbursement - Level 2: Consolidation / Batch
        {
            docKey: 'reimbursement_consolidation',
            workflowType: 'reimbursement',
            levelType: 'consolidation',
            fields: [
                {
                    id: 'batch_title',
                    name: 'Batch Name / Title',
                    description: 'Identifier for the reimbursement grouping.',
                    required: true,
                },
                {
                    id: 'cutoff_date',
                    name: 'Cut-off Period / Date',
                    description: 'Period covered by this reimbursement batch.',
                    required: true,
                },
                {
                    id: 'verified_items',
                    name: 'Verified Claims List',
                    description: 'Approved claims bundled for disbursement.',
                    required: true,
                },
                {
                    id: 'total_amount',
                    name: 'Total Disbursement Amount',
                    description: 'Calculated total disbursement.',
                    required: true,
                },
                {
                    id: 'notes',
                    name: 'Audit Summary & Notes',
                    description: 'Verification notes or audit remarks.',
                    required: false,
                },
            ],
        },

        // 6. Reimbursement - Level 3: Payment
        {
            docKey: 'reimbursement_payment',
            workflowType: 'reimbursement',
            levelType: 'payment',
            fields: [
                {
                    id: 'funding_source',
                    name: 'Funding Source / Account',
                    description: 'Company bank account used for reimbursement payout.',
                    required: true,
                },
                {
                    id: 'payment_amount',
                    name: 'Disbursed Amount',
                    description: 'Final reimbursement amount transferred.',
                    required: true,
                },
                {
                    id: 'payment_date',
                    name: 'Disbursement Date',
                    description: 'Date the reimbursement payout was executed.',
                    required: true,
                },
                {
                    id: 'beneficiary',
                    name: 'Beneficiary Account',
                    description: 'Employee recipient account.',
                    required: true,
                },
                {
                    id: 'payment_proof',
                    name: 'Proof of Transfer',
                    description: 'Bank transfer receipt slip.',
                    required: true,
                },
                {
                    id: 'payment_ref',
                    name: 'Transfer Reference ID',
                    description: 'Bank transaction reference number.',
                    required: false,
                },
                {
                    id: 'notes',
                    name: 'Disbursement Notes',
                    description: 'Payment remarks or notes.',
                    required: false,
                },
            ],
        },
    ];
}

/**
 * Returns a flat key-value map of { docKey: { fieldId: boolean } } representing default preset rules
 */
export function getDefaultFieldRulesMap(
    docRules: FinanceDocumentRulesSettings = DEFAULT_FINANCE_DOCUMENT_RULES
): FinanceFieldRulesSettings {
    const docFieldDefs = getFormaPresetDocumentFieldRules(docRules);
    const map: FinanceFieldRulesSettings = {};
    docFieldDefs.forEach((doc) => {
        map[doc.docKey] = {};
        doc.fields.forEach((f) => {
            map[doc.docKey][f.id] = f.required;
        });
    });
    return map;
}

export async function getFinanceFieldRules(
    docRules: FinanceDocumentRulesSettings = DEFAULT_FINANCE_DOCUMENT_RULES
): Promise<FinanceFieldRulesSettings> {
    const defaultMap = getDefaultFieldRulesMap(docRules);
    try {
        const raw = await AsyncStorage.getItem(FINANCE_FIELD_RULES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const merged: FinanceFieldRulesSettings = { ...defaultMap };
            Object.keys(defaultMap).forEach((docKey) => {
                merged[docKey] = {
                    ...defaultMap[docKey],
                    ...(parsed[docKey] || {}),
                };
            });
            return merged;
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load field rules', e);
    }
    return defaultMap;
}

export async function saveFinanceFieldRules(rules: FinanceFieldRulesSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_FIELD_RULES_KEY, JSON.stringify(rules));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save field rules', e);
        throw e;
    }
}

// ---------------------------------------------------------------------------
// 12. Finance Notification Rules Types & Data Models
// ---------------------------------------------------------------------------

export type PaymentDueTiming = 'same_day' | '1_day_before' | '3_days_before' | '7_days_before' | string;
export type ReminderTiming = '12_hours' | '24_hours' | '48_hours' | '3_days' | string;

export interface StructuredTiming {
    value: number;
    unit: 'hours' | 'days';
    direction: 'before' | 'after';
}

export const PAYMENT_DUE_TIMING_OPTIONS = [
    { value: 'same_day', label: 'Same day', description: 'Send alert on the exact due date at 08:00 AM' },
    { value: '1_day_before', label: '1 day before', description: 'Send alert 24 hours prior to due date' },
    { value: '3_days_before', label: '3 days before', description: 'Send alert 3 days prior to due date' },
    { value: '7_days_before', label: '7 days before', description: 'Send alert 1 week in advance' },
    { value: '1_day_overdue', label: '1 day overdue', description: 'Send alert 24 hours after missed due date' },
    { value: '3_days_overdue', label: '3 days overdue', description: 'Send alert 3 days after missed due date' },
    { value: '7_days_overdue', label: '7 days overdue', description: 'Send alert 1 week after missed due date' },
];

export const PAYMENT_OVERDUE_TIMING_OPTIONS = [
    { value: 'immediate', label: 'Immediately when overdue', description: 'Send alert as soon as payment due date passes' },
    { value: '1_day_after', label: '1 day after due date', description: 'Send alert 24 hours after missed due date' },
    { value: '3_days_after', label: '3 days after due date', description: 'Send alert 3 days after missed due date' },
    { value: '7_days_after', label: '7 days after due date', description: 'Send alert 1 week after missed due date' },
];

export const REMINDER_TIMING_OPTIONS = [
    { value: '12_hours', label: 'After 12 hours', description: 'Remind approver if pending for 12 hours' },
    { value: '24_hours', label: 'After 24 hours', description: 'Remind approver if pending for 1 day' },
    { value: '48_hours', label: 'After 48 hours', description: 'Remind approver if pending for 2 days' },
    { value: '3_days', label: 'After 3 days', description: 'Remind approver if pending for 3 days' },
];

export function parseStructuredTiming(
    timingStr?: string,
    defaultDirection: 'before' | 'after' = 'before'
): StructuredTiming {
    if (!timingStr) return { value: 1, unit: 'days', direction: defaultDirection };
    if (timingStr === 'same_day') return { value: 0, unit: 'days', direction: 'before' };
    if (timingStr === 'immediate') return { value: 0, unit: 'days', direction: 'after' };
    if (timingStr === '1_day_before') return { value: 1, unit: 'days', direction: 'before' };
    if (timingStr === '3_days_before') return { value: 3, unit: 'days', direction: 'before' };
    if (timingStr === '7_days_before') return { value: 7, unit: 'days', direction: 'before' };
    if (timingStr === '1_day_after' || timingStr === '1_day_overdue') return { value: 1, unit: 'days', direction: 'after' };
    if (timingStr === '3_days_after' || timingStr === '3_days_overdue') return { value: 3, unit: 'days', direction: 'after' };
    if (timingStr === '7_days_after' || timingStr === '7_days_overdue') return { value: 7, unit: 'days', direction: 'after' };
    if (timingStr === '12_hours') return { value: 12, unit: 'hours', direction: 'after' };
    if (timingStr === '24_hours') return { value: 24, unit: 'hours', direction: 'after' };
    if (timingStr === '48_hours') return { value: 48, unit: 'hours', direction: 'after' };
    if (timingStr === '3_days') return { value: 3, unit: 'days', direction: 'after' };

    const lower = timingStr.toLowerCase();

    // Determine direction (before / after / sebelum / setelah / sesudah / overdue)
    let direction: 'before' | 'after' = defaultDirection;
    if (lower.includes('after') || lower.includes('setelah') || lower.includes('sesudah') || lower.includes('lewat') || lower.includes('overdue')) {
        direction = 'after';
    } else if (lower.includes('before') || lower.includes('sebelum') || lower.includes('prior') || lower.includes('ahead')) {
        direction = 'before';
    }

    // Match numbers and unit (days / hours / hari / jam)
    const match = lower.match(/(\d+)\s*(hour|day|hr|d|hari|jam)?/i);
    if (match && match[1]) {
        const num = parseInt(match[1], 10) || 1;
        const rawUnit = (match[2] || '').toLowerCase();
        const unit = rawUnit.startsWith('h') || rawUnit.startsWith('j') ? 'hours' : 'days';
        return { value: num, unit, direction };
    }

    return { value: 1, unit: 'days', direction };
}

export function formatPaymentDueTiming(timing?: string): string {
    if (!timing) return '1 day before';
    if (timing === 'same_day') return 'Same day';
    const found = PAYMENT_DUE_TIMING_OPTIONS.find((o) => o.value === timing);
    if (found) return found.label;

    const { value, unit, direction } = parseStructuredTiming(timing, 'before');
    if (value === 0) return 'Same day';
    const unitLabel = value === 1 ? (unit === 'hours' ? 'hour' : 'day') : unit;
    return direction === 'after' ? `${value} ${unitLabel} overdue` : `${value} ${unitLabel} before`;
}

export function formatPaymentOverdueTiming(timing?: string): string {
    if (!timing) return '1 day after';
    if (timing === 'immediate') return 'Immediately';
    const found = PAYMENT_OVERDUE_TIMING_OPTIONS.find((o) => o.value === timing);
    if (found) return found.label;

    const { value, unit, direction } = parseStructuredTiming(timing, 'after');
    if (value === 0) return 'Immediately';
    const unitLabel = value === 1 ? (unit === 'hours' ? 'hour' : 'day') : unit;
    return `${value} ${unitLabel} ${direction}`;
}

export function formatReminderTiming(timing?: string): string {
    if (!timing) return 'After 24 hours';
    const found = REMINDER_TIMING_OPTIONS.find((o) => o.value === timing);
    if (found) return found.label;

    const { value, unit, direction } = parseStructuredTiming(timing, 'after');
    const unitLabel = value === 1 ? (unit === 'hours' ? 'hour' : 'day') : unit;
    return direction === 'after' ? `After ${value} ${unitLabel}` : `${value} ${unitLabel} before`;
}

export type FinanceBuiltinEventKey =
    | 'approval_required'
    | 'request_fully_approved'
    | 'request_rejected'
    | 'revision_requested'
    | 'request_cancelled'
    | 'ready_for_consolidation'
    | 'consolidation_completed'
    | 'ready_for_payment'
    | 'payment_completed'
    | 'payment_failed'
    | 'payment_due'
    | 'pending_approval_reminder';

export type FinanceEventCategory = 'approval' | 'consolidation' | 'payment' | 'reminders';

export interface FinanceEventNotificationRule {
    id: FinanceBuiltinEventKey;
    name: string;
    category: FinanceEventCategory;
    description: string;
    recipientDescription: string;
    enabled: boolean;
    paymentDueTiming?: PaymentDueTiming;
    paymentOverdueTiming?: string;
    reminderTiming?: ReminderTiming;
    appliedDocumentTypes?: string[]; // e.g. ['all'] or array of doc keys
}

export interface FinanceNotificationTemplate {
    id: string; // matches event key or custom id
    eventKey: FinanceBuiltinEventKey | string;
    name: string;
    titleTemplate: string;
    bodyTemplate: string;
    availableVariables: string[];
}

export type CustomRuleOperator =
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'
    | 'contains';

export const CUSTOM_RULE_OPERATOR_OPTIONS: Array<{ value: CustomRuleOperator; label: string }> = [
    { value: 'equals', label: 'Equals (=)' },
    { value: 'not_equals', label: 'Does not equal (≠)' },
    { value: 'greater_than', label: 'Greater than (>)' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal (≥)' },
    { value: 'less_than', label: 'Less than (<)' },
    { value: 'less_than_or_equal', label: 'Less than or equal (≤)' },
    { value: 'contains', label: 'Contains' },
];

export type CustomRuleField =
    | 'document_type'
    | 'amount'
    | 'department'
    | 'approval_level'
    | 'requester'
    | 'pending_duration_days'
    | 'funding_source'
    | 'payee'
    | 'payment_method'
    | 'due_date'
    | 'consolidation_scope'
    | 'item_count';

export interface CustomRuleFieldOption {
    value: CustomRuleField;
    label: string;
    placeholder: string;
    category: 'general' | 'approval' | 'payment' | 'consolidation';
}

export const CUSTOM_RULE_FIELD_CONFIGS: Record<CustomRuleField, CustomRuleFieldOption> = {
    document_type: { value: 'document_type', label: 'Document Type', placeholder: 'e.g. Payment Request, PR', category: 'general' },
    amount: { value: 'amount', label: 'Amount (Rp)', placeholder: 'e.g. 100000000', category: 'general' },
    department: { value: 'department', label: 'Department', placeholder: 'e.g. Operations, Finance', category: 'general' },
    approval_level: { value: 'approval_level', label: 'Approval Level', placeholder: 'e.g. Tier 1, Level 2', category: 'approval' },
    requester: { value: 'requester', label: 'Requester', placeholder: 'e.g. Budi Santoso', category: 'approval' },
    pending_duration_days: { value: 'pending_duration_days', label: 'Pending Duration (days)', placeholder: 'e.g. 2', category: 'approval' },
    funding_source: { value: 'funding_source', label: 'Funding Source / Bank', placeholder: 'e.g. BCA Main Operating', category: 'payment' },
    payee: { value: 'payee', label: 'Payee / Vendor', placeholder: 'e.g. PT Jaya Beton', category: 'payment' },
    payment_method: { value: 'payment_method', label: 'Payment Method', placeholder: 'e.g. Bank Transfer, Petty Cash', category: 'payment' },
    due_date: { value: 'due_date', label: 'Due Date Condition', placeholder: 'e.g. within 3 days', category: 'payment' },
    consolidation_scope: { value: 'consolidation_scope', label: 'Consolidation Scope', placeholder: 'e.g. Purchasing, Reimbursement', category: 'consolidation' },
    item_count: { value: 'item_count', label: 'Item / Doc Count', placeholder: 'e.g. 10', category: 'consolidation' },
};

export const CUSTOM_RULE_FIELD_OPTIONS: CustomRuleFieldOption[] = Object.values(CUSTOM_RULE_FIELD_CONFIGS);

export function getContextualFieldsForTrigger(
    triggerEvent: FinanceBuiltinEventKey
): CustomRuleFieldOption[] {
    switch (triggerEvent) {
        case 'approval_required':
        case 'request_fully_approved':
        case 'request_rejected':
        case 'revision_requested':
        case 'request_cancelled':
            return [
                CUSTOM_RULE_FIELD_CONFIGS.document_type,
                CUSTOM_RULE_FIELD_CONFIGS.amount,
                CUSTOM_RULE_FIELD_CONFIGS.department,
                CUSTOM_RULE_FIELD_CONFIGS.approval_level,
                CUSTOM_RULE_FIELD_CONFIGS.requester,
                CUSTOM_RULE_FIELD_CONFIGS.pending_duration_days,
            ];
        case 'ready_for_consolidation':
        case 'consolidation_completed':
            return [
                CUSTOM_RULE_FIELD_CONFIGS.document_type,
                CUSTOM_RULE_FIELD_CONFIGS.amount,
                CUSTOM_RULE_FIELD_CONFIGS.department,
                CUSTOM_RULE_FIELD_CONFIGS.consolidation_scope,
                CUSTOM_RULE_FIELD_CONFIGS.item_count,
            ];
        case 'ready_for_payment':
        case 'payment_completed':
        case 'payment_failed':
        case 'payment_due':
            return [
                CUSTOM_RULE_FIELD_CONFIGS.document_type,
                CUSTOM_RULE_FIELD_CONFIGS.amount,
                CUSTOM_RULE_FIELD_CONFIGS.department,
                CUSTOM_RULE_FIELD_CONFIGS.funding_source,
                CUSTOM_RULE_FIELD_CONFIGS.payee,
                CUSTOM_RULE_FIELD_CONFIGS.payment_method,
                CUSTOM_RULE_FIELD_CONFIGS.due_date,
            ];
        case 'pending_approval_reminder':
            return [
                CUSTOM_RULE_FIELD_CONFIGS.document_type,
                CUSTOM_RULE_FIELD_CONFIGS.amount,
                CUSTOM_RULE_FIELD_CONFIGS.department,
                CUSTOM_RULE_FIELD_CONFIGS.pending_duration_days,
                CUSTOM_RULE_FIELD_CONFIGS.approval_level,
            ];
        default:
            return [
                CUSTOM_RULE_FIELD_CONFIGS.document_type,
                CUSTOM_RULE_FIELD_CONFIGS.amount,
                CUSTOM_RULE_FIELD_CONFIGS.department,
            ];
    }
}

export function generateHumanReadableRuleSummary(rule: Partial<FinanceCustomNotificationRule>): string {
    const recipientsList = rule.recipients && rule.recipients.length > 0
        ? rule.recipients.map((r) => r.name).join(' and ')
        : 'Assigned recipients';

    const triggerLabels: Record<FinanceBuiltinEventKey, string> = {
        approval_required: 'requires approval',
        request_fully_approved: 'is fully approved',
        request_rejected: 'is rejected',
        revision_requested: 'has revision requested',
        request_cancelled: 'is cancelled or voided',
        ready_for_consolidation: 'is ready for consolidation',
        consolidation_completed: 'consolidation is completed',
        ready_for_payment: 'becomes ready for payment',
        payment_completed: 'payment is marked completed',
        payment_failed: 'payment fails or is reversed',
        payment_due: 'approaches payment due date',
        pending_approval_reminder: 'stays pending for approval',
    };

    const triggerDesc = rule.triggerEvent && triggerLabels[rule.triggerEvent]
        ? triggerLabels[rule.triggerEvent]
        : 'a trigger event occurs';

    if (!rule.conditions || rule.conditions.length === 0) {
        return `This rule will notify ${recipientsList} whenever a document ${triggerDesc}.`;
    }

    const operatorWords: Record<CustomRuleOperator, string> = {
        equals: 'is',
        not_equals: 'is not',
        greater_than: 'above',
        greater_than_or_equal: 'at least',
        less_than: 'below',
        less_than_or_equal: 'at most',
        contains: 'contains',
    };

    const conditionClauses = rule.conditions.map((c) => {
        const fieldLabel = CUSTOM_RULE_FIELD_CONFIGS[c.field]?.label || c.field;
        const opWord = operatorWords[c.operator] || '=';
        if (c.field === 'amount') {
            const num = parseInt(c.value, 10);
            const formattedVal = !isNaN(num) ? `Rp ${num.toLocaleString('id-ID')}` : c.value;
            return `Amount ${opWord} ${formattedVal}`;
        }
        if (c.field === 'pending_duration_days') {
            return `pending duration is ${opWord} ${c.value} days`;
        }
        return `${fieldLabel} ${opWord} "${c.value}"`;
    });

    const conditionsText = conditionClauses.join(' and ');

    return `This rule will notify ${recipientsList} when a document ${triggerDesc} with ${conditionsText}.`;
}

export interface SuggestedCustomRulePreset {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    badge?: string;
    rule: Omit<FinanceCustomNotificationRule, 'id' | 'createdAt' | 'updatedAt'>;
}

export const SUGGESTED_CUSTOM_RULE_PRESETS: SuggestedCustomRulePreset[] = [
    {
        id: 'preset_high_val_payment',
        title: 'High-Value Payment Alert',
        subtitle: 'Notify Finance Manager when Payment Request > Rp 100M',
        icon: 'banknote.fill',
        badge: 'Payment',
        rule: {
            name: 'High-Value Payment Request Alert',
            enabled: true,
            triggerEvent: 'approval_required',
            conditions: [
                { id: 'c1', field: 'document_type', operator: 'equals', value: 'Payment Request' },
                { id: 'c2', field: 'amount', operator: 'greater_than', value: '100000000' },
            ],
            recipients: [{ id: 'r1', type: 'dynamic', value: 'finance_manager', name: 'Finance Manager' }],
            messageType: 'custom',
            customTitle: '⚠️ High-Value Payment Request: {{amount}}',
            customBody: 'High-value Payment Request {{document_number}} ({{amount}}) from {{requester_name}} requires approval.',
        },
    },
    {
        id: 'preset_high_val_reimbursement',
        title: 'High-Value Reimbursement Alert',
        subtitle: 'Notify Finance Manager when Reimbursement > Rp 20M',
        icon: 'receipt.fill',
        badge: 'Reimbursement',
        rule: {
            name: 'High-Value Reimbursement Alert',
            enabled: true,
            triggerEvent: 'approval_required',
            conditions: [
                { id: 'c1', field: 'document_type', operator: 'equals', value: 'Reimbursement' },
                { id: 'c2', field: 'amount', operator: 'greater_than', value: '20000000' },
            ],
            recipients: [{ id: 'r1', type: 'dynamic', value: 'finance_manager', name: 'Finance Manager' }],
            messageType: 'custom',
            customTitle: '⚠️ Large Reimbursement Request: {{amount}}',
            customBody: 'Reimbursement {{document_number}} exceeding Rp 20M submitted by {{requester_name}} requires attention.',
        },
    },
    {
        id: 'preset_approval_escalation',
        title: 'Approval Escalation',
        subtitle: 'Escalate to Dept Head when pending > 48 hours',
        icon: 'clock.badge.exclamationmark.fill',
        badge: 'Escalation',
        rule: {
            name: 'Approval Escalation Alert',
            enabled: true,
            triggerEvent: 'pending_approval_reminder',
            conditions: [
                { id: 'c1', field: 'pending_duration_days', operator: 'greater_than_or_equal', value: '2' },
            ],
            recipients: [
                { id: 'r1', type: 'dynamic', value: 'active_approver', name: 'Active Matrix Approver' },
                { id: 'r2', type: 'dynamic', value: 'dept_head', name: 'Department Head' },
            ],
            messageType: 'custom',
            customTitle: '🚨 Escalation: Pending Approval for {{document_type}}',
            customBody: 'Document {{document_number}} has been pending approval for more than 48 hours. Immediate review requested.',
        },
    },
    {
        id: 'preset_large_payment_due',
        title: 'Large Payment Due Alert',
        subtitle: 'Alert Finance Head when payment > Rp 50M approaches due date',
        icon: 'calendar.badge.clock',
        badge: 'Due Date',
        rule: {
            name: 'Large Payment Due Alert',
            enabled: true,
            triggerEvent: 'payment_due',
            conditions: [
                { id: 'c1', field: 'amount', operator: 'greater_than', value: '50000000' },
            ],
            recipients: [{ id: 'r1', type: 'dynamic', value: 'finance_manager', name: 'Finance Manager' }],
            messageType: 'custom',
            customTitle: '⏰ Large Payment Due Soon: {{amount}}',
            customBody: 'High-value payment {{document_number}} for {{amount}} is due on {{due_date}}. Ensure liquidity.',
        },
    },
    {
        id: 'preset_dept_specific',
        title: 'Department-Specific Alert',
        subtitle: 'Notify Operations Head on large departmental requests',
        icon: 'building.2.fill',
        badge: 'Department',
        rule: {
            name: 'Operations High-Value Request Alert',
            enabled: true,
            triggerEvent: 'approval_required',
            conditions: [
                { id: 'c1', field: 'department', operator: 'equals', value: 'Operations' },
                { id: 'c2', field: 'amount', operator: 'greater_than', value: '25000000' },
            ],
            recipients: [{ id: 'r1', type: 'dynamic', value: 'dept_head', name: 'Department Head' }],
            messageType: 'custom',
            customTitle: '🏢 Operations Request Alert: {{amount}}',
            customBody: 'New request {{document_number}} for Operations department exceeds Rp 25,000,000.',
        },
    },
    {
        id: 'preset_funding_source',
        title: 'Funding Source Alert',
        subtitle: 'Notify Finance Team when specific bank/funding is used',
        icon: 'creditcard.fill',
        badge: 'Funding',
        rule: {
            name: 'Main Operating Bank Disbursement Alert',
            enabled: true,
            triggerEvent: 'ready_for_payment',
            conditions: [
                { id: 'c1', field: 'funding_source', operator: 'equals', value: 'BCA Main Operating' },
            ],
            recipients: [{ id: 'r1', type: 'role', value: 'finance_team', name: 'All Finance Members' }],
            messageType: 'custom',
            customTitle: '💳 Main Account Disbursement Ready',
            customBody: 'Document {{document_number}} ({{amount}}) is ready to disburse from BCA Main Operating.',
        },
    },
    {
        id: 'preset_consolidation_threshold',
        title: 'Consolidation Threshold Alert',
        subtitle: 'Notify Consolidation Owner when batch total > Rp 100M',
        icon: 'tray.full.fill',
        badge: 'Batch',
        rule: {
            name: 'Large Consolidation Batch Alert',
            enabled: true,
            triggerEvent: 'ready_for_consolidation',
            conditions: [
                { id: 'c1', field: 'amount', operator: 'greater_than', value: '100000000' },
            ],
            recipients: [{ id: 'r1', type: 'dynamic', value: 'finance_manager', name: 'Consolidation Owner' }],
            messageType: 'custom',
            customTitle: '📦 High-Value Consolidation Batch Ready',
            customBody: 'Eligible requests exceeding Rp 100M are ready to be consolidated.',
        },
    },
    {
        id: 'preset_payment_issue',
        title: 'Payment Issue Escalation',
        subtitle: 'Alert Finance Lead immediately on payment failures',
        icon: 'exclamationmark.triangle.fill',
        badge: 'Failure',
        rule: {
            name: 'Critical Payment Issue Escalation',
            enabled: true,
            triggerEvent: 'payment_failed',
            conditions: [],
            recipients: [
                { id: 'r1', type: 'dynamic', value: 'finance_manager', name: 'Finance Manager' },
                { id: 'r2', type: 'dynamic', value: 'requester', name: 'Document Requester' },
            ],
            messageType: 'custom',
            customTitle: '❌ Action Required: Payment Failed ({{document_number}})',
            customBody: 'Payment for {{document_type}} {{document_number}} has failed or was reversed. Please take corrective action.',
        },
    },
];

export interface CustomRuleCondition {
    id: string;
    field: CustomRuleField;
    operator: CustomRuleOperator;
    value: string;
}

export interface CustomRuleRecipient {
    id: string;
    type: 'role' | 'user' | 'dynamic';
    value: string;
    name: string;
}

export interface FinanceCustomNotificationRule {
    id: string;
    name: string;
    enabled: boolean;
    triggerEvent: FinanceBuiltinEventKey;
    conditions: CustomRuleCondition[];
    recipients: CustomRuleRecipient[];
    messageType: 'template' | 'custom';
    templateId?: string;
    customTitle?: string;
    customBody?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FinanceNotificationRulesSettings {
    eventRules: Record<FinanceBuiltinEventKey, FinanceEventNotificationRule>;
    templates: Record<string, FinanceNotificationTemplate>;
    customRules: FinanceCustomNotificationRule[];
}

export const FINANCE_TEMPLATE_VARIABLES = [
    { tag: '{{requester_name}}', label: 'Requester Name', description: 'Full name of document submitter' },
    { tag: '{{document_type}}', label: 'Document Type', description: 'Name of document (e.g. Purchase Request)' },
    { tag: '{{document_number}}', label: 'Document Number', description: 'Formatted sequence code (e.g. PR-2026-0042)' },
    { tag: '{{amount}}', label: 'Amount', description: 'Formatted transaction total (e.g. Rp 15,450,000)' },
    { tag: '{{department}}', label: 'Department', description: 'Department of requester' },
    { tag: '{{approver_name}}', label: 'Approver Name', description: 'Name of active/pending approver' },
    { tag: '{{due_date}}', label: 'Due Date', description: 'Payment or invoice due date' },
    { tag: '{{payment_date}}', label: 'Payment Date', description: 'Disbursement or completion date' },
];

export const SAMPLE_FINANCE_VARIABLE_VALUES: Record<string, string> = {
    requester_name: 'Budi Santoso',
    document_type: 'Purchase Request',
    document_number: 'PR-2026-0042',
    amount: 'Rp 15,450,000',
    department: 'Operations',
    approver_name: 'Siti Rahma',
    due_date: '15 Sep 2026',
    payment_date: '10 Sep 2026',
};

export function interpolateFinanceTemplate(
    templateStr: string,
    sampleValues: Record<string, string> = SAMPLE_FINANCE_VARIABLE_VALUES
): string {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
        return sampleValues[key] !== undefined ? sampleValues[key] : `{{${key}}}`;
    });
}

export const DEFAULT_FINANCE_EVENT_RULES: Record<FinanceBuiltinEventKey, FinanceEventNotificationRule> = {
    approval_required: {
        id: 'approval_required',
        name: 'Approval Required',
        category: 'approval',
        description: 'Notifies the currently active approver determined by the document\'s Approval Matrix.',
        recipientDescription: 'Active Approver (from Approval Matrix)',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    request_fully_approved: {
        id: 'request_fully_approved',
        name: 'Request Fully Approved',
        category: 'approval',
        description: 'Notifies the relevant requester when all required approvals are completed.',
        recipientDescription: 'Document Requester',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    request_rejected: {
        id: 'request_rejected',
        name: 'Request Rejected',
        category: 'approval',
        description: 'Notifies the relevant requester when a document is rejected by any approver.',
        recipientDescription: 'Document Requester',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    revision_requested: {
        id: 'revision_requested',
        name: 'Revision Requested',
        category: 'approval',
        description: 'Notifies the requester when changes or clarifications are requested by an approver.',
        recipientDescription: 'Document Requester',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    request_cancelled: {
        id: 'request_cancelled',
        name: 'Request Cancelled / Voided',
        category: 'approval',
        description: 'Notifies relevant active workflow participants when a submitted Finance document is cancelled or voided.',
        recipientDescription: 'Current Approver / Responsible Finance',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    ready_for_consolidation: {
        id: 'ready_for_consolidation',
        name: 'Ready for Consolidation',
        category: 'consolidation',
        description: 'Notifies the responsible consolidation role/member when eligible Finance requests are ready to be grouped.',
        recipientDescription: 'Consolidation Owner / Responsible Finance',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    consolidation_completed: {
        id: 'consolidation_completed',
        name: 'Consolidation Completed',
        category: 'consolidation',
        description: 'Notifies relevant participants when a consolidation has been finalized and its included documents move to the next workflow stage.',
        recipientDescription: 'Relevant Requesters / Responsible Finance',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    ready_for_payment: {
        id: 'ready_for_payment',
        name: 'Ready for Payment',
        category: 'payment',
        description: 'Notifies the responsible Finance role/members when an eligible approved document reaches payment processing.',
        recipientDescription: 'Finance Team / Disbursement Officers',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    payment_completed: {
        id: 'payment_completed',
        name: 'Payment Completed',
        category: 'payment',
        description: 'Notifies the relevant requester or payee when payment is marked Paid.',
        recipientDescription: 'Document Requester & Payee',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    payment_failed: {
        id: 'payment_failed',
        name: 'Payment Failed / Reversed',
        category: 'payment',
        description: 'Notifies responsible Finance members when a payment fails, is returned, reversed, or requires corrective action.',
        recipientDescription: 'Responsible Finance / Payment Owner',
        enabled: true,
        appliedDocumentTypes: ['all'],
    },
    payment_due: {
        id: 'payment_due',
        name: 'Payment Due',
        category: 'payment',
        description: 'Alerts finance team prior to or upon reaching the payment due date.',
        recipientDescription: 'Responsible Finance / Payment Owner',
        enabled: true,
        paymentDueTiming: '1_day_before',
        appliedDocumentTypes: ['all'],
    },
    pending_approval_reminder: {
        id: 'pending_approval_reminder',
        name: 'Pending Approval Reminder',
        category: 'reminders',
        description: 'Sends periodic reminder notifications to the currently pending approver.',
        recipientDescription: 'Current Pending Approver',
        enabled: true,
        reminderTiming: '24_hours',
        appliedDocumentTypes: ['all'],
    },
};

export const DEFAULT_FINANCE_TEMPLATES: Record<string, FinanceNotificationTemplate> = {
    approval_required: {
        id: 'approval_required',
        eventKey: 'approval_required',
        name: 'Approval Required',
        titleTemplate: 'Approval Required: {{document_type}} {{document_number}}',
        bodyTemplate: '{{requester_name}} from {{department}} submitted {{document_type}} {{document_number}} for {{amount}}. Please review and approve.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'department', 'approver_name'],
    },
    request_fully_approved: {
        id: 'request_fully_approved',
        eventKey: 'request_fully_approved',
        name: 'Request Fully Approved',
        titleTemplate: '{{document_type}} {{document_number}} Approved',
        bodyTemplate: 'Your {{document_type}} {{document_number}} for {{amount}} has been fully approved and forwarded for processing.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'department'],
    },
    request_rejected: {
        id: 'request_rejected',
        eventKey: 'request_rejected',
        name: 'Request Rejected',
        titleTemplate: '{{document_type}} {{document_number}} Rejected',
        bodyTemplate: 'Your {{document_type}} {{document_number}} for {{amount}} has been rejected by {{approver_name}}.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'approver_name', 'department'],
    },
    revision_requested: {
        id: 'revision_requested',
        eventKey: 'revision_requested',
        name: 'Revision Requested',
        titleTemplate: 'Revision Requested: {{document_type}} {{document_number}}',
        bodyTemplate: '{{approver_name}} requested a revision on {{document_type}} {{document_number}}. Tap to review comments and update.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'approver_name', 'department'],
    },
    request_cancelled: {
        id: 'request_cancelled',
        eventKey: 'request_cancelled',
        name: 'Request Cancelled / Voided',
        titleTemplate: '{{document_type}} {{document_number}} Cancelled',
        bodyTemplate: '{{document_type}} {{document_number}} for {{amount}} submitted by {{requester_name}} has been cancelled/voided.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'department'],
    },
    ready_for_consolidation: {
        id: 'ready_for_consolidation',
        eventKey: 'ready_for_consolidation',
        name: 'Ready for Consolidation',
        titleTemplate: 'Eligible for Consolidation: {{document_type}}',
        bodyTemplate: 'Approved requests are ready to be consolidated into a batch for {{department}}.',
        availableVariables: ['document_type', 'department'],
    },
    consolidation_completed: {
        id: 'consolidation_completed',
        eventKey: 'consolidation_completed',
        name: 'Consolidation Completed',
        titleTemplate: 'Consolidation Batch {{document_number}} Finalized',
        bodyTemplate: 'Consolidation batch {{document_number}} has been finalized and moved to the payment workflow.',
        availableVariables: ['document_number', 'amount', 'department'],
    },
    ready_for_payment: {
        id: 'ready_for_payment',
        eventKey: 'ready_for_payment',
        name: 'Ready for Payment',
        titleTemplate: 'Ready for Payment: {{document_type}} {{document_number}}',
        bodyTemplate: '{{document_type}} {{document_number}} for {{amount}} submitted by {{requester_name}} is approved and ready for payment.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'department', 'due_date'],
    },
    payment_completed: {
        id: 'payment_completed',
        eventKey: 'payment_completed',
        name: 'Payment Completed',
        titleTemplate: 'Payment Completed: {{document_type}} {{document_number}}',
        bodyTemplate: 'Payment of {{amount}} for {{document_type}} {{document_number}} was disbursed on {{payment_date}}.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'payment_date'],
    },
    payment_failed: {
        id: 'payment_failed',
        eventKey: 'payment_failed',
        name: 'Payment Failed / Reversed',
        titleTemplate: 'Payment Issue: {{document_type}} {{document_number}}',
        bodyTemplate: 'Payment for {{document_type}} {{document_number}} ({{amount}}) has failed or was reversed. Please review payment status.',
        availableVariables: ['document_type', 'document_number', 'amount', 'requester_name'],
    },
    payment_due: {
        id: 'payment_due',
        eventKey: 'payment_due',
        name: 'Payment Due Soon',
        titleTemplate: 'Payment Due Soon: {{document_type}} {{document_number}}',
        bodyTemplate: 'Payment for {{document_type}} {{document_number}} ({{amount}}) is due on {{due_date}}. Please verify payment scheduling.',
        availableVariables: ['document_type', 'document_number', 'amount', 'due_date', 'requester_name'],
    },
    pending_approval_reminder: {
        id: 'pending_approval_reminder',
        eventKey: 'pending_approval_reminder',
        name: 'Pending Approval Reminder',
        titleTemplate: 'Reminder: Pending Approval for {{document_type}} {{document_number}}',
        bodyTemplate: '{{document_type}} {{document_number}} for {{amount}} from {{requester_name}} is awaiting your approval.',
        availableVariables: ['requester_name', 'document_type', 'document_number', 'amount', 'department', 'approver_name'],
    },
};

export const DEFAULT_FINANCE_CUSTOM_RULES: FinanceCustomNotificationRule[] = [
    {
        id: 'custom_high_value_pr',
        name: 'High-Value Payment Request Alert',
        enabled: true,
        triggerEvent: 'approval_required',
        conditions: [
            {
                id: 'c1',
                field: 'amount',
                operator: 'greater_than',
                value: '100000000',
            },
        ],
        recipients: [
            {
                id: 'r_finance_head',
                type: 'dynamic',
                value: 'finance_manager',
                name: 'Finance Manager',
            },
        ],
        messageType: 'custom',
        customTitle: '⚠️ High-Value {{document_type}} ({{amount}})',
        customBody: 'High-value {{document_type}} {{document_number}} for {{amount}} was submitted by {{requester_name}}. Immediate review required.',
        createdAt: '2026-09-01T08:00:00.000Z',
    },
];

export const DEFAULT_FINANCE_NOTIFICATION_SETTINGS: FinanceNotificationRulesSettings = {
    eventRules: DEFAULT_FINANCE_EVENT_RULES,
    templates: DEFAULT_FINANCE_TEMPLATES,
    customRules: DEFAULT_FINANCE_CUSTOM_RULES,
};

const FINANCE_NOTIFICATION_RULES_KEY = 'forma_finance_notification_rules_v2';

export async function getFinanceNotificationRules(): Promise<FinanceNotificationRulesSettings> {
    try {
        const raw = await AsyncStorage.getItem(FINANCE_NOTIFICATION_RULES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                eventRules: {
                    ...DEFAULT_FINANCE_EVENT_RULES,
                    ...(parsed.eventRules || {}),
                },
                templates: {
                    ...DEFAULT_FINANCE_TEMPLATES,
                    ...(parsed.templates || {}),
                },
                customRules: Array.isArray(parsed.customRules) ? parsed.customRules : DEFAULT_FINANCE_CUSTOM_RULES,
            };
        }
    } catch (e) {
        console.warn('[FinanceSetup] Failed to load notification rules', e);
    }
    return DEFAULT_FINANCE_NOTIFICATION_SETTINGS;
}

export async function saveFinanceNotificationRules(
    settings: FinanceNotificationRulesSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(FINANCE_NOTIFICATION_RULES_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('[FinanceSetup] Failed to save notification rules', e);
        throw e;
    }
}

/**
 * Returns list of active enabled documents based on Finance Document Rules settings
 */
export function getEnabledFinanceDocumentTypes(
    docRules: FinanceDocumentRulesSettings = DEFAULT_FINANCE_DOCUMENT_RULES
): Array<{ key: string; name: string; code: string; workflow: 'purchasing' | 'reimbursement' }> {
    const list: Array<{ key: string; name: string; code: string; workflow: 'purchasing' | 'reimbursement' }> = [];

    const p = docRules.purchasing.levels;
    if (p.request.enabled) {
        list.push({
            key: 'purchasing_request',
            name: p.request.customName || p.request.recommendedName || 'Purchase Request',
            code: p.request.customCode || p.request.recommendedCode || 'PR',
            workflow: 'purchasing',
        });
    }
    if (p.consolidation.enabled) {
        list.push({
            key: 'purchasing_consolidation',
            name: p.consolidation.customName || p.consolidation.recommendedName || 'Purchase Order',
            code: p.consolidation.customCode || p.consolidation.recommendedCode || 'PO',
            workflow: 'purchasing',
        });
    }
    if (p.payment.enabled) {
        list.push({
            key: 'purchasing_payment',
            name: p.payment.customName || p.payment.recommendedName || 'Purchase Payment',
            code: p.payment.customCode || p.payment.recommendedCode || 'PP',
            workflow: 'purchasing',
        });
    }

    const r = docRules.reimbursement.levels;
    if (r.request.enabled) {
        list.push({
            key: 'reimbursement_request',
            name: r.request.customName || r.request.recommendedName || 'Reimbursement Request',
            code: r.request.customCode || r.request.recommendedCode || 'RR',
            workflow: 'reimbursement',
        });
    }
    if (r.consolidation.enabled) {
        list.push({
            key: 'reimbursement_consolidation',
            name: r.consolidation.customName || r.consolidation.recommendedName || 'Reimbursement Batch',
            code: r.consolidation.customCode || r.consolidation.recommendedCode || 'RB',
            workflow: 'reimbursement',
        });
    }
    if (r.payment.enabled) {
        list.push({
            key: 'reimbursement_payment',
            name: r.payment.customName || r.payment.recommendedName || 'Reimbursement Payment',
            code: r.payment.customCode || r.payment.recommendedCode || 'RP',
            workflow: 'reimbursement',
        });
    }

    return list;
}

/**
 * Generates a formatted document code based on document rules settings and date/counter
 */
export function generateDocumentCode(
    docType: 'purchasing_request' | 'purchasing_consolidation' | 'purchasing_payment' | 'reimbursement_request' | 'reimbursement_consolidation' | 'reimbursement_payment',
    date: Date = new Date(),
    sequenceNumber: number = 1,
    docRules: FinanceDocumentRulesSettings = DEFAULT_FINANCE_DOCUMENT_RULES
): string {
    let prefix = 'DOC';
    let seqLen = 4;

    if (docType === 'purchasing_request') {
        const lvl = docRules.purchasing?.levels?.request;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'PR';
        seqLen = lvl?.sequenceLength || 4;
    } else if (docType === 'purchasing_consolidation') {
        const lvl = docRules.purchasing?.levels?.consolidation;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'PO';
        seqLen = lvl?.sequenceLength || 4;
    } else if (docType === 'purchasing_payment') {
        const lvl = docRules.purchasing?.levels?.payment;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'PP';
        seqLen = lvl?.sequenceLength || 4;
    } else if (docType === 'reimbursement_request') {
        const lvl = docRules.reimbursement?.levels?.request;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'RE';
        seqLen = lvl?.sequenceLength || 4;
    } else if (docType === 'reimbursement_consolidation') {
        const lvl = docRules.reimbursement?.levels?.consolidation;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'RC';
        seqLen = lvl?.sequenceLength || 4;
    } else if (docType === 'reimbursement_payment') {
        const lvl = docRules.reimbursement?.levels?.payment;
        prefix = lvl?.customCode || lvl?.recommendedCode || 'PV';
        seqLen = lvl?.sequenceLength || 4;
    }

    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String(sequenceNumber).padStart(seqLen, '0');

    return `${prefix}-${year}${month}-${seq}`;
}

/**
 * Calculates tax breakdown based on a subtotal and selected tax rule
 */
export function calculateTaxBreakdown(
    subtotal: number,
    taxRule?: FinanceTaxRule | null
): {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    isDeduction: boolean;
    total: number;
} {
    if (!taxRule || !taxRule.rate || taxRule.rate <= 0) {
        return {
            subtotal,
            taxRate: 0,
            taxAmount: 0,
            isDeduction: false,
            total: subtotal,
        };
    }

    const rate = taxRule.rate;
    const taxAmount = Math.round((subtotal * rate) / 100);
    const isDeduction = taxRule.taxType === 'withholding' || (taxRule as any).type === 'deduction';
    const total = isDeduction ? Math.max(0, subtotal - taxAmount) : subtotal + taxAmount;

    return {
        subtotal,
        taxRate: rate,
        taxAmount,
        isDeduction,
        total,
    };
}

/**
 * Evaluates the approval chain for a specific document and total amount
 */
export function evaluateApprovalChain(
    docKey: string,
    departmentId?: string | null,
    totalAmount: number = 0,
    approvalMatrix: FinanceApprovalMatrixSettings = DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS
): FinanceApproverLevel[] {
    const config = approvalMatrix[docKey];
    if (!config) return [];

    if (config.scope === 'global' || !config.departmentGroups?.length) {
        return config.globalChain || [];
    }

    // Check specific department group
    if (departmentId) {
        const matchedGroup = config.departmentGroups.find(
            (g) => !g.isRemainingDepartments && g.departmentIds?.includes(departmentId)
        );
        if (matchedGroup && matchedGroup.chain?.length) {
            return matchedGroup.chain;
        }
    }

    // Fallback to remaining departments group or global chain
    const remainingGroup = config.departmentGroups.find((g) => g.isRemainingDepartments);
    if (remainingGroup && remainingGroup.chain?.length) {
        return remainingGroup.chain;
    }

    return config.globalChain || [];
}

/**
 * Validates a finance form submission against active field rules
 */
export function validateFinanceForm(
    docKey: string,
    formData: {
        title?: string;
        projectId?: string;
        projectCode?: string;
        invoiceDate?: string;
        targetDate?: string;
        vendorName?: string;
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        items?: any[];
        attachments?: any[];
        paymentTermId?: string;
    },
    fieldRules: FinanceFieldRulesSettings = {}
): { isValid: boolean; errors: string[] } {
    const rules = fieldRules[docKey] || {};
    const errors: string[] = [];

    // Title / Subject
    if (rules['title'] !== false && (!formData.title || !formData.title.trim())) {
        errors.push('Title / description is required');
    }

    // Project Code
    if (rules['project'] && !formData.projectCode && !formData.projectId) {
        errors.push('Project selection is required');
    }

    // Vendor info
    if (rules['vendor'] && (!formData.vendorName || !formData.vendorName.trim())) {
        errors.push('Vendor name is required');
    }

    // Payment details / Beneficiary
    if (rules['beneficiary_account'] && (!formData.accountNumber || !formData.accountNumber.trim())) {
        errors.push('Beneficiary account number is required');
    }

    // Payment terms
    if (rules['payment_terms'] && !formData.paymentTermId) {
        errors.push('Payment terms selection is required');
    }

    // Line items
    if (rules['items'] !== false && (!formData.items || formData.items.length === 0)) {
        errors.push('At least one line item is required');
    }

    // Attachments / Proof
    if (rules['attachments'] && (!formData.attachments || formData.attachments.length === 0)) {
        errors.push('At least one receipt/attachment file is required');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}





