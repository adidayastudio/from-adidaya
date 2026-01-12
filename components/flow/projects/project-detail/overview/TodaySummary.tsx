"use client";

import { useRouter, useParams } from "next/navigation";
import clsx from "clsx";

/* ================================
   TODAY SUMMARY (PROJECT)
   Refactored for minimal, clean look
================================ */

export default function TodaySummary() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  // dummy data
  const completed = 1;
  const total = 6;

  const dailyProgress = 2.6; // %
  const weeklyProgress = 8.0; // %

  const costToday = 4_590_187;
  const transactions = 5;

  const handleNav = (path: string) => {
    router.push(`/flow/projects/${projectId}/${path}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. EXECUTION -> Activity (Tasks) */}
      <SummaryCard
        title="Execution"
        onClick={() => handleNav("activity?tab=tasks")}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-neutral-900">{completed}</span>
          <span className="text-sm font-medium text-neutral-400">/ {total} tasks</span>
        </div>
        <div className="mt-3 relative h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-amber-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-neutral-500 font-medium">
          <span className="text-amber-600">{total - completed} pending</span> for today
        </p>
      </SummaryCard>

      {/* 2. PROGRESS -> Activity (Approved) */}
      <SummaryCard
        title="Daily Progress"
        onClick={() => handleNav("activity?tab=approved")}
      >
        <div className="flex items-baseline gap-2">
          <span className={clsx("text-3xl font-bold", dailyProgress >= 0 ? "text-neutral-900" : "text-red-600")}>
            {Math.abs(dailyProgress)}%
          </span>
          {dailyProgress >= 0 ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center">↑ On Track</span>
          ) : (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center">↓ Off Track</span>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          vs. expected {(weeklyProgress / 7).toFixed(1)}% daily
        </p>
      </SummaryCard>

      {/* 3. COST -> Tracking (RAB) */}
      <SummaryCard
        title="Cost Today"
        onClick={() => handleNav("tracking?tab=rab")}
      >
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-medium text-neutral-400 -mb-1">Rp</span>
          <span className="text-3xl font-bold text-neutral-900 tracking-tight">{costToday.toLocaleString("id-ID")}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {transactions} transactions approved
        </p>
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
