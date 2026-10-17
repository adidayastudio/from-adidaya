import { supabase, supabaseForma, supabaseAdidaya, APP_MODE } from "../supabase";
import { WBS_TEMPLATES } from "./tasks";
import { decode } from "base64-arraybuffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Project {
    id: string;
    workspaceId?: string;
    heroImage: any;
    title: string;
    number: string;
    code: string;
    location: string;
    phase: string;
    status?: string;
    progress: number;
    themeColor: string;
    isArchived?: boolean;
    isPinned?: boolean;
    startDate?: string;
    targetDate?: string;
    isAssignedToMe?: boolean;
    lastActivityAt?: string;
    meta?: any;
}

const PROJECT_META_PREFIX = '@project_meta_';

export async function getProjectMeta(projectId: string): Promise<Record<string, any>> {
    try {
        const raw = await AsyncStorage.getItem(`${PROJECT_META_PREFIX}${projectId}`);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export async function saveProjectMeta(projectId: string, meta: Record<string, any>): Promise<void> {
    try {
        const existing = await getProjectMeta(projectId);
        const merged = { ...existing, ...meta };
        await AsyncStorage.setItem(`${PROJECT_META_PREFIX}${projectId}`, JSON.stringify(merged));
    } catch (e) {
        console.warn('Error saving project meta:', e);
    }
}

export function formatProjectLocation(raw: any, projectTitle?: string): string {
    if (!raw && !projectTitle) return '';

    let obj: any = null;
    let text = '';

    if (typeof raw === 'object' && raw !== null) {
        obj = raw;
    } else if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                obj = JSON.parse(trimmed);
            } catch {
                text = trimmed;
            }
        } else {
            text = trimmed;
        }
    } else if (typeof raw === 'number') {
        text = raw.toString();
    }

    if (obj) {
        const candidate =
            (typeof obj.city === 'string' && obj.city.trim()) ||
            (typeof obj.address === 'string' && obj.address.trim()) ||
            (typeof obj.province === 'string' && obj.province.trim()) ||
            (typeof obj.site_location === 'string' && obj.site_location.trim()) ||
            (typeof obj.name === 'string' && obj.name.trim()) ||
            (typeof obj.label === 'string' && obj.label.trim()) ||
            (typeof obj.formatted_address === 'string' && obj.formatted_address.trim()) ||
            (typeof obj.display_name === 'string' && obj.display_name.trim()) ||
            (typeof obj.location === 'string' && obj.location.trim()) ||
            '';
        if (candidate) {
            text = candidate;
        }
    }

    // If text still contains raw JSON or is empty, extract from project title
    if (!text || text.startsWith('{') || text.startsWith('[')) {
        if (projectTitle) {
            const t = projectTitle.toLowerCase();
            if (t.includes('cilandak')) return 'Cilandak';
            if (t.includes('pulo asem')) return 'Jakarta';
            if (t.includes('hambalang')) return 'Hambalang';
            if (t.includes('cihara') || t.includes('lebak')) return 'Lebak';
            if (t.includes('madiun')) return 'Madiun';
            if (t.includes('serang') || t.includes('kopijalu') || t.includes('pulau lima')) return 'Serang';
            if (t.includes('liwa')) return 'Liwa';
            if (t.includes('nusa dua') || t.includes('bali')) return 'Nusa Dua';
            if (t.includes('cihampelas') || t.includes('bandung')) return 'Bandung';
            if (t.includes('kemang') || t.includes('senopati') || t.includes('jakarta') || t.includes('adidaya')) return 'Jakarta';
            if (t.includes('surabaya')) return 'Surabaya';
            if (t.includes('jogja') || t.includes('yogyakarta')) return 'Yogyakarta';
            if (t.includes('bogor')) return 'Bogor';
            if (t.includes('tangerang') || t.includes('bsd')) return 'Tangerang';
            if (t.includes('bekasi')) return 'Bekasi';
            if (t.includes('depok')) return 'Depok';
            if (t.includes('medan')) return 'Medan';
            if (t.includes('semarang')) return 'Semarang';
            if (t.includes('malang')) return 'Malang';
            if (t.includes('denpasar')) return 'Denpasar';
            if (t.includes('lombok')) return 'Lombok';
            if (t.includes('makassar')) return 'Makassar';
            if (t.includes('toba')) return 'Toba';
        }
        return '';
    }

    return text;
}

/**
 * Fetch all projects from Supabase filtered strictly by tenant / workspace
 */
export async function getProjects(workspaceOrTenantId?: string) {
    const isAdidaya = APP_MODE === 'adidaya';

    let data: any[] | null = null;

    if (isAdidaya) {
        // Exclusively query Adidaya database to guarantee zero cross-tenant contamination
        const res = await supabaseAdidaya.from('projects').select('*');
        if (res.data && res.data.length > 0) {
            data = res.data;
        }
    } else {
        // Must have an explicit tenant/workspace ID to avoid cross-tenant contamination
        if (!workspaceOrTenantId) {
            return [];
        }

        // Query Forma database with strict tenant filtering
        const res = await supabaseForma
            .from('projects')
            .select('*')
            .or(`workspace_id.eq.${workspaceOrTenantId},tenant_id.eq.${workspaceOrTenantId}`);

        if (res.data && res.data.length > 0) {
            // Strict double-check in-memory filter to guarantee zero leakage
            data = res.data.filter(
                (p: any) => p.workspace_id === workspaceOrTenantId || p.tenant_id === workspaceOrTenantId
            );
        } else {
            data = [];
        }
    }

    if (!data || data.length === 0) {
        return [];
    }

    const projectsWithMeta = await Promise.all((data || []).map(async (p: any) => {
        const toString = (val: any) => {
            if (val === undefined || val === null) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'number') return val.toString();
            if (typeof val === 'object') {
                return val.city || val.name || val.label || val.formatted_address || val.display_name || '';
            }
            return '';
        };

        const getField = (obj: any, keys: string[]) => {
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
            }
            return undefined;
        };

        const title = toString(getField(p, ['title', 'name', 'project_name', 'label']));
        const rawPhase = toString(getField(p, ['phase', 'project_phase', 'stage', 'current_phase', 'status'])) || 'Planning';
        const formattedPhase = rawPhase.charAt(0).toUpperCase() + rawPhase.slice(1);
        const localMeta = await getProjectMeta(p.id);
        const heroImg = p.hero_image_url || localMeta.heroImage || localMeta.avatarUrl || localMeta.logoUrl || (p.meta?.heroImage) || (p.meta?.avatarUrl) || (p.meta?.logoUrl);
        const rawLoc = getField(p, ['location', 'address', 'site', 'city', 'site_location']);

        return {
            id: p.id,
            workspaceId: p.workspace_id,
            title,
            number: toString(getField(p, ['number', 'project_number', 'code_number', 'no'])),
            code: toString(getField(p, ['code', 'project_code', 'short_name'])),
            location: formatProjectLocation(rawLoc, title),
            phase: formattedPhase,
            status: p.status || 'planning',
            progress: (p.meta?.progress !== undefined) ? Number(p.meta.progress) : ((localMeta.progress !== undefined) ? Number(localMeta.progress) : (Number(getField(p, ['progress', 'percentage', 'completion', 'completion_percentage', 'progress_percentage'])) || 0)),
            themeColor: toString(getField(p, ['theme_color', 'color', 'accent_color'])) || '#007AFF',
            heroImage: heroImg ? (typeof heroImg === 'string' ? { uri: heroImg } : heroImg) : null,
            isArchived: getField(p, ['is_archived', 'archived', 'deleted']) || p.status === 'archived' || localMeta.isArchived || false,
            isPinned: getField(p, ['is_pinned', 'pinned', 'favorite', 'is_favorite']) || localMeta.isFavorite || false,
            isAssignedToMe: getField(p, ['is_assigned_to_me', 'my_project']) || false,
            lastActivityAt: p.last_activity_at || p.updated_at || p.created_at || '',
            meta: {
                startDate: p.start_date || undefined,
                targetDate: p.target_date || undefined,
                ...(p.meta || {}),
                ...localMeta,
                heroImage: heroImg || undefined,
                avatarUrl: heroImg || undefined,
                logoUrl: heroImg || undefined,
            },
        };
    }));

    return projectsWithMeta as Project[];
}

/**
 * Fetch a single project by ID
 */
export async function getProjectById(id: string) {
    if (!id) return null;
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.warn(`Project not found in DB (${id}):`, error.message);
        return null;
    }

    if (!data) return null;

    // Helper to safely get a string from a potentially JSON column
    const toString = (val: any) => {
        if (val === undefined || val === null) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return val.toString();
        if (typeof val === 'object') {
            return val.city || val.name || val.label || val.formatted_address || val.display_name || '';
        }
        return '';
    };

    // Helper to try multiple column names for a single property
    const getField = (obj: any, keys: string[]) => {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return undefined;
    };
    const title = toString(getField(data, ['title', 'name', 'project_name', 'label']));
    const rawPhase = toString(getField(data, ['phase', 'project_phase', 'stage', 'current_phase', 'status'])) || 'Planning';
    const formattedPhase = rawPhase.charAt(0).toUpperCase() + rawPhase.slice(1);
    const localMeta = await getProjectMeta(data.id);
    const heroImgUrl = data.hero_image_url || localMeta.heroImage || localMeta.avatarUrl || localMeta.logoUrl || (data.meta?.heroImage) || (data.meta?.avatarUrl) || (data.meta?.logoUrl);
    const rawLoc = getField(data, ['location', 'address', 'site', 'city', 'site_location']);

    return {
        id: data.id,
        workspaceId: data.workspace_id,
        title,
        number: toString(getField(data, ['number', 'project_number', 'code_number', 'no'])),
        code: toString(getField(data, ['code', 'project_code', 'short_name'])),
        location: formatProjectLocation(rawLoc, title),
        phase: formattedPhase,
        status: data.status || 'planning',
        progress: (data.meta?.progress !== undefined) ? Number(data.meta.progress) : ((localMeta.progress !== undefined) ? Number(localMeta.progress) : (Number(getField(data, ['progress', 'percentage', 'completion', 'completion_percentage', 'progress_percentage'])) || 0)),
        themeColor: toString(getField(data, ['theme_color', 'color', 'accent_color'])) || '#007AFF',
        heroImage: heroImgUrl ? (typeof heroImgUrl === 'string' ? { uri: heroImgUrl } : heroImgUrl) : null,
        isArchived: getField(data, ['is_archived', 'archived', 'deleted']) || data.status === 'archived' || localMeta.isArchived || false,
        isPinned: getField(data, ['is_pinned', 'pinned', 'favorite', 'is_favorite']) || localMeta.isFavorite || false,
        isAssignedToMe: getField(data, ['is_assigned_to_me', 'my_project']) || false,
        lastActivityAt: data.last_activity_at || data.updated_at || data.created_at || '',
        meta: {
            startDate: data.start_date || undefined,
            targetDate: data.target_date || undefined,
            ...(data.meta || {}),
            ...localMeta,
            heroImage: heroImgUrl || undefined,
            avatarUrl: heroImgUrl || undefined,
            logoUrl: heroImgUrl || undefined,
        },
    } as Project;
}

/**
 * Create a new project in Supabase projects table
 */
export async function createProjectApi(project: {
    title: string;
    number: string;
    code: string;
    location?: string;
    clientName?: string;
    projectType?: string;
    startDate?: string;
    targetDate?: string;
    initialStage?: string;
    status?: string;
    projectLead?: string;
    progressTracking?: string;
    workspaceId?: string;
}) {
    let wsId = project.workspaceId;
    if (!wsId) {
        try {
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('id')
                .limit(1)
                .maybeSingle();
            wsId = wsData?.id;
        } catch (e) {
            console.warn('Could not auto-fetch workspace id:', e);
        }
    }

    const insertPayload: any = {
        name: project.title,
        project_number: project.number,
        project_code: project.code,
        status: project.status || 'planning',
        start_date: project.startDate || new Date().toISOString().split('T')[0],
    };

    if (project.targetDate) {
        insertPayload.target_date = project.targetDate;
    }

    if (wsId) {
        insertPayload.workspace_id = wsId;
    }

    if (project.location) {
        insertPayload.location = { city: project.location };
    }

    const { data, error } = await supabase
        .from('projects')
        .insert([insertPayload])
        .select()
        .single();

    if (error) {
        console.error('Error creating project in DB:', error);
        throw error;
    }

    if (data) {
        // Automatic membership rules:
        // 1. Project creator is automatically a member
        // 2. Project lead is automatically a member (role: 'Project Lead')
        // 3. No duplicate if creator is lead
        let initialMembers: any[] = [];
        try {
            const { data: authData } = await supabase.auth.getUser();
            const currentUserId = authData?.user?.id;
            let currentUserName = authData?.user?.email?.split('@')[0] || 'Member';
            let currentUserEmail = authData?.user?.email || '';

            if (currentUserId) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('id, full_name, nickname, email, avatar_url')
                    .eq('id', currentUserId)
                    .maybeSingle();

                if (prof) {
                    currentUserName = prof.full_name || prof.nickname || currentUserName;
                    currentUserEmail = prof.email || currentUserEmail;
                    initialMembers.push({
                        id: currentUserId,
                        userId: currentUserId,
                        name: currentUserName,
                        email: currentUserEmail,
                        projectRole: 'Member',
                        avatarUrl: prof.avatar_url || '',
                    });
                } else {
                    initialMembers.push({
                        id: currentUserId,
                        userId: currentUserId,
                        name: currentUserName,
                        email: currentUserEmail,
                        projectRole: 'Member',
                    });
                }
            }

            const leadIdentifier = project.projectLead || '';
            const isCreatorLead = Boolean(
                leadIdentifier && (
                    leadIdentifier === currentUserId ||
                    leadIdentifier.toLowerCase() === currentUserName.toLowerCase() ||
                    leadIdentifier.toLowerCase() === currentUserEmail.toLowerCase()
                )
            );

            if (isCreatorLead && initialMembers.length > 0) {
                initialMembers[0].projectRole = 'Project Lead';
            } else if (leadIdentifier && !isCreatorLead) {
                let leadAvatar = '';
                try {
                    const { data: leadProf } = await supabase
                        .from('profiles')
                        .select('avatar_url')
                        .or(`id.eq.${leadIdentifier},full_name.ilike.${leadIdentifier}`)
                        .limit(1)
                        .maybeSingle();
                    if (leadProf?.avatar_url) leadAvatar = leadProf.avatar_url;
                } catch (_) {}

                initialMembers.push({
                    id: leadIdentifier,
                    userId: leadIdentifier,
                    name: leadIdentifier,
                    email: '',
                    projectRole: 'Project Lead',
                    avatarUrl: leadAvatar,
                });
            }
        } catch (e) {
            console.warn('Could not auto-generate initial project members:', e);
        }

        // Save complete metadata so all create-time inputs are preserved
        const initialMeta = {
            projectLead: project.projectLead || '',
            projectLeadId: project.projectLead || '',
            projectType: project.projectType || 'Client Project',
            trackingMethod: project.progressTracking || 'manual',
            progressTracking: project.progressTracking || 'manual',
            startDate: project.startDate || new Date().toISOString().split('T')[0],
            targetDate: project.targetDate || null,
            initialStage: project.initialStage || 'upcoming',
            members: initialMembers,
        };
        await saveProjectMeta(data.id, initialMeta);

        const projectName = data.name || data.project_name || project.title;
        // Auto-create project channel with project code
        try {
            const numVal = project.number && !isNaN(Number(project.number)) ? Number(project.number) : 1;
            const codeNum = String(numVal).padStart(3, '0');
            const codeTag = (project.code || 'prj').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const channelCode = `#${codeNum}-${codeTag}`;
            await supabase.from('chat_channels').upsert([{
                id: `proj-${data.id}`,
                code: channelCode,
                name: projectName,
                description: `Project discussion for ${projectName}`,
                category: 'project',
                project_id: data.id,
                tenant_id: wsId || null,
                workspace_id: wsId || null,
                is_archived: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }], { onConflict: 'id' });

            // Realtime broadcast so Chat screen adds channel immediately without reload
            try {
                const globalBroadcast = supabase.channel('global_chat_broadcast');
                globalBroadcast.send({
                    type: 'broadcast',
                    event: 'channel_created',
                    payload: {
                        channelId: `proj-${data.id}`,
                        name: projectName,
                        code: channelCode,
                        category: 'project',
                        projectId: data.id,
                    },
                });
            } catch (_) {}
        } catch (chanErr) {
            console.warn('Project channel auto-create notice:', chanErr);
        }

        return {
            id: data.id,
            title: projectName,
            number: data.project_number || data.number || project.number,
            code: data.project_code || data.code || project.code,
            location: data.location?.city || '',
            phase: data.status || 'Planning',
            progress: 0,
            themeColor: '#007AFF', // Forma Blue
            heroImage: null,
            isArchived: false,
            isPinned: false,
            isAssignedToMe: true,
            lastActivityAt: data.created_at || new Date().toISOString(),
        } as Project;
    }
    return null;
}

// Reserved project numbers (Adidaya internal use + known anomalies in DB)
// 898, 998, 999 are excluded from sequential numbering
const RESERVED_PROJECT_NUMBERS = new Set([898, 998, 999]);

// Valid project number range for sequential numbering (001–799)
// Numbers >= 800 are considered reserved/internal/test entries
const MAX_VALID_PROJECT_NUMBER = 799;

/**
 * Fetch existing project numbers and codes directly from database columns.
 * This queries project_number and project_code directly, avoiding the generic
 * getField mapper which may pick up unrelated columns.
 */
export async function getProjectSequenceData(workspaceId?: string): Promise<{
    numbers: string[];
    codes: string[];
}> {
    let query = supabase
        .from('projects')
        .select('project_number, project_code');

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('🔴 [getProjectSequenceData] Error:', error);
        return { numbers: [], codes: [] };
    }

    console.log('🔴 [getProjectSequenceData] Raw rows (first 10):', JSON.stringify((data || []).slice(0, 10)));

    // project_number can be stored as string "037" or integer 37
    // Only include valid sequential range 1–799 (exclude reserved/anomalous >= 800)
    const numbers = (data || [])
        .map((p: any) => {
            const raw = p.project_number;
            if (raw === undefined || raw === null) return '';
            const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
            if (isNaN(num) || num <= 0 || num > MAX_VALID_PROJECT_NUMBER) return '';
            return String(num).padStart(3, '0');
        })
        .filter((n: string) => n.length > 0);
    const codes = (data || [])
        .map((p: any) => String(p.project_code ?? ''))
        .filter((c: string) => c.length > 0)
        .map((c: string) => c.toUpperCase());

    console.log('🔴 [getProjectSequenceData] valid numbers (1-' + MAX_VALID_PROJECT_NUMBER + '):', numbers);
    console.log('🔴 [getProjectSequenceData] codes:', codes);

    return { numbers, codes };
}

/**
 * Calculate the next sequential project number, skipping reserved ones.
 */
export function getNextProjectNumber(existingNumbers: string[]): string {
    const nums = existingNumbers
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n) && !RESERVED_PROJECT_NUMBERS.has(n) && n <= MAX_VALID_PROJECT_NUMBER);

    let nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    while (RESERVED_PROJECT_NUMBERS.has(nextNum) || nextNum > MAX_VALID_PROJECT_NUMBER) {
        nextNum++;
    }
    return String(nextNum).padStart(3, '0');
}

/**
 * Smart project code generator with collision avoidance.
 *
 * Rules:
 * - 1 word "Lapangan" → LAP; if taken, cycle 3rd letter: LAA, LAN, LAG…
 * - 2 words "Lapangan Bola" → LAB; if taken, cycle pos2 via word1: LPB, LNB, LGB…
 *   then cycle pos3 via word2: LBO, LBL, LBA…
 * - 3 words "Lapangan Bola Bekasi" → LBB; if taken, cycle pos2 via word1: LAB, LPB…
 *   then cycle pos3 via word2: LBO, LBL… then word3: LBE, LBK…
 */
export function generateProjectCode(title: string, existingCodes: string[]): string {
    const codeSet = new Set(existingCodes.map(c => c.toUpperCase()));
    const cleaned = title.trim().replace(/[^a-zA-Z\s]/g, '').toUpperCase();
    const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 3);

    if (words.length === 0) return '';

    // Get unique letters from a word, preserving order of first appearance
    const uniqueLetters = (word: string): string[] => {
        const seen = new Set<string>();
        return word.split('').filter(c => {
            if (seen.has(c)) return false;
            seen.add(c);
            return true;
        });
    };

    const isAvailable = (code: string): boolean =>
        code.length === 3 && !codeSet.has(code);

    if (words.length >= 3) {
        const [w1, w2, w3] = words;
        const primary = w1[0] + w2[0] + w3[0];
        if (isAvailable(primary)) return primary;

        // Phase 1: cycle pos2 through word1 letters (keep pos1=w1[0], pos3=w3[0])
        for (const c of uniqueLetters(w1)) {
            if (c === w2[0]) continue; // skip the one already in primary
            const code = w1[0] + c + w3[0];
            if (isAvailable(code)) return code;
        }
        // Phase 2: cycle pos3 through word2 letters (keep pos1=w1[0], pos2=w2[0])
        for (const c of uniqueLetters(w2)) {
            if (c === w3[0]) continue;
            const code = w1[0] + w2[0] + c;
            if (isAvailable(code)) return code;
        }
        // Phase 3: cycle pos3 through word3 letters (keep pos1=w1[0], pos2=w2[0])
        for (const c of uniqueLetters(w3)) {
            if (c === w3[0]) continue; // skip the one already in primary
            const code = w1[0] + w2[0] + c;
            if (isAvailable(code)) return code;
        }
        return primary; // fallback: return primary even if taken (will show warning)

    } else if (words.length === 2) {
        const [w1, w2] = words;
        const primary = w1[0] + (w1[1] || w1[0]) + w2[0];
        if (isAvailable(primary)) return primary;

        // Phase 1: cycle pos2 through word1 letters (keep pos1=w1[0], pos3=w2[0])
        for (const c of uniqueLetters(w1)) {
            if (c === w1[0]) continue; // skip same as pos1 to avoid e.g. LLB
            if (c === w1[1]) continue; // skip the one already in primary
            const code = w1[0] + c + w2[0];
            if (isAvailable(code)) return code;
        }
        // Phase 2: keep pos1=w1[0], set pos2=w2[0], cycle pos3 through word2 letters
        for (const c of uniqueLetters(w2)) {
            if (c === w2[0]) continue; // skip the one used for pos2
            const code = w1[0] + w2[0] + c;
            if (isAvailable(code)) return code;
        }
        return primary;

    } else {
        const w = words[0];
        const p0 = w[0] || 'X';
        const p1 = w[1] || p0;
        const p2 = w[2] || p1;
        const primary = p0 + p1 + p2;
        if (isAvailable(primary)) return primary;

        // Cycle pos3 through remaining word letters (starting after index 2)
        const base = p0 + p1;
        for (let i = 3; i < w.length; i++) {
            const code = base + w[i];
            if (isAvailable(code)) return code;
        }
        // Then try all unique letters of the word
        for (const c of uniqueLetters(w)) {
            if (c === p2) continue;
            const code = base + c;
            if (code.length === 3 && isAvailable(code)) return code;
        }
        return primary;
    }
}

/**
 * Update project parameters and metadata in Supabase
 */
export async function updateProjectApi(
    projectId: string,
    updates: Partial<Project> & { clientName?: string; isPinned?: boolean; isArchived?: boolean }
): Promise<Project | null> {
    if (!projectId) return null;
    const { data: current, error: fetchErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

    if (fetchErr || !current) {
        console.warn('Project not found for update in DB:', projectId);
        return null;
    }

    const payload: any = {};
    if (updates.title !== undefined) payload.name = updates.title;
    if (updates.code !== undefined) payload.project_code = updates.code;
    if (updates.number !== undefined) payload.project_number = updates.number;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.targetDate !== undefined) payload.target_date = updates.targetDate;
    if (updates.status !== undefined) payload.status = updates.status.toLowerCase();
    if (updates.isArchived !== undefined) {
        payload.status = updates.isArchived ? 'archived' : 'active';
    }

    let imageUri: string | undefined;
    if (updates.heroImage !== undefined) {
        imageUri = typeof updates.heroImage === 'string' ? updates.heroImage : (updates.heroImage as any)?.uri;
        if (imageUri) payload.hero_image_url = imageUri;
    }
    if (updates.meta?.avatarUrl || updates.meta?.logoUrl || updates.meta?.heroImage) {
        imageUri = updates.meta.avatarUrl || updates.meta.logoUrl || updates.meta.heroImage;
        if (imageUri) payload.hero_image_url = imageUri;
    }

    if (updates.isPinned !== undefined) {
        payload.is_pinned = updates.isPinned;
    }

    if (updates.progress !== undefined) {
        payload.progress = updates.progress;
    }

    if (Object.keys(payload).length > 0) {
        const { error } = await supabase
            .from('projects')
            .update(payload)
            .eq('id', projectId);

        if (error) {
            // If certain columns do not exist in DB yet, fallback to updating core columns
            if (error.code === 'PGRST204') {
                const safePayload = { ...payload };
                delete safePayload.hero_image_url;
                delete safePayload.is_pinned;
                delete safePayload.is_favorite;
                delete safePayload.progress;
                if (Object.keys(safePayload).length > 0) {
                    await supabase.from('projects').update(safePayload).eq('id', projectId);
                }
            }
        }
    }

    if (updates.meta !== undefined || imageUri || updates.isPinned !== undefined || updates.progress !== undefined) {
        const currentMeta = await getProjectMeta(projectId);
        const mergedMeta = {
            ...currentMeta,
            ...(updates.meta || {}),
            ...(updates.progress !== undefined ? { progress: updates.progress } : {}),
            ...(updates.isPinned !== undefined ? {
                isPinned: updates.isPinned,
                isFavorite: updates.isPinned,
            } : {}),
            ...(imageUri ? {
                heroImage: imageUri,
                avatarUrl: imageUri,
                logoUrl: imageUri,
            } : {}),
        };
        await saveProjectMeta(projectId, mergedMeta);
    }

    return getProjectById(projectId);
}

/**
 * Delete a project from Supabase
 */
export async function deleteProjectApi(projectId: string): Promise<boolean> {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error('Error deleting project:', error);
        return false;
    }
    return true;
}

/**
 * Fetch stats for a project (tasks, documents, weekly logs, crew)
 */
export async function getProjectStats(projectId: string, projectCode: string) {
    try {
        const { count: activeTasksCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .neq('status', 'done');

        const { data: tasksData } = await supabase
            .from('tasks')
            .select('attachment_urls, submission_urls')
            .eq('project_id', projectId);

        let docCount = 0;
        const urls = new Set<string>();
        if (tasksData) {
            tasksData.forEach(t => {
                if (t.attachment_urls) {
                    t.attachment_urls.split(',').filter(Boolean).forEach((url: string) => urls.add(url.trim()));
                }
                if (t.submission_urls) {
                    t.submission_urls.split(',').filter(Boolean).forEach((url: string) => urls.add(url.trim()));
                }
            });
        }
        
        const { data: proj } = await supabase
            .from('projects')
            .select('meta')
            .eq('id', projectId)
            .single();
            
        if (proj?.meta?.documents && Array.isArray(proj.meta.documents)) {
            docCount = urls.size + proj.meta.documents.length;
        } else {
            docCount = urls.size;
        }

        const { count: openActionsCount } = await supabase
            .from('actions')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .neq('status', 'approved')
            .neq('status', 'rejected');

        const { count: logsCount } = await supabase
            .from('crew_daily_logs')
            .select('*', { count: 'exact', head: true })
            .eq('project_code', projectCode);

        const { count: crewCount } = await supabase
            .from('crew_members')
            .select('*', { count: 'exact', head: true })
            .eq('current_project_code', projectCode)
            .eq('status', 'ACTIVE');

        const membersCount = Array.isArray(proj?.meta?.members) ? proj.meta.members.length : 0;

        return {
            activeTasks: activeTasksCount || 0,
            openActions: openActionsCount || 0,
            documents: docCount || 0,
            projectMembers: membersCount,
            weeklyLogs: logsCount || 0,
            crewActive: crewCount || 0
        };
    } catch (e) {
        console.error('Error fetching project stats:', e);
        return {
            activeTasks: 0,
            openActions: 0,
            documents: 0,
            projectMembers: 0,
            weeklyLogs: 0,
            crewActive: 0
        };
    }
}

/**
 * Initialize standard WBS items for a project if not already present
 */
export async function initializeProjectWbs(projectId: string) {
    try {
        const { data: existing, error: errExist } = await supabase
            .from('project_wbs_items')
            .select('id')
            .eq('project_id', projectId)
            .limit(1);

        if (errExist) {
            console.error('Error checking existing WBS:', errExist);
            return;
        }

        if (existing && existing.length > 0) {
            return; // already initialized
        }

        const itemsToInsert: any[] = [];
        let position = 0;
        const isForma = APP_MODE === 'forma';

        for (const template of WBS_TEMPLATES) {
            itemsToInsert.push(isForma ? {
                project_id: projectId,
                wbs_code: template.code,
                name: template.name,
            } : {
                project_id: projectId,
                wbs_code: template.code,
                title: template.name,
                level: 0,
                is_leaf: false,
                position: position++
            });

            for (const sec of template.sections) {
                itemsToInsert.push(isForma ? {
                    project_id: projectId,
                    wbs_code: sec.code,
                    name: sec.name,
                } : {
                    project_id: projectId,
                    wbs_code: sec.code,
                    title: sec.name,
                    level: 1,
                    is_leaf: true,
                    position: position++
                });
            }
        }

        const { error } = await supabase
            .from('project_wbs_items')
            .insert(itemsToInsert);

        if (error) {
            console.error('Error initializing WBS items:', error);
        }
    } catch (e) {
        console.error('Exception initializing WBS:', e);
    }
}

/**
 * Toggle check/uncheck status for a WBS item in its meta field
 */
export async function toggleWbsItemDone(wbsItemId: string, isDone: boolean): Promise<boolean> {
    try {
        const { data, error: fetchErr } = await supabase
            .from('project_wbs_items')
            .select('meta')
            .eq('id', wbsItemId)
            .single();

        if (fetchErr) {
            console.error('Error fetching WBS item meta:', fetchErr);
            return false;
        }

        const currentMeta = data?.meta || {};
        const updatedMeta = { ...currentMeta, isDone };

        const { error } = await supabase
            .from('project_wbs_items')
            .update({ meta: updatedMeta })
            .eq('id', wbsItemId);

        if (error) {
            console.error('Error updating WBS item:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Exception toggling WBS item:', e);
        return false;
    }
}

/**
 * Upload a project hero image to Supabase storage with tenant-isolated path and return its public URL.
 */
export async function uploadProjectHeroImage(
    projectId: string, 
    base64Data: string, 
    fileExt: string,
    tenantId?: string
): Promise<string | null> {
    try {
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId) {
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (authData?.user?.id) {
                    const { data: tm } = await supabase
                        .from('tenant_members')
                        .select('tenant_id')
                        .eq('user_id', authData.user.id)
                        .limit(1)
                        .maybeSingle();
                    if (tm?.tenant_id) resolvedTenantId = tm.tenant_id;
                }
            } catch (_) {}
        }

        const folderPrefix = resolvedTenantId ? `${resolvedTenantId}/projects/${projectId}` : `global/projects/${projectId}`;
        const fileName = `${folderPrefix}/${Date.now()}.${fileExt}`;
        const binaryData = decode(base64Data);
        const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

        // Attempt upload across candidate buckets — ordered by likelihood of existing
        const candidateBuckets = ['project-files', 'avatars', 'from-adidaya', 'chat-attachments', 'chat', 'profile_documents', 'finance_attachments'];
        const errors: string[] = [];
        
        for (const bucket of candidateBuckets) {
            try {
                const { error } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, binaryData, {
                        contentType,
                        upsert: true,
                    });

                if (!error) {
                    const { data } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);
                    console.log(`[uploadProjectHeroImage] Success via bucket: ${bucket}`);
                    return data.publicUrl;
                }
                errors.push(`${bucket}: ${error.message}`);
            } catch (err: any) {
                errors.push(`${bucket}: ${err?.message || 'unknown'}`);
            }
        }

        console.error("Error uploading project hero image: All candidate buckets failed.", errors.join(' | '));
        return null;
    } catch (e) {
        console.error("Exception in uploadProjectHeroImage:", e);
        return null;
    }
}

