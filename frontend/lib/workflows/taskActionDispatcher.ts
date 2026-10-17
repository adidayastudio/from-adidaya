import { Task, Action } from '@/constants/MockData';
import { createTaskApi, createActionApi } from '@/lib/api/tasks';

// ----------------------------------------------------
// 1. FINANCE WORKFLOW DISPATCHER (Work -> Task, Decision -> Action)
// ----------------------------------------------------
export interface FinanceWorkflowEvent {
    type:
        | 'REQUEST_SUBMITTED'             // Action: Approve {docNo}
        | 'REQUEST_REVISION_REQUIRED'     // Task: Revise {docNo}
        | 'REQUEST_APPROVED_NEED_PO'      // Task: Create PO from {docNo} (Consolidation OFF)
        | 'REQUEST_ELIGIBLE_CONSOLIDATE'  // Task: Prepare Consolidation (Consolidation ON)
        | 'CONSOLIDATION_SUBMITTED'       // Action: Approve {docNo}
        | 'CONSOLIDATION_REVISION'        // Task: Revise {docNo}
        | 'PAYMENT_PREPARATION_REQUIRED'  // Task: Prepare Payment {docNo}
        | 'PAYMENT_SUBMITTED'             // Action: Approve {docNo}
        | 'PAYMENT_REVISION_REQUIRED';    // Task: Revise {docNo}
    documentNo: string; // e.g. PR-26090042, PO-26090018, CN-26090012, PY-26090008, RF-26090021
    documentType?: 'pr' | 'po' | 'consolidation' | 'payment' | 'reimbursement' | 'reimbursement_payment';
    projectId: string;
    projectCode?: string;
    projectName?: string;
    amount?: number;
    currency?: string;
    requestedBy?: string;
    currentApproverId?: string;
    assignedUserId?: string;
    note?: string;
    dueDate?: string;
}

/**
 * Dispatches an Action for Finance decisions (Approve / Revise / Reject).
 * Only generated when a record has an active Approval Chain and user is the current active approver.
 */
export async function dispatchFinanceApprovalAction(event: FinanceWorkflowEvent): Promise<Action | null> {
    if (!event.currentApproverId) return null;

    let title = `Approve ${event.documentNo}`;
    let actionType: Action['actionType'] = 'approval';
    let priority: Action['priority'] = 'high';

    return createActionApi({
        title,
        module: 'finance',
        type: 'finance',
        actionType,
        status: 'pending',
        priority,
        projectId: event.projectId,
        requestedBy: event.requestedBy,
        date: new Date().toISOString().split('T')[0],
        description: event.note || `Finance approval decision for ${event.documentNo}`,
        details: {
            amount: event.amount,
            currency: event.currency || 'IDR',
        }
    }, [event.currentApproverId]);
}

/**
 * Dispatches a Task for operational work in Finance.
 * Examples: Revise PR, Create PO from PR, Prepare Consolidation, Prepare Payment.
 */
export async function dispatchFinanceTask(event: FinanceWorkflowEvent): Promise<Task | null> {
    if (!event.assignedUserId) return null;

    let title = '';
    let priority: Task['priority'] = 'medium';
    let actionLabel = 'Open in Finance';
    let route = '/(tabs)/home/finance';

    switch (event.type) {
        case 'REQUEST_REVISION_REQUIRED':
            title = `Revise ${event.documentNo}`;
            priority = 'urgent';
            actionLabel = `Revise ${event.documentNo}`;
            break;
        case 'REQUEST_APPROVED_NEED_PO':
            title = `Create PO from ${event.documentNo}`;
            priority = 'high';
            actionLabel = 'Create Purchase Order';
            break;
        case 'REQUEST_ELIGIBLE_CONSOLIDATE':
            title = 'Prepare Consolidation';
            priority = 'medium';
            actionLabel = 'Open Consolidation';
            break;
        case 'CONSOLIDATION_REVISION':
            title = `Revise ${event.documentNo}`;
            priority = 'urgent';
            actionLabel = `Revise ${event.documentNo}`;
            break;
        case 'PAYMENT_PREPARATION_REQUIRED':
            title = `Prepare Payment ${event.documentNo}`;
            priority = 'high';
            actionLabel = 'Prepare Payment';
            break;
        case 'PAYMENT_REVISION_REQUIRED':
            title = `Revise ${event.documentNo}`;
            priority = 'urgent';
            actionLabel = `Revise ${event.documentNo}`;
            break;
        default:
            title = `Process ${event.documentNo}`;
            break;
    }

    const today = new Date().toISOString().split('T')[0];

    return createTaskApi({
        title,
        projectId: event.projectId,
        dueDate: event.dueDate || today,
        status: 'todo',
        priority,
        taskType: 'linked_module',
        isSystemGenerated: true,
        sourceInfo: {
            module: 'finance',
            feature: event.documentType || 'purchasing',
            recordType: event.documentType || 'purchase_request',
            recordNumber: event.documentNo,
            route: route,
            actionType: 'revision',
        },
        revisionRequest: event.note ? {
            requestedBy: event.requestedBy || 'Finance Approver',
            requestedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: event.note,
        } : undefined,
        moduleDetails: {
            documentNumber: event.documentNo,
            documentType: event.documentType === 'reimbursement' ? 'Reimbursement' : 'Purchase Request',
            requestedAmount: event.amount,
            currency: event.currency || 'IDR',
            itemsSummary: `Finance record for ${event.documentNo}`
        },
        linkedModule: {
            target: 'finance',
            actionLabel,
            route,
        },
        description: event.note || `Finance operational task for ${event.documentNo}`,
        assignees: []
    }, [event.assignedUserId]);
}

/**
 * Automatically synchronizes and marks linked Finance revision Tasks as 'done' when a document is resubmitted in Finance.
 */
export async function syncFinanceTaskOnResubmit(documentNo: string): Promise<boolean> {
    const { getTasks, updateTaskApi } = await import('@/lib/api/tasks');
    const tasks = await getTasks();
    const cleanDoc = documentNo.replace(/^PR-|^RF-|^PY-|^CN-/i, '');
    const matchedTask = tasks.find(t => 
        (t.title.includes(documentNo) || t.title.includes(cleanDoc) || t.sourceInfo?.recordNumber === documentNo) &&
        (t.status === 'todo' || t.status === 'in_progress' || t.status === 'revision')
    );

    if (matchedTask) {
        return updateTaskApi(matchedTask.id, {
            status: 'done',
            history: [
                {
                    id: `h-${Date.now()}`,
                    action: 'Resubmitted in Finance (Auto-completed)',
                    timestamp: new Date().toISOString(),
                    user: 'Finance System Sync'
                },
                ...(matchedTask.history || [])
            ]
        });
    }
    return false;
}

/**
 * Automatically synchronizes and completes linked Finance Actions when an approver acts directly from Finance.
 */
export async function syncFinanceActionOnDecision(
    documentNo: string,
    decision: 'approved' | 'revision' | 'rejected',
    note?: string
): Promise<boolean> {
    const { getActions, updateActionStatusApi } = await import('@/lib/api/tasks');
    const actions = await getActions();
    const cleanDoc = documentNo.replace(/^PR-|^RF-|^PY-|^CN-/i, '');
    const matchedAction = actions.find(a => 
        (a.title.includes(documentNo) || a.title.includes(cleanDoc) || a.sourceInfo?.recordNumber === documentNo) &&
        (a.status === 'pending' || a.status === 'urgent')
    );

    if (matchedAction) {
        const nextStatus = decision === 'approved' ? 'completed' : (decision === 'revision' ? 'revision' : 'rejected');
        await updateActionStatusApi(matchedAction.id, nextStatus);

        // If revision, automatically create a new Task for the requester
        if (decision === 'revision') {
            await dispatchFinanceTask({
                type: 'REQUEST_REVISION_REQUIRED',
                documentNo,
                projectId: matchedAction.projectCode || 'PRG',
                assignedUserId: matchedAction.requestedBy || '1',
                note: note || 'Please review document and resubmit.',
            });
        }
        return true;
    }
    return false;
}

// ----------------------------------------------------
// 2. RESOURCES WORKFLOW DISPATCHER (Tasks + Actions)
// ----------------------------------------------------
export interface ResourceTaskEvent {
    poNumber: string;
    vendorName: string;
    itemCount: number;
    projectId: string;
    assigneeIds: string[];
    dueDate?: string;
    wbsCode?: string;
}

export async function dispatchResourceReceivingTask(event: ResourceTaskEvent): Promise<Task | null> {
    const today = new Date().toISOString().split('T')[0];
    const cleanPo = event.poNumber.replace(/^PO-/i, '');
    return createTaskApi({
        title: `Receive PO-${cleanPo}`,
        projectId: event.projectId,
        wbsCode: event.wbsCode,
        dueDate: event.dueDate || today,
        status: 'todo',
        priority: 'high',
        taskType: 'linked_module',
        linkedModule: {
            target: 'resources',
            actionLabel: 'Open Goods Receiving',
            route: '/home/resources'
        },
        description: `Vendor: ${event.vendorName} · ${event.itemCount} items scheduled for receiving inspection.`,
        subtasks: [],
        checklistItems: [
            { id: '1', title: 'Verify packing list matches PO items', isChecked: false },
            { id: '2', title: 'Check material physical condition & quality', isChecked: false },
            { id: '3', title: 'Photograph delivery note & goods', isChecked: false },
        ],
        assignees: []
    }, event.assigneeIds);
}

export async function dispatchResourceVerificationAction(
    rcNumber: string,
    projectId: string,
    reviewerIds: string[],
    wbsCode?: string
): Promise<Action | null> {
    const cleanRc = rcNumber.replace(/^RC-/i, '');
    return createActionApi({
        title: `Verify Receiving RC-${cleanRc}`,
        module: 'resources',
        type: 'review',
        actionType: 'review',
        status: 'pending',
        priority: 'medium',
        projectId,
        wbsCode,
        date: new Date().toISOString().split('T')[0],
        description: `Verify received goods count and delivery inspection report for RC-${cleanRc}.`
    }, reviewerIds);
}

// ----------------------------------------------------
// 3. PEOPLE WORKFLOW DISPATCHER (Tasks + Actions)
// ----------------------------------------------------
export * from './peopleWorkflow';

export interface PeopleAssignmentEvent {
    type: 'ONBOARDING' | 'MANDATORY_TRAINING' | 'UPLOAD_DOCUMENTS' | 'POLICY_ACKNOWLEDGE' | 'PROFILE_COMPLETION' | 'LIFECYCLE_REVIEW';
    userId: string;
    title: string;
    projectId: string;
    dueDate?: string;
}

export async function dispatchPeopleTask(event: PeopleAssignmentEvent): Promise<Task | null> {
    const { syncProfileCompletionTask, syncRequiredDocumentsTask, dispatchReviewProfileTask } = await import('./peopleWorkflow');
    
    if (event.type === 'PROFILE_COMPLETION' || event.title.includes('Complete Your Profile')) {
        return syncProfileCompletionTask(event.userId, event.projectId);
    }
    if (event.type === 'UPLOAD_DOCUMENTS' || event.title.includes('Submit Required Documents')) {
        return syncRequiredDocumentsTask(event.userId, event.projectId);
    }
    if (event.type === 'LIFECYCLE_REVIEW' || event.title.includes('Review Your Profile')) {
        return dispatchReviewProfileTask(event.userId, 'Employment review scheduled', event.projectId);
    }

    const today = new Date();
    today.setDate(today.getDate() + 3);
    const defaultDue = today.toISOString().split('T')[0];

    return createTaskApi({
        title: event.title,
        projectId: event.projectId,
        dueDate: event.dueDate || defaultDue,
        status: 'todo',
        priority: 'medium',
        taskType: 'linked_module',
        linkedModule: {
            target: 'people',
            actionLabel: 'Open in People',
            route: `/member-profile/${event.userId}`
        },
        description: `Employee requirement: ${event.title}`,
        assignees: []
    }, [event.userId]);
}

export async function dispatchPeopleReviewAction(
    title: string,
    projectId: string,
    reviewerIds: string[],
    description?: string
): Promise<Action | null> {
    return createActionApi({
        title,
        module: 'people',
        type: 'review',
        actionType: 'confirmation',
        status: 'pending',
        priority: 'medium',
        projectId,
        date: new Date().toISOString().split('T')[0],
        description: description || 'Review employee submission/request'
    }, reviewerIds);
}

// ----------------------------------------------------
// 4. CLOCK WORKFLOW DISPATCHER (Actions-Heavy)
// ----------------------------------------------------
export async function dispatchClockMissingResolutionAction(
    userId: string,
    projectId: string,
    dateStr: string
): Promise<Action | null> {
    return createActionApi({
        title: 'Resolve Missing Clock-Out',
        module: 'clock',
        type: 'admin',
        actionType: 'confirmation',
        status: 'urgent',
        priority: 'urgent',
        projectId,
        requestedBy: userId,
        date: dateStr,
        description: `Missing clock-out detected for ${dateStr}. Please complete your attendance record.`
    }, [userId]);
}

export async function dispatchClockRequestAction(
    requestType: 'leave' | 'overtime' | 'correction',
    employeeName: string,
    projectId: string,
    reviewerIds: string[],
    details?: Action['details']
): Promise<Action | null> {
    const titleMap = {
        leave: `Approve Leave Request: ${employeeName}`,
        overtime: `Approve Overtime Request: ${employeeName}`,
        correction: `Review Attendance Correction: ${employeeName}`
    };

    return createActionApi({
        title: titleMap[requestType] || `Review Attendance Request: ${employeeName}`,
        module: 'clock',
        type: 'approval',
        actionType: 'approval',
        status: 'pending',
        priority: 'high',
        projectId,
        date: new Date().toISOString().split('T')[0],
        description: `Attendance workflow pending review for ${employeeName}`,
        details
    }, reviewerIds);
}

// ----------------------------------------------------
// 5. REPORT WORKFLOW DISPATCHER (Tasks + Actions-Heavy)
// ----------------------------------------------------
export interface ReportScheduleEvent {
    reportType: 'Daily Construction Report' | 'Weekly Site Report' | 'Monthly Progress Report' | 'Daily Report' | 'Weekly Report';
    projectId: string;
    assigneeIds: string[];
    wbsCode?: string;
    dueDate?: string;
}

export async function dispatchReportScheduledTask(event: ReportScheduleEvent): Promise<Task | null> {
    const today = new Date().toISOString().split('T')[0];
    return createTaskApi({
        title: `Submit ${event.reportType}`,
        projectId: event.projectId,
        wbsCode: event.wbsCode,
        dueDate: event.dueDate || today,
        status: 'todo',
        priority: 'high',
        taskType: 'linked_module',
        linkedModule: {
            target: 'report',
            actionLabel: 'Open Report Form',
            route: '/home/reports'
        },
        description: `Scheduled periodic report submission for project tracking.`,
        assignees: []
    }, event.assigneeIds);
}

export async function dispatchReportReviewAction(
    reportTitle: string,
    projectId: string,
    reviewerIds: string[],
    isRevision: boolean = false
): Promise<Action | null> {
    const cleanTitle = reportTitle.replace(/^Submit\s+/i, '');
    const title = isRevision
        ? `Revise ${cleanTitle}`
        : `Review ${cleanTitle}`;

    return createActionApi({
        title,
        module: 'report',
        type: isRevision ? 'revision' : 'review',
        actionType: isRevision ? 'revision' : 'review',
        status: isRevision ? 'revision' : 'pending',
        priority: isRevision ? 'urgent' : 'high',
        projectId,
        date: new Date().toISOString().split('T')[0],
        description: isRevision
            ? `Report was returned with comments and requires revision.`
            : `Submitted report ready for manager review.`
    }, reviewerIds);
}

// ----------------------------------------------------
// 6. CREW WORKFLOW DISPATCHER (Assignment Target)
// ----------------------------------------------------
export async function assignTaskToCrew(
    taskId: string,
    crewMemberUserIds: string[]
): Promise<boolean> {
    const { supabase } = await import('../supabase');
    const rows = crewMemberUserIds.map(uid => ({
        task_id: taskId,
        user_id: uid
    }));
    const { error } = await supabase.from('task_assignees').insert(rows);
    return !error;
}
