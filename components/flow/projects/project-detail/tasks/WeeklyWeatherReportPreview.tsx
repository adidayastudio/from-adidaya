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
  AlertCircle,
  Clock,
  RefreshCw,
  Sparkles,
  Lock,
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface HourlyWeeklyMatrixRow {
  hour: number;
  sun: "C" | "B" | "H" | "-";
  mon: "C" | "B" | "H" | "-";
  tue: "C" | "B" | "H" | "-";
  wed: "C" | "B" | "H" | "-";
  thu: "C" | "B" | "H" | "-";
  fri: "C" | "B" | "H" | "-";
  sat: "C" | "B" | "H" | "-";
  remarks?: string;
}

interface WeeklyWeatherReportPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}

export default function WeeklyWeatherReportPreview({
  isProjectDetail = false,
  projectName,
  onSelectNode,
}: WeeklyWeatherReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isOverridden, setIsOverridden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Today helper (Base date: Monday 17 Aug 2026)
  const today = useMemo(() => {
    const d = new Date("2026-08-17");
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Compute dynamic 7 dates based on weekOffset (Sunday of current week = 16 Aug 2026)
  // Standard week: Sunday (Minggu) to Saturday (Sabtu)
  const weekDates = useMemo(() => {
    const baseSun = new Date("2026-08-16");
    baseSun.setDate(baseSun.getDate() + weekOffset * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseSun);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  const periodStr = useMemo(() => {
    if (weekDates.length < 7) return "16 Aug – 22 Aug 2026";
    const start = weekDates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const end = weekDates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${start} – ${end}`;
  }, [weekDates]);

  // Default initial generator:
  // Sun (16 Aug) & Mon (17 Aug = Today) have active logs!
  // Tue..Sat (18..22 Aug = Future) default to "-"!
  const generateDefaultMatrix = (): HourlyWeeklyMatrixRow[] => {
    const defaultRows: HourlyWeeklyMatrixRow[] = [];
    for (let h = 1; h <= 24; h++) {
      let sunCond: "C" | "B" | "H" = "C";
      let monCond: "C" | "B" | "H" = "C";

      if (h <= 7) {
        sunCond = "C";
        monCond = "H";
      } else if (h >= 8 && h <= 16) {
        sunCond = "C";
        monCond = "C";
      } else if (h >= 17 && h <= 20) {
        sunCond = "B";
        monCond = "B";
      } else {
        sunCond = "B";
        monCond = "H";
      }

      defaultRows.push({
        hour: h,
        sun: sunCond,
        mon: monCond,
        tue: "-",
        wed: "-",
        thu: "-",
        fri: "-",
        sat: "-",
        remarks: h === 15 ? "1hr delay (Mon)" : "",
      });
    }
    return defaultRows;
  };

  const [hourlyMatrix, setHourlyMatrix] = useState<HourlyWeeklyMatrixRow[]>(generateDefaultMatrix);

  const [weeklyNotes, setWeeklyNotes] = useState(
    "Weather log for Sunday 16 Aug & Monday 17 Aug (Today) recorded optimal site conditions with 9 sunny hours on Monday. Future days (18 - 22 Aug) remain unlogged until site observation occurs."
  );

  // Totals per day & weekly totals (Future days with "-" count as 0)
  const dayTotals = useMemo(() => {
    const days: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[] = [
      "sun", "mon", "tue", "wed", "thu", "fri", "sat"
    ];

    const sunnyCounts = days.map((d, idx) => {
      const dateObj = weekDates[idx];
      if (dateObj && dateObj.getTime() > today.getTime()) return 0;
      return hourlyMatrix.filter(r => r[d] === "C").length;
    });

    const cloudyCounts = days.map((d, idx) => {
      const dateObj = weekDates[idx];
      if (dateObj && dateObj.getTime() > today.getTime()) return 0;
      return hourlyMatrix.filter(r => r[d] === "B").length;
    });

    const rainyCounts = days.map((d, idx) => {
      const dateObj = weekDates[idx];
      if (dateObj && dateObj.getTime() > today.getTime()) return 0;
      return hourlyMatrix.filter(r => r[d] === "H").length;
    });

    const totalSunny = sunnyCounts.reduce((a, b) => a + b, 0);
    const totalCloudy = cloudyCounts.reduce((a, b) => a + b, 0);
    const totalRainy = rainyCounts.reduce((a, b) => a + b, 0);

    return {
      sunnyCounts,
      cloudyCounts,
      rainyCounts,
      totalSunny,
      totalCloudy,
      totalRainy,
      grandTotal: totalSunny + totalCloudy + totalRainy
    };
  }, [hourlyMatrix, weekDates, today]);

  // Dynamic A4 Scale Engine
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

  const handleCellChange = (
    hourIndex: number,
    day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
    val: "C" | "B" | "H" | "-"
  ) => {
    setIsOverridden(true);
    setHourlyMatrix((prev) => {
      const copy = [...prev];
      copy[hourIndex] = { ...copy[hourIndex], [day]: val };
      return copy;
    });
  };

  const handleResyncDaily = () => {
    setHourlyMatrix(generateDefaultMatrix());
    setIsOverridden(false);
  };

  const handleSaveData = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab("preview");
    }, 1000);
  };

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  // Standard Week Order: Sunday (Minggu) -> Saturday (Sabtu)
  const dayHeaders = useMemo(() => {
    const daysMeta = [
      { key: "sun", en: "Sun", id: "Minggu" },
      { key: "mon", en: "Mon", id: "Senin" },
      { key: "tue", en: "Tue", id: "Selasa" },
      { key: "wed", en: "Wed", id: "Rabu" },
      { key: "thu", en: "Thu", id: "Kamis" },
      { key: "fri", en: "Fri", id: "Jumat" },
      { key: "sat", en: "Sat", id: "Sabtu" },
    ];

    return daysMeta.map((d, i) => {
      const dateObj = weekDates[i];
      const dayNum = dateObj ? dateObj.getDate() : i + 1;
      const monthShort = dateObj ? dateObj.toLocaleDateString("en-GB", { month: "short" }) : "Aug";
      const isFuture = dateObj ? dateObj.getTime() > today.getTime() : false;
      const isToday = dateObj ? dateObj.getTime() === today.getTime() : false;

      return {
        ...d,
        dateFormatted: `${dayNum} ${monthShort}`,
        fullLabel: `${d.en} / ${d.id}`,
        isFuture,
        isToday,
      };
    });
  }, [weekDates, today]);

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING EXACT CRW HEADER LAYOUT WITH EDIT DATA TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        {/* LEFT: Code -> Title */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">
            98 35 00
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            Weekly Weather Summary
          </h2>
        </div>

        {/* RIGHT: Standard Toggle Pill */}
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
        /* EDIT DATA FORM FOR WEEKLY WEATHER MATRIX WITH SUNDAY-SATURDAY ORDER & TODAY ENABLED */
        <div className="space-y-6 animate-in fade-in duration-300 py-2 max-w-5xl mx-auto">
          {/* TOP AUTO-SYNC & OVERRIDE BANNER */}
          <div className="p-4 rounded-3xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <span>Auto-Synced from Daily Weather Logs (98 31 00)</span>
                  {isOverridden && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Manual Override Active
                    </span>
                  )}
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-[11px]">
                  Minggu berawal dari Minggu (16 Aug) s/d Sabtu (22 Aug). Hari ini (Senin 17 Aug) & tanggal lalu aktif diisi. Tanggal esok (18 – 22 Aug) otomatis disabled (abu-abu).
                </p>
              </div>
            </div>

            {isOverridden && (
              <button
                onClick={handleResyncDaily}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold text-xs hover:bg-blue-50 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-sync Daily Logs</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span>Edit Matriks Cuaca Mingguan / Weekly Weather Matrix</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Input log cuaca Minggu ke Sabtu ({periodStr}). Hari ini (Senin 17 Aug) 100% aktif.
              </p>
            </div>
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
                  <span>Save Weekly Log</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 overflow-x-auto space-y-4">
            <div className="text-[11px] font-bold text-neutral-500 tracking-wider flex items-center justify-between">
              <span>Input Matriks Cuaca 24 Jam ({periodStr})</span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3 text-neutral-400" />
                Future dates (18-22 Aug) are disabled & locked
              </span>
            </div>
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-extrabold text-[10px]">
                  <th className="py-2 px-1 border border-neutral-200 dark:border-neutral-700">Hour</th>
                  {dayHeaders.map((dh) => (
                    <th
                      key={dh.key}
                      className={clsx(
                        "py-2 px-1 border border-neutral-200 dark:border-neutral-700 transition-colors",
                        dh.isToday && "bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-black ring-2 ring-amber-400/50",
                        !dh.isToday && !dh.isFuture && "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-extrabold",
                        dh.isFuture && "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-400 dark:text-neutral-500 font-semibold"
                      )}
                    >
                      {dh.fullLabel}<br/>({dh.dateFormatted})
                      {dh.isToday && <div className="text-[7.5px] text-amber-700 dark:text-amber-300 font-black uppercase pt-0.5">Today</div>}
                      {dh.isFuture && <div className="text-[7.5px] text-neutral-400 dark:text-neutral-500 font-bold uppercase pt-0.5">Disabled</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hourlyMatrix.map((row, idx) => (
                  <tr key={row.hour} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-1 px-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800">
                      {row.hour}
                    </td>
                    {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const).map((dayKey, dIdx) => {
                      const isFuture = dayHeaders[dIdx]?.isFuture;

                      return (
                        <td key={dayKey} className="p-0.5 border border-neutral-200 dark:border-neutral-800">
                          {isFuture ? (
                            <select
                              disabled
                              className="w-full py-1 text-center font-bold text-xs rounded bg-neutral-100 dark:bg-neutral-800/90 text-neutral-400 dark:text-neutral-600 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed appearance-none"
                            >
                              <option value="-">-</option>
                            </select>
                          ) : (
                            <select
                              value={row[dayKey]}
                              onChange={(e) => handleCellChange(idx, dayKey, e.target.value as "C" | "B" | "H" | "-")}
                              className={clsx(
                                "w-full py-1 text-center font-black text-xs rounded outline-none cursor-pointer transition-all",
                                row[dayKey] === "C" && "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200",
                                row[dayKey] === "B" && "bg-slate-200 text-slate-950 dark:bg-slate-800 dark:text-slate-200",
                                row[dayKey] === "H" && "bg-blue-100 text-blue-950 dark:bg-blue-900/60 dark:text-blue-200",
                                row[dayKey] === "-" && "bg-white text-neutral-300"
                              )}
                            >
                              <option value="C">C (Sunny/Cerah)</option>
                              <option value="B">B (Cloudy/Berawan)</option>
                              <option value="H">H (Rain/Hujan)</option>
                            </select>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 space-y-2">
            <label className="text-[11px] font-bold text-neutral-500 tracking-wider block">
              Weekly Weather Evaluation & Site Summary Notes
            </label>
            <textarea
              rows={3}
              value={weeklyNotes}
              onChange={(e) => setWeeklyNotes(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-900 dark:text-white outline-none leading-relaxed focus:border-amber-400"
            />
          </div>
        </div>
      ) : activeTab === "related" ? (
        <div className="space-y-6 animate-in fade-in duration-300 py-2">
          <div className="space-y-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Related Links & Connected Data Sources</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Daftar modul pendukung yang terhubung secara langsung dengan pencatatan log cuaca mingguan:
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
                  { code: "98 31 00", name: "Daily Weather Log", description: "Laporan harian rincian cuaca per shift.", nodeId: "98-31-00" },
                  { code: "98 38 00", name: "Monthly Weather Summary", description: "Laporan evaluasi efisiensi kerja bulanan terhadap faktor cuaca.", nodeId: "98-38-00" },
                  { code: "71 01 00", name: "DCR — Daily Construction Report", description: "Laporan harian utama proyek.", nodeId: "71-01-00" },
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
          {/* TOP CONTROLS: GLASSY PILL PROJECT & WEEK SELECTORS */}
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

            {/* Right: Week Glassy Pill Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs">
                <span className="whitespace-nowrap">Week {34 + weekOffset}: {periodStr}</span>
              </div>

              <button
                onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={weekOffset >= 0}
                className={clsx(
                  "p-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 transition-all shadow-2xs",
                  weekOffset >= 0
                    ? "bg-neutral-100/40 dark:bg-neutral-900/40 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                    : "bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 cursor-pointer"
                )}
                title={weekOffset >= 0 ? "Cannot navigate to future weeks" : "Next week"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
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
                          Weekly Weather Report
                        </div>
                        <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">
                          Weekly Weather Matrix
                        </div>
                        <div className="w-full border-t border-neutral-300 my-1" />
                        <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">
                          98 35 00
                        </div>
                        <div className="w-full border-t border-neutral-200 my-1" />
                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                          <span className="text-left font-bold">Week No</span>
                          <span className="text-right font-bold">Rev</span>
                          <span className="text-left font-bold text-neutral-800">W-{34 + weekOffset}</span>
                          <span className="text-right font-bold text-neutral-800">00</span>
                        </div>
                      </div>
                    </div>

                    {/* META BAR */}
                    <div className="w-full border-y border-neutral-900 py-1.5 my-2">
                      <div className="grid grid-cols-4 text-center">
                        {[
                          { label: "Period", value: periodStr },
                          { label: "Total Sunny Hours", value: `${dayTotals.totalSunny} Hours` },
                          { label: "Total Rainy Hours", value: `${dayTotals.totalRainy} Hours` },
                          { label: "Work Efficiency", value: `${((dayTotals.totalSunny / (24 * 7)) * 100).toFixed(1)}%` },
                        ].map((cell, i) => (
                          <div key={i} className="flex flex-col items-center justify-center">
                            <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider">
                              {cell.label}
                            </span>
                            <span className="text-[8.5px] font-bold text-neutral-900 leading-tight pt-0.5">
                              {cell.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BILINGUAL 24-HOUR WEEKLY MATRIX TABLE WITH SUNDAY TO SATURDAY ORDER */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-bold text-[7.5px] py-1 px-2 tracking-wider flex items-center justify-between">
                        <span>Weekly Weather Matrix / Laporan Cuaca Mingguan</span>
                        <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded">
                          98 35 00
                        </span>
                      </div>
                      <table className="w-full text-center text-xs border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "8%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "22%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-300 text-[5.5px] font-bold text-neutral-600">
                            <th className="p-0.5 border-r border-neutral-200">Hour / Jam</th>
                            {dayHeaders.map((dh) => (
                              <th
                                key={dh.key}
                                className={clsx(
                                  "p-0.5 border-r border-neutral-200 transition-colors",
                                  dh.isToday && "bg-amber-100 text-amber-950 font-black",
                                  dh.isFuture && "bg-neutral-100/60 text-neutral-400"
                                )}
                              >
                                {dh.fullLabel}<br/>
                                <span className="font-bold text-[6px] text-neutral-900">{dh.dateFormatted}</span>
                                {dh.isToday && <span className="block text-[5px] text-amber-700 font-extrabold uppercase">Today</span>}
                              </th>
                            ))}
                            <th className="p-0.5 text-center">Remarks / Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                          {hourlyMatrix.map((row) => (
                            <tr key={row.hour} className="border-b border-neutral-200">
                              <td className="p-0.5 font-bold text-neutral-900 font-mono border-r border-neutral-200">
                                {row.hour}
                              </td>

                              {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const).map((dayKey, dIdx) => {
                                const isFuture = dayHeaders[dIdx]?.isFuture;
                                const val = isFuture ? "-" : row[dayKey];

                                const isC = val === "C";
                                const isB = val === "B";
                                const isH = val === "H";

                                return (
                                  <td
                                    key={dayKey}
                                    className={clsx(
                                      "p-0.5 text-center font-bold text-[7px] border-r border-neutral-200 transition-colors",
                                      isC && "bg-amber-100/90 text-amber-950",
                                      isB && "bg-slate-200 text-slate-950",
                                      isH && "bg-blue-100/90 text-blue-950",
                                      isFuture && "bg-neutral-100/40 text-neutral-300 font-normal",
                                      (!isC && !isB && !isH && !isFuture) && "bg-white text-neutral-300 font-normal"
                                    )}
                                  >
                                    {val}
                                  </td>
                                );
                              })}

                              <td className="p-0.5 text-left font-medium text-neutral-700 pl-1">
                                {row.remarks || "-"}
                              </td>
                            </tr>
                          ))}

                          {/* TOTAL SUMMARY ROWS MATCHING USER SCREENSHOT */}
                          {/* SUNNY / CERAH C */}
                          <tr className="bg-amber-50 font-bold border-t-2 border-neutral-900 text-[6.5px]">
                            <td className="p-0.5 font-bold text-amber-950 border-r border-neutral-200 text-left pl-1">
                              Cerah (C)
                            </td>
                            {dayTotals.sunnyCounts.map((cnt, i) => {
                              const isFuture = dayHeaders[i]?.isFuture;
                              return (
                                <td key={i} className="p-0.5 font-bold text-amber-950 border-r border-neutral-200">
                                  {isFuture ? "-" : cnt}
                                </td>
                              );
                            })}
                            <td className="p-0.5 font-bold text-amber-950">
                              {dayTotals.totalSunny}
                            </td>
                          </tr>

                          {/* CLOUDY / BERAWAN B */}
                          <tr className="bg-slate-100 font-bold border-t border-neutral-300 text-[6.5px]">
                            <td className="p-0.5 font-bold text-slate-950 border-r border-neutral-200 text-left pl-1">
                              Berawan (B)
                            </td>
                            {dayTotals.cloudyCounts.map((cnt, i) => {
                              const isFuture = dayHeaders[i]?.isFuture;
                              return (
                                <td key={i} className="p-0.5 font-bold text-slate-950 border-r border-neutral-200">
                                  {isFuture ? "-" : cnt}
                                </td>
                              );
                            })}
                            <td className="p-0.5 font-bold text-slate-950">
                              {dayTotals.totalCloudy}
                            </td>
                          </tr>

                          {/* RAIN / HUJAN H */}
                          <tr className="bg-blue-50 font-bold border-t border-neutral-300 text-[6.5px]">
                            <td className="p-0.5 font-bold text-blue-950 border-r border-neutral-200 text-left pl-1">
                              Hujan (H)
                            </td>
                            {dayTotals.rainyCounts.map((cnt, i) => {
                              const isFuture = dayHeaders[i]?.isFuture;
                              return (
                                <td key={i} className="p-0.5 font-bold text-blue-950 border-r border-neutral-200">
                                  {isFuture ? "-" : cnt}
                                </td>
                              );
                            })}
                            <td className="p-0.5 font-bold text-blue-950">
                              {dayTotals.totalRainy}
                            </td>
                          </tr>

                          {/* TOTAL */}
                          <tr className="bg-neutral-900 text-white font-bold border-t border-neutral-900 text-[7px]">
                            <td className="p-0.5 font-bold border-r border-neutral-700 text-left pl-1">
                              Total
                            </td>
                            {dayHeaders.map((dh, i) => (
                              <td key={i} className="p-0.5 font-bold border-r border-neutral-700">
                                {dh.isFuture ? "-" : 24}
                              </td>
                            ))}
                            <td className="p-0.5 font-bold text-amber-300">
                              {dayTotals.grandTotal}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* WEEKLY SUMMARY NOTES BOX */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-bold text-[7.5px] py-1 px-2 tracking-wider">
                        Weekly Weather Evaluation & Site Summary
                      </div>
                      <div className="p-2 text-[7px] text-neutral-800 min-h-[35px] font-medium leading-relaxed">
                        {weeklyNotes}
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                    <span>Adidaya Studio | Weekly Weather Report</span>
                    <span>RIK 98 35 00 | Page 1 of 1</span>
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
