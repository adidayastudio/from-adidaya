import { supabase } from '@/lib/supabase';
import { Task, Action } from '@/constants/MockData';
import { createTaskApi, createActionApi, getTasks, getActions, updateTaskApi, updateActionStatusApi } from '@/lib/api/tasks';
import { DOCUMENT_CATEGORIES } from '@/components/people/member-profile/types';

export interface ProfileCompletenessResult {
    percentage: number;
    completedFields: number;
    totalFields: number;
    missingFields: string[];
    isComplete: boolean;
    meetsMinimumThreshold: boolean; // >= 75%
}

export interface DocumentCompletenessResult {
    uploadedCount: number;
    requiredCount: number;
    missingCategories: string[];
    isComplete: boolean;
}

/**
 * Evaluates profile completeness directly against People profile fields.
 */
export function calculateProfileCompleteness(profile: any): ProfileCompletenessResult {
    if (!profile) {
        return {
            percentage: 0,
            completedFields: 0,
            totalFields: 10,
            missingFields: ['Full Name', 'Email', 'Phone / WhatsApp', 'NIK (National ID)', 'Current Address', 'Emergency Contact', 'Bank Info', 'Tax ID (NPWP)', 'Job Title / Position', 'Department'],
            isComplete: false,
            meetsMinimumThreshold: false,
        };
    }

    const checks: { label: string; isFilled: boolean }[] = [
        { label: 'Full Name', isFilled: !!(profile.full_name || profile.name)?.trim() },
        { label: 'Email', isFilled: !!profile.email?.trim() },
        { label: 'Phone / WhatsApp', isFilled: !!(profile.phone || profile.whatsapp || profile.social_links?.whatsapp || profile.social_links?.phone_number)?.trim() },
        { label: 'NIK (National ID)', isFilled: !!(profile.id_number || profile.nik)?.trim() },
        { label: 'Current Address', isFilled: !!(profile.address?.current || profile.address?.street || (typeof profile.address === 'string' && profile.address.trim())) },
        { label: 'Emergency Contact', isFilled: !!(profile.emergency_contact?.name || profile.emergency_name)?.trim() && !!(profile.emergency_contact?.phone || profile.emergency_phone)?.trim() },
        { label: 'Bank Info', isFilled: !!(profile.bank_info?.account_number || profile.bank_account_number)?.trim() && !!(profile.bank_info?.bank_name || profile.bank_name)?.trim() },
        { label: 'Tax ID (NPWP)', isFilled: !!(profile.npwp || profile.tax_id)?.trim() },
        { label: 'Position / Role', isFilled: !!(profile.job_title || profile.position || profile.role)?.trim() },
        { label: 'Department', isFilled: !!profile.department?.trim() || !!profile.department_id },
    ];

    const totalFields = checks.length;
    const completedFields = checks.filter(c => c.isFilled).length;
    const percentage = Math.round((completedFields / totalFields) * 100);
    const missingFields = checks.filter(c => !c.isFilled).map(c => c.label);

    return {
        percentage,
        completedFields,
        totalFields,
        missingFields,
        isComplete: percentage === 100,
        meetsMinimumThreshold: percentage >= 75,
    };
}

/**
 * Evaluates document completeness from user_documents.
 */
export function calculateDocumentCompleteness(documents: any[] = []): DocumentCompletenessResult {
    const requiredList = DOCUMENT_CATEGORIES.map(c => c.id);
    const uploadedTypes = new Set(documents.map(d => d.document_type || d.category));
    
    const missingCategories = requiredList.filter(cat => !uploadedTypes.has(cat));
    const requiredCount = requiredList.length;
    const uploadedCount = requiredCount - missingCategories.length;

    return {
        uploadedCount,
        requiredCount,
        missingCategories,
        isComplete: missingCategories.length === 0,
    };
}

/**
 * Dispatches or syncs the persistent "Complete Your Profile" Task.
 * Only ONE active profile-completion Task per employee.
 */
export async function syncProfileCompletionTask(userId: string, projectId: string = 'PRG'): Promise<Task | null> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!profile || profile.account_type === 'system') return null;

        const completeness = calculateProfileCompleteness(profile);
        const existingTasks = await getTasks();

        const activeTask = existingTasks.find(t => 
            t.sourceInfo?.module === 'people' &&
            t.sourceInfo?.recordType === 'profile_completion' &&
            t.assignees?.some(a => a.id === userId) &&
            t.status !== 'done'
        );

        // If 100% complete, auto-complete active task if exists
        if (completeness.isComplete) {
            if (activeTask) {
                await updateTaskApi(activeTask.id, {
                    status: 'done',
                    history: [
                        {
                            id: `h-${Date.now()}`,
                            action: 'Profile reached 100% (Auto-completed)',
                            timestamp: new Date().toISOString(),
                            user: 'People System Sync'
                        },
                        ...(activeTask.history || [])
                    ]
                });
            }
            return null;
        }

        // If task already exists, update its details
        if (activeTask) {
            await updateTaskApi(activeTask.id, {
                description: `${completeness.percentage}% complete · Complete at least 75% of your profile`,
                moduleDetails: {
                    documentNumber: `EMP-${userId.slice(0, 6)}`,
                    documentType: 'Profile Completion',
                    itemsSummary: `${completeness.percentage}% complete (${completeness.completedFields}/${completeness.totalFields} fields completed). Missing: ${completeness.missingFields.join(', ')}`,
                }
            });
            return activeTask;
        }

        // Create new single persistent task
        const today = new Date();
        today.setDate(today.getDate() + 7);
        const dueDate = today.toISOString().split('T')[0];

        return await createTaskApi({
            title: 'Complete Your Profile',
            projectId,
            dueDate,
            status: 'todo',
            priority: completeness.percentage < 75 ? 'high' : 'medium',
            taskType: 'linked_module',
            isSystemGenerated: true,
            sourceInfo: {
                module: 'people',
                feature: 'profile',
                recordType: 'profile_completion',
                recordId: userId,
                recordNumber: `EMP-${userId.slice(0, 6)}`,
                route: `/member-profile/${userId}`,
                actionType: 'revision',
            },
            moduleDetails: {
                documentNumber: `EMP-${userId.slice(0, 6)}`,
                documentType: 'Profile Completion',
                itemsSummary: `${completeness.percentage}% complete · Complete at least 75% of your profile. Missing: ${completeness.missingFields.join(', ')}`,
            },
            linkedModule: {
                target: 'people',
                actionLabel: 'Open in People',
                route: `/member-profile/${userId}`,
            },
            description: `${completeness.percentage}% complete · Complete at least 75% of your profile`,
            assignees: [{ id: userId, name: profile.full_name || profile.name || 'Team Member' }],
        }, [userId]);
    } catch (e) {
        console.error('Error syncing profile completion task:', e);
        return null;
    }
}

/**
 * Dispatches or syncs the aggregate "Submit Required Documents" Task.
 */
export async function syncRequiredDocumentsTask(userId: string, projectId: string = 'PRG'): Promise<Task | null> {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!profile || profile.account_type === 'system') return null;

        const { data: docs } = await supabase.from('user_documents').select('*').eq('user_id', userId);
        const completeness = calculateDocumentCompleteness(docs || []);
        const existingTasks = await getTasks();

        const activeTask = existingTasks.find(t =>
            t.sourceInfo?.module === 'people' &&
            t.sourceInfo?.recordType === 'required_documents' &&
            t.assignees?.some(a => a.id === userId) &&
            t.status !== 'done'
        );

        if (completeness.isComplete) {
            if (activeTask) {
                await updateTaskApi(activeTask.id, {
                    status: 'done',
                    history: [
                        {
                            id: `h-${Date.now()}`,
                            action: 'All required documents submitted (Auto-completed)',
                            timestamp: new Date().toISOString(),
                            user: 'People System Sync'
                        },
                        ...(activeTask.history || [])
                    ]
                });
            }
            return null;
        }

        const summaryText = `${completeness.uploadedCount} of ${completeness.requiredCount} completed`;

        if (activeTask) {
            await updateTaskApi(activeTask.id, {
                description: summaryText,
                moduleDetails: {
                    documentNumber: `DOC-${userId.slice(0, 6)}`,
                    documentType: 'Required Documents',
                    itemsSummary: `${summaryText}. Missing: ${completeness.missingCategories.join(', ')}`,
                }
            });
            return activeTask;
        }

        const today = new Date();
        today.setDate(today.getDate() + 5);
        const dueDate = today.toISOString().split('T')[0];

        return await createTaskApi({
            title: 'Submit Required Documents',
            projectId,
            dueDate,
            status: 'todo',
            priority: 'high',
            taskType: 'linked_module',
            isSystemGenerated: true,
            sourceInfo: {
                module: 'people',
                feature: 'documents',
                recordType: 'required_documents',
                recordId: userId,
                recordNumber: `DOC-${userId.slice(0, 6)}`,
                route: `/member-profile/${userId}`,
                actionType: 'revision',
            },
            moduleDetails: {
                documentNumber: `DOC-${userId.slice(0, 6)}`,
                documentType: 'Required Documents',
                itemsSummary: `${summaryText}. Missing: ${completeness.missingCategories.join(', ')}`,
            },
            linkedModule: {
                target: 'people',
                actionLabel: 'Open in People',
                route: `/member-profile/${userId}`,
            },
            description: summaryText,
            assignees: [{ id: userId, name: profile.full_name || profile.name || 'Team Member' }],
        }, [userId]);
    } catch (e) {
        console.error('Error syncing required documents task:', e);
        return null;
    }
}

/**
 * Dispatches employee lifecycle task: "Review Your Profile".
 */
export async function dispatchReviewProfileTask(userId: string, reason: string = 'Approaching contract review', projectId: string = 'PRG'): Promise<Task | null> {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!profile) return null;

        const today = new Date();
        today.setDate(today.getDate() + 7);
        const dueDate = today.toISOString().split('T')[0];

        return await createTaskApi({
            title: 'Review Your Profile',
            projectId,
            dueDate,
            status: 'todo',
            priority: 'medium',
            taskType: 'linked_module',
            isSystemGenerated: true,
            sourceInfo: {
                module: 'people',
                feature: 'lifecycle',
                recordType: 'employment_profile_review',
                recordId: userId,
                recordNumber: `LFC-${userId.slice(0, 6)}`,
                route: `/member-profile/${userId}`,
                actionType: 'revision',
            },
            moduleDetails: {
                documentNumber: `LFC-${userId.slice(0, 6)}`,
                documentType: 'Profile Review',
                itemsSummary: `Lifecycle review due: ${reason}. Please verify your contact, address, and emergency details.`,
            },
            linkedModule: {
                target: 'people',
                actionLabel: 'Open in People',
                route: `/member-profile/${userId}`,
            },
            description: `Please review and confirm your personal information ahead of the upcoming employment review (${reason}).`,
            assignees: [{ id: userId, name: profile.full_name || profile.name || 'Team Member' }],
        }, [userId]);
    } catch (e) {
        console.error('Error dispatching review profile task:', e);
        return null;
    }
}

/**
 * Dispatches HR operational task: "Review Employment Status: {Employee Name}".
 */
export async function dispatchReviewEmploymentStatusTask(
    targetEmployeeId: string,
    targetEmployeeName: string,
    hrManagerUserId: string,
    projectId: string = 'PRG'
): Promise<Task | null> {
    try {
        const today = new Date();
        today.setDate(today.getDate() + 5);
        const dueDate = today.toISOString().split('T')[0];

        return await createTaskApi({
            title: `Review Employment Status: ${targetEmployeeName}`,
            projectId,
            dueDate,
            status: 'todo',
            priority: 'high',
            taskType: 'linked_module',
            isSystemGenerated: true,
            sourceInfo: {
                module: 'people',
                feature: 'employment_status',
                recordType: 'employment_status_review',
                recordId: targetEmployeeId,
                recordNumber: `EMP-${targetEmployeeId.slice(0, 6)}`,
                route: `/member-profile/${targetEmployeeId}`,
                actionType: 'revision',
            },
            moduleDetails: {
                documentNumber: `EMP-${targetEmployeeId.slice(0, 6)}`,
                documentType: 'Employment Review',
                itemsSummary: `HR Status Review for ${targetEmployeeName}. Update contract dates, grade level, or position as needed.`,
            },
            linkedModule: {
                target: 'people',
                actionLabel: 'Open in People',
                route: `/member-profile/${targetEmployeeId}`,
            },
            description: `Review and adjust employment status, contract duration, or title changes for ${targetEmployeeName}.`,
            assignees: [{ id: hrManagerUserId, name: 'HR Manager' }],
        }, [hrManagerUserId]);
    } catch (e) {
        console.error('Error dispatching HR employment review task:', e);
        return null;
    }
}

/**
 * Dispatches Action: "Acknowledge Employment Update".
 * Generated ONLY when HR explicitly requests employee acknowledgement after an important change.
 */
export interface EmploymentUpdateDetails {
    position?: string;
    level?: string;
    department?: string;
    division?: string;
    effectiveDate?: string;
    previousPosition?: string;
    previousLevel?: string;
    previousDepartment?: string;
    notes?: string;
}

export async function dispatchAcknowledgeEmploymentUpdateAction(
    employeeUserId: string,
    changes: EmploymentUpdateDetails,
    projectId: string = 'PRG'
): Promise<Action | null> {
    try {
        const today = new Date().toISOString().split('T')[0];
        return await createActionApi({
            title: 'Acknowledge Employment Update',
            module: 'people',
            type: 'admin',
            actionType: 'confirmation',
            status: 'pending',
            priority: 'high',
            projectId,
            date: today,
            description: changes.notes || 'Your employment details have been updated by HR. Please review and acknowledge.',
            sourceInfo: {
                module: 'people',
                feature: 'employment',
                recordType: 'employment_update',
                recordId: employeeUserId,
                recordNumber: `EMP-${employeeUserId.slice(0, 6)}`,
                route: `/member-profile/${employeeUserId}`,
                actionType: 'approval',
            },
            moduleDetails: {
                documentNumber: `EMP-${employeeUserId.slice(0, 6)}`,
                documentType: 'Employment Update',
                targetDate: changes.effectiveDate || today,
                department: changes.department,
                itemsSummary: `Position: ${changes.position || '—'} · Level: ${changes.level || '—'} · Division: ${changes.division || changes.department || '—'}`,
            },
            details: {
                employmentUpdate: {
                    position: changes.position,
                    level: changes.level,
                    department: changes.department,
                    division: changes.division,
                    effectiveDate: changes.effectiveDate || today,
                    previousPosition: changes.previousPosition,
                    previousLevel: changes.previousLevel,
                    previousDepartment: changes.previousDepartment,
                    notes: changes.notes,
                }
            }
        }, [employeeUserId]);
    } catch (e) {
        console.error('Error dispatching employment update action:', e);
        return null;
    }
}

/**
 * Dispatches Action: "Sign {Document Name}".
 */
export interface SignatureRequestParams {
    employeeUserId: string;
    documentId: string;
    documentTitle: string;
    documentType: string;
    fileUrl?: string;
    projectId?: string;
}

export async function dispatchSignDocumentAction(params: SignatureRequestParams): Promise<Action | null> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const cleanTitle = params.documentTitle.replace(/^Sign\s+/i, '');
        const autoTitle = `Sign ${cleanTitle}`;

        return await createActionApi({
            title: autoTitle,
            module: 'people',
            type: 'admin',
            actionType: 'confirmation',
            status: 'pending',
            priority: 'high',
            projectId: params.projectId || 'PRG',
            date: today,
            description: `Signature required for ${params.documentTitle}. Review document and submit signature directly below.`,
            proofUrl: params.fileUrl,
            proofLabel: 'View Document',
            sourceInfo: {
                module: 'people',
                feature: 'documents',
                recordType: 'signature_request',
                recordId: params.documentId,
                recordNumber: `DOC-${params.documentId.slice(0, 6)}`,
                route: `/member-profile/${params.employeeUserId}`,
                actionType: 'approval',
            },
            moduleDetails: {
                documentNumber: `DOC-${params.documentId.slice(0, 6)}`,
                documentType: params.documentType || 'Employee Document',
                targetDate: today,
                itemsSummary: `Electronic signature required for ${params.documentTitle}`,
            },
            details: {
                documentSignature: {
                    documentId: params.documentId,
                    documentTitle: params.documentTitle,
                    documentType: params.documentType,
                    fileUrl: params.fileUrl,
                    signerUserId: params.employeeUserId,
                }
            }
        }, [params.employeeUserId]);
    } catch (e) {
        console.error('Error dispatching sign document action:', e);
        return null;
    }
}

/**
 * Creates manual management reminder tasks in batch.
 * Does not alter the system-automated cadence.
 */
export async function createBatchPeopleReminders(
    employeeIds: string[],
    reminderTitle: string = 'Complete Profile & Document Submission',
    notes?: string,
    projectId: string = 'PRG'
): Promise<number> {
    let createdCount = 0;
    const today = new Date();
    today.setDate(today.getDate() + 3);
    const dueDate = today.toISOString().split('T')[0];

    for (const empId of employeeIds) {
        try {
            const task = await createTaskApi({
                title: reminderTitle,
                projectId,
                dueDate,
                status: 'todo',
                priority: 'high',
                taskType: 'linked_module',
                isSystemGenerated: false,
                sourceInfo: {
                    module: 'people',
                    feature: 'management_reminder',
                    recordType: 'manual_reminder',
                    recordId: empId,
                    recordNumber: `REM-${empId.slice(0, 6)}`,
                    route: `/member-profile/${empId}`,
                },
                moduleDetails: {
                    documentNumber: `REM-${empId.slice(0, 6)}`,
                    documentType: 'HR Reminder',
                    itemsSummary: notes || 'Management requested reminder to update profile and required documents.',
                },
                linkedModule: {
                    target: 'people',
                    actionLabel: 'Open in People',
                    route: `/member-profile/${empId}`,
                },
                description: notes || 'Management has sent a reminder to complete your profile information and document uploads.',
                assignees: [{ id: empId, name: 'Team Member' }],
            }, [empId]);

            if (task) createdCount++;
        } catch (err) {
            console.error(`Failed to create reminder for employee ${empId}:`, err);
        }
    }
    return createdCount;
}

/**
 * Completes Action: Sign Document and syncs status with People user_documents.
 */
export async function completeSignDocumentAction(
    actionId: string,
    documentId: string,
    signerUserId: string,
    signatureName: string
): Promise<boolean> {
    try {
        const signedTimestamp = new Date().toISOString();
        
        // Update user_documents in Supabase
        await supabase
            .from('user_documents')
            .update({
                status: 'Signed',
                signed_by: signerUserId,
                signed_at: signedTimestamp,
                signature_name: signatureName,
                updated_at: signedTimestamp,
            })
            .eq('id', documentId);

        // Update Action status to completed
        await updateActionStatusApi(actionId, 'completed');
        return true;
    } catch (e) {
        console.error('Error completing signature action:', e);
        return false;
    }
}

/**
 * Completes Action: Acknowledge Employment Update.
 */
export async function completeAcknowledgeEmploymentAction(
    actionId: string,
    userId: string
): Promise<boolean> {
    try {
        const acknowledgedAt = new Date().toISOString();

        // Update action status
        await updateActionStatusApi(actionId, 'completed');

        // Append acknowledgement log to profile employment history
        const { data: profile } = await supabase.from('profiles').select('employment_history').eq('id', userId).maybeSingle();
        const currentHist = Array.isArray(profile?.employment_history) ? profile.employment_history : [];
        const ackLog = {
            id: `ack-${Date.now()}`,
            action: 'Employee Acknowledged Employment Update',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: acknowledgedAt,
            note: 'Acknowledged via FORMA Acknowledgement Action',
        };

        await supabase
            .from('profiles')
            .update({
                employment_history: [ackLog, ...currentHist],
                last_acknowledged_at: acknowledgedAt,
            })
            .eq('id', userId);

        return true;
    } catch (e) {
        console.error('Error completing acknowledgement action:', e);
        return false;
    }
}
