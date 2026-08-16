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
  customOrientation?: "portrait" | "landscape";
  customPhotoCount?: number;
  customMatrixColCount?: number;
};

export type DocumentPageItem =
  | { type: "MAIN_COVER" }
  | { type: "SECTION_COVER"; secCode: string; secNumStr: string; titleEn: string; titleId: string }
  | { type: "TASK_PAGE"; secCode: string; taskCode: string; taskName: string; taskNameId: string; tocPageIndex?: number; subPage?: number };

export default function StageDocumentPreview({
  data,
  activeSection,
  activeSubTask,
  customSections,
  customTasks,
  hideToolbar = false,
  customOrientation,
  customPhotoCount = 3,
  customMatrixColCount = 3,
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
      const isMainCoverTask = idx === 0 && tIdx === 0 && (cleanTaskCode === "01-00");
      const pageNo = isMainCoverTask ? 1 : pagesList.length + 1;
      
      taskPageIndex[taskCodeNum] = pageNo;
      taskPageIndex[cleanTaskCode] = pageNo;
      taskPageIndex[`${taskCodeNum}-P`] = pageNo;
      taskPageIndex[`${taskCodeNum}-L`] = pageNo;
      taskPageIndex[`${cleanTaskCode}-P`] = pageNo;
      taskPageIndex[`${cleanTaskCode}-L`] = pageNo;
      taskPageIndex[`${secCode}_${taskCodeNum}`] = pageNo;
      taskPageIndex[`${secCode}_${cleanTaskCode}`] = pageNo;

      if (isMainCoverTask) {
        // Skip — MAIN_COVER is already page 1
        return;
      }

      // Check if this task is TOC (01-02), Timeline (02-05), or Scope (03-01)
      const isTOC = taskCodeNum === "01-02" || taskCodeNum === "KO-01-02";
      const isTimeline = taskCodeNum === "02-05" || taskCodeNum === "KO-02-05";
      const isScope = taskCodeNum === "03-01" || taskCodeNum === "KO-03-01";

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
      } else if (isTimeline) {
        // Target Timeline & Schedule (02-05) gets 2 pages: Page 1 (Table) & Page 2 (Visual Gantt Chart)
        taskPageIndex["02-05"] = pageNo;
        taskPageIndex["02-05_p1"] = pageNo;
        taskPageIndex["02-05_p2"] = pageNo + 1;
        taskPageIndex[`${secCode}_02-05_p2`] = pageNo + 1;

        pagesList.push({
          type: "TASK_PAGE",
          secCode,
          taskCode: taskCodeNum,
          taskName: `${taskName} — Table Schedule`,
          taskNameId: `${taskNameId} — Tabel Jadwal`,
          subPage: 1
        });
        pagesList.push({
          type: "TASK_PAGE",
          secCode,
          taskCode: taskCodeNum,
          taskName: `${taskName} — Visual Timeline Chart`,
          taskNameId: `${taskNameId} — Grafik Visual Timeline`,
          subPage: 2
        });
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
      // Try exact match first
      if (taskPageIndex[activeSubTask]) {
        setActivePage(taskPageIndex[activeSubTask]);
        return;
      }
      if (taskPageIndex[cleanSub]) {
        setActivePage(taskPageIndex[cleanSub]);
        return;
      }
      // Try stripping orientation suffix (-P, -L) for template catalog codes
      const baseSub = cleanSub.replace(/-(P|L)$/, "");
      if (baseSub !== cleanSub && taskPageIndex[baseSub]) {
        setActivePage(taskPageIndex[baseSub]);
        return;
      }
      if (activeSection && taskPageIndex[`${activeSection}_${cleanSub}`]) {
        setActivePage(taskPageIndex[`${activeSection}_${cleanSub}`]);
        return;
      }
      if (activeSection && baseSub !== cleanSub && taskPageIndex[`${activeSection}_${baseSub}`]) {
        setActivePage(taskPageIndex[`${activeSection}_${baseSub}`]);
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
        if (pageItem.taskCode === "01-01" || pageItem.taskCode === "02-00") {
          return renderSectionCover("01", "General Information", "Informasi Umum Proyek");
        }

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
              const ITEMS_PER_PAGE = isLandscape ? 36 : 26;
              const pageIdxOffset = (pageItem as any).tocPageIndex ?? 0;
              const allTocEntries = pagesList.filter(item => item.type !== "MAIN_COVER");
              const startIndex = pageIdxOffset * ITEMS_PER_PAGE;
              const visibleEntries = allTocEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

              return (
                <div className="flex-1 my-auto py-2 space-y-1 overflow-hidden">
                  <div className={clsx("gap-x-8 gap-y-1.5", isLandscape ? "grid grid-cols-2" : "space-y-1")}>
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
                                <span className="text-[10px] font-normal italic text-neutral-400 shrink-0 truncate max-w-[140px]">
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
              /* REAL CLEAN TYPOGRAPHY LIST FOR PURPOSE OF STAGE (01-03) - 2 COLUMNS (TOP-TO-BOTTOM THEN RIGHT) */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4 max-w-3xl")}>
                  {(data.purposeList || defaultKickoffData.purposeList).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-baseline gap-3.5 pb-3 border-b border-neutral-100 break-inside-avoid"
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
              /* CLEAN WORKFLOW TIMELINE (01-04) - RESPONSIVE 2 COLUMNS IN LANDSCAPE (TOP-TO-BOTTOM THEN RIGHT) */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4 max-w-3xl")}>
                  {(data.workflowSteps || defaultKickoffData.workflowSteps).map((step, idx) => {
                    const currentStageStr = (data.stageName || "Kickoff").toLowerCase();
                    const stepNameStr = step.stageName.toLowerCase();
                    const stepCodeStr = step.stageCode.toLowerCase();

                    // Flexible match mapping for acronyms & stage names (e.g. Kickoff <-> KO, Engineering Design <-> ED)
                    const isCurrentStage =
                      stepNameStr.includes(currentStageStr) ||
                      currentStageStr.includes(stepNameStr) ||
                      (currentStageStr.includes("kickoff") && (stepCodeStr.includes("ko") || stepNameStr.includes("kick"))) ||
                      (currentStageStr.includes("engineering") && (stepCodeStr.includes("ed") || stepNameStr.includes("engineer")));

                    return (
                      <div key={step.id || idx} className="relative flex items-start gap-3.5 pl-6 pb-3 border-b border-neutral-100 break-inside-avoid before:absolute before:left-2 before:top-2.5 before:bottom-0 before:w-0.5 before:bg-neutral-200">
                        {/* Timeline Circle Node */}
                        <span className={clsx(
                          "absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center font-mono text-[9px] font-bold shrink-0 z-10",
                          isCurrentStage ? "border-brand-red bg-brand-red text-white" : "border-neutral-300 text-neutral-400"
                        )} />

                        <div className="flex-1 min-w-0 space-y-1.5">
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

                          {/* Stacked Vertical Children Items */}
                          <div className="space-y-1 pl-1 pt-0.5">
                            {step.items?.map((sub, sIdx) => (
                              <div key={sub.id || sIdx} className="flex items-baseline gap-2 text-[11px] leading-snug">
                                <span className={clsx("font-bold text-[10px] shrink-0", isCurrentStage ? "text-brand-red" : "text-neutral-400")}>•</span>
                                <div className="flex items-baseline gap-2 truncate">
                                  <span className="font-semibold text-neutral-800 shrink-0">{sub.titleEn}</span>
                                  <span className="font-normal italic text-neutral-400 truncate text-[10px]">({sub.titleId})</span>
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
            ) : pageItem.taskCode === "02-01" ? (
              /* REAL CLEAN DOCUMENT TEXT PARAGRAPHS FOR PROJECT UNDERSTANDING (02-01) - 2 COLUMNS IN LANDSCAPE (LEFT PARAGRAPH, RIGHT POINTS) */
              <div className="flex-1 my-auto py-2">
                {isLandscape ? (
                  /* LANDSCAPE 2-COLUMN SPLIT: LEFT SUMMARY PARAGRAPH (5/12) + RIGHT KEY ISSUES POINTS (7/12) */
                  <div className="grid grid-cols-12 gap-8 items-start">
                    {/* Left Column (5/12): Main Summary Paragraph (EN & ID) */}
                    <div className="col-span-5 space-y-2 pr-4 border-r border-neutral-100">
                      <span className="text-[10px] font-mono font-bold text-brand-red uppercase block">
                        EXECUTIVE SUMMARY
                      </span>
                      <p className="text-xs font-semibold text-neutral-900 leading-relaxed">
                        {data.understandingIntroEn || defaultKickoffData.understandingIntroEn}
                      </p>
                      <p className="text-[11px] font-normal italic text-neutral-400 leading-relaxed">
                        {data.understandingIntroId || defaultKickoffData.understandingIntroId}
                      </p>
                    </div>

                    {/* Right Column (7/12): Key Issues Narrative Points */}
                    <div className="col-span-7 space-y-4">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        KEY CONCEPT DRIVERS & PARAMETERS
                      </span>
                      {(data.understandingCards || defaultKickoffData.understandingCards).map((card, idx) => (
                        <div key={card.id || idx} className="space-y-1 pb-3 border-b border-neutral-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-red">0{idx + 1}</span>
                            <h4 className="text-xs font-bold text-neutral-900">{card.titleEn}</h4>
                            <span className="text-xs font-normal italic text-neutral-400">({card.titleId})</span>
                          </div>
                          <p className="text-xs font-medium text-neutral-700 leading-relaxed pl-6">
                            {card.descEn}
                          </p>
                          <p className="text-[11px] font-normal italic text-neutral-400 leading-relaxed pl-6">
                            {card.descId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* PORTRAIT STACKED LAYOUT */
                  <div className="space-y-4">
                    <div className="space-y-1.5 pb-4 border-b border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-900 leading-relaxed">
                        {data.understandingIntroEn || defaultKickoffData.understandingIntroEn}
                      </p>
                      <p className="text-[11px] font-normal italic text-neutral-400 leading-relaxed">
                        {data.understandingIntroId || defaultKickoffData.understandingIntroId}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {(data.understandingCards || defaultKickoffData.understandingCards).map((card, idx) => (
                        <div key={card.id || idx} className="space-y-1 pb-3 border-b border-neutral-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-red">0{idx + 1}</span>
                            <h4 className="text-xs font-bold text-neutral-900">{card.titleEn}</h4>
                            <span className="text-xs font-normal italic text-neutral-400">({card.titleId})</span>
                          </div>
                          <p className="text-xs font-medium text-neutral-700 leading-relaxed pl-6">
                            {card.descEn}
                          </p>
                          <p className="text-[11px] font-normal italic text-neutral-400 leading-relaxed pl-6">
                            {card.descId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : pageItem.taskCode === "02-02" ? (
              /* REAL CLEAN DOCUMENT PREVIEW FOR CLIENT'S NEEDS & VISION (02-02) - 2 COLUMNS (TOP-TO-BOTTOM THEN RIGHT) */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4 max-w-3xl")}>
                  {[
                    {
                      num: "01",
                      titleEn: "Spatial Flexibility & Scalability",
                      titleId: "Fleksibilitas & Skalabilitas Ruang",
                      descEn: "Spaces must accommodate peak training hours seamlessly without feeling overcrowded.",
                      descId: "Area harus dapat menampung jam puncak latihan secara efisien tanpa terasa sempit."
                    },
                    {
                      num: "02",
                      titleEn: "Character-Driven Brand Ambience",
                      titleId: "Suasana Merek Berkarakter Kuat",
                      descEn: "Material selection and lighting ambiance should reflect precision, strength, and modern aesthetics.",
                      descId: "Pemilihan material dan pencahayaan harus mencerminkan presisi, kekuatan, dan estetika modern."
                    },
                    {
                      num: "03",
                      titleEn: "Seamless Member Journey",
                      titleId: "Alur Pengalaman Anggota yang Lancar",
                      descEn: "Intuitive transition from reception, locker areas, main workout floor, to recovery zones.",
                      descId: "Transisi intuitif dari resepsionis, loker, area latihan utama, hingga zona pemulihan."
                    },
                    {
                      num: "04",
                      titleEn: "Integrated Technology & Smart Control",
                      titleId: "Teknologi Terintegrasi & Kontrol Pintar",
                      descEn: "Smart access control, automated lighting scenes, and integrated sound zones.",
                      descId: "Akses kontrol pintar, skenario pencahayaan otomatis, dan zona tata suara terintegrasi."
                    }
                  ].map((item) => (
                    <div key={item.num} className="space-y-1 pb-3 border-b border-neutral-100 break-inside-avoid">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-red">{item.num}</span>
                        <h4 className="text-xs font-bold text-neutral-900">{item.titleEn}</h4>
                        <span className="text-xs font-normal italic text-neutral-400">({item.titleId})</span>
                      </div>
                      <p className="text-xs font-medium text-neutral-700 leading-relaxed pl-6">
                        {item.descEn}
                      </p>
                      <p className="text-[11px] font-normal italic text-neutral-400 leading-relaxed pl-6">
                        {item.descId}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "02-03" ? (
              /* REAL DOCUMENT PREVIEW FOR FUNCTIONAL REQUIREMENTS (02-03) - TABLE VIEW */
              <div className="flex-1 my-auto py-2 space-y-4">
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 text-[10px] font-mono font-bold text-neutral-900 uppercase tracking-wider">
                        <th className="py-2.5 px-1">Floor <span className="font-sans font-normal italic text-neutral-400 normal-case">(Lantai)</span></th>
                        <th className="py-2.5 px-2">Room Name <span className="font-sans font-normal italic text-neutral-400 normal-case">(Nama Ruang)</span></th>
                        <th className="py-2.5 px-2 text-right">Area <span className="font-sans font-normal italic text-neutral-400 normal-case">(Luasan)</span></th>
                        <th className="py-2.5 px-2 text-right">Capacity <span className="font-sans font-normal italic text-neutral-400 normal-case">(Kapasitas)</span></th>
                        <th className="py-2.5 px-2 text-left">Notes <span className="font-sans font-normal italic text-neutral-400 normal-case">(Keterangan)</span></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {[
                        {
                          floorLabel: "Floor 01",
                          subtotalArea: "105 m²",
                          subtotalCap: "35 Pax",
                          rooms: [
                            { roomEn: "Lobby & Reception Area", roomId: "Area Resepsionis & Lobi", area: "45 m²", cap: "15 Pax", noteEn: "Includes turnstile & waiting lounge", noteId: "Termasuk turnstile & ruang tunggu" },
                            { roomEn: "Locker & Shower Room", roomId: "Ruang Loker & Bilas", area: "60 m²", cap: "20 Pax", noteEn: "Wet zone with anti-slip flooring", noteId: "Area basah dengan lantai anti-selip" },
                          ]
                        },
                        {
                          floorLabel: "Floor 02",
                          subtotalArea: "275 m²",
                          subtotalCap: "80 Pax",
                          rooms: [
                            { roomEn: "Main Workout & Free Weight Zone", roomId: "Area Latihan Utama & Beban", area: "180 m²", cap: "50 Pax", noteEn: "High-impact acoustic flooring", noteId: "Lantai akustik tahan benturan" },
                            { roomEn: "Cardio & Endurance Area", roomId: "Area Kardio & Ketahanan", area: "95 m²", cap: "30 Pax", noteEn: "Optimized power outlets & ventilation", noteId: "Stopkontak & ventilasi teroptimasi" },
                          ]
                        },
                        {
                          floorLabel: "Floor 03",
                          subtotalArea: "70 m²",
                          subtotalCap: "12 Pax",
                          rooms: [
                            { roomEn: "Recovery & Ice Bath Lounge", roomId: "Area Pemulihan & Es", area: "70 m²", cap: "12 Pax", noteEn: "Waterproof membrane & drainage system", noteId: "Membran tahan air & sistem drainase" },
                          ]
                        }
                      ].map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          {group.rooms.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-neutral-100">
                              {rIdx === 0 && (
                                <td
                                  rowSpan={group.rooms.length + 1}
                                  className="py-2.5 px-1 font-mono text-[11px] font-bold text-brand-red whitespace-nowrap align-top border-r border-neutral-100 pr-3"
                                >
                                  {group.floorLabel}
                                </td>
                              )}
                              <td className="py-2.5 px-2 align-top">
                                <span className="font-semibold text-neutral-800 block leading-tight">{row.roomEn}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{row.roomId}</span>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-xs font-bold text-neutral-800 text-right whitespace-nowrap align-top">
                                {row.area}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-xs font-bold text-neutral-800 text-right whitespace-nowrap align-top">
                                {row.cap}
                              </td>
                              <td className="py-2.5 px-2 align-top">
                                <span className="font-medium text-neutral-700 block leading-tight text-[11px]">{row.noteEn}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{row.noteId}</span>
                              </td>
                            </tr>
                          ))}
                          {/* Floor Subtotal Row */}
                          <tr className="bg-neutral-50/70 border-b border-neutral-200/80 font-semibold text-[11px]">
                            <td className="py-1.5 px-2 text-neutral-500 text-right font-mono italic">
                              Subtotal {group.floorLabel}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-neutral-800">
                              {group.subtotalArea}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-neutral-600">
                              {group.subtotalCap}
                            </td>
                            <td className="py-1.5 px-2"></td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-900 font-bold text-xs">
                        <td colSpan={2} className="py-2.5 px-1 text-neutral-900">
                          Total Programmed Area <span className="font-sans font-normal italic text-neutral-400 text-[11px]">(Total Luasan)</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-brand-red text-sm">450 m²</td>
                        <td className="py-2.5 px-2 text-right font-mono text-neutral-800 text-xs">127 Pax</td>
                        <td className="py-2.5 px-2 text-neutral-400 text-[11px] font-normal italic">3 Floors Total</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : pageItem.taskCode === "02-04" ? (() => {
              const cols = customMatrixColCount || 3;
              const dataGroups = [
                {
                  floorLabel: "01. Ground Floor Zone",
                  rooms: [
                    { roomEn: "Lobby & Reception Area", area: "45 m²", cap: "15 Pax" },
                    { roomEn: "Locker & Shower Room", area: "60 m²", cap: "20 Pax" }
                  ]
                },
                {
                  floorLabel: "02. Main Workout Floor",
                  rooms: [
                    { roomEn: "Main Workout & Free Weight", area: "180 m²", cap: "50 Pax" },
                    { roomEn: "Cardio & Endurance Area", area: "95 m²", cap: "30 Pax" }
                  ]
                },
                {
                  floorLabel: "03. Recovery & Wellness",
                  rooms: [
                    { roomEn: "Recovery & Ice Bath Lounge", area: "70 m²", cap: "12 Pax" },
                    { roomEn: "Sauna & Infrared Cabin", area: "40 m²", cap: "8 Pax" }
                  ]
                },
                {
                  floorLabel: "04. Utility & Back of House",
                  rooms: [
                    { roomEn: "MEP & Electrical Room", area: "35 m²", cap: "4 Pax" },
                    { roomEn: "Staff Rest & Storage", area: "25 m²", cap: "6 Pax" }
                  ]
                },
                {
                  floorLabel: "05. Outdoor & Parking",
                  rooms: [
                    { roomEn: "Valet & Drop-off Zone", area: "120 m²", cap: "30 Pax" },
                    { roomEn: "Outdoor Terrace Lounge", area: "80 m²", cap: "25 Pax" }
                  ]
                },
                {
                  floorLabel: "06. Admin & Management",
                  rooms: [
                    { roomEn: "Manager Office & Meeting", area: "40 m²", cap: "8 Pax" }
                  ]
                }
              ];

              // Calculate Totals & Subtotals for 02-04
              const totalAreaSum = dataGroups.reduce((acc, g) => acc + g.rooms.reduce((rAcc, r) => rAcc + parseInt(r.area), 0), 0);
              const totalCapSum = dataGroups.reduce((acc, g) => acc + g.rooms.reduce((rAcc, r) => rAcc + parseInt(r.cap), 0), 0);

              return (
                /* 02-04 FUNCTIONAL REQUIREMENTS MATRIX - PURE CLEAN TYPOGRAPHY TABLE FORMAT */
                <div className="flex-1 my-auto py-2 space-y-4">
                  {/* Clean Top Total Summary Line (No Box/Card) */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 text-xs font-mono select-none">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-400 uppercase">TOTAL PROGRAMMED AREA:</span>
                      <span className="font-black text-brand-red text-sm">{totalAreaSum} m²</span>
                    </div>
                    {cols === 2 && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-400 uppercase">TOTAL CAPACITY:</span>
                        <span className="font-bold text-neutral-800">{totalCapSum} Pax</span>
                      </div>
                    )}
                    <span className="text-[10px] text-neutral-400 font-sans italic">6 Zones Total</span>
                  </div>

                  {/* Multi-Column Flow Grid */}
                  <div className={clsx(cols === 2 ? "columns-2 gap-8 space-y-5" : "columns-3 gap-6 space-y-5")}>
                    {dataGroups.map((group, gIdx) => {
                      const zoneSubtotalArea = group.rooms.reduce((sum, r) => sum + parseInt(r.area), 0);
                      const zoneSubtotalCap = group.rooms.reduce((sum, r) => sum + parseInt(r.cap), 0);

                      return (
                        <div key={gIdx} className="space-y-2 break-inside-avoid pb-3 border-b border-neutral-200">
                          {/* Zone Header with Clean Plain Text Subtotal (No Badge) */}
                          <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                            <span className="font-mono text-xs font-bold text-brand-red uppercase truncate">{group.floorLabel}</span>
                            <span className="font-mono text-xs font-bold text-brand-red">
                              {zoneSubtotalArea} m²
                            </span>
                          </div>

                          {/* Room Table Items */}
                          <table className="w-full text-left border-collapse">
                            <tbody>
                              {group.rooms.map((rm, rIdx) => (
                                <tr key={rIdx} className="border-b border-neutral-100 last:border-0 text-xs">
                                  <td className="py-1.5 pr-2 font-semibold text-neutral-800 align-top">
                                    {rm.roomEn}
                                  </td>
                                  <td className="py-1.5 px-1 font-mono font-bold text-neutral-900 text-right whitespace-nowrap align-top">
                                    {rm.area}
                                  </td>
                                  {cols === 2 && (
                                    <td className="py-1.5 pl-2 font-mono font-bold text-neutral-500 text-right whitespace-nowrap align-top">
                                      {rm.cap}
                                    </td>
                                  )}
                                </tr>
                              ))}
                              {/* Subtotal Row per Zone (Clean Plain Text) */}
                              <tr className="font-mono font-bold text-[11px] border-t border-neutral-200">
                                <td className="py-1.5 pr-2 text-right uppercase text-neutral-400">Subtotal</td>
                                <td className="py-1.5 px-1 text-right text-brand-red">{zoneSubtotalArea} m²</td>
                                {cols === 2 && <td className="py-1.5 pl-2 text-right text-neutral-600">{zoneSubtotalCap} Pax</td>}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : pageItem.taskCode === "05-01" || pageItem.taskCode === "05-01-P" || pageItem.taskCode === "05-01-L" ? (
              /* REAL BUDGET EXPECTATION PREVIEW (05-01 / 02-04) - NO CARDS, AREA X PRICE FORMULA BREAKDOWN */
              <div className="flex-1 my-auto py-2 space-y-5">
                {/* 1. Top Section (No Cards): Client Ceiling & Area x Construction Price Formula */}
                <div className="space-y-3 pb-3 border-b border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                        Client Budget Ceiling <span className="font-sans font-normal italic text-neutral-400 normal-case">(Plafon Maksimal Anggaran Klien)</span>
                      </span>
                      <span className="text-base font-black font-mono text-neutral-900">
                        Rp 2.000.000.000
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        WITHIN CLIENT'S BUDGET
                      </span>
                      <span className="text-[10px] font-normal italic text-neutral-400 block mt-0.5">(Sesuai Batas Anggaran)</span>
                    </div>
                  </div>

                  {/* Formula Calculation Summary Row */}
                  <div className="flex items-center gap-4 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase block">BUILDING AREA <span className="font-sans font-normal italic text-neutral-400 normal-case">(LUASAN)</span></span>
                      <span className="font-bold text-neutral-900">450 m²</span>
                    </div>
                    <span className="text-neutral-400 font-bold">×</span>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase block">EST. EST / M² <span className="font-sans font-normal italic text-neutral-400 normal-case">(HARGA PER M²)</span></span>
                      <span className="font-bold text-neutral-900">Rp 3.333.333 / m²</span>
                    </div>
                    <span className="text-neutral-400 font-bold">=</span>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase block">TOTAL TARGET ESTIMATE</span>
                      <span className="font-bold text-brand-red">Rp 1.500.000.000</span>
                    </div>
                  </div>
                </div>

                {/* 2. Discipline Breakdown Table with Description (No Price/m2 per scope) */}
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 text-[10px] font-mono font-bold text-neutral-900 uppercase tracking-wider">
                        <th className="py-2.5 px-1">Scope Category <span className="font-sans font-normal italic text-neutral-400 normal-case">(Kategori Lingkup)</span></th>
                        <th className="py-2.5 px-2">Description <span className="font-sans font-normal italic text-neutral-400 normal-case">(Keterangan Pekerjaan)</span></th>
                        <th className="py-2.5 px-2 text-right">Weight % <span className="font-sans font-normal italic text-neutral-400 normal-case">(Bobot)</span></th>
                        <th className="py-2.5 px-2 text-right">Target Budget <span className="font-sans font-normal italic text-neutral-400 normal-case">(Target Anggaran)</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 text-xs">
                      {[
                        { catEn: "Structure", catId: "Pekerjaan Struktur", descEn: "Foundation, reinforced concrete & steel beam framework", descId: "Pondasi, beton bertulang & rangka baja", areaShare: "33.3%", budget: "Rp 500.000.000" },
                        { catEn: "Architecture", catId: "Pekerjaan Arsitektur", descEn: "Facade, brick partition wall, waterproofing & roof", descId: "Fasad, dinding bata, waterproofing & atap", areaShare: "23.3%", budget: "Rp 350.000.000" },
                        { catEn: "MEP", catId: "Pekerjaan MEP", descEn: "Electrical main panel, fresh air HVAC, plumbing & drainage", descId: "Panel listrik utama, AC & ventilasi, plambing", areaShare: "16.7%", budget: "Rp 250.000.000" },
                        { catEn: "Interior", catId: "Pekerjaan Interior", descEn: "Custom joinery, acoustic flooring, wall finish & ceiling", descId: "Joinery kustom, lantai akustik, finishing dinding", areaShare: "14.7%", budget: "Rp 220.000.000" },
                        { catEn: "Landscape", catId: "Pekerjaan Lanskap", descEn: "Outdoor greenery, hardscape pathway & exterior lightings", descId: "Area hijau luar, jaluran hardscape & lampu luar", areaShare: "5.3%", budget: "Rp 80.000.000" },
                        { catEn: "Design Fee", catId: "Biaya Desain", descEn: "Comprehensive architectural & engineering design service", descId: "Jasa desain arsitektur & rekayasa lengkap", areaShare: "6.7%", budget: "Rp 100.000.000" },
                      ].map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="py-2.5 px-1 font-mono text-[11px] font-bold text-brand-red whitespace-nowrap align-top">
                            {row.catEn}
                            <span className="font-sans font-normal italic text-neutral-400 text-[10px] block">{row.catId}</span>
                          </td>
                          <td className="py-2.5 px-2 align-top">
                            <span className="font-semibold text-neutral-800 block leading-tight">{row.descEn}</span>
                            <span className="font-normal italic text-neutral-400 text-[10px] block">{row.descId}</span>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-xs text-neutral-600 text-right whitespace-nowrap align-top">
                            {row.areaShare}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-xs font-bold text-neutral-800 text-right whitespace-nowrap align-top">
                            {row.budget}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-neutral-300 font-bold text-xs">
                        <td colSpan={2} className="py-3 px-1 text-neutral-900">
                          Total Budget Expectation <span className="font-sans font-normal italic text-neutral-400 text-[11px]">(Total Estimasi Anggaran)</span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-neutral-700">100%</td>
                        <td className="py-3 px-2 text-right font-mono text-brand-red text-sm">Rp 1.500.000.000</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : pageItem.taskCode === "06-01" || pageItem.taskCode === "06-01-P" || pageItem.taskCode === "06-01-L" || pageItem.taskCode === "02-05" ? (
              /* 06-01: TABLE SCHEDULE PREVIEW */
              <div className="flex-1 my-auto py-1 space-y-3">
                {/* Timeline Overview Summary */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                      Target Project Duration <span className="font-sans font-normal italic text-neutral-400 normal-case">(Total Durasi Proyek)</span>
                    </span>
                    <span className="text-sm font-black font-mono text-neutral-900">
                      52 Weeks <span className="text-[11px] font-normal text-neutral-500 font-sans">(1 Year Total)</span>
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                      ESTIMATED TIMELINE RANGE
                    </span>
                    <span className="font-bold text-brand-red text-xs">Sep 2026 – Sep 2027</span>
                  </div>
                </div>

                {/* Timeline Table */}
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 text-[9px] font-mono font-bold text-neutral-900 uppercase tracking-wider">
                        <th className="py-1.5 px-1">Major Phase <span className="font-sans font-normal italic text-neutral-400 normal-case">(Fase Utama)</span></th>
                        <th className="py-1.5 px-2">Sub-Stage <span className="font-sans font-normal italic text-neutral-400 normal-case">(Tahapan)</span></th>
                        <th className="py-1.5 px-2 text-right">Duration <span className="font-sans font-normal italic text-neutral-400 normal-case">(Durasi)</span></th>
                        <th className="py-1.5 px-2 text-right">Schedule <span className="font-sans font-normal italic text-neutral-400 normal-case">(Jadwal)</span></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {[
                        {
                          parentPhaseEn: "01. Design Phase",
                          parentPhaseId: "Tahap Desain (12 Wks)",
                          parentSubtotal: "12 Weeks",
                          subStages: [
                            { stageEn: "Kickoff & Briefing", stageId: "Tahap Awal & Pembekalan", duration: "2 Weeks", schedule: "Sep 2026" },
                            { stageEn: "Schematic Design", stageId: "Desain Skematik", duration: "4 Weeks", schedule: "Sep – Oct 2026" },
                            { stageEn: "Design Development", stageId: "Pengembangan Desain", duration: "4 Weeks", schedule: "Oct – Nov 2026" },
                            { stageEn: "Technical Drawings (FOR-CON)", stageId: "Gambar Kerja & Tender", duration: "4 Weeks", schedule: "Nov – Dec 2026" },
                          ]
                        },
                        {
                          parentPhaseEn: "02. Construction Phase",
                          parentPhaseId: "Tahap Pelaksanaan (40 Wks)",
                          parentSubtotal: "40 Weeks",
                          subStages: [
                            { stageEn: "Procurement & Site Prep", stageId: "Tender & Persiapan Lahan", duration: "4 Weeks", schedule: "Dec 2026 – Jan 2027" },
                            { stageEn: "Structure & Core Work", stageId: "Pekerjaan Struktur Utama", duration: "20 Weeks", schedule: "Jan – Jun 2027" },
                            { stageEn: "Architectural & Interior Fit-Out", stageId: "Arsitektur & Fit-Out Interior", duration: "12 Weeks", schedule: "Jun – Aug 2027" },
                            { stageEn: "MEP Testing & Handover", stageId: "Pengujian & Serah Terima", duration: "4 Weeks", schedule: "Aug – Sep 2027" },
                          ]
                        }
                      ].map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          {group.subStages.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-neutral-100">
                              {rIdx === 0 && (
                                <td
                                  rowSpan={group.subStages.length}
                                  className="py-1.5 px-1 font-mono text-[10px] font-bold text-brand-red whitespace-nowrap align-top border-r border-neutral-100 pr-2"
                                >
                                  {group.parentPhaseEn}
                                  <span className="font-sans font-normal italic text-neutral-400 text-[9px] block">{group.parentPhaseId}</span>
                                </td>
                              )}
                              <td className="py-1.5 px-2 align-top">
                                <span className="font-semibold text-neutral-800 block leading-tight text-[11px]">{row.stageEn}</span>
                                <span className="font-normal italic text-neutral-400 text-[9px] block">{row.stageId}</span>
                              </td>
                              <td className="py-1.5 px-2 font-mono text-[11px] font-bold text-neutral-800 text-right whitespace-nowrap align-top">
                                {row.duration}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-[11px] text-neutral-600 text-right whitespace-nowrap align-top">
                                {row.schedule}
                              </td>
                            </tr>
                          ))}
                          {/* Phase Subtotal Row */}
                          <tr className="bg-neutral-50/70 border-b border-neutral-200/80 font-semibold text-[10px]">
                            <td colSpan={2} className="py-1 px-2 text-neutral-500 text-right font-mono italic">
                              Subtotal {group.parentPhaseEn}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-neutral-900">
                              {group.parentSubtotal}
                            </td>
                            <td className="py-1 px-2"></td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-900 font-bold text-xs">
                        <td colSpan={2} className="py-2 px-1 text-neutral-900 text-[11px]">
                          Total Project Timeline <span className="font-sans font-normal italic text-neutral-400 text-[10px]">(Total Target Jadwal Proyek)</span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-brand-red text-xs">52 Weeks</td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-800 text-xs">Sep 2026 – Sep 2027</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : pageItem.taskCode.startsWith("06-02") || pageItem.taskCode.startsWith("KO-06-02") ? (
              /* 06-02: VISUAL TIMELINE GANTT CHART */
              <div className="flex-1 my-auto py-2 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                      Visual Timeline Schedule Chart <span className="font-sans font-normal italic text-neutral-400 normal-case">(Grafik Visual Timeline Proyek)</span>
                    </span>
                    <span className="text-base font-black font-mono text-neutral-900">
                      12 Months Timeline Breakdown
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-brand-red">52 Weeks Total</span>
                </div>

                {/* Visual Gantt Chart Grid */}
                <div className="space-y-4 pt-2">
                  {/* Months Header Bar */}
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-mono font-bold text-neutral-400 uppercase text-center border-b border-neutral-200 pb-2">
                    {["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((m, mIdx) => (
                      <div key={mIdx} className="bg-neutral-100/70 py-1 rounded">
                        {m}
                      </div>
                    ))}
                  </div>

                  {/* Timeline Bars */}
                  <div className="space-y-3 pt-1">
                    {[
                      { name: "01. Design Phase", sub: "Briefing, Schematic, DD, Technical", colSpan: "col-span-4", colStart: "col-start-1", bg: "bg-neutral-900 text-white" },
                      { name: "02. Procurement & Site Prep", sub: "Tender & PBG Permit", colSpan: "col-span-2", colStart: "col-start-4", bg: "bg-brand-red text-white" },
                      { name: "03. Structure & Core Work", sub: "Foundation, Concrete & Framework", colSpan: "col-span-5", colStart: "col-start-5", bg: "bg-neutral-800 text-white" },
                      { name: "04. Architectural & Interior Fit-Out", sub: "Finishes, Joinery & Lighting", colSpan: "col-span-3", colStart: "col-start-9", bg: "bg-neutral-700 text-white" },
                      { name: "05. MEP Testing & Handover", sub: "Commissioning & Key Handover", colSpan: "col-span-2", colStart: "col-start-11", bg: "bg-emerald-600 text-white" },
                    ].map((bar, bIdx) => (
                      <div key={bIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                          <span>{bar.name}</span>
                          <span className="text-[10px] text-neutral-400 font-normal italic">{bar.sub}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1 h-7 bg-neutral-50 rounded-lg p-0.5 border border-neutral-100">
                          <div className={`${bar.colStart} ${bar.colSpan} ${bar.bg} rounded flex items-center justify-center font-mono text-[10px] font-bold shadow-sm px-2 truncate`}>
                            {bar.name.split(" ")[1]} Phase
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart Legend Footer */}
                <div className="flex items-center gap-6 pt-4 border-t border-neutral-200 text-[10px] font-medium text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-neutral-900"></span>
                    <span>Design Stage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-brand-red"></span>
                    <span>Procurement & Permits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-neutral-800"></span>
                    <span>Structure Work</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-neutral-700"></span>
                    <span>Interior Fit-Out</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600"></span>
                    <span>Testing & Handover</span>
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode === "03-01" ? (
              /* REAL DESIGN SCOPE PREVIEW FOR (03-01) - 2 COLUMNS IN LANDSCAPE */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4")}>
                  {[
                    {
                      nameEn: "01. Architecture",
                      nameId: "Arsitektur Utama",
                      items: [
                        { en: "Site Plan & Floor Layout Plan", idText: "Rencana Tapak & Denah Tata Letak", included: true },
                        { en: "Building Elevations & Key Sections", idText: "Tampak Bangunan & Potongan Utama", included: true },
                        { en: "3D Exterior & Interior Render Package", idText: "Paket Visual Render 3D Eksterior & Interior", included: true },
                        { en: "Custom Kinetic Facade Construction Details", idText: "Detail Konstruksi Fasad Kinetik Khusus", included: false }
                      ]
                    },
                    {
                      nameEn: "02. Structure & Civils",
                      nameId: "Struktur & Sipil",
                      items: [
                        { en: "Foundation Plan & Column/Beam Framing", idText: "Rencana Pondasi & Penulangan Kolom/Balok", included: true },
                        { en: "Structural Calculation Report", idText: "Laporan Perhitungan Struktur", included: true },
                        { en: "Geotechnical Deep Soil Boring Sondir Test", idText: "Uji Sondir Geoteknik Tanah Dalam", included: false }
                      ]
                    },
                    {
                      nameEn: "03. MEP Engineering",
                      nameId: "Mekanikal, Elektrikal & Plambing",
                      items: [
                        { en: "Electrical Single Line & Lighting Layout", idText: "Diagram Kelistrikan & Tata Letak Lampu", included: true },
                        { en: "Plumbing Clean/Waste Water System", idText: "Sistem Plambing Air Bersih & Kotor", included: true },
                        { en: "Smart Home Automation System Integration", idText: "Integrasi Sistem Otomasi Smart Home", included: false }
                      ]
                    }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="space-y-2 pb-3 border-b border-neutral-200 break-inside-avoid">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                        <span className="font-mono text-xs font-bold text-brand-red uppercase">{row.nameEn}</span>
                        <span className="text-[10px] font-mono font-normal italic text-neutral-400">({row.nameId})</span>
                      </div>
                      <ul className="space-y-2 pt-1">
                        {row.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start justify-between gap-3 text-[11px] pb-1 border-b border-neutral-100/70 last:border-0">
                            <div className="flex items-start gap-1.5 min-w-0 pr-2">
                              <span className={`font-bold select-none ${item.included ? "text-emerald-600" : "text-neutral-400"}`}>
                                {item.included ? "✓" : "✕"}
                              </span>
                              <div>
                                <span className={`font-medium ${item.included ? "text-neutral-800" : "text-neutral-400 line-through"}`}>{item.en}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{item.idText}</span>
                              </div>
                            </div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                              item.included
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                            }`}>
                              {item.included ? "INCLUDED ✓" : "EXCLUDED ✕"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "03-02" ? (
              /* REAL CONSTRUCTION SCOPE PREVIEW FOR (03-02) - 2 COLUMNS IN LANDSCAPE */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4")}>
                  {[
                    {
                      nameEn: "01. FOR-CON Working Drawings",
                      nameId: "Gambar Kerja Detail Siap Bangun",
                      items: [
                        { en: "Detailed Construction Working Drawings (FOR-CON)", idText: "Gambar Kerja Detail Konstruksi Siap Bangun", included: true },
                        { en: "Architectural & Interior Joinery Details", idText: "Detail Arsitektur & Joinery Fit-Out", included: true },
                        { en: "MEP Connection & Pipe Routing Details", idText: "Detail Sambungan MEP & Jalur Pipa", included: true }
                      ]
                    },
                    {
                      nameEn: "02. BoQ & RAB Budgeting",
                      nameId: "Anggaran Biaya & BoQ",
                      items: [
                        { en: "Bill of Quantities (BoQ) Breakdown", idText: "Rincian Bill of Quantities (BoQ) Volume Pekerjaan", included: true },
                        { en: "RAB Construction Cost Budget Estimation", idText: "Estimasi Rencana Anggaran Biaya (RAB) Konstruksi", included: true }
                      ]
                    },
                    {
                      nameEn: "03. Site Supervision & Control",
                      nameId: "Pengawasan Lapangan",
                      items: [
                        { en: "Weekly Periodic Site Inspection & Supervision", idText: "Inspeksi & Pengawasan Lapangan Periodik Mingguan", included: true },
                        { en: "Full-Time Daily Resident Site Engineer", idText: "Pengawas Harian Penuh Waktu di Lokasi", included: false },
                        { en: "Punch List Fixes & Final Handover Inspection", idText: "Daftar Perbaikan Sisa & Inspeksi Serah Terima", included: true }
                      ]
                    }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="space-y-2 pb-3 border-b border-neutral-200 break-inside-avoid">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                        <span className="font-mono text-xs font-bold text-brand-red uppercase">{row.nameEn}</span>
                        <span className="text-[10px] font-mono font-normal italic text-neutral-400">({row.nameId})</span>
                      </div>
                      <ul className="space-y-2 pt-1">
                        {row.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start justify-between gap-3 text-[11px] pb-1 border-b border-neutral-100/70 last:border-0">
                            <div className="flex items-start gap-1.5 min-w-0 pr-2">
                              <span className={`font-bold select-none ${item.included ? "text-emerald-600" : "text-neutral-400"}`}>
                                {item.included ? "✓" : "✕"}
                              </span>
                              <div>
                                <span className={`font-medium ${item.included ? "text-neutral-800" : "text-neutral-400 line-through"}`}>{item.en}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{item.idText}</span>
                              </div>
                            </div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                              item.included
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                            }`}>
                              {item.included ? "INCLUDED ✓" : "EXCLUDED ✕"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "03-03" ? (
              /* REAL SCOPE EXCLUSIONS PREVIEW FOR (03-03) - 2 COLUMNS IN LANDSCAPE */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4")}>
                  {[
                    {
                      nameEn: "01. Permitting & Legal",
                      nameId: "Perizinan & Retribusi Resmi",
                      items: [
                        { en: "Building Permit (PBG/SLF) Official Government Fees", idText: "Biaya Retribusi Resmi Perizinan Bangunan Gedung (PBG/SLF)", included: false },
                        { en: "Neighborhood & Local Community Discretionary Approvals", idText: "Persetujuan Lingkungan Warga & Komunitas Lokal", included: false }
                      ]
                    },
                    {
                      nameEn: "02. Site & Soil Investigations",
                      nameId: "Pengujian Lahan & Tanah",
                      items: [
                        { en: "Deep Soil Boring Test & Geotechnical Investigation", idText: "Uji Sondir & Penyelidikan Tanah Dalam (Geoteknik)", included: false },
                        { en: "Environmental Impact Assessment (AMDAL/UKL-UPL)", idText: "Dokumen Analisis Mengenai Dampak Lingkungan (AMDAL)", included: false }
                      ]
                    },
                    {
                      nameEn: "03. Specialist Installations",
                      nameId: "Instalasi Spesialis Khusus",
                      items: [
                        { en: "PLN Transformer Substation Upgrade Connection", idText: "Penyambungan & Penambahan Daya PLN Trafo Khusus", included: false },
                        { en: "Specialist Audio-Visual & Custom Smart Home Automation", idText: "Sistem Audio Visual Khusus & Otomasi Smart Home", included: false }
                      ]
                    }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="space-y-2 pb-3 border-b border-neutral-200 break-inside-avoid">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                        <span className="font-mono text-xs font-bold text-brand-red uppercase">{row.nameEn}</span>
                        <span className="text-[10px] font-mono font-normal italic text-neutral-400">({row.nameId})</span>
                      </div>
                      <ul className="space-y-2 pt-1">
                        {row.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start justify-between gap-3 text-[11px] pb-1 border-b border-neutral-100/70 last:border-0">
                            <div className="flex items-start gap-1.5 min-w-0 pr-2">
                              <span className="font-bold select-none text-neutral-400">✕</span>
                              <div>
                                <span className="font-medium text-neutral-400 line-through">{item.en}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{item.idText}</span>
                              </div>
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 bg-neutral-100 text-neutral-400 border border-neutral-200">
                              EXCLUDED ✕
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "03-04" ? (
              /* REAL PROJECT ASSUMPTIONS PREVIEW FOR (03-04) - 2 COLUMNS IN LANDSCAPE */
              <div className="flex-1 my-auto py-2">
                <div className={clsx(isLandscape ? "columns-2 gap-8 space-y-4" : "space-y-4")}>
                  {[
                    {
                      nameEn: "01. Site & Ground Access",
                      nameId: "Akses & Kondisi Tapak",
                      items: [
                        { en: "Site soil has standard minimum bearing capacity of 1.5 kg/cm²", idText: "Tanah tapak memiliki daya dukung standar min 1.5 kg/cm²", assumed: true },
                        { en: "Unobstructed truck access roads available to the building perimeter", idText: "Akses jalan truk ke keliling tapak tersedia tanpa hambatan", assumed: true }
                      ]
                    },
                    {
                      nameEn: "02. Utilities & Infrastructure",
                      nameId: "Utilitas & Infrastruktur",
                      items: [
                        { en: "Municipal clean water line & main drainage available at site boundary", idText: "Jaringan air bersih & drainase induk kota tersedia di batas tapak", assumed: true },
                        { en: "Existing 3-phase temporary electricity power supply active during site work", idText: "Pasokan listrik sementara 3-fase aktif selama kerja tapak", assumed: true }
                      ]
                    },
                    {
                      nameEn: "03. Client Decision Milestones",
                      nameId: "Keputusan & Milestone Klien",
                      items: [
                        { en: "Client sign-off feedback delivered within 5 business days per stage", idText: "Umpan balik persetujuan klien diberikan maks 5 hari kerja per tahap", assumed: true }
                      ]
                    }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="space-y-2 pb-3 border-b border-neutral-200 break-inside-avoid">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                        <span className="font-mono text-xs font-bold text-brand-red uppercase">{row.nameEn}</span>
                        <span className="text-[10px] font-mono font-normal italic text-neutral-400">({row.nameId})</span>
                      </div>
                      <ul className="space-y-2 pt-1">
                        {row.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start justify-between gap-3 text-[11px] pb-1 border-b border-neutral-100/70 last:border-0">
                            <div className="flex items-start gap-1.5 min-w-0 pr-2">
                              <span className="font-bold select-none text-emerald-600">✓</span>
                              <div>
                                <span className="font-medium text-neutral-800">{item.en}</span>
                                <span className="font-normal italic text-neutral-400 text-[10px] block">{item.idText}</span>
                              </div>
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ASSUMED ✓
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "04-13" ? (
              /* 04-13: NEW DEDICATED TEMPLATE - SINGLE IMAGE LANDSCAPE WITH RIGHT SIDEBAR LAYOUT */
              <div className="absolute inset-0 w-full h-full bg-white p-8 flex gap-6 overflow-hidden select-none">
                {/* LEFT AREA: Maximize Image Viewport */}
                <div className="flex-1 h-full relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-sm flex flex-col">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
                    alt="Architectural Ground Floor Plan"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                    SCALE 1 : 100 @ A3
                  </div>
                </div>

                {/* RIGHT SIDEBAR: Header, Document Info, Task Titles & Footer */}
                <div className="w-72 h-full flex flex-col justify-between border-l border-neutral-200/80 pl-6 shrink-0 py-1">
                  {/* Top: Document Header Info */}
                  <div className="space-y-3">
                    <div className="pb-3 border-b border-neutral-200">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        PROJECT & STAGE
                      </div>
                      <div className="font-semibold text-xs text-neutral-900 truncate">
                        #{data.projectCode}-{data.projectName}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 rounded bg-brand-red/10 text-brand-red text-[10px] font-bold">
                          {data.stageName}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 text-[10px] font-mono font-bold">
                          {data.version}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Task Title Block */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-brand-red uppercase">
                          DRAWING TITLE
                        </span>
                        <span className="font-mono text-sm font-black text-brand-red">
                          04-13
                        </span>
                      </div>
                      <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight leading-tight">
                        Architectural Ground Floor Plan
                      </h2>
                      <p className="text-xs font-semibold text-neutral-500 italic leading-snug">
                        Denah Arsitektur Lantai 1
                      </p>
                      <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
                    </div>

                    {/* Technical Notes / Context */}
                    <div className="pt-3 space-y-1 text-xs">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                        DRAWING NO.
                      </span>
                      <span className="font-mono font-bold text-neutral-800 text-xs block">
                        A-01-00
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Studio Footer Column */}
                  <div className="pt-4 border-t border-neutral-200 space-y-2">
                    <div className="font-black text-brand-red tracking-tight flex items-center gap-1 text-xs">
                      <span>adidaya</span>
                      <span className="text-brand-red font-bold">*</span>
                      <span className="font-normal text-neutral-800">studio</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                      <span>Client / <span className="italic">Klien</span></span>
                      <span className="font-mono font-bold text-neutral-900 text-sm">{pageNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode === "04-01" || pageItem.taskCode === "04-01-P" || pageItem.taskCode === "04-07" || pageItem.taskCode === "04-01-L" || (pageItem.taskCode.startsWith("04-01")) ? (
              /* 04-01 / 04-07 / 04-01-L: SINGLE IMAGE STANDARD (PORTRAIT & LANDSCAPE TOP-DOWN) */
              <div className="flex-1 py-1 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Architectural Ground Floor Plan
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Denah Arsitektur Lantai 1
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    A-01-00
                  </span>
                </div>

                <div className="relative w-full flex-1 rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-md min-h-[360px]">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                    alt="Architectural Ground Floor Plan"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                    SCALE 1 : 100 @ A3
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-02-L") || (isLandscape && (pageItem.taskCode.includes("04-02") || pageItem.taskCode.includes("04-08"))) ? (
              /* 04-02-L: MULTIPLE IMAGE LANDSCAPE (SELECTOR 1-3 PHOTOS WITH CAPTION & DESC BELOW) */
              <div className="flex-1 py-1 flex flex-col justify-between space-y-3 h-full overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Multi-Angle Portfolio Study
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Studi Visual Multi-Sudut & Ringkasan Narasi
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    FACADE-01
                  </span>
                </div>

                <div
                  className={clsx(
                    "grid gap-4 flex-1 items-start my-auto py-1",
                    customPhotoCount === 1
                      ? "grid-cols-1 max-w-xl mx-auto w-full"
                      : customPhotoCount === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                  )}
                >
                  {[
                    {
                      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
                      titleEn: "01. Main Facade Entrance",
                      titleId: "Akses Fasad Utama & Panel Kayu",
                      descEn: "High-impact entrance featuring vertical timber louvers & cove lighting.",
                      descId: "Tampilan pintu masuk utama dengan kisi kayu vertikal & pencahayaan tersembunyi."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
                      titleEn: "02. Outdoor Pool Terrace",
                      titleId: "Teras Luar & Dek Kolam Renang",
                      descEn: "Expansive outdoor deck integrated with natural stone pavers.",
                      descId: "Area teras luar luas terintegrasi penataan batu alam."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
                      titleEn: "03. Living Lounge Flow",
                      titleId: "Interior Ruang Keluarga Plafon Tinggi",
                      descEn: "Double-height living pavilion maximizing natural daylight.",
                      descId: "Pavilion ruang keluarga dengan pencahayaan alami maksimal."
                    }
                  ].slice(0, Math.min(3, Math.max(1, customPhotoCount))).map((row, rIdx) => (
                    <div key={rIdx} className="flex flex-col space-y-1.5 min-w-0">
                      <div
                        className={clsx(
                          "relative w-full rounded-xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-2xs",
                          customPhotoCount === 1 ? "aspect-[16/9]" : "aspect-[16/10]"
                        )}
                      >
                        <img src={row.img} alt={row.titleEn} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-neutral-900/85 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-white shadow-2xs border border-white/20">
                          0{rIdx + 1}
                        </div>
                      </div>
                      <div className="px-0.5 pt-0.5 space-y-1">
                        <div>
                          <h4 className="text-[11px] font-black text-neutral-900 leading-tight block truncate">{row.titleEn}</h4>
                          <p className="text-[10px] font-semibold italic text-neutral-400 leading-tight block truncate">{row.titleId}</p>
                        </div>
                        <div className="space-y-0.5 pt-0.5 border-t border-neutral-100">
                          <p className="text-[10px] font-normal text-neutral-700 leading-snug line-clamp-2">{row.descEn}</p>
                          <p className="text-[9px] text-neutral-400 italic leading-snug line-clamp-2">{row.descId}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-02-P") || (!isLandscape && pageItem.taskCode.includes("04-02")) ? (
              /* 04-02-P: MULTIPLE IMAGE PORTRAIT (2x2 GRID AS ORIGINAL) */
              <div className="flex-1 my-auto py-2 flex flex-col justify-between space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Architectural Ground Floor Plan
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Denah Arsitektur Lantai 1
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    A-01-00
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1 min-h-[460px]">
                  {[
                    { img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", title: "Main Facade Entry View", sub: "Tampak Depan Utama" },
                    { img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80", title: "Outdoor Pool Deck Zone", sub: "Area Dek Kolam Renang" },
                    { img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80", title: "Living Lounge Interior", sub: "Interior Ruang Keluarga" },
                    { img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80", title: "Side Setback & Landscape", sub: "Sempadan Samping Tapak" }
                  ].map((item, iIdx) => (
                    <div key={iIdx} className="flex flex-col justify-between space-y-1.5 h-full">
                      <div className="relative w-full flex-1 rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-sm min-h-[190px]">
                        <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2.5 left-2.5 bg-neutral-900/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-sm border border-white/20">
                          0{iIdx + 1}
                        </div>
                      </div>
                      <div className="px-1 pt-0.5">
                        <span className="text-xs font-bold text-neutral-800 block truncate">{item.title}</span>
                        <span className="text-[10px] font-medium italic text-neutral-400 block truncate">{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-03-L") || (isLandscape && (pageItem.taskCode.includes("04-03") || pageItem.taskCode.includes("04-09"))) ? (
              /* 04-03-L: IMAGE AND DESC LANDSCAPE (LEFT IMAGE + RIGHT DESC) */
              <div className="flex-1 py-1 flex flex-col space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Schematic Design Concept Overview
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Gambaran Konsep Desain Skematik
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    CONCEPT-A
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-6 flex-1 items-stretch py-1">
                  <div className="col-span-7 relative rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-sm min-h-[300px]">
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                      alt="Drawing Concept"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                      SCALE 1 : 100 @ A3
                    </div>
                  </div>

                  <div className="col-span-5 flex flex-col justify-start space-y-3 py-1">
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold text-brand-red uppercase block">
                        Main Design Issues & Concept Notes
                      </span>
                      <p className="text-neutral-800 text-xs leading-relaxed font-medium">
                        This schematic layout emphasizes optimal spatial orientation, seamless indoor-outdoor transitions, and efficient structural grid alignment for maximum natural light.
                      </p>
                      <p className="text-neutral-500 text-xs italic leading-relaxed pt-1">
                        Tata letak skematik ini menekankan orientasi ruang optimal, transisi ruang dalam-luar yang menyatu, dan efisiensi penataan grid struktur untuk pencahayaan alami maksimal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-03-P") || (!isLandscape && pageItem.taskCode.includes("04-03")) ? (
              /* 04-03-P: IMAGE AND DESC PORTRAIT (ORIGINAL TOP IMAGE + BOTTOM DESC) */
              <div className="flex-1 py-2 flex flex-col space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Schematic Design Concept Overview
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Gambaran Konsep Desain Skematik
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    CONCEPT-A
                  </span>
                </div>

                <div className="relative w-full aspect-[5/4] rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                    alt="Drawing Concept"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                    SCALE 1 : 100 @ A3
                  </div>
                </div>

                <div className="pt-3 space-y-1.5 text-xs border-t border-neutral-200/60 flex-1">
                  <span className="text-xs font-mono font-bold text-brand-red uppercase block">Main Design Issues & Concept Notes</span>
                  <p className="text-neutral-800 text-xs leading-relaxed font-medium">
                    This schematic layout emphasizes optimal spatial orientation, seamless indoor-outdoor transitions, and efficient structural grid alignment.
                  </p>
                  <p className="text-neutral-400 text-xs italic leading-snug">
                    Tata letak skematik ini menekankan orientasi ruang optimal, transisi ruang dalam-luar yang menyatu, dan efisiensi penataan grid struktur.
                  </p>
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-04-L") || (isLandscape && (pageItem.taskCode.includes("04-04") || pageItem.taskCode.includes("04-10"))) ? (
              /* 04-04-L: IMAGE AND POINT LANDSCAPE (LEFT IMAGE + RIGHT POINTS) */
              <div className="flex-1 py-1 flex flex-col space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Technical Layout & Key Highlights
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Tata Letak Teknis & Poin-Poin Utama
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    A-02-01
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-6 flex-1 items-stretch py-1">
                  <div className="col-span-7 relative rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-sm min-h-[280px]">
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                      alt="Drawing Layout"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                      SCALE 1 : 100 @ A3
                    </div>
                  </div>

                  <div className="col-span-5 flex flex-col justify-start space-y-3 py-1">
                    <div className="space-y-3">
                      <span className="text-xs font-mono font-bold text-brand-red uppercase block">
                        Key Technical Highlights
                      </span>

                      <ul className="space-y-2.5">
                        {[
                          { num: "01", en: "Cantilevered Living Pavilion (4.5m Projection)", id: "Pavilion Utama Cantilever 4.5 Meter" },
                          { num: "02", en: "North-South Passive Solar Orientation", id: "Orientasi Pasif Utara-Selatan" },
                          { num: "03", en: "Integrated Cross-Ventilation Sky Louvers", id: "Ventilasi Silang Terintegrasi Atap" },
                          { num: "04", en: "High-Performance Double Glazed Facade", id: "Fasad Kaca Ganda Efisiensi Tinggi" }
                        ].map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5 text-xs pb-1.5 border-b border-neutral-200/50 last:border-0 last:pb-0">
                            <span className="font-mono text-xs font-bold text-brand-red shrink-0">{pt.num}</span>
                            <div>
                              <span className="font-semibold text-neutral-800 leading-tight block">{pt.en}</span>
                              <span className="text-neutral-500 italic text-[10px] block leading-tight">{pt.id}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-04-P") || (!isLandscape && pageItem.taskCode.includes("04-04")) ? (
              /* 04-04-P: IMAGE AND POINT PORTRAIT (ORIGINAL TOP IMAGE + BOTTOM 2-COLUMN BULLETS) */
              <div className="flex-1 py-2 flex flex-col space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Technical Layout & Key Highlights
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Tata Letak Teknis & Poin-Poin Utama
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    A-02-01
                  </span>
                </div>

                <div className="relative w-full aspect-[5/4] rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                    alt="Drawing Layout"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white tracking-wider">
                    SCALE 1 : 100 @ A3
                  </div>
                </div>

                <div className="pt-3 space-y-2 text-xs border-t border-neutral-200/60 flex-1">
                  <span className="text-xs font-mono font-bold text-brand-red uppercase block">Key Technical Highlights</span>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 pl-1">
                    <ul className="space-y-2">
                      {[
                        { num: "01", en: "Cantilevered Living Pavilion (4.5m Projection)", id: "Pavilion Utama Cantilever 4.5 Meter" },
                        { num: "02", en: "North-South Passive Solar Orientation", id: "Orientasi Pasif Utara-Selatan" },
                        { num: "03", en: "Integrated Cross-Ventilation Sky Louvers", id: "Ventilasi Silang Terintegrasi Atap" }
                      ].map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-xs font-bold text-brand-red shrink-0">{pt.num}</span>
                          <div>
                            <span className="font-semibold text-neutral-800 leading-tight block">{pt.en}</span>
                            <span className="text-neutral-400 italic text-[10px] block leading-tight">{pt.id}</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <ul className="space-y-2">
                      {[
                        { num: "04", en: "Rainwater Harvesting & Filtration System", id: "Sistem Pemanenan Air Hujan" },
                        { num: "05", en: "High-Performance Double Glazed Facade", id: "Fasad Kaca Ganda Efisiensi Tinggi" },
                        { num: "06", en: "Recessed Ambient LED Cove Lighting", id: "Pencahayaan LED Cove Tersembunyi" }
                      ].map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-xs font-bold text-brand-red shrink-0">{pt.num}</span>
                          <div>
                            <span className="font-semibold text-neutral-800 leading-tight block">{pt.en}</span>
                            <span className="text-neutral-400 italic text-[10px] block leading-tight">{pt.id}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : pageItem.taskCode.includes("04-05-P") || (!isLandscape && pageItem.taskCode.includes("04-05")) ? (
              /* 04-05-P: MULTIPLE IMAGE AND DESC PORTRAIT (ORIGINAL PORTRAIT 04-05 WITH DYNAMIC 1-5 PHOTOS) */
              <div className="flex-1 py-2 flex flex-col justify-start space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Multi-Angle Portfolio Study
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 italic">
                      Studi Visual Multi-Sudut & Ringkasan Narasi
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-neutral-900 text-white">
                    FACADE-01
                  </span>
                </div>

                <div className="py-0.5 overflow-hidden flex-1 flex flex-col justify-evenly">
                  {[
                    {
                      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=80",
                      titleEn: "01. Main Facade Entrance & Wood Cladding",
                      titleId: "Akses Fasad Utama & Panel Kayu",
                      descId: "Tampilan pintu masuk utama dengan kisi kayu vertikal."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=500&q=80",
                      titleEn: "02. Outdoor Terrace & Infinity Pool Deck",
                      titleId: "Teras Luar & Dek Kolam Renang",
                      descId: "Area teras luar luas terintegrasi batu alam."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=500&q=80",
                      titleEn: "03. Living Lounge Spatial Flow & High Ceiling",
                      titleId: "Ruang Keluarga Plafon Tinggi",
                      descId: "Pavilion ruang keluarga memaksimalkan pencahayaan alami."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=500&q=80",
                      titleEn: "04. Side Garden & Boundary Wall Detail",
                      titleId: "Taman Samping & Detail Dinding Pembatas",
                      descId: "Penataan taman samping dengan lampu dinding & vegetasi tropis."
                    },
                    {
                      img: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=500&q=80",
                      titleEn: "05. Master Suite Private Balcony View",
                      titleId: "Balkon Privat Kamar Utama",
                      descId: "Balkon privat lantai atas menghadap ke taman belakang."
                    }
                  ].slice(0, Math.min(5, Math.max(1, customPhotoCount))).map((row, rIdx) => (
                    <div key={rIdx} className={clsx(
                      "grid grid-cols-12 items-start border-b border-neutral-200/60 last:border-0 min-w-0",
                      customPhotoCount <= 2 ? "gap-4 py-2" : customPhotoCount === 3 ? "gap-3 py-1.5" : "gap-3 py-1"
                    )}>
                      <div
                        className={clsx(
                          "col-span-5 relative w-full rounded-xl overflow-hidden border border-neutral-200/80 bg-neutral-100 shadow-2xs shrink-0",
                          customPhotoCount <= 2 ? "aspect-[16/10]" : customPhotoCount === 3 ? "aspect-[16/9]" : "aspect-[16/7]"
                        )}
                      >
                        <img src={row.img} alt={row.titleEn} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 left-1.5 bg-neutral-900/85 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold text-white shadow-xs border border-white/20">
                          0{rIdx + 1}
                        </div>
                      </div>

                      <div className="col-span-7 space-y-0.5 min-w-0">
                        <h4 className={clsx("font-black text-neutral-900 leading-tight truncate", customPhotoCount >= 4 ? "text-[10px]" : "text-[11px]")}>{row.titleEn}</h4>
                        <p className={clsx("font-semibold italic text-neutral-400 leading-tight truncate", customPhotoCount >= 4 ? "text-[9px]" : "text-[10px]")}>{row.titleId}</p>
                        {customPhotoCount <= 3 && (
                          <p className="text-[9px] font-normal italic text-neutral-500 leading-tight line-clamp-2">{row.descId}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : pageItem.taskCode === "04-05" || pageItem.taskCode === "04-05-L" || pageItem.taskCode === "04-06" || pageItem.taskCode === "04-06-P" ? (
              /* FULL BLEED OVERLAY (04-05-L ON LANDSCAPE / 04-06-P ON PORTRAIT) */
              <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-900 flex flex-col justify-between p-12 select-none">
                {/* 100% Full Bleed Background Photo */}
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
                  alt="Full Bleed Architectural Visualization"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark Gradient Overlay for High Contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/40 to-neutral-950/90 pointer-events-none" />

                {/* 1. Standard Header Overlay */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-2 text-[10px] text-neutral-300 border-b border-white/20 select-none">
                    <div className="font-medium tracking-tight truncate">
                      #{data.projectCode}-{data.projectName}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-white">{data.stageName}</span>
                      <span className="px-2 py-0.5 border border-white/30 rounded-full text-[9px] font-bold text-white bg-white/10">
                        {data.version}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Standard Title Block Overlay (Exact mb-6 space-y-1 structure as standard pages) */}
                <div className="relative z-10 space-y-1 mb-6 pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">
                        {displayTaskName}
                      </h2>
                      <p className="text-sm font-semibold text-neutral-300 italic">
                        {displayTaskNameId}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-black text-brand-red shrink-0">
                      {pageItem.taskCode.replace(/^[A-Z]{2}-/, "")}
                    </span>
                  </div>
                  <div className="h-0.5 bg-brand-red w-full mt-3 opacity-90" />
                </div>

                {/* 3. Overlay Bottom EN & ID Caption Box */}
                <div className="relative z-10 mt-auto pb-4">
                  <div className="bg-neutral-950/80 backdrop-blur-md p-4 rounded-xl border border-white/15 shadow-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-brand-red uppercase block">VISUAL CONTEXT & DESCRIPTION</span>
                    <p className="text-white text-xs font-semibold leading-relaxed">
                      High-impact full bleed rendering illustrating kinetic facade materiality and ambient night illumination.
                    </p>
                    <p className="text-neutral-300 text-[11px] italic leading-tight">
                      Visualisasi penuh halaman yang memperlihatkan tekstur fasad kinetik dan efek pencahayaan malam hari.
                    </p>
                  </div>
                </div>

                {/* 4. Standard Footer Overlay */}
                <div className="relative z-10 pt-4 select-none w-full border-t border-white/20">
                  <div className="flex items-end justify-between gap-10">
                    <div className="w-48">
                      <div className="font-black text-brand-red tracking-tight flex items-center gap-1 text-xs">
                        <span className="text-white">adidaya</span>
                        <span className="text-brand-red font-bold">*</span>
                        <span className="font-normal text-white/70">studio</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-6 ml-auto">
                      <div className="text-right text-xs font-semibold text-white/70">
                        Client / <span className="italic">Klien</span>
                      </div>
                      <div className="font-mono font-bold text-sm text-white min-w-[20px] text-right">
                        {pageNumber}
                      </div>
                    </div>
                  </div>
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

  // Dynamic scale wrapper for fixed A4 sheets (Portrait: 794x1123, Landscape: 1123x794)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [drawingOrientation, setDrawingOrientation] = useState<"portrait" | "landscape">("landscape");

  const currentTaskCode = pagesList[activePage - 1]?.type === "TASK_PAGE" ? (pagesList[activePage - 1] as any)?.taskCode : "";
  const isLandscape = customOrientation === "landscape" || (typeof currentTaskCode === "string" && (currentTaskCode.endsWith("-L") || ["04-07", "04-08", "04-09", "04-10", "04-11", "04-12", "04-13"].includes(currentTaskCode)));
  const sheetWidth = isLandscape ? 1123 : 794;
  const sheetHeight = isLandscape ? 794 : 1123;

  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newScale = containerWidth / sheetWidth;
        setScale(Math.min(1, newScale));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [sheetWidth]);

  const renderA4Sheet = (content: React.ReactNode, pageNum: number) => (
    <div
      key={pageNum}
      className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-none origin-top transition-all duration-300 flex flex-col shrink-0"
      style={{
        width: `${sheetWidth}px`,
        height: `${sheetHeight}px`,
        transform: `scale(${scale})`,
        marginBottom: `${(scale - 1) * sheetHeight}px`,
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
