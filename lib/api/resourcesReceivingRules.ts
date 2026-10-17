import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export type RequirementLevel = 'Required' | 'Optional' | 'Off';
export type OverReceivingMode = 'Not Allowed' | 'Allow with Warning';
export type AutofillQtyMode = 'Expected Quantity' | 'Blank';

export interface ReceivingRequiredInfoFields {
    receivedDate: RequirementLevel;
    receivingLocation: RequirementLevel;
    receivedBy: RequirementLevel;
    condition: RequirementLevel;
    deliveryNoteNumber: RequirementLevel;
    deliveryNoteAttachment: RequirementLevel;
    itemPhoto: RequirementLevel;
    notes: RequirementLevel;
}

export interface ResourceTypeReceivingRule {
    resourceType: ResourceTypeOption;
    receivingMode: 'Physical Receiving' | 'Service Confirmation';
    allowPartial: boolean;
    requireInspection: boolean;
    customFields?: Partial<ReceivingRequiredInfoFields>;
}

export interface ResourcesReceivingRulesSettings {
    // 1. Receiving Eligibility
    financeStatusRequired: 'Paid';
    applicableResourceTypes: ResourceTypeOption[];

    // 2. Receiving Behavior
    allowPartialReceiving: boolean;
    overReceiving: OverReceivingMode;
    receiveMultipleItemsTogether: boolean;
    numberingSequencePreview: string; // e.g. 'RC-YYMMXXXX'

    // 3. Required Information
    requiredFields: ReceivingRequiredInfoFields;

    // 4. Resource Matching
    requireItemMatchingBeforeReceive: boolean;
    allowResourceTypeOverride: boolean;
    allowVariantSkuAssignment: boolean;

    // 5. Defaults
    defaultReceivingLocationId?: string;
    defaultReceivingLocationName?: string;
    defaultCondition: string;
    defaultStatusAfterReceiving: string;
    autofillReceivedQty: AutofillQtyMode;

    // 6. Resource Type Specific Rules
    typeOverrides: Record<ResourceTypeOption, ResourceTypeReceivingRule>;
}

const STORAGE_KEY_RECEIVING_RULES = '@resources_receiving_rules_v1';

export const REQUIREMENT_LEVEL_OPTIONS: RequirementLevel[] = ['Required', 'Optional', 'Off'];
export const OVER_RECEIVING_OPTIONS: OverReceivingMode[] = ['Not Allowed', 'Allow with Warning'];
export const AUTOFILL_QTY_OPTIONS: AutofillQtyMode[] = ['Expected Quantity', 'Blank'];

export const DEFAULT_REQUIRED_FIELDS: ReceivingRequiredInfoFields = {
    receivedDate: 'Required',
    receivingLocation: 'Required',
    receivedBy: 'Required',
    condition: 'Required',
    deliveryNoteNumber: 'Required',
    deliveryNoteAttachment: 'Optional',
    itemPhoto: 'Optional',
    notes: 'Optional',
};

export const DEFAULT_TYPE_OVERRIDES: Record<ResourceTypeOption, ResourceTypeReceivingRule> = {
    Material: {
        resourceType: 'Material',
        receivingMode: 'Physical Receiving',
        allowPartial: true,
        requireInspection: true,
    },
    Tools: {
        resourceType: 'Tools',
        receivingMode: 'Physical Receiving',
        allowPartial: true,
        requireInspection: true,
    },
    Assets: {
        resourceType: 'Assets',
        receivingMode: 'Physical Receiving',
        allowPartial: false,
        requireInspection: true,
    },
    Services: {
        resourceType: 'Services',
        receivingMode: 'Service Confirmation',
        allowPartial: true,
        requireInspection: false,
    },
    None: {
        resourceType: 'None',
        receivingMode: 'Service Confirmation',
        allowPartial: false,
        requireInspection: false,
    },
};

export const DEFAULT_RECEIVING_RULES_SETTINGS: ResourcesReceivingRulesSettings = {
    financeStatusRequired: 'Paid',
    applicableResourceTypes: ['Material', 'Tools', 'Assets', 'Services'],
    allowPartialReceiving: true,
    overReceiving: 'Not Allowed',
    receiveMultipleItemsTogether: true,
    numberingSequencePreview: 'RC-26090001',
    requiredFields: DEFAULT_REQUIRED_FIELDS,
    requireItemMatchingBeforeReceive: true,
    allowResourceTypeOverride: true,
    allowVariantSkuAssignment: true,
    defaultReceivingLocationId: 'loc-wh-1',
    defaultReceivingLocationName: 'Warehouse A',
    defaultCondition: 'Good',
    defaultStatusAfterReceiving: 'Available',
    autofillReceivedQty: 'Expected Quantity',
    typeOverrides: DEFAULT_TYPE_OVERRIDES,
};

export async function getResourcesReceivingRules(): Promise<ResourcesReceivingRulesSettings> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_RECEIVING_RULES);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load receiving rules from AsyncStorage:', e);
    }
    return DEFAULT_RECEIVING_RULES_SETTINGS;
}

export async function saveResourcesReceivingRules(
    settings: ResourcesReceivingRulesSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_RECEIVING_RULES, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save receiving rules to AsyncStorage:', e);
    }
}
