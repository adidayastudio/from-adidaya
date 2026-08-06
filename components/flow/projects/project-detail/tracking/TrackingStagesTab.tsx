"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { CheckCircle2, Clock, FileText, Layout, PenTool, Layers, CheckSquare, Sparkles } from "lucide-react";
import clsx from "clsx";

type DesignStage = {
  id: string;
  code: string;
  name: string;
  desc: string;
  progress: number;
  status: "Completed" | "In Progress" | "Pending";
  tasksCount: number;
  completedTasks: number;
};

const defaultDesignStages: DesignStage[] = [
  {
    id: "stage-1",
    code: "01-KO",
    name: "Kickoff & Initial Brief",
    desc: "Pengumpulan Kebutuhan Klien, Site Analysis & Kontrak AWAL",
    progress: 100,
    status: "Completed",
    tasksCount: 4,
    completedTasks: 4,
  },
  {
    id: "stage-2",
    code: "02-SD",
    name: "Schematic Design (SD)",
    desc: "Konsep Desain, Layout Denah 2D, Fasade 3D & Moodboard",
    progress: 100,
    status: "Completed",
    tasksCount: 6,
    completedTasks: 6,
  },
  {
    id: "stage-3",
    code: "03-DD",
    name: "Design Development (DD)",
    desc: "Pengembangan Detail Arsitektur, Struktur, MEP & Material Specification",
    progress: 75,
    status: "In Progress",
    tasksCount: 8,
    completedTasks: 6,
  },
  {
    id: "stage-4",
    code: "04-CD",
    name: "Construction Documents (CD)",
    desc: "Gambar Kerja Detil (For Construction), Spesifikasi Teknis & Detail Eng.",
    progress: 30,
    status: "In Progress",
    tasksCount: 10,
    completedTasks: 3,
  },
  {
    id: "stage-5",
    code: "05-TN",
    name: "Tender & Procurement",
    desc: "Dokumen BQ/RAB Tender, Seleksi Kontraktor & Negosiasi",
    progress: 0,
    status: "Pending",
    tasksCount: 5,
    completedTasks: 0,
  },
  {
    id: "stage-6",
    code: "06-CN",
    name: "Construction Supervision (CN)",
    desc: "Pengawasan Berkala Lapangan & Quality Control Arsitektur",
    progress: 0,
    status: "Pending",
    tasksCount: 12,
    completedTasks: 0,
  },
];

export default function TrackingStagesTab() {
  const [stages, setStages] = useState<DesignStage[]>(defaultDesignStages);

  // Overall design progress
  const overallDesignProgress = Math.round(
    stages.reduce((acc, curr) => acc + curr.progress, 0) / stages.length
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* COMPACT CLEAN STAGE PROGRESS LIST (NO REDUNDANT BANNER & NO BULKY CARDS) */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-5 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">Tahapan Desain & Progress Tasks</h3>
            <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Status penyelesaian deliverables per tahapan perancangan</p>
          </div>
          <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {overallDesignProgress}% Selesai
          </span>
        </div>

        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="p-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-extrabold text-xs shrink-0 border border-black/[0.03] dark:border-white/[0.05]">
                  {stage.code}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{stage.name}</h4>
                  <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">{stage.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 justify-between sm:justify-end">
                <div className="text-right min-w-[100px]">
                  <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {stage.completedTasks} / {stage.tasksCount} Tasks
                  </div>
                  <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        stage.status === "Completed" ? "bg-emerald-500" : stage.status === "In Progress" ? "bg-blue-500" : "bg-neutral-300"
                      )}
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                </div>

                <span className="text-xs font-black text-neutral-900 dark:text-white min-w-[36px] text-right">
                  {stage.progress}%
                </span>

                <span
                  className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider min-w-[85px] text-center",
                    stage.status === "Completed"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : stage.status === "In Progress"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                  )}
                >
                  {stage.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
