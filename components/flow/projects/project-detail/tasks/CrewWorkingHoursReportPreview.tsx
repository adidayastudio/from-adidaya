"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { fetchCrewMembers, fetchDailyLogs, CrewMember } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface CrewEntry {
  id: string;
  name: string;
  role: string;
  status: "PRESENT" | "HALF_DAY" | "ABSENT" | "CUTI" | "UNINPUT";
  regularHours: number;
  ot1Hours: number;
  ot2Hours: number;
  ot3Hours: number;
}

interface CrewWorkingHoursReportPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string) => void;
}

export function CrewWorkingHoursReportPreview({
  isProjectDetail = true,
  projectName,
  onSelectNode
}: CrewWorkingHoursReportPreviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [selectedDate, setSelectedDate] = useState(new Date("2026-08-17"));
  const [crewData, setCrewData] = useState<CrewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
              stage: p.stage || p.current_stage || ""
            };
          });
          setProjectList(formatted);

          // Auto select matching or first project
          const searchKey = projectName || activeProject;
          if (searchKey) {
            const match = formatted.find(p =>
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
    if (!locStr) return "—";
    if (typeof locStr === "string") return locStr;
    if (typeof locStr === "object") {
      const parts = [locStr.address || locStr.street, locStr.city || locStr.district, locStr.province || locStr.state].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "—";
    }
    return String(locStr);
  };

  const projInfo = useMemo(() => {
    let matched = projectList.find(p =>
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
    let location = matched?.location ? formatLocationStr(matched.location) : "—";
    let stage = matched?.stage && typeof matched.stage === "string" ? matched.stage : "—";

    if (!matched && activeProject && activeProject.includes("[")) {
      const parts = activeProject.split("]");
      code = parts[0].replace("[", "").trim().toUpperCase();
      cleanName = parts[1]?.trim() || activeProject;
    }

    return { code, cleanName, location, stage };
  }, [activeProject, projectList]);

  // Load real crew data from API
  useEffect(() => {
    async function loadRealCrew() {
      try {
        setIsLoading(true);
        const wsId = await fetchDefaultWorkspaceId();
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        let projCode = activeProject;
        if (activeProject.includes("[")) {
          projCode = activeProject.split("]")[0].replace("[", "").trim().toUpperCase();
        }

        const matchedProj = projectList.find(p => p.name === activeProject || p.id === activeProject);
        if (matchedProj && matchedProj.code) {
          projCode = matchedProj.code.replace("[", "").replace("]", "").trim().toUpperCase();
        }

        const allMembers = await fetchCrewMembers(wsId || undefined);
        const filteredMembers = (allMembers || []).filter(m => {
          if (!m.currentProjectCode) return false;
          const code = m.currentProjectCode.trim().toUpperCase();
          return code === projCode || code.includes(projCode) || projCode.includes(code);
        });

        const dailyLogs = wsId ? await fetchDailyLogs(wsId, projCode, dateStr) : [];
        const logsMap = new Map((dailyLogs || []).map((l: any) => [l.crewId, l]));

        if (filteredMembers.length > 0) {
          const formatted: CrewEntry[] = filteredMembers.map((m: CrewMember) => {
            const log = logsMap.get(m.id);
            const hasLog = Boolean(log);
            return {
              id: m.id,
              name: m.name,
              role: m.role || "Crew Member",
              status: hasLog ? (log.status as any) : "UNINPUT",
              regularHours: hasLog ? log.regularHours : 0,
              ot1Hours: hasLog ? log.ot1Hours : 0,
              ot2Hours: hasLog ? log.ot2Hours : 0,
              ot3Hours: hasLog ? log.ot3Hours : 0,
            };
          });
          setCrewData(formatted);
        } else {
          setCrewData([]);
        }
      } catch (err) {
        console.error("Error loading crew working hours data:", err);
        setCrewData([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadRealCrew();
  }, [activeProject, selectedDate, projectList]);

  const handleDateChange = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const handleUpdateHours = () => {
    let projCode = activeProject;
    if (activeProject.includes("[")) {
      projCode = activeProject.split("]")[0].replace("[", "").trim().toUpperCase();
    }
    const matchedProj = projectList.find(p => p.name === activeProject || p.id === activeProject);
    if (matchedProj && matchedProj.code) {
      projCode = matchedProj.code.replace("[", "").replace("]", "").trim().toUpperCase();
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    router.push(`/feel/crew?tab=daily-input&project=${encodeURIComponent(projCode)}&date=${dateStr}`);
  };

  // Calculations for Working Hour Categories
  const regularPersonnel = crewData.filter((c) => c.regularHours > 0).length;
  const totalRegularManHours = crewData.reduce((acc, c) => acc + c.regularHours, 0);

  const ot1Personnel = crewData.filter((c) => c.ot1Hours > 0).length;
  const totalOt1ManHours = crewData.reduce((acc, c) => acc + c.ot1Hours, 0);

  const ot2Personnel = crewData.filter((c) => c.ot2Hours > 0).length;
  const totalOt2ManHours = crewData.reduce((acc, c) => acc + c.ot2Hours, 0);

  const ot3Personnel = crewData.filter((c) => c.ot3Hours > 0).length;
  const totalOt3ManHours = crewData.reduce((acc, c) => acc + c.ot3Hours, 0);

  const grandTotalManHours = totalRegularManHours + totalOt1ManHours + totalOt2ManHours + totalOt3ManHours;
  const grandTotalManDays = (grandTotalManHours / 8).toFixed(2).replace(/\.00$/, "");
  const totalActivePersonnel = crewData.filter((c) => c.regularHours > 0 || c.ot1Hours > 0 || c.ot2Hours > 0 || c.ot3Hours > 0).length;

  const categories = [
    {
      no: 1,
      category: "Regular Shift (8h)",
      timeSchedule: "08:00 – 16:00",
      description: "Standard 8-hour daily working shift",
      personnel: regularPersonnel,
      manHours: totalRegularManHours,
    },
    {
      no: 2,
      category: "Overtime 1 (OT 1)",
      timeSchedule: "16:00 – 18:00",
      description: "Initial overtime hours (1.5x rate)",
      personnel: ot1Personnel,
      manHours: totalOt1ManHours,
    },
    {
      no: 3,
      category: "Overtime 2 (OT 2)",
      timeSchedule: "18:00 – 22:00",
      description: "Extended overtime hours (2.0x rate)",
      personnel: ot2Personnel,
      manHours: totalOt2ManHours,
    },
    {
      no: 4,
      category: "Overtime 3 (OT 3)",
      timeSchedule: "22:00 – 06:00",
      description: "Night / Holiday overtime hours (3.0x rate)",
      personnel: ot3Personnel,
      manHours: totalOt3ManHours,
    },
  ];

  const totalPages = 1;
  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING HEADER LAYOUT */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">
            95 25 00
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            Working Hours
          </h2>
        </div>

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
              Daftar modul pendukung yang terhubung secara langsung dengan rekapitulasi jam kerja proyek:
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
                  { code: "95 01 00", name: "Crew Directory", description: "Daftar induk profil personil, keahlian, sertifikasi K3, dan data kontak.", nodeId: "95-01-00" },
                  { code: "95 20 00", name: "Crew Daily Log", description: "Laporan harian log jam kerja regular dan lembur (OT) personil.", nodeId: "95-20-00" },
                  { code: "95 21 00", name: "Attendance", description: "Rekapitulasi jumlah kehadiran personil per kategori jabatan.", nodeId: "95-21-00" },
                  { code: "95 30 00", name: "Crew Payroll", description: "Kalkulasi rekapitulasi upah harian, mingguan, dan honor lembur personil.", nodeId: "95-30-00" }
                ].map((item) => (
                  <tr
                    key={item.code}
                    onClick={() => onSelectNode?.(item.nodeId)}
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
          {/* TOP CONTROLS: GLASSY PILL SELECTORS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 print:hidden w-full">
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

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs">
                <span className="whitespace-nowrap">{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>

              <button
                onClick={() => handleDateChange(1)}
                className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs"
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
                onClick={handleUpdateHours}
                className="ml-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer print:hidden group whitespace-nowrap"
                title="Update working hours log in Crew Daily Log module"
              >
                <span>Update Hours</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* DOCUMENT PREVIEW VIEWPORT */}
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
                    boxSizing: "border-box"
                  }}
                >
                  {/* TOP SECTION */}
                  <div className="space-y-3">
                    {/* Header Branding */}
                    <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 pr-1">
                          <img src="/logo-adidaya-red.svg" alt="Adidaya" className="h-8 w-auto object-contain filter brightness-0" />
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
                          <div className="text-[8px] font-semibold text-neutral-700 leading-tight">{projInfo.location}</div>
                          <div className="text-[6px] font-bold text-neutral-400 pt-1">Work Stage</div>
                          <div className="text-[7.5px] font-bold text-neutral-800 leading-tight">{projInfo.stage}</div>
                        </div>
                      </div>
                      <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                        <div className="font-black text-[26px] text-neutral-900 leading-none tracking-tighter">CRW</div>
                        <div className="text-[5.5px] font-black text-neutral-900 tracking-wider leading-tight pt-1">Working Hours Report</div>
                        <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">Rekapitulasi Jam Kerja</div>
                        <div className="w-full border-t border-neutral-300 my-1" />
                        <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">95 25 00</div>
                        <div className="w-full border-t border-neutral-200 my-1" />
                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                          <span className="text-left font-bold">Log Date</span>
                          <span className="text-right font-bold">Rev</span>
                          <span className="text-left font-black text-neutral-800">{selectedDate.toLocaleDateString("en-GB")}</span>
                          <span className="text-right font-black text-neutral-800">00</span>
                        </div>
                      </div>
                    </div>

                    {/* Date Meta Bar */}
                    <div className="w-full border-y border-neutral-900 py-1.5 my-2">
                      <div className="grid grid-cols-5 text-center">
                        {[
                          { label: "Day", value: selectedDate.toLocaleDateString("en-US", { weekday: "long" }) },
                          { label: "Date", value: selectedDate.toLocaleDateString("en-GB") },
                          { label: "Total Personnel", value: `${crewData.length} Personnel` },
                          { label: "Active Crew", value: `${totalActivePersonnel} Working` },
                          { label: "Total Man-Hours", value: `${grandTotalManHours} Man-Hours` },
                        ].map((cell, i) => (
                          <div key={i} className="flex flex-col items-center justify-center">
                            <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider">{cell.label}</span>
                            <span className="text-[9px] font-bold text-neutral-900 leading-tight pt-0.5">{cell.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MAIN WORKING HOURS TABLE */}
                    <div className="w-full border-y-2 border-neutral-900 bg-white overflow-hidden my-3">
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "7%" }} />
                          <col style={{ width: "35%" }} />
                          <col style={{ width: "23%" }} />
                          <col style={{ width: "17%" }} />
                          <col style={{ width: "18%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-neutral-50 text-neutral-600 font-bold text-[9.5px] border-b border-neutral-300">
                            <th className="py-2.5 px-2 text-center">No</th>
                            <th className="py-2.5 px-3">Working Hour Category</th>
                            <th className="py-2.5 px-3 text-center">Time Schedule</th>
                            <th className="py-2.5 px-3 text-center">Personnel</th>
                            <th className="py-2.5 px-3 text-center">Total Man-Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 font-medium">
                          {categories.map((row) => (
                            <tr key={row.no} className="border-b border-neutral-200 hover:bg-neutral-50/60 transition-colors">
                              <td className="py-3 px-2 text-center font-mono font-bold text-neutral-400 text-[10px]">
                                {row.no}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-neutral-900 text-[11px]">{row.category}</div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-neutral-800 text-[11px]">
                                {row.timeSchedule}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-neutral-800 text-[11px]">
                                {row.personnel} Crew
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="font-mono font-black text-blue-700 text-[11.5px]">{row.manHours}h</div>
                                {row.manHours > 0 && (
                                  <div className="text-[8px] font-semibold text-neutral-400 font-mono">
                                    ({(row.manHours / 8).toFixed(2).replace(/\.00$/, "")} Mandays)
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-neutral-100 font-bold text-neutral-900 border-t-2 border-neutral-900 border-b border-neutral-300">
                            <td colSpan={3} className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-tight">
                              Total Working Hours Summary
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-[11.5px] text-neutral-900">
                              {totalActivePersonnel} Crew
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="font-mono font-black text-[12px] text-blue-700">{grandTotalManHours}h</div>
                              <div className="text-[8.5px] font-bold text-neutral-600 font-mono pt-0.5">≈ {grandTotalManDays} Mandays</div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* PAGE FOOTER */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                    <span>Adidaya Studio | Working Hours</span>
                    <span>CRW 95 25 00 | 1/1</span>
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
