import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';
import { RequirementLevel } from './resourcesReceivingRules';

export type OwnerScope = 'Organization' | 'Department' | 'Project';
export type CustodianType = 'Person' | 'Department' | 'Project';
export type ApprovalMode = 'No Approval' | 'Single Approval' | 'Approval Matrix';
export type TransferScopeOption =
    | 'Location to Location'
    | 'Department to Department'
    | 'Project to Project'
    | 'Custodian Handover';
export type TransferConditionMode = 'Inherit Current Condition' | 'Require Condition Check';
export type RecipientRequirement = 'Required' | 'Optional';

export interface TransferRequiredInfoFields {
    transferDate: RequirementLevel;
    fromLocation: RequirementLevel;
    toLocation: RequirementLevel;
    fromOwner: RequirementLevel;
    toOwner: RequirementLevel;
    quantity: RequirementLevel;
    condition: RequirementLevel;
    recipient: RequirementLevel;
    attachment: RequirementLevel;
    notes: RequirementLevel;
}

export interface ResourceTypeTransferOverride {
    resourceType: ResourceTypeOption;
    allowTransfer: boolean;
    transferUnit: 'Quantity Based' | 'Serialized / Unit Based' | 'Not Applicable';
    requireApproval: boolean;
    requireHandoverSignoff: boolean;
}

export interface ResourcesTransferOwnershipSettings {
    // 1. Ownership Rules
    defaultOwnerScope: OwnerScope;
    allowOwnershipChange: boolean;
    requireOwner: boolean;

    // 2. Custody (Tools & Assets)
    enableCustodyTracking: boolean;
    allowIndividualAssignment: boolean;
    custodianType: CustodianType;
    requireHandoverConfirmation: boolean;

    // 3. Transfer Scope & Requirements
    defaultTransferScope: TransferScopeOption;
    numberingSequencePreview: string; // e.g. 'TR-26090001'
    requiredFields: TransferRequiredInfoFields;

    // 4. Approvals
    requireTransferApproval: boolean;
    approvalMode: ApprovalMode;

    // 5. Defaults
    defaultDestinationLocationId?: string;
    defaultDestinationLocationName?: string;
    defaultTransferCondition: TransferConditionMode;
    defaultRecipientRequirement: RecipientRequirement;

    // 6. Type-specific rules
    typeOverrides: Record<ResourceTypeOption, ResourceTypeTransferOverride>;
}

const STORAGE_KEY_TRANSFER_OWNERSHIP = '@resources_transfer_ownership_v1';

export const OWNER_SCOPE_OPTIONS: OwnerScope[] = ['Organization', 'Department', 'Project'];
export const CUSTODIAN_TYPE_OPTIONS: CustodianType[] = ['Person', 'Department', 'Project'];
export const APPROVAL_MODE_OPTIONS: ApprovalMode[] = ['No Approval', 'Single Approval', 'Approval Matrix'];
export const TRANSFER_SCOPE_OPTIONS: TransferScopeOption[] = [
    'Location to Location',
    'Department to Department',
    'Project to Project',
    'Custodian Handover',
];
export const TRANSFER_CONDITION_OPTIONS: TransferConditionMode[] = [
    'Inherit Current Condition',
    'Require Condition Check',
];
export const RECIPIENT_REQ_OPTIONS: RecipientRequirement[] = ['Required', 'Optional'];

export const DEFAULT_TRANSFER_REQUIRED_FIELDS: TransferRequiredInfoFields = {
    transferDate: 'Required',
    fromLocation: 'Required',
    toLocation: 'Required',
    fromOwner: 'Optional',
    toOwner: 'Optional',
    quantity: 'Required',
    condition: 'Required',
    recipient: 'Required',
    attachment: 'Optional',
    notes: 'Optional',
};

export const DEFAULT_TRANSFER_TYPE_OVERRIDES: Record<ResourceTypeOption, ResourceTypeTransferOverride> = {
    Material: {
        resourceType: 'Material',
        allowTransfer: true,
        transferUnit: 'Quantity Based',
        requireApproval: false,
        requireHandoverSignoff: false,
    },
    Tools: {
        resourceType: 'Tools',
        allowTransfer: true,
        transferUnit: 'Serialized / Unit Based',
        requireApproval: true,
        requireHandoverSignoff: true,
    },
    Assets: {
        resourceType: 'Assets',
        allowTransfer: true,
        transferUnit: 'Serialized / Unit Based',
        requireApproval: true,
        requireHandoverSignoff: true,
    },
    Services: {
        resourceType: 'Services',
        allowTransfer: false,
        transferUnit: 'Not Applicable',
        requireApproval: false,
        requireHandoverSignoff: false,
    },
    None: {
        resourceType: 'None',
        allowTransfer: false,
        transferUnit: 'Not Applicable',
        requireApproval: false,
        requireHandoverSignoff: false,
    },
};

export const DEFAULT_TRANSFER_OWNERSHIP_SETTINGS: ResourcesTransferOwnershipSettings = {
    defaultOwnerScope: 'Organization',
    allowOwnershipChange: true,
    requireOwner: false,
    enableCustodyTracking: true,
    allowIndividualAssignment: true,
    custodianType: 'Person',
    requireHandoverConfirmation: true,
    defaultTransferScope: 'Location to Location',
    numberingSequencePreview: 'TR-26090001',
    requiredFields: DEFAULT_TRANSFER_REQUIRED_FIELDS,
    requireTransferApproval: true,
    approvalMode: 'Single Approval',
    defaultDestinationLocationId: 'loc-wh-1',
    defaultDestinationLocationName: 'Warehouse A',
    defaultTransferCondition: 'Inherit Current Condition',
    defaultRecipientRequirement: 'Required',
    typeOverrides: DEFAULT_TRANSFER_TYPE_OVERRIDES,
};

export async function getResourcesTransferOwnership(): Promise<ResourcesTransferOwnershipSettings> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_TRANSFER_OWNERSHIP);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load transfer & ownership settings from AsyncStorage:', e);
    }
    return DEFAULT_TRANSFER_OWNERSHIP_SETTINGS;
}

export async function saveResourcesTransferOwnership(
    settings: ResourcesTransferOwnershipSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_TRANSFER_OWNERSHIP, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save transfer & ownership settings to AsyncStorage:', e);
    }
}
