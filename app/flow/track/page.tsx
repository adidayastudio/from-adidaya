"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import TrackSidebar from "@/components/flow/track/TrackSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { TrendingUp, AlertCircle, ClipboardCheck, Image, User, Users, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";

const MOCK_TEAM = { projects: 8, onTrack: 5, delayed: 2, atRisk: 1, completionRate: 68 };
const MOCK_PERSONAL = { myProjects: 3, tasksCompleted: 24, issuesReported: 5 };

const MOCK_PROJECTS = [
  { name: "Rumah Pak Budi", progress: 75, status: "On Track" },
  { name: "Villa Puncak", progress: 45, status: "Delayed" },
  { name: "Renovasi Kantor", progress: 90, status: "On Track" },
];

const MOCK_ALERTS = [
  { type: "warning", title: "Delayed", message: "Villa Puncak behind schedule by 5 days" },
  { type: "info", title: "Inspection Due", message: "Foundation inspection for Rumah Pak Budi tomorrow" },
];

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-white rounded-xl border p-5 hover:border-red-200 transition-colors">
      <div className="flex items-start justify-between mb-3"><div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>{icon}</div></div>
      <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      {subtext && <div className="text-xs text-neutral-400 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { "On Track": "bg-green-50 text-green-700", Delayed: "bg-orange-50 text-orange-700", "At Risk": "bg-red-50 text-red-700" };
  return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function TrackOverviewPage() {
  const [viewMode, setViewMode] = useState<"personal" | "team">("team");

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb items={[{ label: "Flow" }, { label: "Track" }, { label: "Overview" }]} />
      <PageWrapper sidebar={<TrackSidebar />}>
        <div className="space-y-8 w-full animate-in fade-in duration-500">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Track Overview</h1>
                <p className="text-sm text-neutral-500 mt-1">Monitor project progress, issues, and inspections.</p>
              </div>
              <div className="flex items-center bg-neutral-100 rounded-full p-1">
                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
              </div>
            </div>
            <div className="border-b border-neutral-200" />
          </div>

          {viewMode === "team" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="Active Projects" value={String(MOCK_TEAM.projects)} subtext="Being tracked" />
                <SummaryCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="On Track" value={String(MOCK_TEAM.onTrack)} subtext="Healthy progress" />
                <SummaryCard icon={<Clock className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Delayed" value={String(MOCK_TEAM.delayed)} subtext="Behind schedule" />
                <SummaryCard icon={<AlertCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" label="At Risk" value={String(MOCK_TEAM.atRisk)} subtext="Needs attention" />
                <SummaryCard icon={<TrendingUp className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="Avg Completion" value={`${MOCK_TEAM.completionRate}%`} subtext="Overall progress" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Project Status</h3>
                  {MOCK_PROJECTS.map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1"><div className="font-medium">{p.name}</div><div className="w-full h-2 bg-neutral-100 rounded-full mt-2"><div className="h-full bg-red-500 rounded-full" style={{ width: `${p.progress}%` }} /></div></div>
                      <div className="ml-4 text-right"><div className="font-medium">{p.progress}%</div><StatusBadge status={p.status} /></div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Alerts</h3></div>
                  <div className="space-y-3">{MOCK_ALERTS.map((a, i) => (
                    <div key={i} className={clsx("p-4 rounded-xl border", a.type === "warning" ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200")}>
                      <div className={clsx("font-medium text-sm", a.type === "warning" ? "text-orange-900" : "text-blue-900")}>{a.title}</div>
                      <div className={clsx("text-sm", a.type === "warning" ? "text-orange-700" : "text-blue-700")}>{a.message}</div>
                    </div>
                  ))}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="My Projects" value={String(MOCK_PERSONAL.myProjects)} subtext="Assigned" />
                <SummaryCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Tasks Done" value={String(MOCK_PERSONAL.tasksCompleted)} subtext="This month" />
                <SummaryCard icon={<AlertCircle className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Issues Reported" value={String(MOCK_PERSONAL.issuesReported)} subtext="By me" />
              </div>
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-4">My Assigned Projects</h3>
                {MOCK_PROJECTS.slice(0, 2).map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="font-medium">{p.name}</div><div className="font-medium">{p.progress}%</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}
