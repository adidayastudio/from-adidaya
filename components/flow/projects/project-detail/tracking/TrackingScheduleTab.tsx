"use client";

import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { TrackingWBSItem } from "@/lib/flow/repositories/daily-progress.repo";
import { useProject } from "@/components/flow/project-context";
import { WBS_DISCIPLINE_LABELS, WBS_DISCIPLINES, type WBSDiscipline } from "@/types/project";
import { compareWBSCodes } from "@/lib/flow/mappers/wbs-tree";
import SCurveChart from "./SCurveChart";
import { Search, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, Plus } from "lucide-react";
import clsx from "clsx";

type Props = {
  items: TrackingWBSItem[];
  isLoading: boolean;
  onOpenInputModal: (item?: TrackingWBSItem) => void;
  onRefresh: () => void;
};

const DISCIPLINE_TITLE_MAP: Record<string, string> = {
  S: "Pekerjaan Struktur",
  A: "Pekerjaan Arsitektur",
  M: "Pekerjaan MEP",
  I: "Pekerjaan Interior",
  L: "Pekerjaan Landscape",
};

// Build tree structure from flat items with SSOT SAMIL order & auto parent resolution
export type TreeNode = TrackingWBSItem & { children: TreeNode[]; isSynthetic?: boolean };

function buildTree(items: TrackingWBSItem[]): TreeNode[] {
  if (!items || items.length === 0) return [];

  const map = new Map<string, TreeNode>();

  // 1. Add all explicit items to map
  items.forEach((item) => {
    map.set(item.wbsCode, {
      ...item,
      children: [],
    });
  });

  // 2. Ensure parent nodes exist for every node
  const ensureParentExists = (code: string): TreeNode | null => {
    if (map.has(code)) return map.get(code)!;

    const parts = code.split(".");
    if (parts.length <= 1) {
      const title = DISCIPLINE_TITLE_MAP[code] || `Disiplin ${code}`;
      const syntheticNode: TreeNode = {
        id: `synth-${code}`,
        projectId: "",
        wbsCode: code,
        title: title,
        titleEn: title,
        level: 0,
        position: 0,
        isLeaf: false,
        unit: "",
        targetQuantity: 0,
        actualQuantity: 0,
        progressPercent: 0,
        targetCost: 0,
        actualCost: 0,
        status: "pending",
        delayDays: 0,
        logs: [],
        children: [],
        isSynthetic: true,
      };
      map.set(code, syntheticNode);
      return syntheticNode;
    }

    const parentCode = parts.slice(0, -1).join(".");
    const parentNode = ensureParentExists(parentCode);

    const syntheticNode: TreeNode = {
      id: `synth-${code}`,
      projectId: "",
      wbsCode: code,
      title: `Sub-pekerjaan ${code}`,
      titleEn: `Sub-work ${code}`,
      level: parts.length - 1,
      position: 0,
      isLeaf: false,
      unit: "",
      targetQuantity: 0,
      actualQuantity: 0,
      progressPercent: 0,
      targetCost: 0,
      actualCost: 0,
      status: "pending",
      delayDays: 0,
      logs: [],
      children: [],
      isSynthetic: true,
    };
    map.set(code, syntheticNode);

    if (parentNode && !parentNode.children.some((c) => c.wbsCode === code)) {
      parentNode.children.push(syntheticNode);
    }

    return syntheticNode;
  };

  // 3. Link nodes to parents
  map.forEach((node) => {
    const parts = node.wbsCode.split(".");
    if (parts.length > 1) {
      const parentCode = parts.slice(0, -1).join(".");
      const parentNode = ensureParentExists(parentCode);
      if (parentNode && !parentNode.children.some((c) => c.wbsCode === node.wbsCode)) {
        parentNode.children.push(node);
      }
    }
  });

  // Re-collect true root nodes
  const finalRoots: TreeNode[] = [];
  map.forEach((node) => {
    const parts = node.wbsCode.split(".");
    if (parts.length === 1 && !finalRoots.some((r) => r.wbsCode === node.wbsCode)) {
      finalRoots.push(node);
    }
  });

  // 4. Sort recursively using compareWBSCodes (SAMIL order)
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => compareWBSCodes(a.wbsCode, b.wbsCode));
    nodes.forEach((n) => {
      if (n.children.length > 0) {
        sortTree(n.children);

        let totalProg = 0;
        let count = 0;
        let sumTarget = 0;
        let sumActual = 0;
        let sumTargetCost = 0;
        let sumActualCost = 0;

        n.children.forEach((c) => {
          totalProg += c.progressPercent;
          count += 1;
          sumTarget += c.targetQuantity;
          sumActual += c.actualQuantity;
          sumTargetCost += c.targetCost;
          sumActualCost += c.actualCost;
        });

        if (count > 0) {
          n.progressPercent = Number((totalProg / count).toFixed(1));
          if (n.progressPercent >= 100) n.status = "completed";
          else if (n.progressPercent > 0) n.status = "in_progress";
        }
        if (n.isSynthetic) {
          n.targetQuantity = sumTarget;
          n.actualQuantity = sumActual;
          n.targetCost = sumTargetCost;
          n.actualCost = sumActualCost;
        }
      }
    });
  };

  sortTree(finalRoots);
  return finalRoots;
}

// Calculate weighted progress for a tree branch
function calcBranchProgress(nodes: TreeNode[]): { schedule: number; finance: number } {
  if (nodes.length === 0) return { schedule: 0, finance: 0 };

  let totalWeight = 0;
  let weightedSchedule = 0;
  let weightedFinance = 0;

  function walk(node: TreeNode) {
    if (node.children.length === 0) {
      const w = 1;
      totalWeight += w;
      weightedSchedule += node.progressPercent * w;
      const finPct = node.targetCost > 0 ? Math.min(100, (node.actualCost / node.targetCost) * 100) : 0;
      weightedFinance += finPct * w;
    } else {
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);

  return {
    schedule: totalWeight > 0 ? Number((weightedSchedule / totalWeight).toFixed(1)) : 0,
    finance: totalWeight > 0 ? Number((weightedFinance / totalWeight).toFixed(1)) : 0,
  };
}

export default function TrackingScheduleTab({
  items,
  isLoading,
  onOpenInputModal,
  onRefresh,
}: Props) {
  const { project } = useProject();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  // Determine if project is single-mass or multi-mass
  const massCount = project?.building_mass_count || project?.building_masses?.length || 1;
  const isMultiMass = massCount > 1;
  const masses: string[] = useMemo(() => {
    if (!isMultiMass) return [];
    const set = new Set<string>();
    items.forEach((item) => {
      const firstPart = item.wbsCode.split(".")[0];
      if (firstPart && firstPart.length === 1 && /[A-Z]/.test(firstPart)) {
        set.add(firstPart);
      }
    });
    return Array.from(set).sort();
  }, [items, isMultiMass]);

  // Extract available disciplines
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const parts = item.wbsCode.split(".");
      const discPart = isMultiMass ? parts[1] : parts[0];
      if (discPart && discPart.length === 1 && WBS_DISCIPLINES.includes(discPart as WBSDiscipline)) {
        set.add(discPart);
      }
    });
    return Array.from(set).sort();
  }, [items, isMultiMass]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter !== "ALL") {
        if (isMultiMass) {
          if (!item.wbsCode.startsWith(selectedFilter)) return false;
        } else {
          if (!item.wbsCode.startsWith(selectedFilter)) return false;
        }
      }
      if (selectedStatus !== "ALL") {
        if (item.status !== selectedStatus) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCode = item.wbsCode.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesTitleEn = item.titleEn ? item.titleEn.toLowerCase().includes(q) : false;
        if (!matchesCode && !matchesTitle && !matchesTitleEn) return false;
      }
      return true;
    });
  }, [items, selectedFilter, selectedStatus, searchQuery, isMultiMass]);

  // Build tree
  const tree = useMemo(() => buildTree(filteredItems), [filteredItems]);

  // 3-tier progress
  const progressStats = useMemo(() => {
    const { schedule, finance } = calcBranchProgress(tree);
    const overall = Number(((schedule + finance) / 2).toFixed(1));
    return { overall, schedule, finance };
  }, [tree]);

  // Toggle expand
  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Expand all roots
  const expandAllRoots = () => {
    const codes = new Set<string>();
    tree.forEach((n) => codes.add(n.wbsCode));
    setExpandedCodes(codes);
  };

  // Recursive row renderer
  function renderNode(node: TreeNode, depth: number = 0) {
    const isExpanded = expandedCodes.has(node.wbsCode);
    const hasChildren = node.children.length > 0;
    const isRoot = depth === 0;

    return (
      <div key={node.wbsCode}>
        <div
          className={clsx(
            "flex items-center gap-3 py-3 px-4 transition-colors border-b border-black/[0.03] dark:border-white/[0.03]",
            isRoot
              ? "bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50"
              : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20",
            hasChildren && "cursor-pointer"
          )}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
          onClick={hasChildren ? () => toggleExpand(node.wbsCode) : undefined}
        >
          {/* Expand/Collapse icon */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            )}
          </div>

          {/* WBS Code */}
          <span className={clsx(
            "font-mono text-[11px] shrink-0 min-w-[70px]",
            isRoot ? "font-extrabold text-neutral-900 dark:text-white" : "font-bold text-neutral-600 dark:text-neutral-400"
          )}>
            {node.wbsCode}
          </span>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <span className={clsx(
              "text-xs truncate block",
              isRoot ? "font-extrabold text-neutral-900 dark:text-white" : "font-semibold text-neutral-800 dark:text-neutral-200"
            )}>
              {node.title}
            </span>
            {node.titleEn && depth > 0 && (
              <span className="text-[10px] text-neutral-400 italic truncate block">{node.titleEn}</span>
            )}
          </div>

          {/* Volume */}
          {!hasChildren && (
            <span className="text-[10px] font-bold text-neutral-400 shrink-0 min-w-[40px] text-right">
              {node.targetQuantity > 0 ? `${node.actualQuantity}/${node.targetQuantity}` : "\u2014"} {node.unit || ""}
            </span>
          )}

          {/* Progress bar */}
          <div className="w-24 shrink-0 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  node.progressPercent >= 100
                    ? "bg-emerald-500"
                    : node.status === "delayed"
                    ? "bg-red-500"
                    : node.progressPercent > 0
                    ? "bg-blue-500"
                    : "bg-neutral-200"
                )}
                style={{ width: `${Math.min(100, node.progressPercent)}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-neutral-900 dark:text-white min-w-[32px] text-right">
              {node.progressPercent}%
            </span>
          </div>

          {/* Status badge */}
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 min-w-[70px] text-center",
              node.status === "completed" || node.progressPercent >= 100
                ? "bg-emerald-500/10 text-emerald-600"
                : node.status === "delayed"
                ? "bg-red-500/10 text-red-600"
                : node.progressPercent > 0
                ? "bg-blue-500/10 text-blue-600"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
            )}
          >
            {node.status === "completed" || node.progressPercent >= 100
              ? "Selesai"
              : node.status === "delayed"
              ? "Delay"
              : node.progressPercent > 0
              ? "Progress"
              : "Pending"}
          </span>

          {/* Input Capaian for leaf nodes */}
          {!hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInputModal(node);
              }}
              className="px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors shrink-0"
            >
              + Input
            </button>
          )}
        </div>

        {/* Children (expanded) */}
        {isExpanded && hasChildren && (
          <div className="animate-in fade-in duration-150">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. 3-TIER PROGRESS HEADER */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Overall Progress</p>
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black tracking-tight leading-none text-neutral-900 dark:text-white">{progressStats.overall}%</p>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressStats.overall}%` }} />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Konst. Fisik</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black tracking-tight leading-none text-amber-600 dark:text-amber-400">{progressStats.schedule}%</p>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${progressStats.schedule}%` }} />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Finance (Paid)</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black tracking-tight leading-none text-emerald-600 dark:text-emerald-400">{progressStats.finance}%</p>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressStats.finance}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <Input
            placeholder="Cari Kode atau Nama WBS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border-black/[0.04]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-black/[0.05] dark:border-white/[0.08] bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus:outline-none"
          >
            {isMultiMass ? (
              <>
                <option value="ALL">Semua Massa</option>
                {masses.map((m) => (
                  <option key={m} value={m}>Massa {m}</option>
                ))}
              </>
            ) : (
              <>
                <option value="ALL">Semua Disiplin</option>
                {availableDisciplines.map((d) => (
                  <option key={d} value={d}>
                    {d} — {WBS_DISCIPLINE_LABELS[d as WBSDiscipline] || d}
                  </option>
                ))}
              </>
            )}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-black/[0.05] dark:border-white/[0.08] bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="delayed">Terlambat</option>
            <option value="in_progress">Dalam Proses</option>
            <option value="completed">Selesai</option>
            <option value="pending">Belum Mulai</option>
          </select>

          <button
            onClick={expandAllRoots}
            className="h-9 px-3 text-xs font-bold rounded-xl border border-black/[0.05] dark:border-white/[0.08] bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap"
          >
            Expand All
          </button>
        </div>
      </div>

      {/* 3. WBS ACCORDION TREE */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">WBS Tracking — Pekerjaan Konstruksi</h3>
            <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
              {filteredItems.length} item dari {items.length} total pekerjaan
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> DESIGN {progressStats.schedule}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> CONST. {progressStats.schedule}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> PAID {progressStats.finance}%</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-neutral-500 text-sm font-medium space-y-2">
            <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Memuat data tracking WBS...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">
            Tidak ada item WBS yang sesuai dengan filter.
          </div>
        ) : (
          <div>
            {tree.map((node) => renderNode(node, 0))}
          </div>
        )}
      </div>

      {/* 4. S-CURVE CHART */}
      {!isLoading && tree.length > 0 && (
        <SCurveChart />
      )}
    </div>
  );
}
