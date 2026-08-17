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
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

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
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Load real workspace projects from DB (Identical to CRW)
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

  const weeklyData = useMemo(() => {
    return [
      { day: "Monday", date: "17 Aug 2026", condition: "Sunny / Clear ☀️", temp: "28°C - 33°C", rainfall: "0.0 mm", rainyHours: 0, workHours: 8, impact: "Optimal Construction Progress" },
      { day: "Tuesday", date: "18 Aug 2026", condition: "Partly Cloudy ⛅", temp: "29°C - 32°C", rainfall: "0.0 mm", rainyHours: 0, workHours: 8, impact: "Optimal Construction Progress" },
      { day: "Wednesday", date: "19 Aug 2026", condition: "Light Rain 🌧️", temp: "26°C - 29°C", rainfall: "12.5 mm", rainyHours: 1.5, workHours: 6.5, impact: "Outdoor Pouring Delayed 1.5 Hours" },
      { day: "Thursday", date: "20 Aug 2026", condition: "Sunny / Clear ☀️", temp: "30°C - 34°C", rainfall: "0.0 mm", rainyHours: 0, workHours: 8, impact: "Optimal Construction Progress" },
      { day: "Friday", date: "21 Aug 2026", condition: "Cloudy / Overcast ☁️", temp: "27°C - 30°C", rainfall: "2.0 mm", rainyHours: 0.5, workHours: 7.5, impact: "Minor Interruption; Indoor Work Continued" },
      { day: "Saturday", date: "22 Aug 2026", condition: "Sunny / Clear ☀️", temp: "29°C - 33°C", rainfall: "0.0 mm", rainyHours: 0, workHours: 8, impact: "Optimal Construction Progress" },
      { day: "Sunday", date: "23 Aug 2026", condition: "Partly Cloudy ⛅", temp: "28°C - 32°C", rainfall: "0.0 mm", rainyHours: 0, workHours: 8, impact: "Optimal Construction Progress" },
    ];
  }, [weekOffset]);

  const weeklySummary = useMemo(() => {
    const totalRain = weeklyData.reduce((sum, d) => sum + parseFloat(d.rainfall), 0);
    const totalRainHours = weeklyData.reduce((sum, d) => sum + d.rainyHours, 0);
    const totalWorkHours = weeklyData.reduce((sum, d) => sum + d.workHours, 0);
    const rainDaysCount = weeklyData.filter((d) => parseFloat(d.rainfall) > 0).length;

    return { totalRain, totalRainHours, totalWorkHours, rainDaysCount };
  }, [weeklyData]);

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING EXACT CRW HEADER LAYOUT */}
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

      {activeTab === "related" ? (
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
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-2 pr-4">CODE</th>
                  <th className="py-2 px-4">MODULE NAME</th>
                  <th className="py-2 px-4">DESCRIPTION</th>
                  <th className="py-2 pl-4 text-right">ACTION</th>
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
                <span className="whitespace-nowrap">Week 34: 17 Aug – 23 Aug 2026</span>
              </div>

              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs"
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
                        <div className="text-[5.5px] font-black text-neutral-900 tracking-wider leading-tight pt-1">
                          Weekly Weather Report
                        </div>
                        <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">
                          Weekly Weather Summary
                        </div>
                        <div className="w-full border-t border-neutral-300 my-1" />
                        <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">
                          98 35 00
                        </div>
                        <div className="w-full border-t border-neutral-200 my-1" />
                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                          <span className="text-left font-bold">Week No</span>
                          <span className="text-right font-bold">Rev</span>
                          <span className="text-left font-black text-neutral-800">W-34</span>
                          <span className="text-right font-black text-neutral-800">00</span>
                        </div>
                      </div>
                    </div>

                    {/* META BAR */}
                    <div className="w-full border-y border-neutral-900 py-1.5 my-2">
                      <div className="grid grid-cols-4 text-center">
                        {[
                          { label: "Period", value: "17 Aug – 23 Aug 2026" },
                          { label: "Total Rainy Days", value: `${weeklySummary.rainDaysCount} Days` },
                          { label: "Total Rainfall", value: `${weeklySummary.totalRain.toFixed(1)} mm` },
                          { label: "Total Effective Work Hours", value: `${weeklySummary.totalWorkHours} Hours` },
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

                    {/* WEEKLY TABLE */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider flex items-center justify-between">
                        <span>WEEKLY WEATHER BREAKDOWN (MON – SUN)</span>
                        <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded">
                          98 35 00
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "14%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "18%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                            <th className="p-1 pl-2">DAY</th>
                            <th className="p-1">DATE</th>
                            <th className="p-1">CONDITION</th>
                            <th className="p-1 text-center">TEMP (°C)</th>
                            <th className="p-1 text-center">RAINFALL</th>
                            <th className="p-1 text-center">WORK HOURS</th>
                            <th className="p-1 pr-2">IMPACT & REMARKS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                          {weeklyData.map((d, idx) => (
                            <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50/60">
                              <td className="p-1 pl-2 font-bold text-neutral-900">{d.day}</td>
                              <td className="p-1 font-mono text-neutral-600">{d.date}</td>
                              <td className="p-1 font-extrabold text-neutral-800">{d.condition}</td>
                              <td className="p-1 text-center font-mono text-neutral-700">{d.temp}</td>
                              <td className="p-1 text-center font-mono font-bold text-neutral-800">{d.rainfall}</td>
                              <td className="p-1 text-center font-mono font-bold text-neutral-900">{d.workHours} hrs</td>
                              <td className="p-1 pr-2 font-medium text-neutral-700">{d.impact}</td>
                            </tr>
                          ))}
                          <tr className="bg-neutral-100 font-black border-t border-neutral-900">
                            <td colSpan={4} className="p-1 pl-2 text-neutral-900 uppercase">
                              Total Weekly Summary
                            </td>
                            <td className="p-1 text-center font-mono font-black text-neutral-900">
                              {weeklySummary.totalRain.toFixed(1)} mm
                            </td>
                            <td className="p-1 text-center font-mono font-black text-neutral-900">
                              {weeklySummary.totalWorkHours} hrs
                            </td>
                            <td className="p-1 pr-2 text-neutral-800">
                              {weeklySummary.totalRainHours > 0 ? `${weeklySummary.totalRainHours} hrs Lost to Rain` : "No Delay"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* WEEKLY SUMMARY NOTES */}
                    <div className="w-full border-y border-neutral-900 bg-white overflow-hidden my-2">
                      <div className="bg-neutral-900 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider">
                        WEEKLY WEATHER EVALUATION & SITE SUMMARY
                      </div>
                      <div className="p-2 text-[7px] text-neutral-800 min-h-[40px] font-medium leading-relaxed">
                        Overall site weather condition during Week 34 was highly favorable with 5 optimal sunny days and 2 mild precipitation days. Total effective work duration achieved 54.5 hours out of 56 scheduled hours (97.3% efficiency). Outdoor structural activities proceeded without major delays.
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
