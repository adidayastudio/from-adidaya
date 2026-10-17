import { fetchAdidayaApi } from '@/lib/backendApi';
import { supabase } from '../supabase';
import { CatalogResource } from '@/components/resources/mockData';

export interface ResourceInventoryItem {
    id: string;
    resource_id: string;
    project_id: string;
    quantity_in: number;
    quantity_used: number;
    quantity_manual_adj: number;
    updated_at: string;
    resource?: {
        name: string;
        category: string;
        subcategory?: string;
        group_name?: string;
        unit: string;
        price_default: number;
    };
    project?: {
        project_name: string;
        project_code: string;
    };
}

export interface CatalogResourceWithInventory extends CatalogResource {
    resource_inventory?: Array<{
        id: string;
        quantity_in: number;
        quantity_used: number;
        quantity_manual_adj: number;
        updated_at: string;
        project?: {
            id: string;
            project_name: string;
            project_code: string;
        } | null;
    }>;
}

// ── Comprehensive Default Mock Data for UI Preview ──

export const DEFAULT_CATALOG_RESOURCES: CatalogResourceWithInventory[] = [
    // ── MATERIALS ──
    {
        id: 'mat-01',
        name: 'Semen Portland Gresik 40 kg',
        category: 'material',
        subcategory: 'struktur',
        group_name: 'beton',
        unit: 'zak',
        price_default: 68000,
        description: 'Semen Type 1 SNI untuk pengecoran struktur dan plesteran bangunan',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-mat-01',
                quantity_in: 150,
                quantity_used: 30,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T08:30:00Z',
                project: { id: 'p-01', project_name: 'Warehouse A · Procurement', project_code: 'Warehouse A' },
            },
        ],
    },
    {
        id: 'mat-02',
        name: 'Besi Beton Ulir D16 12m',
        category: 'material',
        subcategory: 'struktur',
        group_name: 'besi',
        unit: 'btg',
        price_default: 195000,
        description: 'Besi tulangan ulir Standar Nasional Indonesia Krakatau Steel',
        metadata: { variant_index: 2 },
        resource_inventory: [
            {
                id: 'inv-mat-02',
                quantity_in: 50,
                quantity_used: 42,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T14:15:00Z',
                project: { id: 'p-02', project_name: 'Site Storage C · Construction', project_code: 'Site Storage C' },
            },
        ],
    },
    {
        id: 'mat-03',
        name: 'Pasir Pasang Lumajang Super',
        category: 'material',
        subcategory: 'struktur',
        group_name: 'plesteran',
        unit: 'm3',
        price_default: 320000,
        description: 'Pasir vulkanik bersih bebas lumpur untuk adukan beton mutu tinggi',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-mat-03',
                quantity_in: 20,
                quantity_used: 20,
                quantity_manual_adj: 0,
                updated_at: '2026-09-10T11:00:00Z',
                project: { id: 'p-01', project_name: 'Warehouse A · Procurement', project_code: 'Warehouse A' },
            },
        ],
    },
    {
        id: 'mat-04',
        name: 'Cat Tembok Dulux Weathershield 20L',
        category: 'material',
        subcategory: 'finishing',
        group_name: 'cat',
        unit: 'pail',
        price_default: 1450000,
        description: 'Cat eksterior premium anti lumut dan jamur warna Brilliant White',
        metadata: { variant_index: 3 },
        resource_inventory: [
            {
                id: 'inv-mat-04',
                quantity_in: 40,
                quantity_used: 5,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T09:45:00Z',
                project: { id: 'p-01', project_name: 'Warehouse A · Architecture', project_code: 'Warehouse A' },
            },
        ],
    },
    {
        id: 'mat-05',
        name: 'Keramik Granit Roman 60x60 Cream Polish',
        category: 'material',
        subcategory: 'finishing',
        group_name: 'lantai',
        unit: 'dus',
        price_default: 185000,
        description: 'Granite tile polished dPisa Cream 60x60 cm unglazed porcelain',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-mat-05',
                quantity_in: 200,
                quantity_used: 20,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T16:20:00Z',
                project: { id: 'p-03', project_name: 'Warehouse B · Interior', project_code: 'Warehouse B' },
            },
        ],
    },
    {
        id: 'mat-06',
        name: 'Pipa PVC Wavin AW 3 Inch 4m',
        category: 'material',
        subcategory: 'mep',
        group_name: 'sanitair',
        unit: 'btg',
        price_default: 145000,
        description: 'Pipa saluran air bersih bertekanan tinggi kelas AW',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-mat-06',
                quantity_in: 50,
                quantity_used: 5,
                quantity_manual_adj: 0,
                updated_at: '2026-09-11T13:10:00Z',
                project: { id: 'p-01', project_name: 'Warehouse A · MEP', project_code: 'Warehouse A' },
            },
        ],
    },

    // ── TOOLS ──
    {
        id: 'tool-01',
        name: 'Impact Drill Makita HP1630',
        category: 'tool',
        subcategory: 'power tools',
        group_name: 'umum',
        unit: 'unit',
        price_default: 850000,
        description: 'Mesin bor tembok beton 13mm 710W reversible variable speed',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-tool-01',
                quantity_in: 3,
                quantity_used: 1,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T07:15:00Z',
                project: { id: 'p-04', project_name: 'Workshop · Operations', project_code: 'Workshop' },
            },
        ],
    },
    {
        id: 'tool-02',
        name: 'Rotary Laser Level Bosch GRL 300 HV',
        category: 'tool',
        subcategory: 'measuring',
        group_name: 'umum',
        unit: 'unit',
        price_default: 12500000,
        description: 'Self-leveling horizontal and vertical rotary laser dengan remote receiver',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-tool-02',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T10:00:00Z',
                project: { id: 'p-02', project_name: 'Site Storage C · Operations', project_code: 'Site Storage C' },
            },
        ],
    },
    {
        id: 'tool-03',
        name: 'Concrete Vibrator Mikasa MGX-28 2m',
        category: 'tool',
        subcategory: 'power tools',
        group_name: 'beton',
        unit: 'unit',
        price_default: 4200000,
        description: 'Vibrator cor pemadat semen portable selang flexible 28mm',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-tool-03',
                quantity_in: 4,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-11T14:40:00Z',
                project: { id: 'p-02', project_name: 'Site Storage C · Operations', project_code: 'Site Storage C' },
            },
        ],
    },
    {
        id: 'tool-04',
        name: 'Generator Set Honda EG6500CX 5kVA',
        category: 'tool',
        subcategory: 'power tools',
        group_name: 'umum',
        unit: 'unit',
        price_default: 18500000,
        description: 'Genset bensin 4-tak 5.5 kVA Digital AVR untuk suplai daya lapangan',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-tool-04',
                quantity_in: 0,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-09T08:00:00Z',
                project: { id: 'p-04', project_name: 'Workshop · Operations', project_code: 'Workshop' },
            },
        ],
    },
    {
        id: 'tool-05',
        name: 'Circular Saw DeWalt DWE575 7-1/4"',
        category: 'tool',
        subcategory: 'power tools',
        group_name: 'kayu',
        unit: 'unit',
        price_default: 1850000,
        description: 'Gergaji potong kayu circular saw 1800W high precision cutting',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-tool-05',
                quantity_in: 2,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T11:25:00Z',
                project: { id: 'p-05', project_name: 'Central Tool Hub · Operations', project_code: 'Central Tool Hub' },
            },
        ],
    },

    // ── ASSETS ──
    {
        id: 'ast-01',
        name: 'MacBook Pro 16" M3 Max 36/1TB',
        category: 'asset',
        subcategory: 'office & it',
        group_name: 'laptop',
        unit: 'unit',
        price_default: 54000000,
        description: 'Asset laptop workstation tim design & 3D rendering Studio Adidaya',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-ast-01',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T09:00:00Z',
                project: { id: 'p-06', project_name: 'Design & Architecture', project_code: 'Design' },
            },
        ],
    },
    {
        id: 'ast-02',
        name: 'Toyota Hilux Double Cabin 2.4 G 4x4 MT',
        category: 'asset',
        subcategory: 'vehicles',
        group_name: 'operational',
        unit: 'unit',
        price_default: 480000000,
        description: 'Kendaraan operasional site supervisor nopol B 9123 SAA',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-ast-02',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-10T15:30:00Z',
                project: { id: 'p-02', project_name: 'Site Operations · Construction', project_code: 'Site Ops' },
            },
        ],
    },
    {
        id: 'ast-03',
        name: 'Workstation Desktop Dell Precision 3660',
        category: 'asset',
        subcategory: 'office & it',
        group_name: 'workstation',
        unit: 'unit',
        price_default: 38000000,
        description: 'Intel i9 13900K 64GB DDR5 RTX 4080 untuk BIM Modelling & Rendering',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-ast-03',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-08T12:00:00Z',
                project: { id: 'p-06', project_name: 'Office 201 · Architecture', project_code: 'Office 201' },
            },
        ],
    },
    {
        id: 'ast-04',
        name: 'Excavator Komatsu PC200-8 Heavy Duty',
        category: 'asset',
        subcategory: 'heavy equipment',
        group_name: 'excavator',
        unit: 'unit',
        price_default: 1450000000,
        description: 'Alat berat pengerukan tanah & pondasi gedung',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-ast-04',
                quantity_in: 0,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-07T10:00:00Z',
                project: { id: 'p-02', project_name: 'Site Storage C · Operations', project_code: 'Site Storage C' },
            },
        ],
    },
    {
        id: 'ast-05',
        name: 'Drone Survey DJI Mavic 3 Enterprise RTK',
        category: 'asset',
        subcategory: 'measuring & survey',
        group_name: 'drone',
        unit: 'unit',
        price_default: 82000000,
        description: 'Drone pemetaan fotogrametri kontur lahan dan inspeksi elevasi site',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-ast-05',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T13:45:00Z',
                project: { id: 'p-06', project_name: 'Survey Team · Engineering', project_code: 'Survey Team' },
            },
        ],
    },

    // ── SERVICES ──
    {
        id: 'svc-01',
        name: 'AC Maintenance & Chemical Cleaning',
        category: 'service',
        subcategory: 'consulting',
        group_name: 'preventive',
        unit: 'service',
        price_default: 1800000,
        description: 'Cuci chemical 12 unit indoor outdoor AC split kantor pusat Adidaya',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-svc-01',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T10:30:00Z',
                project: { id: 'p-07', project_name: 'PT Sejuk Abadi Mandiri · Office', project_code: 'Main Office' },
            },
        ],
    },
    {
        id: 'svc-02',
        name: 'Soil Investigation & Sondir Test 4 Titik',
        category: 'service',
        subcategory: 'testing',
        group_name: 'geotechnical',
        unit: 'service',
        price_default: 14500000,
        description: 'Pengujian daya dukung tanah sondir mekanik 2.5 ton s.d tanah keras',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-svc-02',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-12T15:00:00Z',
                project: { id: 'p-08', project_name: 'PT Geonusa Prima · Engineering', project_code: 'Site Project' },
            },
        ],
    },
    {
        id: 'svc-03',
        name: 'Structural Building Certification Audit',
        category: 'service',
        subcategory: 'consulting',
        group_name: 'compliance',
        unit: 'service',
        price_default: 28000000,
        description: 'Pemeriksaan kelayakan struktur bangunan eksisting & SLF certificate',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-svc-03',
                quantity_in: 0,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-11T09:20:00Z',
                project: { id: 'p-09', project_name: 'PT Audit Struktur Indonesia · MEP', project_code: 'Compliance' },
            },
        ],
    },
    {
        id: 'svc-04',
        name: 'Tower Crane Rental & Certified Operator',
        category: 'service',
        subcategory: 'subcontractor',
        group_name: 'heavy rental',
        unit: 'service',
        price_default: 65000000,
        description: 'Sewa alat berat tower crane 50m jib arm include 2 shift operator SIO',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-svc-04',
                quantity_in: 1,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-13T08:00:00Z',
                project: { id: 'p-10', project_name: 'PT Nusantara Crane · Construction', project_code: 'Site Tower' },
            },
        ],
    },
    {
        id: 'svc-05',
        name: 'Scrap & Construction Waste Disposal',
        category: 'service',
        subcategory: 'logistics',
        group_name: 'waste',
        unit: 'service',
        price_default: 4500000,
        description: 'Pembersihan dan pembuangan puing sisa pembongkaran dinding',
        metadata: { variant_index: 1 },
        resource_inventory: [
            {
                id: 'inv-svc-05',
                quantity_in: 0,
                quantity_used: 0,
                quantity_manual_adj: 0,
                updated_at: '2026-09-06T14:00:00Z',
                project: { id: 'p-11', project_name: 'CV Berkah Bersih Abadi · Operations', project_code: 'Disposal' },
            },
        ],
    },
];

export const DEFAULT_RESOURCE_ACTIVITY_LOGS = [
    {
        id: 'act-01',
        title: 'Stock Receipt Confirmed',
        description: '120 zak of Semen Portland Gresik received into Warehouse A.',
        user: 'Adi Pratama',
        time: '10m ago',
        type: 'material' as const,
    },
    {
        id: 'act-02',
        title: 'Tool Custody Handover',
        description: 'Impact Drill Makita HP1630 assigned to Budi Santoso for Site Project 007.',
        user: 'Siti Aminah',
        time: '1h ago',
        type: 'tool' as const,
    },
    {
        id: 'act-03',
        title: 'Asset Check-in & Assigned',
        description: 'MacBook Pro 16" M3 Max assigned to Adi Pratama (Lead Architect).',
        user: 'HR Admin',
        time: '3h ago',
        type: 'asset' as const,
    },
    {
        id: 'act-04',
        title: 'Service Milestone Completed',
        description: 'AC Maintenance & Chemical Cleaning completed by PT Sejuk Abadi.',
        user: 'Vendor Lead',
        time: 'Yesterday',
        type: 'service' as const,
    },
    {
        id: 'act-05',
        title: 'Stock Count Reconciled',
        description: 'Reconciled +2 btg Besi Beton Ulir D16 during monthly physical cycle count.',
        user: 'Site Supervisor',
        time: 'Yesterday',
        type: 'material' as const,
    },
    {
        id: 'act-06',
        title: 'Tool Maintenance Logged',
        description: 'Generator Set Honda EG6500CX scheduled for alternator overhaul at Workshop.',
        user: 'Workshop Lead',
        time: '2d ago',
        type: 'tool' as const,
    },
];

import { getReceivingQueue, syncPaidPurchasingToReceivingQueue, ReceivingQueueItem } from './resourcesReceiving';

function mergePaidFinanceItemsIntoCatalog(
    category: string,
    catalogList: CatalogResourceWithInventory[],
    queue: ReceivingQueueItem[]
): CatalogResourceWithInventory[] {
    const targetCat = category.toLowerCase();
    const matchingQueue = queue.filter(q => {
        const qCat = q.resourceType.toLowerCase().replace(/s$/, '');
        return qCat === targetCat || (targetCat === 'tool' && q.resourceType === 'Tools') || (targetCat === 'asset' && q.resourceType === 'Assets') || (targetCat === 'service' && q.resourceType === 'Services') || (targetCat === 'material' && q.resourceType === 'Material');
    });

    const result = [...catalogList];
    const existingNameMap = new Map<string, CatalogResourceWithInventory>();
    result.forEach(r => existingNameMap.set(r.name.trim().toLowerCase(), r));

    matchingQueue.forEach(qItem => {
        const normName = qItem.itemName.trim().toLowerCase();
        const existing = existingNameMap.get(normName);

        if (existing) {
            const inventories = existing.resource_inventory ? [...existing.resource_inventory] : [];
            const locName = qItem.location || 'Warehouse A';
            const existingInvIndex = inventories.findIndex(inv => 
                inv.project?.project_name?.toLowerCase() === locName.toLowerCase() ||
                inv.project?.project_code?.toLowerCase() === locName.toLowerCase()
            );

            const qtyToAdd = qItem.receivedQty > 0 ? qItem.receivedQty : qItem.expectedQty;

            if (existingInvIndex >= 0) {
                inventories[existingInvIndex] = {
                    ...inventories[existingInvIndex],
                    quantity_in: Math.max(inventories[existingInvIndex].quantity_in, qtyToAdd),
                    updated_at: new Date().toISOString(),
                };
            } else {
                inventories.push({
                    id: `inv-${qItem.id}`,
                    quantity_in: qtyToAdd,
                    quantity_used: 0,
                    quantity_manual_adj: 0,
                    updated_at: new Date().toISOString(),
                    project: {
                        id: `proj-${qItem.id}`,
                        project_name: locName,
                        project_code: locName,
                    }
                });
            }
            existing.resource_inventory = inventories;
        } else {
            const newItem: CatalogResourceWithInventory = {
                id: `cat-po-${qItem.id}`,
                name: qItem.itemName,
                category: targetCat as any,
                subcategory: 'Procured Finance',
                group_name: qItem.vendor ? `Vendor: ${qItem.vendor}` : 'General',
                unit: qItem.unit || 'unit',
                price_default: qItem.unitPrice || 0,
                description: qItem.notes || `Procured via ${qItem.sourceDocNo} from ${qItem.vendor}.`,
                resource_inventory: [
                    {
                        id: `inv-${qItem.id}`,
                        quantity_in: qItem.receivedQty > 0 ? qItem.receivedQty : qItem.expectedQty,
                        quantity_used: 0,
                        quantity_manual_adj: 0,
                        updated_at: new Date().toISOString(),
                        project: {
                            id: `proj-${qItem.id}`,
                            project_name: qItem.location || 'Warehouse A',
                            project_code: qItem.location || 'Warehouse A',
                        }
                    }
                ]
            };
            result.unshift(newItem);
            existingNameMap.set(normName, newItem);
        }
    });

    return result;
}

export async function fetchCatalogResources(
    category: string,
    options?: {
        search?: string;
        subcategory?: string;
        group_name?: string;
        limit?: number;
        offset?: number;
    }
): Promise<{ data: CatalogResourceWithInventory[]; count: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    try {
        const queue = await getReceivingQueue();

        // Base query
        let query = supabase
            .from('pricing_resources')
            .select(`
                id,
                name,
                category,
                subcategory,
                group_name,
                unit,
                price_default,
                description,
                resource_inventory(
                    id,
                    quantity_in,
                    quantity_used,
                    quantity_manual_adj,
                    updated_at,
                    project:projects(id, project_name, project_code)
                )
            `, { count: 'exact' })
            .eq('category', category.toLowerCase());

        // Filtering
        if (options?.search) {
            query = query.ilike('name', `%${options.search}%`);
        }
        if (options?.subcategory && options.subcategory !== 'ALL') {
            query = query.eq('subcategory', options.subcategory);
        }
        if (options?.group_name && options.group_name !== 'ALL') {
            query = query.eq('group_name', options.group_name);
        }

        query = query
            .order('subcategory', { ascending: true, nullsFirst: false })
            .order('group_name', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        let baseList: CatalogResourceWithInventory[] = [];

        if (error || !data || data.length === 0) {
            let mockFiltered = DEFAULT_CATALOG_RESOURCES.filter(r => r.category.toLowerCase() === category.toLowerCase());
            if (options?.search) {
                const s = options.search.toLowerCase();
                mockFiltered = mockFiltered.filter(r => r.name.toLowerCase().includes(s) || (r.description && r.description.toLowerCase().includes(s)));
            }
            if (options?.subcategory && options.subcategory !== 'ALL') {
                mockFiltered = mockFiltered.filter(r => r.subcategory?.toLowerCase() === options.subcategory?.toLowerCase());
            }
            if (options?.group_name && options.group_name !== 'ALL') {
                mockFiltered = mockFiltered.filter(r => r.group_name?.toLowerCase() === options.group_name?.toLowerCase());
            }
            baseList = mockFiltered;
        } else {
            baseList = (data as unknown) as CatalogResourceWithInventory[];
        }

        const merged = mergePaidFinanceItemsIntoCatalog(category, baseList, queue);

        let finalFiltered = merged;
        if (options?.search) {
            const s = options.search.toLowerCase();
            finalFiltered = finalFiltered.filter(r => r.name.toLowerCase().includes(s) || (r.description && r.description.toLowerCase().includes(s)));
        }
        if (options?.subcategory && options.subcategory !== 'ALL') {
            finalFiltered = finalFiltered.filter(r => r.subcategory?.toLowerCase() === options.subcategory?.toLowerCase());
        }
        if (options?.group_name && options.group_name !== 'ALL') {
            finalFiltered = finalFiltered.filter(r => r.group_name?.toLowerCase() === options.group_name?.toLowerCase());
        }

        return {
            data: finalFiltered.slice(offset, offset + limit),
            count: finalFiltered.length,
        };
    } catch (e) {
        let mockFiltered = DEFAULT_CATALOG_RESOURCES.filter(r => r.category.toLowerCase() === category.toLowerCase());
        return {
            data: mockFiltered.slice(offset, offset + limit),
            count: mockFiltered.length,
        };
    }
}

export async function fetchCatalogSubcategories(category: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('pricing_resources')
            .select('subcategory')
            .eq('category', category.toLowerCase())
            .not('subcategory', 'is', null)
            .order('subcategory', { ascending: true });

        const queue = await getReceivingQueue();
        const hasPaidForCat = queue.some(q => q.resourceType.toLowerCase().startsWith(category.toLowerCase().slice(0, 3)));

        if (error || !data || data.length === 0) {
            const defaults = DEFAULT_CATALOG_RESOURCES
                .filter(r => r.category.toLowerCase() === category.toLowerCase())
                .map(r => r.subcategory)
                .filter(Boolean) as string[];
            if (hasPaidForCat) defaults.push('Procured Finance');
            return [...new Set(defaults)];
        }
        const unique = [...new Set((data || []).map((d: any) => d.subcategory).filter(Boolean))];
        if (hasPaidForCat) unique.push('Procured Finance');
        return unique as string[];
    } catch {
        const defaults = DEFAULT_CATALOG_RESOURCES
            .filter(r => r.category.toLowerCase() === category.toLowerCase())
            .map(r => r.subcategory)
            .filter(Boolean) as string[];
        return [...new Set(defaults)];
    }
}

export async function fetchCatalogGroups(category: string, subcategory?: string): Promise<string[]> {
    try {
        let query = supabase
            .from('pricing_resources')
            .select('group_name')
            .eq('category', category.toLowerCase())
            .not('group_name', 'is', null)
            .order('group_name', { ascending: true });

        if (subcategory && subcategory !== 'ALL') {
            query = query.eq('subcategory', subcategory);
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            let defaults = DEFAULT_CATALOG_RESOURCES.filter(r => r.category.toLowerCase() === category.toLowerCase());
            if (subcategory && subcategory !== 'ALL') {
                defaults = defaults.filter(r => r.subcategory?.toLowerCase() === subcategory.toLowerCase());
            }
            const grps = defaults.map(r => r.group_name).filter(Boolean) as string[];
            return [...new Set(grps)];
        }
        const unique = [...new Set((data || []).map((d: any) => d.group_name).filter(Boolean))];
        return unique as string[];
    } catch {
        let defaults = DEFAULT_CATALOG_RESOURCES.filter(r => r.category.toLowerCase() === category.toLowerCase());
        if (subcategory && subcategory !== 'ALL') {
            defaults = defaults.filter(r => r.subcategory?.toLowerCase() === subcategory.toLowerCase());
        }
        const grps = defaults.map(r => r.group_name).filter(Boolean) as string[];
        return [...new Set(grps)];
    }
}

export async function fetchResourceOverviewData() {
    try {
        // Automatically ensure paid finance items are synced into receiving queue
        const queue = await syncPaidPurchasingToReceivingQueue();

        const [matCount, toolCount, assetCount, svcCount] = await Promise.all([
            supabase.from('pricing_resources').select('id', { count: 'exact', head: true }).eq('category', 'material'),
            supabase.from('pricing_resources').select('id', { count: 'exact', head: true }).eq('category', 'tool'),
            supabase.from('pricing_resources').select('id', { count: 'exact', head: true }).eq('category', 'asset'),
            supabase.from('pricing_resources').select('id', { count: 'exact', head: true }).eq('category', 'service'),
        ]);

        const matQueueCount = queue.filter(q => q.resourceType === 'Material').length;
        const toolQueueCount = queue.filter(q => q.resourceType === 'Tools').length;
        const assetQueueCount = queue.filter(q => q.resourceType === 'Assets').length;
        const svcQueueCount = queue.filter(q => q.resourceType === 'Services').length;

        const matTotal = (matCount.count || DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'material').length) + matQueueCount;
        const toolTotal = (toolCount.count || DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'tool').length) + toolQueueCount;
        const assetTotal = (assetCount.count || DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'asset').length) + assetQueueCount;
        const svcTotal = (svcCount.count || DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'service').length) + svcQueueCount;

        const { data: recentSyncs } = await supabase
            .from('resource_sync_log')
            .select(`
                *,
                project:projects(project_name)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        const stats = {
            materials: matTotal,
            tools: toolTotal,
            assets: assetTotal,
            services: svcTotal,
        };

        let activity: any[] = [];
        if (recentSyncs && recentSyncs.length > 0) {
            activity = recentSyncs.map((log: any) => {
                const dateObj = new Date(log.created_at);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return {
                    id: log.id,
                    title: `${log.source_type} Synced`,
                    description: `${log.metadata?.originalName || 'Item'} (${log.metadata?.qty || 0}) synced to ${log.project?.project_name || 'Global'}`,
                    user: 'System Sync',
                    time: `${dateStr}, ${timeStr}`,
                    type: (log.metadata?.category || 'material').toLowerCase()
                };
            });
        } else {
            // Include dynamic paid PO items into activity log
            const paidQueueLogs = queue.slice(0, 4).map(q => ({
                id: `act-${q.id}`,
                title: q.status === 'received' ? 'Stock Receipt Confirmed' : 'PO Paid (Receiving Queued)',
                description: `${q.receivedQty > 0 ? q.receivedQty : q.expectedQty} ${q.unit} of ${q.itemName} from ${q.vendor} (${q.sourceDocNo}).`,
                user: 'Finance Sync',
                time: q.date || 'Today',
                type: (q.resourceType.toLowerCase().replace(/s$/, '') as any) || 'material',
            }));

            activity = [...paidQueueLogs, ...DEFAULT_RESOURCE_ACTIVITY_LOGS].slice(0, 8);
        }

        return { stats, activity };
    } catch (error) {
        console.error("Error fetching overview data:", error);
        return {
            stats: {
                materials: DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'material').length,
                tools: DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'tool').length,
                assets: DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'asset').length,
                services: DEFAULT_CATALOG_RESOURCES.filter(r => r.category === 'service').length,
            },
            activity: DEFAULT_RESOURCE_ACTIVITY_LOGS,
        };
    }
}

export async function triggerAiCleanupApi(): Promise<{ success: boolean; mergedCount?: number; error?: string }> {
    try {
        const response = await fetchAdidayaApi('/api/resources/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned status ${response.status}`);
        }

        const data = await response.json();
        return { success: true, mergedCount: data.mergedCount || 0 };
    } catch (error: any) {
        console.error("AI Cleanup failed:", error);
        return { success: false, error: error.message || "Failed to connect to merge API" };
    }
}
