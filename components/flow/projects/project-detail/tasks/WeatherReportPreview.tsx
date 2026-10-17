"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Edit,
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface WeatherReportPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}

export default function WeatherReportPreview({
  isProjectDetail = false,
  projectName,
  onSelectNode,
}: WeatherReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date("2026-08-23"));
  const [scale, setScale] = useState<number>(1);
  const [activeProject, setActiveProject] = useState<string>(projectName || "PROJECT SANCTUARY HOUSE");
  const [projectList, setProjectList] = useState<any[]>([]);

  // Load project list for dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const wsId = await fetchDefaultWorkspaceId();
        const projs = await fetchProjectsByWorkspace(wsId);
        if (projs && projs.length > 0) {
          const mapped = projs.map((p) => {
            const cleanCode = p.code ? p.code.replace("[", "").replace("]", "").trim() : "PROJ";
            return {
              id: p.id,
              code: p.code || `[${cleanCode}]`,
              cleanCode,
              name: p.name,
              fullName: `[${cleanCode}] ${p.name}`,
              location: p.location || "BSD City, Tangerang",
              stage: p.stage || "Construction Phase",
            };
          });
          setProjectList(mapped);
          if (!projectName) {
            setActiveProject(mapped[0].fullName);
          }
        }
      } catch (err) {
        console.error("Error loading projects in WeatherReportPreview:", err);
      }
    }
    loadProjects();
  }, [projectName]);

  const formatLocationStr = (locStr: any) => {
    if (!locStr) return "—";
    if (typeof locStr === "object") {
      const parts = [locStr.city, locStr.province, locStr.country].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "—";
    }
    return String(locStr);
  };

  // Resolve active project metadata
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
    let cleanName = matched?.name || (activeProject ? activeProject.replace(/\[.*?\]/, "").trim() : "Project");
    let location = matched?.location ? formatLocationStr(matched.location) : "BSD City, Tangerang";
    let stage = matched?.stage && typeof matched.stage === "string" ? matched.stage : "Construction Phase";

    if (!matched && activeProject && activeProject.includes("[")) {
      const parts = activeProject.split("]");
      code = parts[0].replace("[", "").trim().toUpperCase();
      cleanName = parts[1]?.trim() || activeProject;
    }

    return { code, cleanName, location, stage };
  }, [activeProject, projectList]);

  const handleDateChange = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  // Mock / Real Weather Slots for selected date
  const weatherSlots = useMemo(() => {
    return [
      {
        timeSlot: "08.00 - 12.00 (Morning Shift)",
        condition: "Sunny / Clear",
        icon: "☀️",
        temp: "29°C - 32°C",
        rainfall: "0.0 mm",
        duration: "4.0 Hours",
        impact: "Normal Construction Operations",
        status: "OPTIMAL",
      },
      {
        timeSlot: "12.00 - 16.00 (Afternoon Shift)",
        condition: "Partly Cloudy",
        icon: "⛅",
        temp: "31°C - 33°C",
        rainfall: "0.0 mm",
        duration: "4.0 Hours",
        impact: "Normal Construction Operations",
        status: "OPTIMAL",
      },
      {
        timeSlot: "16.00 - 18.00 (Overtime Shift 1)",
        condition: "Light Rain / Drizzle",
        icon: "🌧️",
        temp: "27°C - 28°C",
        rainfall: "3.5 mm",
        duration: "2.0 Hours",
        impact: "Minor Outdoor Delay; Indoor Activities Continued",
        status: "MINOR_IMPACT",
      },
      {
        timeSlot: "18.00 - 22.00 (Overtime Shift 2)",
        condition: "Cloudy / Overcast",
        icon: "☁️",
        temp: "26°C - 27°C",
        rainfall: "0.5 mm",
        duration: "4.0 Hours",
        impact: "Formwork & Rebar Prep Continued Normally",
        status: "OPTIMAL",
      },
    ];
  }, [selectedDate]);

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
      {/* HEADER BAR */}
      <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-800/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 font-mono tracking-wide">
              98 30 00
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
              WEATHER & CLIMATE LOG
            </span>
          </div>
          <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-500" />
            Weather & Climate Report
          </h1>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("preview")}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "preview"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Document Preview
          </button>
          <button
            onClick={() => setActiveTab("related")}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "related"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Related Links
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="p-4 sm:p-6">
        {activeTab === "related" ? (
          /* RELATED LINKS TAB */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>Connected Data Sources & Related Modules</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="py-2 pr-4">CODE</th>
                    <th className="py-2 px-4">MODULE NAME</th>
                    <th className="py-2 px-4">DESCRIPTION</th>
                    <th className="py-2 pl-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {[
                    {
                      code: "71 01 00",
                      name: "DCR — Daily Construction Report",
                      description: "Master daily report summarizing overall site progress, weather, crew, and logistics.",
                      nodeId: "71-01-00",
                    },
                    {
                      code: "98 10 00",
                      name: "Risk Log",
                      description: "Log of identified construction risks and mitigation plans due to site conditions.",
                      nodeId: "98-10-00",
                    },
                    {
                      code: "98 20 00",
                      name: "Issue Log",
                      description: "Log of active site issues, delay records, and schedule impact resolutions.",
                      nodeId: "98-20-00",
                    },
                    {
                      code: "41 02 00",
                      name: "WBS Work Activities",
                      description: "Source list of daily work items affected by weather conditions.",
                      nodeId: "41-02-00",
                    },
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
                        <button className="px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 border border-neutral-200 dark:border-neutral-700 group-hover:border-blue-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs">
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
          /* DOCUMENT PREVIEW MODE */
          <div className="space-y-4 w-full">
            {/* TOP CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 print:hidden w-full">
              {/* Project Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={activeProject}
                  onChange={(e) => setActiveProject(e.target.value)}
                  className="appearance-none rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-1.5 pr-8 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-all cursor-pointer outline-none focus:outline-none shadow-2xs"
                >
                  {projectList.length > 0 ? (
                    projectList.map((p) => (
                      <option key={p.id} value={p.fullName}>
                        {p.fullName}
                      </option>
                    ))
                  ) : (
                    <option value={activeProject}>{activeProject}</option>
                  )}
                </select>
                <div className="pointer-events-none absolute right-3 flex items-center text-neutral-400">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              {/* Date Pill Changer */}
              <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 p-1 shadow-2xs">
                <button
                  onClick={() => handleDateChange(-1)}
                  className="p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {selectedDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleDateChange(1)}
                  className="p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* A4 CANVAS CONTAINER */}
            <div className="w-full overflow-x-auto flex justify-center py-4 bg-neutral-200/50 dark:bg-neutral-950/60 rounded-xl">
              <div
                style={{
                  width: `${displayWidth}px`,
                  minHeight: `${displayHeight}px`,
                  transformOrigin: "top center",
                }}
                className="bg-white text-neutral-900 shadow-xl border border-neutral-300 rounded-sm p-6 flex flex-col justify-between select-none relative font-sans"
              >
                {/* PAPER HEADER */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <img
                          src="/logo-adidaya-red.svg"
                          alt="Adidaya"
                          className="h-8 w-auto object-contain filter brightness-0"
                        />
                      </div>
                      <div className="pl-4 border-l border-neutral-300 space-y-0.5 pt-1">
                        <div className="text-[6px] font-bold text-neutral-400 tracking-widest uppercase">PROJECT</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded-sm leading-none shrink-0">
                            {projInfo.code}
                          </span>
                          <span className="font-extrabold text-[11px] text-neutral-900 tracking-tight leading-tight uppercase">
                            {projInfo.cleanName}
                          </span>
                        </div>
                        <div className="text-[6px] font-bold text-neutral-400 tracking-widest uppercase pt-1">LOCATION</div>
                        <div className="text-[8px] font-semibold text-neutral-700 leading-tight uppercase">
                          {projInfo.location}
                        </div>
                      </div>
                    </div>

                    {/* Stamp Box */}
                    <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                      <div className="font-black text-[22px] text-neutral-900 leading-none tracking-tighter">WCL</div>
                      <div className="text-[6px] font-black text-neutral-900 tracking-wider leading-tight uppercase pt-1">
                        Weather & Climate Log
                      </div>
                      <div className="w-full border-t border-neutral-300 my-1" />
                      <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">98 30 00</div>
                      <div className="w-full border-t border-neutral-200 my-1" />
                      <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                        <span className="text-left font-bold uppercase">Report Date</span>
                        <span className="text-right font-bold uppercase">Rev</span>
                        <span className="text-left font-black text-neutral-800">
                          {selectedDate.toLocaleDateString("en-GB")}
                        </span>
                        <span className="text-right font-black text-neutral-800">00</span>
                      </div>
                    </div>
                  </div>

                  {/* META SUMMARY BAR */}
                  <div className="w-full border-y border-neutral-900 py-1.5 my-1.5">
                    <div className="grid grid-cols-4 text-center">
                      {[
                        { label: "Day", value: selectedDate.toLocaleDateString("en-US", { weekday: "long" }) },
                        { label: "Date", value: selectedDate.toLocaleDateString("en-GB") },
                        { label: "Primary Condition", value: "Sunny / Part-Cloudy" },
                        { label: "Effective Work Duration", value: "8.0 Hours" },
                      ].map((cell, i) => (
                        <div key={i} className="flex flex-col items-center justify-center">
                          <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider uppercase">
                            {cell.label}
                          </span>
                          <span className="text-[8.5px] font-bold text-neutral-900 leading-tight pt-0.5">
                            {cell.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WEATHER BREAKDOWN TABLE */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-2">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                      <span className="truncate">WEATHER & SITE CLIMATE BREAKDOWN</span>
                      <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                        98 30 00
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: "24%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "22%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                          <th className="p-1 pl-2">SHIFT / TIME SLOT</th>
                          <th className="p-1">CONDITION</th>
                          <th className="p-1 text-center">TEMP (°C)</th>
                          <th className="p-1 text-center">RAINFALL</th>
                          <th className="p-1 text-center">DURATION</th>
                          <th className="p-1 pr-2">SITE WORK IMPACT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                        {weatherSlots.map((s, idx) => (
                          <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50/60">
                            <td className="p-1 pl-2 font-bold text-neutral-900">{s.timeSlot}</td>
                            <td className="p-1 font-extrabold text-neutral-800 flex items-center gap-1">
                              <span>{s.icon}</span>
                              <span>{s.condition}</span>
                            </td>
                            <td className="p-1 text-center font-mono font-bold text-neutral-700">{s.temp}</td>
                            <td className="p-1 text-center font-mono font-bold text-neutral-700">{s.rainfall}</td>
                            <td className="p-1 text-center font-mono font-bold text-neutral-900">{s.duration}</td>
                            <td className="p-1 pr-2 font-medium text-neutral-700">{s.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* NOTES & WEATHER IMPACT SUMMARY */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-3">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider">
                      WEATHER IMPACT & SITE OBSERVATIONS
                    </div>
                    <div className="p-2 text-[7px] text-neutral-800 min-h-[45px] font-medium leading-relaxed">
                      Weather conditions remained optimal during regular morning and afternoon shifts allowing 100% scheduled concrete pouring and rebar assembly. Light drizzle occurred during overtime shift 1 (16:00 - 18:00) with minor outdoor interruption; indoor formwork prep proceeded normally.
                    </div>
                  </div>
                </div>

                {/* PAPER FOOTER */}
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider mt-6">
                  <span>Adidaya Studio | Weather & Climate Report</span>
                  <span>WCL 98 30 00 | 1/1</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
