import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';
import { AuditLogItem } from '@/components/clock/setup/AuditLogDetailSheet';

export interface ResourcesAuditLogItem extends AuditLogItem {
    documentNumber?: string;
    resourceType?: ResourceTypeOption;
    dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
    sourceModule?: string;
    affectedRecord?: string;
}

const STORAGE_KEY_AUDIT_LOGS = '@resources_audit_logs_v1';

export const DEFAULT_RESOURCES_AUDIT_LOGS: ResourcesAuditLogItem[] = [
    {
        id: 'aud-res-01',
        actor: 'Budi Santoso',
        actorRole: 'Warehouse Lead',
        action: 'Receiving Confirmed (Full Delivery)',
        detail: 'Confirmed delivery receipt for 100 bags of Semen Portland 40kg into Warehouse A.',
        time: 'Today, 10:42 AM',
        category: 'Setup Changes',
        icon: 'checkmark.shield.fill',
        iconColor: '#34C759',
        documentNumber: 'RC-26090001',
        targetModule: 'Receiving',
        resourceType: 'Material',
        oldValue: 'Status: In Transit (Pending Receipt)',
        newValue: 'Status: Available (Qty: 100 Sak)',
        affectedRecord: 'Semen Portland Gresik 40 kg',
        dateKey: 'today',
        timestampIso: new Date().toISOString(),
    },
    {
        id: 'aud-res-02',
        actor: 'Rian Pratama',
        actorRole: 'Site Supervisor',
        action: 'Tool Custody Handover Accepted',
        detail: 'Handover of 2 units Makita Rotary Hammer HP1630 accepted for Precision Gym Site.',
        time: 'Today, 09:15 AM',
        category: 'Requests & Approvals',
        icon: 'person.badge.shield.checkmark.fill',
        iconColor: '#007AFF',
        documentNumber: 'TR-26090004',
        targetModule: 'Transfer & Custody',
        resourceType: 'Tools',
        oldValue: 'Custodian: Warehouse Pool (Central Hub)',
        newValue: 'Custodian: Rian Pratama (Precision Gym Site)',
        affectedRecord: 'Makita HP1630 Rotary Hammer [SN: MK-2026-881]',
        dateKey: 'today',
        timestampIso: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
        id: 'aud-res-03',
        actor: 'Siti Aminah',
        actorRole: 'Procurement & Logistics',
        action: 'Item Candidate Matched to Master',
        detail: 'Matched unclassified purchasing invoice item "Semen Gresik 40kg" to Item Master MT-001.',
        time: 'Yesterday, 04:30 PM',
        category: 'Setup Changes',
        icon: 'link.badge.plus',
        iconColor: '#AF52DE',
        documentNumber: 'PO-2026-0412',
        targetModule: 'Item Master',
        resourceType: 'Material',
        oldValue: 'Unmatched Candidate: Semen Gresik 40kg',
        newValue: 'Item Master SKU: MT-001-GRS-40',
        affectedRecord: 'Semen Portland Gresik 40 kg',
        dateKey: 'last_7_days',
        timestampIso: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'aud-res-04',
        actor: 'Hendra Gunawan',
        actorRole: 'Inventory Controller',
        action: 'Stock Level Adjusted',
        detail: 'Physical cycle count adjustment in Storage Rack B-02. Discrepancy reconciled.',
        time: '11 Sep 2026, 02:10 PM',
        category: 'Setup Changes',
        icon: 'square.and.pencil',
        iconColor: '#FF9500',
        documentNumber: 'ADJ-2609002',
        targetModule: 'Stock Rules',
        resourceType: 'Tools',
        oldValue: 'On Hand Qty: 12 Units',
        newValue: 'On Hand Qty: 14 Units (+2 Found in Rack B)',
        affectedRecord: 'Bosch Professional Angle Grinder GWS 700',
        dateKey: 'last_7_days',
        timestampIso: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'aud-res-05',
        actor: 'Budi Santoso',
        actorRole: 'Warehouse Lead',
        action: 'Partial Receiving Logged',
        detail: 'Received 40 of 100 meters NYM 3x2.5mm Cable. 60 meters remaining backorder.',
        time: '08 Sep 2026, 11:20 AM',
        category: 'Setup Changes',
        icon: 'arrow.down.doc.fill',
        iconColor: '#FF9500',
        documentNumber: 'RC-26090000',
        targetModule: 'Receiving',
        resourceType: 'Material',
        oldValue: 'Expected: 100 m | Received: 0 m',
        newValue: 'Received: 40 m | Remaining: 60 m',
        affectedRecord: 'Supreme Kabel NYM 3x2.5 mm²',
        dateKey: 'last_30_days',
        timestampIso: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
        id: 'aud-res-06',
        actor: 'Admin System',
        actorRole: 'System Administrator',
        action: 'Role Permission Policy Updated',
        detail: 'Updated Site Supervisor role: Allowed transfer creation and restricted Item Master editing.',
        time: '02 Sep 2026, 09:00 AM',
        category: 'Security / Access',
        icon: 'lock.shield.fill',
        iconColor: '#AF52DE',
        targetModule: 'Permissions & Visibility',
        oldValue: 'Site Supervisor: Item Master [Allowed]',
        newValue: 'Site Supervisor: Item Master [Not Allowed]',
        affectedRecord: 'Role: Site Supervisor',
        dateKey: 'this_month',
        timestampIso: new Date(Date.now() - 86400000 * 11).toISOString(),
    },
];

export async function getResourcesAuditLogs(): Promise<ResourcesAuditLogItem[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load resources audit logs from AsyncStorage:', e);
    }
    return DEFAULT_RESOURCES_AUDIT_LOGS;
}

export async function saveResourcesAuditLogs(logs: ResourcesAuditLogItem[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs));
    } catch (e) {
        console.error('Failed to save resources audit logs to AsyncStorage:', e);
    }
}

export async function clearResourcesAuditLogs(): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify([]));
    } catch (e) {
        console.error('Failed to clear resources audit logs:', e);
    }
}
