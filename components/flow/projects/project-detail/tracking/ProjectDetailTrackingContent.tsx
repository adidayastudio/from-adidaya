"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useProject } from "@/components/flow/project-context";
import TrackingStagesTab from "./TrackingStagesTab";
import TrackingRabTab from "./TrackingRabTab";
import TrackingScheduleTab from "./TrackingScheduleTab";
import TrackingReportsTab from "./TrackingReportsTab";
import DailyProgressInputModal from "./DailyProgressInputModal";
import { Button } from "@/shared/ui/primitives/button/button";
import {
  fetchProjectTrackingData,
  calculateTrackingSummary,
  TrackingWBSItem,
  ProjectTrackingSummary,
} from "@/lib/flow/repositories/daily-progress.repo";
import {
  AlertTriangle,
  Plus,
  RefreshCw,
  Layers,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";

type TrackingTab = "schedule" | "stages" | "rab" | "reports";
type TabItem<T> = { key: T; label: string; icon?: any; badge?: string };

export default function ProjectDetailTrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { project } = useProject();

  const initialTab = (searchParams.get("tab") as TrackingTab) || "stages";
  const [activeTab, setActiveTab] = useState<TrackingTab>(initialTab);

  // Real DB Tracking Data State
  const [wbsItems, setWbsItems] = useState<TrackingWBSItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<TrackingWBSItem | null>(null);

  // Check Submission Readiness
  const isSubmitted = useMemo(() => {
    if (!project) return false;
    const meta = (project.meta as any) || {};
    return (
      meta.isSubmitted === true ||
      meta.wbsSubmitted === true ||
      project.status === "active" ||
      project.status === "in_progress"
    );
  }, [project]);

  // Fetch real tracking data on mount / project change
  const loadTrackingData = async () => {
    if (!project?.id) return;
    try {
      setIsLoading(true);
      const data = await fetchProjectTrackingData(project.id);
      setWbsItems(data);
    } catch (err) {
      console.error("Error loading tracking data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, [project?.id]);

  const summaryStats: ProjectTrackingSummary = useMemo(() => {
    return calculateTrackingSummary(wbsItems);
  }, [wbsItems]);

  const handleTabChange = (tab: TrackingTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openInputModal = (item?: TrackingWBSItem) => {
    setSelectedItemForModal(item || null);
    setIsModalOpen(true);
  };

  const tabs: TabItem<TrackingTab>[] = [
    { key: "stages", label: "Stages & Tasks" },
    { key: "schedule", label: "WBS & Volume", badge: `${summaryStats.totalItems} Items` },
    { key: "rab", label: "RAB & Finance" },
    { key: "reports", label: "Site Reports" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. TOP TAB NAVIGATION & ACTION BAR (NO DIVIDER) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* SEGMENTED FULL PILL TABS */}
        <div className="flex items-center p-1 bg-neutral-200/50 dark:bg-neutral-800/50 backdrop-blur-xl rounded-full border border-black/[0.04] dark:border-white/10 shadow-inner overflow-x-auto hide-scrollbar gap-1 max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={clsx(
                "px-4 py-2 text-xs rounded-full transition-all duration-200 whitespace-nowrap flex items-center gap-2 shrink-0 active:scale-95",
                activeTab === tab.key
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-extrabold shadow-sm border border-black/[0.04] dark:border-white/10"
                  : "text-neutral-500 dark:text-neutral-400 font-medium hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={clsx(
                  "px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-colors",
                  activeTab === tab.key
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TOP ACTIONS */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadTrackingData}
            icon={<RefreshCw className={clsx("w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300", isLoading && "animate-spin")} />}
            className="rounded-full bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-sm text-xs font-bold px-4"
          >
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => openInputModal()}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-full bg-brand-red hover:bg-brand-red/90 text-white shadow-sm font-bold text-xs px-4 active:scale-95"
          >
            + Input Progress Harian
          </Button>
        </div>
      </div>

      {/* 2. SUBMISSION READINESS COMPACT BANNER (ONLY SHOW ON WBS & RAB TABS) */}
      {!isSubmitted && (activeTab === "schedule" || activeTab === "rab") && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
          <div className="flex items-center gap-2 font-semibold truncate">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Status Modul: <strong className="font-extrabold text-amber-800 dark:text-amber-300">Draft Mode</strong> — Setup WBS/RAB belum di-submit.</span>
          </div>
          <button
            onClick={() => router.push(`/flow/projects/${project?.id}/setup/wbs`)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors shadow-xs"
          >
            Setup WBS
          </button>
        </div>
      )}

      {/* 3. DYNAMIC SUMMARY CARDS (ULTRA-CLEAN MINIMALIST KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {/* CARDS FOR STAGES & TASKS (DESIGN) */}
        {activeTab === "stages" && (
          <>
            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Progress Desain</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black tracking-tight leading-none text-neutral-900 dark:text-white">40.0%</p>
                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-500 rounded-full" style={{ width: "40%" }} />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stage Progress</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-600 dark:text-emerald-400">
                  2 <span className="text-xs font-semibold text-neutral-400">/ 5 Stage</span>
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold truncate">Stage 02-SD Active</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Deliverables</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-500">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-neutral-900 dark:text-white">
                  12 <span className="text-xs font-semibold text-neutral-400">Items</span>
                </p>
                <p className="text-[10px] text-amber-600 font-semibold truncate">2 Review Pending</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Schedule Status</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-600 dark:text-emerald-400">On Track</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold truncate">SD Finish: 15 Aug</p>
              </div>
            </div>
          </>
        )}

        {/* CARDS FOR BUILD SCOPE (WBS & VOLUME) — Now rendered inside TrackingScheduleTab with 3-tier progress */}

        {/* CARDS FOR RAB & FINANCE — Now rendered inside TrackingRabTab */}

        {/* CARDS FOR REPORTS */}
        {activeTab === "reports" && (
          <>
            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Laporan</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-neutral-900 dark:text-white">24</p>
                <p className="text-[10px] text-blue-600 font-semibold truncate">18 Daily • 6 Weekly</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cuaca Lapangan</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-600">Cerah</p>
                <p className="text-[10px] text-neutral-500 font-semibold truncate">Pekerjaan Lancar</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tenaga Kerja</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-500">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-neutral-900 dark:text-white">18</p>
                <p className="text-[10px] text-neutral-500 font-semibold truncate">3 Tukang • 15 Pekerja</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status Approval</p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-600">Approved</p>
                <p className="text-[10px] text-neutral-500 font-semibold truncate">PM Sign-off OK</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. ACTIVE TAB CONTENT */}
      <div>
        {activeTab === "schedule" && (
          <TrackingScheduleTab
            items={wbsItems}
            isLoading={isLoading}
            onOpenInputModal={openInputModal}
            onRefresh={loadTrackingData}
          />
        )}

        {activeTab === "stages" && (
          <TrackingStagesTab />
        )}

        {activeTab === "rab" && (
          <TrackingRabTab items={wbsItems} />
        )}

        {activeTab === "reports" && (
          <TrackingReportsTab />
        )}
      </div>

      {/* 5. DAILY PROGRESS INPUT MODAL */}
      <DailyProgressInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        items={wbsItems}
        preSelectedItem={selectedItemForModal}
        onSuccess={loadTrackingData}
      />
    </div>
  );
}
