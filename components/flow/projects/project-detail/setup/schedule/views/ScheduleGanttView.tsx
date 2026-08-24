"use client";

import React, { useState, useMemo, useRef } from "react";
import { ChevronRight, ChevronDown, Hash } from "lucide-react";
import { WeightedItem, ScheduleValue } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

type Props = {
  items: WeightedItem[];
  onUpdate: (code: string, field: keyof ScheduleValue, value: any) => void;
  timeScale?: "weekly" | "monthly";
};

const ROW_HEIGHT = 76; // Match timeline height to prevent clipping
const TABLE_WIDTH = 380; // Left side table width

export default function ScheduleGanttView({ items, onUpdate, timeScale = "weekly" }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const leftTableRef = useRef<HTMLDivElement>(null);
  const rightTimelineRef = useRef<HTMLDivElement>(null);

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

  // Dynamic pixels per day scale
  const pxPerDay = timeScale === "weekly" ? 8 : 4;

  // Helper to format date consistently as YYYY-MM-DD in local time
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 1. Calculate project start date (earliest start date or today)
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
    if (timeScale === "monthly") {
      res.setDate(1);
    }
    return res;
  }, [items, timeScale]);

  // 2. Generate months dynamically starting from projectStart
  const timelineMonths = useMemo(() => {
    const list = [];
    const date = new Date(projectStart);
    for (let i = 0; i < 12; i++) {
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      list.push({
        label: date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        days: daysInMonth,
        startDate: new Date(date)
      });
      date.setMonth(date.getMonth() + 1);
    }
    return list;
  }, [projectStart]);

  // 3. Generate weeks list for weekly scale
  const timelineWeeks = useMemo(() => {
    const list = [];
    const date = new Date(projectStart);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));

    for (let i = 1; i <= 24; i++) {
      const wStart = new Date(sunday);
      wStart.setDate(sunday.getDate() + (i - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      
      const monthLabel = wStart.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();

      list.push({
        index: i,
        label: `W${i}`,
        startDate: wStart,
        endDate: wEnd,
        monthLabel
      });
    }
    return list;
  }, [projectStart]);

  // Group weeks by month for headers in weekly view
  const weekMonthGroups = useMemo(() => {
    const groups: { label: string; width: number }[] = [];
    let currentMonth = "";
    let currentWidth = 0;

    timelineWeeks.forEach(w => {
      const colWidth = 7 * pxPerDay;
      if (w.monthLabel !== currentMonth) {
        if (currentWidth > 0) {
          groups.push({ label: currentMonth, width: currentWidth });
        }
        currentMonth = w.monthLabel;
        currentWidth = colWidth;
      } else {
        currentWidth += colWidth;
      }
    });
    if (currentWidth > 0) {
      groups.push({ label: currentMonth, width: currentWidth });
    }
    return groups;
  }, [timelineWeeks, pxPerDay]);

  // 4. Compute timeline total width
  const timelineWidth = useMemo(() => {
    if (timeScale === "weekly") {
      return timelineWeeks.length * 7 * pxPerDay;
    } else {
      const totalDays = timelineMonths.reduce((acc, m) => acc + m.days, 0);
      return totalDays * pxPerDay;
    }
  }, [timelineMonths, timelineWeeks, pxPerDay, timeScale]);

  // Anchor of the grid display
  const gridStart = useMemo(() => {
    if (timeScale === "weekly") {
      return timelineWeeks[0]?.startDate || projectStart;
    }
    return timelineMonths[0]?.startDate || projectStart;
  }, [timeScale, timelineWeeks, timelineMonths, projectStart]);

  // Calculate pixel left & width offset for a task bar using local midnight times to prevent timezone shifts
  const getBarCoordinates = (startDateStr?: string, durationDays = 1) => {
    if (!startDateStr || !durationDays) return null;
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return null;

    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const gridStartLocal = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate());

    const diffMs = startLocal.getTime() - gridStartLocal.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    const left = diffDays * pxPerDay;
    const width = durationDays * pxPerDay;
    return { left: Math.max(0, left), width: Math.max(6, width) };
  };

  // Sync scroll vertically
  const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const source = e.currentTarget;
    if (source === leftTableRef.current && rightTimelineRef.current) {
      rightTimelineRef.current.scrollTop = source.scrollTop;
    } else if (source === rightTimelineRef.current && leftTableRef.current) {
      leftTableRef.current.scrollTop = source.scrollTop;
    }
  };

  // Auto calculate end date helper
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

  // Calculate period sums (Weekly or Monthly) for the S-Curve footer
  const periodTotals = useMemo(() => {
    const periodsList: { startDate: Date; endDate: Date; days: number }[] = [];

    if (timeScale === "weekly") {
      timelineWeeks.forEach(w => {
        periodsList.push({ startDate: w.startDate, endDate: w.endDate, days: 7 });
      });
    } else {
      timelineMonths.forEach(m => {
        const mEnd = new Date(m.startDate.getFullYear(), m.startDate.getMonth() + 1, 0);
        periodsList.push({ startDate: m.startDate, endDate: mEnd, days: m.days });
      });
    }

    const plannedWeights = periodsList.map(p => {
      let sum = 0;
      flatItems.forEach(({ item }) => {
        const hasChildren = item.children && item.children.length > 0;
        if (!hasChildren) {
          const startStr = item.schedule?.startDate;
          const dur = item.schedule?.durationDays || 0;
          const weight = item.weight || 0;

          if (startStr && dur > 0 && weight > 0) {
            const start = new Date(startStr);
            const end = new Date(start);
            end.setDate(start.getDate() + dur - 1);

            const overlapStart = new Date(Math.max(start.getTime(), p.startDate.getTime()));
            const overlapEnd = new Date(Math.min(end.getTime(), p.endDate.getTime()));

            if (overlapStart.getTime() <= overlapEnd.getTime()) {
              const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
              sum += (overlapDays / dur) * weight;
            }
          }
        }
      });
      return sum;
    });

    let cumulative = 0;
    const cumulativeWeights = plannedWeights.map(w => {
      cumulative += w;
      return Math.min(100, cumulative);
    });

    return { periodsList, plannedWeights, cumulativeWeights };
  }, [flatItems, projectStart, timeScale, timelineMonths, timelineWeeks]);

  return (
    <div className="flex bg-white dark:bg-neutral-900 text-[11px] h-[520px] w-full border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
      
      {/* LEFT PINNED TABLE */}
      <div className="shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900" style={{ width: TABLE_WIDTH }}>
        {/* Table Pinned Sticky Header - 2 rows height matching timeline side */}
        <div className="bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 h-14 px-3 flex items-center font-bold text-neutral-505 uppercase tracking-wider text-[9px] shrink-0 sticky top-0 z-10">
          <span className="flex-1">Task Name</span>
          <span className="w-14 text-center shrink-0">Wgt</span>
          <span className="w-20 text-center shrink-0">Start</span>
          <span className="w-12 text-center shrink-0">Dur</span>
        </div>

        {/* Pinned Rows Scroll Container */}
        <div
          ref={leftTableRef}
          onScroll={handleVerticalScroll}
          className="flex-1 overflow-y-auto divide-y divide-neutral-150 dark:divide-neutral-850/60 no-scrollbar pb-16 bg-white dark:bg-neutral-900"
        >
          {flatItems.map(({ item, depth }, index) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded[item.code] ?? (depth < 2);

            const startDate = item.schedule?.startDate || "";
            const durationDays = item.schedule?.durationDays || 0;

            const activityName = item.nameEn || (item as any).name_en || item.name || (item as any).title || (item.code ? `Item ${item.code}` : "Unnamed Activity");
            const activitySubName = item.nameId || (item as any).name_id || item.description || "";

            return (
              <div
                key={item.id ? `${item.id}-${index}` : `${item.code}-${depth}-${index}`}
                className="flex items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors py-1 overflow-hidden bg-white dark:bg-neutral-900"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Task Name & Code */}
                <div className="flex-1 min-w-0 px-3 flex items-center gap-1.5 py-0.5">
                  <div style={{ width: depth * 14 }} className="shrink-0" />
                  {hasChildren ? (
                    <button
                      onClick={() => toggle(item.code)}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  ) : (
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      <Hash size={10} className="text-neutral-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 w-full min-w-0 flex-wrap">
                      <span className="inline-flex items-center justify-center font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700 shrink-0 select-none">
                        {item.code}
                      </span>
                      <span className={`whitespace-normal break-words leading-tight ${depth === 0 ? "font-bold text-neutral-900 dark:text-white text-xs" : "text-neutral-800 dark:text-neutral-200 text-[11px]"}`}>
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
                <span className="w-14 px-1 text-center font-mono text-[9px] text-neutral-600 dark:text-neutral-400 shrink-0">
                  {(item.weight || 0).toFixed(2)}%
                </span>

                {/* Start Date Datepicker */}
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

                {/* Duration Input */}
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
              </div>
            );
          })}
        </div>

        {/* Footer rows in left table (Weekly/Monthly and Cumulative Progress labels) */}
        <div className="shrink-0 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-255 dark:border-neutral-800 flex flex-col font-bold text-[10px] text-neutral-750 dark:text-neutral-300 sticky bottom-0 z-20">
          <div className="h-8 flex items-center px-3 border-b border-neutral-200 dark:border-neutral-800">
            {timeScale === "weekly" ? "Weekly Progress (W)" : "Monthly Progress (M)"}
          </div>
          <div className="h-8 flex items-center px-3 bg-red-50/40 dark:bg-brand-red/5">
            Cumulative Progress (C)
          </div>
        </div>
      </div>

      {/* RIGHT SCROLLABLE TIMELINE */}
      <div
        ref={rightTimelineRef}
        onScroll={handleVerticalScroll}
        className="flex-1 overflow-auto flex flex-col bg-white dark:bg-neutral-900 relative"
      >
        {/* Dynamic Sticky Header Columns */}
        {timeScale === "weekly" ? (
          /* WEEKLY DOUBLE HEADER */
          <div className="shrink-0 flex flex-col sticky top-0 z-10" style={{ width: timelineWidth }}>
            {/* Row 1: Months */}
            <div className="h-7 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 flex shrink-0">
              {weekMonthGroups.map((g, idx) => (
                <div
                  key={idx}
                  className="border-r border-neutral-200 dark:border-neutral-800 h-full flex items-center justify-center font-bold text-[9px] text-neutral-600 dark:text-neutral-350 select-none shrink-0"
                  style={{ width: g.width }}
                >
                  {g.label}
                </div>
              ))}
            </div>
            {/* Row 2: Weeks */}
            <div className="h-7 bg-neutral-50 dark:bg-neutral-950/90 border-b border-neutral-200 dark:border-neutral-850 flex shrink-0">
              {timelineWeeks.map((w) => (
                <div
                  key={w.index}
                  className="border-r border-neutral-150 dark:border-neutral-800/40 h-full flex items-center justify-center font-bold text-[8px] text-neutral-455 select-none shrink-0"
                  style={{ width: 7 * pxPerDay }}
                >
                  {w.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* MONTHLY SINGLE HEADER */
          <div
            className="h-14 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 flex shrink-0 sticky top-0 z-10"
            style={{ width: timelineWidth }}
          >
            {timelineMonths.map((m, i) => (
              <div
                key={i}
                className="border-r border-neutral-200 dark:border-neutral-800 h-full flex flex-col justify-center items-center shrink-0 font-bold text-[10px] text-neutral-500"
                style={{ width: m.days * pxPerDay }}
              >
                {m.label}
              </div>
            ))}
          </div>
        )}

        {/* Timeline Rows container */}
        <div
          className="flex-1 relative divide-y divide-neutral-150 dark:divide-neutral-850/60 pb-16 bg-white dark:bg-neutral-900"
          style={{ width: timelineWidth }}
        >
          {/* Vertical Grid Line Guides */}
          <div className="absolute inset-0 pointer-events-none flex">
            {timeScale === "weekly" ? (
              timelineWeeks.map((w) => (
                <div
                  key={w.index}
                  className="h-full border-r border-neutral-200/40 dark:border-neutral-800/20 shrink-0"
                  style={{ width: 7 * pxPerDay }}
                />
              ))
            ) : (
              timelineMonths.map((m, i) => (
                <div
                  key={i}
                  className="h-full border-r border-neutral-200/40 dark:border-neutral-800/20 shrink-0"
                  style={{ width: m.days * pxPerDay }}
                />
              ))
            )}
          </div>

          {/* Gantt Bar rows */}
          {flatItems.map(({ item, depth }, index) => {
            const startDate = item.schedule?.startDate;
            const durationDays = item.schedule?.durationDays;
            const bar = getBarCoordinates(startDate, durationDays);

            return (
              <div
                key={item.id ? `bar-${item.id}-${index}` : `bar-${item.code}-${depth}-${index}`}
                className="relative flex items-center hover:bg-neutral-50/40 dark:hover:bg-neutral-800/5 transition-colors bg-white dark:bg-neutral-900"
                style={{ height: ROW_HEIGHT }}
              >
                {bar && (
                  <div
                    className={`absolute h-5 rounded-lg flex items-center justify-center px-1.5 transition-all shadow-sm ${
                      depth === 0
                        ? "bg-red-800 dark:bg-red-950 text-white font-black"
                        : depth === 1
                        ? "bg-red-400 dark:bg-red-650 text-white"
                        : "bg-brand-red text-white"
                    }`}
                    style={{
                      left: bar.left,
                      width: bar.width,
                      opacity: 0.85
                    }}
                    title={`${item.name}: ${startDate} (${durationDays} days)`}
                  >
                    {bar.width > 60 && (
                      <span className="text-[8px] font-mono truncate select-none">
                        {durationDays}d
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky Matrix Summary Totals Row (Cumulative Progress) */}
        <div
          className="sticky bottom-0 left-0 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-255 dark:border-neutral-800 flex flex-col shrink-0 z-20"
          style={{ width: timelineWidth }}
        >
          {/* Row 1: Period Progress sum */}
          <div className="flex h-8 items-center border-b border-neutral-200 dark:border-neutral-800">
            {periodTotals.periodsList.map((p, idx) => {
              const val = periodTotals.plannedWeights[idx];
              const colWidth = p.days * pxPerDay;
              return (
                <div
                  key={idx}
                  className="border-r border-neutral-200 dark:border-neutral-800 h-full flex items-center justify-center font-mono text-[9px] font-bold text-neutral-600 dark:text-neutral-350 shrink-0"
                  style={{ width: colWidth }}
                >
                  {val > 0 ? `${val.toFixed(1)}%` : "0.0%"}
                </div>
              );
            })}
          </div>

          {/* Row 2: Cumulative Progress curve sum */}
          <div className="flex h-8 items-center bg-red-50/40 dark:bg-brand-red/5">
            {periodTotals.periodsList.map((p, idx) => {
              const val = periodTotals.cumulativeWeights[idx];
              const colWidth = p.days * pxPerDay;
              return (
                <div
                  key={idx}
                  className="border-r border-neutral-200 dark:border-neutral-800 h-full flex items-center justify-center font-mono text-[9px] font-black text-brand-red dark:text-red-400 shrink-0"
                  style={{ width: colWidth }}
                >
                  {val > 0 ? `${val.toFixed(1)}%` : "0.0%"}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
