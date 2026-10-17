import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export type VendorTypeOption =
    | 'Distributor'
    | 'Manufacturer'
    | 'Contractor'
    | 'Service Provider'
    | 'Retailer'
    | 'Individual';

export interface VendorHistorySummary {
    itemsSuppliedCount: number;
    totalReceivings: number;
    lastReceivingDate?: string;
    activeResourceRelationships: number;
}

export interface VendorMasterRecord {
    id: string;
    name: string;
    code: string;
    legalName?: string;
    vendorType: VendorTypeOption;
    active: boolean;
    isPreferred: boolean;
    // Contact
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;
    // Location
    address?: string;
    city?: string;
    resourceLocationLink?: string;
    // Supply Information
    resourceTypes: ResourceTypeOption[];
    categoriesSupplied: string[];
    subcategoriesSupplied?: string[];
    brandsSupplied?: string[];
    notes?: string;
    // Resources History
    historySummary: VendorHistorySummary;
    updatedAt: string;
    // Sensitive Finance properties (stored for sync, masked in UI unless allowed)
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    taxIdentificationNumber?: string;
    paymentTermsDays?: number;
}

const STORAGE_KEY_VENDORS = '@resources_vendors_master_v1';

export const DEFAULT_VENDOR_MASTERS: VendorMasterRecord[] = [
    {
        id: 'vnd-1',
        name: 'PT Sumber Perkasa Teknik',
        code: 'VND-001',
        legalName: 'PT Sumber Perkasa Teknik Indonesia',
        vendorType: 'Distributor',
        active: true,
        isPreferred: true,
        contactPerson: 'Hendra Gunawan',
        phone: '+62 811-9283-112',
        email: 'sales@sumberperkasa.co.id',
        website: 'https://sumberperkasa.co.id',
        address: 'Jl. Daan Mogot KM 12 No. 88, Cengkareng',
        city: 'Jakarta Barat',
        resourceLocationLink: 'Gudang Utama Daan Mogot',
        resourceTypes: ['Tools', 'Material'],
        categoriesSupplied: ['Equipment', 'Building Materials'],
        subcategoriesSupplied: ['Power Tools', 'Hardware'],
        brandsSupplied: ['Makita', 'Bosch'],
        notes: 'Primary supplier for Makita and Bosch power tools. 1-day delivery for Jakarta projects.',
        historySummary: {
            itemsSuppliedCount: 14,
            totalReceivings: 28,
            lastReceivingDate: '2026-09-10',
            activeResourceRelationships: 5,
        },
        updatedAt: '2026-09-11T12:00:00Z',
    },
    {
        id: 'vnd-2',
        name: 'TB Jaya Abadi Material',
        code: 'VND-002',
        legalName: 'CV Jaya Abadi Perkasa',
        vendorType: 'Retailer',
        active: true,
        isPreferred: true,
        contactPerson: 'Koh Steven',
        phone: '+62 812-3344-5566',
        email: 'jayaabadi.material@gmail.com',
        website: '',
        address: 'Jl. Raya Kenjeran No. 142',
        city: 'Surabaya',
        resourceLocationLink: 'Site Storage Kenjeran',
        resourceTypes: ['Material'],
        categoriesSupplied: ['Building Materials'],
        subcategoriesSupplied: ['Cement & Concrete', 'Aggregates'],
        brandsSupplied: ['Gresik', 'Tiga Roda'],
        notes: 'Cement and brick ready-stock partner. Daily dispatch direct to project sites.',
        historySummary: {
            itemsSuppliedCount: 8,
            totalReceivings: 54,
            lastReceivingDate: '2026-09-12',
            activeResourceRelationships: 4,
        },
        updatedAt: '2026-09-12T15:30:00Z',
    },
    {
        id: 'vnd-3',
        name: 'Digimap / iBox Indonesia',
        code: 'VND-003',
        legalName: 'PT Mitra Adiperkasa Tbk / Erajaya',
        vendorType: 'Retailer',
        active: true,
        isPreferred: false,
        contactPerson: 'Corporate B2B Desk',
        phone: '+62 21-5080-8888',
        email: 'b2b.apple@map.co.id',
        website: 'https://digimap.co.id',
        address: 'Grand Indonesia Mall, East Mall Lt. 3',
        city: 'Jakarta Pusat',
        resourceLocationLink: 'Headquarters Office IT Pool',
        resourceTypes: ['Assets'],
        categoriesSupplied: ['Office Equipment'],
        subcategoriesSupplied: ['Computers & Peripherals'],
        brandsSupplied: ['MacBook', 'Dell'],
        notes: 'Corporate hardware procurement for Apple silicon engineering workstations.',
        historySummary: {
            itemsSuppliedCount: 6,
            totalReceivings: 9,
            lastReceivingDate: '2026-09-08',
            activeResourceRelationships: 3,
        },
        updatedAt: '2026-09-08T18:00:00Z',
    },
    {
        id: 'vnd-4',
        name: 'PT Baja Utama Nusantara',
        code: 'VND-004',
        legalName: 'PT Baja Utama Nusantara Logam',
        vendorType: 'Manufacturer',
        active: true,
        isPreferred: true,
        contactPerson: 'Bambang Soediro',
        phone: '+62 813-8877-6655',
        email: 'procurement@bajautama.co.id',
        website: 'https://bajautama.co.id',
        address: 'Kawasan Industri Krakatau Steel Kav. 4A',
        city: 'Cilegon',
        resourceLocationLink: 'Fabrication Yard Cilegon',
        resourceTypes: ['Material'],
        categoriesSupplied: ['Building Materials'],
        subcategoriesSupplied: ['Structural Steel'],
        brandsSupplied: ['Krakatau Steel'],
        notes: 'Wide Flange and I-Beam structural steel mill with mill certificates.',
        historySummary: {
            itemsSuppliedCount: 12,
            totalReceivings: 19,
            lastReceivingDate: '2026-09-05',
            activeResourceRelationships: 2,
        },
        updatedAt: '2026-09-05T09:15:00Z',
    },
    {
        id: 'vnd-5',
        name: 'CV Prima Mandiri Industrial',
        code: 'VND-005',
        legalName: 'CV Prima Mandiri Teknik',
        vendorType: 'Distributor',
        active: true,
        isPreferred: false,
        contactPerson: 'Agus Riyadi',
        phone: '+62 818-0909-1234',
        email: 'sales@primamandiri.id',
        website: 'https://primamandiri.id',
        address: 'Jl. Raden Inten II No. 19',
        city: 'Jakarta Timur',
        resourceLocationLink: 'Gudang Cabang Timur',
        resourceTypes: ['Tools'],
        categoriesSupplied: ['Equipment'],
        subcategoriesSupplied: ['Power Tools', 'Rotary Hammers'],
        brandsSupplied: ['Bosch'],
        notes: 'Secondary supplier for Bosch rotary hammers and SDS Plus attachments.',
        historySummary: {
            itemsSuppliedCount: 5,
            totalReceivings: 11,
            lastReceivingDate: '2026-08-28',
            activeResourceRelationships: 2,
        },
        updatedAt: '2026-08-28T14:40:00Z',
    },
];

export async function getVendorMasters(): Promise<VendorMasterRecord[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_VENDORS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load vendors from AsyncStorage:', e);
    }
    return DEFAULT_VENDOR_MASTERS;
}

export async function saveVendorMasters(vendors: VendorMasterRecord[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_VENDORS, JSON.stringify(vendors));
    } catch (e) {
        console.error('Failed to save vendors to AsyncStorage:', e);
    }
}
