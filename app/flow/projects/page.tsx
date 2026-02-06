"use client";

import { useState, useEffect } from "react";
import ProjectsPageWrapper from "@/components/flow/projects/ProjectsPageWrapper";
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
  MoreHorizontal,
  Plus
} from "lucide-react";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
import Drawer from "@/components/shared/Drawer";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  useEffect(() => {
    const handleFabAction = (e: any) => {
      if (e.detail?.id === 'PROJECT_QUICK_ACTIONS') {
        setIsDrawerOpen(true);
      }
    };

    window.addEventListener('fab-action', handleFabAction);
    return () => window.removeEventListener('fab-action', handleFabAction);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <ProjectsPageWrapper
      breadcrumbItems={[{ label: "Flow" }, { label: "Projects" }, { label: "Overview" }]}
      header={
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Projects Overview</h1>
            <p className="text-sm text-neutral-500 mt-1">Portfolio performance and activity summary.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Quick Actions
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-8 w-full animate-in fade-in duration-500">
        <div className="border-b border-neutral-200 lg:hidden" />

        {/* Stats Grid */}
        <SummaryCardsRow>
          <SummaryCard
            icon={<Briefcase className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Total Projects"
            value={isLoading ? "..." : String(stats.total)}
            subtext="Across all workspaces"
          />
          <SummaryCard
            icon={<Activity className="w-5 h-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Active"
            value={isLoading ? "..." : String(stats.active)}
            subtext="In Progress"
            isActive={stats.active > 0}
            activeColor="ring-green-500 border-green-200"
          />
          <SummaryCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Planning"
            value={isLoading ? "..." : String(stats.planning)}
            subtext="Pre-construction"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
            iconBg="bg-purple-50"
            label="Total Value"
            value={isLoading ? "..." : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalValue)}
            subtext="Estimated contract value"
          />
        </SummaryCardsRow>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" /> Recent Activity
              </h3>
              <button className="text-sm px-3 py-1 bg-neutral-50 hover:bg-red-50 text-neutral-500 hover:text-red-600 font-medium rounded-full transition-colors">View All</button>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 flex flex-col items-center justify-center text-center h-64">
              <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-neutral-300" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900">No recent activity</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">Project activities and updates will appear here once you start working on projects.</p>
            </div>
          </div>

          {/* Weekly Insight */}
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h4 className="font-bold text-lg text-neutral-900 mb-2">Weekly Insight</h4>
              <p className="text-sm text-neutral-500 mb-4">Project completions satisfy client deadlines by 15% better than last month.</p>
              <div className="h-1 bg-neutral-100 rounded-full w-full overflow-hidden">
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

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Quick Actions"
      >
        <div className="space-y-3">
          <button className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl transition-all shadow-sm hover:border-red-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-xl group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                <Plus className="w-5 h-5 text-neutral-600 group-hover:text-red-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900 group-hover:text-red-700">New Project</div>
                <div className="text-xs text-neutral-500">Initialize a new project</div>
              </div>
            </div>
          </button>

          <button className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl transition-all shadow-sm hover:border-blue-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Activity className="w-5 h-5 text-neutral-600 group-hover:text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900 group-hover:text-blue-700">Add Activity</div>
                <div className="text-xs text-neutral-500">Log progress or events</div>
              </div>
            </div>
          </button>

          <button className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl transition-all shadow-sm hover:border-amber-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-xl group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                <FileText className="w-5 h-5 text-neutral-600 group-hover:text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900 group-hover:text-amber-700">Generate Report</div>
                <div className="text-xs text-neutral-500">Create weekly progress summary</div>
              </div>
            </div>
          </button>
        </div>
      </Drawer>

    </ProjectsPageWrapper>
  );
}
