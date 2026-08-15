"use client";

import React, { useState } from "react";
import { KickoffDocumentData } from "./types";
import { KO_SECTIONS, koTasks } from "../setup/stages/data/ko";
import { defaultKickoffData } from "./defaultStageDocumentData";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import clsx from "clsx";

type Props = {
  data: KickoffDocumentData;
  activeSection?: string;
  activeSubTask?: string;
  customSections?: { code: string; title: string }[];
  customTasks?: any[];
  hideToolbar?: boolean;
};

export type DocumentPageItem =
  | { type: "MAIN_COVER" }
  | { type: "SECTION_COVER"; secCode: string; secNumStr: string; titleEn: string; titleId: string }
  | { type: "TASK_PAGE"; secCode: string; taskCode: string; taskName: string; taskNameId: string; tocPageIndex?: number };

export default function StageDocumentPreview({
  data,
  activeSection,
  activeSubTask,
  customSections,
  customTasks,
  hideToolbar = false,
}: Props) {
  const [activePage, setActivePage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");

  const sectionsList = customSections && customSections.length > 0 ? customSections : KO_SECTIONS;
  const hasCustomTasks = customTasks && customTasks.length > 0;
  const allTasks = hasCustomTasks ? customTasks : koTasks;

  // Build 100% Dynamic Page Flat List
  // Page 1: Main Cover Page
  const pagesList: DocumentPageItem[] = [{ type: "MAIN_COVER" }];

  // Track page indices for auto-jumping
  const sectionCoverPageIndex: Record<string, number> = {};
  const taskPageIndex: Record<string, number> = {};

  sectionsList.forEach((sec, idx) => {
    const secCode = sec.code;
    const secNumStr = sec.code.replace(/^[A-Z]{2}-/, "");
    
    if (idx === 0) {
      // Section 01: Main Cover (red) is already page 1, no separate section cover
      sectionCoverPageIndex[secCode] = 1;
    } else {
      // Section 02+: Add dark Section Cover Page
      const sectionCoverPageIndexNo = pagesList.length + 1;
      sectionCoverPageIndex[secCode] = sectionCoverPageIndexNo;
      // Indonesian title mapping for KO sections
      const SECTION_TITLE_ID_MAP: Record<string, string> = {
        "KO-01": "Informasi Umum",
        "KO-02": "Ringkasan Klien & Tujuan",
        "KO-03": "Definisi Lingkup Kerja",
        "KO-04": "Pengumpulan Data Tapak",
        "KO-05": "Pemeriksaan Peraturan & Zonasi",
        "KO-06": "Rentang Anggaran Awal",
        "KO-07": "Draf Jadwal Proyek",
        "KO-08": "Persetujuan Kickoff",
      };

      const titleIdText = (sec as any).titleId || SECTION_TITLE_ID_MAP[secCode] || sec.title;

      pagesList.push({
        type: "SECTION_COVER",
        secCode,
        secNumStr,
        titleEn: sec.title,
        titleId: titleIdText
      });
    }

    // Get tasks for this section
    let tasksForSection: any[] = [];

    if (hasCustomTasks) {
      const cleanSecNum = secCode.replace(/^[A-Z]{2}-/, "");
      tasksForSection = allTasks
        .filter((t) => {
          if (t.sectionCode === secCode) return true;
          if (t.sectionId && (sec as any)?.id && t.sectionId === (sec as any)?.id) return true;
          if (cleanSecNum && t.sectionCode && t.sectionCode.replace(/^[A-Z]{2}-/, "") === cleanSecNum) return true;
          const taskSecPrefix = (t.code || "").split("-")[0];
          if (cleanSecNum && taskSecPrefix && taskSecPrefix === cleanSecNum) return true;
          return false;
        })
        .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
    } else {
      // Fallback to seed koTasks
      tasksForSection = koTasks.filter((t) => t.sectionCode === secCode);
    }

    // Deduplicate by task code
    const seen = new Set<string>();
    tasksForSection = tasksForSection.filter((t) => {
      const key = t.code || t.taskCode || t.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Append tasks
    tasksForSection.forEach((t, tIdx) => {
      const taskCodeNum = t.code || `${secNumStr}-${String(tIdx + 1).padStart(2, "0")}`;
      const taskName = t.taskName || t.name;
      const taskNameId = t.taskNameId || t.nameId || taskName;

      const cleanTaskCode = taskCodeNum.replace(/^[A-Z]{2}-/, "");
      const isCoverTask = idx === 0 && tIdx === 0 && (taskName || "").toLowerCase().includes("cover");

      const pageNo = isCoverTask ? 1 : pagesList.length + 1;
      taskPageIndex[taskCodeNum] = pageNo;
      taskPageIndex[cleanTaskCode] = pageNo;
      taskPageIndex[`${secCode}_${taskCodeNum}`] = pageNo;
      taskPageIndex[`${secCode}_${cleanTaskCode}`] = pageNo;

      if (isCoverTask) {
        // Skip — MAIN_COVER is already page 1
        return;
      }

      // Check if this task is TOC (01-02)
      const isTOC = taskCodeNum === "01-02" || taskCodeNum === "KO-01-02";
      if (isTOC) {
        // Compute total items and how many TOC pages needed (24 items per page)
        const ITEMS_PER_PAGE = 24;
        const totalItemsCount = (sectionsList.length - 1) + allTasks.length;
        const tocPagesCount = Math.max(1, Math.ceil(totalItemsCount / ITEMS_PER_PAGE));

        for (let p = 0; p < tocPagesCount; p++) {
          pagesList.push({
            type: "TASK_PAGE",
            secCode,
            taskCode: taskCodeNum,
            taskName: p > 0 ? `${taskName} (Cont.)` : taskName,
            taskNameId: p > 0 ? `${taskNameId} (Lanjutan)` : taskNameId,
            tocPageIndex: p
          });
        }
      } else {
        pagesList.push({
          type: "TASK_PAGE",
          secCode,
          taskCode: taskCodeNum,
          taskName,
          taskNameId
        });
      }
    });
  });

  const totalPages = pagesList.length;
  console.log("[DocPreview] totalPages:", totalPages);

  // Auto-sync preview page when active section or active subtask changes
  React.useEffect(() => {
    if (activeSubTask) {
      const cleanSub = activeSubTask.replace(/^[A-Z]{2}-/, "");
      if (taskPageIndex[activeSubTask]) {
        setActivePage(taskPageIndex[activeSubTask]);
        return;
      }
      if (taskPageIndex[cleanSub]) {
        setActivePage(taskPageIndex[cleanSub]);
        return;
      }
      if (activeSection && taskPageIndex[`${activeSection}_${cleanSub}`]) {
        setActivePage(taskPageIndex[`${activeSection}_${cleanSub}`]);
        return;
      }
    }

    if (activeSection && sectionCoverPageIndex[activeSection]) {
      setActivePage(sectionCoverPageIndex[activeSection]);
      return;
    }
  }, [activeSection, activeSubTask, customSections, customTasks]);

  const handlePrint = () => {
    window.print();
  };

  const renderHeader = (pageNumber: number) => (
    <div className="flex items-center justify-between pb-2 text-[10px] text-neutral-400 border-b border-black/[0.06] mb-4 select-none">
      <div className="font-medium tracking-tight">
        {data.projectCode}-{data.projectName}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-neutral-700 dark:text-neutral-300">{data.stageName}</span>
        <span className="px-2 py-0.5 border border-neutral-300 rounded-full text-[9px] font-bold text-neutral-600">
          {data.version}
        </span>
      </div>
    </div>
  );

  const renderFooter = (pageNumber: number) => (
    <div className="mt-auto pt-4 select-none w-full">
      <div className="flex items-end justify-between gap-10">
        {/* Left Signature Column: Adidaya Studio */}
        <div className="w-48">
          <div className="border-b border-neutral-300 w-full mb-2" />
          <div className="font-black text-brand-red tracking-tight flex items-center gap-1 text-xs">
            <span>adidaya</span>
            <span className="text-brand-red font-bold">*</span>
            <span className="font-normal text-neutral-800">studio</span>
          </div>
        </div>

        {/* Right Group: Client Signature Column + Page Number */}
        <div className="flex items-end gap-6 ml-auto">
          {/* Client / Klien Signature Column (Far Right) */}
          <div className="w-48 text-right">
            <div className="border-b border-neutral-300 w-full mb-2" />
            <p className="text-xs text-neutral-500 font-semibold">
              Client / <span className="italic">Klien</span>
            </p>
          </div>

          {/* Page Number (Rightmost) */}
          <div className="pb-0.5 shrink-0">
            <span className="font-mono text-xs font-bold text-neutral-600">{pageNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionCover = (secNumStr: string, titleEn: string, titleId: string) => (
    <div className="relative w-full h-full bg-neutral-950 text-white p-16 flex flex-col justify-between overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-95" />
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-neutral-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo - Right Aligned */}
      <div className="relative z-10 flex justify-end">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span>adidaya</span>
          <span className="text-brand-red font-extrabold">*</span>
          <span className="font-light text-neutral-400">studio</span>
        </div>
      </div>

      {/* Main Section Title - Right Aligned */}
      <div className="relative z-10 my-auto text-right space-y-3 max-w-lg ml-auto">
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight break-words text-white">
          {titleEn}
        </h1>
        <p className="text-xl text-neutral-400 font-medium italic break-words">
          {titleId}
        </p>
      </div>

      {/* Bottom Right Info */}
      <div className="relative z-10 flex flex-col items-end gap-2 text-right">
        <span className="text-2xl font-black tracking-wider font-mono text-white">{data.projectCode}</span>
        <span className="text-xl font-bold tracking-wide text-neutral-300">Section {secNumStr}</span>
        <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider border border-white/30 text-white font-mono">
          {data.version}
        </span>
      </div>
    </div>
  );

  const renderSinglePageItem = (pageItem: DocumentPageItem, pageNumber: number) => {
    switch (pageItem.type) {
      case "MAIN_COVER":
        return (
          <div className="relative w-full h-full bg-brand-red text-white p-16 flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-brand-red to-red-800 opacity-90" />
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex justify-end">
              <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <span>adidaya</span>
                <span className="text-white font-extrabold">*</span>
                <span className="font-light">studio</span>
              </div>
            </div>

            <div className="relative z-10 my-auto text-right space-y-3 max-w-lg ml-auto">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight break-words">
                {data.projectName}
              </h1>
              <p className="text-xl text-white/90 font-medium break-words">{data.projectLocation}</p>
            </div>

            <div className="relative z-10 flex flex-col items-end gap-2 text-right">
              <span className="text-2xl font-black tracking-wider font-mono">{data.projectCode}</span>
              <span className="text-xl font-bold tracking-wide">{data.stageName || "[Stage]"}</span>
              <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider border border-white/30">
                {data.version}
              </span>
            </div>
          </div>
        );

      case "SECTION_COVER":
        return renderSectionCover(pageItem.secNumStr, pageItem.titleEn, pageItem.titleId);

      case "TASK_PAGE":
        const isTOC = pageItem.taskCode === "01-02" || pageItem.taskCode === "KO-01-02";
        const currentStageName = data.stageName || "Kickoff";

        const STAGE_ID_TRANSLATION_MAP: Record<string, string> = {
          "Kickoff": "Tahap Awal",
          "Schematic Design": "Desain Skematik",
          "Design Development": "Pengembangan Desain",
          "Engineering Design": "Desain Rekayasa & Teknis",
          "Procurement & Bidding": "Pengadaan",
          "Procurement": "Pengadaan",
          "Construction": "Pelaksanaan Konstruksi",
          "Handover": "Serah Terima",
          "Handover & Closeout": "Serah Terima"
        };

        const stageNameIdStr = STAGE_ID_TRANSLATION_MAP[currentStageName] || currentStageName;

        const displayTaskName = pageItem.taskName.replace(/Kickoff/gi, currentStageName);
        const displayTaskNameId = pageItem.taskNameId
          .replace(/Kickoff/gi, stageNameIdStr)
          .replace(/\bKO\b/g, stageNameIdStr);

        return (
          <div className="w-full h-full bg-white p-12 flex flex-col justify-between overflow-hidden">
            {renderHeader(pageNumber)}

            <div className="space-y-1 mb-6">
              <div className="flex items-start justify-between gap-4">
                {/* Title & Subtitle (Left/Center) */}
                <div className="flex flex-col">
                  <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                    {displayTaskName}
                  </h2>
                  <p className="text-sm font-semibold text-neutral-500 italic">
                    {displayTaskNameId}
                  </p>
                </div>
                {/* Task Code Badge (Far Right for quick flipping readability) */}
                <span className="px-3 py-1 rounded-lg bg-brand-red/10 text-brand-red font-mono text-sm font-black shrink-0">
                  {pageItem.taskCode.replace(/^[A-Z]{2}-/, "")}
                </span>
              </div>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            {/* DYNAMIC TABLE OF CONTENTS INDEX PREVIEW */}
            {isTOC ? (() => {
              const ITEMS_PER_PAGE = 26;
              const pageIdxOffset = (pageItem as any).tocPageIndex ?? 0;
              const allTocEntries = pagesList.filter(item => item.type !== "MAIN_COVER");
              const startIndex = pageIdxOffset * ITEMS_PER_PAGE;
              const visibleEntries = allTocEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

              return (
                <div className="flex-1 my-auto py-2 space-y-1 overflow-hidden">
                  <div className="space-y-1">
                    {visibleEntries.map((item, idx) => {
                      const globalIdx = startIndex + idx;
                      const pageNum = globalIdx + 2; // +2 for Cover Page offset
                      const isSec = item.type === "SECTION_COVER";
                      const titleEn = isSec ? item.titleEn : item.taskName;
                      const titleId = isSec ? item.titleId : (item.taskNameId !== item.taskName ? item.taskNameId : "");

                      return (
                        <div
                          key={globalIdx}
                          className={clsx(
                            "flex items-center justify-between text-[11px] py-[2px] transition-colors leading-snug",
                            isSec ? "font-bold text-neutral-900 pt-1.5 border-b border-neutral-200" : "text-neutral-700 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="font-mono text-[10px] font-bold text-neutral-400 shrink-0 w-10">
                              {isSec ? `SEC ${item.secNumStr}` : item.taskCode}
                            </span>
                            <div className="flex items-baseline gap-2 truncate">
                              <span className={clsx("truncate", isSec ? "font-extrabold uppercase text-neutral-900" : "font-semibold text-neutral-800")}>
                                {titleEn}
                              </span>
                              {titleId && (
                                <span className="text-[10px] font-normal italic text-neutral-400 shrink-0">
                                  {titleId}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-neutral-900 shrink-0 ml-2">
                            {pageNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : pageItem.taskCode === "01-03" ? (
              /* REAL CLEAN TYPOGRAPHY LIST FOR PURPOSE OF STAGE (01-03) */
              <div className="flex-1 my-auto py-2 space-y-4">
                <div className="space-y-4">
                  {(data.purposeList || defaultKickoffData.purposeList).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-baseline gap-3.5 pb-3 border-b border-neutral-100 last:border-0"
                    >
                      <span className="font-mono text-xs font-bold text-brand-red shrink-0">
                        0{idx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-neutral-900 leading-snug">
                          {item.en}
                        </h4>
                        <p className="text-[11px] font-normal italic text-neutral-400 leading-snug">
                          {item.idText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "01-04" ? (
              /* CLEAN VERTICAL TIMELINE WITH ACTIVE RED STAGE & STACKED CHILDREN LIST */
              <div className="flex-1 my-auto py-2 space-y-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-neutral-200">
                  {(data.workflowSteps || defaultKickoffData.workflowSteps).map((step, idx) => {
                    const isCurrentStage = step.stageName.toLowerCase().includes((data.stageName || "").toLowerCase()) ||
                                          (data.stageName || "").toLowerCase().includes(step.stageName.toLowerCase());

                    return (
                      <div key={step.id || idx} className="relative flex items-start gap-3.5">
                        {/* Timeline Circle Node */}
                        <span className={clsx(
                          "absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center font-mono text-[9px] font-bold shrink-0 z-10",
                          isCurrentStage ? "border-brand-red bg-brand-red text-white" : "border-neutral-300 text-neutral-400"
                        )} />

                        <div className="flex-1 min-w-0 pb-3 border-b border-neutral-100 last:border-0 space-y-1.5">
                          {/* Stage Header Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0",
                                isCurrentStage ? "bg-brand-red text-white" : "bg-neutral-100 text-neutral-600"
                              )}>
                                {step.stageCode}
                              </span>
                              <h4 className={clsx(
                                "text-xs font-bold truncate",
                                isCurrentStage ? "text-brand-red font-black" : "text-neutral-900"
                              )}>
                                {step.stageName}
                              </h4>
                            </div>
                            <span className="font-mono text-[10px] font-semibold text-neutral-400 shrink-0">
                              ⏱ {step.duration}
                            </span>
                          </div>

                          {/* Stacked Vertical Children Items (No Columns) */}
                          <div className="space-y-1 pl-1 pt-0.5">
                            {step.items?.map((sub, sIdx) => (
                              <div key={sub.id || sIdx} className="flex items-baseline gap-2 text-[11px] leading-snug">
                                <span className={clsx("font-bold text-[10px] shrink-0", isCurrentStage ? "text-brand-red" : "text-neutral-400")}>•</span>
                                <div className="flex items-baseline gap-2 truncate">
                                  <span className="font-semibold text-neutral-800 shrink-0">{sub.titleEn}</span>
                                  <span className="font-normal italic text-neutral-400 truncate">({sub.titleId})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* PLACEHOLDER CONTENT FOR OTHER STANDARD TASK PAGES */
              <div className="mb-auto p-8 rounded-2xl bg-neutral-50/80 border border-dashed border-neutral-300 flex flex-col items-center justify-center text-center space-y-2 my-auto min-h-[400px]">
                <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  DOCUMENT CONTENT AREA
                </span>
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 italic">
                  "Content starts from here."
                </p>
                <span className="text-xs text-neutral-400 font-medium">
                  ({pageItem.taskCode} — {displayTaskName})
                </span>
              </div>
            )}

            {renderFooter(pageNumber)}
          </div>
        );
    }
  };

  // Dynamic scale wrapper for fixed 794px x 1123px A4 sheets
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newScale = containerWidth / 794;
        setScale(Math.min(1, newScale));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const renderA4Sheet = (content: React.ReactNode, pageNum: number) => (
    <div
      key={pageNum}
      className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-none origin-top transition-transform flex flex-col shrink-0"
      style={{
        width: "794px",
        height: "1123px",
        transform: `scale(${scale})`,
        marginBottom: `${(scale - 1) * 1123}px`,
      }}
    >
      {content}
    </div>
  );

  const currentPageItem = pagesList[activePage - 1] || pagesList[0];

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* TOOLBAR CONTROLS */}
      {!hideToolbar && (
        <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
            <button
              onClick={() => setViewMode("single")}
              className={clsx(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                viewMode === "single"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Single Page</span>
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={clsx(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                viewMode === "all"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              <span>All Pages ({totalPages})</span>
            </button>
          </div>
        </div>

        {/* PAGE NAVIGATION CONTROLS (IF SINGLE PAGE MODE) */}
        {viewMode === "single" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-neutral-700 dark:text-neutral-300 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-extrabold text-neutral-800 dark:text-white px-1">
              {activePage} / {totalPages}
            </span>
            <button
              onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-neutral-700 dark:text-neutral-300 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* DOCUMENT CANVAS CONTAINER */}
      <div className="flex flex-col items-center gap-6 py-4">
        {viewMode === "single" ? (
          renderA4Sheet(renderSinglePageItem(currentPageItem, activePage), activePage)
        ) : (
          pagesList.map((item, idx) => renderA4Sheet(renderSinglePageItem(item, idx + 1), idx + 1))
        )}
      </div>
    </div>
  );
}
