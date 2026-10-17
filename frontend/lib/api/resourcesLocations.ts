import AsyncStorage from '@react-native-async-storage/async-storage';
import { getClockSetting, DEFAULT_WORK_LOCATIONS, WorkLocationItem } from './clockSetup';
import { VendorMasterRecord, DEFAULT_VENDOR_MASTERS, getVendorMasters } from './resourcesVendors';

export type LocationSource = 'Internal' | 'Clock' | 'Project' | 'Vendor';

export type LocationType =
    | 'Site'
    | 'Warehouse'
    | 'Office'
    | 'Storage'
    | 'Workshop'
    | 'Room'
    | 'Rack'
    | 'Yard'
    | 'Vendor Facility';

export interface ResourceLocationItem {
    id: string;
    name: string;
    source: LocationSource;
    type: LocationType;
    parentId?: string; // Nested location hierarchy (e.g. Site -> Warehouse -> Room -> Rack)
    parentName?: string;
    address?: string;
    department?: string;
    linkedProjectId?: string;
    linkedProjectName?: string;
    linkedVendorId?: string;
    linkedVendorName?: string;
    linkedClockLocationId?: string;
    active: boolean;
    notes?: string;
    // Resource-specific roles
    isReceivingLocation: boolean;
    isStorageLocation: boolean;
    isTransferDestination: boolean;
    order?: number;
}

const STORAGE_KEY_LOCATIONS = '@resources_locations_v1';

export const LOCATION_TYPE_OPTIONS: LocationType[] = [
    'Warehouse',
    'Office',
    'Storage',
    'Workshop',
    'Room',
    'Rack',
    'Site',
    'Yard',
    'Vendor Facility',
];

export const DEPARTMENT_OPTIONS = [
    'Warehouse & Logistics',
    'Operations & Field',
    'Production & Workshop',
    'Project Engineering',
    'General Affairs & IT',
];

export const MOCK_PROJECTS = [
    { id: 'prj-1', name: 'Precision Gym Fitout', code: 'PRJ-2026-001', location: 'Kebayoran Baru' },
    { id: 'prj-2', name: 'Sudirman Tower Level 18', code: 'PRJ-2026-004', location: 'Sudirman CBD' },
    { id: 'prj-3', name: 'PIK 2 Commercial Complex', code: 'PRJ-2026-009', location: 'Pantai Indah Kapuk' },
    { id: 'prj-4', name: 'Bali Eco Resort Phase 1', code: 'PRJ-2026-012', location: 'Canggu, Bali' },
];

export const DEFAULT_RESOURCE_LOCATIONS: ResourceLocationItem[] = [
    // Internal Locations (Hierarchy: Head Office Site -> Main Warehouse -> Heavy Tool Room -> Power Tool Rack)
    {
        id: 'loc-site-1',
        name: 'Head Office Compound',
        source: 'Internal',
        type: 'Site',
        address: 'Jl. Merdeka No. 45, Gambir, Jakarta Pusat',
        department: 'General Affairs & IT',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: false,
        isTransferDestination: true,
        notes: 'Main administrative and central logistics facility.',
        order: 1,
    },
    {
        id: 'loc-wh-1',
        name: 'Warehouse A',
        source: 'Internal',
        type: 'Warehouse',
        parentId: 'loc-site-1',
        parentName: 'Head Office Compound',
        address: 'Gedung Logistik Sayap Barat, Lt. 1',
        department: 'Warehouse & Logistics',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Primary material intake, staging, and dispatch center.',
        order: 2,
    },
    {
        id: 'loc-room-1',
        name: 'Heavy Tool Room',
        source: 'Internal',
        type: 'Room',
        parentId: 'loc-wh-1',
        parentName: 'Warehouse A',
        address: 'Zona A - Sekat 03',
        department: 'Warehouse & Logistics',
        active: true,
        isReceivingLocation: false,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Secured tool cage for demolition hammers and generators.',
        order: 3,
    },
    {
        id: 'loc-rack-1',
        name: 'Rack A-04 (Power Tools)',
        source: 'Internal',
        type: 'Rack',
        parentId: 'loc-room-1',
        parentName: 'Heavy Tool Room',
        address: 'Shelf 2 & 3',
        department: 'Warehouse & Logistics',
        active: true,
        isReceivingLocation: false,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Drills, grinders, and cordless drivers battery dock.',
        order: 4,
    },
    {
        id: 'loc-ws-1',
        name: 'Fabrication Workshop',
        source: 'Internal',
        type: 'Workshop',
        parentId: 'loc-site-1',
        parentName: 'Head Office Compound',
        address: 'Workshop Yard Area Belakang',
        department: 'Production & Workshop',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Metal fabrication and pre-assembly zone.',
        order: 5,
    },

    // Clock Shared Locations (Mirrored from Clock Work Locations)
    {
        id: 'loc-clock-1',
        name: 'Precision Gym Site',
        source: 'Clock',
        type: 'Site',
        address: 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan',
        linkedClockLocationId: 'loc-1',
        linkedProjectId: 'prj-1',
        linkedProjectName: 'Precision Gym Fitout',
        department: 'Operations & Field',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Mirrored from Clock Work Locations. Geofence managed in Clock.',
        order: 6,
    },
    {
        id: 'loc-clock-2',
        name: 'Headquarters Office',
        source: 'Clock',
        type: 'Office',
        address: 'Menara Palma Lt. 12, Jl. H.R. Rasuna Said, Kuningan',
        linkedClockLocationId: 'loc-0',
        department: 'General Affairs & IT',
        active: true,
        isReceivingLocation: false,
        isStorageLocation: false,
        isTransferDestination: false,
        notes: 'Corporate headquarters IT inventory & office equipment.',
        order: 7,
    },

    // Project Locations
    {
        id: 'loc-prj-1',
        name: 'Sudirman Tower Project Yard',
        source: 'Project',
        type: 'Yard',
        address: 'Jl. Jend. Sudirman Kav. 21, Karet Semanggi',
        linkedProjectId: 'prj-2',
        linkedProjectName: 'Sudirman Tower Level 18',
        department: 'Project Engineering',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Temporary on-site storage container & tool depot.',
        order: 8,
    },
    {
        id: 'loc-prj-2',
        name: 'PIK 2 Material Staging Staging Area',
        source: 'Project',
        type: 'Storage',
        address: 'Kawasan Pasir Putih Blok C-02, PIK 2, Tangerang',
        linkedProjectId: 'prj-3',
        linkedProjectName: 'PIK 2 Commercial Complex',
        department: 'Operations & Field',
        active: true,
        isReceivingLocation: true,
        isStorageLocation: true,
        isTransferDestination: true,
        notes: 'Outdoor bulk material drop point for masonry & structural steel.',
        order: 9,
    },

    // Vendor Locations (For pickup, delivery, return)
    {
        id: 'loc-vnd-1',
        name: 'PT Semen Gresik Central Hub',
        source: 'Vendor',
        type: 'Vendor Facility',
        address: 'Kawasan Industri Tuban, Jawa Timur',
        linkedVendorId: 'vm-1',
        linkedVendorName: 'PT Semen Gresik Distribusi',
        active: true,
        isReceivingLocation: false,
        isStorageLocation: false,
        isTransferDestination: true,
        notes: 'Direct plant pickup point for bulk cement consignments.',
        order: 10,
    },
    {
        id: 'loc-vnd-2',
        name: 'PT Makita Service & Sparepart Center',
        source: 'Vendor',
        type: 'Vendor Facility',
        address: 'Jl. Daan Mogot KM 12 No. 8, Cengkareng',
        linkedVendorId: 'vm-2',
        linkedVendorName: 'PT Makita Power Tools Indonesia',
        active: true,
        isReceivingLocation: false,
        isStorageLocation: false,
        isTransferDestination: true,
        notes: 'Authorized drop-off and pickup center for tool maintenance.',
        order: 11,
    },
];

export async function getResourceLocations(): Promise<ResourceLocationItem[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_LOCATIONS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load resource locations from AsyncStorage:', e);
    }
    return DEFAULT_RESOURCE_LOCATIONS;
}

export async function saveResourceLocations(locations: ResourceLocationItem[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
    } catch (e) {
        console.error('Failed to save resource locations to AsyncStorage:', e);
    }
}

export function getLocationSourceBadgeMeta(source: LocationSource) {
    switch (source) {
        case 'Internal':
            return {
                label: 'Internal',
                color: '#007AFF',
                bgLight: '#EBF5FF',
                bgDark: 'rgba(0,122,255,0.15)',
                icon: 'building.2.fill',
            };
        case 'Clock':
            return {
                label: 'Clock',
                color: '#34C759',
                bgLight: '#E8F8EE',
                bgDark: 'rgba(52,199,89,0.15)',
                icon: 'location.fill',
            };
        case 'Project':
            return {
                label: 'Project',
                color: '#FF9500',
                bgLight: '#FFF4E5',
                bgDark: 'rgba(255,149,0,0.15)',
                icon: 'hammer.fill',
            };
        case 'Vendor':
            return {
                label: 'Vendor',
                color: '#AF52DE',
                bgLight: '#F7EDFC',
                bgDark: 'rgba(175,82,222,0.15)',
                icon: 'shippingbox.fill',
            };
    }
}

export function getLocationTypeIcon(type: LocationType): string {
    switch (type) {
        case 'Site':
            return 'map.fill';
        case 'Warehouse':
            return 'building.2.fill';
        case 'Office':
            return 'briefcase.fill';
        case 'Storage':
            return 'archivebox.fill';
        case 'Workshop':
            return 'wrench.and.screwdriver.fill';
        case 'Room':
            return 'square.grid.2x2.fill';
        case 'Rack':
            return 'square.split.2x2.fill';
        case 'Yard':
            return 'shippingbox.fill';
        case 'Vendor Facility':
            return 'truck.box.fill';
        default:
            return 'mappin.circle.fill';
    }
}
