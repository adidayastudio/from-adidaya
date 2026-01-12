"use client";

import React, { useMemo, useState } from "react";
import { WeightedItem } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

/* ================= TYPES ================= */

type Props = {
  items: WeightedItem[];
};

type WeeklyPoint = {
  week: number;
  dateLabel: string;
  planned: number; // % added this week
  cumulative: number; // % total end of this week
};

// Removed fixed PROJECT_START constant - will derive from data

/* ================= HELPERS ================= */

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ================= COMPONENT ================= */

export default function ScheduleSCurveView({ items }: Props) {

  // 1. CALCULATE CURVE DATA
  const { points, startDate } = useMemo(() => {
    // Find Earliest Start Date
    let minStart = new Date().getTime(); // Default now
    let hasData = false;

    function findStart(node: WeightedItem) {
      if (node.schedule?.start) {
        const t = new Date(node.schedule.start).getTime();
        if (!isNaN(t)) {
          minStart = Math.min(minStart, t);
          hasData = true;
        }
      }
      if (node.children) (node.children as WeightedItem[]).forEach(findStart);
    }

    items.forEach(findStart);

    if (!hasData) return { points: [], startDate: null };

    // Normalize Start Date to Start of that Week (or exact day?)
    // Let's stick to exact day for calculation, but align weeks visually.
    const projectStart = new Date(minStart);

    const MAX_DAYS = 730; // 2 years buffer
    const dailyWeights = new Array(MAX_DAYS).fill(0);
    let maxDayIndex = 0;

    function processNode(node: WeightedItem) {
      if (node.children && node.children.length > 0) {
        (node.children as WeightedItem[]).forEach(processNode);
        return;
      }

      // Leaf Node
      const startStr = node.schedule?.start;
      const dur = node.schedule?.duration || 0;
      const weight = node.weight || 0;

      if (startStr && dur > 0 && weight > 0) {
        const t = new Date(startStr).getTime();
        // Days from project start
        const startDay = Math.floor((t - projectStart.getTime()) / 86400000);

        if (startDay >= 0) {
          const weightPerDay = weight / dur;
          for (let i = 0; i < dur; i++) {
            if (startDay + i < MAX_DAYS) {
              dailyWeights[startDay + i] += weightPerDay;
              maxDayIndex = Math.max(maxDayIndex, startDay + i);
            }
          }
        }
      }
    }

    items.forEach(processNode);

    // Aggregate to Weekly
    const weeklyPoints: WeeklyPoint[] = [];
    let cumulative = 0;
    const totalWeeks = Math.ceil((maxDayIndex + 1) / 7) + 4; // + buffer

    for (let w = 1; w <= totalWeeks; w++) {
      let weekSum = 0;
      for (let d = 0; d < 7; d++) {
        const dayIdx = (w - 1) * 7 + d;
        if (dayIdx < MAX_DAYS) {
          weekSum += dailyWeights[dayIdx];
        }
      }
      cumulative += weekSum;

      // Current Week Label
      const weekStartDate = addDays(projectStart, (w - 1) * 7);

      weeklyPoints.push({
        week: w,
        dateLabel: formatDateLabel(weekStartDate),
        planned: weekSum,
        cumulative: Math.min(cumulative, 100)
      });
    }

    return { points: weeklyPoints, startDate: projectStart };

  }, [items]);

  // If no data
  if (!startDate || points.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
        <div className="text-neutral-400 font-medium text-sm mb-2">No Schedule Data Available</div>
        <p className="text-neutral-500 text-xs text-center max-w-sm">
          Please go to the <b>Gantt View</b> and set the <b>Start Date</b> and <b>Duration</b> for your tasks. The S-Curve will be generated automatically based on cost weights.
        </p>
      </div>
    );
  }


  /* ===== UI constants ===== */
  const MIN_VISIBLE_WEEKS = 12;
  const STEP_X = 80; // px per week
  const MAX_CHART_H = 500;
  const MIN_CHART_H = 300;

  // Layout
  const P = { top: 40, right: 30, bottom: 80, left: 60 };

  // compute width
  const weeks = Math.max(points.length, MIN_VISIBLE_WEEKS);
  const svgW = P.left + P.right + (weeks - 1) * STEP_X + 60;

  const computedH = 400;
  const svgH = computedH + P.top + P.bottom;
  const plotH = computedH;
  const plotW = svgW - P.left - P.right;

  // Tooltip
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Points coords
  const coords = useMemo(() => {
    return points.map((d, i) => {
      // x position based on week index
      const px = P.left + i * STEP_X;
      const py = P.top + (1 - d.cumulative / 100) * plotH;
      return { ...d, x: px, y: py };
    });
  }, [points, plotH]);

  const pathD = useMemo(() => {
    return coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [coords]);

  const fmt = (n: number) => n.toFixed(1) + "%";
  const hoverPoint = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-semibold text-neutral-900 flex justify-between items-center">
        <span>Planned Progress (S-Curve)</span>
        <span className="text-xs font-normal text-neutral-500">Starts: {startDate.toLocaleDateString()}</span>
      </div>

      <div className="w-full overflow-x-auto border border-neutral-200 rounded-lg bg-white">
        <div className="relative" style={{ width: svgW }}>

          {/* TOOLTIP */}
          {hoverPoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{
                left: hoverPoint.x + 10,
                top: hoverPoint.y - 60,
                width: 160,
              }}
            >
              <div className="font-medium text-neutral-900 mb-1">Week {hoverPoint.week} <span className="text-neutral-400 font-normal">({hoverPoint.dateLabel})</span></div>
              <div className="text-neutral-500 flex justify-between"><span>Planned:</span> <span>{fmt(hoverPoint.planned)}</span></div>
              <div className="text-brand-500 font-semibold flex justify-between border-t border-neutral-100 mt-1 pt-1"><span>Cumulative:</span> <span>{fmt(hoverPoint.cumulative)}</span></div>
            </div>
          )}

          <svg width={svgW} height={svgH} className="select-none">

            {/* GRID Y */}
            {[0, 20, 40, 60, 80, 100].map(val => {
              const y = P.top + (1 - val / 100) * plotH;
              return (
                <g key={val}>
                  <line x1={P.left} x2={svgW - P.right} y1={y} y2={y} stroke="#f3f4f6" />
                  <text x={P.left - 10} y={y + 4} fontSize={10} textAnchor="end" fill="#9ca3af">{val}%</text>
                </g>
              )
            })}

            {/* BASILINES */}
            <line x1={P.left} x2={P.left} y1={P.top} y2={P.top + plotH} stroke="#d1d5db" />
            <line x1={P.left} x2={svgW - P.right} y1={P.top + plotH} y2={P.top + plotH} stroke="#d1d5db" />

            {/* CURVE */}
            <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

            {/* POINTS */}
            {coords.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={hoverIdx === i ? 6 : 3.5}
                fill={hoverIdx === i ? "#2563eb" : "#ffffff"}
                stroke="#2563eb" strokeWidth={2}
                className="cursor-pointer transition-all hover:r-6"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}

            {/* X LABELS */}
            {coords.map((p, i) => (
              <g key={i}>
                <line x1={p.x} x2={p.x} y1={P.top + plotH} y2={P.top + plotH + 6} stroke="#e5e7eb" />
                <text x={p.x} y={P.top + plotH + 20} fontSize={10} textAnchor="middle" fill="#6b7280" fontWeight="500">W{p.week}</text>
                <text x={p.x} y={P.top + plotH + 34} fontSize={9} textAnchor="middle" fill="#9ca3af">{p.dateLabel}</text>
                <text x={p.x} y={P.top + plotH + 48} fontSize={9} textAnchor="middle" fill="#2563eb" fontWeight="500">{fmt(p.cumulative)}</text>
              </g>
            ))}

          </svg>
        </div>
      </div>
    </div>
  );
}
