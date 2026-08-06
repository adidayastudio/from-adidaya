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
    <div className="space-y-6">
      {/* 1. DESIGN SCOPE HEADER & PROGRESS CARD */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5" /> Design Scope Tracking (Tasks & Stages)
          </div>
          <h3 className="text-base font-bold text-neutral-900">Kemajuan Tahapan Desain & Deliverables</h3>
          <p className="text-xs text-neutral-500">
            Pelacakan progres tahap perancangan arsitektur, gambar kerja, dan dokumen perencanaan.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-xl border border-neutral-100 shrink-0">
          <div>
            <div className="text-[10px] text-neutral-400 font-medium">Total Design Progress</div>
            <div className="text-xl font-extrabold text-neutral-900">{overallDesignProgress}%</div>
          </div>
          <div className="w-20 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-red transition-all duration-300" style={{ width: `${overallDesignProgress}%` }} />
          </div>
        </div>
      </div>

      {/* 2. STAGES TIMELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="p-4 rounded-2xl border border-neutral-100 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-neutral-100 text-neutral-800">
                  {stage.code}
                </span>
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                    stage.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : stage.status === "In Progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  {stage.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-900">{stage.name}</h4>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{stage.desc}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-neutral-400" />
                  {stage.completedTasks} / {stage.tasksCount} Tasks Selesai
                </span>
                <span className="font-extrabold text-neutral-900">{stage.progress}%</span>
              </div>

              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-300",
                    stage.status === "Completed" ? "bg-green-500" : "bg-brand-red"
                  )}
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
