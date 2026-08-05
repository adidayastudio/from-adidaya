"use client";

import React, { useState, useMemo, useRef } from "react";
import { ChevronRight, ChevronDown, Hash } from "lucide-react";
import { WeightedItem, ScheduleValue } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

type Props = {
  items: WeightedItem[];
  onUpdate: (code: string, field: keyof ScheduleValue, value: any) => void;
  timeScale?: "weekly" | "monthly";
};

const WEEK_COL_WIDTH = 64; // Width of each week column
const MONTH_COL_WIDTH = 80; // Width of each month column
const ROW_HEIGHT = 76; // Match row height to prevent clipping
const TABLE_WIDTH = 460; // Pinned table width

export default function ScheduleWeeklyDistributionView({ items, onUpdate, timeScale = "weekly" }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const leftTableRef = useRef<HTMLDivElement>(null);
  const rightMatrixRef = useRef<HTMLDivElement>(null);

  const toggle = (code: string) => {
    setExpanded(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Flatten the tree structure respecting collapsed state
  const flatItems: { item: WeightedItem; depth: number }[] = [];
  function flatten(nodes: WeightedItem[], depth = 0) {
    nodes.forEach(node => {
      flatItems.push({ item: node, depth });
      const isExpanded = expanded[node.code] ?? (depth < 2);
      if (isExpanded && node.children && node.children.length > 0) {
        flatten(node.children as WeightedItem[], depth + 1);
      }
    });
  }
  flatten(items);

  // Calculate project start date (earliest start date or today)
  const projectStart = useMemo(() => {
    let earliest = new Date();
    let found = false;

    const scan = (nodes: WeightedItem[]) => {
      nodes.forEach(node => {
        if (node.schedule?.startDate) {
          const d = new Date(node.schedule.startDate);
          if (!isNaN(d.getTime())) {
            if (!found || d < earliest) {
              earliest = d;
              found = true;
            }
          }
        }
        if (node.children) scan(node.children);
      });
    };
    scan(items);

    const res = new Date(earliest);
    res.setDate(1); // Start of month
    return res;
  }, [items]);

  // Generate weeks starting from projectStart
  const timelineWeeks = useMemo(() => {
    const list = [];
    const date = new Date(projectStart);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));

    for (let i = 1; i <= 16; i++) {
      const weekStart = new Date(monday);
      weekStart.setDate(monday.getDate() + (i - 1) * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      list.push({
        index: i,
        label: `W${i}`,
        dateRange: `${weekStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
        startDate: weekStart,
        endDate: weekEnd
      });
    }
    return list;
  }, [projectStart]);

  // Generate 12 months dynamically starting from projectStart
  const timelineMonths = useMemo(() => {
    const list = [];
    const date = new Date(projectStart);
    for (let i = 0; i < 12; i++) {
      const mStart = new Date(date.getFullYear(), date.getMonth() + i, 1);
      const mEnd = new Date(date.getFullYear(), date.getMonth() + i + 1, 0); // last day of month
      list.push({
        index: i + 1,
        label: mStart.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        dateRange: mStart.toLocaleDateString("id-ID", { month: "long" }),
        startDate: mStart,
        endDate: mEnd
      });
    }
    return list;
  }, [projectStart]);

  const activeColumns = timeScale === "weekly" ? timelineWeeks : timelineMonths;
  const colWidth = timeScale === "weekly" ? WEEK_COL_WIDTH : MONTH_COL_WIDTH;
  const matrixWidth = activeColumns.length * colWidth;

  // Calculate distributed weight for a task in a specific period
  const getTaskPeriodWeight = (item: WeightedItem, periodStart: Date, periodEnd: Date) => {
    const startStr = item.schedule?.startDate;
    const duration = item.schedule?.durationDays || 0;
    const weight = item.weight || 0;

    if (!startStr || duration <= 0 || weight <= 0) return 0;

    const start = new Date(startStr);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);

    const overlapStart = new Date(Math.max(start.getTime(), periodStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), periodEnd.getTime()));

    if (overlapStart.getTime() <= overlapEnd.getTime()) {
      const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
      return (overlapDays / duration) * weight;
    }
    return 0;
  };

  // Compute Weekly/Monthly and Cumulative sums for the matrix footer
  const periodTotals = useMemo(() => {
    const plannedWeights = activeColumns.map(col => {
      let sum = 0;
      flatItems.forEach(({ item }) => {
        const hasChildren = item.children && item.children.length > 0;
        if (!hasChildren) {
          sum += getTaskPeriodWeight(item, col.startDate, col.endDate);
        }
      });
      return sum;
    });

    let cumulative = 0;
    const cumulativeWeights = plannedWeights.map(w => {
      cumulative += w;
      return Math.min(100, cumulative);
    });

    return { plannedWeights, cumulativeWeights };
  }, [flatItems, activeColumns]);

  // Sync scroll vertically
  const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const source = e.currentTarget;
    if (source === leftTableRef.current && rightMatrixRef.current) {
      rightMatrixRef.current.scrollTop = source.scrollTop;
    } else if (source === rightMatrixRef.current && leftTableRef.current) {
      leftTableRef.current.scrollTop = source.scrollTop;
    }
  };

  // Handle date editing helper
  const getFinishDate = (start?: string, duration?: number) => {
    if (!start || !duration) return "";
    const d = new Date(start);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + Math.max(0, duration - 1));
    return d.toISOString().split("T")[0];
  };

  const handleDateChange = (code: string, startVal?: string, durVal?: number) => {
    const start = startVal;
    const duration = durVal !== undefined ? Math.max(1, durVal) : 1;
    onUpdate(code, "startDate", start);
    onUpdate(code, "durationDays", duration);
    if (start) {
      onUpdate(code, "endDate", getFinishDate(start, duration));
    }
  };

  return (
    <div className="flex bg-white dark:bg-neutral-900 text-[11px] h-[520px] w-full border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
      
      {/* LEFT PINNED TABLE */}
      <div className="shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900" style={{ width: TABLE_WIDTH }}>
        {/* Table Pinned Header */}
        <div className="bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 h-10 px-3 flex items-center font-bold text-neutral-505 uppercase tracking-wider text-[9px] shrink-0 sticky top-0 z-10">
          <span className="flex-1">Task Name</span>
          <span className="w-10 text-center shrink-0">Wgt</span>
          <span className="w-20 text-center shrink-0">Start</span>
          <span className="w-12 text-center shrink-0">Dur</span>
          <span className="w-20 text-center shrink-0">Predecessor</span>
        </div>

        {/* Pinned Rows scrollable area */}
        <div
          ref={leftTableRef}
          onScroll={handleVerticalScroll}
          className="flex-1 overflow-y-auto divide-y divide-neutral-150 dark:divide-neutral-850/60 no-scrollbar pb-16 bg-white dark:bg-neutral-900"
        >
          {flatItems.map(({ item, depth }) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded[item.code] ?? (depth < 2);

            const startDate = item.schedule?.startDate || "";
            const durationDays = item.schedule?.durationDays || 0;
            const predecessor = item.schedule?.predecessor || "";

            const activityName = item.nameEn || item.name || "Unnamed Activity";
            const activitySubName = item.nameId || item.description;

            return (
              <div
                key={item.code}
                className="flex items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors py-1 overflow-hidden bg-white dark:bg-neutral-900"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Name */}
                <div className="flex-1 min-w-0 px-3 flex items-start gap-1.5 py-0.5">
                  <div style={{ width: depth * 10 }} className="shrink-0" />
                  {hasChildren ? (
                    <button
                      onClick={() => toggle(item.code)}
                      className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-850 text-neutral-550 transition-colors shrink-0 mt-0.5"
                    >
                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </button>
                  ) : (
                    <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
                      <Hash size={8} className="text-neutral-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1 w-full min-w-0 flex-wrap">
                      <span className="font-mono text-[8px] font-bold text-neutral-400 dark:text-neutral-555 shrink-0 select-none mr-1">
                        {item.code}
                      </span>
                      <span className={`whitespace-normal break-words leading-tight ${depth === 0 ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
                        {activityName}
                      </span>
                    </div>
                    {activitySubName && activitySubName !== activityName && (
                      <span className="text-[9px] text-neutral-455 dark:text-neutral-400 italic block leading-tight mt-0.5 whitespace-normal break-words">
                        {activitySubName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Weight */}
                <span className="w-10 px-1 text-center font-mono text-[9px] text-neutral-500 shrink-0">
                  {item.weight ? `${item.weight.toFixed(0)}%` : "0%"}
                </span>

                {/* Start Date */}
                <div className="w-20 px-1 shrink-0">
                  {!hasChildren && (
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange(item.code, e.target.value, durationDays)}
                      className="w-full text-[10px] bg-transparent border-none focus:ring-0 p-0 text-center font-mono text-neutral-700 dark:text-neutral-300 cursor-pointer"
                    />
                  )}
                </div>

                {/* Duration */}
                <div className="w-12 px-1 shrink-0">
                  {!hasChildren && (
                    <input
                      type="number"
                      min="1"
                      placeholder="-"
                      value={durationDays || ""}
                      onChange={(e) => handleDateChange(item.code, startDate, Number(e.target.value))}
                      className="w-full text-[10px] bg-transparent border-none focus:ring-0 p-0 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300"
                    />
                  )}
                </div>

                {/* Predecessor */}
                <div className="w-20 px-1 shrink-0">
                  {!hasChildren && (
                    <input
                      type="text"
                      placeholder="e.g. S.1.1"
                      value={predecessor}
                      onChange={(e) => onUpdate(item.code, "predecessor" as any, e.target.value)}
                      className="w-full text-[10px] bg-transparent border-none focus:ring-0 p-0 text-center font-mono text-neutral-700 dark:text-neutral-300 focus:border-neutral-300 focus:bg-white dark:focus:bg-neutral-800 rounded px-1 py-0.5"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer rows in left table */}
        <div className="shrink-0 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-255 dark:border-neutral-800 flex flex-col font-bold text-[10px] text-neutral-750 dark:text-neutral-300 sticky bottom-0 z-20">
          <div className="h-8 flex items-center px-3 border-b border-neutral-200 dark:border-neutral-800">
            {timeScale === "weekly" ? "Weekly Progress (W)" : "Monthly Progress (M)"}
          </div>
          <div className="h-8 flex items-center px-3 bg-red-50/40 dark:bg-brand-red/5">
            Cumulative Progress (C)
          </div>
        </div>
      </div>

      {/* RIGHT SCROLLABLE MATRIX */}
      <div
        ref={rightMatrixRef}
        onScroll={handleVerticalScroll}
        className="flex-1 overflow-auto flex flex-col bg-white dark:bg-neutral-900 relative"
      >
        {/* Dynamic Sticky Period Header */}
        <div
          className="h-10 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 flex shrink-0 sticky top-0 z-10"
          style={{ width: matrixWidth }}
        >
          {activeColumns.map((col) => (
            <div
              key={col.index}
              className="border-r border-neutral-200 dark:border-neutral-800 h-full flex flex-col justify-center items-center shrink-0 text-center select-none"
              style={{ width: colWidth }}
            >
              <span className="font-bold text-[9px] text-neutral-600 dark:text-neutral-300 leading-none">{col.label}</span>
              {timeScale === "weekly" && (
                <span className="text-[8px] text-neutral-400 mt-0.5 font-mono">{col.dateRange}</span>
              )}
            </div>
          ))}
        </div>

        {/* Matrix cells content rows */}
        <div
          className="flex-1 divide-y divide-neutral-150 dark:divide-neutral-850/60 pb-16 bg-white dark:bg-neutral-900"
          style={{ width: matrixWidth }}
        >
          {flatItems.map(({ item }) => {
            return (
              <div
                key={item.code}
                className="flex items-center hover:bg-neutral-50/40 dark:hover:bg-neutral-800/5 transition-colors bg-white dark:bg-neutral-900"
                style={{ height: ROW_HEIGHT }}
              >
                {activeColumns.map(col => {
                  const val = getTaskPeriodWeight(item, col.startDate, col.endDate);
                  const isActive = val > 0;
                  return (
                    <div
                      key={col.index}
                      className={`border-r border-neutral-150/40 dark:border-neutral-800/20 h-full flex items-center justify-center shrink-0 font-mono text-[9px] transition-colors ${
                        isActive 
                          ? "bg-red-50 dark:bg-brand-red/10 text-brand-red dark:text-red-400 font-bold" 
                          : "text-neutral-700 dark:text-neutral-300 font-semibold"
                      }`}
                      style={{ width: colWidth }}
                    >
                      {val > 0 ? `${val.toFixed(1)}%` : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sticky Matrix Summary Totals Row */}
        <div
          className="sticky bottom-0 left-0 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-255 dark:border-neutral-800 flex flex-col shrink-0 z-20"
          style={{ width: matrixWidth }}
        >
          {/* Row 1: Period Progress weight sum */}
          <div className="flex h-8 items-center border-b border-neutral-200 dark:border-neutral-800">
            {activeColumns.map((col, idx) => {
              const val = periodTotals.plannedWeights[idx];
              return (
                <div
                  key={col.index}
                  className="border-r border-neutral-200 dark:border-neutral-800 h-full flex flex-col justify-center items-center shrink-0 font-mono text-[9px] font-bold text-neutral-655 dark:text-neutral-350"
                  style={{ width: colWidth }}
                >
                  <span>{val > 0 ? `${val.toFixed(1)}%` : "0.0%"}</span>
                </div>
              );
            })}
          </div>

          {/* Row 2: Cumulative Progress curve sum */}
          <div className="flex h-8 items-center bg-red-50/40 dark:bg-brand-red/5">
            {activeColumns.map((col, idx) => {
              const val = periodTotals.cumulativeWeights[idx];
              return (
                <div
                  key={col.index}
                  className="border-r border-neutral-200 dark:border-neutral-800 h-full flex flex-col justify-center items-center shrink-0 font-mono text-[9px] font-black text-brand-red dark:text-red-400"
                  style={{ width: colWidth }}
                >
                  <span>{val > 0 ? `${val.toFixed(1)}%` : "0.0%"}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
