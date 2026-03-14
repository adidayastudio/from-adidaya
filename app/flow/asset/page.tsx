"use client";

import { useState } from "react";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Box, MapPin, Wrench, TrendingDown, AlertTriangle, User, Users, CheckCircle } from "lucide-react";
import clsx from "clsx";

const MOCK_TEAM = { total: 156, allocated: 132, available: 24, maintenance: 8, totalValue: 2850000000 };
const MOCK_PERSONAL = { assigned: 5, totalValue: 45000000 };

const MOCK_RECENT = [
  { id: "AST-001", name: "Excavator CAT 320", location: "Rumah Pak Budi", status: "In Use" },
  { id: "AST-002", name: "Concrete Mixer", location: "Gudang Utama", status: "Available" },
  { id: "AST-003", name: "Generator 50KVA", location: "Villa Puncak", status: "Maintenance" },
];

const MOCK_ALERTS = [
  { type: "warning", title: "Maintenance Due", message: "Excavator CAT 320 due for service in 3 days" },
  { type: "info", title: "Asset Return", message: "2 assets returning from Renovasi Kantor project" },
];

function formatShort(n: number) { return n >= 1000000000 ? `${(n / 1000000000).toFixed(1)}B` : n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-white/40 dark:bg-neutral-800/20 backdrop-blur-md rounded-2xl border border-white/40 dark:border-neutral-700/30 p-5 hover:border-red-200 dark:hover:border-red-900/40 transition-all group scale-100 active:scale-[0.98]">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
          {icon}
        </div>
      </div>
      <div className="text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">{value}</div>
      {subtext && <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { 
    "In Use": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/20", 
    Available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/20", 
    Maintenance: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/20" 
  };
  return <span className={clsx("px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize", colors[status])}>{status}</span>;
}

export default function AssetOverviewPage() {
  const [viewMode, setViewMode] = useState<"personal" | "team">("team");

  const header = (
    <StandardPageHeader
      title="Asset Overview"
      subtitle="Manage company assets, allocation, and maintenance."
      action={
        <div className="flex items-center bg-white/20 dark:bg-neutral-800/20 backdrop-blur-md rounded-full p-1 border border-white/40 dark:border-neutral-700/30">
          <button 
            onClick={() => setViewMode("personal")} 
            className={clsx("flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all text-nowrap", viewMode === "personal" ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300")}
          >
            <User className="w-3.5 h-3.5" /> Personal
          </button>
          <button 
            onClick={() => setViewMode("team")} 
            className={clsx("flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all text-nowrap", viewMode === "team" ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300")}
          >
            <Users className="w-3.5 h-3.5" /> Team
          </button>
        </div>
      }
    />
  );

  return (
    <StandardPageWrapper
      breadcrumbItems={[{ label: "Flow" }, { label: "Asset" }, { label: "Overview" }]}
      sidebar={<AssetSidebar />}
      header={header}
      isTransparent
    >
      <div className="space-y-8 w-full animate-in fade-in duration-500">
        {viewMode === "team" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <SummaryCard icon={<Box className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-500/10" label="Total Assets" value={String(MOCK_TEAM.total)} subtext="All items" />
              <SummaryCard icon={<MapPin className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-500/10" label="Allocated" value={String(MOCK_TEAM.allocated)} subtext="In projects" />
              <SummaryCard icon={<CheckCircle className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-500/10" label="Available" value={String(MOCK_TEAM.available)} subtext="Ready to use" />
              <SummaryCard icon={<Wrench className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-500/10" label="Maintenance" value={String(MOCK_TEAM.maintenance)} subtext="Under repair" />
              <SummaryCard icon={<TrendingDown className="w-5 h-5 text-red-600" />} iconBg="bg-red-500/10" label="Total Value" value={formatShort(MOCK_TEAM.totalValue)} subtext="Book value" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/30 dark:bg-neutral-900/20 backdrop-blur-sm rounded-3xl border border-white/40 dark:border-neutral-700/30 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 uppercase tracking-wider">Recent Assets</h3>
                <div className="divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
                  {MOCK_RECENT.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">{a.name}</div>
                        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{a.id} · {a.location}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/30 dark:bg-neutral-900/20 backdrop-blur-sm rounded-3xl border border-white/40 dark:border-neutral-700/30 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Alerts</h3>
                </div>
                <div className="space-y-3">
                  {MOCK_ALERTS.map((a, i) => (
                    <div key={i} className={clsx("p-4 rounded-2xl border transition-all", a.type === "warning" ? "bg-orange-500/10 border-orange-200/20" : "bg-blue-500/10 border-blue-200/20")}>
                      <div className={clsx("font-bold text-[12px] uppercase tracking-wide", a.type === "warning" ? "text-orange-700 dark:text-orange-400" : "text-blue-700 dark:text-blue-400")}>{a.title}</div>
                      <div className={clsx("text-sm font-medium mt-1", a.type === "warning" ? "text-orange-900 dark:text-orange-200/70" : "text-blue-900 dark:text-blue-200/70")}>{a.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SummaryCard icon={<Box className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-500/10" label="My Assigned Assets" value={String(MOCK_PERSONAL.assigned)} subtext="Currently using" />
              <SummaryCard icon={<TrendingDown className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-500/10" label="Total Value" value={formatShort(MOCK_PERSONAL.totalValue)} subtext="Asset value" />
            </div>
            <div className="bg-white/30 dark:bg-neutral-900/20 backdrop-blur-sm rounded-3xl border border-white/40 dark:border-neutral-700/30 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 uppercase tracking-wider">My Assets</h3>
              <div className="divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
                <div className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                  <span className="font-semibold text-neutral-900 dark:text-white">Laptop Dell XPS 15</span>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Since Jan 2024</span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <span className="font-semibold text-neutral-900 dark:text-white">iPhone 15 Pro</span>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Since Mar 2024</span>
                </div>
                <div className="flex justify-between items-center py-4 last:pb-0">
                  <span className="font-semibold text-neutral-900 dark:text-white">Safety Equipment Kit</span>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Since Jan 2025</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardPageWrapper>
  );
}
