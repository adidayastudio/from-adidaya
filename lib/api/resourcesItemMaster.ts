import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';

export interface ItemSku {
    id: string;
    code: string; // e.g., 'HP1630' or '40 kg' or 'TL-01020301'
    name: string; // e.g., 'HP1630 13mm 710W' or '40 kg Type 1'
    spec?: string;
    standardUnit: string;
    vendorSource?: string; // small supporting vendor info
    active: boolean;
    createdAt?: string;
}

export interface ItemVariant {
    id: string;
    brandName: string; // e.g., 'Makita', 'Gresik', 'MacBook'
    description?: string;
    skus: ItemSku[];
}

export interface ItemMasterRecord {
    id: string;
    name: string; // e.g., 'Impact Drill', 'Semen Portland', 'Laptop'
    code: string; // e.g., 'TL-01020300', 'MT-01010100'
    resourceType: ResourceTypeOption; // 'Material' | 'Tools' | 'Assets' | 'Services'
    categoryId: string;
    categoryName: string;
    subcategoryId?: string;
    subcategoryName?: string;
    standardUnit: string;
    variants: ItemVariant[];
    active: boolean;
    updatedAt: string;
}

export interface UnmatchedItemCandidate {
    id: string;
    rawName: string; // e.g. 'Semen gresikk 40kg'
    sourceTransactionType: 'Expense' | 'Purchase Order' | 'Asset Entry' | 'Invoice';
    sourceDocumentNumber: string;
    sourceDate: string;
    amount?: number;
    suggestedMasterId?: string;
    suggestedVariantId?: string;
    suggestedSkuId?: string;
    similarityScore?: number; // 0 to 1
}

const STORAGE_KEY_ITEM_MASTERS = '@resources_item_masters_v1';
const STORAGE_KEY_UNMATCHED_CANDIDATES = '@resources_unmatched_candidates_v1';

export const DEFAULT_ITEM_MASTERS: ItemMasterRecord[] = [
    {
        id: 'item-1',
        name: 'Impact Drill',
        code: 'TL-01020300',
        resourceType: 'Tools',
        categoryId: 'cat-2',
        categoryName: 'Equipment',
        subcategoryId: 'sub-2-2',
        subcategoryName: 'Power Tools',
        standardUnit: 'unit',
        active: true,
        updatedAt: '2026-09-12T14:20:00Z',
        variants: [
            {
                id: 'var-1-1',
                brandName: 'Makita',
                description: 'Heavy duty corded & cordless power tools',
                skus: [
                    {
                        id: 'sku-1-1-1',
                        code: 'HP1630',
                        name: 'HP1630 13mm 710W Impact Drill',
                        spec: '710W · 0-3200 RPM · 13mm Chuck',
                        standardUnit: 'unit',
                        vendorSource: 'PT Sumber Perkasa Teknik',
                        active: true,
                    },
                    {
                        id: 'sku-1-1-2',
                        code: 'HP2050',
                        name: 'HP2050 2-Speed 720W Hammer Drill',
                        spec: '720W · 2-Speed Mechanical Gearbox',
                        standardUnit: 'unit',
                        vendorSource: 'PT Sumber Perkasa Teknik',
                        active: true,
                    },
                    {
                        id: 'sku-1-1-3',
                        code: 'DHP482',
                        name: 'DHP482 Cordless 18V LXT Drill',
                        spec: '18V LXT Brushless · 62 Nm Torque',
                        standardUnit: 'unit',
                        vendorSource: 'Mitra Makmur Industrial',
                        active: true,
                    },
                ],
            },
            {
                id: 'var-1-2',
                brandName: 'Bosch',
                description: 'Professional contractor line',
                skus: [
                    {
                        id: 'sku-1-2-1',
                        code: 'GSB 550',
                        name: 'GSB 550 Professional 13mm 550W',
                        spec: '550W · Keyed Chuck',
                        standardUnit: 'unit',
                        vendorSource: 'CV Prima Mandiri',
                        active: true,
                    },
                    {
                        id: 'sku-1-2-2',
                        code: 'GBH 220',
                        name: 'GBH 220 Rotary Hammer SDS Plus',
                        spec: '720W · 2.0J Impact Energy',
                        standardUnit: 'unit',
                        vendorSource: 'CV Prima Mandiri',
                        active: true,
                    },
                ],
            },
        ],
    },
    {
        id: 'item-2',
        name: 'Semen Portland',
        code: 'MT-01010100',
        resourceType: 'Material',
        categoryId: 'cat-1',
        categoryName: 'Building Materials',
        subcategoryId: 'sub-1-1',
        subcategoryName: 'Cement & Concrete',
        standardUnit: 'sak',
        active: true,
        updatedAt: '2026-09-11T10:15:00Z',
        variants: [
            {
                id: 'var-2-1',
                brandName: 'Gresik',
                description: 'PCC Semen Indonesia Standard',
                skus: [
                    {
                        id: 'sku-2-1-1',
                        code: '40 kg',
                        name: 'Semen Gresik PCC 40 kg',
                        spec: 'SNI 7064:2014 Type PCC',
                        standardUnit: 'sak',
                        vendorSource: 'TB Jaya Abadi Material',
                        active: true,
                    },
                    {
                        id: 'sku-2-1-2',
                        code: '50 kg',
                        name: 'Semen Gresik PCC 50 kg',
                        spec: 'SNI 7064:2014 Type PCC',
                        standardUnit: 'sak',
                        vendorSource: 'TB Jaya Abadi Material',
                        active: true,
                    },
                ],
            },
            {
                id: 'var-2-2',
                brandName: 'Tiga Roda',
                description: 'Portland Composite Cement',
                skus: [
                    {
                        id: 'sku-2-2-1',
                        code: '40 kg',
                        name: 'Semen Tiga Roda PCC 40 kg',
                        spec: 'SNI 7064:2014 Type PCC',
                        standardUnit: 'sak',
                        vendorSource: 'Depo Bangunan Sentosa',
                        active: true,
                    },
                    {
                        id: 'sku-2-2-2',
                        code: '50 kg',
                        name: 'Semen Tiga Roda PCC 50 kg',
                        spec: 'SNI 7064:2014 Type PCC',
                        standardUnit: 'sak',
                        vendorSource: 'Depo Bangunan Sentosa',
                        active: true,
                    },
                ],
            },
        ],
    },
    {
        id: 'item-3',
        name: 'Laptop',
        code: 'AS-02010400',
        resourceType: 'Assets',
        categoryId: 'cat-3',
        categoryName: 'Office Equipment',
        subcategoryId: 'sub-3-1',
        subcategoryName: 'Computers & Peripherals',
        standardUnit: 'unit',
        active: true,
        updatedAt: '2026-09-10T18:40:00Z',
        variants: [
            {
                id: 'var-3-1',
                brandName: 'MacBook',
                description: 'Apple Silicon Workstations',
                skus: [
                    {
                        id: 'sku-3-1-1',
                        code: 'MacBook Pro M5 16/512',
                        name: 'MacBook Pro 14" M5 16GB / 512GB Space Black',
                        spec: 'Apple M5 Pro chip · 14.2" Liquid Retina XDR',
                        standardUnit: 'unit',
                        vendorSource: 'iBox Official Store',
                        active: true,
                    },
                    {
                        id: 'sku-3-1-2',
                        code: 'MacBook Air M3 16/256',
                        name: 'MacBook Air 13" M3 16GB / 256GB Silver',
                        spec: 'Apple M3 chip · 13.6" Liquid Retina',
                        standardUnit: 'unit',
                        vendorSource: 'Digimap Indonesia',
                        active: true,
                    },
                ],
            },
            {
                id: 'var-3-2',
                brandName: 'Dell',
                description: 'Enterprise laptops & workstations',
                skus: [
                    {
                        id: 'sku-3-2-1',
                        code: 'XPS 15 32/1TB',
                        name: 'Dell XPS 15 9530 i9 32GB / 1TB RTX 4070',
                        spec: 'Intel Core i9-13900H · 15.6" OLED 3.5K',
                        standardUnit: 'unit',
                        vendorSource: 'PT Mega Komputama',
                        active: true,
                    },
                ],
            },
        ],
    },
    {
        id: 'item-4',
        name: 'Structural Steel Beam',
        code: 'MT-02030100',
        resourceType: 'Material',
        categoryId: 'cat-1',
        categoryName: 'Building Materials',
        subcategoryId: 'sub-1-2',
        subcategoryName: 'Structural Steel',
        standardUnit: 'btg',
        active: true,
        updatedAt: '2026-09-08T09:30:00Z',
        variants: [
            {
                id: 'var-4-1',
                brandName: 'Krakatau Steel',
                description: 'National standard I-Beam & WF sections',
                skus: [
                    {
                        id: 'sku-4-1-1',
                        code: 'WF 150x75x5x7',
                        name: 'Wide Flange 150x75x5x7mm 12m',
                        spec: '168 kg/btg · BJ-37 / SS400',
                        standardUnit: 'btg',
                        vendorSource: 'PT Baja Utama Nusantara',
                        active: true,
                    },
                    {
                        id: 'sku-4-1-2',
                        code: 'WF 200x100x5.5x8',
                        name: 'Wide Flange 200x100x5.5x8mm 12m',
                        spec: '256 kg/btg · BJ-37 / SS400',
                        standardUnit: 'btg',
                        vendorSource: 'PT Baja Utama Nusantara',
                        active: true,
                    },
                ],
            },
        ],
    },
    {
        id: 'item-5',
        name: 'Architectural Consultation',
        code: 'SV-01010100',
        resourceType: 'Services',
        categoryId: 'cat-4',
        categoryName: 'Professional Services',
        subcategoryId: 'sub-4-1',
        subcategoryName: 'Design & Engineering',
        standardUnit: 'jam',
        active: true,
        updatedAt: '2026-09-05T16:00:00Z',
        variants: [
            {
                id: 'var-5-1',
                brandName: 'Adidaya Design Team',
                description: 'In-house senior architectural advisory',
                skus: [
                    {
                        id: 'sku-5-1-1',
                        code: 'Principal Architect Retainer',
                        name: 'Senior Principal Architectural Advisory & Review',
                        spec: 'On-site & studio design review per hour',
                        standardUnit: 'jam',
                        vendorSource: 'Adidaya Internal Advisory',
                        active: true,
                    },
                    {
                        id: 'sku-5-1-2',
                        code: 'Junior CAD Drafting',
                        name: 'Junior BIM / CAD Working Drawing Support',
                        spec: 'Production drafting per hour',
                        standardUnit: 'jam',
                        vendorSource: 'Adidaya Internal Studio',
                        active: true,
                    },
                ],
            },
        ],
    },
];

export const DEFAULT_UNMATCHED_CANDIDATES: UnmatchedItemCandidate[] = [
    {
        id: 'cand-1',
        rawName: 'Semen gresikk 40kg',
        sourceTransactionType: 'Expense',
        sourceDocumentNumber: 'EXP-2026-0812',
        sourceDate: '2026-09-12',
        amount: 3200000,
        suggestedMasterId: 'item-2',
        suggestedVariantId: 'var-2-1',
        suggestedSkuId: 'sku-2-1-1',
        similarityScore: 0.92,
    },
    {
        id: 'cand-2',
        rawName: 'Drill makita hp1630 13mm',
        sourceTransactionType: 'Purchase Order',
        sourceDocumentNumber: 'PO-2026-0144',
        sourceDate: '2026-09-10',
        amount: 1450000,
        suggestedMasterId: 'item-1',
        suggestedVariantId: 'var-1-1',
        suggestedSkuId: 'sku-1-1-1',
        similarityScore: 0.88,
    },
    {
        id: 'cand-3',
        rawName: 'Macbook pro m5 16 512 space black',
        sourceTransactionType: 'Asset Entry',
        sourceDocumentNumber: 'AST-2026-003',
        sourceDate: '2026-09-08',
        amount: 34999000,
        suggestedMasterId: 'item-3',
        suggestedVariantId: 'var-3-1',
        suggestedSkuId: 'sku-3-1-1',
        similarityScore: 0.95,
    },
];

export async function getItemMasters(): Promise<ItemMasterRecord[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_ITEM_MASTERS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load item masters from AsyncStorage:', e);
    }
    return DEFAULT_ITEM_MASTERS;
}

export async function saveItemMasters(items: ItemMasterRecord[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_ITEM_MASTERS, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save item masters to AsyncStorage:', e);
    }
}

export async function getUnmatchedCandidates(): Promise<UnmatchedItemCandidate[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_UNMATCHED_CANDIDATES);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Failed to load unmatched candidates from AsyncStorage:', e);
    }
    return DEFAULT_UNMATCHED_CANDIDATES;
}

export async function saveUnmatchedCandidates(candidates: UnmatchedItemCandidate[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_UNMATCHED_CANDIDATES, JSON.stringify(candidates));
    } catch (e) {
        console.error('Failed to save unmatched candidates to AsyncStorage:', e);
    }
}
