import { Project } from './projects';
import { Task } from '@/constants/MockData';

export interface ProjectMilestone {
    id: string;
    title: string;
    targetDate?: string;
    status: 'upcoming' | 'in_progress' | 'completed';
    description?: string;
    predecessorId?: string;
}

export type TrackingMethodType = 'manual' | 'tasks' | 'milestones' | 'none';

export interface ProjectProgressState {
    trackingMethod: TrackingMethodType;
    trackingDisplay: string;
    isTrackingEnabled: boolean;
    hasItems: boolean;
    progressPercent: number; // 0..100
    displayPercent: string; // '40%' or '—'
    statusLabel: string; // 'Not Started' | 'In Progress' | 'Complete' | 'No Tasks Yet' | 'No Milestones Yet'
    summaryText: string;
    secondaryText?: string;
    totalEligible: number;
    completedEligible: number;
    remaining: number;
    overdue: number;
}

export function resolveTrackingMethod(rawMethod?: string): { method: TrackingMethodType; display: string; isEnabled: boolean } {
    if (!rawMethod) return { method: 'tasks', display: 'From Tasks', isEnabled: true };
    const lower = rawMethod.trim().toLowerCase();

    if (lower === 'none' || lower === 'disabled' || lower === 'no_progress' || lower === 'no progress') {
        return { method: 'none', display: 'No Progress', isEnabled: false };
    }
    if (lower === 'manual') {
        return { method: 'manual', display: 'Manual', isEnabled: true };
    }
    if (lower === 'milestones' || lower === 'milestone' || lower === 'from_milestones') {
        return { method: 'milestones', display: 'From Milestones', isEnabled: true };
    }
    if (lower === 'tasks' || lower === 'from_tasks' || lower === 'task' || lower === 'wbs' || lower === 'phases') {
        return { method: 'tasks', display: 'From Tasks', isEnabled: true };
    }
    return { method: 'tasks', display: rawMethod, isEnabled: true };
}

export function formatProgressPercent(val: number): string {
    if (isNaN(val)) return '0%';
    const clamped = Math.min(100, Math.max(0, val));
    if (Number.isInteger(clamped)) {
        return `${clamped}%`;
    }
    const rounded = Math.round(clamped * 100) / 100;
    return `${rounded}%`;
}

export function computeProjectProgress(
    project: Project,
    tasks: Task[] = [],
    milestones: ProjectMilestone[] = []
): ProjectProgressState {
    const rawMethod = project.meta?.trackingMethod || project.meta?.progressTracking || (project as any).progressTracking;
    const { method, display, isEnabled } = resolveTrackingMethod(rawMethod);

    if (!isEnabled) {
        return {
            trackingMethod: 'none',
            trackingDisplay: 'No Progress',
            isTrackingEnabled: false,
            hasItems: false,
            progressPercent: 0,
            displayPercent: '—',
            statusLabel: 'No Progress',
            summaryText: 'Progress tracking is disabled for this project.',
            totalEligible: 0,
            completedEligible: 0,
            remaining: 0,
            overdue: 0,
        };
    }

    if (method === 'manual') {
        const rawProg = project.meta?.progress !== undefined ? Number(project.meta.progress) : (Number(project.progress) || 0);
        const prog = Math.min(100, Math.max(0, Math.round(rawProg * 100) / 100));
        const statusLabel = prog === 0 ? 'Not Started' : prog === 100 ? 'Complete' : 'In Progress';
        return {
            trackingMethod: 'manual',
            trackingDisplay: 'Manual',
            isTrackingEnabled: true,
            hasItems: true,
            progressPercent: prog,
            displayPercent: formatProgressPercent(prog),
            statusLabel,
            summaryText: 'Updated manually',
            secondaryText: project.meta?.lastManualProgressUpdate ? `Last updated ${project.meta.lastManualProgressUpdate}` : undefined,
            totalEligible: 1,
            completedEligible: prog === 100 ? 1 : 0,
            remaining: prog === 100 ? 0 : 1,
            overdue: 0,
        };
    }

    if (method === 'tasks') {
        const eligibleTasks = tasks.filter(t => {
            const s = (t.status || '').toLowerCase();
            return s !== 'cancelled' && s !== 'draft';
        });

        const totalEligible = eligibleTasks.length;
        const completedEligible = eligibleTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
        const overdue = eligibleTasks.filter(t => (t.status !== 'done' && t.status !== 'completed') && t.dueDate && new Date(t.dueDate) < new Date()).length;
        const remaining = Math.max(0, totalEligible - completedEligible);

        if (totalEligible === 0) {
            return {
                trackingMethod: 'tasks',
                trackingDisplay: 'From Tasks',
                isTrackingEnabled: true,
                hasItems: false,
                progressPercent: 0,
                displayPercent: '—',
                statusLabel: 'No Tasks Yet',
                summaryText: 'Add project tasks to start tracking progress.',
                totalEligible: 0,
                completedEligible: 0,
                remaining: 0,
                overdue: 0,
            };
        }

        const exactProg = (completedEligible / totalEligible) * 100;
        const prog = Math.min(100, Math.round(exactProg * 100) / 100);
        const statusLabel = prog === 0 ? 'Not Started' : prog === 100 ? 'Complete' : 'In Progress';
        const secParts = [`${remaining} remaining`];
        if (overdue > 0) secParts.push(`${overdue} overdue`);

        return {
            trackingMethod: 'tasks',
            trackingDisplay: 'From Tasks',
            isTrackingEnabled: true,
            hasItems: true,
            progressPercent: prog,
            displayPercent: formatProgressPercent(prog),
            statusLabel,
            summaryText: `${completedEligible} of ${totalEligible} tasks completed`,
            secondaryText: secParts.join(' • '),
            totalEligible,
            completedEligible,
            remaining,
            overdue,
        };
    }

    if (method === 'milestones') {
        const eligibleMilestones = milestones.filter(m => (m.status as string) !== 'cancelled');
        const totalEligible = eligibleMilestones.length;
        const completedEligible = eligibleMilestones.filter(m => m.status === 'completed').length;
        const remaining = Math.max(0, totalEligible - completedEligible);

        if (totalEligible === 0) {
            return {
                trackingMethod: 'milestones',
                trackingDisplay: 'From Milestones',
                isTrackingEnabled: true,
                hasItems: false,
                progressPercent: 0,
                displayPercent: '—',
                statusLabel: 'No Milestones Yet',
                summaryText: 'Add milestones to start tracking project progress.',
                totalEligible: 0,
                completedEligible: 0,
                remaining: 0,
                overdue: 0,
            };
        }

        const exactProg = (completedEligible / totalEligible) * 100;
        const prog = Math.min(100, Math.round(exactProg * 100) / 100);
        const statusLabel = prog === 0 ? 'Not Started' : prog === 100 ? 'Complete' : 'In Progress';

        return {
            trackingMethod: 'milestones',
            trackingDisplay: 'From Milestones',
            isTrackingEnabled: true,
            hasItems: true,
            progressPercent: prog,
            displayPercent: formatProgressPercent(prog),
            statusLabel,
            summaryText: `${completedEligible} of ${totalEligible} milestones completed`,
            secondaryText: `${remaining} remaining`,
            totalEligible,
            completedEligible,
            remaining,
            overdue: 0,
        };
    }

    const fallbackProg = Math.min(100, Math.max(0, Math.round(Number(project.progress || 0) * 100) / 100));
    return {
        trackingMethod: 'manual',
        trackingDisplay: 'Manual',
        isTrackingEnabled: true,
        hasItems: true,
        progressPercent: fallbackProg,
        displayPercent: formatProgressPercent(fallbackProg),
        statusLabel: 'In Progress',
        summaryText: 'Updated manually',
        totalEligible: 1,
        completedEligible: 0,
        remaining: 1,
        overdue: 0,
    };
}
