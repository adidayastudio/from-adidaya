import { Task } from "../types";

/**
 * WEIGHT REDISTRIBUTION LOGIC
 * 
 * Core Rules:
 * 1. Section weight is FIXED and NEVER changes
 * 2. When tasks are added/removed, task weights are REDISTRIBUTED proportionally
 * 3. All weights stored as INTEGERS (x100 scale)
 *    - e.g., 30 = 0.30%, 1250 = 12.50%
 *    - For display, divide by 100
 * 
 * This allows integer input (step=1) while preserving 0.01% precision
 */

/**
 * Get the fixed section weight from section config
 */
export function getSectionWeight(sections: { code: string; weight: number }[], sectionCode: string): number {
    const section = sections.find(s => s.code === sectionCode);
    return section?.weight || 0;
}

/**
 * Redistribute task weights when tasks are added
 * Keeps section total weight fixed, adjusts task weights proportionally
 * 
 * @param tasks - Current tasks in the section
 * @param sectionWeight - Fixed weight for this section (integer, e.g., 30 for 0.30%)
 * @param newTaskWeight - Weight of newly added task (0 for auto-distribute)
 */
export function redistributeTaskWeights(
    tasks: Task[],
    sectionWeight: number,
    newTaskWeight: number = 0
): Task[] {
    if (tasks.length === 0) return [];

    // Calculate current total weight
    const currentTotal = tasks.reduce((sum, t) => sum + (t.weight || 0), 0);

    // If adding a task with weight 0, give it equal share and scale others down
    if (newTaskWeight === 0) {
        const newTask = tasks.find(t => t.weight === 0);
        const existingTasks = tasks.filter(t => t.weight !== 0);

        if (!newTask) {
            return normalizeWeights(tasks, sectionWeight);
        }

        if (existingTasks.length === 0) {
            return tasks.map(t => ({ ...t, weight: sectionWeight }));
        }

        // Equal share for new task (at least 1)
        const equalShare = Math.max(Math.floor(sectionWeight / tasks.length), 1);
        const remaining = sectionWeight - equalShare;

        // Scale existing tasks proportionally
        const existingTotal = existingTasks.reduce((sum, t) => sum + (t.weight || 0), 0);

        const result = tasks.map(task => {
            if (task.weight === 0) {
                return { ...task, weight: equalShare };
            } else {
                const ratio = (task.weight || 0) / existingTotal;
                const newWeight = Math.round(remaining * ratio);
                return { ...task, weight: Math.max(newWeight, 1) };
            }
        });

        return normalizeWeights(result, sectionWeight);
    }

    return normalizeWeights(tasks, sectionWeight);
}

/**
 * When a task is deleted, redistribute its weight to remaining tasks
 */
export function redistributeAfterDelete(
    tasks: Task[],
    sectionWeight: number,
    deletedTaskWeight: number
): Task[] {
    if (tasks.length === 0) return [];
    return normalizeWeights(tasks, sectionWeight);
}

/**
 * Normalize weights to ensure they sum to exactly the section weight
 * Preserves proportional ratios between tasks
 */
export function normalizeWeights(tasks: Task[], sectionWeight: number): Task[] {
    if (tasks.length === 0) return [];

    const currentTotal = tasks.reduce((sum, t) => sum + (t.weight || 0), 0);

    if (currentTotal === 0) {
        // All weights are 0, distribute equally
        const equalShare = Math.floor(sectionWeight / tasks.length);
        const remainder = sectionWeight - (equalShare * tasks.length);
        return tasks.map((t, i) => ({
            ...t,
            weight: equalShare + (i === 0 ? remainder : 0)
        }));
    }

    // Scale proportionally
    const normalizedTasks = tasks.map(task => {
        const ratio = (task.weight || 0) / currentTotal;
        const newWeight = Math.round(sectionWeight * ratio);
        return { ...task, weight: Math.max(newWeight, 1) };
    });

    // Ensure exact sum by adjusting the largest task
    const finalTotal = normalizedTasks.reduce((sum, t) => sum + (t.weight || 0), 0);
    const diff = sectionWeight - finalTotal;

    if (diff !== 0) {
        const maxIdx = normalizedTasks.reduce((maxI, t, i, arr) =>
            (t.weight || 0) > (arr[maxI].weight || 0) ? i : maxI, 0);
        normalizedTasks[maxIdx] = {
            ...normalizedTasks[maxIdx],
            weight: (normalizedTasks[maxIdx].weight || 0) + diff
        };
    }

    return normalizedTasks;
}

/**
 * Handle manual weight edit with proportional redistribution
 * 
 * @param tasks - All tasks including the edited one
 * @param editedTaskId - ID of the task being edited
 * @param newWeight - New weight for the edited task (integer)
 * @param sectionWeight - Fixed section weight (integer)
 */
export function handleWeightEdit(
    tasks: Task[],
    editedTaskId: string,
    newWeight: number,
    sectionWeight: number
): Task[] {
    // Clamp to section weight max
    const clampedNewWeight = Math.max(0, Math.min(newWeight, sectionWeight));
    const remaining = sectionWeight - clampedNewWeight;

    const otherTasks = tasks.filter(t => t.id !== editedTaskId);
    const otherTotal = otherTasks.reduce((sum, t) => sum + (t.weight || 0), 0);

    if (otherTasks.length === 0) {
        return tasks.map(t => ({ ...t, weight: sectionWeight }));
    }

    // Redistribute remaining to other tasks proportionally
    const result = tasks.map(task => {
        if (task.id === editedTaskId) {
            return { ...task, weight: clampedNewWeight };
        } else if (otherTotal === 0) {
            const equalShare = Math.floor(remaining / otherTasks.length);
            return { ...task, weight: equalShare };
        } else {
            const ratio = (task.weight || 0) / otherTotal;
            const adjusted = Math.round(remaining * ratio);
            return { ...task, weight: Math.max(adjusted, 0) };
        }
    });

    // Final normalization to ensure exact sum
    return normalizeWeights(result, sectionWeight);
}

/**
 * Convert weight to display percentage (divide by 100)
 */
export function weightToPercent(weight: number): number {
    return weight / 100;
}

/**
 * Format weight for display as percentage string
 * e.g., 30 -> "0.30%"
 */
export function formatWeightPercent(weight: number): string {
    return `${(weight / 100).toFixed(2)}%`;
}
