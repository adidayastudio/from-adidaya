"use client";

import React, { useState } from "react";
import { KickoffDocumentData } from "./types";
import { ChevronLeft, ChevronRight, Download, Printer, Eye } from "lucide-react";
import clsx from "clsx";

type Props = {
  data: KickoffDocumentData;
};

export default function KickoffDocumentPreview({ data }: Props) {
  const [activePage, setActivePage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");

  const totalPages = 12;

  const handlePrint = () => {
    window.print();
  };

  const renderHeader = (pageNumber: number) => (
    <div className="flex items-center justify-between pb-3 text-xs text-neutral-400 border-b border-black/[0.06] mb-6">
      <div className="font-medium tracking-tight">
        {data.projectCode}-{data.projectName}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-neutral-700 dark:text-neutral-300">{data.stageName}</span>
        <span className="px-2.5 py-0.5 border border-neutral-300 rounded-full text-[10px] font-bold text-neutral-600">
          {data.version}
        </span>
      </div>
    </div>
  );

  const renderFooter = (pageNumber: number) => (
    <div className="mt-auto pt-6 border-t border-black/[0.06] flex items-center justify-between text-xs text-neutral-400">
      <div className="flex items-center gap-6">
        <div className="font-black text-brand-red tracking-tight flex items-center gap-1">
          <span className="text-sm">adidaya</span>
          <span className="text-brand-red font-bold">*</span>
          <span className="text-sm font-normal text-neutral-800">studio</span>
        </div>
        <div className="h-3 w-px bg-neutral-200" />
        <div className="flex items-center gap-4 text-[11px]">
          <span>Adidaya Studio</span>
          <span className="text-neutral-300">|</span>
          <span className="italic text-neutral-400">Client Klien</span>
        </div>
      </div>
      <div className="font-bold text-neutral-400 text-[11px]">{pageNumber}</div>
    </div>
  );

  const renderPageContent = (page: number) => {
    switch (page) {
      // PAGE 1: COVER
      case 1:
        return (
          <div className="relative w-full h-full min-h-[750px] bg-brand-red text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden rounded-xl shadow-xl">
            {/* Background Wavy Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-brand-red to-red-800 opacity-90" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header Logo */}
            <div className="relative z-10 flex justify-end">
              <div className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
                <span>adidaya</span>
                <span className="text-white font-extrabold">*</span>
                <span className="font-light">studio</span>
              </div>
            </div>

            {/* Main Title Center Right */}
            <div className="relative z-10 my-auto text-right space-y-2 max-w-md ml-auto">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {data.projectName}
              </h1>
              <p className="text-lg text-white/90 font-medium">{data.projectLocation}</p>
            </div>

            {/* Bottom Right Info */}
            <div className="relative z-10 flex flex-col items-end gap-2 text-right">
              <span className="text-2xl font-black tracking-wider font-mono">{data.projectCode}</span>
              <span className="text-xl font-bold tracking-wide">{data.stageName}</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider border border-white/30">
                {data.version}
              </span>
            </div>
          </div>
        );

      // PAGE 2: PURPOSE OF KICKOFF
      case 2:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(2)}

            <div className="space-y-1 mb-8">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Purpose of Kickoff</h2>
              <p className="text-base font-semibold text-brand-red italic">Tujuan Persiapan Proyek</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto text-neutral-900">
              {data.purposeList.map((item, idx) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-neutral-800 text-base">{idx + 1}.</span>
                    <span className="font-bold text-neutral-900 text-base leading-relaxed">{item.en}</span>
                  </div>
                  <p className="italic text-neutral-500 text-sm pl-7 leading-relaxed">{item.idText}</p>
                </div>
              ))}
            </div>

            {renderFooter(2)}
          </div>
        );

      // PAGE 3: PROJECT UNDERSTANDING
      case 3:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(3)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Project Understanding</h2>
              <p className="text-base font-semibold text-brand-red italic">Pemahaman Proyek</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto">
              <div className="space-y-2 pb-4">
                <p className="text-base font-bold text-neutral-900 leading-relaxed">{data.understandingIntroEn}</p>
                <p className="text-sm italic text-neutral-500 leading-relaxed">{data.understandingIntroId}</p>
              </div>

              <div className="space-y-4">
                {data.understandingCards.map((card) => (
                  <div key={card.id} className="pl-4 border-l-4 border-brand-red space-y-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 text-base">{card.titleEn}</span>
                      <span className="italic text-neutral-500 text-sm font-medium">{card.titleId}</span>
                    </div>
                    <p className="font-bold text-neutral-800 text-sm">{card.descEn}</p>
                    <p className="italic text-neutral-500 text-xs">{card.descId}</p>
                  </div>
                ))}
              </div>
            </div>

            {renderFooter(3)}
          </div>
        );

      // PAGE 4: PROJECT GOALS
      case 4:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(4)}

            <div className="space-y-1 mb-8">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Project Goals</h2>
              <p className="text-base font-semibold text-brand-red italic">Tujuan Proyek</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto">
              {data.goalsList.map((item, idx) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-neutral-800 text-base">{idx + 1}.</span>
                    <span className="font-bold text-neutral-900 text-base leading-relaxed">{item.en}</span>
                  </div>
                  <p className="italic text-neutral-500 text-sm pl-7 leading-relaxed">{item.idText}</p>
                </div>
              ))}
            </div>

            {renderFooter(4)}
          </div>
        );

      // PAGE 5: SCOPE OF WORK
      case 5:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(5)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Scope of Work</h2>
              <p className="text-base font-semibold text-brand-red italic">Ruang Lingkup Kerja</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto">
              {data.scopeCategories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
                    {cat.name}
                  </span>
                  <ul className="space-y-1.5 pl-2">
                    {cat.items.map((item) => (
                      <li key={item.id} className="flex items-baseline gap-2 text-sm">
                        <span className="text-neutral-400 font-bold">o</span>
                        <span className="font-bold text-neutral-900">{item.titleEn}</span>
                        <span className="italic text-neutral-500 text-xs">{item.titleId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {renderFooter(5)}
          </div>
        );

      // PAGE 6: WORKFLOW OVERVIEW
      case 6:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(6)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Workflow Overview</h2>
              <p className="text-base font-semibold text-brand-red italic">Tinjauan Umum Alur Kerja</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-4 my-auto">
              {data.workflowSteps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        "px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm shrink-0",
                        idx === 0 ? "bg-brand-red" : "bg-neutral-500"
                      )}
                    >
                      {step.stageName} <span className="font-normal text-[11px] opacity-80">| {step.duration}</span>
                    </div>
                    {idx < data.workflowSteps.length - 1 && <div className="w-0.5 h-6 bg-neutral-200 my-1" />}
                  </div>

                  <div className="pt-1 space-y-1">
                    {step.items.map((item) => (
                      <div key={item.id} className="text-xs">
                        <span className="font-bold text-neutral-900">{item.titleEn}</span>{" "}
                        <span className="italic text-neutral-500">{item.titleId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {renderFooter(6)}
          </div>
        );

      // PAGE 7: REQUIRED DATA & INPUTS
      case 7:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(7)}

            <div className="space-y-1 mb-8">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Required Data & Inputs</h2>
              <p className="text-base font-semibold text-brand-red italic">Data yang Dibutuhkan</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-4 my-auto">
              {data.requiredInputs.map((item) => (
                <div key={item.id} className="flex items-baseline gap-3 text-base">
                  <span className="text-neutral-400 font-bold">o</span>
                  <span className="font-bold text-neutral-900">{item.titleEn}</span>
                  <span className="italic text-neutral-500 text-sm">{item.titleId}</span>
                </div>
              ))}
            </div>

            {renderFooter(7)}
          </div>
        );

      // PAGE 8: ROLES & COMMUNICATION
      case 8:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(8)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Roles & Communication</h2>
              <p className="text-base font-semibold text-brand-red italic">Struktur Komunikasi</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto">
              <div className="space-y-3">
                <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
                  ADIDAYA STUDIO
                </span>
                <div className="space-y-2 pl-2">
                  {data.studioRoles.map((role) => (
                    <div key={role.id} className="flex items-baseline gap-2 text-sm">
                      <span className="text-neutral-400 font-bold">o</span>
                      <span className="font-bold text-neutral-900">{role.titleEn}</span>
                      <span className="italic text-neutral-500 text-xs">{role.titleId}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
                  CLIENT
                </span>
                <div className="space-y-2 pl-2">
                  {data.clientRoles.map((role) => (
                    <div key={role.id} className="flex items-baseline gap-2 text-sm">
                      <span className="text-neutral-400 font-bold">o</span>
                      <span className="font-bold text-neutral-900">{role.titleEn}</span>
                      <span className="italic text-neutral-500 text-xs">{role.titleId}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-neutral-600 text-white font-bold text-xs rounded-full">TOOLS</span>
                  <span className="font-bold text-neutral-900 text-sm">{data.communicationTools}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-neutral-600 text-white font-bold text-xs rounded-full">MEETING</span>
                  <span className="font-bold text-neutral-900 text-sm">{data.meetingFrequency}</span>
                </div>
              </div>
            </div>

            {renderFooter(8)}
          </div>
        );

      // PAGE 9: NEXT STEPS
      case 9:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(9)}

            <div className="space-y-1 mb-8">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Next Steps</h2>
              <p className="text-base font-semibold text-brand-red italic">Langkah Berikutnya</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-4 my-auto">
              {data.nextSteps.map((step) => (
                <div key={step.id} className="flex items-center justify-between p-3.5 border border-neutral-300 rounded-full">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900 text-sm">{step.titleEn}</span>
                    <span className="italic text-neutral-500 text-xs">{step.titleId}</span>
                  </div>
                  <div className={clsx("w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center", step.checked && "bg-emerald-500 text-white border-emerald-500")}>
                    {step.checked && <span className="text-xs font-bold">✓</span>}
                  </div>
                </div>
              ))}
            </div>

            {renderFooter(9)}
          </div>
        );

      // PAGE 10: KO DOCUMENT APPROVAL (LEGAL TEXT)
      case 10:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(10)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">KO Document Approval</h2>
              <p className="text-base font-semibold text-brand-red italic">Persetujuan Dokumen KO</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-6 my-auto text-sm leading-relaxed">
              <div className="space-y-3">
                <p className="font-semibold text-neutral-900 whitespace-pre-line">{data.approvalTextEn}</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <p className="italic text-neutral-500 whitespace-pre-line">{data.approvalTextId}</p>
              </div>
            </div>

            {renderFooter(10)}
          </div>
        );

      // PAGE 11: KO DOCUMENT APPROVAL (SIGNATURES)
      case 11:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(11)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">KO Document Approval</h2>
              <p className="text-base font-semibold text-brand-red italic">Persetujuan Dokumen KO</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="space-y-10 my-auto">
              <div className="space-y-4">
                <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
                  ADIDAYA STUDIO
                </span>
                <div className="grid grid-cols-3 gap-6 pt-12">
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">{data.studioSigneeName}</p>
                    <p className="italic text-neutral-400 text-xs">Nama terang</p>
                  </div>
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">Signed</p>
                    <p className="italic text-neutral-400 text-xs">Tanda tangan</p>
                  </div>
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">{data.signDate}</p>
                    <p className="italic text-neutral-400 text-xs">Tanggal</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
                  CLIENT
                </span>
                <div className="grid grid-cols-3 gap-6 pt-12">
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">{data.clientSigneeName}</p>
                    <p className="italic text-neutral-400 text-xs">Nama terang</p>
                  </div>
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">Signed</p>
                    <p className="italic text-neutral-400 text-xs">Tanda tangan</p>
                  </div>
                  <div className="border-t border-brand-red pt-2 space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm">{data.signDate}</p>
                    <p className="italic text-neutral-400 text-xs">Tanggal</p>
                  </div>
                </div>
              </div>
            </div>

            {renderFooter(11)}
          </div>
        );

      // PAGE 12: NOTES
      case 12:
        return (
          <div className="w-full h-full min-h-[750px] bg-white p-8 sm:p-12 flex flex-col rounded-xl shadow-lg border border-black/[0.04]">
            {renderHeader(12)}

            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-extrabold text-brand-red tracking-tight">Notes</h2>
              <p className="text-base font-semibold text-brand-red italic">Catatan</p>
              <div className="h-0.5 bg-brand-red w-full mt-3 opacity-80" />
            </div>

            <div className="my-auto space-y-4">
              <p className="text-sm font-medium text-neutral-800 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                {data.notes || "Belum ada catatan tambahan."}
              </p>
              {/* Note Lines Visual */}
              <div className="space-y-6 pt-4">
                {[1, 2, 3, 4, 5, 6, 7].map((line) => (
                  <div key={line} className="border-b border-neutral-200 w-full" />
                ))}
              </div>
            </div>

            {renderFooter(12)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP CONTROLS FOR PREVIEW */}
      <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-black/[0.05] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-2">Document Preview</span>
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs">
            <button
              onClick={() => setViewMode("single")}
              className={clsx(
                "px-3 py-1 rounded-full font-bold transition-all",
                viewMode === "single" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
              )}
            >
              Single Page
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={clsx(
                "px-3 py-1 rounded-full font-bold transition-all",
                viewMode === "all" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
              )}
            >
              All Pages ({totalPages})
            </button>
          </div>
        </div>

        {/* PAGE NAVIGATION CONTROLS (IF SINGLE PAGE MODE) */}
        {viewMode === "single" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-neutral-700 dark:text-neutral-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-white min-w-[70px] text-center">
              Hal {activePage} / {totalPages}
            </span>
            <button
              onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-neutral-700 dark:text-neutral-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* DOCUMENT PAGE SHEET CONTAINER */}
      <div className="max-h-[85vh] overflow-y-auto pr-1 space-y-6">
        {viewMode === "single" ? (
          <div className="transition-all duration-300 animate-in fade-in">{renderPageContent(activePage)}</div>
        ) : (
          <div className="space-y-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <div key={pg} className="space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Halaman {pg}</div>
                {renderPageContent(pg)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
