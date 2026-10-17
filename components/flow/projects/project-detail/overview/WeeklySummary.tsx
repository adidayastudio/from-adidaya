"use client";

import { useRouter, useParams } from "next/navigation";
import clsx from "clsx";

/* ================================
   WEEKLY SUMMARY (PROJECT)
   Refactored for minimal, clean look
================================ */

export default function WeeklySummary() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  // dummy data
  const planned = 12.5; // %
  const actual = 10.2;  // %
  const deviation = actual - planned;

  const plannedCost = 150_000_000;
  const actualCost = 135_000_000;

  const productivityScore = 92;

  const handleNav = (path: string) => {
    router.push(`/flow/projects/${projectId}/${path}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. WEEKLY PROGRESS -> Tracking Schedule */}
      <SummaryCard
        title="Weekly Progress"
        onClick={() => handleNav("tracking?tab=schedule")}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-neutral-900">{actual}%</span>
          <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded", deviation >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
            {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 relative h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
          {/* Planned marker */}
          <div className="absolute top-0 h-full bg-neutral-300 w-[1px] z-10" style={{ left: `${planned}%` }}></div>
          {/* Actual Bar */}
          <div className="absolute top-0 left-0 h-full rounded-full bg-blue-500" style={{ width: `${actual}%` }} />
        </div>
        <p className="mt-3 text-xs text-neutral-500 font-medium">
          Plan: {planned}% vs Actual: <span className="text-neutral-900">{actual}%</span>
        </p>
      </SummaryCard>

      {/* 2. COST EFFICIENCY -> Tracking RAB */}
      <SummaryCard
        title="Cost Efficiency"
        onClick={() => handleNav("tracking?tab=rab")}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-neutral-900">
            {(actualCost / plannedCost * 100).toFixed(0)}%
          </span>
          <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Under Budget</span>
        </div>
        <p className="mt-3 text-xs text-neutral-500 flex flex-col gap-0.5">
          <span className="flex justify-between w-full">
            <span>Used:</span> <span className="font-medium text-neutral-900">Rp {(actualCost / 1000000).toFixed(0)} jt</span>
          </span>
          <span className="flex justify-between w-full">
            <span>Plan:</span> <span className="font-medium text-neutral-900">Rp {(plannedCost / 1000000).toFixed(0)} jt</span>
          </span>
        </p>
      </SummaryCard>

      {/* 3. PRODUCTIVITY -> Tracking Schedule */}
      <SummaryCard
        title="Productivity"
        onClick={() => handleNav("tracking?tab=schedule")}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-neutral-100" />
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-emerald-500" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * productivityScore) / 100} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-neutral-700">{productivityScore}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900">Excellent</p>
            <p className="text-xs text-neutral-500">Above standard rate</p>
          </div>
        </div>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({ title, children, onClick }: { title: string, children: React.ReactNode, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm hover:shadow-md hover:border-neutral-300/80 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-600 transition-colors">{title}</h4>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1">
          <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
      {children}
    </div>
  )
}
