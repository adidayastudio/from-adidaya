"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
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
    <div className="bg-white rounded-xl border p-5 hover:border-red-200 transition-colors">
      <div className="flex items-start justify-between mb-3"><div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>{icon}</div></div>
      <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      {subtext && <div className="text-xs text-neutral-400 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { "In Use": "bg-blue-50 text-blue-700", Available: "bg-green-50 text-green-700", Maintenance: "bg-orange-50 text-orange-700" };
  return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function AssetOverviewPage() {
  const [viewMode, setViewMode] = useState<"personal" | "team">("team");

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Overview" }]} />
      <PageWrapper sidebar={<AssetSidebar />}>
        <div className="space-y-8 w-full animate-in fade-in duration-500">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Asset Overview</h1>
                <p className="text-sm text-neutral-500 mt-1">Manage company assets, allocation, and maintenance.</p>
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
                <SummaryCard icon={<Box className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="Total Assets" value={String(MOCK_TEAM.total)} subtext="All items" />
                <SummaryCard icon={<MapPin className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Allocated" value={String(MOCK_TEAM.allocated)} subtext="In projects" />
                <SummaryCard icon={<CheckCircle className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="Available" value={String(MOCK_TEAM.available)} subtext="Ready to use" />
                <SummaryCard icon={<Wrench className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Maintenance" value={String(MOCK_TEAM.maintenance)} subtext="Under repair" />
                <SummaryCard icon={<TrendingDown className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" label="Total Value" value={formatShort(MOCK_TEAM.totalValue)} subtext="Book value" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Recent Assets</h3>
                  {MOCK_RECENT.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div><div className="font-medium">{a.name}</div><div className="text-sm text-neutral-500">{a.id} · {a.location}</div></div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Alerts</h3></div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SummaryCard icon={<Box className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="My Assigned Assets" value={String(MOCK_PERSONAL.assigned)} subtext="Currently using" />
                <SummaryCard icon={<TrendingDown className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Total Value" value={formatShort(MOCK_PERSONAL.totalValue)} subtext="Asset value" />
              </div>
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-4">My Assets</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span>Laptop Dell XPS 15</span><span className="text-sm text-neutral-500">Since Jan 2024</span></div>
                  <div className="flex justify-between py-2 border-b"><span>iPhone 15 Pro</span><span className="text-sm text-neutral-500">Since Mar 2024</span></div>
                  <div className="flex justify-between py-2"><span>Safety Equipment Kit</span><span className="text-sm text-neutral-500">Since Jan 2025</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}
