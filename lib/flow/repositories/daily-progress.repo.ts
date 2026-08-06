import { supabase } from "@/lib/supabaseClient";
import { buildWBSTree, ensureMultiBuildingWBS, flattenWBSTree } from "@/lib/flow/mappers/wbs-tree";
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

export type DailyProgressLog = {
  id: string;
  date: string;
  addedQuantity: number;
  totalActualQuantity: number;
  progressPercent: number;
  weather?: string;
  notes?: string;
  actualCost?: number;
  created_at: string;
};

export type TrackingWBSItem = {
  id: string;
  projectId: string;
  wbsCode: string;
  title: string;
  titleEn?: string | null;
  level: number;
  position: number;
  isLeaf: boolean;
  unit?: string | null;
  targetQuantity: number;
  actualQuantity: number;
  progressPercent: number;
  targetCost: number;
  actualCost: number;
  status: "completed" | "in_progress" | "delayed" | "pending";
  delayDays: number;
  lastUpdated?: string | null;
  fieldNotes?: string | null;
  logs: DailyProgressLog[];
};

export type ProjectTrackingSummary = {
  overallProgress: number;
  totalItems: number;
  delayedCount: number;
  inProgressCount: number;
  completedCount: number;
  pendingCount: number;
  totalTargetVolume: number;
  totalActualVolume: number;
  totalBudgetCost: number;
  totalActualCost: number;
  scheduleVarianceDays: number;
};

/**
 * Fetch all WBS items for a project using paginated loop to avoid 1000 max_rows server cap
 */
export async function fetchProjectTrackingData(projectId: string): Promise<TrackingWBSItem[]> {
  // 1. Fetch project info
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  // 2. Fetch raw rows
  let allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("project_wbs_items")
      .select("*")
      .eq("project_id", projectId)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order("wbs_code", { ascending: true });

    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  // 3. SSOT Tree transformation: DB -> buildWBSTree -> ensureMultiBuildingWBS -> flattenWBSTree
  if (!allRows || allRows.length === 0) {
    return [];
  }

  const dbTree = buildWBSTree(allRows);
  const fullTree = ensureMultiBuildingWBS(dbTree, project);
  const flattened = flattenWBSTree(fullTree);

  return (flattened as any[]).map((row: any) => {
    const meta = row.meta || {};
    const targetQty = Number(row.quantity || meta.targetQuantity || 0);
    const actualQty = Number(meta.actualQuantity || 0);
    const code = row.wbs_code || row.code || "";

    let progress = Number(meta.progressPercent || 0);
    if (targetQty > 0 && actualQty > 0) {
      progress = Math.min(100, Number(((actualQty / targetQty) * 100).toFixed(1)));
    }

    let status: "completed" | "in_progress" | "delayed" | "pending" = meta.status || "pending";
    if (progress >= 100) {
      status = "completed";
    } else if (progress > 0 && status !== "delayed") {
      status = "in_progress";
    }

    const delayDays = Number(meta.delayDays || (status === "delayed" ? 3 : 0));
    const logs: DailyProgressLog[] = Array.isArray(meta.progressLogs) ? meta.progressLogs : [];

    return {
      id: row.id,
      projectId: row.project_id || projectId,
      wbsCode: code,
      title: row.title || row.nameEn || row.name || "",
      titleEn: row.title_en || row.nameId || null,
      level: row.level ?? 0,
      position: row.position ?? 0,
      isLeaf: row.is_leaf ?? false,
      unit: row.unit || "m³",
      targetQuantity: targetQty,
      actualQuantity: actualQty,
      progressPercent: progress,
      targetCost: Number(meta.targetCost || 0),
      actualCost: Number(meta.actualCost || 0),
      status,
      delayDays,
      lastUpdated: meta.lastUpdated || row.updated_at,
      fieldNotes: meta.fieldNotes || null,
      logs,
    };
  });
}

/**
 * Save Daily Progress Entry for a specific WBS item
 */
export async function updateDailyWBSProgress(params: {
  wbsId: string;
  addedQuantity: number;
  totalActualQuantity: number;
  targetQuantity?: number;
  date: string;
  weather?: string;
  notes?: string;
  actualCost?: number;
  statusOverride?: "completed" | "in_progress" | "delayed" | "pending";
  delayDaysOverride?: number;
}): Promise<boolean> {
  // 1. Fetch current WBS row meta
  const { data: current, error: fetchErr } = await supabase
    .from("project_wbs_items")
    .select("quantity, meta")
    .eq("id", params.wbsId)
    .single();

  if (fetchErr || !current) {
    console.error("Error fetching WBS row for update:", fetchErr);
    return false;
  }

  const existingMeta = current.meta || {};
  const targetQty = params.targetQuantity || Number(current.quantity || existingMeta.targetQuantity || 0);
  const newActualQty = params.totalActualQuantity;

  let newProgress = targetQty > 0 ? Math.min(100, Number(((newActualQty / targetQty) * 100).toFixed(1))) : 0;
  if (params.statusOverride === "completed") newProgress = 100;

  let newStatus = params.statusOverride || existingMeta.status || "in_progress";
  if (newProgress >= 100) newStatus = "completed";

  const newLog: DailyProgressLog = {
    id: crypto.randomUUID(),
    date: params.date,
    addedQuantity: params.addedQuantity,
    totalActualQuantity: newActualQty,
    progressPercent: newProgress,
    weather: params.weather,
    notes: params.notes,
    actualCost: params.actualCost || 0,
    created_at: new Date().toISOString(),
  };

  const existingLogs = Array.isArray(existingMeta.progressLogs) ? existingMeta.progressLogs : [];
  const updatedLogs = [newLog, ...existingLogs];

  const updatedMeta = {
    ...existingMeta,
    actualQuantity: newActualQty,
    progressPercent: newProgress,
    status: newStatus,
    delayDays: params.delayDaysOverride ?? existingMeta.delayDays ?? 0,
    lastUpdated: params.date,
    fieldNotes: params.notes || existingMeta.fieldNotes,
    actualCost: (Number(existingMeta.actualCost || 0) + Number(params.actualCost || 0)),
    progressLogs: updatedLogs,
  };

  const { error: updateErr } = await supabase
    .from("project_wbs_items")
    .update({
      quantity: targetQty > 0 ? targetQty : current.quantity,
      meta: updatedMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.wbsId);

  if (updateErr) {
    console.error("Error updating WBS progress:", updateErr);
    return false;
  }

  return true;
}

/**
 * Calculate Summary Metric Stats for Dashboard
 */
export function calculateTrackingSummary(items: TrackingWBSItem[]): ProjectTrackingSummary {
  const leafItems = items.filter((i) => i.isLeaf);
  const targetItems = leafItems.length > 0 ? leafItems : items;

  const totalItems = targetItems.length;
  let totalProgressSum = 0;
  let delayedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  let totalTargetVolume = 0;
  let totalActualVolume = 0;

  let totalBudgetCost = 0;
  let totalActualCost = 0;
  let maxDelayDays = 0;

  targetItems.forEach((item) => {
    totalProgressSum += item.progressPercent;
    totalTargetVolume += item.targetQuantity;
    totalActualVolume += item.actualQuantity;
    totalBudgetCost += item.targetCost;
    totalActualCost += item.actualCost;

    if (item.delayDays > maxDelayDays) maxDelayDays = item.delayDays;

    if (item.status === "completed" || item.progressPercent >= 100) {
      completedCount++;
    } else if (item.status === "delayed") {
      delayedCount++;
    } else if (item.progressPercent > 0 || item.status === "in_progress") {
      inProgressCount++;
    } else {
      pendingCount++;
    }
  });

  const overallProgress = totalItems > 0 ? Number((totalProgressSum / totalItems).toFixed(1)) : 0;

  return {
    overallProgress,
    totalItems,
    delayedCount,
    inProgressCount,
    completedCount,
    pendingCount,
    totalTargetVolume,
    totalActualVolume,
    totalBudgetCost,
    totalActualCost,
    scheduleVarianceDays: maxDelayDays,
  };
}
