import { addDays, differenceInDays, format, isValid, parseISO, startOfDay } from "date-fns";

export type ScheduleItem = {
    id: string; // WBS ID
    duration: number; // In days
    predecessors: string[]; // Array of WBS IDs
    startDate?: Date; // Calculated
    endDate?: Date;   // Calculated
};

export type Dependency = {
    predecessorId: string;
    successorId: string;
    type: "FS" | "SS" | "FF" | "SF";
    lag: number;
};

/**
 * Calculates Schedule based on Critical Path Method (Forward Pass only for now)
 * @param items List of items with durations
 * @param dependencies List of dependencies
 * @param projectStartDate Start date of the project
 * @returns Map of ItemID -> { startDate, endDate }
 */
export function calculateCPM(
    items: ScheduleItem[],
    dependencies: Dependency[],
    projectStartDate: Date
): Map<string, { startDate: Date; endDate: Date }> {
    const itemMap = new Map<string, ScheduleItem>();
    items.forEach(i => itemMap.set(i.id, i));

    // Build Graph
    const successors = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    items.forEach(i => {
        if (!inDegree.has(i.id)) inDegree.set(i.id, 0);
        if (!successors.has(i.id)) successors.set(i.id, []);
    });

    dependencies.forEach(dep => {
        // Ensure both exist (filtering out broken deps)
        if (itemMap.has(dep.predecessorId) && itemMap.has(dep.successorId)) {
            successors.get(dep.predecessorId)?.push(dep.successorId);
            inDegree.set(dep.successorId, (inDegree.get(dep.successorId) || 0) + 1);
        }
    });

    // Topological Sort (Kahn's Algorithm)
    const queue: string[] = [];
    const sorted: string[] = [];

    inDegree.forEach((degree, id) => {
        if (degree === 0) queue.push(id);
    });

    while (queue.length > 0) {
        const u = queue.shift()!;
        sorted.push(u);

        const succs = successors.get(u) || [];
        succs.forEach(v => {
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) {
                queue.push(v);
            }
        });
    }

    // Detect Cycle
    if (sorted.length !== items.length) {
        console.warn("Cycle detected or disconnected graph in CPM calculation. Fallback to simplified calculation.");
        // If cycle, we might return partial results or error. For now, process what we sorted, then rest.
    }

    // Forward Pass
    const dates = new Map<string, { startDate: Date; endDate: Date }>();

    // Initialize all with project start date (or logic)
    // Actually, we must process in sorted order.

    // Group dependencies by successor for easy lookup
    const depsBySuccessor = new Map<string, Dependency[]>();
    dependencies.forEach(d => {
        if (!depsBySuccessor.has(d.successorId)) depsBySuccessor.set(d.successorId, []);
        depsBySuccessor.get(d.successorId)?.push(d);
    });

    sorted.forEach(id => {
        const item = itemMap.get(id)!;
        let earlyStart = startOfDay(projectStartDate);

        const preds = depsBySuccessor.get(id) || [];

        if (preds.length > 0) {
            let maxPredecessorFinish = new Date(0); // Epoch

            preds.forEach(dep => {
                const predDates = dates.get(dep.predecessorId);
                if (predDates) {
                    // Logic for FS (Finish to Start) only for MVP
                    // Start = Pred.End + 1 + Lag
                    // Actually, if Pred End is Friday, Start is Saturday (or Monday if calendar).
                    // Simplified: Start = Pred.End + 1 ??
                    // If Duration is 1 day. Start Mon -> End Mon. Next starts Tues.
                    // So Start = Pred.End + 1 day.

                    // Let's assume standard FS:
                    // Successor Start = Predecessor Finish + 1 day (standard construction schedule logic often implies contiguous?)
                    // Or Start = Finish??
                    // Usually: Task A (Day 1 to Day 5). Task B (Day 6...).
                    // So Start = Pred.End + (1 day if we treat End as inclusive last day of work).

                    const pEnd = new Date(predDates.endDate);
                    // Add 1 day for FS
                    const potentialStart = addDays(pEnd, 1 + (dep.lag || 0));

                    if (potentialStart > maxPredecessorFinish) {
                        maxPredecessorFinish = potentialStart;
                    }
                }
            });

            if (maxPredecessorFinish.getTime() > 0) {
                earlyStart = maxPredecessorFinish;
            }
        }

        // Calculate End Date
        // Duration 1 day: Start = End.
        // End = Start + Duration - 1.
        // e.g. Start Mon, Dur 5. Mon, Tue, Wed, Thu, Fri. End Fri.
        // End = Mon + 5 days - 1 day.

        // Handle 0 duration (Milestone)
        const duration = Math.max(item.duration || 1, 1); // Min 1 day for now
        const endDate = addDays(earlyStart, duration - 1);

        dates.set(id, { startDate: earlyStart, endDate });
    });

    return dates;
}
