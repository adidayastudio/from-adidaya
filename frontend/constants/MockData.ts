export interface Project {
    id: string;
    heroImage: any;
    title: string;
    number: string;
    code: string;
    location: string;
    phase: string;
    progress: number;
    themeColor: string;
    isArchived?: boolean;
    isPinned?: boolean;
    isAssignedToMe?: boolean;
    lastActivityAt?: string;
}

export interface TaskAttachment {
    id: string;
    uri: string;
    name: string;
    type: 'image' | 'file';
    path?: string; // Original storage path
}

export interface SourceLink {
    module: 'finance' | 'resources' | 'people' | 'clock' | 'report' | 'crew' | 'project' | 'forma_ai' | 'tracking' | 'other';
    feature?: string; // e.g., 'purchasing', 'reimbursement', 'payment', 'consolidation'
    recordType?: string; // e.g., 'purchase_request', 'payment', 'consolidation'
    recordId?: string; // internal UUID or ID
    recordNumber?: string; // e.g., 'PR-26090042'
    route?: string; // deep-link route
    actionType?: 'revision' | 'create_po' | 'prepare_payment' | 'approval' | 'view';
}

export interface Task {
    id: string;
    title: string;
    project: string;
    projectCode: string; // e.g., PRG
    wbs?: string; // e.g., STR-02-01
    status: 'todo' | 'in_progress' | 'submitted' | 'revision' | 'done';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    dueDate: string; // Mandatory
    dueTime?: string; // Optional
    startedAt?: string; // ISO timestamp when task was started
    description?: string; // Optional task notes/description
    taskType?: 'generic' | 'linked_module' | 'checklist'; // defaults generic
    sourceInfo?: SourceLink;
    isSystemGenerated?: boolean;
    revisionRequest?: {
        requestedBy: string;
        requestedAt: string;
        note: string;
        attachments?: TaskAttachment[];
    };
    moduleDetails?: {
        documentNumber: string;
        documentType?: string;
        requestedAmount?: number;
        currency?: string;
        itemsSummary?: string;
        department?: string;
        targetDate?: string;
    };
    linkedModule?: {
        target: 'finance' | 'resources' | 'people' | 'clock' | 'report' | 'crew' | 'project' | 'forma_ai' | 'tracking' | 'other';
        actionLabel: string;
        route: string;
    };
    attachments?: TaskAttachment[];
    submissionAttachments?: TaskAttachment[];
    submissionNote?: string;
    assignees: Array<{ id: string; name: string; avatar?: string }>;
    subtasks?: Array<{ id: string; title: string; assignee: { name: string; avatar?: string }; isDone: boolean }>;
    checklistItems?: Array<{ id: string; title: string; isChecked: boolean }>;
    comments?: Array<{
        id: string;
        author: string;
        text: string;
        timestamp: string;
        role: 'manager' | 'staff';
        attachments?: TaskAttachment[];
    }>;
    history?: Array<{
        id: string;
        action: string;
        timestamp: string;
        user: string;
        details?: string;
    }>;
}

export interface Action {
    id: string;
    title: string;
    project: string;
    projectCode: string;
    wbs?: string;
    module: 'finance' | 'resources' | 'people' | 'clock' | 'report' | 'crew' | 'project' | 'forma_ai' | 'tracking' | 'other';
    date: string;
    type: 'review' | 'approval' | 'revision' | 'generic' | 'meeting' | 'security' | 'planning' | 'qa' | 'logistics' | 'project' | 'finance' | 'field' | 'legal' | 'brief' | 'study' | 'event' | 'technical' | 'admin' | 'status' | 'deploy' | 'procure';
    status: 'pending' | 'completed' | 'urgent' | 'in_review' | 'revision' | 'rejected';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    relatedTaskId?: string;
    actionType?: 'review' | 'approval' | 'revision' | 'dispute' | 'confirmation';
    description?: string;
    proofUrl?: string;
    proofLabel?: string;
    sourceInfo?: SourceLink;
    approvalStep?: {
        current: number;
        total: number;
        roleName: string;
    };
    moduleDetails?: {
        documentNumber: string;
        documentType?: string;
        requestedAmount?: number;
        currency?: string;
        itemsSummary?: string;
        department?: string;
        targetDate?: string;
        spendingItems?: Array<{ id: string; name: string; amount: number; quantity?: number; unitPrice?: number }>;
    };
    requesterInfo?: {
        name: string;
        role?: string;
        department?: string;
        avatar?: string;
    };
    decision?: {
        result: 'approved' | 'revision' | 'rejected';
        note?: string;
        decidedBy?: string;
        decidedAt?: string;
    };
    comments?: Array<{
        id: string;
        author: string;
        text: string;
        timestamp: string;
        role: 'manager' | 'staff';
    }>;
    history?: Array<{
        id: string;
        action: string;
        timestamp: string;
        user: string;
        details?: string;
    }>;
    details?: {
        // Finance
        amount?: number;
        currency?: string;
        spendingItems?: Array<{ id: string; name: string; amount: number }>;
        invoiceUrl?: string;
        // Overtime/Clock
        clockIn?: string;
        clockOut?: string;
        totalHours?: number;
        overtimeHours?: number;
        // Leave/Cuti
        startDate?: string;
        endDate?: string;
        duration?: string;
        reason?: string;
        // General proof
        photoUrls?: string[];
    };
    attachments?: TaskAttachment[];
    submitter?: string;
}

export const PROJECTS: Project[] = [
    {
        id: '1',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Precision Gym',
        number: '036',
        code: 'PRG',
        location: 'Jakarta Selatan',
        phase: 'SD',
        progress: 70,
        themeColor: '#4a3728',
        isPinned: true,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-21T10:00:00Z',
    },
    {
        id: '2',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Modern Villa',
        number: '037',
        code: 'MVL',
        location: 'Bali',
        phase: 'DD',
        progress: 45,
        themeColor: '#2d403a',
        isPinned: false,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-21T15:00:00Z',
    },
    {
        id: '3',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Urban Office',
        number: '038',
        code: 'UOF',
        location: 'Jakarta Pusat',
        phase: 'CD',
        progress: 90,
        themeColor: '#1c2541',
        isPinned: false,
        isAssignedToMe: false,
        lastActivityAt: '2020-02-20T09:00:00Z',
    },
    {
        id: '4',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Lakeside Retreat',
        number: '039',
        code: 'LSR',
        location: 'Toba',
        phase: 'SD',
        progress: 25,
        themeColor: '#1e3d59',
        isPinned: true,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-19T10:00:00Z',
    },
    {
        id: '5',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Sunset Condo',
        number: '040',
        code: 'SNC',
        location: 'Surabaya',
        phase: 'DD',
        progress: 60,
        themeColor: '#ff6e40',
        isPinned: false,
        isAssignedToMe: false,
        lastActivityAt: '2026-02-18T14:00:00Z',
    },
    {
        id: '6',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Forest Chalet',
        number: '041',
        code: 'FCH',
        location: 'Bandung',
        phase: 'CD',
        progress: 35,
        themeColor: '#3d5a80',
        isPinned: true,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-17T08:00:00Z',
    },
    {
        id: '7',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Skyline Penthouse',
        number: '042',
        code: 'SKP',
        location: 'Jakarta Barat',
        phase: 'SD',
        progress: 85,
        themeColor: '#293241',
        isPinned: false,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-16T17:00:00Z',
    },
    {
        id: '8',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Eco Hub',
        number: '043',
        code: 'ECH',
        location: 'Yogyakarta',
        phase: 'DD',
        progress: 50,
        themeColor: '#588157',
        isPinned: false,
        isAssignedToMe: false,
        lastActivityAt: '2026-02-15T11:00:00Z',
    },
    {
        id: '9',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Harbor Hotel',
        number: '044',
        code: 'HRB',
        location: 'Semarang',
        phase: 'CD',
        progress: 15,
        themeColor: '#003566',
        isPinned: true,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-14T13:00:00Z',
    },
    {
        id: '10',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Mountain Resort',
        number: '045',
        code: 'MTR',
        location: 'Malang',
        phase: 'SD',
        progress: 75,
        themeColor: '#bc4749',
        isPinned: false,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-13T09:00:00Z',
    },
    {
        id: '11',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Coastal Cabin',
        number: '046',
        code: 'CCB',
        location: 'Lombok',
        phase: 'DD',
        progress: 40,
        themeColor: '#386641',
        isPinned: false,
        isAssignedToMe: false,
        lastActivityAt: '2026-02-12T16:00:00Z',
    },
    {
        id: '12',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Indigo Apartments',
        number: '047',
        code: 'IAP',
        location: 'Jakarta Utara',
        phase: 'CD',
        progress: 95,
        themeColor: '#3a0ca3',
        isPinned: true,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-11T10:00:00Z',
    },
    {
        id: '13',
        heroImage: require('../assets/images/project_hero.jpg'),
        title: 'Zen Garden Office',
        number: '048',
        code: 'ZGO',
        location: 'Tangerang',
        phase: 'SD',
        progress: 55,
        themeColor: '#b5838d',
        isPinned: false,
        isAssignedToMe: true,
        lastActivityAt: '2026-02-10T15:00:00Z',
    },
];

export const TASKS: Task[] = [
    {
        id: 'task-people-01',
        title: 'Complete Your Profile',
        project: 'Precision Gym',
        projectCode: 'PRG',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-09-21',
        taskType: 'linked_module',
        isSystemGenerated: true,
        sourceInfo: {
            module: 'people',
            feature: 'profile',
            recordType: 'profile_completion',
            recordId: '1',
            recordNumber: 'EMP-001',
            route: '/member-profile/1',
            actionType: 'revision',
        },
        moduleDetails: {
            documentNumber: 'EMP-001',
            documentType: 'Profile Completion',
            itemsSummary: '60% complete · Complete at least 75% of your profile. Missing: Emergency Contact, Bank Info, Tax ID',
        },
        linkedModule: {
            target: 'people',
            actionLabel: 'Open in People',
            route: '/member-profile/1',
        },
        description: '60% complete · Complete at least 75% of your profile',
        assignees: [{ id: '1', name: 'Manu Travo' }],
    },
    {
        id: 'task-people-02',
        title: 'Submit Required Documents',
        project: 'Precision Gym',
        projectCode: 'PRG',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-09-18',
        taskType: 'linked_module',
        isSystemGenerated: true,
        sourceInfo: {
            module: 'people',
            feature: 'documents',
            recordType: 'required_documents',
            recordId: '1',
            recordNumber: 'DOC-001',
            route: '/member-profile/1',
            actionType: 'revision',
        },
        moduleDetails: {
            documentNumber: 'DOC-001',
            documentType: 'Required Documents',
            itemsSummary: '2 of 5 completed. Missing: NPWP (Tax ID), CV, Latest Diploma',
        },
        linkedModule: {
            target: 'people',
            actionLabel: 'Open in People',
            route: '/member-profile/1',
        },
        description: '2 of 5 completed',
        assignees: [{ id: '1', name: 'Manu Travo' }],
    },
    {
        id: 'task-people-03',
        title: 'Review Your Profile',
        project: 'Precision Gym',
        projectCode: 'PRG',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-09-25',
        taskType: 'linked_module',
        isSystemGenerated: true,
        sourceInfo: {
            module: 'people',
            feature: 'lifecycle',
            recordType: 'employment_profile_review',
            recordId: '1',
            recordNumber: 'LFC-001',
            route: '/member-profile/1',
            actionType: 'revision',
        },
        moduleDetails: {
            documentNumber: 'LFC-001',
            documentType: 'Profile Review',
            itemsSummary: 'Lifecycle review due: Approaching annual employment review. Please verify your contact and emergency information.',
        },
        linkedModule: {
            target: 'people',
            actionLabel: 'Open in People',
            route: '/member-profile/1',
        },
        description: 'Please review and confirm your personal information ahead of the upcoming employment review.',
        assignees: [{ id: '1', name: 'Manu Travo' }],
    },
    {
        id: 'task-people-04',
        title: 'Review Employment Status: Citra Kirana',
        project: 'Precision Gym',
        projectCode: 'PRG',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-09-20',
        taskType: 'linked_module',
        isSystemGenerated: true,
        sourceInfo: {
            module: 'people',
            feature: 'employment_status',
            recordType: 'employment_status_review',
            recordId: '2',
            recordNumber: 'EMP-002',
            route: '/member-profile/2',
            actionType: 'revision',
        },
        moduleDetails: {
            documentNumber: 'EMP-002',
            documentType: 'Employment Review',
            itemsSummary: 'HR Status Review for Citra Kirana. Update contract dates, grade level, or position as needed.',
        },
        linkedModule: {
            target: 'people',
            actionLabel: 'Open in People',
            route: '/member-profile/2',
        },
        description: 'Review and adjust employment status, contract duration, or title changes for Citra Kirana.',
        assignees: [{ id: '1', name: 'HR Manager' }],
    },
];

export const ACTIONS: Action[] = [
    {
        id: 'act-people-01',
        title: 'Acknowledge Employment Update',
        project: 'Precision Gym',
        projectCode: 'PRG',
        module: 'people',
        date: '2026-09-14',
        type: 'admin',
        actionType: 'confirmation',
        status: 'pending',
        priority: 'high',
        description: 'Your employment details have been updated by HR. Please review and acknowledge.',
        sourceInfo: {
            module: 'people',
            feature: 'employment',
            recordType: 'employment_update',
            recordId: '1',
            recordNumber: 'EMP-001',
            route: '/member-profile/1',
            actionType: 'approval',
        },
        moduleDetails: {
            documentNumber: 'EMP-001',
            documentType: 'Employment Update',
            targetDate: '2026-10-01',
            department: 'Design Management',
            itemsSummary: 'Position: Senior Architect · Level: Level 3 · Division: Design Management',
        },
        details: {
            employmentUpdate: {
                position: 'Senior Architect',
                level: 'Level 3',
                department: 'Design Management',
                division: 'Design Management',
                effectiveDate: '1 Oct 2026',
                previousPosition: 'Architect',
                previousLevel: 'Level 2',
                previousDepartment: 'Architecture',
                notes: 'Promoted to Senior Architect following Q3 performance review.',
            },
        },
    },
    {
        id: 'act-people-02',
        title: 'Sign Employment Agreement',
        project: 'Precision Gym',
        projectCode: 'PRG',
        module: 'people',
        date: '2026-09-14',
        type: 'admin',
        actionType: 'confirmation',
        status: 'pending',
        priority: 'high',
        description: 'Signature required for Employment Agreement. Review document and submit signature directly below.',
        sourceInfo: {
            module: 'people',
            feature: 'documents',
            recordType: 'signature_request',
            recordId: 'doc-ea-01',
            recordNumber: 'DOC-EA-01',
            route: '/member-profile/1',
            actionType: 'approval',
        },
        moduleDetails: {
            documentNumber: 'DOC-EA-01',
            documentType: 'Employment Agreement',
            targetDate: '2026-09-14',
            itemsSummary: 'Electronic signature required for Employment Agreement',
        },
        details: {
            documentSignature: {
                documentId: 'doc-ea-01',
                documentTitle: 'Employment Agreement',
                documentType: 'Employment Agreement',
                signerUserId: '1',
            },
        },
    },
    {
        id: 'act-people-03',
        title: 'Sign Non-Disclosure Agreement (NDA)',
        project: 'Precision Gym',
        projectCode: 'PRG',
        module: 'people',
        date: '2026-09-14',
        type: 'admin',
        actionType: 'confirmation',
        status: 'pending',
        priority: 'high',
        description: 'Signature required for Confidentiality & Non-Disclosure Agreement (NDA).',
        sourceInfo: {
            module: 'people',
            feature: 'documents',
            recordType: 'signature_request',
            recordId: 'doc-nda-01',
            recordNumber: 'DOC-NDA-01',
            route: '/member-profile/1',
            actionType: 'approval',
        },
        moduleDetails: {
            documentNumber: 'DOC-NDA-01',
            documentType: 'NDA',
            targetDate: '2026-09-14',
            itemsSummary: 'Electronic signature required for NDA',
        },
        details: {
            documentSignature: {
                documentId: 'doc-nda-01',
                documentTitle: 'Non-Disclosure Agreement (NDA)',
                documentType: 'NDA',
                signerUserId: '1',
            },
        },
    },
];
