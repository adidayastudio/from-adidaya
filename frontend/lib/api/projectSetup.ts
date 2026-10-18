import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProjectSetupGroup = 'general' | 'configuration' | 'access' | 'system';

export type ProjectSetupModule =
    | 'general_settings'
    | 'numbering_codes'
    | 'project_statuses'
    | 'tracking_progress'
    | 'scope'
    | 'typology'
    | 'discipline'
    | 'class'
    | 'location_factors'
    | 'project_roles'
    | 'permissions'
    | 'audit_logs';

export interface ProjectMenuItem {
    id: ProjectSetupModule;
    group: ProjectSetupGroup;
    title: string;
    shortLabel: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

export const PROJECT_SETUP_MENU_ITEMS: ProjectMenuItem[] = [
    // 1. General (Slate)
    {
        id: 'general_settings',
        group: 'general',
        title: 'General Settings',
        shortLabel: 'General',
        subtitle: 'Default project behavior, dates, and completion rules.',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
    },
    {
        id: 'numbering_codes',
        group: 'general',
        title: 'Numbering & Codes',
        shortLabel: 'Codes',
        subtitle: 'Configure project numbering, code casing, and display format.',
        icon: 'number.square.fill',
        color: '#64748B',
        gradientColors: ['#64748B', '#334155'],
    },
    {
        id: 'project_statuses',
        group: 'general',
        title: 'Project Statuses',
        shortLabel: 'Statuses',
        subtitle: 'Manage project lifecycle statuses.',
        icon: 'flag.fill',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
    },
    {
        id: 'tracking_progress',
        group: 'general',
        title: 'Tracking & Progress',
        shortLabel: 'Tracking',
        subtitle: 'Configure how project progress can be tracked.',
        icon: 'chart.line.uptrend.xyaxis',
        color: '#64748B',
        gradientColors: ['#64748B', '#334155'],
    },

    // 2. Configuration (Blue)
    {
        id: 'scope',
        group: 'configuration',
        title: 'Scope (Delivery Methods)',
        shortLabel: 'Scope',
        subtitle: 'Define delivery methods (Design-Build, Architecture, etc.) and active stages.',
        icon: 'briefcase.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'typology',
        group: 'configuration',
        title: 'Typologies',
        shortLabel: 'Typologies',
        subtitle: 'Categorize projects by function (Residential, Commercial, Gym, etc.).',
        icon: 'building.2.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'discipline',
        group: 'configuration',
        title: 'Disciplines',
        shortLabel: 'Disciplines',
        subtitle: 'Manage trades (Architecture, Interior, Structure, MEP) and sequence.',
        icon: 'wrench.and.screwdriver.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'class',
        group: 'configuration',
        title: 'Classes',
        shortLabel: 'Classes',
        subtitle: 'Define quality finish levels and cost multipliers.',
        icon: 'square.stack.3d.up.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'location_factors',
        group: 'configuration',
        title: 'Location Factors',
        shortLabel: 'Location',
        subtitle: 'Regional cost indices and site difficulty multipliers across Indonesia.',
        icon: 'mappin.and.ellipse',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },

    // 3. Access (Amber)
    {
        id: 'project_roles',
        group: 'access',
        title: 'Project Roles',
        shortLabel: 'Roles',
        subtitle: 'Manage roles used within individual projects.',
        icon: 'person.2.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'permissions',
        group: 'access',
        title: 'Permissions',
        shortLabel: 'Permissions',
        subtitle: 'Control what project roles can view and manage.',
        icon: 'key.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },

    // 4. System (Purple)
    {
        id: 'audit_logs',
        group: 'system',
        title: 'Audit Logs',
        shortLabel: 'Audit Logs',
        subtitle: 'Track project setup and configuration changes.',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
];

export const PROJECT_GROUP_TITLES: Record<ProjectSetupGroup, string> = {
    general: 'General',
    configuration: 'Configuration',
    access: 'Access',
    system: 'System',
};

// --- General Settings ---
export interface ProjectGeneralSettings {
    requireProjectLead: boolean;
    requireStartDate: boolean;
    requireTargetDate: boolean;
    allowNoTargetDate: boolean;
    allowReopenCompleted: boolean;
    allowProjectArchiving: boolean;
}

export const DEFAULT_PROJECT_GENERAL_SETTINGS: ProjectGeneralSettings = {
    requireProjectLead: false,
    requireStartDate: true,
    requireTargetDate: true,
    allowNoTargetDate: true,
    allowReopenCompleted: true,
    allowProjectArchiving: true,
};

// --- Numbering & Codes ---
export type ProjectCodeStyle = 'uppercase' | 'lowercase';
export type ProjectDisplayFormat = 'code_only' | 'number_and_code';

export interface ProjectNumberingSettings {
    nextNumber: number;
    autoGenerateCode: boolean;
    codeLength: number; // Fixed at 3
    codeStyle: ProjectCodeStyle;
    displayFormat: ProjectDisplayFormat;
}

export const DEFAULT_PROJECT_NUMBERING_SETTINGS: ProjectNumberingSettings = {
    nextNumber: 1,
    autoGenerateCode: true,
    codeLength: 3,
    codeStyle: 'uppercase',
    displayFormat: 'number_and_code',
};

export function generateCandidateCodes(projectName: string): string[] {
    const cleanWords = projectName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3);

    if (cleanWords.length === 0) {
        return ['PRJ', 'PRX', 'PRM', 'PRO', 'PRT'];
    }

    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (str: string) => {
        const cleaned = str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        if (cleaned.length === 3 && !seen.has(cleaned)) {
            seen.add(cleaned);
            candidates.push(cleaned);
        }
    };

    if (cleanWords.length === 1) {
        // 1 Word: e.g. PERBAIKAN -> PER, PEB, PEA, PEI, etc.
        const word = cleanWords[0];
        if (word.length >= 3) {
            addCandidate(word.slice(0, 3));
            for (let i = 2; i < word.length; i++) {
                addCandidate(word[0] + word[1] + word[i]);
            }
            for (let i = 1; i < word.length - 1; i++) {
                for (let j = i + 1; j < word.length; j++) {
                    addCandidate(word[0] + word[i] + word[j]);
                }
            }
        } else {
            addCandidate((word + 'XYZ').slice(0, 3));
        }
    } else if (cleanWords.length === 2) {
        // 2 Words: e.g. Perbaikan Jendela -> PEJ (2+1), PJE (1+2), etc.
        const [w1, w2] = cleanWords;
        // 2+1 pattern
        for (let i = 0; i < w1.length - 1; i++) {
            for (let j = 0; j < w2.length; j++) {
                addCandidate(w1[0] + w1[i + 1] + w2[j]);
            }
        }
        // 1+2 pattern
        for (let i = 0; i < w1.length; i++) {
            for (let j = 0; j < w2.length - 1; j++) {
                addCandidate(w1[i] + w2[0] + w2[j + 1]);
            }
        }
    } else {
        // 3 Words: e.g. Perbaikan Jendela Utama -> PJU (1+1+1), rotating letters
        const [w1, w2, w3] = cleanWords;
        for (let i = 0; i < w1.length; i++) {
            for (let j = 0; j < w2.length; j++) {
                for (let k = 0; k < w3.length; k++) {
                    addCandidate(w1[i] + w2[j] + w3[k]);
                }
            }
        }
    }

    return candidates.length > 0 ? candidates : ['PRJ'];
}

export function autoGenerateProjectCode(
    projectName: string,
    existingCodes: string[] = [],
    codeStyle: ProjectCodeStyle = 'uppercase'
): { code: string; alternatives: string[] } {
    const candidates = generateCandidateCodes(projectName);
    const existingSet = new Set(existingCodes.map((c) => c.toUpperCase()));

    const available = candidates.filter((c) => !existingSet.has(c));
    const selected = available[0] || candidates[0] || 'PRJ';
    const alternatives = available.slice(1, 6);

    const applyCase = (c: string) => (codeStyle === 'lowercase' ? c.toLowerCase() : c.toUpperCase());

    return {
        code: applyCase(selected),
        alternatives: alternatives.map(applyCase),
    };
}

export function getNextProjectNumber(existingNumbers: (number | string)[] = []): string {
    const numSet = new Set(
        existingNumbers
            .map((n) => (typeof n === 'string' ? parseInt(n, 10) : n))
            .filter((n) => !isNaN(n))
    );

    let next = 1;
    while (numSet.has(next)) {
        next++;
    }

    return String(next).padStart(3, '0');
}

export function formatProjectIdentifier(
    number: number | string = 1,
    code = 'ABC',
    displayFormat: ProjectDisplayFormat = 'number_and_code',
    codeStyle: ProjectCodeStyle = 'uppercase'
): string {
    const numStr = typeof number === 'number' ? String(number).padStart(3, '0') : String(number || '001').padStart(3, '0');
    const styledCode = codeStyle === 'lowercase' ? code.toLowerCase() : code.toUpperCase();

    if (displayFormat === 'code_only') {
        return styledCode;
    }
    return `${numStr}-${styledCode}`;
}

export function formatProjectBadge(
    project: { code?: string; number?: string; title?: string },
    settings?: ProjectNumberingSettings | null
): string {
    const code = (project?.code || '').trim() || 'PRJ';
    const number = (project?.number || '').trim() || '001';
    const displayFormat = settings?.displayFormat || 'number_and_code';
    const codeStyle = settings?.codeStyle || 'uppercase';

    return formatProjectIdentifier(number, code, displayFormat, codeStyle);
}

// --- Project Types ---
export interface ProjectTypeItem {
    id: string;
    name: string;
    code: string;
    description: string;
    isActive: boolean;
    isDefault?: boolean;
}

export const DEFAULT_PROJECT_TYPES: ProjectTypeItem[] = [
    {
        id: 'clt',
        name: 'Client Project',
        code: 'CLT',
        description: 'Projects delivered for external clients or customers.',
        isActive: true,
        isDefault: true,
    },
    {
        id: 'int',
        name: 'Internal Project',
        code: 'INT',
        description: 'Internal company initiatives and organizational work.',
        isActive: true,
        isDefault: true,
    },
    {
        id: 'cmp',
        name: 'Campaign',
        code: 'CMP',
        description: 'Marketing, promotional, communication, or activation projects.',
        isActive: true,
        isDefault: true,
    },
    {
        id: 'imp',
        name: 'Implementation',
        code: 'IMP',
        description: 'System, process, service, migration, or rollout implementation.',
        isActive: true,
        isDefault: true,
    },
    {
        id: 'evt',
        name: 'Event',
        code: 'EVT',
        description: 'Events, workshops, conferences, gatherings, or activations.',
        isActive: true,
        isDefault: true,
    },
    {
        id: 'prg',
        name: 'Program',
        code: 'PRG',
        description: 'Longer-term initiatives containing multiple activities or work streams.',
        isActive: true,
        isDefault: true,
    },
];

// --- Project Statuses ---
export type ProjectSystemState = 'Upcoming' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';

export const PROJECT_SYSTEM_STATES: ProjectSystemState[] = [
    'Upcoming',
    'Active',
    'Paused',
    'Completed',
    'Cancelled',
];

export const PROJECT_STATUS_COLORS = [
    { label: 'Orange', hex: '#FF9500' },
    { label: 'Green', hex: '#34C759' },
    { label: 'Yellow', hex: '#FFCC00' },
    { label: 'Blue', hex: '#007AFF' },
    { label: 'Gray', hex: '#8E8E93' },
    { label: 'Purple', hex: '#AF52DE' },
    { label: 'Pink', hex: '#FF2D55' },
    { label: 'Indigo', hex: '#5856D6' },
    { label: 'Teal', hex: '#30B0C7' },
];

export interface ProjectStatusItem {
    id: string;
    name: string;
    systemState: ProjectSystemState;
    color: string;
    description?: string;
    isActive: boolean;
    isSystem?: boolean;
}

export const DEFAULT_PROJECT_STATUSES: ProjectStatusItem[] = [
    {
        id: 'planning',
        name: 'Planning',
        systemState: 'Upcoming',
        color: '#FF9500',
        description: 'Project is being prepared and has not started active execution.',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'active',
        name: 'Active',
        systemState: 'Active',
        color: '#34C759',
        description: 'Project is currently active and in progress.',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'on_hold',
        name: 'On Hold',
        systemState: 'Paused',
        color: '#FFCC00',
        description: 'Project activity is temporarily paused.',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'completed',
        name: 'Completed',
        systemState: 'Completed',
        color: '#007AFF',
        description: 'Project has finished successfully.',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'cancelled',
        name: 'Cancelled',
        systemState: 'Cancelled',
        color: '#8E8E93',
        description: 'Project has been stopped and will not continue.',
        isActive: true,
        isSystem: true,
    },
];

// --- Tracking & Progress ---
export type TrackingMethod = 'manual' | 'tasks' | 'milestones' | 'none';

export interface ProjectTrackingSettings {
    enabledMethods: TrackingMethod[];
    defaultMethod: TrackingMethod;
}

export const DEFAULT_PROJECT_TRACKING_SETTINGS: ProjectTrackingSettings = {
    enabledMethods: ['manual', 'tasks', 'milestones'],
    defaultMethod: 'tasks',
};

// --- Project Roles ---
export interface ProjectRoleItem {
    id: string;
    name: string;
    description: string;
    accessSummary?: string;
    isActive?: boolean;
    isSystem: boolean;
}

export const DEFAULT_PROJECT_ROLES: ProjectRoleItem[] = [
    {
        id: 'project_lead',
        name: 'Project Lead',
        description: 'Primary owner responsible for project execution and coordination.',
        accessSummary: 'Full Access',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'project_admin',
        name: 'Project Admin',
        description: 'Manages project settings, members, and project configuration.',
        accessSummary: 'Manage Access',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'member',
        name: 'Member',
        description: 'Collaborates on project tasks, files, and updates.',
        accessSummary: 'Standard Access',
        isActive: true,
        isSystem: true,
    },
    {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to project information.',
        accessSummary: 'View Only',
        isActive: true,
        isSystem: true,
    },
];

// --- Permissions ---
export type ProjectPermissionKey =
    | 'view_project'
    | 'edit_project'
    | 'manage_members'
    | 'assign_project_roles'
    | 'manage_milestones'
    | 'manage_project_progress'
    | 'manage_tasks'
    | 'manage_actions'
    | 'upload_files'
    | 'manage_files';

export interface ProjectPermissionDefinition {
    key: ProjectPermissionKey;
    label: string;
    description: string;
}

export interface ProjectPermissionGroup {
    id: string;
    title: string;
    permissions: ProjectPermissionDefinition[];
}

export const PROJECT_PERMISSION_GROUPS: ProjectPermissionGroup[] = [
    {
        id: 'project_access',
        title: 'Project Access',
        permissions: [
            {
                key: 'view_project',
                label: 'View Project',
                description: 'View project overview, status, timeline, and related information.',
            },
            {
                key: 'edit_project',
                label: 'Edit Project',
                description: 'Edit project details, dates, type, status, and progress settings.',
            },
        ],
    },
    {
        id: 'members',
        title: 'Members',
        permissions: [
            {
                key: 'manage_members',
                label: 'Manage Members',
                description: 'Add or remove members from the project.',
            },
            {
                key: 'assign_project_roles',
                label: 'Assign Project Roles',
                description: 'Assign or change roles for project members.',
            },
        ],
    },
    {
        id: 'planning',
        title: 'Planning',
        permissions: [
            {
                key: 'manage_milestones',
                label: 'Manage Milestones',
                description: 'Create, edit, complete, and organize project milestones.',
            },
            {
                key: 'manage_project_progress',
                label: 'Manage Project Progress',
                description: 'Update manual progress or manage project progress information.',
            },
        ],
    },
    {
        id: 'tasks_actions',
        title: 'Tasks & Actions',
        permissions: [
            {
                key: 'manage_tasks',
                label: 'Manage Project Tasks',
                description: 'Create, assign, edit, and organize tasks linked to this project.',
            },
            {
                key: 'manage_actions',
                label: 'Manage Project Actions',
                description: 'Create and manage Actions linked to this project.',
            },
        ],
    },
    {
        id: 'files',
        title: 'Files',
        permissions: [
            {
                key: 'upload_files',
                label: 'Upload Files',
                description: 'Upload files to this project.',
            },
            {
                key: 'manage_files',
                label: 'Manage Files',
                description: 'Rename, organize, move, or delete project files.',
            },
        ],
    },
];

export type RolePermissionsMap = Record<string, Partial<Record<ProjectPermissionKey, boolean>>>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
    project_lead: {
        view_project: true,
        edit_project: true,
        manage_members: true,
        assign_project_roles: true,
        manage_milestones: true,
        manage_project_progress: true,
        manage_tasks: true,
        manage_actions: true,
        upload_files: true,
        manage_files: true,
    },
    project_admin: {
        view_project: true,
        edit_project: true,
        manage_members: true,
        assign_project_roles: true,
        manage_milestones: true,
        manage_project_progress: true,
        manage_tasks: true,
        manage_actions: true,
        upload_files: true,
        manage_files: true,
    },
    member: {
        view_project: true,
        edit_project: false,
        manage_members: false,
        assign_project_roles: false,
        manage_milestones: false,
        manage_project_progress: false,
        manage_tasks: true,
        manage_actions: true,
        upload_files: true,
        manage_files: false,
    },
    viewer: {
        view_project: true,
        edit_project: false,
        manage_members: false,
        assign_project_roles: false,
        manage_milestones: false,
        manage_project_progress: false,
        manage_tasks: false,
        manage_actions: false,
        upload_files: false,
        manage_files: false,
    },
};

// --- Audit Logs ---
export type ProjectAuditCategory =
    | 'Setup Changes'
    | 'Types & Statuses'
    | 'Roles & Permissions'
    | 'Tracking & Rules'
    | 'Security / Access';

export interface ProjectAuditLogItem {
    id: string;
    actor: string;
    actorRole?: string;
    actorAvatarUrl?: string;
    action: string;
    detail: string;
    time: string;
    category: ProjectAuditCategory;
    icon?: string;
    iconColor?: string;
    oldValue?: string;
    newValue?: string;
    targetModule?: string;
    ipAddress?: string;
    timestampIso?: string;
    dateKey?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
    // Backwards-compatibility
    timestamp?: string;
    user?: string;
    details?: string;
}

export const PROJECT_AUDIT_CATEGORY_COLORS: Record<ProjectAuditCategory, string> = {
    'Setup Changes': '#007AFF',
    'Types & Statuses': '#FF9500',
    'Roles & Permissions': '#AF52DE',
    'Tracking & Rules': '#34C759',
    'Security / Access': '#5856D6',
};

export function getProjectAuditCategoryColor(category: string): string {
    return (PROJECT_AUDIT_CATEGORY_COLORS as Record<string, string>)[category] || '#007AFF';
}

export function getProjectAuditCategoryShortLabel(category: string): string {
    switch (category) {
        case 'Setup Changes':
            return 'Setup';
        case 'Types & Statuses':
            return 'Types/Status';
        case 'Roles & Permissions':
            return 'Roles';
        case 'Tracking & Rules':
            return 'Tracking';
        case 'Security / Access':
            return 'Security';
        default:
            return category;
    }
}

export const DEFAULT_PROJECT_AUDIT_LOGS: ProjectAuditLogItem[] = [];

// --- Storage Keys & Handlers ---
const STORAGE_KEYS = {
    GENERAL: '@project_setup_general_v2',
    NUMBERING: '@project_setup_numbering_v2',
    TYPES: '@project_setup_types_v2',
    STATUSES: '@project_setup_statuses_v2',
    TRACKING: '@project_setup_tracking_v2',
    ROLES: '@project_setup_roles_v2',
    PERMISSIONS: '@project_setup_permissions_v2',
    AUDIT_LOGS: '@project_setup_audit_logs_v3',
};

export async function getProjectGeneralSettings(): Promise<ProjectGeneralSettings> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.GENERAL);
        return raw ? { ...DEFAULT_PROJECT_GENERAL_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PROJECT_GENERAL_SETTINGS;
    } catch {
        return DEFAULT_PROJECT_GENERAL_SETTINGS;
    }
}

export async function saveProjectGeneralSettings(settings: ProjectGeneralSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GENERAL, JSON.stringify(settings));
    await logProjectSetupAction('General Settings saved', 'Setup Changes', 'Updated date requirements and archiving rules.');
}

export async function getProjectNumberingSettings(): Promise<ProjectNumberingSettings> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.NUMBERING);
        return raw ? { ...DEFAULT_PROJECT_NUMBERING_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PROJECT_NUMBERING_SETTINGS;
    } catch {
        return DEFAULT_PROJECT_NUMBERING_SETTINGS;
    }
}

export async function saveProjectNumberingSettings(settings: ProjectNumberingSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.NUMBERING, JSON.stringify(settings));
    await logProjectSetupAction('Project Codes updated', 'Setup Changes', `Style: ${settings.codeStyle}, Format: ${settings.displayFormat}`);
}

export async function getProjectTypes(): Promise<ProjectTypeItem[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.TYPES);
        return raw ? JSON.parse(raw) : DEFAULT_PROJECT_TYPES;
    } catch {
        return DEFAULT_PROJECT_TYPES;
    }
}

export async function saveProjectTypes(types: ProjectTypeItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TYPES, JSON.stringify(types));
    await logProjectSetupAction('Project Types updated', 'Types & Statuses', `${types.length} total types configured.`);
}

export async function getProjectStatuses(): Promise<ProjectStatusItem[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATUSES);
        if (!raw) return DEFAULT_PROJECT_STATUSES;
        const parsed: ProjectStatusItem[] = JSON.parse(raw);
        return parsed.map((item) => {
            if (!item.systemState) {
                const idLower = (item.id || '').toLowerCase();
                const nameLower = (item.name || '').toLowerCase();
                if (idLower.includes('plan') || nameLower.includes('plan') || nameLower.includes('kickoff')) {
                    item.systemState = 'Upcoming';
                } else if (idLower.includes('hold') || nameLower.includes('hold') || nameLower.includes('pause')) {
                    item.systemState = 'Paused';
                } else if (idLower.includes('comp') || nameLower.includes('comp') || nameLower.includes('finish') || nameLower.includes('done')) {
                    item.systemState = 'Completed';
                } else if (idLower.includes('cancel') || nameLower.includes('cancel') || nameLower.includes('stop')) {
                    item.systemState = 'Cancelled';
                } else {
                    item.systemState = 'Active';
                }
            }
            return item;
        });
    } catch {
        return DEFAULT_PROJECT_STATUSES;
    }
}

export async function saveProjectStatuses(statuses: ProjectStatusItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(statuses));
    await logProjectSetupAction('Project Statuses updated', 'Types & Statuses', `${statuses.length} lifecycle statuses active.`);
}

export async function getProjectTrackingSettings(): Promise<ProjectTrackingSettings> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING);
        return raw ? { ...DEFAULT_PROJECT_TRACKING_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PROJECT_TRACKING_SETTINGS;
    } catch {
        return DEFAULT_PROJECT_TRACKING_SETTINGS;
    }
}

export async function saveProjectTrackingSettings(settings: ProjectTrackingSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TRACKING, JSON.stringify(settings));
    await logProjectSetupAction('Tracking & Progress updated', 'Tracking & Rules', `Default method set to ${settings.defaultMethod}.`);
}

export async function getProjectRoles(): Promise<ProjectRoleItem[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.ROLES);
        if (!raw) return DEFAULT_PROJECT_ROLES;
        const parsed: ProjectRoleItem[] = JSON.parse(raw);
        return parsed.map((role) => {
            const defaultRole = DEFAULT_PROJECT_ROLES.find((d) => d.id === role.id);
            return {
                ...role,
                accessSummary: role.accessSummary || defaultRole?.accessSummary || 'Custom Access',
                isActive: role.isActive ?? true,
                isSystem: role.isSystem ?? !!defaultRole,
            };
        });
    } catch {
        return DEFAULT_PROJECT_ROLES;
    }
}

export async function saveProjectRoles(roles: ProjectRoleItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
    await logProjectSetupAction('Project Roles updated', 'Roles & Permissions', `${roles.length} roles configured.`);
}

export async function getProjectPermissions(): Promise<RolePermissionsMap> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSIONS);
        return raw ? JSON.parse(raw) : DEFAULT_ROLE_PERMISSIONS;
    } catch {
        return DEFAULT_ROLE_PERMISSIONS;
    }
}

export async function saveProjectPermissions(permissions: RolePermissionsMap): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    await logProjectSetupAction('Role Permissions modified', 'Roles & Permissions', 'Updated permission assignments across project roles.');
}

export async function getProjectAuditLogs(): Promise<ProjectAuditLogItem[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
        if (!raw) return DEFAULT_PROJECT_AUDIT_LOGS;
        const parsed: any[] = JSON.parse(raw);
        return parsed.map((item) => {
            return {
                id: item.id || Date.now().toString(),
                actor: item.actor || item.user || 'Current User',
                actorRole: item.actorRole || 'Workspace Admin',
                action: item.action || 'Project Setting updated',
                detail: item.detail || item.details || '',
                time: item.time || item.timestamp || 'Just now',
                category: (item.category as ProjectAuditCategory) || 'Setup Changes',
                dateKey: item.dateKey || 'today',
                targetModule: item.targetModule || 'Projects Setup',
                timestampIso: item.timestampIso || new Date().toISOString(),
                // legacy
                timestamp: item.timestamp || item.time || 'Just now',
                user: item.user || item.actor || 'Current User',
                details: item.details || item.detail || '',
            };
        });
    } catch {
        return DEFAULT_PROJECT_AUDIT_LOGS;
    }
}

export async function clearProjectAuditLogs(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        await AsyncStorage.removeItem('@project_setup_audit_logs_v2');
    } catch {}
}

export async function logProjectSetupAction(
    action: string,
    category: ProjectAuditCategory,
    detail: string
): Promise<void> {
    try {
        const existing = await getProjectAuditLogs();
        const newLog: ProjectAuditLogItem = {
            id: Date.now().toString(),
            actor: 'Current User',
            actorRole: 'Workspace Admin',
            action,
            category,
            detail,
            time: 'Just now',
            dateKey: 'today',
            targetModule: `Projects / ${category}`,
            timestampIso: new Date().toISOString(),
            // legacy
            timestamp: 'Just now',
            user: 'Current User',
            details: detail,
        };
        const updated = [newLog, ...existing.slice(0, 49)];
        await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
    } catch {}
}
