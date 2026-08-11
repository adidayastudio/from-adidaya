"use client";

import React, { useState } from "react";
import { useProject } from "@/components/flow/project-context";
import { defaultKickoffData } from "./defaultKickoffData";
import { KickoffDocumentData } from "./types";
import KickoffFormEditor from "./KickoffFormEditor";
import KickoffDocumentPreview from "./KickoffDocumentPreview";
import {
  Layers,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  ArrowLeft,
  Edit3,
  Download,
  MoreVertical,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Building2,
  Printer,
  Circle,
  AlertCircle,
  CheckSquare,
  Target,
  BookOpen,
  Users,
  Calendar
} from "lucide-react";
import clsx from "clsx";
import { PopoverRoot as Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

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
  const { project } = useProject();
  const [viewMode, setViewMode] = useState<"overview" | "editor">("overview");
  const [selectedStage, setSelectedStage] = useState<StageOption>("01-KO");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

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

  // State for Kickoff report data
  const [kickoffData, setKickoffData] = useState<KickoffDocumentData>(() => ({
    ...defaultKickoffData,
    projectName: project?.project_name || defaultKickoffData.projectName,
    projectCode: project?.project_code ? `#${project.project_code}` : defaultKickoffData.projectCode,
    projectLocation: (project?.meta as any)?.location || defaultKickoffData.projectLocation,
  }));

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
      subItems: [
        { id: "01-01", code: "01-01", title: "Cover & Project Information", status: "done" },
        { id: "01-02", code: "01-02", title: "Project Purpose (Tujuan)", status: "done" },
        { id: "01-03", code: "01-03", title: "Scope & Discipline Checklist", status: "done" },
        { id: "01-04", code: "01-04", title: "Workflow & Methodology", status: "done" },
        { id: "01-05", code: "01-05", title: "Deliverables Summary Matrix", status: "done" },
        { id: "01-06", code: "01-06", title: "Project Understanding", status: "done" },
        { id: "01-07", code: "01-07", title: "Master Schedule & Milestones", status: "done" },
        { id: "01-08", code: "01-08", title: "Team & Role Assignment", status: "done" },
        { id: "01-09", code: "01-09", title: "Communication & Risk Protocol", status: "done" },
        { id: "01-10", code: "01-10", title: "Client Data Verification", status: "done" },
        { id: "01-11", code: "01-11", title: "Site Constraints & Parameters", status: "done" },
        { id: "01-12", code: "01-12", title: "Sign-off & Approval Signatures", status: "done" },
      ],
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
      subItems: [
        { id: "02-01", code: "02-01", title: "Design Narrative & Moodboards", status: "done" },
        { id: "02-02", code: "02-02", title: "Spatial Layout & Preliminary Floor Plans", status: "done" },
        { id: "02-03", code: "02-03", title: "3D Massing & Exterior Concept Renders", status: "in_progress" },
        { id: "02-04", code: "02-04", title: "Material Palette Board", status: "in_progress" },
        { id: "02-05", code: "02-05", title: "Preliminary Area & Mass Schedule", status: "pending" },
        { id: "02-06", code: "02-06", title: "Client Schematic Approval Sign-off", status: "pending" },
      ],
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
      subItems: [
        { id: "03-01", code: "03-01", title: "Architectural Detailed Plans & Sections", status: "pending" },
        { id: "03-02", code: "03-02", title: "Material Specification Matrix", status: "pending" },
        { id: "03-03", code: "03-03", title: "High-Resolution Interior 3D Renders", status: "pending" },
        { id: "03-04", code: "03-04", title: "Preliminary BOQ & Cost Model", status: "pending" },
      ],
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
      subItems: [
        { id: "04-01", code: "04-01", title: "Structural Calculation Report", status: "pending" },
        { id: "04-02", code: "04-02", title: "MEP Single Line Diagrams", status: "pending" },
        { id: "04-03", code: "04-03", title: "Detail Working Drawings (DED)", status: "pending" },
      ],
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
      subItems: [
        { id: "05-01", code: "05-01", title: "Vendor & Contractor Bidding Analysis", status: "pending" },
        { id: "05-02", code: "05-02", title: "Approved RAB & Budget Baseline", status: "pending" },
      ],
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
      subItems: [
        { id: "06-01", code: "06-01", title: "Weekly Site Inspection Reports", status: "pending" },
        { id: "06-02", code: "06-02", title: "Quality Assurance & Control Logs", status: "pending" },
      ],
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
      subItems: [
        { id: "07-01", code: "07-01", title: "As-Built Drawings Package", status: "pending" },
        { id: "07-02", code: "07-02", title: "Warranty & Maintenance Manual", status: "pending" },
        { id: "07-03", code: "07-03", title: "Defect Punchlist Sign-off", status: "pending" },
      ],
    },
  ];

  const currentStageInfo = stagesData.find((s) => s.code === selectedStage) || stagesData[0];
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

  const [activeSection, setActiveSection] = useState<string>("cover");

  const kickoffSections = [
    { id: "cover", label: "01-01 Cover & Metadata", icon: FileText },
    { id: "purpose", label: "01-02 Tujuan (Purpose)", icon: Target },
    { id: "understanding", label: "01-03 Pemahaman Proyek", icon: BookOpen },
    { id: "goals", label: "01-04 Tujuan Spesifik Proyek", icon: Sparkles },
    { id: "scope", label: "01-05 Scope of Work", icon: CheckSquare },
    { id: "workflow", label: "01-06 Workflow & Schedule", icon: Layers },
    { id: "inputs", label: "01-07 Data Dibutuhkan", icon: Calendar },
    { id: "roles", label: "01-08 Tim & Komunikasi", icon: Users },
    { id: "nextSteps", label: "01-09 Langkah Berikutnya", icon: CheckSquare },
    { id: "approval", label: "01-10 Persetujuan & Sign", icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* VIEW MODE 1: OVERVIEW DASHBOARD */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* GLASSY SUMMARY STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/40 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500">Overall Deliverables Progress</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">{overallProgress}%</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    {totalCompleted} / {stagesData.length} Stages Ready
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/40 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500">Active Deliverable Stage</p>
                <p className="text-base font-extrabold text-neutral-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  01-KO Kickoff
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/40 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500">Sub-deliverables Items</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {totalCompletedItems} / {totalAllItems}
                  </span>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50/80 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/50">
                    {itemCompletionRate}% Items Done
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* GLASSY STAGES CONTAINER */}
          <div className="bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl p-6 rounded-2xl border border-white/30 dark:border-white/10 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.05] dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-red" />
                  <span>Tasks & Deliverables Stage Overview</span>
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  Klik dropdown expand pada setiap stage untuk melihat detail item yang sudah atau belum selesai tanpa perlu membuka file.
                </p>
              </div>
            </div>

            {/* STAGES LIST WITH ACCORDION SUB-ITEMS */}
            <div className="grid grid-cols-1 gap-4">
              {stagesData.map((stg) => {
                const isCompleted = stg.progress === 100;
                const isInProgress = stg.progress > 0 && stg.progress < 100;
                const isExpanded = !!expandedStages[stg.code];
                const doneCount = stg.subItems.filter((i) => i.status === "done").length;

                return (
                  <div
                    key={stg.code}
                    className="bg-white/60 dark:bg-neutral-800/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    {/* STAGE HEADER ROW */}
                    <div
                      onClick={() => toggleExpand(stg.code)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* LEFT INFO & TOGGLE CHEVRON */}
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={(e) => toggleExpand(stg.code, e)}
                          className="mt-0.5 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 transition-transform"
                        >
                          <ChevronDown
                            className={clsx(
                              "w-4 h-4 transition-transform duration-200",
                              isExpanded ? "rotate-180" : "rotate-0"
                            )}
                          />
                        </button>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span
                              className={clsx(
                                "px-2.5 py-0.5 rounded-md text-xs font-black shrink-0 font-mono",
                                stg.code === "01-KO"
                                  ? "bg-brand-red text-white"
                                  : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                              )}
                            >
                              {stg.deliverableCode}
                            </span>
                            <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                              {stg.name}
                            </h4>

                            {/* STATUS BADGE */}
                            <span
                              className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1.5",
                                isCompleted && "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50",
                                isInProgress && "bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50",
                                stg.progress === 0 && "bg-neutral-200/60 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              )}
                            >
                              {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isInProgress && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                              <span>{stg.progress}% Complete ({doneCount}/{stg.subItems.length} items)</span>
                            </span>
                          </div>

                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                            {stg.deliverableTitle} — <span className="text-neutral-500">{stg.description}</span>
                          </p>

                          {/* PROGRESS BAR */}
                          <div className="w-full max-w-md bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={clsx(
                                "h-full transition-all duration-500 rounded-full",
                                isCompleted ? "bg-emerald-500" : isInProgress ? "bg-blue-500" : "bg-neutral-300"
                              )}
                              style={{ width: `${stg.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* RIGHT ACTION BUTTONS */}
                      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-black/5 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditor(stg.code)}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs",
                            stg.code === "01-KO"
                              ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                              : "bg-white/80 text-neutral-700 border border-neutral-300/80 hover:bg-white dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                          )}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Form & Report</span>
                        </button>

                        {/* ACTION DROPDOWN */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-2 rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48 p-1.5 space-y-1">
                            <button
                              onClick={() => handleOpenEditor(stg.code)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Buka Form Editor</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditor(stg.code)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                            >
                              <Eye className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Live Report Preview</span>
                            </button>
                            <button
                              onClick={() => {
                                handleOpenEditor(stg.code);
                                setTimeout(() => window.print(), 300);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                            >
                              <Printer className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Cetak / Export PDF</span>
                            </button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* EXPANDED ACCORDION SUB-ITEMS LIST */}
                    {isExpanded && (
                      <div className="border-t border-black/5 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 p-4 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
                            Deliverables Sub-items ({doneCount} Selesai, {stg.subItems.length - doneCount} Pending)
                          </span>
                          <button
                            onClick={() => handleOpenEditor(stg.code)}
                            className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1"
                          >
                            <span>Buka Editor Lengkap</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {stg.subItems.map((item) => {
                            const isDone = item.status === "done";
                            const isProg = item.status === "in_progress";

                            return (
                              <div
                                key={item.id}
                                onClick={() => handleOpenEditor(stg.code)}
                                className={clsx(
                                  "p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2.5",
                                  isDone && "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/60",
                                  isProg && "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100/60",
                                  !isDone && !isProg && "bg-white/60 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-white/90"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-mono text-[10px] opacity-70 shrink-0">{item.code}</span>
                                  <span className="truncate">{item.title}</span>
                                </div>

                                <div className="shrink-0">
                                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                  {isProg && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse block" />}
                                  {!isDone && !isProg && <Circle className="w-3.5 h-3.5 text-neutral-400" />}
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
        </div>
      )}

      {/* VIEW MODE 2: SINGLE STAGE EDITOR */}
      {viewMode === "editor" && (
        <div className="space-y-6">
          {/* EDITOR NAVIGATION HEADER WITH SECTION TABS ON TOP & EXPORT BUTTON */}
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("overview")}
                  className="px-3.5 py-2 rounded-xl bg-white/80 dark:bg-neutral-800/80 hover:bg-white text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all border border-neutral-300/80 dark:border-neutral-700 flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Overview Stage</span>
                </button>

                <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-brand-red text-white text-[11px] font-black font-mono">
                      {currentStageInfo.deliverableCode}
                    </span>
                    <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                      {currentStageInfo.name} Editor
                    </h3>
                  </div>
                </div>
              </div>

              {/* TOP RIGHT EXPORT BUTTON & MOBILE TOGGLE */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Export PDF</span>
                </button>

                {/* MOBILE VIEW TOGGLE */}
                <div className="lg:hidden flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs">
                  <button
                    onClick={() => setMobileTab("editor")}
                    className={clsx(
                      "px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1",
                      mobileTab === "editor" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                    )}
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Form
                  </button>
                  <button
                    onClick={() => setMobileTab("preview")}
                    className={clsx(
                      "px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1",
                      mobileTab === "preview" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                    )}
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION TABS ROW AT THE VERY TOP OF EDITOR VIEW */}
            {selectedStage === "01-KO" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 hide-scrollbar border-t border-black/5 dark:border-white/10">
                {kickoffSections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSection(sec.id)}
                      className={clsx(
                        "px-3.5 py-1.5 rounded-xl text-xs transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 font-extrabold",
                        isActive
                          ? "bg-brand-red text-white border border-brand-red shadow-xs"
                          : "bg-white/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700 hover:bg-white"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SPLIT SCREEN EDITOR & REPORT PREVIEW FOR SELECTED STAGE */}
          {selectedStage === "01-KO" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT PANEL: FORM EDITOR */}
              <div className={clsx("lg:col-span-5", mobileTab === "preview" && "hidden lg:block")}>
                <KickoffFormEditor
                  data={kickoffData}
                  onChange={setKickoffData}
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                />
              </div>

              {/* RIGHT PANEL: LIVE REPORT PREVIEW */}
              <div className={clsx("lg:col-span-7", mobileTab === "editor" && "hidden lg:block")}>
                <KickoffDocumentPreview data={kickoffData} />
              </div>
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-12 rounded-2xl border border-white/40 dark:border-white/10 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                <FileText className="w-7 h-7 text-brand-red" />
              </div>
              <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                Form Editor Stage {selectedStage} dalam Pengembangan
              </h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                Template editor untuk stage ini akan menyesuaikan dengan format deliverable standar Adidaya Studio berikutnya. Silakan pilih <strong>01-KO Kickoff</strong> untuk mencoba Form Editor & Live Report Preview 12 Halaman.
              </p>
              <button
                onClick={() => setSelectedStage("01-KO")}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
              >
                Buka Editor 01-KO Kickoff
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

