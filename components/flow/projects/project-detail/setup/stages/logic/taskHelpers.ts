import { Task } from "../types";

/**
 * Recalculates weights for a list of tasks.
 * If a task has a manual weight, it is preserved.
 * Remaining weight is distributed equally among non-manual tasks.
 */
export function distributeWeights(tasks: Task[], totalSectionWeight: number = 100): Task[] {
    if (tasks.length === 0) return [];

    const manualTasks = tasks.filter(t => t.weight !== undefined); // Assuming weight property implies manual for now, or we need a flag
    // For this implementation, let's assume ALL tasks are auto-weighted if we want "intuitif dan otomatis".
    // Or we strictly split 100% by count.

    // Simple Auto-Distribution:
    const weightPerTask = Number((totalSectionWeight / tasks.length).toFixed(2));

    // Distribute
    let distributed = tasks.map((t, index) => {
        // Last item gets the remainder to ensure sum is exactly totalSectionWeight
        if (index === tasks.length - 1) {
            const currentSum = weightPerTask * (tasks.length - 1);
            const remainder = Number((totalSectionWeight - currentSum).toFixed(2));
            return { ...t, weight: remainder };
        }
        return { ...t, weight: weightPerTask };
    });

    return distributed;
}

/**
 * Calculates the total progress of a section based on task weights and statuses.
 */
export function calculateSectionProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;

    // Total weight should be ~100 (or sum of weights)
    const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 0), 0);
    if (totalWeight === 0) return 0;

    const weightedProgress = tasks.reduce((acc, task) => {
        let taskProgress = 0;
        switch (task.status) {
            case "approved": taskProgress = 100; break;
            case "revision": taskProgress = 75; break; // Approximations
            case "in_review": taskProgress = 50; break;
            case "draft": taskProgress = 25; break;
            default: taskProgress = 0;
        }
        return acc + (taskProgress * (task.weight || 0));
    }, 0);

    return weightedProgress / totalWeight;
}
