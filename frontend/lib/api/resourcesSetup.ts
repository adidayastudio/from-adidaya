import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { RoundingMethod, TIMEZONE_OPTIONS, TimezoneOption } from './financeSetup';

export type MeasurementSystem = 'metric' | 'imperial';
export type DefaultOwnership = 'organization' | 'department' | 'project';
export type DefaultCondition = 'brand_new' | 'good' | 'fair' | 'poor';
export type MeasurementType = 'count' | 'weight' | 'length' | 'volume' | 'area' | 'time' | 'custom';

export interface UnitItem {
    id: string;
    name: string;
    symbol: string;
    measurementType: MeasurementType;
    system: 'metric' | 'imperial' | 'universal';
    allowDecimals: boolean;
    isSystem: boolean;
    isActive: boolean;
    usageCount: number;
}

export interface UnitConversionItem {
    id: string;
    fromUnitSymbol: string;
    toUnitSymbol: string;
    factor: number; // e.g. 1 fromUnit = factor toUnit (1 ton = 1000 kg)
    scope: 'global' | 'item';
    itemId?: string;
    itemName?: string;
    description?: string;
}

export interface ResourcesGeneralSettings {
    measurementSystem: MeasurementSystem;
    quantityPrecision: number; // 0, 1, 2, 3, 4
    roundingMethod: RoundingMethod;
    defaultOwnership: DefaultOwnership;
    defaultCondition: DefaultCondition;
    timezone: string;
    timezoneLabel: string;
}

export const MEASUREMENT_SYSTEM_OPTIONS: Array<{
    value: MeasurementSystem;
    title: string;
    description: string;
}> = [
    {
        value: 'metric',
        title: 'Metric System',
        description: 'Kilograms (kg), Meters (m), Liters (L), etc.',
    },
    {
        value: 'imperial',
        title: 'Imperial System',
        description: 'Pounds (lb), Feet (ft), Gallons (gal), etc.',
    },
];

export const QUANTITY_PRECISION_OPTIONS = [
    { value: 0, label: '0 decimals', description: 'Whole units only (e.g. 12 kg)' },
    { value: 1, label: '1 decimal', description: 'Single decimal (e.g. 12.3 kg)' },
    { value: 2, label: '2 decimals', description: 'Standard precision (e.g. 12.35 kg)' },
    { value: 3, label: '3 decimals', description: 'High precision for bulk resources (e.g. 12.346 kg)' },
    { value: 4, label: '4 decimals', description: 'Extended precision for sensitive stock (e.g. 12.3456 kg)' },
];

export const DEFAULT_OWNERSHIP_OPTIONS: Array<{
    value: DefaultOwnership;
    title: string;
    description: string;
}> = [
    {
        value: 'organization',
        title: 'Organization (Global)',
        description: 'Resources belong to the central company asset pool.',
    },
    {
        value: 'department',
        title: 'Department',
        description: 'Resources default to the requesting/receiving department.',
    },
    {
        value: 'project',
        title: 'Project',
        description: 'Resources default to the active destination project.',
    },
];

export const DEFAULT_CONDITION_OPTIONS: Array<{
    value: DefaultCondition;
    title: string;
    description: string;
}> = [
    {
        value: 'brand_new',
        title: 'Brand New',
        description: 'Factory-sealed or freshly purchased resources.',
    },
    {
        value: 'good',
        title: 'Good Condition',
        description: 'Fully functional, operational with minor cosmetic wear.',
    },
    {
        value: 'fair',
        title: 'Fair Condition',
        description: 'Functional but may require maintenance soon.',
    },
    {
        value: 'poor',
        title: 'Poor / Maintenance Required',
        description: 'Requires inspection or servicing before deployment.',
    },
];

export const DEFAULT_RESOURCES_GENERAL_SETTINGS: ResourcesGeneralSettings = {
    measurementSystem: 'metric',
    quantityPrecision: 2,
    roundingMethod: 'standard',
    defaultOwnership: 'organization',
    defaultCondition: 'brand_new',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'Asia/Jakarta (GMT+7)',
};

export const DEFAULT_UNIT_LIBRARY: UnitItem[] = [
    // Count & Packaging
    { id: 'unit_pcs', name: 'Piece / Pieces', symbol: 'pcs', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 240 },
    { id: 'unit_box', name: 'Box', symbol: 'box', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 45 },
    { id: 'unit_set', name: 'Set', symbol: 'set', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 18 },
    { id: 'unit_pack', name: 'Pack', symbol: 'pack', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 32 },
    { id: 'unit_sak', name: 'Sak / Bag', symbol: 'sak', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 89 },
    { id: 'unit_roll', name: 'Roll', symbol: 'roll', measurementType: 'count', system: 'universal', allowDecimals: true, isSystem: true, isActive: true, usageCount: 14 },
    { id: 'unit_lot', name: 'Lot', symbol: 'lot', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 8 },
    { id: 'unit_unit', name: 'Unit', symbol: 'unit', measurementType: 'count', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 120 },

    // Weight
    { id: 'unit_kg', name: 'Kilogram', symbol: 'kg', measurementType: 'weight', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 310 },
    { id: 'unit_g', name: 'Gram', symbol: 'g', measurementType: 'weight', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 22 },
    { id: 'unit_ton', name: 'Metric Ton', symbol: 'ton', measurementType: 'weight', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 56 },
    { id: 'unit_lb', name: 'Pound', symbol: 'lb', measurementType: 'weight', system: 'imperial', allowDecimals: true, isSystem: false, isActive: false, usageCount: 0 },

    // Length
    { id: 'unit_m', name: 'Meter', symbol: 'm', measurementType: 'length', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 175 },
    { id: 'unit_cm', name: 'Centimeter', symbol: 'cm', measurementType: 'length', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 12 },
    { id: 'unit_mm', name: 'Millimeter', symbol: 'mm', measurementType: 'length', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 9 },
    { id: 'unit_ft', name: 'Feet', symbol: 'ft', measurementType: 'length', system: 'imperial', allowDecimals: true, isSystem: false, isActive: false, usageCount: 0 },

    // Volume
    { id: 'unit_l', name: 'Liter', symbol: 'L', measurementType: 'volume', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 68 },
    { id: 'unit_ml', name: 'Milliliter', symbol: 'mL', measurementType: 'volume', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 5 },
    { id: 'unit_m3', name: 'Cubic Meter', symbol: 'm³', measurementType: 'volume', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 42 },
    { id: 'unit_gal', name: 'Gallon', symbol: 'gal', measurementType: 'volume', system: 'imperial', allowDecimals: true, isSystem: false, isActive: false, usageCount: 0 },

    // Area
    { id: 'unit_m2', name: 'Square Meter', symbol: 'm²', measurementType: 'area', system: 'metric', allowDecimals: true, isSystem: true, isActive: true, usageCount: 95 },

    // Time / Service
    { id: 'unit_hr', name: 'Hour', symbol: 'hr', measurementType: 'time', system: 'universal', allowDecimals: true, isSystem: true, isActive: true, usageCount: 26 },
    { id: 'unit_day', name: 'Day', symbol: 'day', measurementType: 'time', system: 'universal', allowDecimals: true, isSystem: true, isActive: true, usageCount: 15 },
    { id: 'unit_mo', name: 'Month', symbol: 'mo', measurementType: 'time', system: 'universal', allowDecimals: false, isSystem: true, isActive: true, usageCount: 7 },
];

export const DEFAULT_UNIT_CONVERSIONS: UnitConversionItem[] = [
    {
        id: 'conv_ton_kg',
        fromUnitSymbol: 'ton',
        toUnitSymbol: 'kg',
        factor: 1000,
        scope: 'global',
        description: 'Universal metric weight conversion (1 ton = 1,000 kg)',
    },
    {
        id: 'conv_kg_g',
        fromUnitSymbol: 'kg',
        toUnitSymbol: 'g',
        factor: 1000,
        scope: 'global',
        description: 'Universal metric weight conversion (1 kg = 1,000 g)',
    },
    {
        id: 'conv_m_cm',
        fromUnitSymbol: 'm',
        toUnitSymbol: 'cm',
        factor: 100,
        scope: 'global',
        description: 'Universal metric length conversion (1 m = 100 cm)',
    },
    {
        id: 'conv_m_mm',
        fromUnitSymbol: 'm',
        toUnitSymbol: 'mm',
        factor: 1000,
        scope: 'global',
        description: 'Universal metric length conversion (1 m = 1,000 mm)',
    },
    {
        id: 'conv_box_tiles',
        fromUnitSymbol: 'box',
        toUnitSymbol: 'pcs',
        factor: 12,
        scope: 'item',
        itemName: 'Ceramic Floor Tile 40x40 (Granito)',
        description: '1 box contains 12 pcs of floor tiles',
    },
    {
        id: 'conv_sak_cement',
        fromUnitSymbol: 'sak',
        toUnitSymbol: 'kg',
        factor: 50,
        scope: 'item',
        itemName: 'Portland Cement Type I (Gresik)',
        description: '1 standard sack contains 50 kg cement',
    },
    {
        id: 'conv_roll_pipe',
        fromUnitSymbol: 'roll',
        toUnitSymbol: 'm',
        factor: 50,
        scope: 'item',
        itemName: 'HDPE Water Pipe 2 Inch',
        description: '1 continuous roll contains 50 meters',
    },
];

// Helper: Calculate formatted quantity
export function calculateFormattedQuantity(
    amount: number,
    unitSymbol: string,
    precision: number,
    roundingMethod: RoundingMethod
): string {
    let roundedAmount = amount;

    if (roundingMethod === 'none') {
        // Return without rounding
        return `${amount} ${unitSymbol}`;
    }

    const multiplier = Math.pow(10, precision);

    if (roundingMethod === 'standard') {
        roundedAmount = Math.round((amount + Number.EPSILON) * multiplier) / multiplier;
    } else if (roundingMethod === 'down') {
        roundedAmount = Math.floor((amount + Number.EPSILON) * multiplier) / multiplier;
    } else if (roundingMethod === 'up') {
        roundedAmount = Math.ceil((amount - Number.EPSILON) * multiplier) / multiplier;
    }

    return `${roundedAmount.toFixed(precision)} ${unitSymbol}`;
}

// NUMBERING & CODES DEFINITIONS

export type ResourceTypeCode = 'material' | 'tool' | 'asset' | 'service';
export type TransactionTypeCode = 'receiving' | 'transfer' | 'adjustment' | 'retirement';

export interface ResourceNumberingRule {
    resourceType: ResourceTypeCode;
    name: string;
    prefix: string; // MT, TL, AS, SV
    separator: string; // '-'
    categoryDigits: number; // 2
    subcategoryDigits: number; // 2
    itemDigits: number; // 2
    instanceDigits: number; // 2
    resetRule: 'hierarchy' | 'never';
    sampleCategorySeq: number;
    sampleSubcategorySeq: number;
    sampleItemSeq: number;
    sampleInstanceSeq: number;
}

export interface TransactionNumberingRule {
    transactionType: TransactionTypeCode;
    name: string;
    prefix: string; // RC, TR, ADJ, RET
    pattern: 'YYMMXXXX' | 'YYYYMMXXXX' | 'YYXXXX' | 'XXXX';
    startingSequence: number;
    currentSequence: number;
    digits: number; // 4
    resetRule: 'yearly' | 'monthly' | 'never';
    separator: string; // '-'
}

export interface ResourcesNumberingSettings {
    resourceRules: Record<ResourceTypeCode, ResourceNumberingRule>;
    transactionRules: Record<TransactionTypeCode, TransactionNumberingRule>;
}

export const DEFAULT_RESOURCES_NUMBERING_SETTINGS: ResourcesNumberingSettings = {
    resourceRules: {
        material: {
            resourceType: 'material',
            name: 'Materials',
            prefix: 'MT',
            separator: '-',
            categoryDigits: 2,
            subcategoryDigits: 2,
            itemDigits: 2,
            instanceDigits: 2,
            resetRule: 'hierarchy',
            sampleCategorySeq: 1,
            sampleSubcategorySeq: 2,
            sampleItemSeq: 2,
            sampleInstanceSeq: 1,
        },
        tool: {
            resourceType: 'tool',
            name: 'Tools',
            prefix: 'TL',
            separator: '-',
            categoryDigits: 2,
            subcategoryDigits: 2,
            itemDigits: 2,
            instanceDigits: 2,
            resetRule: 'hierarchy',
            sampleCategorySeq: 1,
            sampleSubcategorySeq: 1,
            sampleItemSeq: 3,
            sampleInstanceSeq: 1,
        },
        asset: {
            resourceType: 'asset',
            name: 'Assets',
            prefix: 'AS',
            separator: '-',
            categoryDigits: 2,
            subcategoryDigits: 2,
            itemDigits: 2,
            instanceDigits: 2,
            resetRule: 'hierarchy',
            sampleCategorySeq: 1,
            sampleSubcategorySeq: 2,
            sampleItemSeq: 2,
            sampleInstanceSeq: 1,
        },
        service: {
            resourceType: 'service',
            name: 'Services',
            prefix: 'SV',
            separator: '-',
            categoryDigits: 2,
            subcategoryDigits: 2,
            itemDigits: 2,
            instanceDigits: 2,
            resetRule: 'hierarchy',
            sampleCategorySeq: 1,
            sampleSubcategorySeq: 1,
            sampleItemSeq: 1,
            sampleInstanceSeq: 1,
        },
    },
    transactionRules: {
        receiving: {
            transactionType: 'receiving',
            name: 'Receiving',
            prefix: 'RC',
            pattern: 'YYMMXXXX',
            startingSequence: 1,
            currentSequence: 1,
            digits: 4,
            resetRule: 'yearly',
            separator: '-',
        },
        transfer: {
            transactionType: 'transfer',
            name: 'Transfer',
            prefix: 'TR',
            pattern: 'YYMMXXXX',
            startingSequence: 1,
            currentSequence: 1,
            digits: 4,
            resetRule: 'yearly',
            separator: '-',
        },
        adjustment: {
            transactionType: 'adjustment',
            name: 'Adjustment',
            prefix: 'AD',
            pattern: 'YYMMXXXX',
            startingSequence: 1,
            currentSequence: 1,
            digits: 4,
            resetRule: 'yearly',
            separator: '-',
        },
        retirement: {
            transactionType: 'retirement',
            name: 'Retirement',
            prefix: 'RT',
            pattern: 'YYMMXXXX',
            startingSequence: 1,
            currentSequence: 1,
            digits: 4,
            resetRule: 'yearly',
            separator: '-',
        },
    },
};

export const TRANSACTION_PATTERN_OPTIONS = [
    { value: 'YYMMXXXX', label: 'Prefix-YYMMXXXX', example: 'RC-26090001 (2-digit year + 2-digit month)' },
    { value: 'YYYYMMXXXX', label: 'Prefix-YYYYMMXXXX', example: 'RC-2026090001 (4-digit year + month)' },
    { value: 'YYXXXX', label: 'Prefix-YYXXXX', example: 'RC-260001 (Yearly sequence only)' },
    { value: 'XXXX', label: 'Prefix-XXXX', example: 'RC-0001 (Sequential numbers only)' },
];

export const TRANSACTION_RESET_OPTIONS = [
    { value: 'yearly', title: 'Yearly Reset', description: 'Sequence resets to 1 every new year. Month changes keep incrementing.' },
    { value: 'monthly', title: 'Monthly Reset', description: 'Sequence resets to 1 on the 1st of every month.' },
    { value: 'never', title: 'Never (Continuous)', description: 'Continuous incrementing sequence across years.' },
];

// Helper: Generate Resource Code Preview
export function generateResourceCodePreview(rule: ResourceNumberingRule): string {
    const catStr = String(rule.sampleCategorySeq).padStart(rule.categoryDigits, '0');
    const subStr = String(rule.sampleSubcategorySeq).padStart(rule.subcategoryDigits, '0');
    const itemStr = String(rule.sampleItemSeq).padStart(rule.itemDigits, '0');
    const instStr = String(rule.sampleInstanceSeq).padStart(rule.instanceDigits, '0');

    return `${rule.prefix}${rule.separator}${catStr}${subStr}${itemStr}${instStr}`;
}

// Helper: Generate Transaction Code Preview
export function generateTransactionCodePreview(
    rule: TransactionNumberingRule,
    date: Date = new Date(),
    sequenceNum: number = rule.currentSequence || rule.startingSequence || 1
): string {
    const yearFull = date.getFullYear();
    const yearShort = String(yearFull).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seqStr = String(sequenceNum).padStart(rule.digits, '0');

    if (rule.pattern === 'YYMMXXXX') {
        return `${rule.prefix}${rule.separator}${yearShort}${month}${seqStr}`;
    } else if (rule.pattern === 'YYYYMMXXXX') {
        return `${rule.prefix}${rule.separator}${yearFull}${month}${seqStr}`;
    } else if (rule.pattern === 'YYXXXX') {
        return `${rule.prefix}${rule.separator}${yearShort}${seqStr}`;
    } else {
        return `${rule.prefix}${rule.separator}${seqStr}`;
    }
}

// STORAGE KEYS
const STORAGE_KEY_RESOURCES_GENERAL = '@resources_setup_general_v1';
const STORAGE_KEY_UNIT_LIBRARY = '@resources_setup_unit_library_v1';
const STORAGE_KEY_UNIT_CONVERSIONS = '@resources_setup_unit_conversions_v1';
const STORAGE_KEY_RESOURCES_NUMBERING = '@resources_setup_numbering_v1';

// API / Storage Functions
export async function getResourcesGeneralSettings(): Promise<ResourcesGeneralSettings> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_RESOURCES_GENERAL);
        if (stored) {
            return { ...DEFAULT_RESOURCES_GENERAL_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Error reading resources general settings:', e);
    }
    return DEFAULT_RESOURCES_GENERAL_SETTINGS;
}

export async function saveResourcesGeneralSettings(settings: ResourcesGeneralSettings): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_RESOURCES_GENERAL, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving resources general settings:', e);
        return false;
    }
}

export async function getUnitLibrary(): Promise<UnitItem[]> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_UNIT_LIBRARY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading unit library:', e);
    }
    return DEFAULT_UNIT_LIBRARY;
}

export async function saveUnitLibrary(units: UnitItem[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_UNIT_LIBRARY, JSON.stringify(units));
        return true;
    } catch (e) {
        console.error('Error saving unit library:', e);
        return false;
    }
}

export async function getUnitConversions(): Promise<UnitConversionItem[]> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_UNIT_CONVERSIONS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading unit conversions:', e);
    }
    return DEFAULT_UNIT_CONVERSIONS;
}

export async function saveUnitConversions(conversions: UnitConversionItem[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_UNIT_CONVERSIONS, JSON.stringify(conversions));
        return true;
    } catch (e) {
        console.error('Error saving unit conversions:', e);
        return false;
    }
}

export async function getResourcesNumberingSettings(): Promise<ResourcesNumberingSettings> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_RESOURCES_NUMBERING);
        if (stored) {
            const parsed = JSON.parse(stored);
            const resRules = { ...DEFAULT_RESOURCES_NUMBERING_SETTINGS.resourceRules };
            (Object.keys(resRules) as ResourceTypeCode[]).forEach((rk) => {
                if (parsed.resourceRules?.[rk]) {
                    resRules[rk] = {
                        ...DEFAULT_RESOURCES_NUMBERING_SETTINGS.resourceRules[rk],
                        ...parsed.resourceRules[rk],
                        name: DEFAULT_RESOURCES_NUMBERING_SETTINGS.resourceRules[rk].name,
                    };
                }
            });
            const txRules = { ...DEFAULT_RESOURCES_NUMBERING_SETTINGS.transactionRules };
            (Object.keys(txRules) as TransactionTypeCode[]).forEach((tk) => {
                if (parsed.transactionRules?.[tk]) {
                    txRules[tk] = {
                        ...DEFAULT_RESOURCES_NUMBERING_SETTINGS.transactionRules[tk],
                        ...parsed.transactionRules[tk],
                        name: DEFAULT_RESOURCES_NUMBERING_SETTINGS.transactionRules[tk].name,
                    };
                }
            });
            return {
                resourceRules: resRules,
                transactionRules: txRules,
            };
        }
    } catch (e) {
        console.error('Error reading resources numbering settings:', e);
    }
    return DEFAULT_RESOURCES_NUMBERING_SETTINGS;
}

export async function saveResourcesNumberingSettings(settings: ResourcesNumberingSettings): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_RESOURCES_NUMBERING, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving resources numbering settings:', e);
        return false;
    }
}

