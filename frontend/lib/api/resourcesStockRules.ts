import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export type ThresholdMode = 'per_item' | 'global_default';

export interface StockItemOverride {
    id: string;
    itemMasterId: string;
    itemMasterName: string;
    skuCode: string;
    skuName: string;
    resourceType: ResourceTypeOption;
    minStock: number;
    reorderPoint: number;
    reorderQty?: number;
    unit: string;
    notes?: string;
    active: boolean;
}

export interface ResourcesStockRulesSettings {
    // 1. General Stock Behavior
    trackStock: boolean;
    allowNegativeStock: boolean;
    stockCalculationFormula: string;
    defaultStockUnitSource: string;

    // 2. Stock Alerts
    lowStockAlertsEnabled: boolean;
    lowStockThresholdMode: ThresholdMode;
    globalLowStockThreshold: number;
    outOfStockAlertEnabled: boolean;

    // 3. Minimum & Reorder
    minimumStockRulesEnabled: boolean;
    reorderPointMode: ThresholdMode;
    globalReorderPoint: number;
    defaultReorderQuantity?: number;

    // 4. Availability
    reservedStockTrackingEnabled: boolean;
    availableQuantityFormula: string;
    includeInTransitVisibility: boolean;

    // 5. Resource Scope
    applicableResourceTypes: ResourceTypeOption[];

    // 6. Overrides
    overrides: StockItemOverride[];
}

const STORAGE_KEY_STOCK_RULES = '@resources_stock_rules_v1';

export const DEFAULT_STOCK_OVERRIDES: StockItemOverride[] = [
    {
        id: 'ovr-1',
        itemMasterId: 'item-2',
        itemMasterName: 'Semen Portland',
        skuCode: '40 kg',
        skuName: 'Semen Gresik PCC 40 kg',
        resourceType: 'Material',
        minStock: 50,
        reorderPoint: 100,
        reorderQty: 200,
        unit: 'sak',
        notes: 'High-turnover site material. Minimum 50 sak safety buffer.',
        active: true,
    },
    {
        id: 'ovr-2',
        itemMasterId: 'item-1',
        itemMasterName: 'Impact Drill',
        skuCode: 'HP1630',
        skuName: 'Makita HP1630 13mm',
        resourceType: 'Tools',
        minStock: 2,
        reorderPoint: 4,
        reorderQty: 5,
        unit: 'unit',
        notes: 'Core project tool set pool buffer.',
        active: true,
    },
    {
        id: 'ovr-3',
        itemMasterId: 'item-4',
        itemMasterName: 'Structural Steel Beam',
        skuCode: 'WF 150x75x5x7',
        skuName: 'Wide Flange 150x75 12m',
        resourceType: 'Material',
        minStock: 10,
        reorderPoint: 20,
        reorderQty: 50,
        unit: 'btg',
        notes: 'Lead time from Cilegon mill is 5 business days.',
        active: true,
    },
];

export const DEFAULT_STOCK_RULES_SETTINGS: ResourcesStockRulesSettings = {
    trackStock: true,
    allowNegativeStock: false,
    stockCalculationFormula: 'Received − Issued/Transferred/Used',
    defaultStockUnitSource: 'Inherit from Item Master',

    lowStockAlertsEnabled: true,
    lowStockThresholdMode: 'per_item',
    globalLowStockThreshold: 10,
    outOfStockAlertEnabled: true,

    minimumStockRulesEnabled: true,
    reorderPointMode: 'per_item',
    globalReorderPoint: 20,
    defaultReorderQuantity: 50,

    reservedStockTrackingEnabled: true,
    availableQuantityFormula: 'On Hand − Reserved',
    includeInTransitVisibility: true,

    applicableResourceTypes: ['Material', 'Tools'],
    overrides: DEFAULT_STOCK_OVERRIDES,
};

export async function getResourcesStockRules(): Promise<ResourcesStockRulesSettings> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_STOCK_RULES);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load stock rules from AsyncStorage:', e);
    }
    return DEFAULT_STOCK_RULES_SETTINGS;
}

export async function saveResourcesStockRules(settings: ResourcesStockRulesSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_STOCK_RULES, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save stock rules to AsyncStorage:', e);
    }
}
