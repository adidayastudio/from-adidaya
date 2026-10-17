import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { differenceInDays, differenceInMonths, addMonths, startOfYear, endOfYear, parseISO } from 'date-fns';

export type LeaveTypeCategory =
    | 'annual'
    | 'sick'
    | 'permission'
    | 'unpaid'
    | 'maternity_paternity'
    | 'custom';

export type LeaveTargetType =
    | 'all'
    | 'employment_type'
    | 'department'
    | 'position'
    | 'level'
    | 'specific_employees';

export type EvidenceAttachmentMode = 'disabled' | 'optional' | 'required';
export type AdvanceNoticeOption = 'immediate' | '1_day' | '3_days' | '7_days' | 'custom';
export type FirstYearEntitlementMode = 'full' | 'prorated';
export type RoundingRule = 'round_down' | 'nearest' | 'round_up';

export interface PermissionSubtypeItem {
    id: string;
    name: string;
    is_enabled: boolean;
    max_days: number;
    is_paid: boolean;
    quota_cycle?: 'yearly' | 'monthly';
    max_days_per_month_mode?: 'unlimited' | 'limited';
    max_days_per_month?: number | null;
    min_notice_preset?: AdvanceNoticeOption;
    min_notice_days?: number; // 0 = Immediate / Same day, 1 = 1 day notice, etc.
    evidence_mode: EvidenceAttachmentMode;
    description?: string;
}

export interface LeavePolicy {
    id: string;
    name: string;
    leave_type: LeaveTypeCategory;
    status: 'Active' | 'Inactive';
    is_paid: boolean;
    entitlement_days: number; // e.g. 12 days/year or 1 day/month
    quota_cycle?: 'yearly' | 'monthly'; // default yearly
    max_days_per_month_mode?: 'unlimited' | 'limited'; // default unlimited
    max_days_per_month?: number | null; // e.g. 2 days/month limit
    
    // Eligibility / Applies To
    applies_to: LeaveTargetType;
    target_employment_types?: string[]; // e.g. ['Full-time', 'Contract']
    target_department_ids?: string[];
    target_position_ids?: string[];
    target_level_ids?: string[];
    target_employee_ids?: string[];

    // Approval & Request Constraints
    require_approval: boolean;
    require_reason: boolean;
    evidence_mode: EvidenceAttachmentMode;
    min_notice_days: number; // 0 = Immediate, 1 = 1 day, 3 = 3 days, 7 = 7 days, etc.
    min_notice_preset?: AdvanceNoticeOption;

    // Annual Leave Rules
    eligibility_waiting_period_months?: number; // e.g. 12 months before eligible
    first_year_entitlement?: FirstYearEntitlementMode; // 'full' | 'prorated'
    proration_basis?: 'monthly' | 'daily'; // default monthly
    rounding_rule?: RoundingRule; // 'round_down' | 'nearest' | 'round_up'

    // Permission Subtypes
    permission_subtypes?: PermissionSubtypeItem[];

    // General description & notes
    description?: string;
    created_at?: string;
    updated_at?: string;

    // Legacy fields preserved for backward compatibility
    annual_leave_quota?: number;
    sick_leave_quota?: number;
    permission_quota?: number;
    accrual_type?: string;
    carry_over_allowed?: boolean;
    effective_after_months?: number;
}

// Default Permission Subtypes
export const DEFAULT_PERMISSION_SUBTYPES: PermissionSubtypeItem[] = [
    {
        id: 'half_day',
        name: 'Half Day (0.5 Day)',
        is_enabled: true,
        max_days: 0.5,
        is_paid: true,
        quota_cycle: 'monthly',
        max_days_per_month_mode: 'unlimited',
        min_notice_preset: 'immediate',
        min_notice_days: 0,
        evidence_mode: 'optional',
        description: 'Morning or afternoon half-day leave permit',
    },
    {
        id: 'menstrual',
        name: 'First Day Menstrual Leave',
        is_enabled: true,
        max_days: 1,
        is_paid: true,
        quota_cycle: 'monthly',
        max_days_per_month_mode: 'unlimited',
        min_notice_preset: 'immediate',
        min_notice_days: 0,
        evidence_mode: 'optional',
        description: 'First or second day menstrual leave permit',
    },
    {
        id: 'marriage',
        name: 'Marriage / Engagement',
        is_enabled: true,
        max_days: 3,
        is_paid: true,
        quota_cycle: 'yearly',
        max_days_per_month_mode: 'unlimited',
        min_notice_preset: '3_days',
        min_notice_days: 3,
        evidence_mode: 'optional',
        description: 'Employee wedding celebration (up to 3 consecutive days)',
    },
    {
        id: 'grief',
        name: 'Family Grief / Bereavement',
        is_enabled: true,
        max_days: 3,
        is_paid: true,
        quota_cycle: 'yearly',
        max_days_per_month_mode: 'unlimited',
        min_notice_preset: 'immediate',
        min_notice_days: 0,
        evidence_mode: 'optional',
        description: 'Immediate family bereavement or emergency grief leave',
    },
    {
        id: 'custom_permission',
        name: 'Custom Permission Permit',
        is_enabled: true,
        max_days: 1,
        is_paid: true,
        quota_cycle: 'monthly',
        max_days_per_month_mode: 'unlimited',
        min_notice_preset: '1_day',
        min_notice_days: 1,
        evidence_mode: 'optional',
        description: 'General urgent personal matters or official permits',
    },
];

// 5 Starter Presets
export const LEAVE_POLICY_PRESETS: Array<{
    id: string;
    name: string;
    leave_type: LeaveTypeCategory;
    subtitle: string;
    description: string;
    policy: Omit<LeavePolicy, 'id' | 'created_at' | 'updated_at'>;
}> = [
    {
        id: 'preset-annual-leave',
        name: 'Annual Leave',
        leave_type: 'annual',
        subtitle: '12 days/year · Paid · Prorated Monthly',
        description: 'Standard paid annual vacation leave with 12 months waiting period, prorated for first year, and 7-day advance notice.',
        policy: {
            name: 'Standard Annual Leave',
            leave_type: 'annual',
            status: 'Active',
            is_paid: true,
            entitlement_days: 12,
            annual_leave_quota: 12,
            applies_to: 'all',
            target_employment_types: [],
            require_approval: true,
            require_reason: true,
            evidence_mode: 'disabled',
            min_notice_days: 7,
            min_notice_preset: '7_days',
            eligibility_waiting_period_months: 12,
            first_year_entitlement: 'prorated',
            proration_basis: 'monthly',
            rounding_rule: 'round_down',
            description: 'Standard corporate paid annual vacation leave.',
        },
    },
    {
        id: 'preset-sick-leave',
        name: 'Sick Leave',
        leave_type: 'sick',
        subtitle: '14 days/year · Paid · Immediate Notice',
        description: 'Medical and health recovery leave. Immediate same-day notice. Medical certificate required for leaves longer than 2 days.',
        policy: {
            name: 'Standard Sick Leave',
            leave_type: 'sick',
            status: 'Active',
            is_paid: true,
            entitlement_days: 14,
            sick_leave_quota: 14,
            applies_to: 'all',
            target_employment_types: [],
            require_approval: true,
            require_reason: true,
            evidence_mode: 'optional',
            min_notice_days: 0,
            min_notice_preset: 'immediate',
            eligibility_waiting_period_months: 0,
            description: 'Medical and sickness absence. Requires doctor letter for >2 days.',
        },
    },
    {
        id: 'preset-permission',
        name: 'Permission',
        leave_type: 'permission',
        subtitle: 'Special Absence & Permits · 5 Configurable Subtypes',
        description: 'Approved official permits including Half Day, First Day Menstrual, Marriage (3d), and Family Grief (3d).',
        policy: {
            name: 'Standard Permission',
            leave_type: 'permission',
            status: 'Active',
            is_paid: true,
            entitlement_days: 5,
            permission_quota: 5,
            applies_to: 'all',
            target_employment_types: [],
            require_approval: true,
            require_reason: true,
            evidence_mode: 'optional',
            min_notice_days: 1,
            min_notice_preset: '1_day',
            eligibility_waiting_period_months: 0,
            permission_subtypes: [...DEFAULT_PERMISSION_SUBTYPES],
            description: 'Special leaves and short permits with custom duration per subtype.',
        },
    },
    {
        id: 'preset-unpaid-leave',
        name: 'Unpaid Leave',
        leave_type: 'unpaid',
        subtitle: 'Flexible Duration · Unpaid · 3-Day Notice',
        description: 'Non-compensated leave of absence for personal or sabbatical needs with salary deduction calculation.',
        policy: {
            name: 'Standard Unpaid Leave',
            leave_type: 'unpaid',
            status: 'Active',
            is_paid: false,
            entitlement_days: 30,
            applies_to: 'all',
            target_employment_types: [],
            require_approval: true,
            require_reason: true,
            evidence_mode: 'optional',
            min_notice_days: 3,
            min_notice_preset: '3_days',
            eligibility_waiting_period_months: 0,
            description: 'Unpaid personal absence outside standard entitlements.',
        },
    },
    {
        id: 'preset-maternity-paternity',
        name: 'Maternity / Paternity',
        leave_type: 'maternity_paternity',
        subtitle: '90 Days Maternity / 3 Days Paternity · Paid',
        description: 'Statutory family care leave for childbirth and post-natal recovery. Requires birth / medical verification document.',
        policy: {
            name: 'Maternity & Paternity Leave',
            leave_type: 'maternity_paternity',
            status: 'Active',
            is_paid: true,
            entitlement_days: 90,
            applies_to: 'all',
            target_employment_types: [],
            require_approval: true,
            require_reason: true,
            evidence_mode: 'required',
            min_notice_days: 7,
            min_notice_preset: '7_days',
            eligibility_waiting_period_months: 0,
            description: 'Maternity (90 days) and Paternity (3 days) statutory paid leave.',
        },
    },
];

const STORAGE_KEY = 'adidaya_leave_policies_v2';
type PolicyListener = (policies: LeavePolicy[]) => void;
const listeners = new Set<PolicyListener>();

export function subscribeLeavePolicies(listener: PolicyListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function notifyListeners(policies: LeavePolicy[]) {
    listeners.forEach((fn) => {
        try {
            fn(policies);
        } catch (e) {
            console.error('[LeavePolicies] Listener error:', e);
        }
    });
}

// Normalize raw database record or legacy JSON into modern LeavePolicy
export function normalizeLeavePolicy(raw: any): LeavePolicy {
    if (!raw) {
        return {
            id: `lp-${Date.now()}`,
            name: 'Annual Leave',
            leave_type: 'annual',
            status: 'Active',
            is_paid: true,
            entitlement_days: 12,
            applies_to: 'all',
            require_approval: true,
            require_reason: true,
            evidence_mode: 'disabled',
            min_notice_days: 7,
        };
    }

    // Extract tags from description if present
    const rawDesc = String(raw.description || '');
    const metaMatch = rawDesc.match(/\[LEAVE_META:\s*({.+?})\]/);
    let meta: any = null;
    if (metaMatch) {
        try {
            meta = JSON.parse(metaMatch[1]);
        } catch (e) {
            console.warn('[LeavePolicies] Failed to parse meta JSON:', e);
        }
    }

    const contractMatch = rawDesc.match(/\[Contract:\s*([^\]]+)\]/i) || rawDesc.match(/\[Status:\s*([^\]]+)\]/i);
    const monthsMatch = rawDesc.match(/\[Effective:\s*(\d+)m\]/i);

    // Determine leave_type
    let leaveType: LeaveTypeCategory = meta?.leave_type || raw.leave_type;
    if (!leaveType) {
        const nameLower = (raw.name || '').toLowerCase();
        if (nameLower.includes('annual') || nameLower.includes('cuti tahunan')) {
            leaveType = 'annual';
        } else if (nameLower.includes('sick') || nameLower.includes('sakit')) {
            leaveType = 'sick';
        } else if (nameLower.includes('permission') || nameLower.includes('izin') || nameLower.includes('permit')) {
            leaveType = 'permission';
        } else if (nameLower.includes('unpaid') || nameLower.includes('tanpa gaji')) {
            leaveType = 'unpaid';
        } else if (nameLower.includes('maternity') || nameLower.includes('paternity') || nameLower.includes('melahirkan')) {
            leaveType = 'maternity_paternity';
        } else {
            leaveType = 'annual';
        }
    }

    // Determine applies_to
    let appliesTo: LeaveTargetType = meta?.applies_to || raw.applies_to || 'all';
    let targetEmploymentTypes = Array.isArray(meta?.target_employment_types)
        ? meta.target_employment_types
        : Array.isArray(raw.target_employment_types)
        ? raw.target_employment_types
        : [];
    if (!meta?.applies_to && !raw.applies_to && contractMatch) {
        const ctVal = contractMatch[1].trim();
        if (ctVal && ctVal !== 'All' && ctVal !== 'All Contract Types') {
            appliesTo = 'employment_type';
            targetEmploymentTypes = [ctVal];
        }
    }

    // Determine waiting period
    let waitingMonths = meta?.eligibility_waiting_period_months ?? raw.eligibility_waiting_period_months;
    if (waitingMonths === undefined || waitingMonths === null) {
        if (raw.effective_after_months !== undefined && raw.effective_after_months !== null) {
            waitingMonths = Number(raw.effective_after_months);
        } else if (monthsMatch) {
            waitingMonths = parseInt(monthsMatch[1], 10);
        } else {
            waitingMonths = leaveType === 'annual' ? 12 : 0;
        }
    }

    // Entitlement days
    const entitlementDays =
        meta?.entitlement_days !== undefined && meta?.entitlement_days !== null
            ? Number(meta.entitlement_days)
            : raw.entitlement_days !== undefined && raw.entitlement_days !== null
            ? Number(raw.entitlement_days)
            : raw.annual_leave_quota !== undefined && raw.annual_leave_quota !== null
            ? Number(raw.annual_leave_quota)
            : raw.days !== undefined && raw.days !== null
            ? Number(raw.days)
            : 12;

    // Subtypes for permission
    let subtypes: PermissionSubtypeItem[] | undefined = undefined;
    if (leaveType === 'permission') {
        if (Array.isArray(meta?.permission_subtypes) && meta.permission_subtypes.length > 0) {
            subtypes = meta.permission_subtypes;
        } else if (Array.isArray(raw.permission_subtypes) && raw.permission_subtypes.length > 0) {
            subtypes = raw.permission_subtypes;
        } else {
            subtypes = [...DEFAULT_PERMISSION_SUBTYPES];
        }
    }

    const cleanDescription = rawDesc
        .replace(/\[LEAVE_META:\s*{.+?}\]\s*/g, '')
        .replace(/\[Contract:\s*[^\]]+\]\s*/gi, '')
        .replace(/\[Status:\s*[^\]]+\]\s*/gi, '')
        .replace(/\[Effective:\s*[^\]]+\]\s*/gi, '')
        .trim();

    return {
        id: String(raw.id || `lp-${Date.now()}`),
        name: raw.name || 'Leave Policy',
        leave_type: leaveType,
        status: meta?.status || (raw.status === 'Inactive' || raw.is_active === false ? 'Inactive' : 'Active'),
        is_paid: meta?.is_paid !== undefined ? meta.is_paid : raw.is_paid !== false,
        entitlement_days: entitlementDays,
        quota_cycle: meta?.quota_cycle || raw.quota_cycle || 'yearly',
        max_days_per_month_mode: meta?.max_days_per_month_mode || raw.max_days_per_month_mode || (raw.max_days_per_month ? 'limited' : 'unlimited'),
        max_days_per_month: meta?.max_days_per_month !== undefined ? meta.max_days_per_month : raw.max_days_per_month !== undefined && raw.max_days_per_month !== null ? Number(raw.max_days_per_month) : null,
        applies_to: appliesTo,
        target_employment_types: targetEmploymentTypes,
        target_department_ids: Array.isArray(meta?.target_department_ids) ? meta.target_department_ids : Array.isArray(raw.target_department_ids) ? raw.target_department_ids : [],
        target_position_ids: Array.isArray(meta?.target_position_ids) ? meta.target_position_ids : Array.isArray(raw.target_position_ids) ? raw.target_position_ids : [],
        target_level_ids: Array.isArray(meta?.target_level_ids) ? meta.target_level_ids : Array.isArray(raw.target_level_ids) ? raw.target_level_ids : [],
        target_employee_ids: Array.isArray(meta?.target_employee_ids) ? meta.target_employee_ids : Array.isArray(raw.target_employee_ids) ? raw.target_employee_ids : [],
        require_approval: meta?.require_approval !== undefined ? meta.require_approval : raw.require_approval !== false,
        require_reason: meta?.require_reason !== undefined ? meta.require_reason : raw.require_reason !== false,
        evidence_mode: meta?.evidence_mode || raw.evidence_mode || (leaveType === 'maternity_paternity' ? 'required' : leaveType === 'sick' ? 'optional' : 'disabled'),
        min_notice_days: meta?.min_notice_days !== undefined ? meta.min_notice_days : raw.min_notice_days !== undefined ? Number(raw.min_notice_days) : leaveType === 'annual' ? 7 : leaveType === 'sick' ? 0 : 1,
        min_notice_preset: meta?.min_notice_preset || raw.min_notice_preset || (leaveType === 'annual' ? '7_days' : leaveType === 'sick' ? 'immediate' : '1_day'),
        eligibility_waiting_period_months: waitingMonths,
        first_year_entitlement: meta?.first_year_entitlement || raw.first_year_entitlement || 'prorated',
        proration_basis: meta?.proration_basis || raw.proration_basis || 'monthly',
        rounding_rule: meta?.rounding_rule || raw.rounding_rule || 'round_down',
        permission_subtypes: subtypes,
        description: cleanDescription,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        // Preserve legacy
        annual_leave_quota: raw.annual_leave_quota ?? entitlementDays,
        sick_leave_quota: raw.sick_leave_quota ?? 0,
        permission_quota: raw.permission_quota ?? 0,
        accrual_type: raw.accrual_type || 'annual',
        carry_over_allowed: Boolean(raw.carry_over_allowed),
        effective_after_months: waitingMonths,
    };
}

// Convert LeavePolicy into a payload suitable for Supabase insertion/updating while preserving old fields
export function serializeLeavePolicyForDb(policy: LeavePolicy): Record<string, any> {
    const metaPayload = {
        leave_type: policy.leave_type,
        status: policy.status,
        is_paid: policy.is_paid,
        entitlement_days: policy.entitlement_days,
        quota_cycle: policy.quota_cycle || 'yearly',
        max_days_per_month_mode: policy.max_days_per_month_mode || 'unlimited',
        max_days_per_month: policy.max_days_per_month || null,
        applies_to: policy.applies_to,
        target_employment_types: policy.target_employment_types || [],
        target_department_ids: policy.target_department_ids || [],
        target_position_ids: policy.target_position_ids || [],
        target_level_ids: policy.target_level_ids || [],
        target_employee_ids: policy.target_employee_ids || [],
        require_approval: policy.require_approval,
        require_reason: policy.require_reason,
        evidence_mode: policy.evidence_mode,
        min_notice_days: policy.min_notice_days,
        min_notice_preset: policy.min_notice_preset,
        eligibility_waiting_period_months: policy.eligibility_waiting_period_months,
        first_year_entitlement: policy.first_year_entitlement,
        proration_basis: policy.proration_basis,
        rounding_rule: policy.rounding_rule,
        permission_subtypes: policy.permission_subtypes || null,
    };

    const contractTag =
        policy.applies_to === 'employment_type' && policy.target_employment_types?.length
            ? `[Contract: ${policy.target_employment_types.join(', ')}]`
            : '';
    const monthsVal = policy.eligibility_waiting_period_months ?? (policy.leave_type === 'annual' ? 12 : 0);
    const monthsTag = `[Effective: ${monthsVal}m]`;
    const cleanDesc = (policy.description || '')
        .replace(/\[LEAVE_META:\s*{.+?}\]\s*/g, '')
        .replace(/\[Contract:[^\]]+\]\s*/gi, '')
        .replace(/\[Status:[^\]]+\]\s*/gi, '')
        .replace(/\[Effective:[^\]]+\]\s*/gi, '')
        .trim();
    const metaTag = `[LEAVE_META:${JSON.stringify(metaPayload)}]`;
    const compositeDesc = [metaTag, contractTag, monthsTag, cleanDesc].filter(Boolean).join(' ');

    const validAccrualType = (policy.quota_cycle === 'monthly' || policy.accrual_type === 'monthly') ? 'monthly' : 'annual';

    const payload: Record<string, any> = {
        name: policy.name,
        annual_leave_quota: policy.entitlement_days,
        sick_leave_quota: policy.leave_type === 'sick' ? policy.entitlement_days : 0,
        permission_quota: policy.leave_type === 'permission' ? policy.entitlement_days : 0,
        accrual_type: validAccrualType,
        description: compositeDesc,
    };

    const isUUID = policy.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(policy.id);
    if (isUUID) {
        payload.id = policy.id;
    }

    return payload;
}

// Fetch all Leave Policies (Supabase + Local Cache fallback)
export async function fetchLeavePolicies(): Promise<LeavePolicy[]> {
    let localPolicies: LeavePolicy[] = [];
    try {
        const rawLocal = await AsyncStorage.getItem(STORAGE_KEY);
        if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
                localPolicies = parsed.map(normalizeLeavePolicy);
            }
        }
    } catch (e) {
        console.warn('[LeavePolicies] Failed reading local storage:', e);
    }

    try {
        const { data, error } = await supabase
            .from('leave_policies')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            const normalized = data.map(normalizeLeavePolicy);
            // Save to local cache
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            notifyListeners(normalized);
            return normalized;
        }
    } catch (err) {
        console.warn('[LeavePolicies] Supabase fetch fallback to local:', err);
    }

    notifyListeners(localPolicies);
    return localPolicies;
}

// Save or Update a Leave Policy
export async function saveLeavePolicy(policy: LeavePolicy): Promise<LeavePolicy> {
    const normalized = normalizeLeavePolicy(policy);
    const dbPayload = serializeLeavePolicyForDb(normalized);

    // 1. Try Supabase
    let savedFromDb: any = null;
    try {
        const isUUID = policy.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(policy.id);
        if (isUUID) {
            const { data, error } = await supabase
                .from('leave_policies')
                .upsert(dbPayload)
                .select()
                .single();
            if (error) {
                console.warn('[LeavePolicies] Supabase upsert error:', error.message);
            } else if (data) {
                savedFromDb = data;
            }
        } else {
            const { data, error } = await supabase
                .from('leave_policies')
                .insert([dbPayload])
                .select()
                .single();
            if (error) {
                console.warn('[LeavePolicies] Supabase insert error:', error.message);
            } else if (data) {
                savedFromDb = data;
            }
        }
    } catch (err) {
        console.warn('[LeavePolicies] Supabase save error:', err);
    }

    if (savedFromDb) {
        const dbNormalized = normalizeLeavePolicy(savedFromDb);
        normalized.id = dbNormalized.id;
    }

    // 2. Update local storage
    const rawLocal = await AsyncStorage.getItem(STORAGE_KEY);
    let current: LeavePolicy[] = [];
    if (rawLocal) {
        try {
            current = JSON.parse(rawLocal).map(normalizeLeavePolicy);
        } catch {}
    }
    const existingIndex = current.findIndex((p) => p.id === normalized.id);
    let updated: LeavePolicy[];
    if (existingIndex >= 0) {
        updated = [...current];
        updated[existingIndex] = normalized;
    } else {
        updated = [normalized, ...current];
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);
    return normalized;
}

// Duplicate a Leave Policy
export async function duplicateLeavePolicy(policyId: string): Promise<LeavePolicy | null> {
    const current = await fetchLeavePolicies();
    const target = current.find((p) => p.id === policyId);
    if (!target) return null;

    const cloned: LeavePolicy = {
        ...target,
        id: `policy-${Date.now()}`,
        name: `${target.name} (Copy)`,
        created_at: new Date().toISOString(),
    };

    return await saveLeavePolicy(cloned);
}

// Toggle Enable/Disable Policy
export async function toggleLeavePolicyStatus(policyId: string, active?: boolean): Promise<LeavePolicy | null> {
    const current = await fetchLeavePolicies();
    const target = current.find((p) => p.id === policyId);
    if (!target) return null;

    const newStatus: 'Active' | 'Inactive' =
        active !== undefined
            ? active ? 'Active' : 'Inactive'
            : target.status === 'Active' ? 'Inactive' : 'Active';

    const updated: LeavePolicy = {
        ...target,
        status: newStatus,
    };

    return await saveLeavePolicy(updated);
}

// Delete a Leave Policy
export async function deleteLeavePolicy(policyId: string): Promise<boolean> {
    try {
        await supabase.from('leave_policies').delete().eq('id', policyId);
    } catch (err) {
        console.warn('[LeavePolicies] Supabase delete error:', err);
    }

    const current = await fetchLeavePolicies();
    const filtered = current.filter((p) => p.id !== policyId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    notifyListeners(filtered);
    return true;
}

// Match user profile against policy eligibility
export function isUserEligibleForPolicy(policy: LeavePolicy, userProfile: any): boolean {
    if (!policy || policy.status !== 'Active') return false;
    if (policy.applies_to === 'all') return true;

    if (!userProfile) return true; // Permissive if no profile passed

    // 1. Employment Type
    if (policy.applies_to === 'employment_type') {
        const empType = (
            userProfile.contract_type ||
            userProfile.employment_type ||
            userProfile.employment_type_name ||
            ''
        ).toLowerCase();
        const targetTypes = (policy.target_employment_types || []).map((t) => t.toLowerCase());
        if (targetTypes.length === 0) return true;
        return targetTypes.some((t) => empType.includes(t) || t.includes(empType));
    }

    // 2. Department
    if (policy.applies_to === 'department') {
        const deptId = String(userProfile.department_id || userProfile.department || '').toLowerCase();
        const targetDepts = (policy.target_department_ids || []).map((d) => String(d).toLowerCase());
        if (targetDepts.length === 0) return true;
        return targetDepts.includes(deptId);
    }

    // 3. Position
    if (policy.applies_to === 'position') {
        const posId = String(userProfile.position_id || userProfile.position || userProfile.job_title || '').toLowerCase();
        const targetPositions = (policy.target_position_ids || []).map((p) => String(p).toLowerCase());
        if (targetPositions.length === 0) return true;
        return targetPositions.includes(posId);
    }

    // 4. Level
    if (policy.applies_to === 'level') {
        const lvlId = String(userProfile.level_id || userProfile.organization_level_id || userProfile.level_code || userProfile.level || '').toLowerCase();
        const targetLevels = (policy.target_level_ids || []).map((l) => String(l).toLowerCase());
        if (targetLevels.length === 0) return true;
        return targetLevels.includes(lvlId);
    }

    // 5. Specific Employees
    if (policy.applies_to === 'specific_employees') {
        const userId = String(userProfile.id || userProfile.userId || userProfile.user_id || '').toLowerCase();
        const targetEmployees = (policy.target_employee_ids || []).map((e) => String(e).toLowerCase());
        if (targetEmployees.length === 0) return true;
        return targetEmployees.includes(userId);
    }

    return true;
}

// Filter eligible active policies for user
export function getEligibleLeavePolicies(policies: LeavePolicy[], userProfile: any): LeavePolicy[] {
    return policies.filter((p) => isUserEligibleForPolicy(p, userProfile));
}

// Calculate Annual Leave Proration
// Formula: Annual Entitlement × Eligible Months Remaining ÷ 12
// Uses effective eligibility date (join date + waiting period), not raw join date, to determine remaining months
export function calculateProratedAnnualLeave(
    policy: LeavePolicy,
    joinDateStr?: string | null,
    targetYear?: number
): {
    totalQuota: number;
    isEligible: boolean;
    effectiveEligibilityDate: Date | null;
    eligibleMonthsRemaining: number;
    explanation: string;
} {
    const standardEntitlement = policy.entitlement_days || 12;
    const currentYear = targetYear || new Date().getFullYear();

    if (!joinDateStr) {
        return {
            totalQuota: standardEntitlement,
            isEligible: true,
            effectiveEligibilityDate: null,
            eligibleMonthsRemaining: 12,
            explanation: `Standard full entitlement of ${standardEntitlement} days/year.`,
        };
    }

    let joinDate: Date;
    try {
        joinDate = parseISO(joinDateStr);
        if (isNaN(joinDate.getTime())) {
            joinDate = new Date(joinDateStr);
        }
    } catch {
        return {
            totalQuota: standardEntitlement,
            isEligible: true,
            effectiveEligibilityDate: null,
            eligibleMonthsRemaining: 12,
            explanation: `Standard full entitlement of ${standardEntitlement} days/year.`,
        };
    }

    const waitingPeriodMonths = policy.eligibility_waiting_period_months ?? 12;
    const effectiveEligibilityDate = addMonths(joinDate, waitingPeriodMonths);
    const today = new Date();

    // Check if employee has reached effective eligibility date
    if (today < effectiveEligibilityDate) {
        const monthsLeft = differenceInMonths(effectiveEligibilityDate, today) + 1;
        return {
            totalQuota: 0,
            isEligible: false,
            effectiveEligibilityDate,
            eligibleMonthsRemaining: 0,
            explanation: `In waiting period (${waitingPeriodMonths} months). Eligible in ${monthsLeft} month(s) on ${effectiveEligibilityDate.toLocaleDateString()}.`,
        };
    }

    // If first year entitlement is FULL, grant full standard quota
    if (policy.first_year_entitlement === 'full') {
        return {
            totalQuota: standardEntitlement,
            isEligible: true,
            effectiveEligibilityDate,
            eligibleMonthsRemaining: 12,
            explanation: `Full first-year entitlement of ${standardEntitlement} days/year.`,
        };
    }

    // Proration calculation:
    // If effective eligibility date started in current year, calculate remaining months (including effective month)
    const eligibilityYear = effectiveEligibilityDate.getFullYear();
    if (eligibilityYear === currentYear) {
        // e.g. September (month index 8) -> Sep, Oct, Nov, Dec = 4 months
        const eligibilityMonthIndex = effectiveEligibilityDate.getMonth(); // 0-indexed (0 = Jan, 8 = Sep)
        const eligibleMonthsRemaining = 12 - eligibilityMonthIndex; // e.g. 12 - 8 = 4

        const rawProrated = (standardEntitlement * eligibleMonthsRemaining) / 12;
        let finalQuota: number;

        switch (policy.rounding_rule) {
            case 'round_up':
                finalQuota = Math.ceil(rawProrated);
                break;
            case 'nearest':
                finalQuota = Math.round(rawProrated);
                break;
            case 'round_down':
            default:
                finalQuota = Math.floor(rawProrated);
                break;
        }

        return {
            totalQuota: Math.max(0, finalQuota),
            isEligible: true,
            effectiveEligibilityDate,
            eligibleMonthsRemaining,
            explanation: `Prorated: ${standardEntitlement} × ${eligibleMonthsRemaining}/12 = ${finalQuota} days (Effective starting ${effectiveEligibilityDate.toLocaleDateString()}).`,
        };
    }

    // If eligibility started before the current year, full year quota applies
    return {
        totalQuota: standardEntitlement,
        isEligible: true,
        effectiveEligibilityDate,
        eligibleMonthsRemaining: 12,
        explanation: `Full annual entitlement of ${standardEntitlement} days for ${currentYear}.`,
    };
}
