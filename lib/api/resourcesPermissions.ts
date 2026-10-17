import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export type ResourceAccessScope =
    | 'All Resources'
    | 'Own Department'
    | 'Selected Departments'
    | 'Assigned Project';

export type LocationAccessScope = 'All Locations' | 'Assigned Locations Only';

export type PermissionState = 'Allowed' | 'Restricted' | 'Not Allowed';

export interface ResourceRoleProfile {
    id: string;
    name: string;
    roleLevel: string;
    description: string;
    isSystem: boolean;
    accessScope: {
        resourceAccess: ResourceAccessScope;
        locationAccess: LocationAccessScope;
        resourceTypes: ResourceTypeOption[];
    };
    actions: {
        viewResources: PermissionState;
        createEditItemMaster: PermissionState;
        mergeDuplicateItems: PermissionState;
        receiveResources: PermissionState;
        editReceiving: PermissionState;
        transferResources: PermissionState;
        changeOwnershipCustody: PermissionState;
        adjustStock: PermissionState;
        changeConditionStatus: PermissionState;
        retireArchiveResource: PermissionState;
    };
    financialVisibility: {
        viewAcquisitionValue: boolean;
        viewFinanceSource: boolean;
        viewInvoicePaymentReferences: boolean;
    };
}

export interface ResourcesPermissionsSettings {
    roles: ResourceRoleProfile[];
    activeRoleId: string;
}

const STORAGE_KEY_PERMISSIONS = '@resources_permissions_v1';

export const RESOURCE_ACCESS_OPTIONS: ResourceAccessScope[] = [
    'All Resources',
    'Own Department',
    'Selected Departments',
    'Assigned Project',
];

export const LOCATION_ACCESS_OPTIONS: LocationAccessScope[] = [
    'All Locations',
    'Assigned Locations Only',
];

export const PERMISSION_STATE_OPTIONS: PermissionState[] = ['Allowed', 'Restricted', 'Not Allowed'];

export const DEFAULT_RESOURCE_ROLES: ResourceRoleProfile[] = [
    {
        id: 'role-wh-mgr',
        name: 'Warehouse Manager',
        roleLevel: 'Manager / Lead',
        description: 'Full operational control over catalog, intake, storage, and transfers.',
        isSystem: true,
        accessScope: {
            resourceAccess: 'All Resources',
            locationAccess: 'All Locations',
            resourceTypes: ['Material', 'Tools', 'Assets', 'Services'],
        },
        actions: {
            viewResources: 'Allowed',
            createEditItemMaster: 'Allowed',
            mergeDuplicateItems: 'Allowed',
            receiveResources: 'Allowed',
            editReceiving: 'Allowed',
            transferResources: 'Allowed',
            changeOwnershipCustody: 'Allowed',
            adjustStock: 'Allowed',
            changeConditionStatus: 'Allowed',
            retireArchiveResource: 'Allowed',
        },
        financialVisibility: {
            viewAcquisitionValue: true,
            viewFinanceSource: true,
            viewInvoicePaymentReferences: false,
        },
    },
    {
        id: 'role-site-supv',
        name: 'Site Supervisor',
        roleLevel: 'Field Operations',
        description: 'Receiving and tool custody management for assigned project locations.',
        isSystem: true,
        accessScope: {
            resourceAccess: 'Assigned Project',
            locationAccess: 'Assigned Locations Only',
            resourceTypes: ['Material', 'Tools'],
        },
        actions: {
            viewResources: 'Allowed',
            createEditItemMaster: 'Not Allowed',
            mergeDuplicateItems: 'Not Allowed',
            receiveResources: 'Allowed',
            editReceiving: 'Restricted',
            transferResources: 'Allowed',
            changeOwnershipCustody: 'Allowed',
            adjustStock: 'Not Allowed',
            changeConditionStatus: 'Allowed',
            retireArchiveResource: 'Not Allowed',
        },
        financialVisibility: {
            viewAcquisitionValue: false,
            viewFinanceSource: false,
            viewInvoicePaymentReferences: false,
        },
    },
    {
        id: 'role-prj-eng',
        name: 'Project Engineer',
        roleLevel: 'Engineering',
        description: 'Material specifications and site transfer requests.',
        isSystem: false,
        accessScope: {
            resourceAccess: 'Assigned Project',
            locationAccess: 'Assigned Locations Only',
            resourceTypes: ['Material', 'Tools', 'Assets'],
        },
        actions: {
            viewResources: 'Allowed',
            createEditItemMaster: 'Restricted',
            mergeDuplicateItems: 'Not Allowed',
            receiveResources: 'Restricted',
            editReceiving: 'Not Allowed',
            transferResources: 'Allowed',
            changeOwnershipCustody: 'Restricted',
            adjustStock: 'Not Allowed',
            changeConditionStatus: 'Restricted',
            retireArchiveResource: 'Not Allowed',
        },
        financialVisibility: {
            viewAcquisitionValue: false,
            viewFinanceSource: false,
            viewInvoicePaymentReferences: false,
        },
    },
    {
        id: 'role-fin-auditor',
        name: 'Finance Auditor',
        roleLevel: 'Finance & Compliance',
        description: 'Full visibility on acquisition values and linked finance source records.',
        isSystem: true,
        accessScope: {
            resourceAccess: 'All Resources',
            locationAccess: 'All Locations',
            resourceTypes: ['Material', 'Tools', 'Assets', 'Services'],
        },
        actions: {
            viewResources: 'Allowed',
            createEditItemMaster: 'Not Allowed',
            mergeDuplicateItems: 'Not Allowed',
            receiveResources: 'Not Allowed',
            editReceiving: 'Not Allowed',
            transferResources: 'Not Allowed',
            changeOwnershipCustody: 'Not Allowed',
            adjustStock: 'Not Allowed',
            changeConditionStatus: 'Not Allowed',
            retireArchiveResource: 'Not Allowed',
        },
        financialVisibility: {
            viewAcquisitionValue: true,
            viewFinanceSource: true,
            viewInvoicePaymentReferences: true,
        },
    },
    {
        id: 'role-gen-staff',
        name: 'General Staff',
        roleLevel: 'General Member',
        description: 'Basic resource lookup and individual custody confirmation.',
        isSystem: false,
        accessScope: {
            resourceAccess: 'Own Department',
            locationAccess: 'Assigned Locations Only',
            resourceTypes: ['Tools'],
        },
        actions: {
            viewResources: 'Allowed',
            createEditItemMaster: 'Not Allowed',
            mergeDuplicateItems: 'Not Allowed',
            receiveResources: 'Not Allowed',
            editReceiving: 'Not Allowed',
            transferResources: 'Not Allowed',
            changeOwnershipCustody: 'Restricted',
            adjustStock: 'Not Allowed',
            changeConditionStatus: 'Not Allowed',
            retireArchiveResource: 'Not Allowed',
        },
        financialVisibility: {
            viewAcquisitionValue: false,
            viewFinanceSource: false,
            viewInvoicePaymentReferences: false,
        },
    },
];

export const DEFAULT_RESOURCES_PERMISSIONS_SETTINGS: ResourcesPermissionsSettings = {
    roles: DEFAULT_RESOURCE_ROLES,
    activeRoleId: 'role-wh-mgr',
};

export async function getResourcesPermissions(): Promise<ResourcesPermissionsSettings> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_PERMISSIONS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load permissions settings from AsyncStorage:', e);
    }
    return DEFAULT_RESOURCES_PERMISSIONS_SETTINGS;
}

export async function saveResourcesPermissions(
    settings: ResourcesPermissionsSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save permissions settings to AsyncStorage:', e);
    }
}
