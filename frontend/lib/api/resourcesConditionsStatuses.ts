import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export interface ResourceConditionItem {
    id: string;
    name: string; // e.g. 'New', 'Good', 'Fair', 'Damaged', 'Under Repair', 'Lost', 'Retired'
    resourceType: ResourceTypeOption;
    color: string;
    icon: string;
    description?: string;
    active: boolean;
    isSystemDefault?: boolean;
    order: number;
}

export interface ResourceLifecycleStatusItem {
    id: string;
    name: string; // e.g. 'Available', 'Assigned', 'In Use', 'Maintenance', 'Transferred', 'Retired', 'Reserved'
    resourceType: ResourceTypeOption;
    color: string;
    icon: string;
    description?: string;
    active: boolean;
    isTerminal: boolean; // Terminal state like Retired, Cancelled, Discontinued
    allowManualChange: boolean; // Available for manual user picking in forms
    isSystemRequired?: boolean;
    order: number;
}

export type DamagedBehaviorOption = 'Available' | 'Quarantine' | 'Maintenance';

export interface ResourceConditionDefaults {
    defaultConditionMaterial: string;
    defaultConditionTools: string;
    defaultConditionAssets: string;
    defaultConditionServices: string;
    defaultStatusAfterReceiving: string;
    damagedItemBehavior: DamagedBehaviorOption;
}

export interface ResourcesConditionsStatusesSettings {
    conditions: ResourceConditionItem[];
    statuses: ResourceLifecycleStatusItem[];
    defaults: ResourceConditionDefaults;
}

const STORAGE_KEY_CONDITIONS_STATUSES = '@resources_conditions_statuses_v1';

export const DEFAULT_CONDITIONS: ResourceConditionItem[] = [
    // Tools / Assets Conditions
    { id: 'c-1', name: 'New', resourceType: 'Tools', color: '#34C759', icon: 'sparkles', description: 'Brand new, unopened or unused', active: true, isSystemDefault: true, order: 1 },
    { id: 'c-2', name: 'Good', resourceType: 'Tools', color: '#007AFF', icon: 'checkmark.circle.fill', description: 'Fully functional, normal wear', active: true, isSystemDefault: true, order: 2 },
    { id: 'c-3', name: 'Fair', resourceType: 'Tools', color: '#FF9500', icon: 'exclamationmark.circle.fill', description: 'Usable with minor cosmetic wear', active: true, order: 3 },
    { id: 'c-4', name: 'Damaged', resourceType: 'Tools', color: '#FF3B30', icon: 'bolt.slash.fill', description: 'Non-functional or physically broken', active: true, order: 4 },
    { id: 'c-5', name: 'Under Repair', resourceType: 'Tools', color: '#AF52DE', icon: 'wrench.and.screwdriver.fill', description: 'Currently undergoing maintenance', active: true, order: 5 },
    { id: 'c-6', name: 'Lost', resourceType: 'Tools', color: '#8E8E93', icon: 'questionmark.circle.fill', description: 'Missing from project inventory', active: true, order: 6 },
    { id: 'c-7', name: 'Retired', resourceType: 'Tools', color: '#64748B', icon: 'archivebox.fill', description: 'Decommissioned from tool pool', active: true, order: 7 },

    // Material Conditions
    { id: 'c-11', name: 'New', resourceType: 'Material', color: '#34C759', icon: 'sparkles', description: 'Original packaging & factory quality', active: true, isSystemDefault: true, order: 1 },
    { id: 'c-12', name: 'Good', resourceType: 'Material', color: '#007AFF', icon: 'checkmark.circle.fill', description: 'Standard acceptable quality stock', active: true, order: 2 },
    { id: 'c-13', name: 'Fair', resourceType: 'Material', color: '#FF9500', icon: 'exclamationmark.circle.fill', description: 'Open packaging or cosmetic blemish', active: true, order: 3 },
    { id: 'c-14', name: 'Damaged', resourceType: 'Material', color: '#FF3B30', icon: 'bolt.slash.fill', description: 'Unusable, broken, or water-damaged', active: true, order: 4 },
    { id: 'c-15', name: 'Lost', resourceType: 'Material', color: '#8E8E93', icon: 'questionmark.circle.fill', description: 'Missing from site or warehouse', active: true, order: 5 },
    { id: 'c-16', name: 'Retired', resourceType: 'Material', color: '#64748B', icon: 'archivebox.fill', description: 'Written off or disposed', active: true, order: 6 },

    // Assets Conditions
    { id: 'c-21', name: 'New', resourceType: 'Assets', color: '#34C759', icon: 'sparkles', description: 'Fresh asset deployment', active: true, isSystemDefault: true, order: 1 },
    { id: 'c-22', name: 'Good', resourceType: 'Assets', color: '#007AFF', icon: 'checkmark.circle.fill', description: 'Optimal operating condition', active: true, order: 2 },
    { id: 'c-23', name: 'Fair', resourceType: 'Assets', color: '#FF9500', icon: 'exclamationmark.circle.fill', description: 'Operational with visible cosmetic wear', active: true, order: 3 },
    { id: 'c-24', name: 'Damaged', resourceType: 'Assets', color: '#FF3B30', icon: 'bolt.slash.fill', description: 'Hardware failure or physical damage', active: true, order: 4 },
    { id: 'c-25', name: 'Under Repair', resourceType: 'Assets', color: '#AF52DE', icon: 'wrench.and.screwdriver.fill', description: 'In workshop or vendor service', active: true, order: 5 },
    { id: 'c-26', name: 'Lost', resourceType: 'Assets', color: '#8E8E93', icon: 'questionmark.circle.fill', description: 'Unaccounted asset', active: true, order: 6 },
    { id: 'c-27', name: 'Retired', resourceType: 'Assets', color: '#64748B', icon: 'archivebox.fill', description: 'Fully depreciated & decommissioned', active: true, order: 7 },

    // Services Conditions
    { id: 'c-31', name: 'Good / Standard', resourceType: 'Services', color: '#34C759', icon: 'checkmark.shield.fill', description: 'Service meets all contractual scope', active: true, isSystemDefault: true, order: 1 },
    { id: 'c-32', name: 'Needs Revision', resourceType: 'Services', color: '#FF9500', icon: 'arrow.triangle.2.circlepath', description: 'Deliverable requires rework or revision', active: true, order: 2 },
    { id: 'c-33', name: 'Damaged / Rejected', resourceType: 'Services', color: '#FF3B30', icon: 'bolt.slash.fill', description: 'Failed inspection or rejected deliverable', active: true, order: 3 },
    { id: 'c-34', name: 'Retired', resourceType: 'Services', color: '#64748B', icon: 'archivebox.fill', description: 'Discontinued service standard', active: true, order: 4 },
];

export const DEFAULT_STATUSES: ResourceLifecycleStatusItem[] = [
    // Tools / Assets Lifecycle Statuses
    { id: 's-1', name: 'Available', resourceType: 'Tools', color: '#34C759', icon: 'checkmark.circle.fill', description: 'Ready for assignment in warehouse pool', active: true, isTerminal: false, allowManualChange: true, isSystemRequired: true, order: 1 },
    { id: 's-2', name: 'Assigned', resourceType: 'Tools', color: '#007AFF', icon: 'person.badge.shield.checkmark.fill', description: 'Assigned to crew or supervisor', active: true, isTerminal: false, allowManualChange: true, isSystemRequired: true, order: 2 },
    { id: 's-3', name: 'In Use', resourceType: 'Tools', color: '#5856D6', icon: 'hammer.fill', description: 'Active on project site', active: true, isTerminal: false, allowManualChange: true, order: 3 },
    { id: 's-4', name: 'Maintenance', resourceType: 'Tools', color: '#FF9500', icon: 'wrench.and.screwdriver.fill', description: 'In workshop or vendor repair', active: true, isTerminal: false, allowManualChange: true, order: 4 },
    { id: 's-5', name: 'Transferred', resourceType: 'Tools', color: '#00C7BE', icon: 'arrow.left.arrow.right', description: 'En route between sites', active: true, isTerminal: false, allowManualChange: false, order: 5 },
    { id: 's-6', name: 'Retired', resourceType: 'Tools', color: '#64748B', icon: 'archivebox.fill', description: 'No longer in active service', active: true, isTerminal: true, allowManualChange: true, isSystemRequired: true, order: 6 },

    // Material Lifecycle Statuses
    { id: 's-11', name: 'Available', resourceType: 'Material', color: '#34C759', icon: 'checkmark.circle.fill', description: 'Available for site usage and transfer', active: true, isTerminal: false, allowManualChange: true, isSystemRequired: true, order: 1 },
    { id: 's-12', name: 'Reserved', resourceType: 'Material', color: '#FF9500', icon: 'lock.fill', description: 'Allocated for specific work package', active: true, isTerminal: false, allowManualChange: true, order: 2 },
    { id: 's-13', name: 'Out of Stock', resourceType: 'Material', color: '#FF3B30', icon: 'slash.circle.fill', description: 'Zero on-hand balance', active: true, isTerminal: false, allowManualChange: false, order: 3 },
    { id: 's-14', name: 'Discontinued', resourceType: 'Material', color: '#64748B', icon: 'xmark.circle.fill', description: 'No longer procured', active: true, isTerminal: true, allowManualChange: true, order: 4 },

    // Services Lifecycle Statuses
    { id: 's-21', name: 'Awaiting', resourceType: 'Services', color: '#8E8E93', icon: 'clock.fill', description: 'Scheduled but not started', active: true, isTerminal: false, allowManualChange: true, order: 1 },
    { id: 's-22', name: 'In Progress', resourceType: 'Services', color: '#007AFF', icon: 'play.circle.fill', description: 'Service engagement ongoing', active: true, isTerminal: false, allowManualChange: true, isSystemRequired: true, order: 2 },
    { id: 's-23', name: 'Completed', resourceType: 'Services', color: '#34C759', icon: 'checkmark.seal.fill', description: 'Service finalized and approved', active: true, isTerminal: true, allowManualChange: true, isSystemRequired: true, order: 3 },
    { id: 's-24', name: 'Cancelled', resourceType: 'Services', color: '#FF3B30', icon: 'xmark.circle.fill', description: 'Cancelled contract or task', active: true, isTerminal: true, allowManualChange: true, order: 4 },
];

export const DEFAULT_CONDITIONS_STATUSES_SETTINGS: ResourcesConditionsStatusesSettings = {
    conditions: DEFAULT_CONDITIONS,
    statuses: DEFAULT_STATUSES,
    defaults: {
        defaultConditionMaterial: 'New',
        defaultConditionTools: 'Good',
        defaultConditionAssets: 'New',
        defaultConditionServices: 'Good / Standard',
        defaultStatusAfterReceiving: 'Available',
        damagedItemBehavior: 'Quarantine',
    },
};

export async function getResourcesConditionsStatuses(): Promise<ResourcesConditionsStatusesSettings> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_CONDITIONS_STATUSES);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load conditions & statuses from AsyncStorage:', e);
    }
    return DEFAULT_CONDITIONS_STATUSES_SETTINGS;
}

export async function saveResourcesConditionsStatuses(
    settings: ResourcesConditionsStatusesSettings
): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_CONDITIONS_STATUSES, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save conditions & statuses to AsyncStorage:', e);
    }
}
