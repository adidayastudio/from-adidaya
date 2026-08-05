"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Hash } from "lucide-react";
import { WeightedItem, ScheduleValue } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

type Props = {
  items: WeightedItem[];
  onUpdate: (code: string, field: keyof ScheduleValue, value: any) => void;
};

export default function ScheduleTimelineView({ items, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(code: string) {
    setExpanded(s => ({ ...s, [code]: !s[code] }));
  }

  // Flatten logic respecting expanded state
  const flatItems: { item: WeightedItem; depth: number }[] = [];
  function flatten(nodes: WeightedItem[], depth = 0) {
    nodes.forEach(node => {
      flatItems.push({ item: node, depth });
      // Default L0 and L1 to expanded on initial load if not set
      const isExpanded = expanded[node.code] ?? (depth < 2);
      if (isExpanded && node.children && node.children.length > 0) {
        flatten(node.children as WeightedItem[], depth + 1);
      }
    });
  }
  flatten(items);

  // Auto-calculate end date helper
  const getFinishDate = (start?: string, duration?: number) => {
    if (!start || !duration) return "";
    const d = new Date(start);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + Math.max(0, duration - 1));
    return d.toISOString().split("T")[0];
  };

  // Convert YYYY-MM-DD -> DD/MM/YYYY for unified formatting
  const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return "—";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
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
    <div className="overflow-x-auto w-full text-[11px]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[9px]">
            <th className="px-3 py-2.5">Activity / Task Name</th>
            <th className="px-2 py-2.5 w-[50px] text-center">Wgt (%)</th>
            <th className="px-3 py-2.5 w-[140px]">Start Date</th>
            <th className="px-3 py-2.5 w-[140px]">Finish Date</th>
            <th className="px-3 py-2.5 w-[90px] text-center">Duration</th>
            <th className="px-3 py-2.5 w-[110px]">Calendar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850/60">
          {flatItems.map(({ item, depth }) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded[item.code] ?? (depth < 2);
            
            // Get schedules
            const startDate = item.schedule?.startDate || "";
            const durationDays = item.schedule?.durationDays || 0;
            const rawEndDate = startDate ? getFinishDate(startDate, durationDays) : "";
            const formattedEndDate = formatDateDMY(rawEndDate);
            const calendar = item.schedule?.calendarMode || "6-Days"; // Default to 6-Days Work

            // Resolve proper text name mapping
            const activityName = item.nameEn || item.name || "Unnamed Activity";
            const activitySubName = item.nameId || item.description;

            return (
              <tr key={item.code} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/20 transition-colors">
                {/* Combined Activity Column */}
                <td className="px-3 py-2 font-medium text-neutral-850 dark:text-neutral-200">
                  <div
                    className="flex items-start gap-1.5 min-w-0"
                    style={{ paddingLeft: `${depth * 10}px` }}
                  >
                    {hasChildren ? (
                      <button
                        onClick={() => toggle(item.code)}
                        className="p-0.5 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 text-neutral-505 transition-colors shrink-0 mt-0.5"
                      >
                        {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </button>
                    ) : (
                      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
                        <Hash size={8} className="text-neutral-455" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1 w-full min-w-0 flex-wrap">
                        <span className="font-mono text-[8px] font-bold text-neutral-400 dark:text-neutral-500 shrink-0 select-none">
                          {item.code}
                        </span>
                        <span className={`whitespace-normal break-words leading-tight ${depth === 0 ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-800 dark:text-neutral-250"}`}>
                          {activityName}
                        </span>
                      </div>
                      {activitySubName && activitySubName !== activityName && (
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 italic block mt-0.5 pl-[2px] whitespace-normal break-words">
                          {activitySubName}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Weight */}
                <td className="px-2 py-2 text-center font-mono text-neutral-500 dark:text-neutral-400 text-[10px]">
                  {item.weight ? `${item.weight.toFixed(1)}%` : "0.0%"}
                </td>

                {/* Start Date */}
                <td className="px-3 py-2">
                  {hasChildren ? (
                    <span className="text-neutral-400 italic text-[10px]">—</span>
                  ) : (
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange(item.code, e.target.value, durationDays)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-0.5 text-[10px] text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red font-mono"
                    />
                  )}
                </td>

                {/* Finish Date */}
                <td className="px-3 py-2">
                  {hasChildren ? (
                    <span className="text-neutral-400 italic text-[10px]">—</span>
                  ) : (
                    <span className="font-mono text-[10px] text-neutral-800 dark:text-neutral-300 font-semibold px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900/60 rounded border border-neutral-200/40 dark:border-neutral-800">
                      {formattedEndDate}
                    </span>
                  )}
                </td>

                {/* Duration */}
                <td className="px-3 py-2">
                  {hasChildren ? (
                    <span className="text-neutral-400 italic text-[10px] text-center block">—</span>
                  ) : (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        min="1"
                        value={durationDays || ""}
                        onChange={(e) => handleDateChange(item.code, startDate, Number(e.target.value))}
                        className="w-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-0.5 text-center text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red font-mono font-semibold text-[10px]"
                        placeholder="Days"
                      />
                      <span className="text-[9px] text-neutral-400">hns</span>
                    </div>
                  )}
                </td>

                {/* Calendar */}
                <td className="px-3 py-2">
                  {hasChildren ? (
                    <span className="text-neutral-400 italic text-[10px]">—</span>
                  ) : (
                    <select
                      value={calendar}
                      onChange={(e) => onUpdate(item.code, "calendarMode", e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-brand-red cursor-pointer"
                    >
                      <option value="6-Days">6-Days Work</option>
                      <option value="Normal">Normal (5-Days)</option>
                      <option value="7-Days">7-Days Work</option>
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
