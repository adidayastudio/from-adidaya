"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/flow/project-context";
import { ALL_STAGE_DATA, StageAbbreviation } from "@/components/flow/projects/project-detail/setup/stages/data";
import { ChevronDown, ChevronUp, CheckCircle2, Clock, ExternalLink, FileCheck, Layers, CheckSquare } from "lucide-react";
import clsx from "clsx";

type DesignStage = {
  id: string;
  code: string; // e.g. "01-KO"
  abbrev: StageAbbreviation; // "KO"
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
    abbrev: "KO",
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
    abbrev: "SD",
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
    abbrev: "DD",
    name: "Design Development (DD)",
    desc: "Pengembangan Detail Arsitektur, Struktur, MEP & Material Specification",
    progress: 75,
    status: "In Progress",
    tasksCount: 8,
    completedTasks: 6,
  },
  {
    id: "stage-4",
    code: "04-ED",
    abbrev: "ED",
    name: "Construction Documents / ED",
    desc: "Gambar Kerja Detil (For Construction), Spesifikasi Teknis & Detail Eng.",
    progress: 30,
    status: "In Progress",
    tasksCount: 10,
    completedTasks: 3,
  },
  {
    id: "stage-5",
    code: "05-PC",
    abbrev: "PC",
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
    abbrev: "CN",
    name: "Construction Supervision (CN)",
    desc: "Pengawasan Berkala Lapangan & Quality Control Arsitektur",
    progress: 0,
    status: "Pending",
    tasksCount: 12,
    completedTasks: 0,
  },
];

export default function TrackingStagesTab() {
  const router = useRouter();
  const { project } = useProject();
  const [stages, setStages] = useState<DesignStage[]>(defaultDesignStages);
  const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-1");

  // Local state for task tracking status per task code
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, "Completed" | "In Progress" | "Pending">>({});

  const toggleExpand = (id: string) => {
    setExpandedStageId((prev) => (prev === id ? null : id));
  };

  const toggleTaskStatus = (taskCode: string) => {
    setTaskStatusMap((prev) => {
      const current = prev[taskCode] || "Completed";
      const next = current === "Completed" ? "In Progress" : current === "In Progress" ? "Pending" : "Completed";
      return { ...prev, [taskCode]: next };
    });
  };

  // Overall design progress
  const overallDesignProgress = Math.round(
    stages.reduce((acc, curr) => acc + curr.progress, 0) / stages.length
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* STAGE PROGRESS ACCORDION LIST */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-5 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">Tahapan Desain & Progress Tasks</h3>
            <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Klik tahapan untuk melihat & mengupdate detail task item</p>
          </div>
          <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {overallDesignProgress}% Selesai
          </span>
        </div>

        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {stages.map((stage) => {
            const isExpanded = expandedStageId === stage.id;
            const stageData = ALL_STAGE_DATA[stage.abbrev];
            const sections = stageData?.sections || [];
            const tasks = stageData?.tasks || [];

            return (
              <div key={stage.id} className="transition-colors">
                {/* STAGE HEADER ROW (CLICKABLE TO EXPAND ACCORDION) */}
                <div
                  onClick={() => toggleExpand(stage.id)}
                  className="p-4 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
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

                {/* EXPANDED TASK DETAILS ACCORDION */}
                {isExpanded && (
                  <div className="bg-neutral-50/50 dark:bg-neutral-950/40 p-4 border-t border-black/[0.04] dark:border-white/[0.04] space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span>Rincian Tasks & Deliverables ({tasks.length} Task Items)</span>
                      <button
                        onClick={() => router.push(`/flow/projects/${project?.id}/setup/stages?stage=${stage.code}`)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                      >
                        Buka Setup Full <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* SECTION & TASKS LIST */}
                    <div className="space-y-4">
                      {sections.length > 0 ? (
                        sections.map((sec: any) => {
                          const secTasks = tasks.filter((t: any) => t.sectionCode === sec.code);
                          return (
                            <div key={sec.code} className="bg-white dark:bg-neutral-900 rounded-xl border border-black/[0.04] dark:border-white/[0.04] overflow-hidden">
                              <div className="px-4 py-2 bg-neutral-100/60 dark:bg-neutral-800/60 flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                <span>{sec.code} — {sec.name}</span>
                                <span className="text-[10px] text-neutral-400">Weight: {sec.weight}%</span>
                              </div>
                              <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                                {secTasks.length > 0 ? (
                                  secTasks.map((task: any) => {
                                    const status = taskStatusMap[task.code] || (stage.status === "Completed" ? "Completed" : "In Progress");
                                    return (
                                      <div
                                        key={task.code}
                                        onClick={() => toggleTaskStatus(task.code)}
                                        className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={status === "Completed"}
                                            onChange={() => toggleTaskStatus(task.code)}
                                            className="w-4 h-4 rounded text-blue-600 border-neutral-300 focus:ring-blue-500 cursor-pointer"
                                          />
                                          <span className="font-mono text-neutral-400 text-[11px]">{task.code}</span>
                                          <span className="font-semibold text-neutral-900 dark:text-white truncate">{task.name}</span>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                          {task.priority && (
                                            <span className={clsx(
                                              "px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md",
                                              task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"
                                            )}>
                                              {task.priority}
                                            </span>
                                          )}
                                          <span className="font-medium text-neutral-500 text-[11px]">{task.weight}% Wt</span>
                                          <span className={clsx(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                            status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                          )}>
                                            {status}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 text-xs text-neutral-400 font-medium">Belum ada task pada seksi ini.</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03] bg-white dark:bg-neutral-900 rounded-xl border border-black/[0.04]">
                          {tasks.map((task: any) => {
                            const status = taskStatusMap[task.code] || (stage.status === "Completed" ? "Completed" : "In Progress");
                            return (
                              <div
                                key={task.code}
                                onClick={() => toggleTaskStatus(task.code)}
                                className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={status === "Completed"}
                                    onChange={() => toggleTaskStatus(task.code)}
                                    className="w-4 h-4 rounded text-blue-600 border-neutral-300 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="font-mono text-neutral-400 text-[11px]">{task.code}</span>
                                  <span className="font-semibold text-neutral-900 dark:text-white truncate">{task.name}</span>
                                </div>
                                <span className={clsx(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                  status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                )}>
                                  {status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
