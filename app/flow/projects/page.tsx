"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  Briefcase,
  MoreHorizontal
} from "lucide-react";
import clsx from "clsx";

export default function ProjectsOverviewPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    planning: 0,
    completed: 0,
    totalValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data, error } = await supabase.from("projects").select("status, meta");
        if (error) throw error;

        const s = {
          total: data.length,
          active: data.filter(p => p.status === 'active').length,
          planning: data.filter(p => p.status === 'planning').length,
          completed: data.filter(p => p.status === 'completed').length,
          totalValue: data.reduce((acc, curr) => acc + (Number(curr.meta?.value) || 0), 0)
        };
        setStats(s);
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Overview" }]} />
      <PageWrapper sidebar={<ProjectsSidebar />}>
        <div className="space-y-8 w-full animate-in fade-in duration-500">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Projects Overview</h1>
              <p className="text-sm text-neutral-500 mt-1">Portfolio performance and activity summary.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">{new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="border-b border-neutral-200" />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-neutral-500 uppercase">Total Projects</span>
              </div>
              <div className="text-2xl font-bold text-neutral-900">{isLoading ? "..." : stats.total}</div>
              <div className="text-xs text-neutral-400 mt-1">Across all workspaces</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Activity className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-neutral-500 uppercase">Active</span>
              </div>
              <div className="text-2xl font-bold text-neutral-900">{isLoading ? "..." : stats.active}</div>
              <div className="text-xs text-green-600 mt-1 font-medium">In Progress</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-neutral-500 uppercase">Planning</span>
              </div>
              <div className="text-2xl font-bold text-neutral-900">{isLoading ? "..." : stats.planning}</div>
              <div className="text-xs text-neutral-400 mt-1">Pre-construction</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-neutral-500 uppercase">Total Value</span>
              </div>
              <div className="text-xl font-bold text-neutral-900 truncate" title={isLoading ? "" : formatCurrency(stats.totalValue)}>
                {isLoading ? "..." : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalValue)}
              </div>
              <div className="text-xs text-neutral-400 mt-1">Estimated contract value</div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" /> Recent Activity
                </h3>
                <button className="text-sm text-neutral-500 hover:text-red-600 font-medium">View All</button>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-neutral-300" />
                </div>
                <h4 className="text-sm font-medium text-neutral-900">No recent activity</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">Project activities and updates will appear here once you start working on projects.</p>
              </div>
            </div>

            {/* Quick Actions / Summary */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-neutral-900">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <button className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-all shadow-sm hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-white group-hover:text-red-600 transition-colors"><FileText className="w-5 h-5 text-neutral-600 group-hover:text-red-600" /></div>
                    <div>
                      <div className="font-medium text-neutral-900">Generate Report</div>
                      <div className="text-xs text-neutral-500">Create weekly progress summary</div>
                    </div>
                  </div>
                </button>
                <button className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-all shadow-sm hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-white group-hover:text-blue-600 transition-colors"><Clock className="w-5 h-5 text-neutral-600 group-hover:text-blue-600" /></div>
                    <div>
                      <div className="font-medium text-neutral-900">Schedule Meeting</div>
                      <div className="text-xs text-neutral-500">Coordinate with site managers</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-lg mt-6">
                <h4 className="font-bold text-lg mb-2">Weekly Insight</h4>
                <p className="text-sm text-neutral-300 mb-4">Project completions satisfy client deadlines by 15% better than last month.</p>
                <div className="h-1 bg-neutral-700 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[75%]" />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-2">
                  <span>Progress</span>
                  <span>75% Target</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
