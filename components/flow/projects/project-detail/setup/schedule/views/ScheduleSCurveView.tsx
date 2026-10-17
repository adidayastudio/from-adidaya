"use client";

import React, { useMemo, useState } from "react";
import { WeightedItem } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

type Props = {
  items: WeightedItem[];
  timeScale?: "weekly" | "monthly";
};

type CurvePoint = {
  index: number;
  label: string;
  dateLabel: string;
  planned: number; // % added in this period
  cumulative: number; // % total end of this period
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function ScheduleSCurveView({ items, timeScale = "weekly" }: Props) {

  // 1. CALCULATE CURVE DATA
  const { points, startDate } = useMemo(() => {
    let minStart = new Date().getTime();
    let hasData = false;

    function findStart(node: WeightedItem) {
      const startStr = node.schedule?.startDate;
      if (startStr) {
        const t = new Date(startStr).getTime();
        if (!isNaN(t)) {
          minStart = Math.min(minStart, t);
          hasData = true;
        }
      }
      if (node.children) (node.children as WeightedItem[]).forEach(findStart);
    }

    items.forEach(findStart);

    if (!hasData) return { points: [], startDate: null };

    // Align start to nearest Monday
    const projectStart = getMonday(new Date(minStart));

    const MAX_DAYS = 730; // 2 years buffer
    const dailyWeights = new Array(MAX_DAYS).fill(0);
    let maxDayIndex = 0;

    function processNode(node: WeightedItem) {
      if (node.children && node.children.length > 0) {
        (node.children as WeightedItem[]).forEach(processNode);
        return;
      }

      // Leaf Node
      const startStr = node.schedule?.startDate;
      const dur = node.schedule?.durationDays || 0;
      const weight = node.weight || 0;

      if (startStr && dur > 0 && weight > 0) {
        const t = new Date(startStr).getTime();
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

    const curvePoints: CurvePoint[] = [];
    let cumulative = 0;

    if (timeScale === "weekly") {
      const totalWeeks = Math.ceil((maxDayIndex + 1) / 7) + 2;
      for (let w = 1; w <= totalWeeks; w++) {
        let weekSum = 0;
        for (let d = 0; d < 7; d++) {
          const dayIdx = (w - 1) * 7 + d;
          if (dayIdx < MAX_DAYS) {
            weekSum += dailyWeights[dayIdx];
          }
        }
        cumulative += weekSum;

        const weekStartDate = addDays(projectStart, (w - 1) * 7);

        curvePoints.push({
          index: w,
          label: `W${w}`,
          dateLabel: formatDateLabel(weekStartDate),
          planned: weekSum,
          cumulative: Math.min(cumulative, 100)
        });
      }
    } else {
      // Monthly Scale - Generate 12 months dynamically
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(projectStart.getFullYear(), projectStart.getMonth() + m, 1);
        const mEnd = new Date(projectStart.getFullYear(), projectStart.getMonth() + m + 1, 0);
        
        const mStartDay = Math.floor((mStart.getTime() - projectStart.getTime()) / 86400000);
        const mEndDay = Math.floor((mEnd.getTime() - projectStart.getTime()) / 86400000);

        let monthSum = 0;
        for (let dayIdx = mStartDay; dayIdx <= mEndDay; dayIdx++) {
          if (dayIdx >= 0 && dayIdx < MAX_DAYS) {
            monthSum += dailyWeights[dayIdx];
          }
        }
        cumulative += monthSum;

        curvePoints.push({
          index: m + 1,
          label: mStart.toLocaleDateString("id-ID", { month: "short" }),
          dateLabel: mStart.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
          planned: monthSum,
          cumulative: Math.min(cumulative, 100)
        });
      }
    }

    return { points: curvePoints, startDate: projectStart };

  }, [items, timeScale]);

  // If no data
  if (!startDate || points.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/10">
        <div className="text-neutral-400 font-medium text-sm mb-2">No Schedule Data Available</div>
        <p className="text-neutral-500 text-xs text-center max-w-sm">
          Please go to the <b>Timeline</b> or <b>Gantt</b> tab and set the <b>Start Date</b> and <b>Duration</b> for your tasks. The S-Curve will be generated automatically based on cost weights.
        </p>
      </div>
    );
  }

  const MIN_VISIBLE_COLS = 12;
  const STEP_X = timeScale === "weekly" ? 80 : 100; // px per period column
  const P = { top: 40, right: 30, bottom: 85, left: 60 };

  const colsCount = Math.max(points.length, MIN_VISIBLE_COLS);
  const svgW = P.left + P.right + (colsCount - 1) * STEP_X + 60;
  const plotH = 300;
  const svgH = plotH + P.top + P.bottom;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const coords = useMemo(() => {
    return points.map((d, i) => {
      const px = P.left + i * STEP_X;
      const py = P.top + (1 - d.cumulative / 100) * plotH;
      return { ...d, x: px, y: py };
    });
  }, [points, plotH, STEP_X]);

  const pathD = useMemo(() => {
    return coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [coords]);

  const fmt = (n: number) => n.toFixed(1) + "%";
  const hoverPoint = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="mb-4 text-xs font-bold text-neutral-900 dark:text-neutral-200 flex justify-between items-center uppercase tracking-wider">
        <span>Planned Progress (S-Curve)</span>
        <span className="text-[10px] font-normal text-neutral-450 uppercase">Scale: {timeScale}</span>
      </div>

      <div className="w-full overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900/30 p-2 shadow-inner">
        <div className="relative" style={{ width: svgW }}>

          {/* TOOLTIP */}
          {hoverPoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs shadow-md"
              style={{
                left: hoverPoint.x + 10,
                top: hoverPoint.y - 65,
                width: 170,
              }}
            >
              <div className="font-bold text-neutral-900 dark:text-white mb-1">
                {timeScale === "weekly" ? `Week ${hoverPoint.index}` : hoverPoint.label}
                <span className="text-neutral-450 font-normal ml-1">({hoverPoint.dateLabel})</span>
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 flex justify-between"><span>Planned:</span> <span>{fmt(hoverPoint.planned)}</span></div>
              <div className="text-brand-red font-semibold flex justify-between border-t border-neutral-100 dark:border-neutral-700 mt-1 pt-1"><span>Cumulative:</span> <span>{fmt(hoverPoint.cumulative)}</span></div>
            </div>
          )}

          <svg width={svgW} height={svgH} className="select-none">
            {/* GRID Y */}
            {[0, 20, 40, 60, 80, 100].map(val => {
              const y = P.top + (1 - val / 100) * plotH;
              return (
                <g key={val}>
                  <line x1={P.left} x2={svgW - P.right} y1={y} y2={y} stroke="#f3f4f6" className="dark:stroke-neutral-800" />
                  <text x={P.left - 10} y={y + 4} fontSize={10} textAnchor="end" fill="#9ca3af">{val}%</text>
                </g>
              )
            })}

            {/* BASELINES */}
            <line x1={P.left} x2={P.left} y1={P.top} y2={P.top + plotH} stroke="#d1d5db" className="dark:stroke-neutral-700" />
            <line x1={P.left} x2={svgW - P.right} y1={P.top + plotH} y2={P.top + plotH} stroke="#d1d5db" className="dark:stroke-neutral-700" />

            {/* CURVE */}
            <path d={pathD} fill="none" stroke="#dc2626" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

            {/* POINTS */}
            {coords.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={hoverIdx === i ? 6 : 3.5}
                fill={hoverIdx === i ? "#dc2626" : "#ffffff"}
                stroke="#dc2626" strokeWidth={2}
                className="cursor-pointer transition-all hover:r-6"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}

            {/* X LABELS */}
            {coords.map((p, i) => (
              <g key={i}>
                <line x1={p.x} x2={p.x} y1={P.top + plotH} y2={P.top + plotH + 6} stroke="#e5e7eb" className="dark:stroke-neutral-800" />
                <text x={p.x} y={P.top + plotH + 20} fontSize={10} textAnchor="middle" fill="#6b7280" className="dark:fill-neutral-400" fontWeight="bold">
                  {timeScale === "weekly" ? `W${p.index}` : p.label}
                </text>
                <text x={p.x} y={P.top + plotH + 34} fontSize={8} textAnchor="middle" fill="#9ca3af">{timeScale === "weekly" ? p.dateLabel : ""}</text>
                <text x={p.x} y={P.top + plotH + 46} fontSize={9} textAnchor="middle" fill="#dc2626" fontWeight="bold">{fmt(p.cumulative)}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
