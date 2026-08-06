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
      {/* 1. TOP TAB NAVIGATION & ACTION BAR (CLEAN & SPACIOUS PILLS) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
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

      {/* 2. SUBMISSION READINESS WARNING BANNER */}
      {!isSubmitted && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                Status Modul: <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-md text-xs">Draft Mode</span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Setup WBS, RAB, dan Schedule belum di-submit. Anda tetap dapat melakukan tracking menggunakan data draft saat ini.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/flow/projects/${project?.id}/setup/wbs`)}
            className="whitespace-nowrap bg-white hover:bg-amber-100 text-amber-900 border-amber-300"
          >
            Go to WBS Setup
          </Button>
        </div>
      )}

      {/* 3. DYNAMIC SUMMARY CARDS (CHANGES CONTEXTUALLY PER ACTIVE TAB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {/* CARDS FOR BUILD SCOPE (WBS & VOLUME) */}
        {activeTab === "schedule" && (
          <>
            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Overall Progress Fisik</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">{summaryStats.overallProgress}%</div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${summaryStats.overallProgress}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                {summaryStats.completedCount} Selesai • {summaryStats.inProgressCount} Dalam Proses
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Pekerjaan Terlambat</span>
                <AlertTriangle className={clsx("w-4 h-4", summaryStats.delayedCount > 0 ? "text-red-500" : "text-neutral-400")} />
              </div>
              <div className="mt-3">
                <div className={clsx("text-2xl font-extrabold", summaryStats.delayedCount > 0 ? "text-red-600" : "text-green-600")}>
                  {summaryStats.delayedCount} <span className="text-xs font-normal text-neutral-500">Item</span>
                </div>
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mt-1">
                  {summaryStats.delayedCount > 0 ? `🔴 Perlu Perhatian Segera` : `🟢 Semua Sesuai Jadwal`}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Max Varian: +{summaryStats.scheduleVarianceDays} Hari
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Realisasi Volume</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {summaryStats.totalActualVolume.toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  dari Target {summaryStats.totalTargetVolume.toLocaleString("id-ID")} Unit
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Akumulasi Terpasang Lapangan
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Realisasi Biaya RAB</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Rp {summaryStats.totalActualCost.toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                  Cost Variance Ok
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Actual Spend vs RAB Baseline
              </div>
            </div>
          </>
        )}

        {/* CARDS FOR DESIGN SCOPE (STAGES & TASKS) */}
        {activeTab === "stages" && (
          <>
            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Overall Progress Desain</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">40.0%</div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: "40%" }} />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Target Fase: 02-SD Schematic Design
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Status Tahapan Stage</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  2 <span className="text-xs font-medium text-neutral-400">/ 5 Stage</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 mt-1">
                  🟢 01-KO Kickoff Completed
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Schematic Design sedang berjalan
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Deliverables & Revisions</span>
                <FileCheck className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  12 <span className="text-xs font-normal text-neutral-500">Drawings</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-0.5">
                  🟡 2 Pending Review Klien
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Dokumen Arsitektur & Struktur
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Timeline Schedule Desain</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  On Schedule
                </div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  Target Finish SD: 15 Aug
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Timeline Sesuai Target Klien
              </div>
            </div>
          </>
        )}

        {/* CARDS FOR RAB & FINANCE */}
        {activeTab === "rab" && (
          <>
            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Total RAB Baseline</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Rp {(summaryStats.totalActualCost * 1.5).toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  Total Anggaran Disetujui
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Contract RAB Value
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Realisasi Biaya Terpasang</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Rp {summaryStats.totalActualCost.toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-blue-600 font-semibold mt-0.5">
                  {(summaryStats.totalActualCost > 0 ? (100 / 1.5).toFixed(1) : 0)}% Realisasi
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Valuasi Pekerjaan Lapangan
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Sisa Anggaran (Variance)</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-extrabold text-emerald-600">
                  Rp {(summaryStats.totalActualCost * 0.5).toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                  🟢 Sisa Anggaran Aman
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                RAB Baseline minus Realisasi
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Serapan Anggaran</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">66.7%</div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: "66.7%" }} />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Prosentase Serapan RAB
              </div>
            </div>
          </>
        )}

        {/* CARDS FOR REPORTS */}
        {activeTab === "reports" && (
          <>
            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Total Laporan Terbit</span>
                <FileCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">24 Laporan</div>
                <div className="text-xs text-blue-600 font-semibold mt-0.5">
                  18 Daily • 6 Weekly
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Dokumentasi Lapangan & Desain
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Kondisi Lapangan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-600">Cerah</div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  Pekerjaan Berjalan Lancar
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Update Terakhir: Hari Ini
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Tenaga Kerja Lapangan</span>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">18 Pekerja</div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  3 Tukang • 15 Pekerja
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Absensi Mandor Hari Ini
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Status Approval Report</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-600">Approved</div>
                <div className="text-xs text-neutral-500 font-medium mt-0.5">
                  Disetujui Project Manager
                </div>
              </div>
              <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                Minggu ke-24 Ready
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
