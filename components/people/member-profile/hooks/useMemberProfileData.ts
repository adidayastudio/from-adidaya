import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { ActionSheetIOS } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
    MemberHistoryItem,
    toRomanNumeral,
    formatScheduleDetail,
    formatAddressValue,
} from '../types';
import { syncProfileCompletionTask, syncRequiredDocumentsTask } from '@/lib/workflows/peopleWorkflow';

export interface UseMemberProfileParams {
    id: string;
    name?: string;
    dept?: string;
    role?: string;
    status?: string;
    email?: string;
}

export function useMemberProfileData(params: UseMemberProfileParams, activeTenant: any) {
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    // People Setup Options
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [positionsList, setPositionsList] = useState<any[]>([]);
    const [levelsList, setLevelsList] = useState<any[]>([]);
    const [contractTypesList, setContractTypesList] = useState<any[]>([]);
    const [workStatusesList, setWorkStatusesList] = useState<any[]>([]);
    const [workSchedulesList, setWorkSchedulesList] = useState<any[]>([]);
    const [employmentPoliciesList, setEmploymentPoliciesList] = useState<any[]>([]);
    const [leavePoliciesList, setLeavePoliciesList] = useState<any[]>([]);

    // User Documents
    const [documents, setDocuments] = useState<any[]>([]);

    // Helper: Dynamic Computation of Employee ID & ID Code
    const computeEmployeeIdentifiers = useCallback((
        deptName?: string,
        posName?: string,
        lvlName?: string,
        orderNumberInput?: string | number,
        joinDateInput?: string,
        activeTenantCode?: string,
        currentDepts?: any[],
        currentPositions?: any[],
        currentLevels?: any[]
    ) => {
        const depts = currentDepts || departmentsList;
        const posList = currentPositions || positionsList;
        const lvls = currentLevels || levelsList;

        const normalize = (str: string) => (str || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
        const cleanDept = normalize(deptName || '');
        const cleanPos = normalize(posName || '');
        const cleanLvl = normalize(lvlName || '');

        const deptObj = depts.find((d: any) => {
            const nameNorm = normalize(d.name || '');
            const codeNorm = (d.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return nameNorm === cleanDept || (nameNorm && cleanDept && (nameNorm.includes(cleanDept) || cleanDept.includes(nameNorm))) || (codeNorm && cleanDept.includes(codeNorm));
        });

        const posObj = posList.find((p: any) => {
            const nameNorm = normalize(p.name || '');
            const codeNorm = (p.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return nameNorm === cleanPos || (nameNorm && cleanPos && (nameNorm.includes(cleanPos) || cleanPos.includes(nameNorm))) || (codeNorm && cleanPos.includes(codeNorm));
        });

        const lvlObj = lvls.find((l: any) => {
            const nameNorm = normalize(l.name || '');
            return nameNorm === cleanLvl || String(l.level_code) === String(lvlName) || (l.roman_code && l.roman_code.toLowerCase() === (lvlName || '').toLowerCase());
        });

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
            : (posList.findIndex((p: any) => p.id === posObj?.id) + 1 || 1);

        // Tenant Prefix
        const tenantPrefix = (activeTenantCode || (activeTenant as any)?.code || (activeTenant as any)?.slug || 'JCP')
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
    }, [departmentsList, positionsList, levelsList, activeTenant]);

    // Profile State
    const [profile, setProfile] = useState<any>({
        id: params.id || '',
        full_name: params.name || '',
        nickname: '',
        username: params.name?.toLowerCase().replace(/\s+/g, '_') || '',
        email: params.email || '',
        phone: '',
        whatsapp: '',
        personal_email: '',
        avatar_url: '',
        role: params.role || 'Member',
        status: (params.status || 'Active').toLowerCase(),
        account_type: 'human',
        include_in_performance: true,

        // Identity
        nik: '',
        gender: 'Male',
        birth_date: '',
        current_address: '',
        ktp_address: '',
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: '',
        linkedin: '',
        instagram: '',
        other_socials: [],
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: '',
        tax_id: '',

        // Employment
        department: params.dept || '',
        position: params.role || '',
        level: '',
        order_number: '',
        employee_id: '',
        id_code: '',
        contract_type: '',
        work_status: '',
        join_date: '',
        end_date: 'Present',
        work_schedule_id: '',
        schedule_name: '',
        schedule_detail: '',
        supervisor: '',
        employment_history: [] as MemberHistoryItem[],

        // Performance
        kpi_score: '',
        kpi_status: '',
        working_days_month: '',
        work_hours_month: '',
        late_permission_month: '',
        overtime_month: '',
        leave_balance_used: '',
        leave_balance_remaining: '',
        month_trend: '',
        project_count: '',
        engagement_score: '',
    });

    const [editForm, setEditForm] = useState<Record<string, any>>({});

    // 1. Fetch People Setup tables for dropdowns
    const fetchSetupOptions = useCallback(async () => {
        try {
            const [
                { data: dData },
                { data: pData },
                { data: lData },
                { data: ctData },
                { data: wsData },
                { data: schedData },
                { data: polData },
                { data: leavePolData },
            ] = await Promise.all([
                supabase.from('organization_departments').select('*').order('name'),
                supabase.from('organization_positions').select('*, organization_departments(id, name, code)'),
                supabase.from('organization_levels').select('*'),
                supabase.from('employment_types').select('*').order('name'),
                supabase.from('work_status').select('*').order('name'),
                supabase.from('work_schedules').select('*').order('created_at'),
                supabase.from('employment_policies').select('*'),
                supabase.from('leave_policies').select('*').order('created_at'),
            ]);

            let sortedLevels: any[] = [];
            if (lData) {
                sortedLevels = [...lData].sort((a: any, b: any) => {
                    const codeA = String(a.level_code || a.code || a.order_index || '');
                    const codeB = String(b.level_code || b.code || b.order_index || '');
                    return codeA.localeCompare(codeB, undefined, { numeric: true });
                });
                setLevelsList(sortedLevels);
            }
            let cleanSchedules: any[] = [];
            if (schedData) {
                const seen = new Set<string>();
                cleanSchedules = schedData.filter((s: any) => {
                    const norm = (s.name || '').trim().toLowerCase();
                    if (!norm || seen.has(norm)) return false;
                    seen.add(norm);
                    return true;
                });
                setWorkSchedulesList(cleanSchedules);
            }
            if (dData) setDepartmentsList(dData);
            if (pData) setPositionsList(pData);
            if (ctData) setContractTypesList(ctData);
            if (wsData) setWorkStatusesList(wsData);
            if (polData) setEmploymentPoliciesList(polData);
            if (leavePolData) setLeavePoliciesList(leavePolData);

            return {
                departments: dData || [],
                positions: pData || [],
                levels: sortedLevels,
                contractTypes: ctData || [],
                workStatuses: wsData || [],
                workSchedules: cleanSchedules,
                leavePolicies: leavePolData || [],
            };
        } catch (e) {
            console.error('Error fetching people setup options:', e);
            return null;
        }
    }, []);

    // 2. Fetch full member details
    const fetchMemberData = useCallback(async (optionsOverride?: {
        departments?: any[];
        positions?: any[];
        levels?: any[];
        contractTypes?: any[];
        workStatuses?: any[];
        workSchedules?: any[];
    }) => {
        if (!params.id) return;
        try {
            const activeLevels = optionsOverride?.levels || levelsList;
            const activeContracts = optionsOverride?.contractTypes || contractTypesList;
            const activeStatuses = optionsOverride?.workStatuses || workStatusesList;
            const activeSchedules = optionsOverride?.workSchedules || workSchedulesList;
            const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', params.id)
                .maybeSingle();

            let tmQuery = supabase
                .from('tenant_members')
                .select('*')
                .eq('user_id', params.id);
            if (activeTenant?.id) {
                tmQuery = tmQuery.eq('tenant_id', activeTenant.id);
            }
            const { data: tmData } = await tmQuery.maybeSingle();

            const { data: docData } = await supabase
                .from('user_documents')
                .select('*')
                .eq('user_id', params.id)
                .order('created_at', { ascending: false });

            if (docData) setDocuments(docData);

            if (pData) {
                const rawRole = tmData?.role || pData.role || params.role || 'Member';
                const roleFormatted = rawRole.toLowerCase() === 'superadmin' ? 'Super Admin' : rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
                const rawStatus = (tmData?.status || pData.status || params.status || 'Active').toLowerCase();
                const isSystem = pData.account_type === 'system';

                let resolvedGender = 'Not Specified';
                if (!isSystem) {
                    resolvedGender = pData.gender === 'Female' ? 'Female' : 'Male';
                }

                // Autogenerate 8-digit Employee ID if not set
                let empId = pData.employee_id || pData.id_number;
                if (!empId && pData.id) {
                    const numericPart = parseInt(pData.id.replace(/[^0-9]/g, '').slice(0, 8), 10);
                    empId = !isNaN(numericPart) && numericPart > 10000000 ? String(numericPart) : '10042891';
                }

                // Parse address, socials, emergency contact, bank safely
                const rawAddr = pData.address;
                const addr = (rawAddr && typeof rawAddr === 'object') ? rawAddr : (typeof rawAddr === 'string' ? (() => { try { return JSON.parse(rawAddr); } catch { return {}; } })() : {});
                const emg = (pData.emergency_contact && typeof pData.emergency_contact === 'object') ? pData.emergency_contact : {};
                const soc = (pData.social_links && typeof pData.social_links === 'object') ? pData.social_links : {};
                const bank = (pData.bank_info && typeof pData.bank_info === 'object') ? pData.bank_info : {};
                const hist = Array.isArray(pData.employment_history) ? pData.employment_history : [];

                const idCodeRaw = pData.display_id || pData.id_code || '';
                const empIdRaw = pData.employee_id || pData.id_number || '';

                // Extract department code (e.g. AID from ADY-VII-AIDAR-2022003)
                const idDeptMatch = idCodeRaw.match(/^[^-]+-[^-]+-([A-Z]{3})/);
                const extractedDeptCode = idDeptMatch ? idDeptMatch[1] : '';

                // Extract position code (e.g. AR from ADY-VII-AIDAR-2022003)
                const idPosMatch = idCodeRaw.match(/^[^-]+-[^-]+-[A-Z]{3}([A-Z]{2,3})/);
                const extractedPosCode = idPosMatch ? idPosMatch[1] : '';

                // Extract Roman numeral level (e.g. VII from ADY-VII-AIDAR-2022003)
                const idRomanMatch = idCodeRaw.match(/^[^-]+-([IVXLCDM]+)-/);
                const extractedRoman = idRomanMatch ? idRomanMatch[1] : '';

                // 1. Resolve Department name
                const activeDepts = optionsOverride?.departments || departmentsList;
                let rawDeptInput = pData.department || params.dept || '';
                let resolvedDept = '';
                if (pData.department_id && activeDepts.length > 0) {
                    const matchedDept = activeDepts.find((d: any) => d.id === pData.department_id);
                    if (matchedDept) resolvedDept = matchedDept.name;
                }
                if (!resolvedDept && rawDeptInput && activeDepts.length > 0) {
                    const normalize = (str: string) => str.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
                    const cleanRaw = normalize(rawDeptInput);
                    const matchedDept = activeDepts.find((d: any) => {
                        const cleanName = normalize(d.name || '');
                        const cleanCode = (d.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        return cleanName === cleanRaw || (cleanName && cleanRaw && (cleanName.includes(cleanRaw) || cleanRaw.includes(cleanName))) || (cleanCode && cleanRaw.includes(cleanCode));
                    });
                    if (matchedDept) resolvedDept = matchedDept.name;
                }
                if (!resolvedDept && extractedDeptCode && activeDepts.length > 0) {
                    const matchedDept = activeDepts.find((d: any) => {
                        const code = (d.code || '').toUpperCase();
                        return code.includes(extractedDeptCode) || (d.name || '').toUpperCase().includes(extractedDeptCode);
                    });
                    if (matchedDept) resolvedDept = matchedDept.name;
                }
                if (!resolvedDept) {
                    resolvedDept = rawDeptInput;
                }

                // 2. Resolve Position name
                const activePositions = optionsOverride?.positions || positionsList;
                let rawPosInput = pData.job_title || pData.position || params.role || '';
                let resolvedPos = '';
                if (pData.position_id && activePositions.length > 0) {
                    const matchedPos = activePositions.find((p: any) => p.id === pData.position_id);
                    if (matchedPos) resolvedPos = matchedPos.name;
                }
                if (!resolvedPos && rawPosInput && activePositions.length > 0) {
                    const normalize = (str: string) => str.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
                    const cleanRaw = normalize(rawPosInput);
                    const matchedPos = activePositions.find((p: any) => {
                        const cleanName = normalize(p.name || '');
                        const cleanCode = (p.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        return cleanName === cleanRaw || (cleanName && cleanRaw && (cleanName.includes(cleanRaw) || cleanRaw.includes(cleanName))) || (cleanCode && cleanRaw.includes(cleanCode));
                    });
                    if (matchedPos) resolvedPos = matchedPos.name;
                }
                if (!resolvedPos && extractedPosCode && activePositions.length > 0) {
                    const matchedPos = activePositions.find((p: any) => {
                        const code = (p.code || '').toUpperCase();
                        return code.includes(extractedPosCode) || (p.name || '').toUpperCase().includes(extractedPosCode);
                    });
                    if (matchedPos) resolvedPos = matchedPos.name;
                }
                if (!resolvedPos) {
                    resolvedPos = rawPosInput;
                }

                // 3. Resolve Level name
                let resolvedLevel = '';
                if (pData.level_id && activeLevels.length > 0) {
                    const matchedLvl = activeLevels.find((l: any) => l.id === pData.level_id);
                    if (matchedLvl) resolvedLevel = matchedLvl.name;
                }
                if (!resolvedLevel && pData.level && activeLevels.length > 0) {
                    const matchedLvl = activeLevels.find((l: any) => l.name?.toLowerCase() === String(pData.level).toLowerCase() || String(l.level_code) === String(pData.level));
                    if (matchedLvl) resolvedLevel = matchedLvl.name;
                }
                if (!resolvedLevel && extractedRoman && activeLevels.length > 0) {
                    const matchedLvl = activeLevels.find((l: any) => (l.roman_code && l.roman_code.toUpperCase() === extractedRoman.toUpperCase()) || (l.name && l.name.toUpperCase().includes(extractedRoman.toUpperCase())));
                    if (matchedLvl) resolvedLevel = matchedLvl.name;
                }
                if (!resolvedLevel && empIdRaw && /^[1-9]$/.test(empIdRaw.charAt(0)) && activeLevels.length > 0) {
                    const digitNum = parseInt(empIdRaw.charAt(0), 10);
                    const matchedLvl = activeLevels.find((l: any) => l.level_code === digitNum || l.order_index === digitNum || l.name?.toLowerCase().includes(`level ${digitNum}`));
                    if (matchedLvl) resolvedLevel = matchedLvl.name;
                }
                if (!resolvedLevel) {
                    resolvedLevel = pData.level || '';
                }

                // 4. Resolve Contract type name
                let resolvedContract = '';
                if (pData.employment_type_id) {
                    const matchedContract = activeContracts.find((c: any) => c.id === pData.employment_type_id);
                    if (matchedContract) resolvedContract = matchedContract.name;
                }

                // 5. Resolve Work status name
                let resolvedWorkStatus = '';
                if (pData.work_status_id && activeStatuses.length > 0) {
                    const matchedWs = activeStatuses.find((w: any) => w.id === pData.work_status_id);
                    if (matchedWs) resolvedWorkStatus = matchedWs.name;
                }
                if (!resolvedWorkStatus && pData.work_status) {
                    resolvedWorkStatus = pData.work_status;
                }
                if (!resolvedWorkStatus && tmData?.status) {
                    resolvedWorkStatus = tmData.status.charAt(0).toUpperCase() + tmData.status.slice(1);
                }
                if (!resolvedWorkStatus && pData.status) {
                    resolvedWorkStatus = pData.status.charAt(0).toUpperCase() + pData.status.slice(1);
                }
                if (!resolvedWorkStatus) {
                    resolvedWorkStatus = 'Active';
                }

                // 6. Resolve Schedule name & detail
                let resolvedSchedId = pData.work_schedule_id || pData.schedule_id || '';
                let resolvedSchedName = '';
                let resolvedSchedDetail = '';
                if (resolvedSchedId && activeSchedules.length > 0) {
                    const matchedSched = activeSchedules.find((s: any) => s.id === resolvedSchedId);
                    if (matchedSched) {
                        resolvedSchedName = matchedSched.name;
                        resolvedSchedDetail = formatScheduleDetail(matchedSched);
                    }
                }
                if (!resolvedSchedName && (pData.schedule || pData.schedule_name) && activeSchedules.length > 0) {
                    const rawSched = pData.schedule || pData.schedule_name;
                    const matchedSched = activeSchedules.find((s: any) => (s.name || '').toLowerCase() === rawSched.toLowerCase());
                    if (matchedSched) {
                        resolvedSchedId = matchedSched.id;
                        resolvedSchedName = matchedSched.name;
                        resolvedSchedDetail = formatScheduleDetail(matchedSched);
                    } else {
                        resolvedSchedName = rawSched;
                    }
                }

                // 7. Resolve Order Number (fallback to extracting from ID Code / Employee ID)
                let rawOrder = pData.order_number ? String(pData.order_number) : '';
                if (!rawOrder) {
                    const matchFromCode = idCodeRaw.match(/\d{4}(\d{3})$/);
                    if (matchFromCode) {
                        rawOrder = matchFromCode[1];
                    } else {
                        const matchFromEmp = empIdRaw.match(/(\d{3})$/);
                        if (matchFromEmp) {
                            rawOrder = matchFromEmp[1];
                        }
                    }
                }
                const paddedOrder = rawOrder ? rawOrder.replace(/[^0-9]/g, '').padStart(3, '0') : '';

                let cleanJoinDate = '';
                if (pData.join_date) {
                    const jd = new Date(pData.join_date);
                    if (!isNaN(jd.getTime()) && jd.getFullYear() >= 2000) {
                        cleanJoinDate = pData.join_date;
                    }
                }
                if (!cleanJoinDate && tmData?.created_at) {
                    const cd = new Date(tmData.created_at);
                    if (!isNaN(cd.getTime()) && cd.getFullYear() >= 2000) {
                        cleanJoinDate = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
                    }
                }

                setProfile({
                    id: pData.id,
                    full_name: pData.full_name || pData.name || params.name || '',
                    nickname: pData.nickname || '',
                    username: pData.username || '',
                    email: pData.email || params.email || '',
                    phone: soc.phone_number || '',
                    whatsapp: soc.whatsapp || pData.phone || '',
                    personal_email: soc.personal_email || '',
                    avatar_url: pData.avatar_url || pData.avatarUrl || '',
                    role: roleFormatted,
                    status: resolvedWorkStatus.toLowerCase(),
                    account_type: isSystem ? 'system' : 'human',
                    include_in_performance: isSystem ? false : (pData.include_in_performance !== false),

                    // Identity
                    nik: pData.nik || pData.national_id || pData.ktp_number || '',
                    gender: resolvedGender,
                    birth_date: pData.birth_date || pData.birthday || '',
                    current_address: formatAddressValue(addr.current || (addr.street ? addr : '')),
                    ktp_address: formatAddressValue(addr.ktp),
                    emergency_name: emg.name || pData.emergency_name || '',
                    emergency_relationship: emg.relationship || pData.emergency_relationship || '',
                    emergency_phone: emg.phone || pData.emergency_phone || '',
                    linkedin: soc.linkedin || '',
                    instagram: soc.instagram || '',
                    other_socials: Array.isArray(soc.extra_links) ? soc.extra_links : [],
                    bank_name: bank.bank_name || pData.bank_name || '',
                    custom_bank_name: bank.custom_bank_name || pData.custom_bank_name || '',
                    bank_account_number: bank.account_number || pData.bank_account_number || '',
                    bank_account_holder: bank.account_holder || pData.bank_account_holder || pData.full_name || '',
                    tax_id: pData.npwp || pData.tax_id || '',

                    // Employment
                    department: resolvedDept || pData.department || params.dept || '',
                    position: resolvedPos || pData.job_title || pData.position || '',
                    level: resolvedLevel,
                    order_number: paddedOrder,
                    employee_id: pData.employee_id || pData.id_number || '',
                    id_code: pData.display_id || pData.id_code || '',
                    contract_type: resolvedContract || pData.contract_type || '',
                    work_status: resolvedWorkStatus || pData.work_status || '',
                    join_date: cleanJoinDate,
                    end_date: pData.contract_end_date || pData.end_date || (pData.contract_type || resolvedContract ? 'Present' : '—'),
                    work_schedule_id: resolvedSchedId,
                    schedule_name: resolvedSchedName || pData.schedule || '',
                    schedule_detail: resolvedSchedDetail || pData.schedule_detail || '',
                    supervisor: pData.supervisor || '',
                    employment_history: hist,

                    // Performance
                    kpi_score: pData.kpi_score || '',
                    kpi_status: pData.kpi_status || '',
                    working_days_month: pData.working_days_month || '',
                    work_hours_month: pData.work_hours_month || '',
                    late_permission_month: pData.late_permission_month || '',
                    overtime_month: pData.overtime_month || '',
                    leave_balance_used: pData.leave_balance_used || '',
                    leave_balance_remaining: pData.leave_balance_remaining || '',
                    month_trend: pData.month_trend || '',
                    project_count: pData.project_count || '',
                    engagement_score: pData.engagement_score || '',
                });
            }
        } catch (e) {
            console.error('Error fetching member profile:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [params.id, params.name, params.dept, params.role, params.status, params.email, computeEmployeeIdentifiers]);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            const opts = await fetchSetupOptions();
            if (isMounted) {
                await fetchMemberData(opts || undefined);
            }
        };
        init();
        return () => {
            isMounted = false;
        };
    }, [params.id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        const opts = await fetchSetupOptions();
        await fetchMemberData(opts || undefined);
    };

    const toggleEditSection = (section: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeSection === section) {
            setActiveSection(null);
        } else {
            const rawOrder = profile.order_number ? String(profile.order_number) : '';
            const paddedOrder = rawOrder ? rawOrder.replace(/[^0-9]/g, '').padStart(3, '0') : '';
            const isSys = profile.account_type === 'system';
            setEditForm({
                ...profile,
                order_number: paddedOrder,
                include_in_performance: isSys ? false : (profile.include_in_performance !== false),
            });
            setActiveSection(section);
        }
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSection(null);
    };

    // Save active section to database
    const handleSave = async () => {
        if (!profile.id) return;
        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const updates: Record<string, any> = {};

            if (activeSection === 'Account Configuration') {
                const isSys = editForm.account_type === 'system';
                updates.account_type = editForm.account_type;
                updates.include_in_performance = isSys ? false : (editForm.include_in_performance !== false);
            } else if (activeSection === 'Account Information') {
                const cleanName = editForm.full_name?.trim();
                updates.full_name = cleanName;
                updates.name = cleanName;
                updates.nickname = editForm.nickname?.trim() || null;
            } else if (activeSection === 'Identity Details') {
                if (editForm.nik?.trim() && editForm.nik.trim().length !== 16) {
                    Alert.alert('Validation Error', 'NIK (National ID) must be exactly 16 numeric digits.');
                    setSaving(false);
                    return;
                }
                updates.birth_date = editForm.birth_date?.trim() || null;
                updates.nik = editForm.nik?.trim() || null;
            } else if (activeSection === 'Contact') {
                const soc = (profile.social_links && typeof profile.social_links === 'object') ? { ...profile.social_links } : {};
                soc.personal_email = editForm.personal_email?.trim() ? editForm.personal_email.trim().toLowerCase() : null;
                soc.whatsapp = editForm.whatsapp?.trim() || null;
                soc.phone_number = editForm.phone?.trim() || null;
                updates.social_links = soc;
                updates.phone = editForm.whatsapp?.trim() || editForm.phone?.trim() || null;
            } else if (activeSection === 'Address') {
                const addr = {
                    current: editForm.current_address?.trim() || null,
                    ktp: editForm.ktp_address?.trim() || null,
                };
                updates.address = addr;
            } else if (activeSection === 'Emergency Contact') {
                const emg = {
                    name: editForm.emergency_name?.trim() || null,
                    relationship: editForm.emergency_relationship?.trim() || null,
                    phone: editForm.emergency_phone?.trim() || null,
                };
                updates.emergency_contact = emg;
            } else if (activeSection === 'Social') {
                const soc = (profile.social_links && typeof profile.social_links === 'object') ? { ...profile.social_links } : {};
                soc.linkedin = editForm.linkedin?.trim() || null;
                soc.instagram = editForm.instagram?.trim() || null;
                updates.social_links = soc;
            } else if (activeSection === 'Finance') {
                const isOther = editForm.bank_name === 'Other' || editForm.bank_name === 'OTHER';
                const finalBankName = isOther ? (editForm.custom_bank_name?.trim() || 'Other') : (editForm.bank_name?.trim() || null);
                const bank = {
                    bank_name: finalBankName,
                    custom_bank_name: isOther ? (editForm.custom_bank_name?.trim() || null) : null,
                    account_number: editForm.bank_account_number?.trim() || null,
                    account_holder: editForm.bank_account_holder?.trim() || null,
                };
                updates.bank_info = bank;
            } else if (activeSection === 'Current Role') {
                const deptObj = departmentsList.find((d) => d.name.toLowerCase() === (editForm.department || '').toLowerCase());
                const posObj = positionsList.find((p) => p.name.toLowerCase() === (editForm.position || '').toLowerCase());
                const lvlObj = levelsList.find((l) => l.name.toLowerCase() === (editForm.level || '').toLowerCase());

                const computed = computeEmployeeIdentifiers(
                    editForm.department,
                    editForm.position,
                    editForm.level,
                    editForm.order_number || profile.order_number,
                    editForm.join_date || profile.join_date
                );

                updates.department = editForm.department?.trim() || null;
                updates.department_id = deptObj?.id || null;
                updates.job_title = editForm.position?.trim() || null;
                updates.position_id = posObj?.id || null;
                updates.level_id = lvlObj?.id || null;
                if (computed.employee_id) updates.employee_id = computed.employee_id;
            } else if (activeSection === 'Employee Identification') {
                const computed = computeEmployeeIdentifiers(
                    profile.department,
                    profile.position,
                    profile.level,
                    editForm.order_number || profile.order_number,
                    profile.join_date
                );
                if (computed.employee_id) updates.employee_id = computed.employee_id;
            } else if (activeSection === 'Employee Status') {
                const contractObj = contractTypesList.find((c) => c.name.toLowerCase() === (editForm.contract_type || '').toLowerCase());
                const statusObj = workStatusesList.find((w) => w.name.toLowerCase() === (editForm.work_status || '').toLowerCase());
                const schedObj = workSchedulesList.find((s) => s.name.toLowerCase() === (editForm.schedule_name || '').toLowerCase());

                const computed = computeEmployeeIdentifiers(
                    editForm.department || profile.department,
                    editForm.position || profile.position,
                    editForm.level || profile.level,
                    editForm.order_number || profile.order_number,
                    editForm.join_date || profile.join_date
                );

                updates.employment_type_id = contractObj?.id || null;
                updates.work_status_id = statusObj?.id || null;
                updates.work_status = editForm.work_status?.trim() || null;
                updates.status = (editForm.work_status || 'active').trim().toLowerCase();
                updates.join_date = editForm.join_date?.trim() || null;
                updates.contract_end_date = editForm.end_date === 'Present' ? null : (editForm.end_date?.trim() || null);
                updates.work_schedule_id = schedObj?.id || editForm.work_schedule_id || null;
                updates.schedule_id = schedObj?.id || editForm.work_schedule_id || null;
                if (computed.employee_id) updates.employee_id = computed.employee_id;
            }

            const { error: pErr } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (pErr) throw pErr;

            // If updating status or role, update tenant_members
            if (activeSection === 'Employee Status' && editForm.work_status) {
                let updateTm = supabase
                    .from('tenant_members')
                    .update({
                        status: editForm.work_status.trim().toLowerCase(),
                    })
                    .eq('user_id', profile.id);
                if (activeTenant?.id) {
                    updateTm = updateTm.eq('tenant_id', activeTenant.id);
                }
                await updateTm;
            }

            await fetchMemberData();
            setActiveSection(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Saved', 'Member details updated successfully.');
            // Two-way sync: update profile completion task in Tasks
            syncProfileCompletionTask(profile.id).catch(console.error);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update member details.');
        } finally {
            setSaving(false);
        }
    };

    // Custom Prompt Modal State (For Web & cross-platform)
    const [promptModalState, setPromptModalState] = useState<{
        visible: boolean;
        title: string;
        description?: string;
        placeholder?: string;
        defaultValue?: string;
        confirmText?: string;
        onConfirm: (text: string) => void;
    }>({
        visible: false,
        title: '',
        onConfirm: () => {},
    });

    // Promotion / Role History Logging
    const handleLogPromotion = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const savePromotionItem = async (noteText?: string) => {
            try {
                const newHistoryItem: MemberHistoryItem = {
                    id: `hist-${Date.now()}`,
                    position: profile.position || profile.role,
                    department: profile.department || 'General Affairs',
                    level: profile.level || 'Standard',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    note: noteText?.trim() || 'Role progression snapshot',
                };

                const updatedHistory = [newHistoryItem, ...(profile.employment_history || [])];
                const { error } = await supabase
                    .from('profiles')
                    .update({ employment_history: updatedHistory })
                    .eq('id', profile.id);

                if (error) throw error;
                await fetchMemberData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Updated', 'Promotion history recorded successfully.');
            } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to save history.');
            }
        };

        if (Platform.OS === 'ios' && (Alert as any).prompt) {
            (Alert as any).prompt(
                'Update Employment / Promotion',
                'Enter promotion notes or reason (e.g. Promoted to Senior Staff):',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Save Promotion',
                        onPress: (noteText?: string) => savePromotionItem(noteText),
                    },
                ],
                'plain-text'
            );
        } else {
            setPromptModalState({
                visible: true,
                title: 'Update Employment / Promotion',
                description: 'Enter promotion notes or reason (e.g. Promoted to Senior Staff):',
                placeholder: 'e.g. Promoted to Senior Staff',
                confirmText: 'Save Promotion',
                onConfirm: (text) => {
                    setPromptModalState((prev) => ({ ...prev, visible: false }));
                    savePromotionItem(text || 'Role progression snapshot');
                },
            });
        }
    };

    // Document Upload for Admin (Supports JPG, PNG, PDF via Camera, Gallery, or Files)
    const handleUploadDoc = async (category: string) => {
        if (!profile.id) return;

        const isPasFoto = category === 'Pas Foto' || category === 'Pas Foto (Profile Photo)';

        const pickAndUpload = async (sourceType: 'camera' | 'gallery' | 'document') => {
            try {
                let fileUri = '';
                let fileName = '';
                let mimeType = '';
                let webFile: any = null;

                if (sourceType === 'camera') {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Needed', 'Camera permission is required.');
                        return;
                    }
                    const res = await ImagePicker.launchCameraAsync({
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_photo.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                    webFile = (res.assets[0] as any).file;
                } else if (sourceType === 'gallery') {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Needed', 'Photo library permission is required.');
                        return;
                    }
                    const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].fileName || `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                    webFile = (res.assets[0] as any).file;
                } else {
                    const res = await DocumentPicker.getDocumentAsync({
                        type: ['application/pdf', 'image/*'],
                        copyToCacheDirectory: true,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].name;
                    mimeType = res.assets[0].mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
                    webFile = (res.assets[0] as any).file;
                }

                setUploadingDoc(category);

                let uploadBody: any;
                if (Platform.OS === 'web') {
                    if (webFile) {
                        uploadBody = webFile;
                    } else {
                        const response = await fetch(fileUri);
                        uploadBody = await response.blob();
                    }
                } else {
                    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    uploadBody = decode(base64Data);
                }

                const fileExt = fileName.split('.').pop() || (mimeType.includes('pdf') ? 'pdf' : 'jpg');
                const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const bucketName = isPasFoto ? 'avatars' : 'attendance';
                const storagePath = `documents/${profile.id}/${safeCategory}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(storagePath, uploadBody, {
                        contentType: mimeType || 'application/octet-stream',
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(storagePath);

                const finalFileUrl = publicUrlData.publicUrl;

                const { data: existingDocs } = await supabase
                    .from('user_documents')
                    .select('id')
                    .eq('user_id', profile.id)
                    .eq('document_type', category);

                const docTitle = isPasFoto ? 'Pas Foto (Profile Photo)' : fileName;

                if (existingDocs && existingDocs.length > 0) {
                    const { error: updateError } = await supabase
                        .from('user_documents')
                        .update({
                            title: docTitle,
                            file_url: finalFileUrl,
                            tenant_id: activeTenant?.id || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingDocs[0].id);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('user_documents')
                        .insert({
                            user_id: profile.id,
                            tenant_id: activeTenant?.id || null,
                            title: docTitle,
                            document_type: category,
                            file_url: finalFileUrl,
                        });
                    if (insertError) throw insertError;
                }

                if (isPasFoto) {
                    await supabase
                        .from('profiles')
                        .update({ avatar_url: finalFileUrl, updated_at: new Date().toISOString() })
                        .eq('id', profile.id);
                    setProfile((prev: any) => ({ ...prev, avatar_url: finalFileUrl }));
                    try {
                        const { data: { user: currentUser } } = await supabase.auth.getUser();
                        if (currentUser?.id === profile.id) {
                            await supabase.auth.updateUser({
                                data: { avatar_url: finalFileUrl }
                            });
                        }
                    } catch {}
                }

                await fetchMemberData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `${category} uploaded successfully.`);
                // Two-way sync: update document & profile task
                syncRequiredDocumentsTask(profile.id).catch(console.error);
                syncProfileCompletionTask(profile.id).catch(console.error);
            } catch (e: any) {
                Alert.alert('Upload Failed', e.message || 'Could not upload document.');
            } finally {
                setUploadingDoc(null);
            }
        };

        if (Platform.OS === 'ios') {
            const options = isPasFoto
                ? ['Cancel', 'Take Photo', 'Photo Library']
                : ['Cancel', 'Take Photo', 'Photo Library', 'Browse Files'];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `Upload ${category}`,
                    options,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) pickAndUpload('camera');
                    else if (buttonIndex === 2) pickAndUpload('gallery');
                    else if (buttonIndex === 3) pickAndUpload('document');
                }
            );
        } else if (Platform.OS === 'web') {
            // Direct native file picker trigger on Web
            pickAndUpload(isPasFoto ? 'gallery' : 'document');
        } else {
            const buttons: any[] = [
                { text: 'Take Photo', onPress: () => pickAndUpload('camera') },
                { text: 'Photo Library', onPress: () => pickAndUpload('gallery') },
            ];
            if (!isPasFoto) {
                buttons.push({ text: 'Browse Files', onPress: () => pickAndUpload('document') });
            }
            buttons.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert(`Upload ${category}`, undefined, buttons);
        }
    };

    // Document Delete for Admin
    const handleDeleteDoc = async (docId: string, category: string) => {
        if (!profile.id) return;
        Alert.alert(
            'Remove Document',
            `Are you sure you want to remove "${category}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('user_documents')
                                .delete()
                                .eq('id', docId);

                            if (error) throw error;

                            if (category === 'Pas Foto' || category === 'Pas Foto (Profile Photo)') {
                                await supabase
                                    .from('profiles')
                                    .update({ avatar_url: null })
                                    .eq('id', profile.id);
                            }

                            await fetchMemberData();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', `${category} removed successfully.`);
                            // Two-way sync: update document & profile task
                            syncRequiredDocumentsTask(profile.id).catch(console.error);
                            syncProfileCompletionTask(profile.id).catch(console.error);
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to remove document.');
                        }
                    }
                }
            ]
        );
    };

    const handleSocialPress = (platform: string, rawVal?: string) => {
        if (!rawVal) return;
        let url = rawVal.trim();
        if (platform.toLowerCase() === 'linkedin') {
            const clean = url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/^in\//i, '');
            url = `https://www.linkedin.com/in/${clean}`;
        } else if (platform.toLowerCase() === 'instagram') {
            const clean = url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/i, '');
            url = `https://www.instagram.com/${clean}`;
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open link in browser.');
        });
    };

    const copyToClipboard = async (text: string, label: string) => {
        if (!text || text === '—') return;
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    };

    // Option Picker State for Web & Android
    const [optionPickerState, setOptionPickerState] = useState<{
        visible: boolean;
        title: string;
        options: { id: string; name: string }[];
        selectedValue?: string;
        onSelect: (item: { id: string; name: string }) => void;
    }>({
        visible: false,
        title: '',
        options: [],
        onSelect: () => {},
    });

    // Generic Options Picker
    const showOptionPicker = (
        title: string,
        options: { id: string; name: string }[],
        onSelect: (item: { id: string; name: string }) => void,
        selectedValue?: string
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!options || options.length === 0) {
            Alert.alert('Info', `No options configured in People Setup for ${title}.`);
            return;
        }

        if (Platform.OS === 'ios') {
            const labels = ['Cancel', ...options.map((o) => o.name)];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `Select ${title}`,
                    options: labels,
                    cancelButtonIndex: 0,
                },
                (btnIdx) => {
                    if (btnIdx > 0) {
                        onSelect(options[btnIdx - 1]);
                    }
                }
            );
        } else {
            setOptionPickerState({
                visible: true,
                title,
                options,
                selectedValue,
                onSelect: (item) => {
                    onSelect(item);
                    setOptionPickerState((prev) => ({ ...prev, visible: false }));
                },
            });
        }
    };

    const selectGender = () => {
        if (editForm.account_type === 'system') return;
        showOptionPicker(
            'Gender',
            [
                { id: 'Male', name: 'Male' },
                { id: 'Female', name: 'Female' },
            ],
            (item) => setEditForm((prev) => ({ ...prev, gender: item.id })),
            editForm.gender || profile.gender
        );
    };

    const getBirthDateObj = () => {
        const bDate = editForm.birth_date || profile.birth_date;
        if (bDate) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
                const [y, m, d] = bDate.split('-').map(Number);
                return new Date(y, m - 1, d, 12, 0, 0);
            }
            const parsed = new Date(bDate);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date(2000, 0, 1, 12, 0, 0);
    };

    const getJoinDateObj = () => {
        const jDate = editForm.join_date || profile.join_date;
        if (jDate) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(jDate)) {
                const [y, m, d] = jDate.split('-').map(Number);
                if (y >= 2000) {
                    return new Date(y, m - 1, d, 12, 0, 0);
                }
            }
            const parsed = new Date(jDate);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
                return parsed;
            }
        }
        return new Date();
    };

    const getEndDateObj = () => {
        const eDate = editForm.end_date || profile.end_date;
        if (eDate && eDate !== 'Present') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(eDate)) {
                const [y, m, d] = eDate.split('-').map(Number);
                return new Date(y, m - 1, d, 12, 0, 0);
            }
            const parsed = new Date(eDate);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date();
    };

    // Matched Employment Policy for current contract type
    const matchedPolicy = useMemo(() => {
        const ctName = (editForm.contract_type || profile.contract_type)?.toLowerCase();
        if (!ctName) return null;
        const ct = contractTypesList.find((c) => c.name.toLowerCase() === ctName);
        if (ct) {
            return employmentPoliciesList.find((p) => p.employment_type_id === ct.id);
        }
        return null;
    }, [editForm.contract_type, profile.contract_type, contractTypesList, employmentPoliciesList]);

    // Matched Leave Policy and computed effective dates
    const matchedLeavePolicy = useMemo(() => {
        const ctName = (editForm.contract_type || profile.contract_type || '').toLowerCase();
        if (!ctName) return null;
        if (leavePoliciesList && leavePoliciesList.length > 0) {
            const matched = leavePoliciesList.find((lp) => {
                if (lp.description) {
                    const contractMatch = lp.description.match(/\[Contract:\s*([^\]]+)\]/i) || lp.description.match(/\[Status:\s*([^\]]+)\]/i);
                    if (contractMatch && ctName && contractMatch[1].toLowerCase() === ctName) {
                        return true;
                    }
                }
                if (lp.name && ctName && lp.name.toLowerCase().includes(ctName)) {
                    return true;
                }
                return false;
            });
            if (matched) return matched;
            return leavePoliciesList[0];
        }
        return null;
    }, [editForm.contract_type, profile.contract_type, leavePoliciesList]);

    const leavePolicyInfo = useMemo(() => {
        const ctName = editForm.contract_type || profile.contract_type;
        if (!ctName) {
            return {
                summary: '—',
                detail: '',
            };
        }

        if (matchedPolicy?.leave_eligible === false) {
            return {
                summary: 'No Leave Entitlement',
                detail: '',
            };
        }

        const annualQuota = matchedLeavePolicy?.annual_leave_quota ?? 12;
        const quotaStr = `${annualQuota} Days / Year Standard`;

        // Effective months (Standard default: 1 year / 12 months after join date)
        let effectiveMonths = 12;
        if (matchedLeavePolicy?.description) {
            const monthsMatch = matchedLeavePolicy.description.match(/\[Effective:\s*(\d+)m\]/i);
            if (monthsMatch) {
                effectiveMonths = parseInt(monthsMatch[1], 10) || 12;
            }
        } else if (matchedLeavePolicy?.effective_after_months !== undefined && matchedLeavePolicy?.effective_after_months !== null) {
            effectiveMonths = parseInt(String(matchedLeavePolicy.effective_after_months), 10) || 12;
        }

        let effectiveDateStr = '';
        const joinDateRaw = editForm.join_date || profile.join_date;
        if (joinDateRaw && joinDateRaw !== '—' && !joinDateRaw.includes('1970')) {
            let jDate: Date | null = null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(joinDateRaw)) {
                const [y, m, d] = joinDateRaw.split('-').map(Number);
                if (y >= 2000) {
                    jDate = new Date(y, m - 1, d);
                }
            } else {
                const parsed = new Date(joinDateRaw);
                if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
                    jDate = parsed;
                }
            }

            if (jDate) {
                const effDate = new Date(jDate.getFullYear(), jDate.getMonth() + effectiveMonths, jDate.getDate());
                const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                effectiveDateStr = `Effective: ${effDate.getDate()} ${monthsShort[effDate.getMonth()]} ${effDate.getFullYear()}`;
            }
        }

        const carryOverAllowed = matchedLeavePolicy?.carry_over_allowed ?? true;
        const carryOverStr = carryOverAllowed ? 'Carry-over' : 'No Carry-over';

        const details = [effectiveDateStr, carryOverStr].filter(Boolean).join(' • ');

        return {
            summary: quotaStr,
            detail: details,
        };
    }, [matchedPolicy, matchedLeavePolicy, editForm.join_date, profile.join_date]);

    return {
        profile,
        setProfile,
        editForm,
        setEditForm,
        activeTab,
        setActiveTab,
        activeSection,
        setActiveSection,
        loading,
        refreshing,
        saving,
        uploadingDoc,
        departmentsList,
        positionsList,
        levelsList,
        contractTypesList,
        workStatusesList,
        workSchedulesList,
        employmentPoliciesList,
        leavePoliciesList,
        matchedPolicy,
        matchedLeavePolicy,
        leavePolicyInfo,
        documents,
        computeEmployeeIdentifiers,
        fetchSetupOptions,
        fetchMemberData,
        handleRefresh,
        toggleEditSection,
        handleCancel,
        handleSave,
        handleLogPromotion,
        handleUploadDoc,
        handleDeleteDoc,
        handleSocialPress,
        copyToClipboard,
        showOptionPicker,
        selectGender,
        getBirthDateObj,
        getJoinDateObj,
        getEndDateObj,
        optionPickerState,
        setOptionPickerState,
        promptModalState,
        setPromptModalState,
    };
}
