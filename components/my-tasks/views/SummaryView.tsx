"use client";

import clsx from "clsx";
import { TrendingUp, TrendingDown, Target, Calendar, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export default function SummaryView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* KPI CARDS - This Week + This Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="This Week"
          completed={3}
          total={15}
          percent={20}
          trend="down"
          color="red"
        />
        <KPICard
          title="This Month"
          completed={18}
          total={72}
          percent={25}
          trend="up"
          color="emerald"
        />
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Today" value={4} icon={<Calendar className="w-4 h-4" />} color="blue" />
        <StatCard label="Overdue" value={5} icon={<AlertTriangle className="w-4 h-4" />} color="red" />
        <StatCard label="In Progress" value={6} icon={<Clock className="w-4 h-4" />} color="orange" />
        <StatCard label="Completed" value={9} icon={<CheckCircle2 className="w-4 h-4" />} color="green" />
        <StatCard label="Total" value={24} icon={<Target className="w-4 h-4" />} color="neutral" />
      </div>

      {/* STATUS BREAKDOWN */}
      <Section title="By Status">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <MiniCard label="Not Started" value={8} color="gray" />
          <MiniCard label="In Progress" value={6} color="blue" />
          <MiniCard label="On Hold" value={2} color="orange" />
          <MiniCard label="For Review" value={3} color="yellow" />
          <MiniCard label="Waiting" value={1} color="purple" />
          <MiniCard label="Completed" value={9} color="green" />
        </div>
      </Section>

      {/* PRIORITY BREAKDOWN */}
      <Section title="By Priority">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniCard label="Urgent" value={3} color="red" />
          <MiniCard label="High" value={5} color="orange" />
          <MiniCard label="Medium" value={7} color="blue" />
          <MiniCard label="Low" value={4} color="gray" />
        </div>
      </Section>

      {/* TYPE BREAKDOWN */}
      <Section title="By Type">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <MiniCard label="Task" value={10} />
          <MiniCard label="Review" value={3} />
          <MiniCard label="Approval" value={2} color="violet" />
          <MiniCard label="Revision" value={4} color="orange" />
          <MiniCard label="Site Issue" value={1} color="red" />
          <MiniCard label="Report" value={2} color="blue" />
        </div>
      </Section>
    </div>
  );
}

/* ======================
   KPI CARD (Prominent)
====================== */
function KPICard({
  title,
  completed,
  total,
  percent,
  trend,
  color,
}: {
  title: string;
  completed: number;
  total: number;
  percent: number;
  trend: "up" | "down";
  color: "red" | "emerald" | "orange" | "blue";
}) {
  const colorMap = {
    red: { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", progress: "bg-red-500" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", progress: "bg-emerald-500" },
    orange: { bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-600", progress: "bg-orange-500" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", progress: "bg-blue-500" },
  };
  const c = colorMap[color];

  return (
    <div className={clsx("rounded-xl border p-5", c.bg, c.border)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-neutral-700">{title}</span>
        <div className={clsx("flex items-center gap-1 text-xs font-bold", trend === "up" ? "text-emerald-600" : "text-red-600")}>
          {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {percent}%
        </div>
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className={clsx("text-3xl font-bold", c.text)}>{completed}</span>
        <span className="text-neutral-400 text-lg font-medium">/ {total}</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-white/80 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", c.progress)} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-neutral-500 mt-2">{percent}% completed</p>
    </div>
  );
}

/* ======================
   STAT CARD
====================== */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "red" | "orange" | "green" | "neutral";
}) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-emerald-100 text-emerald-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
      <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", colorMap[color])}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

/* ======================
   SECTION + MINI CARD
====================== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function MiniCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "gray" | "blue" | "orange" | "yellow" | "purple" | "green" | "red" | "violet";
}) {
  const colorMap: Record<string, string> = {
    gray: "bg-neutral-100 text-neutral-600",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
    default: "bg-white text-neutral-800 border border-neutral-200",
  };

  return (
    <div className={clsx("rounded-xl p-4 cursor-pointer transition hover:shadow-sm", colorMap[color || "default"])}>
      <div className="text-xl font-bold leading-tight">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );
}
