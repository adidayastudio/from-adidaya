"use client";

import { useState, useEffect } from "react";
import ClientPageWrapper from "@/components/flow/client/ClientPageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Users, MessageSquare, FileSignature, Receipt, AlertTriangle, User, DollarSign, TrendingUp } from "lucide-react";
import clsx from "clsx";

const MOCK_TEAM = { totalClients: 24, activeProjects: 12, pendingContracts: 3, totalRevenue: 2850000000, pendingPayments: 185000000 };
const MOCK_PERSONAL = { myClients: 5, activeProjects: 3, communications: 12 };

const MOCK_RECENT_CLIENTS = [
  { name: "PT Maju Bersama", projects: 3, status: "Active", value: 450000000 },
  { name: "Bapak Sutanto", projects: 1, status: "Active", value: 180000000 },
  { name: "CV Sinar Jaya", projects: 2, status: "Active", value: 320000000 },
];

const MOCK_ALERTS = [
  { type: "warning", title: "Contract Expiring", message: "PT Industrial contract expires in 7 days" },
  { type: "info", title: "Payment Received", message: "Rp 75,000,000 received from PT Maju Bersama" },
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

export default function ClientOverviewPage() {
  const [viewMode, setViewMode] = useState<"personal" | "team">("team");

  // FAB Action Listener
  useEffect(() => {
    const handleFabAction = (e: any) => {
      if (e.detail?.id === 'CLIENT_NEW') {
        alert("New Client action triggered via FAB");
      }
    };
    window.addEventListener('fab-action', handleFabAction);
    return () => window.removeEventListener('fab-action', handleFabAction);
  }, []);

  const header = (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Client Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage client relationships, contracts, and billing.</p>
        </div>
        <div className="flex items-center bg-neutral-100 rounded-full p-1">
          <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
          <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
        </div>
      </div>
      <div className="border-b border-neutral-200" />
    </div>
  );

  return (
    <ClientPageWrapper
      breadcrumbItems={[{ label: "Flow" }, { label: "Client" }, { label: "Overview" }]}
      header={header}
      sidebar={<ClientSidebar />}
    >
      {viewMode === "team" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="Total Clients" value={String(MOCK_TEAM.totalClients)} subtext="All time" />
            <SummaryCard icon={<FileSignature className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Active Projects" value={String(MOCK_TEAM.activeProjects)} subtext="In progress" />
            <SummaryCard icon={<FileSignature className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Pending Contracts" value={String(MOCK_TEAM.pendingContracts)} subtext="Awaiting signature" />
            <SummaryCard icon={<TrendingUp className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="Total Revenue" value={formatShort(MOCK_TEAM.totalRevenue)} subtext="This year" />
            <SummaryCard icon={<DollarSign className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" label="Pending Payments" value={formatShort(MOCK_TEAM.pendingPayments)} subtext="Outstanding" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Top Clients</h3>
              {MOCK_RECENT_CLIENTS.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div><div className="font-medium">{c.name}</div><div className="text-sm text-neutral-500">{c.projects} projects</div></div>
                  <div className="font-medium text-neutral-900">{formatShort(c.value)}</div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="My Clients" value={String(MOCK_PERSONAL.myClients)} subtext="Assigned" />
            <SummaryCard icon={<FileSignature className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Active Projects" value={String(MOCK_PERSONAL.activeProjects)} subtext="In progress" />
            <SummaryCard icon={<MessageSquare className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="Communications" value={String(MOCK_PERSONAL.communications)} subtext="This month" />
          </div>
          <div className="bg-white rounded-xl border p-6 mt-6">
            <h3 className="font-semibold mb-4">My Assigned Clients</h3>
            {MOCK_RECENT_CLIENTS.slice(0, 2).map((c) => (
              <div key={c.name} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="font-medium">{c.name}</div><div className="text-sm text-neutral-500">{c.projects} projects</div>
              </div>
            ))}
          </div>
        </>
      )}
    </ClientPageWrapper>
  );
}
