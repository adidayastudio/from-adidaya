"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { defaultKickoffData } from "./defaultKickoffData";
import {
  KO_SECTIONS,
  SD_SECTIONS,
  DD_SECTIONS,
  ED_SECTIONS,
  PC_SECTIONS,
  CN_SECTIONS,
  HO_SECTIONS,
} from "../setup/stages/data";
import {
  FileCheck,
  Layers,
  CheckSquare,
  ChevronDown,
  CheckCircle2,
  Edit3,
  Circle,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

type StageOption = "01-KO" | "02-SD" | "03-DD" | "04-ED" | "05-PC" | "06-CN" | "07-HO";

export interface SubDeliverableItem {
  id: string;
  code: string;
  title: string;
  status: "done" | "in_progress" | "pending";
}

export interface StageInfo {
  code: StageOption;
  name: string;
  deliverableCode: string;
  deliverableTitle: string;
  progress: number; // 0-100
  status: "Completed" | "In Progress" | "Upcoming";
  pageCount: string;
  description: string;
  subItems: SubDeliverableItem[];
}

export default function ProjectTasksEditorContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.projectId || params?.id) as string;

  const handleOpenEditor = (stageCode: string = "01-KO") => {
    if (projectId) {
      router.push(`/flow/projects/${projectId}/tasks/editor?stage=${stageCode}`);
    } else {
      router.push(`/flow/projects/settings/tasks/editor?stage=${stageCode}`);
    }
  };

  // Track expanded stages accordion
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    "01-KO": true,
    "02-SD": false,
  });

  const toggleExpand = (stageCode: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedStages((prev) => ({
      ...prev,
      [stageCode]: !prev[stageCode],
    }));
  };

  const stagesData: StageInfo[] = [
    {
      code: "01-KO",
      name: "01-KO Kickoff",
      deliverableCode: "KO-01",
      deliverableTitle: "Kickoff Project Deliverable & Alignment Report",
      progress: 100,
      status: "Completed",
      pageCount: "12 Pages",
      description: "Cover, Metadata, Tujuan, Scope Checklist, Workflow & Methodology, Pemahaman Proyek.",
      subItems: KO_SECTIONS.map((sec, idx) => ({
        id: `01-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "done",
      })),
    },
    {
      code: "02-SD",
      name: "02-SD Schematic Design",
      deliverableCode: "SD-01",
      deliverableTitle: "Schematic Concept & Spatial Layout Package",
      progress: 60,
      status: "In Progress",
      pageCount: "18 Pages",
      description: "Moodboards, Concept Plans, 3D Massing, Material Palette, Zoning Analysis.",
      subItems: SD_SECTIONS.map((sec, idx) => ({
        id: `02-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: idx < 2 ? "done" : idx < 4 ? "in_progress" : "pending",
      })),
    },
    {
      code: "03-DD",
      name: "03-DD Design Development",
      deliverableCode: "DD-01",
      deliverableTitle: "Design Development & Material Specs Package",
      progress: 0,
      status: "Upcoming",
      pageCount: "24 Pages",
      description: "Detailed Plans, Elevation Specs, Refined 3D Renders, Preliminary BOQ.",
      subItems: DD_SECTIONS.map((sec, idx) => ({
        id: `03-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "pending",
      })),
    },
    {
      code: "04-ED",
      name: "04-ED Engineering Design",
      deliverableCode: "ED-01",
      deliverableTitle: "Working Drawings & Engineering Calculations",
      progress: 0,
      status: "Upcoming",
      pageCount: "32 Pages",
      description: "Structural Calculation, MEP Schematics, Construction Details, Specs Binders.",
      subItems: ED_SECTIONS.map((sec, idx) => ({
        id: `04-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "pending",
      })),
    },
    {
      code: "05-PC",
      name: "05-PC Procurement",
      deliverableCode: "PC-01",
      deliverableTitle: "Procurement & Bidding Vendor Binder",
      progress: 0,
      status: "Upcoming",
      pageCount: "15 Pages",
      description: "Vendor Comparison, Final Approved RAB, Material Sign-off Matrix.",
      subItems: PC_SECTIONS.map((sec, idx) => ({
        id: `05-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "pending",
      })),
    },
    {
      code: "06-CN",
      name: "06-CN Construction",
      deliverableCode: "CN-01",
      deliverableTitle: "Site Progress & Inspection Reports",
      progress: 0,
      status: "Upcoming",
      pageCount: "Multi-page",
      description: "Weekly Site Inspection, Quality Checklist, Field Notice Sign-offs.",
      subItems: CN_SECTIONS.map((sec, idx) => ({
        id: `06-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "pending",
      })),
    },
    {
      code: "07-HO",
      name: "07-HO Handover",
      deliverableCode: "HO-01",
      deliverableTitle: "As-Built Drawings & Handover Dossier",
      progress: 0,
      status: "Upcoming",
      pageCount: "10 Pages",
      description: "As-Built Drawings, Maintenance Manuals, Warranty Cards & Defect Punchlist.",
      subItems: HO_SECTIONS.map((sec, idx) => ({
        id: `07-${sec.code}`,
        code: String(idx + 1).padStart(2, "0"),
        title: sec.title,
        status: "pending",
      })),
    },
  ];

  const totalCompleted = stagesData.filter((s) => s.progress === 100).length;
  const overallProgress = Math.round(
    stagesData.reduce((acc, curr) => acc + curr.progress, 0) / stagesData.length
  );

  const totalAllItems = stagesData.reduce((acc, curr) => acc + curr.subItems.length, 0);
  const totalCompletedItems = stagesData.reduce(
    (acc, curr) => acc + curr.subItems.filter((i) => i.status === "done").length,
    0
  );
  const itemCompletionRate = Math.round((totalCompletedItems / (totalAllItems || 1)) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* GLASSY LIQUID SUMMARY STAT CARDS (FINANCE STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: OVERALL PROGRESS (DELIVERABLES - BIRU) */}
        <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-2xl p-5 rounded-3xl shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">
              {overallProgress}%
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Overall Deliverables Progress</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/50">
                {totalCompleted} / {stagesData.length} Stages Ready
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: ACTIVE STAGE (ACTIVE STAGE - MERAH) */}
        <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-2xl p-5 rounded-3xl shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              01-KO
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Active Deliverable Stage</p>
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate">
              01-KO Kickoff
            </p>
          </div>
        </div>

        {/* CARD 3: SUB-DELIVERABLES (SUB ITEMS - HIJAU) */}
        <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-2xl p-5 rounded-3xl shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">
              {totalCompletedItems} / {totalAllItems}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Sub-deliverables Items</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                {itemCompletionRate}% Items Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CLEAN STAGES LIST DIRECT CARDS */}
      <div className="space-y-4">
        {stagesData.map((stg) => {
          const isCompleted = stg.progress === 100;
          const isInProgress = stg.progress > 0 && stg.progress < 100;
          const isPending = stg.progress === 0;
          // Active stage logic (e.g. 01-KO is active)
          const isActive = stg.code === "01-KO";
          const isExpanded = !!expandedStages[stg.code];
          const doneCount = stg.subItems.filter((i) => i.status === "done").length;

          return (
            <div
              key={stg.code}
              className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-2xl rounded-3xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              {/* STAGE ROW */}
              <div
                onClick={() => toggleExpand(stg.code)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
              >
                {/* LEFT: CHEVRON, FULL PILL BADGE & JUDUL STAGE */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={(e) => toggleExpand(stg.code, e)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 transition-transform shrink-0"
                  >
                    <ChevronDown
                      className={clsx(
                        "w-4 h-4 transition-transform duration-200",
                        isExpanded ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>

                  {/* FULL PILL BADGE ACCORDING TO STAGE STATUS */}
                  <span
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-black shrink-0 font-mono tracking-wider text-white shadow-2xs",
                      isCompleted && "bg-emerald-600",
                      !isCompleted && isActive && "bg-brand-red",
                      !isCompleted && !isActive && isInProgress && "bg-blue-600",
                      !isCompleted && !isActive && isPending && "bg-neutral-400 dark:bg-neutral-600 text-white"
                    )}
                  >
                    {stg.code}
                  </span>

                  <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate">
                    {stg.name.replace(/^[0-9]{2}-[A-Z]{2}\s*/, "")}
                  </h4>
                </div>

                {/* RIGHT: STATUS, PROGRESS BAR & EDIT ACTION */}
                <div
                  className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-black/5 dark:border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* STATUS BADGE & PROGRESS */}
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1.5",
                        isCompleted && "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50",
                        isInProgress && "bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50",
                        isPending && "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/50"
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {isInProgress && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                      <span>{stg.progress}% Complete ({doneCount}/{stg.subItems.length})</span>
                    </span>

                    {/* PROGRESS BAR */}
                    <div className="w-24 md:w-32 bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden shrink-0 hidden sm:block">
                      <div
                        className={clsx(
                          "h-full transition-all duration-500 rounded-full",
                          isCompleted ? "bg-emerald-500" : isInProgress ? "bg-blue-500" : "bg-neutral-300 dark:bg-neutral-700"
                        )}
                        style={{ width: `${stg.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* EDIT ACTION BUTTON - GRAY IF PENDING, BLUE IF ACTIVE/PROGRESS/COMPLETED */}
                  <button
                    onClick={() => handleOpenEditor(stg.code)}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs shrink-0",
                      isPending
                        ? "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* EXPANDED ACCORDION SUB-ITEMS LIST - STRICT UNIFORM 3 COLUMNS */}
              {isExpanded && (
                <div className="border-t border-black/5 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] p-4 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {stg.subItems.map((item) => {
                      const isDone = item.status === "done";
                      const isProg = item.status === "in_progress";

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenEditor(stg.code)}
                          className={clsx(
                            "p-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs",
                            isDone && "bg-white/90 dark:bg-neutral-800/80 border-emerald-500/30 text-neutral-900 dark:text-white hover:border-emerald-500/60",
                            isProg && "bg-white/90 dark:bg-neutral-800/80 border-blue-500/30 text-neutral-900 dark:text-white hover:border-blue-500/60",
                            !isDone && !isProg && "bg-white/60 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-white/90"
                          )}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                              {item.code}
                            </span>
                            <span className="truncate font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                          </div>

                          <div className="shrink-0">
                            {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                            {isProg && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse block" />}
                            {!isDone && !isProg && <Circle className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
