import { Segment } from '@/components/ui/SegmentedControl';

export const MEMBER_PROFILE_TABS: Segment[] = [
    { id: 'account', label: 'Account', icon: 'person.crop.circle.fill' },
    { id: 'identity', label: 'Identity', icon: 'person.text.rectangle.fill' },
    { id: 'employment', label: 'Employment', icon: 'briefcase.fill' },
    { id: 'access', label: 'Access', icon: 'lock.fill' },
    { id: 'documents', label: 'Documents', icon: 'doc.fill' },
    { id: 'performance', label: 'Performance', icon: 'chart.bar.xaxis' },
];
export const TABS = MEMBER_PROFILE_TABS;

export const RELATIONSHIP_OPTIONS = [
    'Spouse',
    'Parent',
    'Child',
    'Partner',
    'Friend',
    'Family',
    'Other',
];

export const BANK_OPTIONS = [
    { id: 'BCA', label: 'BCA' },
    { id: 'BRI', label: 'BRI' },
    { id: 'BNI', label: 'BNI' },
    { id: 'Mandiri', label: 'Mandiri' },
    { id: 'Bank Syariah Indonesia (BSI)', label: 'Bank Syariah Indonesia (BSI)' },
    { id: 'CIMB Niaga', label: 'CIMB Niaga' },
    { id: 'Permata Bank', label: 'Permata Bank' },
    { id: 'BTN', label: 'BTN' },
    { id: 'Bank Danamon', label: 'Bank Danamon' },
    { id: 'OCBC Indonesia', label: 'OCBC Indonesia' },
    { id: 'Maybank Indonesia', label: 'Maybank Indonesia' },
    { id: 'Bank Mega', label: 'Bank Mega' },
    { id: 'Bank Jago', label: 'Bank Jago' },
    { id: 'SeaBank', label: 'SeaBank' },
    { id: 'blu by BCA Digital', label: 'blu by BCA Digital' },
    { id: 'Allo Bank', label: 'Allo Bank' },
    { id: 'Other', label: 'Other' },
];

export const DOCUMENT_CATEGORIES = [
    { id: 'Pas Foto', label: 'Pas Foto (Profile Photo)' },
    { id: 'KTP', label: 'KTP (National ID)' },
    { id: 'NPWP', label: 'NPWP (Tax ID)' },
    { id: 'CV', label: 'CV / Resume' },
    { id: 'Latest Diploma', label: 'Latest Diploma' },
    { id: 'Latest Transcript', label: 'Latest Transcript' },
];

export interface MemberHistoryItem {
    id: string;
    position: string;
    department: string;
    level: string;
    date: string;
    note?: string;
}

export interface MemberProfileData {
    id: string;
    full_name: string;
    nickname?: string;
    username?: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    personal_email?: string;
    avatar_url?: string;
    role: string;
    status: string;
    account_type?: string;
    include_in_performance?: boolean;

    // Identity
    nik?: string;
    gender?: string;
    birth_date?: string;
    current_address?: string;
    ktp_address?: string;
    emergency_name?: string;
    emergency_relationship?: string;
    emergency_phone?: string;
    linkedin?: string;
    instagram?: string;
    other_socials?: any[];
    bank_name?: string;
    custom_bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
    tax_id?: string;

    // Employment
    department?: string;
    position?: string;
    level?: string;
    order_number?: string;
    employee_id?: string;
    id_code?: string;
    contract_type?: string;
    work_status?: string;
    join_date?: string;
    end_date?: string;
    work_schedule_id?: string;
    schedule_name?: string;
    schedule_detail?: string;
    supervisor?: string;
    employment_history?: MemberHistoryItem[];

    // Performance
    kpi_score?: string | number;
    kpi_status?: string;
    working_days_month?: string | number;
    work_hours_month?: string | number;
    late_permission_month?: string | number;
    overtime_month?: string | number;
    leave_balance_used?: string | number;
    leave_balance_remaining?: string | number;
    month_trend?: string;
    project_count?: string | number;
    engagement_score?: string | number;
}

export function toRomanNumeral(num: number): string {
    if (isNaN(num) || num <= 0) return '0';
    const lookup: [number, string][] = [
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
    ];
    let roman = '';
    let n = num;
    for (const [val, str] of lookup) {
        while (n >= val) {
            roman += str;
            n -= val;
        }
    }
    return roman;
}

export function formatScheduleDetail(item: any): string {
    if (!item) return '';
    const cfg = item.days_config || {};
    const ALL_DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const defaultStart = item.start_time ? item.start_time.substring(0, 5) : '09:00';
    const defaultEnd = item.end_time ? item.end_time.substring(0, 5) : '17:00';
    const defaultBreak = item.break_duration_minutes ?? 60;

    if (item.type === 'Flexible') {
        const dpw = cfg.days_per_week || 5;
        return `${dpw} Days/Week • ${defaultStart} - ${defaultEnd} (Break ${defaultBreak}m)`;
    }
    if (item.type === 'Shift') {
        return `Shift-Based • ${item.timezone || 'Asia/Jakarta'} (Break ${defaultBreak}m)`;
    }

    const rawDays: string[] = Array.isArray(cfg.working_days) ? cfg.working_days : [];
    const sortedDays = [...rawDays].sort((a, b) => ALL_DAYS_ORDER.indexOf(a) - ALL_DAYS_ORDER.indexOf(b));
    const customMap = cfg.custom_hours || {};

    if (sortedDays.length === 0) {
        return `${defaultStart} - ${defaultEnd} (Break ${defaultBreak}m)`;
    }

    const dayHours = sortedDays.map((d) => {
        const c = customMap[d];
        const sTime = c?.start ? c.start.substring(0, 5) : defaultStart;
        const eTime = c?.end ? c.end.substring(0, 5) : defaultEnd;
        const bMin = c?.break !== undefined ? c.break : defaultBreak;
        return { day: d, start: sTime, end: eTime, breakMin: bMin, key: `${sTime}-${eTime}-${bMin}` };
    });

    const formatDaysRangeStr = (days: string[]): string => {
        if (days.length === 0) return '';
        if (days.length === 1) return days[0];
        const sorted = [...days].sort((a, b) => ALL_DAYS_ORDER.indexOf(a) - ALL_DAYS_ORDER.indexOf(b));
        let isContiguous = true;
        const idxs = sorted.map((d) => ALL_DAYS_ORDER.indexOf(d));
        for (let i = 1; i < idxs.length; i++) {
            if (idxs[i] !== idxs[i - 1] + 1) {
                isContiguous = false;
                break;
            }
        }
        return isContiguous && sorted.length > 1
            ? `${sorted[0]} - ${sorted[sorted.length - 1]}`
            : sorted.join(', ');
    };

    const groups: { key: string; days: string[]; start: string; end: string; breakMin: number }[] = [];
    dayHours.forEach((dh) => {
        const existing = groups.find((g) => g.key === dh.key);
        if (existing) {
            existing.days.push(dh.day);
        } else {
            groups.push({
                key: dh.key,
                days: [dh.day],
                start: dh.start,
                end: dh.end,
                breakMin: dh.breakMin,
            });
        }
    });

    return groups.map((g) => `${formatDaysRangeStr(g.days)} • ${g.start} - ${g.end} (Break ${g.breakMin}m)`).join('\n');
}

export function computeEmployeeIdentifiersHelper(
    deptName?: string,
    posName?: string,
    lvlName?: string,
    orderNumberInput?: string | number,
    joinDateInput?: string,
    activeTenantCode?: string,
    departmentsList: any[] = [],
    positionsList: any[] = [],
    levelsList: any[] = []
) {
    const deptObj = departmentsList.find((d: any) => d.name?.toLowerCase() === (deptName || '').toLowerCase());
    const posObj = positionsList.find((p: any) => p.name?.toLowerCase() === (posName || '').toLowerCase());
    const lvlObj = levelsList.find((l: any) => l.name?.toLowerCase() === (lvlName || '').toLowerCase());

    // Clean Order Number
    const rawOrder = String(orderNumberInput ?? '2').replace(/[^0-9]/g, '');
    const cleanOrderNum = rawOrder ? parseInt(rawOrder, 10) : 2;
    const paddedOrder = String(cleanOrderNum).padStart(3, '0');

    // Year
    let yearNum = 2026;
    if (joinDateInput) {
        const parsed = new Date(joinDateInput);
        if (!isNaN(parsed.getFullYear()) && parsed.getFullYear() >= 2000) yearNum = parsed.getFullYear();
    }
    const fullYear = String(yearNum);
    const shortYear = fullYear.slice(-2);

    // Level
    const gradeNum = lvlObj
        ? (lvlObj.level_code !== undefined && lvlObj.level_code !== null ? parseInt(String(lvlObj.level_code), 10) : (lvlObj.order_index ?? 2))
        : 2;
    const romanCode = lvlObj?.roman_code || (gradeNum === 0 ? '0' : toRomanNumeral(gradeNum)) || 'II';

    // Department
    const rawDeptCode = String(deptObj?.code || '1-AID');
    const clusterCode = deptObj?.cluster_code !== null && deptObj?.cluster_code !== undefined
        ? parseInt(String(deptObj.cluster_code), 10)
        : (rawDeptCode.includes('-') ? parseInt(rawDeptCode.split('-')[0], 10) || 1 : 1);
    const cleanDeptCode = (rawDeptCode.includes('-') ? rawDeptCode.split('-')[1] : rawDeptCode)
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'AID';

    // Position
    const rawPosCode = String(posObj?.code || 'AD');
    const cleanPosCode = rawPosCode.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AD';
    const posOrder = posObj?.order_index !== null && posObj?.order_index !== undefined
        ? parseInt(String(posObj.order_index), 10)
        : (positionsList.findIndex((p: any) => p.id === posObj?.id) + 1 || 1);

    // Tenant Prefix
    const tenantPrefix = (activeTenantCode || 'JCP')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase() || 'JCP';

    // Generated Employee ID (8 digits): e.g. 21326002
    const computedEmployeeId = `${gradeNum}${clusterCode}${posOrder}${shortYear}${paddedOrder}`;

    // Generated ID Code: e.g. JCP-II-SLSSL-2026002
    const computedIdCode = `${tenantPrefix}-${romanCode}-${cleanDeptCode}${cleanPosCode}-${fullYear}${paddedOrder}`;

    return {
        order_number: paddedOrder,
        employee_id: computedEmployeeId,
        id_code: computedIdCode,
    };
}

export function formatAddressValue(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                return formatAddressValue(parsed);
            } catch {
                return trimmed;
            }
        }
        return trimmed;
    }
    if (typeof val === 'object') {
        const parts = [
            val.street,
            val.village,
            val.district,
            val.city,
            val.province,
            val.postal_code,
        ].filter((p) => p && typeof p === 'string' && p.trim().length > 0);

        if (parts.length > 0) {
            return parts.join(', ');
        }
        
        if (val.current || val.ktp) {
            return formatAddressValue(val.current || val.ktp);
        }

        const genericParts = Object.values(val).filter((v) => typeof v === 'string' && v.trim().length > 0);
        if (genericParts.length > 0) {
            return genericParts.join(', ');
        }
        return '';
    }
    return String(val);
}

