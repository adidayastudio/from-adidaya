"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Sun,
  Users,
  HardHat,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Download,
  Share2,
  Building2,
  FileCheck,
  ChevronDown,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";
import clsx from "clsx";

interface WorkItem {
  id: string;
  wbs: string;
  description: string;
  location: string;
  volume: string;
  progress: string;
}

interface DCRData {
  documentId?: string;
  reportDate?: string;
  dayName?: string;
  dayNo?: string;
  totalDays?: string;
  remainingDays?: string;
  projectName?: string;
  contractorName?: string;
  weatherPagi?: string;
  weatherSiang?: string;
  weatherSore?: string;
  weatherMalam?: string;
  pmCount?: string;
  supervisorCount?: string;
  mandorCount?: string;
  tukangCount?: string;
  pekerjaCount?: string;
  operatorCount?: string;
  shift1Hours?: string;
  shift2Hours?: string;
  notes?: string;
  preparedBy?: string;
  approvedBy?: string;
}

const defaultDCRData: DCRData = {
  documentId: "71-01-00-DCR-2026-001",
  reportDate: "17/08/2026",
  dayName: "Monday / Senin",
  dayNo: "11",
  totalDays: "180",
  remainingDays: "169",
  projectName: "JPF - Masterplan & Architecture",
  contractorName: "PT. ADIDAYA KREASI NUSA",
  weatherPagi: "Cerah (Sunny)",
  weatherSiang: "Berawan (Cloudy)",
  weatherSore: "Hujan Ringan (Light Rain)",
  weatherMalam: "Cerah (Clear)",
  pmCount: "1",
  supervisorCount: "2",
  mandorCount: "3",
  tukangCount: "12",
  pekerjaCount: "18",
  operatorCount: "2",
  shift1Hours: "08:00 - 17:00 (8h)",
  shift2Hours: "17:00 - 21:00 (4h)",
  notes: "Pekerjaan pengecoran lantai 2 area A berjalan lancar. Penambahan 4 tukang untuk percepatan waterproofing zone B.",
  preparedBy: "Ir. Hendra Kusuma (Site Engineer)",
  approvedBy: "Budi Santoso, ST (Project Manager)"
};

const initialWorkItems: WorkItem[] = [
  { id: "1", wbs: "40 01 01", description: "Pekerjaan Bongkar Penutup Atap Eksisting Zone A", location: "Atap Main Building", volume: "120 m²", progress: "85%" },
  { id: "2", wbs: "41 02 00", description: "Pekerjaan Galian Pondasi Footplat & Sloof Zone B", location: "Ground Level", volume: "45 m³", progress: "60%" },
  { id: "3", wbs: "42 01 05", description: "Pemasangan Begisting Kolom Lantai 2", location: "Lantai 2 - Grid C4-D8", volume: "18 unit", progress: "100%" },
  { id: "4", wbs: "45 03 00", description: "Instalasi Membran Waterproofing Coating", location: "Dak Atap Barat", volume: "65 m²", progress: "40%" },
];

export default function DCRDailyConstructionReportPreview({
  data = defaultDCRData,
  isProjectDetail = false,
  onSave,
  onSelectNode
}: {
  data?: DCRData;
  isProjectDetail?: boolean;
  onSave?: (updatedData: DCRData) => void;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [workItems, setWorkItems] = useState<WorkItem[]>(initialWorkItems);

  // Form editable states
  const [reportDate, setReportDate] = useState(data.reportDate || defaultDCRData.reportDate);
  const [dayNo, setDayNo] = useState(data.dayNo || defaultDCRData.dayNo);
  const [notes, setNotes] = useState(data.notes || defaultDCRData.notes);
  const [preparedBy, setPreparedBy] = useState(data.preparedBy || defaultDCRData.preparedBy);
  const [approvedBy, setApprovedBy] = useState(data.approvedBy || defaultDCRData.approvedBy);

  // New work item states
  const [newWbs, setNewWbs] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [newVol, setNewVol] = useState("");

  const handleAddWorkItem = () => {
    if (!newDesc.trim()) return;
    const newItem: WorkItem = {
      id: `w-${Date.now()}`,
      wbs: newWbs || "40 00 00",
      description: newDesc,
      location: newLoc || "Zone A",
      volume: newVol || "1 unit",
      progress: "0%",
    };
    setWorkItems((prev) => [...prev, newItem]);
    setNewWbs("");
    setNewDesc("");
    setNewLoc("");
    setNewVol("");
  };

  const handleDeleteWorkItem = (id: string) => {
    setWorkItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* MATCHING HEADER LAYOUT (LIKE 11 00 00 KICKOFF) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        {/* LEFT: Code -> Title -> File Version Dropdown */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">
            71 01 00
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            DCR — Daily Construction Report
          </h2>
          {isProjectDetail && (
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              <div className="relative inline-block">
                <select
                  defaultValue="Rev 02"
                  className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer transition-all shadow-2xs"
                >
                  <option value="Rev 02">Rev 02 (17/08/2026 - Approved)</option>
                  <option value="Rev 01">Rev 01 (10/08/2026 - Reviewed)</option>
                  <option value="Rev 00">Rev 00 (01/08/2026 - Draft)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Action Buttons + Pill Toggle */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap pt-0.5">
          {/* Toggle Pill: Document Preview | Related Links */}
          <div className="flex items-center p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("preview")}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                activeTab === "preview"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              Document Preview
            </button>
            <button
              onClick={() => setActiveTab("related")}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                activeTab === "related"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              Related Links
            </button>
          </div>

          {/* Export button only shown in Project Detail mode */}
          {isProjectDetail && (
            <button
              onClick={() => alert("Downloading DCR Document PDF...")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "related" ? (
        /* RELATED LINKS SOURCE OVERVIEW MODE - FRAMELESS & TOP-ALIGNED LAYOUT */
        <div className="space-y-6 animate-in fade-in duration-300 font-sans py-2">
          <div className="space-y-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Related Links & Connected Data Sources</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              List of modules and data sources automatically synced into the DCR document. Click to open node directly in Project Tree.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pr-4 w-28 font-mono">CODE</th>
                  <th className="pb-3 px-4 w-52">MODULE NAME</th>
                  <th className="pb-3 px-4">SHORT DESCRIPTION</th>
                  <th className="pb-3 pl-4 w-32 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {[
                  {
                    code: "41 02 00",
                    name: "WBS Construction & Work Activities",
                    description: "Source of daily work description details, location/zone, target volume, and estimated % progress.",
                    nodeId: "41-02-00",
                  },
                  {
                    code: "95 03 00",
                    name: "Crew & Manpower Attendance Log",
                    description: "Source data of personnel attendance, PM, site manager, supervisor, foreman, craftsman, & operators.",
                    nodeId: "95-03-00",
                  },
                  {
                    code: "95 01 00",
                    name: "Time Tracking & Shift Log",
                    description: "Source logging of regular working hours (08.00-16.00) and overtime durations (OT 1, OT 2, OT 3).",
                    nodeId: "95-01-00",
                  },
                  {
                    code: "98 03 00",
                    name: "Weather & Climate Log",
                    description: "Source logging of daily weather conditions (sunny, cloudy, rain) and effective working hours.",
                    nodeId: "98-03-00",
                  },
                  {
                    code: "50 00 00",
                    name: "Material & Equipment Logistics",
                    description: "Source data of field material logistics, equipment, and field services (incoming, outgoing, & stock).",
                    nodeId: "50-00-00",
                  },
                  {
                    code: "96 01 00",
                    name: "QC Check & Inspection Log",
                    description: "Source quality verification of work outputs, material testing, & technical approval status.",
                    nodeId: "96-01-00",
                  },
                  {
                    code: "97 01 00",
                    name: "HSE & K3 Safety Log",
                    description: "Source data of safety inspections, HSE compliance, PPE usage, & toolbox meeting notes.",
                    nodeId: "97-01-00",
                  },
                  {
                    code: "99 01 00",
                    name: "Site Documentation & Photos",
                    description: "Source gallery of physical daily progress photos, activity evidence, and visual site records.",
                    nodeId: "99-00-00",
                  }
                ].map((item) => (
                  <tr
                    key={item.code}
                    onClick={() => {
                      if (onSelectNode) {
                        onSelectNode(item.nodeId, item.stage);
                      } else {
                        const url = new URL(window.location.href);
                        url.searchParams.set("docId", item.nodeId);
                        if (item.stage) url.searchParams.set("stage", item.stage);
                        window.history.pushState({}, "", url.toString());
                        window.dispatchEvent(new Event("popstate"));
                      }
                    }}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 pr-4 align-top">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-mono font-bold tracking-tight group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top font-bold text-neutral-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 align-top text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-3.5 pl-4 align-top text-right">
                      <button
                        className="px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-white border border-neutral-200 dark:border-neutral-700 group-hover:border-blue-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <span>Open Node</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PRINTABLE DOCUMENT PREVIEW MODE (EXACT 100% RDL FORMAT) */
        <div className="bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3 border border-neutral-300 rounded-2xl" style={{ fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
          
          {/* Header Branding & Metadata (EXACT RDL FORMAT) */}
          <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between gap-4">
            {/* Left: Official Adidaya Logo & Project Metadata */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 pr-1">
                <img src="/logo-adidaya-red.svg" alt="Adidaya" className="h-8 w-auto object-contain filter brightness-0" />
              </div>

              <div className="pl-4 border-l border-neutral-300 space-y-0.5">
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest">PROJECT</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded-sm leading-none shrink-0">
                    {data.projectName && data.projectName !== "JPF - Masterplan & Architecture" ? "KPA" : "ADY"}
                  </span>
                  <span className="font-extrabold text-[11px] text-neutral-900 tracking-tight uppercase leading-tight">
                    PROJECT NAME
                  </span>
                </div>
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest pt-1">LOCATION</div>
                <div className="text-[8px] font-semibold text-neutral-700 uppercase leading-tight">
                  —
                </div>
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest pt-1">WORK STAGE</div>
                <div className="text-[7.5px] font-bold text-neutral-800 uppercase leading-tight">—</div>
              </div>
            </div>

            {/* Right: Stamp Box */}
            <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
              <div className="font-black text-[30px] text-neutral-900 leading-none tracking-tighter">DCR</div>
              
              <div className="text-[5.5px] font-black text-neutral-900 uppercase tracking-wider leading-tight pt-1">
                DAILY REPORT
              </div>
              
              <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">
                Laporan Harian
              </div>

              <div className="w-full border-t border-neutral-300 my-1" />
              <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">71 01 00</div>
              <div className="w-full border-t border-neutral-200 my-1" />
              <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                <span className="text-left font-bold">REPORT DATE</span>
                <span className="text-right font-bold">REV</span>
                <span className="text-left font-black text-neutral-800">16 Aug 26</span>
                <span className="text-right font-black text-neutral-800">00</span>
              </div>
            </div>
          </div>

          {/* Date Meta Grid */}
          <div className="grid grid-cols-5 border border-neutral-300 rounded overflow-hidden text-center">
            {[
              { label: "DAY", value: "Sunday" },
              { label: "DATE", value: "16 Aug 26" },
              { label: "DAY NO.", value: "—" },
              { label: "TOTAL DAYS", value: "—" },
              { label: "REMAINING DAYS", value: "—" },
            ].map((cell, i) => (
              <div key={i} className="border-r border-neutral-300 last:border-r-0">
                <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{cell.label}</div>
                <div className="text-[8px] font-bold text-neutral-800 py-1">{cell.value}</div>
              </div>
            ))}
          </div>

          {/* Main Tables Grid */}
          <div className="flex gap-3">
            {/* Work Activities */}
            <div className="flex-1">
              <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                <span>WORK ACTIVITIES & DESCRIPTION</span>
                <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                  41 02 00
                </span>
              </div>
              <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                    <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                    <th className="p-1 border-r border-neutral-300">WORK DESCRIPTION</th>
                    <th className="p-1 w-16 border-r border-neutral-300">LOCATION</th>
                    <th className="p-1 w-12 text-center">VOLUME</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-200 text-[6.5px] leading-tight min-h-[24px]">
                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">1</td>
                    <td className="p-1 border-r border-neutral-200 text-neutral-800 font-bold"></td>
                    <td className="p-1 border-r border-neutral-200 text-neutral-600 font-semibold"></td>
                    <td className="p-1 text-center text-neutral-800 font-bold"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Sidebar (Personnel + Working Hours + Weather) */}
            <div className="w-[200px] shrink-0 flex flex-col gap-2">
              {/* Personnel */}
              <div>
                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                  <span>PERSONNEL</span>
                  <span className="text-[6px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                    95 03 00
                  </span>
                </div>
                <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                  <tbody className="text-[6px]">
                    {[
                      ["Project Manager", "0"], ["Site Manager", "0"], ["Supervisor", "0"],
                      ["Foreman", "0"], ["Craftsman", "0"], ["Worker", "0"], ["Operator", "0"]
                    ].map(([label, val], i) => (
                      <tr key={i} className="border-b border-neutral-200">
                        <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">{label}</td>
                        <td className="p-0.5 text-center font-black text-neutral-900 w-8">{val}</td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-100 font-black">
                      <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-900">Total</td>
                      <td className="p-0.5 text-center font-black text-neutral-900 w-8">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Working Hours */}
              <div>
                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                  <span>WORKING HOURS</span>
                  <span className="text-[6px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                    95 01 00
                  </span>
                </div>
                <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                  <tbody className="text-[6px]">
                    <tr className="border-b border-neutral-200">
                      <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">Regular 08.00–16.00</td>
                      <td className="p-0.5 text-center font-bold text-neutral-900 w-12">0 Hours</td>
                    </tr>
                    <tr className="border-b border-neutral-200">
                      <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 1 16.00–18.00</td>
                      <td className="p-0.5 text-center font-bold text-neutral-900 w-12">0 Hours</td>
                    </tr>
                    <tr className="border-b border-neutral-200">
                      <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 2 18.00–22.00</td>
                      <td className="p-0.5 text-center font-bold text-neutral-900 w-12">0 Hours</td>
                    </tr>
                    <tr>
                      <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 3 22.00–08.00</td>
                      <td className="p-0.5 text-center font-bold text-neutral-900 w-12">0 Hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Weather */}
              <div>
                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                  <span>WEATHER</span>
                  <span className="text-[6px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                    98 03 00
                  </span>
                </div>
                <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-300 text-[5.5px] font-extrabold text-neutral-500 uppercase">
                      <th className="p-0.5 pl-1 border-r border-neutral-300">TIME</th>
                      <th className="p-0.5 text-center border-r border-neutral-300 w-4">☀️</th>
                      <th className="p-0.5 text-center border-r border-neutral-300 w-4">⛅</th>
                      <th className="p-0.5 text-center border-r border-neutral-300 w-4">🌧️</th>
                      <th className="p-0.5 text-center w-8">DURATION</th>
                    </tr>
                  </thead>
                  <tbody className="text-[6px]">
                    <tr className="border-b border-neutral-200">
                      <td className="p-0.5 pl-1 border-r border-neutral-200 text-neutral-600 font-medium">08.00 - 16.00</td>
                      <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900">✓</td>
                      <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900"></td>
                      <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900"></td>
                      <td className="p-0.5 text-center font-semibold text-neutral-600">7 Hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Material / Equipment / Services */}
          <div>
            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
              <span>FIELD MATERIAL, EQUIPMENT & SERVICES</span>
              <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                50 00 00
              </span>
            </div>
            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                  <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                  <th className="p-1 w-16 border-r border-neutral-300">CATEGORY</th>
                  <th className="p-1 border-r border-neutral-300">MATERIAL / EQUIPMENT / SERVICE NAME</th>
                  <th className="p-1 w-12 text-center border-r border-neutral-300">UNIT</th>
                  <th className="p-1 w-12 text-center border-r border-neutral-300">INCOMING</th>
                  <th className="p-1 w-14 text-center border-r border-neutral-300">USED / OUTGOING</th>
                  <th className="p-1 w-14 text-center">STOCK</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200 text-[6.5px]">
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">1</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-600 uppercase">MATERIAL</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800"></td>
                  <td className="p-1 text-center border-r border-neutral-200 font-semibold text-neutral-600">unit</td>
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">0</td>
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">0</td>
                  <td className="p-1 text-center font-bold text-neutral-800">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* QC Check & Inspection Log */}
          <div>
            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
              <span>QC CHECK & INSPECTION LOG</span>
              <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                96 01 00
              </span>
            </div>
            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                  <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                  <th className="p-1 border-r border-neutral-300">INSPECTION ITEM / WORK</th>
                  <th className="p-1 w-20 border-r border-neutral-300">LOCATION</th>
                  <th className="p-1 w-24 border-r border-neutral-300">SPEC / STANDARD</th>
                  <th className="p-1 w-14 text-center border-r border-neutral-300">STATUS</th>
                  <th className="p-1 w-28">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200 text-[6.5px]">
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">1</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">Rebar & Formwork Quality Inspection</td>
                  <td className="p-1 border-r border-neutral-200 text-neutral-600 font-semibold">Roof Top Area</td>
                  <td className="p-1 border-r border-neutral-200 text-neutral-600">SNI / Architect Spec</td>
                  <td className="p-1 text-center border-r border-neutral-200 font-black text-emerald-600">PASS</td>
                  <td className="p-1 text-neutral-700">Approved for concrete pouring</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* HSE Check & Safety Log */}
          <div>
            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
              <span>HSE CHECK & SAFETY LOG</span>
              <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                97 01 00
              </span>
            </div>
            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                  <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                  <th className="p-1 border-r border-neutral-300">SAFETY INSPECTION ITEM</th>
                  <th className="p-1 w-16 text-center border-r border-neutral-300">STATUS</th>
                  <th className="p-1">REMARKS & CORRECTION ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200 text-[6.5px]">
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">1</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">Full PPE Compliance (Helmet, Boots, Safety Harness)</td>
                  <td className="p-1 text-center border-r border-neutral-200 font-black text-emerald-600">OK</td>
                  <td className="p-1 text-neutral-700">All workers fully compliant with standard PPE</td>
                </tr>
                <tr className="border-b border-neutral-200 text-[6.5px]">
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">2</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">Toolbox Meeting & Morning Safety Briefing</td>
                  <td className="p-1 text-center border-r border-neutral-200 font-black text-emerald-600">OK</td>
                  <td className="p-1 text-neutral-700">Conducted at 07:45 AM prior to work start</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Site Issues & Instruction Log */}
          <div>
            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
              <span>SITE ISSUES & INSTRUCTION LOG</span>
              <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                96 02 00
              </span>
            </div>
            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                  <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                  <th className="p-1 w-16 border-r border-neutral-300">TYPE</th>
                  <th className="p-1 border-r border-neutral-300">ISSUES / INSTRUCTION DESCRIPTION</th>
                  <th className="p-1 w-24 border-r border-neutral-300">ISSUED BY</th>
                  <th className="p-1 w-24 text-center">ACTION / STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200 text-[6.5px]">
                  <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">1</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-600 uppercase">INSTRUCTION</td>
                  <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">Additional scaffolding & safety net installation on East Elevation</td>
                  <td className="p-1 border-r border-neutral-200 text-neutral-600 font-semibold">Project Engineer</td>
                  <td className="p-1 text-center font-bold text-emerald-600">COMPLETED</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Documentation & Site Photos */}
          <div>
            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
              <span>DOCUMENTATION & SITE PHOTOS</span>
              <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors">
                99 01 00
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 border border-neutral-300 border-t-0 bg-neutral-50/30">
              <div className="border border-neutral-200 rounded p-1 bg-white flex flex-col items-center">
                <div className="w-full h-24 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 text-[8px] font-bold">
                  📷 Site Progress Photo 1
                </div>
                <div className="text-[6px] font-semibold text-neutral-600 mt-1 text-center">Roof Structure Rebar Work Activity</div>
              </div>
              <div className="border border-neutral-200 rounded p-1 bg-white flex flex-col items-center">
                <div className="w-full h-24 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 text-[8px] font-bold">
                  📷 Site Progress Photo 2
                </div>
                <div className="text-[6px] font-semibold text-neutral-600 mt-1 text-center">Material Arrival & Unloading on Site</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
