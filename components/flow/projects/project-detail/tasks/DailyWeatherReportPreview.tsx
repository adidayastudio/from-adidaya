"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  ExternalLink,
  Share2,
  Edit3,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface HourlyWeatherRow {
  id: string;
  timeRange: string;
  condition: string;
  notes?: string;
}

interface DailyWeatherReportPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}

export default function DailyWeatherReportPreview({
  isProjectDetail = false,
  projectName,
  onSelectNode,
}: DailyWeatherReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [selectedDate, setSelectedDate] = useState(new Date("2026-08-23"));
  const [scale, setScale] = useState<number>(1);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Today helper
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isSelectedDateFuture = useMemo(() => {
    const s = new Date(selectedDate);
    s.setHours(0, 0, 0, 0);
    return s > today;
  }, [selectedDate, today]);

  const isSelectedDateToday = useMemo(() => {
    const s = new Date(selectedDate);
    s.setHours(0, 0, 0, 0);
    return s.getTime() === today.getTime();
  }, [selectedDate, today]);

  // Dynamic Hourly Weather Rows State
  const [hourlyRows, setHourlyRows] = useState<HourlyWeatherRow[]>([
    { id: "1", timeRange: "08.00 - 09.00", condition: "Sunny", notes: "" },
    { id: "2", timeRange: "09.00 - 10.00", condition: "Sunny", notes: "" },
    { id: "3", timeRange: "10.00 - 11.00", condition: "Sunny", notes: "" },
    { id: "4", timeRange: "11.00 - 12.00", condition: "Sunny", notes: "" },
    { id: "5", timeRange: "12.00 - 13.00", condition: "Sunny", notes: "" },
    { id: "6", timeRange: "14.00 - 15.00", condition: "Cloudy", notes: "" },
    { id: "7", timeRange: "15.00 - 16.00", condition: "Rainy", notes: "Heavy rain; 1hr outdoor delay" },
  ]);

  const [siteNotes, setSiteNotes] = useState(
    "Optimal sunny weather conditions throughout morning operational hours. Light drizzle occurred in afternoon; indoor formwork prep proceeded."
  );

  // Helper to parse duration hours from time range
  const getRowHours = (timeRange: string): number => {
    if (!timeRange || !timeRange.includes("-")) return 1;
    const parts = timeRange.split("-");
    const startStr = parts[0].trim().replace(":", ".");
    const endStr = parts[1].trim().replace(":", ".");
    const start = parseFloat(startStr);
    const end = parseFloat(endStr);
    if (isNaN(start) || isNaN(end)) return 1;
    const diff = end - start;
    return diff > 0 ? diff : 1;
  };

  // Weather Totals Calculation
  const weatherTotals = useMemo(() => {
    let sunny = 0;
    let cloudy = 0;
    let rainy = 0;

    hourlyRows.forEach((row) => {
      const hrs = getRowHours(row.timeRange);
      if (row.condition === "Sunny" || row.condition === "Cerah") {
        sunny += hrs;
      } else if (row.condition === "Cloudy" || row.condition === "Berawan") {
        cloudy += hrs;
      } else if (row.condition === "Rainy" || row.condition.includes("Rain") || row.condition.includes("Hujan")) {
        rainy += hrs;
      }
    });

    const total = sunny + cloudy + rainy;
    return { sunny, cloudy, rainy, total };
  }, [hourlyRows]);

  // Dynamic A4 Scale Engine (Identical to CRW)
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableWidth = rect.width - 80;
        if (availableWidth > 0) {
          const newScale = Math.min(availableWidth / 794, 1);
          setScale(Math.max(0.1, newScale));
        }
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", updateScale);
      observer.disconnect();
    };
  }, []);

  // Sync prop projectName with state
  useEffect(() => {
    if (projectName) {
      setActiveProject(projectName);
    }
  }, [projectName]);

  // Load real workspace projects from DB
  useEffect(() => {
    async function loadProjects() {
      try {
        const wsId = await fetchDefaultWorkspaceId();
        const dbProjects = await fetchProjectsByWorkspace(wsId || undefined);
        if (dbProjects && dbProjects.length > 0) {
          const formatted = dbProjects.map((p: any) => {
            const rawCode = p.project_code || p.project_number || p.code || "";
            const cleanCode = rawCode.replace("[", "").replace("]", "").trim().toUpperCase();
            const name = p.project_name || p.name || "";
            const fullName = cleanCode ? `[${cleanCode}] ${name}` : name;
            return {
              id: p.id,
              code: cleanCode ? `[${cleanCode}]` : "",
              cleanCode: cleanCode || "",
              name,
              fullName,
              location: p.location || p.site_location || p.address || "",
              stage: p.stage || p.current_stage || "Construction Phase"
            };
          });
          setProjectList(formatted);

          const searchKey = projectName || activeProject;
          if (searchKey) {
            const match = formatted.find(
              (p) =>
                p.name.toLowerCase() === searchKey.toLowerCase() ||
                p.fullName.toLowerCase() === searchKey.toLowerCase() ||
                (p.cleanCode && searchKey.toUpperCase().includes(p.cleanCode))
            );
            setActiveProject(match ? match.fullName : formatted[0].fullName);
          } else {
            setActiveProject(formatted[0].fullName);
          }
        }
      } catch (err) {
        console.error("Error loading project list:", err);
      }
    }
    loadProjects();
  }, [projectName]);

  const formatLocationStr = (locStr: any) => {
    if (!locStr) return "KOTA JAKARTA TIMUR, DKI JAKARTA";
    if (typeof locStr === "string") return locStr;
    if (typeof locStr === "object") {
      const parts = [locStr.address || locStr.street, locStr.city || locStr.district, locStr.province || locStr.state].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "KOTA JAKARTA TIMUR, DKI JAKARTA";
    }
    return String(locStr);
  };

  const projInfo = useMemo(() => {
    let matched = projectList.find(
      (p) =>
        p.fullName === activeProject ||
        p.name === activeProject ||
        p.id === activeProject ||
        p.code === activeProject ||
        (p.cleanCode && activeProject?.toUpperCase().includes(p.cleanCode)) ||
        (p.name && activeProject?.toLowerCase().includes(p.name.toLowerCase()))
    );

    if (!matched && projectList.length > 0) {
      matched = projectList[0];
    }

    let code = matched?.cleanCode || "PROJ";
    let cleanName = matched?.name || (activeProject ? activeProject.replace(/\[.*?\]/, "").trim() : "");
    if (!cleanName || cleanName.toLowerCase() === "undefined" || cleanName === "Project") {
      cleanName = matched?.name || "SANCTUARY HOUSE";
    }
    let location = matched?.location ? formatLocationStr(matched.location) : "KOTA JAKARTA TIMUR, DKI JAKARTA";
    let stage = matched?.stage && typeof matched.stage === "string" ? matched.stage : "Construction Phase";

    if (!matched && activeProject && activeProject.includes("[")) {
      const parts = activeProject.split("]");
      code = parts[0].replace("[", "").trim().toUpperCase();
      cleanName = parts[1]?.trim() || activeProject;
    }

    return { code, cleanName, location, stage };
  }, [activeProject, projectList]);

  // Handle Date Navigation (Guarded against Future Dates)
  const handleDateChange = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    
    // Prevent navigating past Today
    const checkDate = new Date(nextDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate > today) return;

    setSelectedDate(nextDate);
  };

  // Add Row Handler
  const handleAddRow = () => {
    if (isSelectedDateFuture) return;

    const lastRow = hourlyRows[hourlyRows.length - 1];
    let nextStart = "16.00";
    let nextEnd = "17.00";

    if (lastRow && lastRow.timeRange.includes("-")) {
      const parts = lastRow.timeRange.split("-");
      const endHour = parseInt(parts[1].trim().split(".")[0]);
      if (!isNaN(endHour)) {
        nextStart = `${String(endHour).padStart(2, "0")}.00`;
        nextEnd = `${String(endHour + 1).padStart(2, "0")}.00`;
      }
    }

    setHourlyRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        timeRange: `${nextStart} - ${nextEnd}`,
        condition: "Sunny",
        notes: "",
      },
    ]);
  };

  // Delete Row Handler
  const handleDeleteRow = (id: string) => {
    if (isSelectedDateFuture) return;
    setHourlyRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Row Change Handler
  const handleRowChange = (id: string, field: keyof HourlyWeatherRow, value: string) => {
    if (isSelectedDateFuture) return;
    setHourlyRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveData = () => {
    if (isSelectedDateFuture) return;
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab("preview");
    }, 1000);
  };

  const weatherOptions = ["Sunny", "Cloudy", "Rainy"];

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING EXACT CRW HEADER LAYOUT WITH EDIT DATA TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        {/* LEFT: Code -> Title */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">
            98 31 00
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            Daily Weather Log
          </h2>
        </div>

        {/* RIGHT: Standard Toggle Pill + Edit Data Toggle */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap pt-0.5">
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
              onClick={() => setActiveTab("edit")}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "edit"
                  ? "bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Data</span>
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
        </div>
      </div>

      {activeTab === "edit" ? (
        /* EDIT DATA FORM */
        <div className="space-y-6 animate-in fade-in duration-300 py-2 max-w-4xl mx-auto">
          {/* HEADER BAR FOR EDIT FORM */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              Editing Log Date:{" "}
              <span className="font-extrabold text-neutral-900 dark:text-white">
                {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </span>

            {!isSelectedDateFuture && (
              <button
                onClick={handleSaveData}
                disabled={saveSuccess}
                className={clsx(
                  "px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                  saveSuccess
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                )}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Weather Log</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* FUTURE DATE RESTRICTION BANNER */}
          {isSelectedDateFuture ? (
            <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>Weather Log Entry Restricted for Future Dates</span>
              </div>
              <p className="text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-300">
                Weather conditions cannot be logged or edited for future dates in advance. Please select Today or a past date to record site weather conditions.
              </p>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="mt-2 px-4 py-2 rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Switch to Today</span>
              </button>
            </div>
          ) : (
            <>
              {/* SITE WEATHER CONDITIONS CARD */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  Site Weather Conditions
                </div>

                <div className="space-y-3">
                  {hourlyRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      {/* 1. Time Range Input Pill */}
                      <input
                        type="text"
                        value={row.timeRange}
                        onChange={(e) => handleRowChange(row.id, "timeRange", e.target.value)}
                        className="w-36 shrink-0 px-4 py-2.5 rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-amber-400 transition-all shadow-2xs"
                        placeholder="08.00 - 09.00"
                      />

                      {/* 2. Weather Select Dropdown Pill */}
                      <div className="relative shrink-0 w-44">
                        <select
                          value={row.condition}
                          onChange={(e) => handleRowChange(row.id, "condition", e.target.value)}
                          className="w-full appearance-none px-4 py-2.5 pr-8 rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-amber-400 transition-all shadow-2xs cursor-pointer"
                        >
                          {weatherOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt === "Sunny" ? "Sunny / Cerah (C)" : opt === "Cloudy" ? "Cloudy / Berawan (B)" : "Rain / Hujan (H)"}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* 3. Optional Notes Input Pill */}
                      <input
                        type="text"
                        value={row.notes || ""}
                        onChange={(e) => handleRowChange(row.id, "notes", e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none focus:border-amber-400 transition-all shadow-2xs"
                        placeholder="Notes (optional)"
                      />

                      {/* 4. Trash Icon Button */}
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="p-2 rounded-full text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                        title="Delete weather row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Time Row Button */}
                <button
                  onClick={handleAddRow}
                  className="w-full py-3 rounded-full border border-amber-300/80 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-all cursor-pointer active:scale-98 shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Add Time Row</span>
                </button>
              </div>

              {/* SITE WEATHER OBSERVATIONS & NOTES */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-2">
                <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">
                  Site Weather Observations & Notes
                </label>
                <textarea
                  rows={3}
                  value={siteNotes}
                  onChange={(e) => setSiteNotes(e.target.value)}
                  placeholder="Additional notes regarding weather impact on site construction activities..."
                  className="w-full p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-900 dark:text-white outline-none leading-relaxed focus:border-amber-400 transition-all"
                />
              </div>
            </>
          )}
        </div>
      ) : activeTab === "related" ? (
        <div className="space-y-6 animate-in fade-in duration-300 py-2">
          <div className="space-y-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Related Links & Connected Data Sources</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Daftar modul pendukung yang terhubung secara langsung dengan pencatatan log cuaca proyek:
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 tracking-wider">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 px-4">Module Name</th>
                  <th className="py-2 px-4">Description</th>
                  <th className="py-2 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {[
                  { code: "98 35 00", name: "Weekly Weather Summary", description: "Rekapitulasi tren cuaca harian dan evaluasi jam kerja hilang akibat hujan.", nodeId: "98-35-00" },
                  { code: "98 38 00", name: "Monthly Weather Summary", description: "Laporan evaluasi efisiensi kerja bulanan terhadap faktor cuaca lokasi.", nodeId: "98-38-00" },
                  { code: "71 01 00", name: "DCR — Daily Construction Report", description: "Laporan harian utama yang merangkum kondisi cuaca dan aktivitas proyek.", nodeId: "71-01-00" },
                ].map((item) => (
                  <tr
                    key={item.code}
                    onClick={() => onSelectNode?.(item.nodeId)}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-mono font-bold tracking-tight whitespace-nowrap shrink-0 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top font-bold text-neutral-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 align-top text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-3.5 pl-4 align-top text-right whitespace-nowrap">
                      <button className="px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 border border-neutral-200 dark:border-neutral-700 group-hover:border-blue-300 transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs">
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
        <div className="space-y-4">
          {/* TOP CONTROLS: GLASSY PILL PROJECT & DATE SELECTORS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 print:hidden w-full">
            {/* Left: Project Glassy Selector Pill */}
            <div className="relative inline-flex items-center">
              <select
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="appearance-none rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-1.5 pr-8 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-all cursor-pointer outline-none focus:outline-none shadow-2xs"
              >
                {projectList.length > 0 ? (
                  projectList.map((p) => (
                    <option key={p.id} value={p.fullName} className="dark:bg-neutral-900">
                      {p.fullName}
                    </option>
                  ))
                ) : (
                  <option value={activeProject} className="dark:bg-neutral-900">
                    {activeProject}
                  </option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 pointer-events-none" />
            </div>

            {/* Right: Date Glassy Pill Selector & Quick Nav */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs">
                <span className="whitespace-nowrap">
                  {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              <button
                onClick={() => handleDateChange(1)}
                disabled={isSelectedDateToday || isSelectedDateFuture}
                className={clsx(
                  "p-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 transition-all shadow-2xs",
                  isSelectedDateToday || isSelectedDateFuture
                    ? "bg-neutral-100/40 dark:bg-neutral-900/40 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                    : "bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 cursor-pointer"
                )}
                title={isSelectedDateToday ? "Cannot navigate to future dates" : "Next day"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => window.print()}
                className="ml-1 px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer print:hidden whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* DOCUMENT PREVIEW VIEWPORT WITH CRW RESPONSIVE SCALE ENGINE */}
          <div ref={containerRef} className="w-full flex justify-center py-2">
            <div
              className="mx-auto relative transition-all duration-150 ease-out shrink-0"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
              }}
            >
              <div
                className="absolute top-0 left-0 flex flex-col gap-8 print:gap-0"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  className="bg-white text-neutral-900 shadow-2xl rounded-xs border border-neutral-300 select-none flex flex-col justify-between p-8 print:shadow-none print:p-0 print:border-none print:max-w-none"
                  style={{
                    width: "794px",
                    minWidth: "794px",
                    maxWidth: "794px",
                    height: "1123px",
                    minHeight: "1123px",
                    maxHeight: "1123px",
                    fontFamily: "Arial, sans-serif",
                    boxSizing: "border-box",
                  }}
                >
                  <div className="space-y-3">
                    {/* FULL HEADER BRANDING & RIK STAMP BOX */}
                    <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 pr-1">
                          <img
                            src="/logo-adidaya-red.svg"
                            alt="Adidaya"
                            className="h-8 w-auto object-contain filter brightness-0"
                          />
                        </div>
                        <div className="pl-4 border-l border-neutral-300">
                          <div className="text-[6px] font-bold text-neutral-400">Project</div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black rounded-sm leading-none shrink-0">
                              {projInfo.code}
                            </span>
                            <span className="font-extrabold text-[11px] text-neutral-900 tracking-tight leading-tight">
                              {projInfo.cleanName}
                            </span>
                          </div>
                          <div className="text-[6px] font-bold text-neutral-400 pt-1">Location</div>
                          <div className="text-[8px] font-semibold text-neutral-700 leading-tight">
                            {projInfo.location}
                          </div>
                          <div className="text-[6px] font-bold text-neutral-400 pt-1">Work Stage</div>
                          <div className="text-[7.5px] font-bold text-neutral-800 leading-tight">
                            {projInfo.stage}
                          </div>
                        </div>
                      </div>

                      {/* RIK Stamp Box */}
                      <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                        <div className="font-black text-[26px] text-neutral-900 leading-none tracking-tighter">
                          RIK
                        </div>
                        <div className="text-[5.5px] font-bold text-neutral-900 tracking-wider leading-tight pt-1">
                          Daily Weather Report
                        </div>
                        <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">
                          Weather & Shift Log
                        </div>
                        <div className="w-full border-t border-neutral-300 my-1" />
                        <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">
                          98 31 00
                        </div>
                        <div className="w-full border-t border-neutral-200 my-1" />
                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                          <span className="text-left font-bold">Log Date</span>
                          <span className="text-right font-bold">Rev</span>
                          <span className="text-left font-bold text-neutral-800">
                            {selectedDate.toLocaleDateString("en-GB")}
                          </span>
                          <span className="text-right font-bold text-neutral-800">00</span>
                        </div>
                      </div>
                    </div>

                    {/* META BAR */}
                    <div className="w-full border-y border-neutral-900 py-1.5 my-2">
                      <div className="grid grid-cols-4 text-center">
                        {[
                          { label: "Day", value: selectedDate.toLocaleDateString("en-US", { weekday: "long" }) },
                          { label: "Date", value: selectedDate.toLocaleDateString("en-GB") },
                          { label: "Total Logged Rows", value: `${hourlyRows.length} Time Slots` },
                          { label: "Primary Condition", value: hourlyRows[0]?.condition ? hourlyRows[0].condition : "Sunny / Clear" },
                        ].map((cell, i) => (
                          <div key={i} className="flex flex-col items-center justify-center">
                            <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider">
                              {cell.label}
                            </span>
                            <span className="text-[8.5px] font-bold text-neutral-900 leading-tight pt-0.5 truncate max-w-[150px]">
                              {cell.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TABLE BANNER & BILINGUAL HIGHLIGHTED 3-COLUMN WEATHER MATRIX TABLE */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-bold text-[7.5px] py-1 px-2 tracking-wider flex items-center justify-between">
                        <span>Daily Shift Weather Matrix Log</span>
                        <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded">
                          98 31 00
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "24%" }} />
                          <col style={{ width: "13%" }} />
                          <col style={{ width: "13%" }} />
                          <col style={{ width: "13%" }} />
                          <col style={{ width: "37%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-bold text-neutral-500">
                            <th rowSpan={2} className="p-1 pl-2 align-middle border-r border-neutral-200">
                              Time Slot / Range
                            </th>
                            <th colSpan={3} className="p-0.5 text-center border-r border-neutral-200 tracking-wider">
                              Weather Condition Matrix
                            </th>
                            <th rowSpan={2} className="p-1 pr-2 align-middle">
                              Remarks / Notes
                            </th>
                          </tr>
                          <tr className="bg-neutral-100 border-b border-neutral-300 text-[5.5px] font-bold text-center">
                            <th className="p-0.5 border-r border-neutral-200 text-amber-900 bg-amber-100/90 font-bold">
                              Sunny / Cerah (C)
                            </th>
                            <th className="p-0.5 border-r border-neutral-200 text-slate-900 bg-slate-200 font-bold">
                              Cloudy / Berawan (B)
                            </th>
                            <th className="p-0.5 border-r border-neutral-200 text-blue-950 bg-blue-100/90 font-bold">
                              Rain / Hujan (H)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                          {hourlyRows.map((row, idx) => {
                            const isSunny = row.condition === "Sunny" || row.condition === "Cerah";
                            const isCloudy = row.condition === "Cloudy" || row.condition === "Berawan";
                            const isRainy = row.condition === "Rainy" || row.condition === "Rain" || row.condition.includes("Rain") || row.condition.includes("Hujan");

                            return (
                              <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50/60">
                                <td className="p-1 pl-2 font-bold text-neutral-900 font-mono border-r border-neutral-200">
                                  {row.timeRange}
                                </td>

                                {/* SUNNY (C) - Full Cell Highlight */}
                                <td
                                  className={clsx(
                                    "p-1 text-center font-bold text-[8px] border-r border-neutral-200 transition-colors",
                                    isSunny ? "bg-amber-100/90 text-amber-950" : "bg-white text-neutral-300 font-normal"
                                  )}
                                >
                                  {isSunny ? "C" : "-"}
                                </td>

                                {/* CLOUDY (B) - Full Cell Highlight */}
                                <td
                                  className={clsx(
                                    "p-1 text-center font-bold text-[8px] border-r border-neutral-200 transition-colors",
                                    isCloudy ? "bg-slate-200 text-slate-950" : "bg-white text-neutral-300 font-normal"
                                  )}
                                >
                                  {isCloudy ? "B" : "-"}
                                </td>

                                {/* RAINY (H) - Full Cell Highlight */}
                                <td
                                  className={clsx(
                                    "p-1 text-center font-bold text-[8px] border-r border-neutral-200 transition-colors",
                                    isRainy ? "bg-blue-100/90 text-blue-950" : "bg-white text-neutral-300 font-normal"
                                  )}
                                >
                                  {isRainy ? "H" : "-"}
                                </td>

                                <td className="p-1 pr-2 font-medium text-neutral-700">
                                  {row.notes && row.notes.trim() !== "" ? row.notes : "-"}
                                </td>
                              </tr>
                            );
                          })}

                          {/* TOTAL HOURLY SUMMARY ROW */}
                          <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-900 text-[6.5px]">
                            <td className="p-1 pl-2 text-neutral-900 border-r border-neutral-200 font-bold">
                              Total Hours
                            </td>
                            <td className="p-1 text-center font-bold bg-amber-100/90 text-amber-950 border-r border-neutral-200">
                              {weatherTotals.sunny.toFixed(1)} hrs
                            </td>
                            <td className="p-1 text-center font-bold bg-slate-200 text-slate-950 border-r border-neutral-200">
                              {weatherTotals.cloudy.toFixed(1)} hrs
                            </td>
                            <td className="p-1 text-center font-bold bg-blue-100/90 text-blue-950 border-r border-neutral-200">
                              {weatherTotals.rainy.toFixed(1)} hrs
                            </td>
                            <td className="p-1 pr-2 text-neutral-900 font-bold">
                              Total {weatherTotals.total.toFixed(1)} Hours Logged
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* NOTES & SITE OBSERVATIONS BOX */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-bold text-[7.5px] py-1 px-2 tracking-wider">
                        Daily Weather Observations & Site Impact
                      </div>
                      <div className="p-2 text-[7px] text-neutral-800 min-h-[40px] font-medium leading-relaxed">
                        {siteNotes}
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                    <span>Adidaya Studio | Daily Weather Report</span>
                    <span>RIK 98 31 00 | Page 1 of 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
