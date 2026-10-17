export type CrewRole = 'FOREMAN' | 'LEADER' | 'SKILLED' | 'HELPER' | 'OPERATOR' | 'GENERAL';
export type CrewStatus = 'ACTIVE' | 'INACTIVE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'CUTI' | '';
export type RequestType = 'LEAVE' | 'KASBON' | 'REIMBURSE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
export type DocumentType = 'KTP' | 'KK' | 'BPJS_KES' | 'BPJS_TK' | 'ASURANSI_LAIN' | 'OTHER';

export interface CrewDocument {
    id: string;
    type: DocumentType;
    label: string;
    fileUrl: string;
    fileName: string;
}

export interface CrewMember {
    id: string;
    name: string;
    initials: string;
    role: CrewRole;
    status: CrewStatus;
    skillTags: string[];
    projectCode?: string;
    baseDailyRate: number;
    overtimeDailyRate: number;
    otRate1: number;
    otRate2: number;
    otRate3: number;
    phone?: string;
    email?: string;
    sequenceNum?: number;
    notes?: string;
    joinDate?: string;
    // Personal data
    nickname?: string;
    photoUrl?: string;
    nik?: string;
    birthDate?: string;
    homeAddress?: string;
    // Payroll account
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    // Documents
    documents?: CrewDocument[];
}

export interface Project {
    code: string;
    name: string;
    number?: string;
}

export interface Assignment {
    id: string;
    crewId: string;
    crewName: string;
    crewRole: CrewRole;
    projectCode: string;
    startDate: string;
    endDate?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'INACTIVE';
}

export interface DailyLog {
    id: string;
    crewId: string;
    projectCode: string;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
    regularHours: number;
    ot1Hours: number;
    ot2Hours: number;
    ot3Hours: number;
}

export interface CrewRequest {
    id: string;
    crewId: string;
    crewName: string;
    crewRole: CrewRole;
    projectCode?: string;
    type: RequestType;
    amount?: number;
    startDate: string;
    endDate?: string;
    reason: string;
    status: RequestStatus;
    createdAt: string;
    proofUrl?: string;
    rejectReason?: string;
    movedToPeriod?: string;
}

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
    FOREMAN: 'Foreman',
    LEADER: 'Team Leader',
    SKILLED: 'Skilled Worker',
    HELPER: 'Helper',
    OPERATOR: 'Operator',
    GENERAL: 'General Worker',
};

export const CREW_ROLE_OPTIONS = Object.entries(CREW_ROLE_LABELS).map(([value, label]) => ({
    value: value as CrewRole,
    label,
}));

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    KTP: 'KTP',
    KK: 'Kartu Keluarga',
    BPJS_KES: 'BPJS Kesehatan',
    BPJS_TK: 'BPJS Ketenagakerjaan',
    ASURANSI_LAIN: 'Asuransi Lain',
    OTHER: 'Lainnya',
};

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
    value: value as DocumentType,
    label,
}));

export const INITIAL_PROJECTS: Project[] = [
    { code: '001-RWM', name: 'Rawa Minyak Waterway' },
    { code: '008-RBH', name: 'Rawa Buaya Infrastructure' },
    { code: '009-LAX', name: 'Lorong Agung Bridge' },
    { code: '012-KBY', name: 'Kebayoran MRT Extension' },
];

export const INITIAL_CREW_MEMBERS: CrewMember[] = [
    {
        id: 'c1',
        name: 'Bambang Pamungkas',
        initials: 'BP',
        role: 'FOREMAN',
        status: 'ACTIVE',
        skillTags: ['Scaffolding', 'Safety Officer', 'Site Supervision'],
        projectCode: '008-RBH',
        baseDailyRate: 350000,
        overtimeDailyRate: 450000,
        otRate1: 60000,
        otRate2: 80000,
        otRate3: 100000,
        phone: '+62 812-3456-7890',
        email: 'bambang.p@adidaya.com',
        nickname: 'Bambang',
        nik: '3175012345678901',
        birthDate: '1985-03-15',
        homeAddress: 'Jl. Raya Kebayoran No. 45, Jakarta Selatan',
        bankName: 'BCA',
        bankAccountNumber: '1234567890',
        bankAccountName: 'Bambang Pamungkas',
        documents: [
            { id: 'doc1', type: 'KTP', label: 'KTP', fileUrl: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=600&q=80', fileName: 'ktp_bambang.jpg' },
        ],
    },
    {
        id: 'c2',
        name: 'Agus Setiawan',
        initials: 'AS',
        role: 'LEADER',
        status: 'ACTIVE',
        skillTags: ['Concrete Casting', 'Masonry', 'Carpentry'],
        projectCode: '008-RBH',
        baseDailyRate: 280000,
        overtimeDailyRate: 360000,
        otRate1: 50000,
        otRate2: 70000,
        otRate3: 90000,
        phone: '+62 813-9876-5432',
        email: 'agus.setiawan@adidaya.com',
    },
    {
        id: 'c3',
        name: 'Rudi Hartono',
        initials: 'RH',
        role: 'SKILLED',
        status: 'ACTIVE',
        skillTags: ['Welding', 'Metalworking', 'Steel Structure'],
        projectCode: '001-RWM',
        baseDailyRate: 220000,
        overtimeDailyRate: 300000,
        otRate1: 40000,
        otRate2: 55000,
        otRate3: 70000,
        phone: '+62 811-5555-4444',
        email: 'rudi.h@adidaya.com',
    },
    {
        id: 'c4',
        name: 'Joko Widodo',
        initials: 'JW',
        role: 'HELPER',
        status: 'ACTIVE',
        skillTags: ['General Labor', 'Excavation Support'],
        projectCode: '001-RWM',
        baseDailyRate: 150000,
        overtimeDailyRate: 200000,
        otRate1: 25000,
        otRate2: 35000,
        otRate3: 45000,
        phone: '+62 812-7777-8888',
        email: 'joko.w@adidaya.com',
    },
    {
        id: 'c5',
        name: 'Heri Prasetyo',
        initials: 'HP',
        role: 'OPERATOR',
        status: 'ACTIVE',
        skillTags: ['Excavator Operator', 'Heavy Equipment License'],
        projectCode: '009-LAX',
        baseDailyRate: 300000,
        overtimeDailyRate: 400000,
        otRate1: 55000,
        otRate2: 75000,
        otRate3: 95000,
        phone: '+62 857-1111-2222',
        email: 'heri.p@adidaya.com',
    },
    {
        id: 'c6',
        name: 'Dedi Kurniawan',
        initials: 'DK',
        role: 'GENERAL',
        status: 'INACTIVE',
        skillTags: ['General Assistance', 'Site Cleaning'],
        baseDailyRate: 140000,
        overtimeDailyRate: 180000,
        otRate1: 20000,
        otRate2: 30000,
        otRate3: 40000,
        phone: '+62 819-3333-4444',
        email: 'dedi.k@adidaya.com',
    },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
    {
        id: 'a1',
        crewId: 'c1',
        crewName: 'Bambang Pamungkas',
        crewRole: 'FOREMAN',
        projectCode: '008-RBH',
        startDate: '2026-04-01',
        status: 'ACTIVE',
    },
    {
        id: 'a2',
        crewId: 'c2',
        crewName: 'Agus Setiawan',
        crewRole: 'LEADER',
        projectCode: '008-RBH',
        startDate: '2026-04-05',
        status: 'ACTIVE',
    },
    {
        id: 'a3',
        crewId: 'c3',
        crewName: 'Rudi Hartono',
        crewRole: 'SKILLED',
        projectCode: '001-RWM',
        startDate: '2026-03-10',
        status: 'ACTIVE',
    },
    {
        id: 'a4',
        crewId: 'c4',
        crewName: 'Joko Widodo',
        crewRole: 'HELPER',
        projectCode: '001-RWM',
        startDate: '2026-03-15',
        status: 'ACTIVE',
    },
    {
        id: 'a5',
        crewId: 'c5',
        crewName: 'Heri Prasetyo',
        crewRole: 'OPERATOR',
        projectCode: '009-LAX',
        startDate: '2026-05-01',
        status: 'ACTIVE',
    },
    {
        id: 'a6',
        crewId: 'c6',
        crewName: 'Dedi Kurniawan',
        crewRole: 'GENERAL',
        projectCode: '001-RWM',
        startDate: '2026-02-01',
        endDate: '2026-04-15',
        status: 'COMPLETED',
    },
];

export const INITIAL_DAILY_LOGS: DailyLog[] = [
    // RWM Logs
    { id: 'l1', crewId: 'c3', projectCode: '001-RWM', date: '2026-05-21', status: 'PRESENT', regularHours: 8, ot1Hours: 1, ot2Hours: 0, ot3Hours: 0 },
    { id: 'l2', crewId: 'c4', projectCode: '001-RWM', date: '2026-05-21', status: 'PRESENT', regularHours: 8, ot1Hours: 0, ot2Hours: 0, ot3Hours: 0 },
    
    // RBH Logs
    { id: 'l3', crewId: 'c1', projectCode: '008-RBH', date: '2026-05-21', status: 'PRESENT', regularHours: 8, ot1Hours: 2, ot2Hours: 1, ot3Hours: 0 },
    { id: 'l4', crewId: 'c2', projectCode: '008-RBH', date: '2026-05-21', status: 'HALF_DAY', regularHours: 4, ot1Hours: 0, ot2Hours: 0, ot3Hours: 0 },

    // Past Logs BP
    { id: 'l5', crewId: 'c1', projectCode: '008-RBH', date: '2026-05-20', status: 'PRESENT', regularHours: 8, ot1Hours: 1, ot2Hours: 0, ot3Hours: 0 },
    { id: 'l6', crewId: 'c1', projectCode: '008-RBH', date: '2026-05-19', status: 'PRESENT', regularHours: 8, ot1Hours: 0, ot2Hours: 0, ot3Hours: 0 },
    { id: 'l7', crewId: 'c1', projectCode: '008-RBH', date: '2026-05-18', status: 'ABSENT', regularHours: 0, ot1Hours: 0, ot2Hours: 0, ot3Hours: 0 },
];

export const INITIAL_REQUESTS: CrewRequest[] = [
    // --- PENDING REQUESTS ---
    {
        id: 'r1',
        crewId: 'c2',
        crewName: 'Agus Setiawan',
        crewRole: 'LEADER',
        projectCode: '008-RBH',
        type: 'LEAVE',
        startDate: '2026-05-25',
        endDate: '2026-05-26',
        reason: 'Family gathering in Bandung',
        status: 'PENDING',
        createdAt: '2026-05-21T09:12:00Z',
    },
    {
        id: 'r2_pending',
        crewId: 'c1',
        crewName: 'Bambang Pamungkas',
        crewRole: 'FOREMAN',
        projectCode: '008-RBH',
        type: 'KASBON',
        amount: 1000000,
        startDate: '2026-05-22',
        reason: 'Emergency cash advance for motorcycle repairs',
        status: 'PENDING',
        createdAt: '2026-05-22T08:15:00Z',
        proofUrl: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=600&q=80',
    },
    {
        id: 'r3_pending',
        crewId: 'c3',
        crewName: 'Rudi Hartono',
        crewRole: 'SKILLED',
        projectCode: '001-RWM',
        type: 'REIMBURSE',
        amount: 250000,
        startDate: '2026-05-21',
        reason: 'Urgent site materials (water pipeline PVC connectors)',
        status: 'PENDING',
        createdAt: '2026-05-21T16:45:00Z',
        proofUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    },

    // --- APPROVED REQUESTS ---
    {
        id: 'r4_approved',
        crewId: 'c4',
        crewName: 'Joko Widodo',
        crewRole: 'HELPER',
        projectCode: '001-RWM',
        type: 'LEAVE',
        startDate: '2026-05-12',
        endDate: '2026-05-14',
        reason: 'Wife giving birth in Solo',
        status: 'APPROVED',
        createdAt: '2026-05-10T07:30:00Z',
    },
    {
        id: 'r2',
        crewId: 'c3',
        crewName: 'Rudi Hartono',
        crewRole: 'SKILLED',
        projectCode: '001-RWM',
        type: 'KASBON',
        amount: 500000,
        startDate: '2026-05-21',
        reason: 'Emergency medicine for child',
        status: 'APPROVED',
        createdAt: '2026-05-20T14:30:00Z',
    },
    {
        id: 'r3',
        crewId: 'c4',
        crewName: 'Joko Widodo',
        crewRole: 'HELPER',
        projectCode: '001-RWM',
        type: 'REIMBURSE',
        amount: 150000,
        startDate: '2026-05-18',
        reason: 'Safety boots purchase replacement',
        status: 'APPROVED',
        createdAt: '2026-05-19T08:00:00Z',
        proofUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    },

    // --- REJECTED REQUESTS ---
    {
        id: 'r4',
        crewId: 'c5',
        crewName: 'Heri Prasetyo',
        crewRole: 'OPERATOR',
        projectCode: '009-LAX',
        type: 'LEAVE',
        startDate: '2026-05-10',
        endDate: '2026-05-11',
        reason: 'Sick leave, doctor checkup',
        status: 'REJECTED',
        createdAt: '2026-05-09T10:00:00Z',
        rejectReason: 'Did not provide medical certificate proof document.',
    },
    {
        id: 'r5_rejected',
        crewId: 'c6',
        crewName: 'Dedi Kurniawan',
        crewRole: 'GENERAL',
        projectCode: '001-RWM',
        type: 'KASBON',
        amount: 2000000,
        startDate: '2026-05-15',
        reason: 'Personal loan for home renovation',
        status: 'REJECTED',
        createdAt: '2026-05-14T11:20:00Z',
        rejectReason: 'Exceeds maximum allowable kasbon limit of Rp 1.000.000.',
    },
    {
        id: 'r6_rejected',
        crewId: 'c2',
        crewName: 'Agus Setiawan',
        crewRole: 'LEADER',
        projectCode: '008-RBH',
        type: 'REIMBURSE',
        amount: 350000,
        startDate: '2026-05-16',
        reason: 'Dinner with local subcontractors',
        status: 'REJECTED',
        createdAt: '2026-05-16T20:30:00Z',
        rejectReason: 'Subcontractor entertainment is not reimbursable without prior manager approval.',
    },
];

export function getRomanNumeral(num: number): string {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return roman[num - 1] || 'I';
}

export function generateCrewId(
    member: CrewMember,
    allMembers: CrewMember[],
    allAssignments: Assignment[]
): string {
    // 1. Join Year (XX) - 2 digits
    let year = '26'; // Default to current mock year (2026)
    const memberAssignments = allAssignments.filter(a => a.crewId === member.id);
    if (memberAssignments.length > 0) {
        const sorted = [...memberAssignments].sort((a, b) => {
            const dA = a.startDate === 'Ongoing' ? '' : a.startDate;
            const dB = b.startDate === 'Ongoing' ? '' : b.startDate;
            return dA.localeCompare(dB);
        });
        const earliestDate = sorted[0]?.startDate;
        if (earliestDate && earliestDate.match(/^\d{4}/)) {
            year = earliestDate.substring(2, 4);
        }
    }

    // 2. Role code (YY)
    const roleCodes: Record<CrewRole, string> = {
        FOREMAN: '01',
        LEADER: '02',
        SKILLED: '03',
        HELPER: '04',
        OPERATOR: '05',
        GENERAL: '06',
    };
    const roleCode = roleCodes[member.role] || '06';

    // 3. First project code number (ZZZ) - 3 digits
    let projectNum = '000';
    if (memberAssignments.length > 0) {
        const sorted = [...memberAssignments].sort((a, b) => {
            const dA = a.startDate === 'Ongoing' ? '' : a.startDate;
            const dB = b.startDate === 'Ongoing' ? '' : b.startDate;
            return dA.localeCompare(dB);
        });
        const firstProj = sorted[0]?.projectCode;
        if (firstProj) {
            const match = firstProj.match(/^(\d+)/);
            if (match) {
                projectNum = match[1].padStart(3, '0');
            }
        }
    } else if (member.projectCode) {
        const match = member.projectCode.match(/^(\d+)/);
        if (match) {
            projectNum = match[1].padStart(3, '0');
        }
    }

    // 4. Sequence number in directory (AAA) - 3 digits
    let seq = member.sequenceNum;
    if (!seq) {
        const match = member.id.match(/^c(\d+)$/);
        if (match) {
            seq = parseInt(match[1], 10);
        } else {
            const idx = allMembers.findIndex(m => m.id === member.id);
            seq = idx >= 0 ? idx + 1 : allMembers.length + 1;
        }
    }
    const seqStr = String(seq).padStart(3, '0');

    return `${year}${roleCode}${projectNum}${seqStr}`;
}

export function generateContractNumber(
    assignment: Assignment,
    allAssignments: Assignment[]
): string {
    // Format: ADY/XXX/YYY/CAC/V/2026
    
    // XXX: 3-digit sequential index of assignment WITHIN the same project
    const projectAssignments = allAssignments.filter(a => a.projectCode === assignment.projectCode);
    const sorted = [...projectAssignments].sort((a, b) => {
        const dateA = a.startDate || '';
        const dateB = b.startDate || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id.localeCompare(b.id);
    });
    
    let idx = sorted.findIndex(a => a.id === assignment.id);
    if (idx === -1) {
        idx = projectAssignments.length; // Fallback for newly created assignments not yet in list
    }
    const seq = String(idx + 1).padStart(3, '0');

    // YYY: 3-digit project number code
    let projectNum = '000';
    if (assignment.projectCode) {
        const match = assignment.projectCode.match(/^(\d+)/);
        if (match) {
            projectNum = match[1].padStart(3, '0');
        }
    }

    // V & 2026: Month (Roman) & Year from startDate (format: YYYY-MM-DD)
    let romanMonth = 'V';
    let year = '2026';
    if (assignment.startDate) {
        const parts = assignment.startDate.split('-');
        if (parts.length >= 2) {
            const y = parts[0];
            const m = parseInt(parts[1], 10);
            if (y && y.length === 4) {
                year = y;
            }
            if (!isNaN(m) && m >= 1 && m <= 12) {
                romanMonth = getRomanNumeral(m);
            }
        }
    }

    return `ADY/${seq}/${projectNum}/CAC/${romanMonth}/${year}`;
}

export function matchProjectCode(code1?: string, code2?: string): boolean {
    if (!code1 || !code2) return false;
    const c1 = code1.toUpperCase().trim();
    const c2 = code2.toUpperCase().trim();
    if (c1 === c2) return true;

    // Split by non-alphanumeric characters (like hyphens, dots, spaces, etc.)
    const tokens1 = c1.split(/[^A-Z0-9]+/);
    const tokens2 = c2.split(/[^A-Z0-9]+/);

    // If they share any token of length >= 2, we consider it a match
    for (const t1 of tokens1) {
        if (!t1 || t1.length < 2) continue;
        for (const t2 of tokens2) {
            if (!t2 || t2.length < 2) continue;
            if (t1 === t2) return true;
        }
    }

    // Fallback: substring matching
    if (c1.includes(c2) || c2.includes(c1)) return true;

    return false;
}


