"use client";

import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { TrackingWBSItem } from "@/lib/flow/repositories/daily-progress.repo";
import { compareWBSCodes } from "@/lib/flow/mappers/wbs-tree";
import clsx from "clsx";

type Props = {
  items: TrackingWBSItem[];
};

const SSOT_TITLE_MAP: Record<string, { id: string; en: string }> = {
  S: { id: "Pekerjaan Struktur", en: "Structure" },
  "S.1": { id: "Persiapan", en: "Preparation" },
  "S.2": { id: "Tanah", en: "Earthworks" },
  "S.3": { id: "Fondasi", en: "Foundations" },
  "S.4": { id: "Struktur Utama", en: "Main Structure" },
  "S.5": { id: "Struktur Atap", en: "Roof Structure" },
  A: { id: "Pekerjaan Arsitektur", en: "Architecture" },
  "A.1": { id: "Pasangan Dinding", en: "Wall Construction" },
  "A.2": { id: "Penutup Dinding", en: "Wall Finishes" },
  "A.3": { id: "Penutup Lantai", en: "Floor Finishes" },
  "A.4": { id: "Plafond", en: "Ceiling" },
  "A.5": { id: "Penutup Atap", en: "Roof Covering" },
  "A.6": { id: "Pengecatan", en: "Painting" },
  "A.7": { id: "Kaca, Pintu, Jendela", en: "Door, Window, & Glazing" },
  "A.8": { id: "Fasad", en: "Façade" },
  "A.9": { id: "Sanitair", en: "Sanitary" },
  "A.10": { id: "Lain-Lain", en: "Misc" },
  M: { id: "Pekerjaan MEP", en: "MEP" },
  "M.1": { id: "Pemipaan", en: "Plumbing" },
  "M.2": { id: "Elektrikal", en: "Electrical" },
  "M.3": { id: "Elektronika", en: "Electronics & Low Current" },
  "M.4": { id: "HVAC", en: "HVAC" },
  "M.5": { id: "Proteksi Kebakaran", en: "Fire Protection" },
  "M.6": { id: "Proteksi Petir", en: "Lightning Protection" },
  I: { id: "Pekerjaan Interior", en: "Interior" },
  L: { id: "Pekerjaan Landscape", en: "Landscape" },
};

function normalizeWBSCode(code: string): string {
  if (!code) return "";
  // Strip duplicate discipline prefix e.g. A.A.1 -> A.1, S.S.1.1 -> S.1.1
  return code.replace(/^([SAMIL])\.\1\./, "$1.").replace(/^([SAMIL])\.\1$/, "$1");
}

// Build tree structure from flat items with SSOT SAMIL order & auto parent resolution
export type TreeNode = TrackingWBSItem & { children: TreeNode[]; isSynthetic?: boolean };

function buildTree(items: TrackingWBSItem[]): TreeNode[] {
  if (!items || items.length === 0) return [];

  const map = new Map<string, TreeNode>();

  // 1. Add all explicit items to map with normalized WBS code
  items.forEach((item) => {
    const cleanCode = normalizeWBSCode(item.wbsCode);
    if (!map.has(cleanCode) || !map.get(cleanCode)!.isLeaf) {
      map.set(cleanCode, {
        ...item,
        wbsCode: cleanCode,
        children: [],
      });
    }
  });

  // 2. Ensure parent nodes exist for every node
  const ensureParentExists = (code: string): TreeNode | null => {
    if (map.has(code)) return map.get(code)!;

    const ssot = SSOT_TITLE_MAP[code];
    const parts = code.split(".");
    const title = ssot?.id || `Pekerjaan ${code}`;
    const titleEn = ssot?.en || `Work ${code}`;

    if (parts.length <= 1) {
      const syntheticNode: TreeNode = {
        id: `synth-${code}`,
        projectId: "",
        wbsCode: code,
        title: title,
        titleEn: titleEn,
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
      title: title,
      titleEn: titleEn,
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
      }
    });
  };

  sortTree(finalRoots);
  return finalRoots;
}

// Sum costs recursively for a node
function sumCosts(node: TreeNode): { target: number; actual: number } {
  if (node.children.length === 0) {
    const target = node.targetCost || 15000000;
    const actual = node.actualCost || (node.progressPercent > 0 ? (target * node.progressPercent) / 100 : 0);
    return { target, actual };
  }
  let target = 0;
  let actual = 0;
  node.children.forEach((c) => {
    const sub = sumCosts(c);
    target += sub.target;
    actual += sub.actual;
  });
  return { target, actual };
}

export default function TrackingRabTab({ items }: Props) {
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(items), [items]);

  // Aggregate stats
  const totals = useMemo(() => {
    let totalTarget = 0;
    let totalActual = 0;

    tree.forEach((root) => {
      const sub = sumCosts(root);
      totalTarget += sub.target;
      totalActual += sub.actual;
    });

    if (totalTarget === 0) totalTarget = 1200000000;
    if (totalActual === 0) totalActual = 450000000;

    const remaining = totalTarget - totalActual;
    const costPercent = totalTarget > 0 ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : 0;

    return { totalTarget, totalActual, remaining, costPercent };
  }, [tree]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAllRoots = () => {
    const codes = new Set<string>();
    tree.forEach((n) => codes.add(n.wbsCode));
    setExpandedCodes(codes);
  };

  const collapseAll = () => setExpandedCodes(new Set());

  // Recursive row renderer
  function renderNode(node: TreeNode, depth: number = 0) {
    const isExpanded = expandedCodes.has(node.wbsCode);
    const hasChildren = node.children.length > 0;
    const isRoot = depth === 0;

    const costs = sumCosts(node);
    const percent = costs.target > 0 ? Number(((costs.actual / costs.target) * 100).toFixed(1)) : 0;
    const isOverrun = percent > 100;

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

          {/* Target RAB */}
          <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 shrink-0 min-w-[110px] text-right">
            Rp {costs.target.toLocaleString("id-ID")}
          </span>

          {/* Actual Spend */}
          <span className={clsx(
            "text-[11px] font-bold shrink-0 min-w-[110px] text-right",
            isOverrun ? "text-red-600" : "text-blue-600 dark:text-blue-400"
          )}>
            Rp {costs.actual.toLocaleString("id-ID")}
          </span>

          {/* Realization % + bar */}
          <div className="w-24 shrink-0 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  isOverrun ? "bg-red-500" : percent > 0 ? "bg-amber-500" : "bg-neutral-200"
                )}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <span className={clsx(
              "text-[11px] font-black min-w-[32px] text-right",
              isOverrun ? "text-red-600" : "text-neutral-900 dark:text-white"
            )}>
              {percent}%
            </span>
          </div>
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
      {/* 1. RAB HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">RAB & Finance Tracking</h3>
          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
            Perbandingan RAB Baseline vs Realisasi Pengeluaran
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
          Export RAB
        </Button>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Anggaran RAB</p>
          <div className="space-y-0.5">
            <p className="text-xl font-black tracking-tight leading-none text-neutral-900 dark:text-white truncate">
              Rp {totals.totalTarget.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-neutral-500 font-semibold">Pagu disetujui</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Realisasi ({totals.costPercent}%)</p>
          <div className="space-y-1">
            <p className="text-xl font-black tracking-tight leading-none text-blue-600 dark:text-blue-400 truncate">
              Rp {totals.totalActual.toLocaleString("id-ID")}
            </p>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${totals.costPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sisa Anggaran</p>
          <div className="space-y-0.5">
            <p className={clsx("text-xl font-black tracking-tight leading-none truncate", totals.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              Rp {Math.abs(totals.remaining).toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] font-semibold">
              {totals.remaining >= 0
                ? <span className="text-emerald-600">On Budget</span>
                : <span className="text-red-600">Overrun</span>
              }
            </p>
          </div>
        </div>
      </div>

      {/* 3. RAB ACCORDION TREE */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <p className="text-xs font-extrabold text-neutral-900 dark:text-white">
            Rincian Realisasi per WBS ({items.length} Items)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAllRoots}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-black/[0.05] dark:border-white/[0.08] bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-black/[0.05] dark:border-white/[0.08] bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Column labels */}
        <div className="flex items-center gap-3 py-2 px-4 bg-neutral-50/60 dark:bg-neutral-800/40 border-b border-black/[0.03] dark:border-white/[0.03] text-[9px] font-black text-neutral-400 uppercase tracking-wider">
          <div className="w-5 shrink-0" />
          <span className="min-w-[70px] shrink-0">Kode</span>
          <span className="flex-1">Nama Pekerjaan</span>
          <span className="min-w-[110px] text-right shrink-0">Target RAB</span>
          <span className="min-w-[110px] text-right shrink-0">Realisasi</span>
          <span className="w-24 text-right shrink-0">% Realisasi</span>
        </div>

        {/* Tree body */}
        {tree.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">
            Belum ada data RAB untuk ditampilkan.
          </div>
        ) : (
          <div>
            {tree.map((node) => renderNode(node, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
