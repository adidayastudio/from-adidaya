// ── Types matching from-adidaya web CatalogResource ──

export interface CatalogResource {
    id: string;
    name: string;
    category: 'material' | 'tool' | 'asset' | 'service';
    subcategory: string | null;
    group_name: string | null;
    unit: string;
    price_default: number;
    description: string | null;
    metadata?: { variant_index?: number };
}

export interface ProjectStock {
    project: string;
    quantity: number;
    unit: string;
    photo?: string;
    lastUpdated?: string;
}

export type ActivityType = 'material' | 'tool' | 'asset' | 'service';

export interface ActivityLog {
    id: string;
    title: string;
    description: string;
    user: string;
    time: string;
    type: ActivityType;
}

// ── Code Generation (ported from web ResourceCard.tsx) ──

export const CATEGORY_CODES: Record<string, string> = {
    material: 'MT',
    tool: 'TL',
    asset: 'AS',
    service: 'SV',
    labor: 'LB',
    equipment: 'EQ',
};

export const SUBCATEGORY_BADGE_MAP: Record<string, string> = {
    'arsitektur': 'ARS',
    'struktur': 'STR',
    'mep': 'MEP',
    'finishing': 'FIN',
    'interior': 'INT',
    'lansekap': 'LAN',
    'umum': 'GEN',
    'power tools': 'PWR',
    'hand tools': 'HND',
    'measuring': 'MSR',
    'safety equipment': 'SFT',
    'heavy equipment': 'HVY',
    'vehicles': 'VHC',
    'temporary structures': 'TMP',
    'subcontractor': 'SUB',
    'consulting': 'CON',
    'testing': 'TST',
    'logistics': 'LOG',
};

const LEVEL2_MAP: Record<string, string> = {
    'struktur': '01',
    'arsitektur': '02',
    'mep': '03',
    'finishing': '04',
    'umum': '00',
    'power tools': '01',
    'hand tools': '02',
    'measuring': '03',
    'safety equipment': '04',
    'heavy equipment': '01',
    'vehicles': '02',
    'temporary structures': '03',
    'subcontractor': '01',
    'consulting': '02',
    'testing': '03',
    'logistics': '04',
};

const LEVEL3_MAP: Record<string, string> = {
    'dinding': '01',
    'beton': '02',
    'besi': '03',
    'lantai': '04',
    'plafon': '05',
    'kaca': '06',
    'kayu': '07',
    'cat': '08',
    'atap': '09',
    'sanitair': '10',
    'plesteran': '11',
};

const UNIT_FORMAT_MAP: Record<string, string> = {
    'm3': 'm³',
    'm2': 'm²',
    'm1': 'm',
};

export function formatUnit(unit: string): string {
    const u = unit.toLowerCase();
    return UNIT_FORMAT_MAP[u] || u;
}

export function smartCapitalize(text: string): string {
    if (!text) return "";
    const lowerUnits = new Set(['kg', 'cm', 'mm', 'ml', 'm3', 'm2', 'm', 'sak', 'btg', 'pcs', 'ls', 'dus', 'box']);
    return text.split(' ').map(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerUnits.has(cleanWord)) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

export function generateResourceCode(item: Partial<CatalogResource> & { name?: string; category?: string; subcategory?: string | null; group_name?: string | null; metadata?: any }): string {
    const cat = CATEGORY_CODES[(item.category || 'material').toLowerCase()] || 'MT';
    const sub = (item.subcategory || 'umum').toLowerCase();
    const l2 = LEVEL2_MAP[sub] || '01';
    const grp = (item.group_name || 'umum').toLowerCase();
    const l3 = LEVEL3_MAP[grp] || '01';

    const getL4Code = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash % 99).toString().padStart(2, '0');
    };
    const l4 = getL4Code((item.name || 'item').split(' - ')[0].trim().toLowerCase());
    const variant = (item.metadata?.variant_index || 0).toString().padStart(2, '0');

    return `${cat}-${l2}${l3}${l4}${variant}`;
}

// ── Status System (derived from stock qty like web) ──

export type ResourceStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Available' | 'Maintenance' | 'Broken' | 'Transferred' | 'On Lease';

export const STATUS_MAP: Record<string, { color: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string }> = {
    'In Stock': {
        color: '#007AFF',
        bgLight: 'rgba(0,122,255,0.08)',
        bgDark: 'rgba(0,122,255,0.15)',
        borderLight: 'rgba(0,122,255,0.15)',
        borderDark: 'rgba(0,122,255,0.25)',
    },
    'Low Stock': {
        color: '#FF9500',
        bgLight: 'rgba(255,149,0,0.08)',
        bgDark: 'rgba(255,149,0,0.15)',
        borderLight: 'rgba(255,149,0,0.15)',
        borderDark: 'rgba(255,149,0,0.25)',
    },
    'Out of Stock': {
        color: '#FF3B30',
        bgLight: 'rgba(255,59,48,0.08)',
        bgDark: 'rgba(255,59,48,0.15)',
        borderLight: 'rgba(255,59,48,0.15)',
        borderDark: 'rgba(255,59,48,0.25)',
    },
    'Available': {
        color: '#34C759',
        bgLight: 'rgba(52,199,89,0.08)',
        bgDark: 'rgba(52,199,89,0.15)',
        borderLight: 'rgba(52,199,89,0.15)',
        borderDark: 'rgba(52,199,89,0.25)',
    },
    'Maintenance': {
        color: '#FF9500',
        bgLight: 'rgba(255,149,0,0.08)',
        bgDark: 'rgba(255,149,0,0.15)',
        borderLight: 'rgba(255,149,0,0.15)',
        borderDark: 'rgba(255,149,0,0.25)',
    },
    'Broken': {
        color: '#FF3B30',
        bgLight: 'rgba(255,59,48,0.08)',
        bgDark: 'rgba(255,59,48,0.15)',
        borderLight: 'rgba(255,59,48,0.15)',
        borderDark: 'rgba(255,59,48,0.25)',
    },
    'Transferred': {
        color: '#AF52DE',
        bgLight: 'rgba(175,82,222,0.08)',
        bgDark: 'rgba(175,82,222,0.15)',
        borderLight: 'rgba(175,82,222,0.15)',
        borderDark: 'rgba(175,82,222,0.25)',
    },
};

export function deriveStatus(item: CatalogResource, projectStock: ProjectStock[]): ResourceStatus {
    const totalQuantity = projectStock.reduce((acc, curr) => acc + curr.quantity, 0);
    const isTool = item.category === 'tool';
    const isAsset = item.category === 'asset';

    if (isTool || isAsset) {
        return totalQuantity > 0 ? 'Available' : 'Maintenance';
    }
    // material / service
    if (totalQuantity <= 0) return 'Out of Stock';
    if (totalQuantity < 10) return 'Low Stock';
    return 'In Stock';
}

export function getSubcategoryBadge(item: CatalogResource): string {
    const sub = (item.subcategory || 'umum').toLowerCase();
    return SUBCATEGORY_BADGE_MAP[sub] || CATEGORY_CODES[item.category] || 'RES';
}
// Unused mock data arrays removed for Live Supabase Integration.
