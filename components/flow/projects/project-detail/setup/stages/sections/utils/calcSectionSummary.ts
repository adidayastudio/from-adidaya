import type { TaskStatus } from "../../types";

type WeightedTask = {
  weight?: number;
  status?: TaskStatus;
};

const STATUS_PROGRESS: Record<TaskStatus, number> = {
  not_started: 0,
  draft: 0.4,
  in_review: 0.7,
  revision: 0.5,
  approved: 1,
};

export function calcSectionSummary<T extends WeightedTask>(
  tasks: T[]
) {
  if (!tasks.length) {
    return { totalWeight: 0, progress: 0 };
  }

  const totalWeight = tasks.reduce(
    (sum, t) => sum + (t.weight || 0),
    0
  );

  // Progress calc only if status exists
  const progressValue = tasks.reduce((sum, t) => {
    const statusVal = t.status ? STATUS_PROGRESS[t.status] : 0;
    return sum + (t.weight || 0) * statusVal;
  }, 0);

  return {
    totalWeight: Number(totalWeight.toFixed(2)),
    progress: totalWeight > 0 ? Math.round((progressValue / totalWeight) * 100) : 0,
  };
}
