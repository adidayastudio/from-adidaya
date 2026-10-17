"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type SCurveDataPoint = {
  week: string;
  planned: number;
  actual: number;
};

type Props = {
  data?: SCurveDataPoint[];
  totalWeeks?: number;
};

/**
 * Generate mock S-Curve data when no real data is available.
 * Produces a classic S-shaped cumulative curve.
 */
function generateSCurveData(totalWeeks: number): SCurveDataPoint[] {
  const points: SCurveDataPoint[] = [];
  for (let i = 0; i <= totalWeeks; i++) {
    const t = i / totalWeeks;
    // Classic S-curve using logistic function
    const planned = Number((100 / (1 + Math.exp(-10 * (t - 0.5)))).toFixed(1));
    // Actual: slightly behind planned (realistic scenario)
    const actualT = Math.max(0, t - 0.08);
    const actual = i === 0
      ? 0
      : Number((100 / (1 + Math.exp(-10 * (actualT - 0.5))) * Math.min(1, t * 1.2)).toFixed(1));
    points.push({
      week: `W${i}`,
      planned: Math.min(100, planned),
      actual: Math.min(100, actual),
    });
  }
  return points;
}

export default function SCurveChart({ data, totalWeeks = 24 }: Props) {
  const chartData = useMemo(() => {
    return data && data.length > 0 ? data : generateSCurveData(totalWeeks);
  }, [data, totalWeeks]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">S-Curve — Progress Kumulatif</h3>
          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
            Perbandingan rencana vs realisasi kumulatif
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-neutral-500">Planned</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-neutral-500">Actual</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.06)" }}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontSize: "11px",
                fontWeight: 600,
              }}
              formatter={(value: number) => [`${value}%`]}
              labelStyle={{ fontWeight: 800, color: "#171717" }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              name="Planned"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              strokeDasharray="6 3"
              activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
