import { supabase, APP_MODE } from '../supabase';
import { Task, Action, Project, TaskAttachment } from '@/constants/MockData';
import { decode } from 'base64-arraybuffer';
import { addLocalNotification } from './notifications';

export const WBS_TEMPLATES = [
    {
        code: "S",
        name: "Structure (Struktur)",
        sections: [
            { code: "S.1", name: "Preparation (Persiapan)" },
            { code: "S.2", name: "Earthworks (Pekerjaan Tanah)" },
            { code: "S.3", name: "Foundation (Pekerjaan Pondasi)" },
            { code: "S.4", name: "Concrete Structure (Struktur Beton)" },
            { code: "S.5", name: "Steel/Roof Structure (Struktur Atap)" },
        ],
    },
    {
        code: "A",
        name: "Architecture (Arsitektur)",
        sections: [
            { code: "A.1", name: "Wall Masonry & Plaster (Dinding & Plesteran)" },
            { code: "A.2", name: "Wall Finishes (Finishing Dinding)" },
            { code: "A.3", name: "Floor Finishes (Finishing Lantai)" },
            { code: "A.4", name: "Ceiling Works (Pekerjaan Plafond)" },
            { code: "A.5", name: "Painting (Pengecatan)" },
            { code: "A.6", name: "Doors & Windows (Kusen, Pintu & Jendela)" },
            { code: "A.7", name: "Sanitary Ware (Sanitair)" },
            { code: "A.8", name: "Facade & Cladding (Fasad)" },
        ],
    },
    {
        code: "M",
        name: "MEP (Mechanical Electrical Plumbing)",
        sections: [
            { code: "M.1", name: "Electrical & Lighting (Elektrikal & Penerangan)" },
            { code: "M.2", name: "Plumbing & Water Supply (Plumbing & Air)" },
            { code: "M.3", name: "Air Conditioning & HVAC (AC & HVAC)" },
            { code: "M.4", name: "Fire Fighting (Pemadam Kebakaran)" },
            { code: "M.5", name: "Lightning Protection (Proteksi Petir)" },
        ],
    },
    {
        code: "I",
        name: "Interior",
        sections: [
            { code: "I.1", name: "Built-in Furniture (Furnitur Custom)" },
            { code: "I.2", name: "Loose Furniture (Furnitur Loose)" },
            { code: "I.3", name: "Interior Wall Coverings (Finishing Interior)" },
            { code: "I.4", name: "Special Lighting (Lampu Dekoratif)" },
        ],
    },
    {
        code: "L",
        name: "Landscape (Lansekap)",
        sections: [
            { code: "L.1", name: "Hardscape (Pekerasan)" },
            { code: "L.2", name: "Softscape (Tanaman)" },
            { code: "L.3", name: "Drainage & Irrigation (Saluran Air)" },
            { code: "L.4", name: "Garden Lighting (Lampu Taman)" },
        ],
    },
];

export interface DBProfile {
    id: string;
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email: string | null;
}

export interface DBWbsItem {
    id: string;
    project_id: string;
    parent_id: string | null;
    wbs_code: string;
    title: string;
    is_leaf: boolean;
    level: number;
}

// ----------------------------------------------------
// Profiles Fetch
// ----------------------------------------------------
export async function getProfiles(tenantId?: string): Promise<Array<{ id: string; name: string; avatar?: string; departmentId?: string; department?: string }>> {
    let userIds: string[] = [];

    if (tenantId && APP_MODE !== 'adidaya') {
        try {
            const { data: memberRows, error: memberErr } = await supabase
                .from('tenant_members')
                .select('user_id, status, role')
                .eq('tenant_id', tenantId);

            if (!memberErr && memberRows && memberRows.length > 0) {
                userIds = memberRows
                    .filter((m: any) => m.status !== 'inactive' && m.status !== 'archived')
                    .map((m: any) => m.user_id)
                    .filter(Boolean);
            }
        } catch (e) {
            console.warn('Error fetching tenant_members:', e);
        }
    }

    let query = supabase
        .from('profiles')
        .select('id, full_name, nickname, avatar_url, account_type, email, department_id, department');

    if (userIds.length > 0) {
        query = query.in('id', userIds);
    } else if (tenantId && APP_MODE !== 'adidaya') {
        query = query.or(`tenant_id.eq.${tenantId},workspace_id.eq.${tenantId}`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    const isExcludedName = (name: string) => {
        const lower = name.toLowerCase().trim();
        return (
            lower.startsWith('test_') ||
            lower.includes('test user') ||
            lower === 'coba coba saja' ||
            lower === 'unknown user' ||
            lower.includes('superadmin') ||
            lower === 'admin'
        );
    };

    const validProfiles = (data || [])
        .filter((p: any) => p.account_type !== 'system' && p.account_type !== 'superadmin')
        .map((p: any) => {
            const rawName = p.full_name || p.nickname;
            let name = rawName;
            if (!name && p.email) {
                const userPart = p.email.split('@')[0];
                name = userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            }
            return {
                id: p.id,
                name: name || 'Team Member',
                avatar: p.avatar_url || undefined,
                departmentId: p.department_id || undefined,
                department: p.department || undefined,
            };
        })
        .filter(p => !isExcludedName(p.name))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return validProfiles;
}

// ----------------------------------------------------
// Project WBS Fetch
// ----------------------------------------------------
export async function getProjectWbs(projectId: string): Promise<DBWbsItem[]> {
    const isForma = APP_MODE === 'forma';
    const selectCols = isForma
        ? 'id, project_id, wbs_code, name'
        : 'id, project_id, parent_id, wbs_code, title, is_leaf, level';

    const { data, error } = await supabase
        .from('project_wbs_items')
        .select(selectCols)
        .eq('project_id', projectId)
        .order('wbs_code', { ascending: true });

    if (error) {
        console.error('Error fetching project WBS items:', error);
        return [];
    }

    return (data || []).map((w: any) => ({
        id: w.id,
        project_id: w.project_id,
        parent_id: w.parent_id || null,
        wbs_code: w.wbs_code,
        title: w.name || w.title || w.wbs_code,
        is_leaf: w.is_leaf ?? true,
        level: w.level || 0,
    }));
}

// ----------------------------------------------------
// Department Fetch helper
// ----------------------------------------------------
export async function getDepartments(): Promise<{ id: string; name: string; code: string }[]> {
    try {
        const { data, error } = await supabase
            .from('organization_departments')
            .select('id, name, code')
            .order('name');
        
        if (!error && data && data.length > 0) {
            return data.map((d: any) => {
                const rawCode = String(d.code || '').trim();
                const cleanCode = (rawCode.includes('-') ? rawCode.split('-')[1] : rawCode)
                    .replace(/[^A-Za-z0-9]/g, '')
                    .toUpperCase();
                return {
                    id: d.id,
                    name: d.name,
                    code: cleanCode || (d.name || '').substring(0, 3).toUpperCase()
                };
            });
        }
    } catch (e) {
        console.warn('organization_departments query error:', e);
    }

    try {
        const { data: profs } = await supabase
            .from('profiles')
            .select('department')
            .not('department', 'is', null);
        
        if (profs && profs.length > 0) {
            const uniqueDepts = Array.from(new Set(profs.map((p: any) => p.department?.trim()).filter(Boolean)));
            if (uniqueDepts.length > 0) {
                return uniqueDepts.map((name: string) => ({
                    id: `dept-${name.toLowerCase().replace(/\s+/g, '-')}`,
                    name: name,
                    code: name.substring(0, 3).toUpperCase()
                }));
            }
        }
    } catch (e) {
        console.warn('profiles department query error:', e);
    }

    return [
        { id: 'dept-eng', name: 'Engineering', code: 'ENG' },
        { id: 'dept-des', name: 'Design', code: 'DES' },
        { id: 'dept-fin', name: 'Finance & Accounting', code: 'FIN' },
        { id: 'dept-ops', name: 'Operations & Site', code: 'OPS' },
        { id: 'dept-hr', name: 'Human Resources', code: 'HR' },
        { id: 'dept-mkt', name: 'Marketing & Sales', code: 'MKT' },
        { id: 'dept-exec', name: 'Management / Executive', code: 'EXEC' }
    ];
}

// ----------------------------------------------------
// File Upload helper
// ----------------------------------------------------
export async function uploadTaskAttachment(base64Data: string, fileExt: string, contentType: string): Promise<string> {
    const cleanExt = (fileExt || 'jpg').replace(/^\./, '').toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xlsx', 'txt'].includes(cleanExt) ? cleanExt : 'jpg';
    const fileName = `tasks/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${safeExt}`;
    
    const candidateBuckets = [
        'chat-attachments',
        'project-files',
        'finance_attachments',
        'finance-attachments',
        'avatars',
        'chat'
    ];

    const binaryData = decode(base64Data);

    for (const bucket of candidateBuckets) {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .upload(fileName, binaryData, {
                    contentType: contentType || 'application/octet-stream',
                    upsert: true
                });

            if (!error) {
                const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(fileName);
                if (data?.publicUrl) {
                    return data.publicUrl;
                }
                return fileName;
            }
        } catch (err) {
            // try next bucket
        }
    }
    return '';
}

// ----------------------------------------------------
// Task API Methods
// ----------------------------------------------------
const resolveFinanceUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://fmgcvwximerhgjgctpsp.supabase.co/storage/v1/object/public/finance-documents/${path}`;
};

export async function getTasks(workspaceId?: string): Promise<Task[]> {
    let tasksQuery = supabase
        .from('tasks')
        .select(`
            *,
            projects ( * ),
            task_assignees ( user_id )
        `)
        .order('created_at', { ascending: false });

    if (workspaceId && APP_MODE !== 'adidaya') {
        const { data: projRows } = await supabase
            .from('projects')
            .select('id')
            .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);
        const pids = (projRows || []).map(p => p.id);
        if (pids.length > 0) {
            tasksQuery = tasksQuery.or(`project_id.in.(${pids.join(',')}),project_id.is.null`);
        }
    }

    const [tasksRes, profilesData] = await Promise.all([
        tasksQuery,
        getProfiles(workspaceId)
    ]);

    const { data, error } = tasksRes;
    if (error || !data || data.length === 0) {
        if (error) console.error('Error fetching tasks from Supabase:', error);
        return [];
    }

    const profileMap = new Map(profilesData.map(p => [p.id, p]));

    // Fetch any missing assignees directly from profiles so no member is 'Unknown Member'
    const allTaskAssigneeIds = Array.from(new Set(
        (data || []).flatMap((t: any) => (t.task_assignees || []).map((ta: any) => ta.user_id)).filter(Boolean)
    ));
    const missingAssigneeIds = allTaskAssigneeIds.filter(id => !profileMap.has(id));
    if (missingAssigneeIds.length > 0) {
        try {
            const { data: extraProfs } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, avatar_url, email, department_id, department')
                .in('id', missingAssigneeIds);
            (extraProfs || []).forEach((p: any) => {
                const rawName = p.full_name || p.nickname;
                let name = rawName;
                if (!name && p.email) {
                    const userPart = p.email.split('@')[0];
                    name = userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                }
                profileMap.set(p.id, {
                    id: p.id,
                    name: name || 'Team Member',
                    avatar: p.avatar_url || undefined,
                    departmentId: p.department_id || undefined,
                    department: p.department || undefined,
                });
            });
        } catch (extraErr) {
            console.warn('Error fetching missing assignee profiles:', extraErr);
        }
    }

    const mappedTasks = (data || []).map((t: any) => {
        // Map assignees
        const assigneeIds: string[] = t.task_assignees ? t.task_assignees.map((ta: any) => ta.user_id) : [];
        const mappedAssignees = assigneeIds.map(uid => profileMap.get(uid) || { id: uid, name: 'Team Member' });

        // Map attachments (comma-separated URLs/paths)
        const attachments: TaskAttachment[] = (t.attachment_urls || '').split(',').filter(Boolean).map((url: string, index: number) => {
            const name = url.split('/').pop() || `Attachment ${index + 1}`;
            const resolvedUrl = resolveFinanceUrl(url);
            return {
                id: `att-${t.id}-${index}`,
                uri: resolvedUrl,
                path: url,
                name,
                type: (url.match(/\.(jpeg|jpg|gif|png)/i) ? 'image' : 'file') as any
            };
        });

        // Map submission attachments (comma-separated URLs/paths)
        const submissionAttachments: TaskAttachment[] = (t.submission_urls || '').split(',').filter(Boolean).map((url: string, index: number) => {
            const name = url.split('/').pop() || `Proof ${index + 1}`;
            const resolvedUrl = resolveFinanceUrl(url);
            return {
                id: `proof-${t.id}-${index}`,
                uri: resolvedUrl,
                path: url,
                name,
                type: (url.match(/\.(jpeg|jpg|gif|png)/i) ? 'image' : 'file') as any
            };
        });

        // Map subtasks JSON
        let mappedSubtasks: Task['subtasks'] = undefined;
        if (t.subtasks && Array.isArray(t.subtasks)) {
            mappedSubtasks = t.subtasks.map((sub: any, index: number) => ({
                id: sub.id || `sub-${index}`,
                title: sub.title || sub.label || 'Subtask',
                assignee: sub.assignee ? { name: sub.assignee.name || 'Staff' } : { name: 'Staff' },
                isDone: sub.isDone ?? sub.done ?? false
            }));
        }

        // Determine if linked module is active
        let taskType: Task['taskType'] = 'generic';
        let linkedModule: Task['linkedModule'] = undefined;
        
        // Parse metadata inside description if any (fallback/extras)
        const descText = t.description || '';
        const match = descText.match(/<!--METADATA:({.*?})-->/);
        let cleanDescription = descText.replace(/<!--METADATA:({.*?})-->/, '').trim();
        let targetModule = null;
        let metaDepartment = null;
        let metaDepartmentCode = null;
        let metaProject = null;
        let metaProjectCode = null;

        if (match && match[1]) {
            try {
                const meta = JSON.parse(match[1]);
                if (meta.target_module) targetModule = meta.target_module;
                if (meta.department) metaDepartment = meta.department;
                if (meta.department_code) metaDepartmentCode = meta.department_code;
                if (meta.project) metaProject = meta.project;
                if (meta.project_code) metaProjectCode = meta.project_code;
            } catch (e) {
                console.error(e);
            }
        }

        // Check if title or module mentions links
        const lowerTitle = (t.title || '').toLowerCase();
        if (targetModule || lowerTitle.includes('purchasing') || lowerTitle.includes('reimbursement') || lowerTitle.includes('leave') || lowerTitle.includes('overtime') || lowerTitle.includes('absen') || lowerTitle.includes('daily log')) {
            taskType = 'linked_module';
            const target = (targetModule || (
                (lowerTitle.includes('purchasing') || lowerTitle.includes('reimbursement')) ? 'finance' :
                (lowerTitle.includes('leave') || lowerTitle.includes('overtime') || lowerTitle.includes('absen')) ? 'clock' :
                lowerTitle.includes('daily log') ? 'crew' : 'people'
            )) as any;

            linkedModule = {
                target,
                actionLabel: `Go To ${target.charAt(0).toUpperCase() + target.slice(1)}`,
                route: `/${target}`
            };
        }

        let mappedStatus: Task['status'] = 'todo';
        const rawStatus = (t.status || 'todo').toLowerCase();
        if (rawStatus === 'in_progress' || rawStatus === 'in-progress' || rawStatus === 'inprogress') {
            mappedStatus = 'in_progress';
        } else if (rawStatus === 'submitted' || rawStatus === 'submit') {
            mappedStatus = 'submitted';
        } else if (rawStatus === 'revision') {
            mappedStatus = 'revision';
        } else if (rawStatus === 'done' || rawStatus === 'completed' || rawStatus === 'complete') {
            mappedStatus = 'done';
        } else {
            mappedStatus = 'todo';
        }

        // Format WBS only if valid WBS code or task_number exists
        let resolvedWbs: string | undefined = undefined;
        if (t.task_number && String(t.task_number).trim()) {
            resolvedWbs = String(t.task_number).trim();
        } else if (t.project_wbs_items?.wbs_code && String(t.project_wbs_items.wbs_code).trim()) {
            const rawWbs = String(t.project_wbs_items.wbs_code).trim();
            const projNum = t.projects?.project_number ? String(t.projects.project_number).trim() : '';
            resolvedWbs = projNum ? `${projNum}-${rawWbs.replace(/\./g, '')}` : rawWbs;
        }

        const resolvedProjectName = t.projects?.name || t.projects?.title || t.projects?.project_name || metaProject || metaDepartment || 'General';
        const resolvedProjectCode = t.projects?.project_code || t.projects?.code || metaProjectCode || metaDepartmentCode || (t.projects ? 'PRJ' : 'GEN');

        return {
            id: t.id,
            title: t.title || 'Untitled Task',
            project: resolvedProjectName,
            projectCode: resolvedProjectCode,
            wbs: resolvedWbs,
            status: mappedStatus,
            priority: (t.priority || 'medium').toLowerCase() as any,
            dueDate: t.deadline_date || '',
            dueTime: t.deadline_time ? (t.deadline_time.includes(':') ? t.deadline_time.split(':').slice(0, 2).join(':') : t.deadline_time) : undefined,
            description: cleanDescription || undefined,
            taskType,
            linkedModule,
            attachments,
            submissionAttachments,
            submissionNote: t.submission_note || undefined,
            assignees: mappedAssignees,
            subtasks: mappedSubtasks,
            comments: [],
            history: []
        };
    });

    return mappedTasks;
}

export async function createTaskApi(
    taskData: Omit<Task, 'id' | 'project' | 'projectCode'> & { projectId?: string; wbsId?: string; wbsCode?: string; tenantId?: string; workspaceId?: string },
    assigneeIds: string[]
): Promise<Task | null> {
    
    // Convert links/files list to comma separated string
    const attachmentUrls = taskData.attachments
        ? taskData.attachments.map(att => att.uri).join(',')
        : null;

    // Convert subtasks list to json array
    const subtasksJson = taskData.subtasks
        ? taskData.subtasks.map(sub => ({
            id: sub.id,
            title: sub.title,
            assignee: { name: sub.assignee.name },
            isDone: sub.isDone
          }))
        : [];

    const metaPayload: Record<string, any> = {};
    if (taskData.taskType === 'linked_module' && taskData.linkedModule) {
        metaPayload.target_module = taskData.linkedModule.target;
    }
    if ((taskData as any).department) {
        metaPayload.department = (taskData as any).department;
    }
    if ((taskData as any).departmentCode) {
        metaPayload.department_code = (taskData as any).departmentCode;
    }
    if ((taskData as any).project) {
        metaPayload.project = (taskData as any).project;
    }
    if ((taskData as any).projectCode) {
        metaPayload.project_code = (taskData as any).projectCode;
    }

    let descriptionField = taskData.description || '';
    if (Object.keys(metaPayload).length > 0) {
        descriptionField += `\n<!--METADATA:${JSON.stringify(metaPayload)}-->`;
    }

    let resolvedWbsId = taskData.wbsId || null;

    if (taskData.wbsCode && taskData.projectId) {
        const wbsCode = taskData.wbsCode;
        // Check if WBS item already exists in database for this project
        const { data: wbsItems } = await supabase
            .from('project_wbs_items')
            .select('id')
            .eq('project_id', taskData.projectId)
            .eq('wbs_code', wbsCode);

        if (wbsItems && wbsItems.length > 0) {
            resolvedWbsId = wbsItems[0].id;
        } else {
            // Find template details to populate title
            const disciplineCode = wbsCode.split('.')[0];
            const discipline = WBS_TEMPLATES.find(d => d.code === disciplineCode);
            const section = discipline?.sections.find(s => s.code === wbsCode);
            const wbsTitle = section?.name || 'WBS Item';

            // Insert dynamic WBS item
            const isForma = APP_MODE === 'forma';
            const wbsInsertPayload: any = isForma ? {
                project_id: taskData.projectId,
                wbs_code: wbsCode,
                name: wbsTitle
            } : {
                project_id: taskData.projectId,
                wbs_code: wbsCode,
                title: wbsTitle,
                level: 3,
                is_leaf: true,
                position: 0
            };

            const { data: newWbs, error: newWbsErr } = await supabase
                .from('project_wbs_items')
                .insert(wbsInsertPayload)
                .select()
                .single();

            if (newWbs) {
                resolvedWbsId = newWbs.id;
            } else {
                console.warn('WBS auto-creation returned null, proceeding without WBS link', newWbsErr);
            }
        }
    }

    // 1. Resolve project tenant and workspace IDs
    let projTenantId: string | null = taskData.tenantId || null;
    let projWorkspaceId: string | null = taskData.workspaceId || null;
    if (taskData.projectId) {
        const { data: projData } = await supabase
            .from('projects')
            .select('tenant_id, workspace_id')
            .eq('id', taskData.projectId)
            .maybeSingle();
        if (projData) {
            projTenantId = projData.tenant_id || projTenantId;
            projWorkspaceId = projData.workspace_id || projWorkspaceId;
        }
    }

    // 2. Insert Task
    const { data: sessionData } = await supabase.auth.getSession();
    const creatorId = sessionData?.session?.user?.id || null;

    const normalizeTime = (t?: string): string | null => {
        if (!t) return null;
        const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!m) return null;
        let h = parseInt(m[1], 10);
        const p = m[3]?.toUpperCase();
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        if (h > 23) h = 23;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
    };

    const { data: taskRow, error: taskError } = await supabase
        .from('tasks')
        .insert({
            title: taskData.title,
            description: descriptionField || null,
            project_id: taskData.projectId || null,
            wbs_id: resolvedWbsId || null,
            deadline_date: taskData.dueDate || new Date().toISOString().split('T')[0],
            deadline_time: normalizeTime(taskData.dueTime),
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            attachment_urls: attachmentUrls || null,
            subtasks: subtasksJson || [],
            created_by: creatorId,
        })
        .select('*')
        .single();

    if (taskError || !taskRow) {
        console.error('Error creating task:', taskError);
        throw new Error(taskError?.message || 'Failed to save task to server.');
    }

    // 2. Insert Assignees
    if (assigneeIds && assigneeIds.length > 0) {
        const validAssigneeIds = assigneeIds.filter(uid => uuidRegex.test(uid));
        if (validAssigneeIds.length > 0) {
            const assigneeRows = validAssigneeIds.map(uid => ({
                task_id: taskRow.id,
                user_id: uid
            }));
            const { error: assError } = await supabase.from('task_assignees').insert(assigneeRows);
            if (assError) {
                console.error('Error inserting task assignees:', assError);
            }
        }
    }

    // 3. Trigger Notification to Assignees or Team
    try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id;
        
        let creatorName = 'Team';
        if (currentUserId) {
            const { data: creatorProf } = await supabase
                .from('profiles')
                .select('full_name, nickname')
                .eq('id', currentUserId)
                .maybeSingle();
            if (creatorProf) {
                creatorName = creatorProf.full_name || creatorProf.nickname || 'Team Member';
            }
        }

        const taskTitle = taskData.title || 'Untitled Task';
        const deadlineInfo = taskData.dueDate ? ` (Deadline: ${taskData.dueDate})` : '';

        const recipients = Array.from(new Set([
            ...(assigneeIds || []),
            currentUserId
        ].filter(Boolean) as string[]));

        addLocalNotification({
            text: `${creatorName} assigned a new task: "${taskTitle}"${deadlineInfo}`,
            module: 'Task',
            user: creatorName,
            category: 'projects',
            tenantId: projTenantId || undefined,
            workspaceId: projWorkspaceId || undefined,
            projectCode: taskRow.projects?.project_code || undefined,
            ref: taskRow.id,
            action: 'task_assigned',
            subjectUser: assigneeIds?.[0]
        }, recipients.length > 0 ? recipients : undefined).catch(err => console.warn('Failed to add task notification:', err));
    } catch (notifErr) {
        console.warn('Failed to dispatch task creation notification:', notifErr);
    }

    const mappedTask: Task = {
        id: taskRow.id,
        title: taskRow.title || 'Untitled Task',
        project: (taskData as any).project || taskRow.projects?.name || taskRow.projects?.title || (taskData as any).department || 'General',
        projectCode: (taskData as any).projectCode || taskRow.projects?.project_code || taskRow.projects?.code || (taskData as any).departmentCode || 'GEN',
        wbs: (taskData.wbsCode && taskData.wbsCode.trim()) ? taskData.wbsCode.trim() : (taskRow.task_number || undefined),
        status: (taskRow.status || 'todo').toLowerCase() as any,
        priority: (taskRow.priority || 'medium').toLowerCase() as any,
        dueDate: taskRow.deadline_date || '',
        dueTime: taskRow.deadline_time ? (taskRow.deadline_time.includes(':') ? taskRow.deadline_time.split(':').slice(0, 2).join(':') : taskRow.deadline_time) : undefined,
        description: taskData.description || undefined,
        taskType: taskData.taskType || 'generic',
        linkedModule: taskData.linkedModule,
        attachments: taskData.attachments || [],
        submissionAttachments: [],
        assignees: (taskData.assignees || []),
        subtasks: taskData.subtasks || [],
        comments: [],
        history: []
    };

    return mappedTask;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteTaskApi(taskId: string): Promise<boolean> {
    if (!taskId || !uuidRegex.test(taskId)) {
        return true;
    }

    const { error: assError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

    if (assError) {
        console.error('Error deleting task assignees:', assError);
    }

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error deleting task:', error);
        return false;
    }
    return true;
}

export async function updateTaskStatusApi(taskId: string, status: string): Promise<boolean> {
    if (!taskId || !uuidRegex.test(taskId)) {
        return true;
    }

    const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task status:', error);
        return false;
    }
    return true;
}

export async function updateTaskApi(
    taskId: string,
    updates: {
        status?: Task['status'];
        attachments?: TaskAttachment[];
        submissionAttachments?: TaskAttachment[];
        submissionNote?: string;
        subtasks?: Task['subtasks'];
    }
): Promise<boolean> {
    if (!taskId || !uuidRegex.test(taskId)) {
        return true;
    }

    const payload: any = {};
    if (updates.status !== undefined) {
        payload.status = updates.status;
    }
    if (updates.attachments !== undefined) {
        payload.attachment_urls = updates.attachments.map(att => att.path || att.uri).join(',') || null;
    }
    if (updates.submissionAttachments !== undefined) {
        payload.submission_urls = updates.submissionAttachments.map(att => att.path || att.uri).join(',') || null;
    }
    if (updates.submissionNote !== undefined) {
        payload.submission_note = updates.submissionNote;
    }
    if (updates.subtasks !== undefined) {
        payload.subtasks = updates.subtasks.map(sub => ({
            id: sub.id,
            title: sub.title,
            assignee: { name: sub.assignee.name },
            isDone: sub.isDone
        }));
    }

    const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task in Supabase:', error);
        return false;
    }

    // Trigger English task notification on status changes
    if (updates.status !== undefined) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            let actorName = 'Team Member';
            if (currentUserId) {
                const { data: actorProf } = await supabase
                    .from('profiles')
                    .select('full_name, nickname')
                    .eq('id', currentUserId)
                    .maybeSingle();
                if (actorProf) {
                    actorName = actorProf.full_name || actorProf.nickname || 'Team Member';
                }
            }

            const { data: taskInfo } = await supabase
                .from('tasks')
                .select(`
                    id, title, tenant_id, workspace_id, created_by,
                    projects ( project_code ),
                    task_assignees ( user_id )
                `)
                .eq('id', taskId)
                .maybeSingle();

            if (taskInfo) {
                const taskTitle = taskInfo.title || 'Untitled Task';
                const assigneeIds: string[] = (taskInfo.task_assignees || []).map((ta: any) => ta.user_id).filter(Boolean);
                const recipients = Array.from(new Set([
                    ...assigneeIds,
                    taskInfo.created_by,
                    currentUserId
                ].filter(Boolean) as string[]));

                let notifText = '';
                let actionType = '';

                switch (updates.status) {
                    case 'in_progress':
                        notifText = `${actorName} started working on task: "${taskTitle}"`;
                        actionType = 'task_started';
                        break;
                    case 'submitted':
                        notifText = `${actorName} submitted proof of work for task: "${taskTitle}"`;
                        actionType = 'task_submitted';
                        break;
                    case 'revision':
                        notifText = `${actorName} requested revision for task: "${taskTitle}"${updates.submissionNote ? `: "${updates.submissionNote}"` : ''}`;
                        actionType = 'task_revision';
                        break;
                    case 'done':
                        notifText = `Task "${taskTitle}" has been completed and marked as done`;
                        actionType = 'task_completed';
                        break;
                }

                if (notifText) {
                    addLocalNotification({
                        text: notifText,
                        module: 'Task',
                        user: actorName,
                        category: 'projects',
                        tenantId: taskInfo.tenant_id || undefined,
                        workspaceId: taskInfo.workspace_id || undefined,
                        projectCode: taskInfo.projects?.project_code || undefined,
                        ref: taskId,
                        action: actionType,
                        subjectUser: assigneeIds[0] || undefined
                    }, recipients.length > 0 ? recipients : undefined).catch(err => console.warn('Failed to add status notification:', err));
                }
            }
        } catch (statusNotifErr) {
            console.warn('Failed to dispatch task status notification:', statusNotifErr);
        }
    }

    return true;
}

export async function getTaskComments(taskId: string): Promise<any[]> {
    // If not a valid UUID format (e.g. mock data task ID), return empty comments immediately
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!taskId || !uuidRegex.test(taskId)) {
        return [];
    }

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const [commentsRes, profilesData] = await Promise.all([
        supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true }),
        getProfiles()
    ]);

    const { data, error } = commentsRes;
    if (error) {
        console.error('Error fetching task comments:', error);
        return [];
    }

    const profileMap = new Map(profilesData.map(p => [p.id, p]));

    return (data || []).map((c: any) => {
        const profile = profileMap.get(c.user_id);
        const isMe = currentUserId && c.user_id === currentUserId;
        return {
            id: c.id,
            author: profile?.name || 'Staff Member',
            text: c.message,
            timestamp: c.created_at,
            role: isMe ? 'staff' : 'manager',
        };
    });
}

export async function addTaskCommentApi(taskId: string, message: string): Promise<any | null> {
    if (!taskId || !uuidRegex.test(taskId)) {
        return {
            id: `cm-${Date.now()}`,
            author: 'Manu Travo',
            text: message.trim(),
            timestamp: new Date().toISOString(),
            role: 'staff'
        };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('No logged in user found to comment');
        return null;
    }

    const { data, error } = await supabase
        .from('task_comments')
        .insert({
            task_id: taskId,
            user_id: user.id,
            message: message.trim()
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('Error adding task comment:', error);
        return null;
    }

    const profilesData = await getProfiles();
    const profile = profilesData.find(p => p.id === data.user_id);
    const commenterName = profile?.name || 'Staff Member';

    // Dispatch comment notification in English
    try {
        const { data: taskInfo } = await supabase
            .from('tasks')
            .select(`
                id, title, tenant_id, workspace_id, created_by,
                projects ( project_code ),
                task_assignees ( user_id )
            `)
            .eq('id', taskId)
            .maybeSingle();

        if (taskInfo) {
            const taskTitle = taskInfo.title || 'Untitled Task';
            const assigneeIds: string[] = (taskInfo.task_assignees || []).map((ta: any) => ta.user_id).filter(Boolean);
            const recipients = Array.from(new Set([
                ...assigneeIds,
                taskInfo.created_by,
                user.id
            ].filter(Boolean) as string[]));

            const cleanMsg = message.trim();
            const shortComment = cleanMsg.length > 60 ? cleanMsg.substring(0, 60) + '...' : cleanMsg;

            addLocalNotification({
                text: `${commenterName} commented on task "${taskTitle}": "${shortComment}"`,
                module: 'Task',
                user: commenterName,
                category: 'projects',
                tenantId: taskInfo.tenant_id || undefined,
                workspaceId: taskInfo.workspace_id || undefined,
                projectCode: taskInfo.projects?.project_code || undefined,
                ref: taskId,
                action: 'task_comment',
            }, recipients.length > 0 ? recipients : undefined).catch(err => console.warn('Failed to add comment notification:', err));
        }
    } catch (commentNotifErr) {
        console.warn('Failed to dispatch comment notification:', commentNotifErr);
    }

    return {
        id: data.id,
        author: commenterName,
        text: data.message,
        timestamp: data.created_at,
        role: 'staff'
    };
}


// ----------------------------------------------------
// Action API Methods
// ----------------------------------------------------
export async function getActions(workspaceId?: string): Promise<Action[]> {
    let actionsQuery = supabase
        .from('actions')
        .select(`
            *,
            projects ( * ),
            project_wbs_items!wbs_id ( id, wbs_code ),
            action_reviewers ( user_id )
        `)
        .order('created_at', { ascending: false });

    if (workspaceId && APP_MODE !== 'adidaya') {
        const { data: projRows } = await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);
        const pids = (projRows || []).map(p => p.id);
        if (pids.length > 0) {
            actionsQuery = actionsQuery.or(`workspace_id.eq.${workspaceId},project_id.in.(${pids.join(',')})`);
        } else {
            actionsQuery = actionsQuery.eq('workspace_id', workspaceId);
        }
    }

    const [actionsRes, profilesData, tasksRes] = await Promise.all([
        actionsQuery,
        getProfiles(workspaceId),
        supabase
            .from('tasks')
            .select(`
                id,
                title,
                status,
                priority,
                task_assignees ( user_id )
            `)
    ]);

    const { data, error } = actionsRes;
    if (error || !data || data.length === 0) {
        if (error) console.error('Error fetching actions from Supabase:', error);
        return [];
    }

    const profileMap = new Map(profilesData.map(p => [p.id, p]));
    const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t]));

    return (data || []).map((act: any) => {
        // Parse metadata inside description
        const descText = act.description || '';
        const match = descText.match(/<!--METADATA:({.*?})-->/);
        let cleanDescription = descText.replace(/<!--METADATA:({.*?})-->/, '').trim();
        
        let module: Action['module'] = 'other';
        let actionType: Action['actionType'] = 'review';
        let attachments: TaskAttachment[] = [];

        if (match && match[1]) {
            try {
                const meta = JSON.parse(match[1]);
                module = meta.module || 'other';
                actionType = meta.actionType || 'review';
                if (meta.attachment_urls) {
                    attachments = meta.attachment_urls.split(',').filter(Boolean).map((url: string, index: number) => {
                        const name = url.split('/').pop() || `Attachment ${index + 1}`;
                        return {
                            id: `att-act-${act.id}-${index}`,
                            uri: url,
                            name,
                            type: (url.match(/\.(jpeg|jpg|gif|png)/i) ? 'image' : 'file') as any
                        };
                    });
                }
            } catch (e) {
                console.error('Error parsing action metadata:', e);
            }
        }

        // Find related task assignee name
        let taskAssigneeName = '';
        if (act.source_task_id) {
            const task = taskMap.get(act.source_task_id);
            if (task && task.task_assignees && task.task_assignees.length > 0) {
                const firstAssignee = task.task_assignees[0];
                const profile = profileMap.get(firstAssignee.user_id);
                if (profile) {
                    taskAssigneeName = profile.name;
                }
            }
        }

        // Mapped submitter (requested_by profile or fallback to task assignee or fallback to 'Staff member')
        const requesterProfile = profileMap.get(act.requested_by);
        const submitterName = requesterProfile?.name || taskAssigneeName || 'Staff member';

        // Connect status and priority casing
        const statusMap: Record<string, Action['status']> = {
            'PENDING': 'pending',
            'APPROVED': 'completed',
            'DONE': 'completed',
            'COMPLETED': 'completed',
            'REVISION': 'revision',
            'REJECTED': 'rejected',
            'URGENT': 'urgent',
            'IN_REVIEW': 'in_review'
        };

        const resolvedStatus = statusMap[act.status] || (act.status || 'pending').toLowerCase() as any;
        const resolvedPriority = (act.priority || 'medium').toLowerCase() as Action['priority'];

        return {
            id: act.id,
            title: act.title || 'Untitled Action',
            project: act.projects?.name || act.projects?.title || act.projects?.project_name || 'General',
            projectCode: act.projects?.project_code || act.projects?.code || 'PRJ',
            wbs: (act.project_wbs_items?.wbs_code && act.project_wbs_items.wbs_code.trim()) ? act.project_wbs_items.wbs_code.trim() : undefined,
            module,
            date: act.deadline_date || '',
            type: actionType as any,
            status: resolvedStatus,
            priority: resolvedPriority,
            relatedTaskId: act.source_task_id || undefined,
            actionType,
            description: cleanDescription || undefined,
            submitter: submitterName,
            attachments, // custom attachments resolved via metadata
            comments: [],
            history: []
        };
    });
}

export function isWbsSupported(tenant?: { category?: string | null; industry?: string | null; name?: string | null } | null): boolean {
    // Disabled / hidden by default across Forma
    return false;
}

export async function createActionApi(
    actionData: Omit<Action, 'id' | 'project' | 'projectCode' | 'submitter'> & { 
        projectId: string; 
        wbsId?: string; 
        wbsCode?: string; 
        requestedBy?: string;
        workspaceId?: string;
        tenantId?: string;
    },
    reviewerIds: string[]
): Promise<Action | null> {
    
    // Save metadata in description field: module, actionType, attachmentUrls
    const attUrlsStr = actionData.attachments
        ? actionData.attachments.map(att => att.uri).join(',')
        : '';

    const metaBlock = {
        module: actionData.module || 'other',
        actionType: actionData.actionType || 'review',
        attachment_urls: attUrlsStr || undefined
    };

    const descriptionField = `${actionData.description || ''}\n<!--METADATA:${JSON.stringify(metaBlock)}-->`;

    let resolvedWbsId = actionData.wbsId || null;

    if (actionData.wbsCode) {
        const wbsCode = actionData.wbsCode;
        // Check if WBS item already exists in database for this project
        const { data: wbsItems } = await supabase
            .from('project_wbs_items')
            .select('id')
            .eq('project_id', actionData.projectId)
            .eq('wbs_code', wbsCode);

        if (wbsItems && wbsItems.length > 0) {
            resolvedWbsId = wbsItems[0].id;
        } else {
            // Find template details to populate title
            const disciplineCode = wbsCode.split('.')[0];
            const discipline = WBS_TEMPLATES.find(d => d.code === disciplineCode);
            const section = discipline?.sections.find(s => s.code === wbsCode);
            const wbsTitle = section?.name || 'WBS Item';

            // Insert dynamic WBS item
            const isForma = APP_MODE === 'forma';
            const wbsInsertPayload: any = isForma ? {
                project_id: actionData.projectId,
                wbs_code: wbsCode,
                name: wbsTitle
            } : {
                project_id: actionData.projectId,
                wbs_code: wbsCode,
                title: wbsTitle,
                level: 3,
                is_leaf: true,
                position: 0
            };

            const { data: newWbs, error: newWbsErr } = await supabase
                .from('project_wbs_items')
                .insert(wbsInsertPayload)
                .select()
                .single();

            if (newWbs) {
                resolvedWbsId = newWbs.id;
            } else {
                console.warn('WBS auto-creation returned null, proceeding without WBS link', newWbsErr);
            }
        }
    }

    // 1. Insert Action
    const { data: actRow, error: actError } = await supabase
        .from('actions')
        .insert({
            title: actionData.title,
            description: descriptionField,
            project_id: actionData.projectId,
            workspace_id: actionData.workspaceId || null,
            wbs_id: resolvedWbsId,
            source_task_id: actionData.relatedTaskId || null,
            deadline_date: actionData.date,
            status: (actionData.status || 'pending').toUpperCase(),
            priority: (actionData.priority || 'medium').toUpperCase(),
            requested_by: actionData.requestedBy || null
        })
        .select(`
            *,
            projects ( id, project_code, project_name )
        `)
        .single();

    if (actError || !actRow) {
        console.error('Error creating action:', actError);
        return null;
    }

    // 2. Insert Reviewers
    if (reviewerIds && reviewerIds.length > 0) {
        const reviewerRows = reviewerIds.map(uid => ({
            action_id: actRow.id,
            user_id: uid
        }));
        const { error: revError } = await supabase.from('action_reviewers').insert(reviewerRows);
        if (revError) {
            console.error('Error inserting action reviewers:', revError);
        }
    }

    // 3. Trigger Notification to Reviewers
    try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id;
        
        let creatorName = 'Team';
        if (currentUserId) {
            const { data: creatorProf } = await supabase
                .from('profiles')
                .select('full_name, nickname')
                .eq('id', currentUserId)
                .maybeSingle();
            if (creatorProf) {
                creatorName = creatorProf.full_name || creatorProf.nickname || 'Team Member';
            }
        }

        const actionTitle = actionData.title || 'Untitled Action';
        const deadlineInfo = actionData.date ? ` (Deadline: ${actionData.date})` : '';

        const recipients = reviewerIds && reviewerIds.length > 0
            ? reviewerIds
            : undefined;

        addLocalNotification({
            text: `Aksi baru memerlukan peninjauan: "${actionTitle}"${deadlineInfo}`,
            module: 'Action',
            user: creatorName,
            category: 'projects',
            tenantId: actionData.tenantId || undefined,
            workspaceId: actionData.workspaceId || undefined,
            projectCode: actRow.projects?.project_code || undefined,
            ref: actRow.id,
            action: 'action_requested',
            subjectUser: recipients?.[0]
        }, recipients).catch(err => console.warn('Failed to add action notification:', err));
    } catch (notifErr) {
        console.warn('Failed to dispatch action creation notification:', notifErr);
    }

    // Refresh and map
    const actions = await getActions();
    return actions.find(a => a.id === actRow.id) || null;
}

export async function deleteActionApi(actionId: string): Promise<boolean> {
    if (!actionId || !uuidRegex.test(actionId)) {
        return true;
    }

    const { error: revError } = await supabase
        .from('action_reviewers')
        .delete()
        .eq('action_id', actionId);

    if (revError) {
        console.error('Error deleting action reviewers:', revError);
    }

    const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', actionId);

    if (error) {
        console.error('Error deleting action:', error);
        return false;
    }
    return true;
}

export async function updateActionStatusApi(actionId: string, status: string): Promise<boolean> {
    if (!actionId || !uuidRegex.test(actionId)) {
        return true;
    }

    const { error } = await supabase
        .from('actions')
        .update({ status: status.toUpperCase() })
        .eq('id', actionId);

    if (error) {
        console.error('Error updating action status:', error);
        return false;
    }
    return true;
}
