"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Percent,
  Sparkles,
  Calculator,
  Layers,
  ArrowLeft,
  Printer,
  FileText,
  Table as TableIcon
} from "lucide-react";
import clsx from "clsx";
import { terbilang } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/terbilang";
import {
  generateLevel2DetailRows,
  generateDisciplineRows,
  getDisciplineTabs,
} from "./data/rab-v3-wbs-adapter";

export interface RABRowData {
  id: string;
  rowIdx: number;
  no: string;
  code: string;
  title: string;
  volume: number;
  unit: string;
  unitPrice: number;
  isSection?: boolean;
}

export interface ProjectV3Info {
  projectName?: string;
  projectCode?: string;
  buildingArea?: number;
  buildingClass?: "A" | "B" | "C" | "D";
  estimateValues?: Record<string, any>;
  wbsTree?: any[];
}

export type RABV3Tab =
  | "rekap_samil"
  | "detail_level2"
  | "disc_S"
  | "disc_A"
  | "disc_M"
  | "disc_I"
  | "disc_L";

function formatIDR(num: number): string {
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(num));
  return `Rp ${formatted}`;
}

export default function RABV3StructuredExcel({
  projectInfo,
  mode = "BALLPARK",
  onBackToOverview,
}: {
  projectInfo?: ProjectV3Info;
  mode?: "BALLPARK" | "ESTIMATES" | "DETAIL";
  onBackToOverview?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<RABV3Tab>("rekap_samil");

  // MASTER REACTIVE STORE: Single Source of Truth for all detail items across all sheets
  const [masterRows, setMasterRows] = useState<RABRowData[]>(() => generateLevel2DetailRows(projectInfo));

  // Sync masterRows when projectInfo changes
  useEffect(() => {
    setMasterRows(generateLevel2DetailRows(projectInfo));
  }, [projectInfo]);

  // Derived visible rows per activeTab (reactively computed from masterRows)
  const visibleRows = useMemo(() => {
    if (activeTab === "detail_level2") {
      return masterRows;
    }

    if (activeTab === "rekap_samil") {
      // Group masterRows by discipline prefix (S, A, M, I, L) and sum costs
      const discMap: Record<string, { title: string; cost: number }> = {
        S: { title: "PEKERJAAN STRUKTUR (S)", cost: 0 },
        A: { title: "PEKERJAAN ARSITEKTUR (A)", cost: 0 },
        M: { title: "PEKERJAAN MEP (M)", cost: 0 },
        I: { title: "PEKERJAAN INTERIOR (I)", cost: 0 },
        L: { title: "PEKERJAAN LANSKAP (L)", cost: 0 },
      };

      masterRows.forEach((r) => {
        if (!r.isSection) {
          const codePrefix = r.code.charAt(0).toUpperCase();
          if (discMap[codePrefix]) {
            discMap[codePrefix].cost += r.volume * r.unitPrice;
          }
        }
      });

      const rekapList: RABRowData[] = [
        {
          id: "sec_rekap_master",
          rowIdx: 7,
          no: "1.0",
          code: projectInfo?.projectCode || "PRJ",
          title: "REKAPITULASI UMUM",
          volume: 0,
          unit: "ls",
          unitPrice: 0,
          isSection: true,
        },
      ];

      let rIdx = 8;
      Object.keys(discMap).forEach((code, idx) => {
        const item = discMap[code];
        rekapList.push({
          id: `rekap_${code}`,
          rowIdx: rIdx++,
          no: `1.${idx + 1}`,
          code: code,
          title: item.title,
          volume: 1,
          unit: "ls",
          unitPrice: item.cost,
        });
      });

      return rekapList;
    }

    // Specific discipline tab e.g. "disc_S", "disc_A", "disc_M", "disc_I", "disc_L"
    if (activeTab.startsWith("disc_")) {
      const targetCode = activeTab.replace("disc_", "");
      return generateDisciplineRows(targetCode, projectInfo);
    }
  }, [masterRows, activeTab, projectInfo]);

  const [includePPN, setIncludePPN] = useState<boolean>(true);

  const [selectedCellRef, setSelectedCellRef] = useState<string>("C8");
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editInputVal, setEditInputVal] = useState<string>("");
  const [formulaBarInput, setFormulaBarInput] = useState<string>("");

  const inlineInputRef = useRef<HTMLInputElement>(null);

  const disciplineTabs = useMemo(() => {
    return getDisciplineTabs(projectInfo);
  }, [projectInfo]);

  // Tab-Specific Totals Calculation (No overhead row, unit prices include overhead)
  const activeSheetTotals = useMemo(() => {
    let subtotal = 0;
    visibleRows.forEach((r) => {
      if (!r.isSection) {
        subtotal += r.volume * r.unitPrice;
      }
    });

    const ppnCost = includePPN ? subtotal * 0.11 : 0;
    const grandTotal = subtotal + ppnCost;

    let subtotalLabel = "SUBTOTAL BIAYA LANGSUNG";
    let grandTotalLabel = "GRAND TOTAL BIAYA PROYEK (RAB)";

    const matchedTab = disciplineTabs.find((t) => t.id === activeTab);
    if (matchedTab) {
      subtotalLabel = `SUBTOTAL BIAYA ${matchedTab.label.toUpperCase()}`;
      grandTotalLabel = `TOTAL BIAYA ${matchedTab.label.toUpperCase()}`;
    } else if (activeTab === "rekap_samil") {
      subtotalLabel = "SUBTOTAL REKAPITULASI UMUM";
      grandTotalLabel = "GRAND TOTAL BIAYA PROYEK (RAB)";
    } else if (activeTab === "detail_level2") {
      subtotalLabel = "SUBTOTAL DETAIL BIAYA PROYEK";
      grandTotalLabel = "GRAND TOTAL BIAYA PROYEK (RAB)";
    }

    return { subtotal, ppnCost, grandTotal, subtotalLabel, grandTotalLabel };
  }, [visibleRows, includePPN, activeTab, disciplineTabs]);

  // Compute item totals & bobot % for currently visible rows
  const computedVisibleData = useMemo(() => {
    const sheetSubtotal = activeSheetTotals.subtotal;

    const computedRows = visibleRows.map((r) => {
      if (r.isSection) return { ...r, itemTotal: 0, bobot: 0 };
      const itemTotal = r.volume * r.unitPrice;
      const bobot = sheetSubtotal > 0 ? (itemTotal / sheetSubtotal) * 100 : 0;
      return { ...r, itemTotal, bobot };
    });

    return computedRows;
  }, [visibleRows, activeSheetTotals.subtotal]);

  // Handle cell click
  const handleCellClick = (cellRef: string, rawVal: string) => {
    setSelectedCellRef(cellRef);
    setFormulaBarInput(rawVal);
    setEditingCellId(null);
  };

  // Double click inline edit
  const handleCellDoubleClick = (cellRef: string, cellId: string, currentVal: string) => {
    setSelectedCellRef(cellRef);
    setEditingCellId(cellId);
    setEditInputVal(currentVal);
    setTimeout(() => {
      inlineInputRef.current?.focus();
    }, 50);
  };

  // Commit inline edit: updating masterRows guarantees reactive updates across ALL sheets!
  const commitEdit = (rowId: string, field: "volume" | "unitPrice" | "title", val: string) => {
    setMasterRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId && !rowId.includes(r.code)) return r;
        if (field === "volume" || field === "unitPrice") {
          const parsed = parseFloat(val.replace(/[^0-9.-]/g, ""));
          return { ...r, [field]: isNaN(parsed) ? 0 : parsed };
        }
        return { ...r, title: val };
      })
    );
    setEditingCellId(null);
  };

  const handleFormulaBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCellRef) return;
    const match = selectedCellRef.match(/([A-Z]+)([0-9]+)/);
    if (!match) return;
    const col = match[1];
    const rowNum = parseInt(match[2], 10);

    const targetRow = computedVisibleData.find((r) => r.rowIdx === rowNum);
    if (targetRow && !targetRow.isSection) {
      if (col === "D") commitEdit(targetRow.id, "volume", formulaBarInput);
      else if (col === "F") commitEdit(targetRow.id, "unitPrice", formulaBarInput);
      else if (col === "C") commitEdit(targetRow.id, "title", formulaBarInput);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = "No,Kode WBS,Uraian Pekerjaan,Volume,Satuan,Harga Satuan (Rp),Jumlah Harga (Rp),Bobot (%)\n";
    computedVisibleData.forEach((r) => {
      if (r.isSection) {
        csv += `"${r.no}","${r.code}","${r.title.replace(/"/g, '""')}",,,,,\n`;
      } else {
        csv += `"${r.no}","${r.code}","${r.title.replace(/"/g, '""')}","${r.volume}","${r.unit}","${r.unitPrice}","${r.itemTotal}","${r.bobot.toFixed(2)}%"\n`;
      }
    });
    csv += `,,${activeSheetTotals.subtotalLabel},,,,"${activeSheetTotals.subtotal}",100%\n`;
    if (includePPN) {
      csv += `,,PPN (11%),,,,"${activeSheetTotals.ppnCost}",\n`;
    }
    csv += `,,${activeSheetTotals.grandTotalLabel},,,,"${activeSheetTotals.grandTotal}",\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RAB_V3_${activeTab}_${projectInfo?.projectCode || "Export"}.csv`;
    link.click();
  };

  // Export PDF
  const handleExportPDF = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Pop-up diblokir oleh browser. Harap izinkan pop-up untuk mengekspor PDF.");
      return;
    }

    const title = projectInfo?.projectName || "Proyek Testing";
    const code = projectInfo?.projectCode || "PRJ-2026-001";
    const tabName = activeTab === "rekap_samil" ? "Rekapitulasi SAMIL Level 1" : activeTab === "detail_level2" ? "Rincian Detail BOQ" : `Divisi ${activeTab.replace("disc_", "")}`;

    let tableRowsHtml = "";
    computedVisibleData.forEach((r) => {
      if (r.isSection) {
        tableRowsHtml += `
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="padding: 6px; text-align: center;">${r.no}</td>
            <td style="padding: 6px;">${r.code}</td>
            <td colspan="5" style="padding: 6px; text-transform: uppercase;">${r.title}</td>
            <td style="padding: 6px; text-align: right;">100%</td>
          </tr>
        `;
      } else {
        tableRowsHtml += `
          <tr>
            <td style="padding: 6px; text-align: center;">${r.no}</td>
            <td style="padding: 6px; font-family: monospace;">${r.code}</td>
            <td style="padding: 6px;">${r.title}</td>
            <td style="padding: 6px; text-align: right;">${r.volume}</td>
            <td style="padding: 6px; text-align: center;">${r.unit}</td>
            <td style="padding: 6px; text-align: right; white-space: nowrap;">${formatIDR(r.unitPrice)}</td>
            <td style="padding: 6px; text-align: right; white-space: nowrap; font-weight: 600;">${formatIDR(r.itemTotal)}</td>
            <td style="padding: 6px; text-align: right;">${r.bobot.toFixed(2)}%</td>
          </tr>
        `;
      }
    });

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RAB PDF - ${title} (${code})</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; color: #065f46; }
          .header p { margin: 4px 0; color: #4b5563; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #d1d5db; font-size: 11px; }
          th { background-color: #e5e7eb; padding: 8px 6px; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9fafb; }
          .grand-total { font-weight: bold; background-color: #ecfdf5; color: #065f46; font-size: 12px; }
          .terbilang { background-color: #f0fdf4; border: 1px solid #a7f3d0; padding: 10px; font-style: italic; font-weight: bold; color: #065f46; border-radius: 4px; }
          @media print {
            body { margin: 0; }
            @page { size: A4 portrait; margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title.toUpperCase()}</h1>
          <p>KODE PROYEK: ${code} | SHEET: ${tabName.toUpperCase()} | MODE: ${mode} RAB</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">NO</th>
              <th style="width: 80px;">KODE WBS</th>
              <th>URAIAN PEKERJAAN</th>
              <th style="width: 50px;">VOL</th>
              <th style="width: 45px;">SAT</th>
              <th style="width: 130px;">HARGA SATUAN</th>
              <th style="width: 140px;">JUMLAH HARGA</th>
              <th style="width: 60px;">BOBOT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="total-row">
              <td colspan="3" style="padding: 8px;">${activeSheetTotals.subtotalLabel}</td>
              <td colspan="3" style="text-align: right; padding: 8px; white-space: nowrap;">${formatIDR(activeSheetTotals.subtotal)}</td>
              <td style="text-align: right; padding: 8px;">100.00%</td>
            </tr>
            ${includePPN ? `
            <tr>
              <td colspan="3" style="padding: 6px;">PPN 11%</td>
              <td colspan="3" style="text-align: right; padding: 6px; white-space: nowrap;">${formatIDR(activeSheetTotals.ppnCost)}</td>
              <td style="text-align: right; padding: 6px;">-</td>
            </tr>` : ''}
            <tr class="grand-total">
              <td colspan="3" style="padding: 10px; font-size: 13px;">${activeSheetTotals.grandTotalLabel}</td>
              <td colspan="3" style="text-align: right; padding: 10px; font-size: 14px; white-space: nowrap;">${formatIDR(activeSheetTotals.grandTotal)}</td>
              <td style="text-align: right; padding: 10px;">TOTAL</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang">
          Terbilang: ${terbilang(activeSheetTotals.grandTotal)} Rupiah
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(docHtml);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden font-sans text-xs text-neutral-800 dark:text-neutral-200">
      {/* ================= 1. TOP TITLE & CONTROLS BANNER (CLEAN & MINIMAL) ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              title="Kembali ke Overview"
              className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TableIcon className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 dark:text-white text-sm">
              {projectInfo?.projectName || "Proyek Testing"}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
              {mode} RAB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* PPN Toggle */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={includePPN}
                onChange={(e) => setIncludePPN(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>PPN 11%</span>
            </label>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 rounded-lg transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ================= 2. EXCEL FORMULA BAR (A1, fx) ================= */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100/80 dark:bg-neutral-950/90 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-center w-14 px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs shadow-inner">
          <span>{selectedCellRef}</span>
        </div>

        <div className="px-1 text-neutral-500 font-serif italic font-bold text-sm select-none">
          fx
        </div>

        <form onSubmit={handleFormulaBarSubmit} className="flex-1">
          <input
            type="text"
            value={formulaBarInput}
            onChange={(e) => setFormulaBarInput(e.target.value)}
            placeholder="Pilih sel untuk melihat atau mengedit formula/nilai"
            className="w-full px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded font-mono text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </form>
      </div>

      {/* ================= 3. STRUCTURED RAB TABLE CANVAS ================= */}
      <div className="overflow-x-auto bg-white dark:bg-neutral-900">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {/* Column Index Header (A, B, C, D, E, F, G, H) */}
            <tr className="bg-neutral-100 dark:bg-neutral-950 text-center font-mono font-semibold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <th className="w-12 py-1 border-r border-neutral-200 dark:border-neutral-800">#</th>
              <th className="w-12 py-1 border-r border-neutral-200 dark:border-neutral-800">A</th>
              <th className="w-24 py-1 border-r border-neutral-200 dark:border-neutral-800">B</th>
              <th className="py-1 border-r border-neutral-200 dark:border-neutral-800 text-left px-3">C</th>
              <th className="w-24 py-1 border-r border-neutral-200 dark:border-neutral-800">D</th>
              <th className="w-20 py-1 border-r border-neutral-200 dark:border-neutral-800">E</th>
              <th className="w-40 min-w-[150px] py-1 border-r border-neutral-200 dark:border-neutral-800 text-right px-3 whitespace-nowrap">F</th>
              <th className="w-44 min-w-[165px] py-1 border-r border-neutral-200 dark:border-neutral-800 text-right px-3 whitespace-nowrap">G</th>
              <th className="w-24 py-1 text-right px-3">H</th>
            </tr>

            {/* Table Column Title Header */}
            <tr className="bg-neutral-100 dark:bg-neutral-800/80 font-bold text-neutral-900 dark:text-white border-b border-neutral-300 dark:border-neutral-700">
              <th className="w-12 py-2 text-center border-r border-neutral-200 dark:border-neutral-700">ROW</th>
              <th className="w-12 py-2 text-center border-r border-neutral-200 dark:border-neutral-700">NO</th>
              <th className="w-24 py-2 px-2 border-r border-neutral-200 dark:border-neutral-700">KODE WBS</th>
              <th className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-700">URAIAN PEKERJAAN</th>
              <th className="w-24 py-2 px-2 text-right border-r border-neutral-200 dark:border-neutral-700">VOLUME</th>
              <th className="w-20 py-2 text-center border-r border-neutral-200 dark:border-neutral-700">SATUAN</th>
              <th className="w-40 min-w-[150px] py-2 px-3 text-right border-r border-neutral-200 dark:border-neutral-700 whitespace-nowrap">HARGA SATUAN (RP)</th>
              <th className="w-44 min-w-[165px] py-2 px-3 text-right border-r border-neutral-200 dark:border-neutral-700 whitespace-nowrap">JUMLAH HARGA (RP)</th>
              <th className="w-24 py-2 px-3 text-right">BOBOT (%)</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {computedVisibleData.map((row) => {
              const isSection = row.isSection;

              if (isSection) {
                return (
                  <tr key={row.id} className="bg-neutral-100/70 dark:bg-neutral-800/50 font-bold">
                    <td className="w-12 py-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">{row.rowIdx}</td>
                    <td className="py-2 text-center border-r border-neutral-200 dark:border-neutral-800">{row.no}</td>
                    <td className="py-2 px-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-500 font-mono">{row.code}</td>
                    <td colSpan={5} className="py-2 px-3 text-neutral-900 dark:text-white uppercase tracking-tight">{row.title}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">100%</td>
                  </tr>
                );
              }

              const isEditingVol = editingCellId === `${row.id}_vol`;
              const isEditingPrice = editingCellId === `${row.id}_price`;
              const isEditingTitle = editingCellId === `${row.id}_title`;

              const colDRef = `D${row.rowIdx}`;
              const colFRef = `F${row.rowIdx}`;
              const colGRef = `G${row.rowIdx}`;

              return (
                <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="w-12 py-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">{row.rowIdx}</td>
                  <td className="py-2 text-center border-r border-neutral-200 dark:border-neutral-800 font-medium">{row.no}</td>
                  <td className="py-2 px-2 border-r border-neutral-200 dark:border-neutral-800 font-mono text-neutral-500">{row.code}</td>

                  {/* Title (C) */}
                  <td
                    onClick={() => handleCellClick(`C${row.rowIdx}`, row.title)}
                    onDoubleClick={() => handleCellDoubleClick(`C${row.rowIdx}`, `${row.id}_title`, row.title)}
                    className={clsx(
                      "py-2 px-3 border-r border-neutral-200 dark:border-neutral-800 cursor-pointer relative",
                      selectedCellRef === `C${row.rowIdx}` && "ring-2 ring-emerald-500 ring-inset bg-emerald-50/40 dark:bg-emerald-950/20"
                    )}
                  >
                    {isEditingTitle ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={editInputVal}
                        onChange={(e) => setEditInputVal(e.target.value)}
                        onBlur={() => commitEdit(row.id, "title", editInputVal)}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit(row.id, "title", editInputVal)}
                        className="w-full px-1 py-0.5 bg-white dark:bg-neutral-800 border-2 border-emerald-500 rounded focus:outline-none"
                      />
                    ) : (
                      <span>{row.title}</span>
                    )}
                  </td>

                  {/* Volume (D) */}
                  <td
                    onClick={() => handleCellClick(colDRef, String(row.volume))}
                    onDoubleClick={() => handleCellDoubleClick(colDRef, `${row.id}_vol`, String(row.volume))}
                    className={clsx(
                      "py-2 px-2 text-right border-r border-neutral-200 dark:border-neutral-800 font-mono cursor-pointer relative",
                      selectedCellRef === colDRef && "ring-2 ring-emerald-500 ring-inset bg-emerald-50/40 dark:bg-emerald-950/20"
                    )}
                  >
                    {isEditingVol ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={editInputVal}
                        onChange={(e) => setEditInputVal(e.target.value)}
                        onBlur={() => commitEdit(row.id, "volume", editInputVal)}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit(row.id, "volume", editInputVal)}
                        className="w-full px-1 py-0.5 text-right font-mono bg-white dark:bg-neutral-800 border-2 border-emerald-500 rounded focus:outline-none"
                      />
                    ) : (
                      <span>{row.volume}</span>
                    )}
                  </td>

                  {/* Unit (E) */}
                  <td className="py-2 text-center border-r border-neutral-200 dark:border-neutral-800 font-medium text-neutral-600 dark:text-neutral-400">{row.unit}</td>

                  {/* Unit Price (F) */}
                  <td
                    onClick={() => handleCellClick(colFRef, String(row.unitPrice))}
                    onDoubleClick={() => handleCellDoubleClick(colFRef, `${row.id}_price`, String(row.unitPrice))}
                    className={clsx(
                      "py-2 px-3 text-right border-r border-neutral-200 dark:border-neutral-800 font-mono cursor-pointer relative whitespace-nowrap min-w-[150px]",
                      selectedCellRef === colFRef && "ring-2 ring-emerald-500 ring-inset bg-emerald-50/40 dark:bg-emerald-950/20"
                    )}
                  >
                    {isEditingPrice ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={editInputVal}
                        onChange={(e) => setEditInputVal(e.target.value)}
                        onBlur={() => commitEdit(row.id, "unitPrice", editInputVal)}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit(row.id, "unitPrice", editInputVal)}
                        className="w-full px-1 py-0.5 text-right font-mono bg-white dark:bg-neutral-800 border-2 border-emerald-500 rounded focus:outline-none"
                      />
                    ) : (
                      <span>{formatIDR(row.unitPrice)}</span>
                    )}
                  </td>

                  {/* Total Cost (G = D * F) */}
                  <td
                    onClick={() => handleCellClick(colGRef, `=${colDRef}*${colFRef}`)}
                    className={clsx(
                      "py-2 px-3 text-right border-r border-neutral-200 dark:border-neutral-800 font-mono font-semibold text-neutral-900 dark:text-white cursor-pointer relative whitespace-nowrap min-w-[165px]",
                      selectedCellRef === colGRef && "ring-2 ring-emerald-500 ring-inset bg-emerald-50/40 dark:bg-emerald-950/20"
                    )}
                  >
                    <span>{formatIDR(row.itemTotal)}</span>
                  </td>

                  {/* Bobot % (H) */}
                  <td className="py-2 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                    {row.bobot.toFixed(2)}%
                  </td>
                </tr>
              );
            })}

            {/* TAB-SPECIFIC SUMMARY TOTAL ROWS */}
            <tr className="bg-neutral-100 dark:bg-neutral-950 font-bold border-t-2 border-neutral-300 dark:border-neutral-700">
              <td colSpan={7} className="py-2.5 px-3 text-left uppercase text-neutral-900 dark:text-white">
                {activeSheetTotals.subtotalLabel}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-sm text-neutral-900 dark:text-white whitespace-nowrap">
                {formatIDR(activeSheetTotals.subtotal)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono">100.00%</td>
            </tr>

            {includePPN && (
              <tr className="bg-neutral-50 dark:bg-neutral-900 font-medium">
                <td colSpan={7} className="py-2 px-3 text-left text-neutral-700 dark:text-neutral-300">
                  PPN 11%
                </td>
                <td className="py-2 px-3 text-right font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                  {formatIDR(activeSheetTotals.ppnCost)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-neutral-400">-</td>
              </tr>
            )}

            <tr className="bg-emerald-50 dark:bg-emerald-950/50 font-bold text-emerald-900 dark:text-emerald-200 border-t-2 border-emerald-500">
              <td colSpan={7} className="py-3 px-3 text-left text-sm uppercase">
                {activeSheetTotals.grandTotalLabel}
              </td>
              <td className="py-3 px-3 text-right font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                {formatIDR(activeSheetTotals.grandTotal)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-xs">TOTAL</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TERBILANG BANNER */}
      <div className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Terbilang: </span>
        <span className="italic font-normal">{terbilang(activeSheetTotals.grandTotal)} Rupiah</span>
      </div>

      {/* ================= 4. EXCEL BOTTOM TABS ================= */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("rekap_samil")}
            className={clsx(
              "px-3 py-1 rounded-t-md text-xs font-medium border-t border-x transition-colors",
              activeTab === "rekap_samil"
                ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-emerald-600 font-bold"
                : "bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:bg-neutral-200"
            )}
          >
            Rekap
          </button>

          <button
            onClick={() => setActiveTab("detail_level2")}
            className={clsx(
              "px-3 py-1 rounded-t-md text-xs font-medium border-t border-x transition-colors",
              activeTab === "detail_level2"
                ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-emerald-600 font-bold"
                : "bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:bg-neutral-200"
            )}
          >
            Detail
          </button>

          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

          {disciplineTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as RABV3Tab)}
              className={clsx(
                "px-3 py-1 rounded-t-md text-xs font-medium border-t border-x transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-emerald-600 font-bold"
                  : "bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:bg-neutral-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-neutral-500 shrink-0 ml-3 hidden sm:block">
          STATUS: <strong className="text-emerald-600 dark:text-emerald-400">READY</strong> | ROWS: {computedVisibleData.length}
        </div>
      </div>
    </div>
  );
}
