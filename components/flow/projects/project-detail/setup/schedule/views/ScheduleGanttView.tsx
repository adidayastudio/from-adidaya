import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { WeightedItem, ScheduleValue } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";
import { Input } from "@/shared/ui/primitives/input/input";

/* ================= PROPS ================= */

type Props = {
  items: WeightedItem[];
  onUpdate: (code: string, field: keyof ScheduleValue, value: any) => void;
};

/* ================= CONFIG ================= */

const PX_PER_DAY = 3;
const ROW_HEIGHT = 42;
const LABEL_WIDTH = 450; // Increased for Columns

const PROJECT_START = new Date("2026-01-01"); // Fixed start for now

/* ================= HELPERS ================= */

function daysFromStart(dateStr?: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((d.getTime() - PROJECT_START.getTime()) / 86400000);
}

function addDays(dateStr: string | undefined, days: number): string {
  const start = dateStr ? new Date(dateStr) : PROJECT_START;
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end.toISOString().split("T")[0];
}

/* ================= COMPONENT ================= */

export default function ScheduleGanttView({ items, onUpdate }: Props) {
  // Config
  const totalDuration = 180; // Fixed view range for now
  const timelineWidth = totalDuration * PX_PER_DAY;

  // Collapse State
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (code: string) => {
    setExpanded(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Flatten logic? Or Recursive Rendering?
  // Let's do Recursive Rendering for the Table, but we need to align rows with the Gantt bars.
  // Standard approach: Flatten the list respecting expanded state.

  const flatItems: { item: WeightedItem; depth: number }[] = [];

  function flatten(nodes: WeightedItem[], depth = 0) {
    nodes.forEach(node => {
      flatItems.push({ item: node, depth });
      // Default expanded for L0, L1
      const isExpanded = expanded[node.code] ?? (depth < 2);
      if (isExpanded && node.children && node.children.length > 0) {
        flatten(node.children as WeightedItem[], depth + 1);
      }
    });
  }

  flatten(items);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun"
  ];

  return (
    <div className="relative w-full border border-neutral-200 rounded-lg overflow-hidden flex flex-col">

      {/* HEADER ROW */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
        <div className="shrink-0 flex divide-x divide-neutral-200" style={{ width: LABEL_WIDTH }}>
          <div className="flex-1 px-4 py-3">Task Name</div>
          <div className="w-16 px-2 py-3 text-center">Wgt (%)</div>
          <div className="w-24 px-2 py-3 text-center">Start</div>
          <div className="w-16 px-2 py-3 text-center">Dur</div>
        </div>

        {/* TIMELINE HEADER */}
        <div className="overflow-hidden flex-1 relative">
          <div className="flex whitespace-nowrap">
            {months.map((m, i) => (
              <div key={m} className="border-l border-neutral-200 px-2 py-3 text-center" style={{ width: 30 * PX_PER_DAY }}>
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BODY SCROLL */}
      <div className="overflow-auto max-h-[600px] flex">

        {/* LEFT TABLE */}
        <div className="shrink-0 border-r border-neutral-200 bg-white" style={{ width: LABEL_WIDTH }}>
          {flatItems.map(({ item, depth }) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded[item.code] ?? (depth < 2);

            return (
              <div
                key={item.code}
                className="flex items-center border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                {/* NAME COL */}
                <div className="flex-1 px-4 flex items-center overflow-hidden">
                  <div style={{ width: depth * 16 }} className="shrink-0" />
                  <button
                    onClick={() => hasChildren && toggle(item.code)}
                    className={`mr-1 p-0.5 rounded hover:bg-neutral-200 ${hasChildren ? "visible" : "invisible"}`}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  <span className={`truncate text-sm ${depth === 0 ? "font-bold" : "font-medium"} text-neutral-700`}>
                    {item.nameEn}
                  </span>
                </div>

                {/* WEIGHT COL */}
                <div className="w-16 px-2 text-center text-xs text-neutral-500 border-l border-neutral-100">
                  {item.weight > 0 ? item.weight.toFixed(1) : "-"}%
                </div>

                {/* START DATE INPUT */}
                <div className="w-24 px-1 border-l border-neutral-100">
                  {/* Only leaf nodes or specific parents editable? Ideally all. */}
                  <input
                    type="date"
                    className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 text-center text-neutral-600"
                    value={item.schedule?.start || ""}
                    onChange={(e) => onUpdate(item.code, "start", e.target.value)}
                  />
                </div>

                {/* DURATION INPUT */}
                <div className="w-16 px-1 border-l border-neutral-100">
                  <input
                    type="number"
                    className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 text-center text-neutral-600"
                    placeholder="-"
                    value={item.schedule?.duration || ""}
                    onChange={(e) => onUpdate(item.code, "duration", Number(e.target.value))}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* RIGHT GANTT */}
        <div className="flex-1 overflow-x-auto relative bg-white">
          <div className="relative" style={{ width: timelineWidth, height: flatItems.length * ROW_HEIGHT }}>
            {/* GRID LINES */}
            {Array.from({ length: totalDuration / 7 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-neutral-50"
                style={{ left: i * 7 * PX_PER_DAY }}
              />
            ))}

            {/* BARS */}
            {flatItems.map(({ item, depth }, i) => {
              const startDay = daysFromStart(item.schedule?.start);
              const duration = item.schedule?.duration || 0;

              if (!duration) return null;

              return (
                <div
                  key={item.code}
                  className={`absolute rounded-full h-4 top-0 transition-all ${depth === 0 ? "bg-neutral-800" : "bg-blue-500/80"}`}
                  style={{
                    left: startDay * PX_PER_DAY,
                    width: Math.max(duration * PX_PER_DAY, 4), // min width
                    top: i * ROW_HEIGHT + 12,
                    opacity: 0.8
                  }}
                >
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
