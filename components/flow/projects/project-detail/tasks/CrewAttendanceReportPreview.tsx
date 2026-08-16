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
import { fetchCrewMembers, fetchDailyLogs, DailyLog, CrewMember } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface CrewEntry {
  id: string;
  name: string;
  role: string;
  category: "CRAFTSMAN" | "WORKER" | "FOREMAN" | "OPERATOR" | "SUPERVISOR" | "LEADER";
  status: "PRESENT" | "HALF_DAY" | "ABSENT" | "CUTI" | "UNINPUT";
  regularHours: number;
  ot1Hours: number;
  ot2Hours: number;
  ot3Hours: number;
  wbsLocation: string;
}

interface CrewAttendanceReportPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string) => void;
}

export function CrewAttendanceReportPreview({
  isProjectDetail = true,
  projectName,
  onSelectNode
}: CrewAttendanceReportPreviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [selectedDate, setSelectedDate] = useState(new Date("2026-08-17"));
  const [crewData, setCrewData] = useState<CrewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Dynamic A4 Scale Calculation Engine (Responsive to any panel/screen width while locking 210:297 ratio)
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

  // Helper to format person names from ALL CAPS to Title Case (e.g. AMIR -> Amir)
  const formatPersonName = (nameStr: string) => {
    if (!nameStr) return "";
    return nameStr
      .toLowerCase()
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Helper to format role label to clean English job title matching database standard
  const getRoleLabel = (roleStr: string) => {
    const upper = (roleStr || "").toUpperCase();
    if (upper === "HELPER" || upper.includes("KENEK") || upper.includes("HELPER")) return "Helper";
    if (upper === "SKILLED" || upper.includes("TUKANG") || upper.includes("CRAFTSMAN") || upper.includes("SKILLED")) return "Skilled Worker";
    if (upper === "FOREMAN" || upper.includes("MANDOR")) return "Foreman";
    if (upper === "LEADER" || upper.includes("LEADER") || upper.includes("SENIOR")) return "Leader";
    if (upper === "OPERATOR") return "Operator";
    if (upper === "SUPERVISOR" || upper.includes("ENGINEER")) return "Supervisor";
    return roleStr || "Crew Member";
  };

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

  // Format location string safely
  const formatLocationStr = (locStr: any) => {
    if (!locStr) return "—";
    if (typeof locStr === "string") return locStr;
    if (typeof locStr === "object") {
      const parts = [locStr.address || locStr.street, locStr.city || locStr.district, locStr.province || locStr.state].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "—";
    }
    return String(locStr);
  };

  // Resolve current active project metadata
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

  // Load real crew data from API strictly filtered by selected Project & Date
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
            const roleUpper = m.role?.toUpperCase() || "";

            const hasLog = Boolean(log);
            const status = hasLog ? (log.status as any) : "UNINPUT";
            const regularHours = hasLog ? log.regularHours : 0;
            const ot1Hours = hasLog ? log.ot1Hours : 0;
            const ot2Hours = hasLog ? log.ot2Hours : 0;
            const ot3Hours = hasLog ? log.ot3Hours : 0;

            const category: CrewEntry["category"] =
              roleUpper === "SUPERVISOR" || roleUpper.includes("ENGINEER") || roleUpper.includes("MANAGER")
                ? "SUPERVISOR"
                : roleUpper === "FOREMAN" || roleUpper.includes("MANDOR")
                ? "FOREMAN"
                : roleUpper === "OPERATOR"
                ? "OPERATOR"
                : roleUpper === "LEADER" || roleUpper.includes("LEADER")
                ? "LEADER"
                : roleUpper === "HELPER" || roleUpper.includes("KENEK")
                ? "WORKER"
                : "CRAFTSMAN";

            return {
              id: m.id,
              name: m.name,
              role: getRoleLabel(m.role),
              category,
              status,
              regularHours,
              ot1Hours,
              ot2Hours,
              ot3Hours,
              wbsLocation: hasLog && (log as any).wbsLocation ? (log as any).wbsLocation : "—"
            };
          });
          setCrewData(formatted);
        } else {
          setCrewData([]);
        }
      } catch (err) {
        console.error("Error loading crew attendance data:", err);
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

  const handleUpdatePresence = () => {
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

  const totalPresent = crewData.filter((c) => c.status === "PRESENT").length;
  const totalHalfDay = crewData.filter((c) => c.status === "HALF_DAY").length;
  const totalAbsent = crewData.filter((c) => c.status === "ABSENT").length;
  const totalCuti = crewData.filter((c) => c.status === "CUTI").length;
  const totalPending = crewData.filter((c) => c.status === "UNINPUT").length;

  // Role Breakdown Count
  const roleBreakdown = useMemo(() => {
    const categories = [
      { key: "Skilled Worker", label: "Skilled Workers" },
      { key: "Helper", label: "Helpers" },
      { key: "Foreman", label: "Foremen" },
      { key: "Leader", label: "Leaders" },
      { key: "Operator", label: "Operators" },
      { key: "Supervisor", label: "Supervisors" },
    ];

    return categories.map((cat) => {
      const items = crewData.filter((c) => c.role === cat.key);
      const total = items.length;
      const present = items.filter((c) => c.status === "PRESENT" || c.status === "HALF_DAY").length;
      const absent = items.filter((c) => c.status === "ABSENT").length;
      const pending = items.filter((c) => c.status === "UNINPUT").length;
      return { label: cat.label, total, present, absent, pending };
    }).filter(cat => cat.total > 0);
  }, [crewData]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <span className="text-[11px] font-bold text-emerald-700">Present</span>;
      case "HALF_DAY":
        return <span className="text-[11px] font-bold text-amber-700">Half Day (4h)</span>;
      case "ABSENT":
        return <span className="text-[11px] font-bold text-rose-700">Absent</span>;
      case "CUTI":
        return <span className="text-[11px] font-bold text-blue-700">Leave</span>;
      default:
        return <span className="text-[11px] font-medium text-neutral-400">Pending</span>;
    }
  };

  const getStatusNoteText = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "Present on Site";
      case "HALF_DAY":
        return "Half Day Shift (4h)";
      case "ABSENT":
        return "Unexcused Absence";
      case "CUTI":
        return "Official Leave";
      default:
        return "Log Pending";
    }
  };

  // Dynamic Multi-Page A4 Chunking Engine
  const FIRST_PAGE_MAX_ROWS = 22;
  const SUBSEQUENT_PAGE_MAX_ROWS = 28;

  const pageChunks = useMemo(() => {
    if (crewData.length === 0) return [[]];

    const chunks: CrewEntry[][] = [];
    let currentIdx = 0;

    chunks.push(crewData.slice(0, FIRST_PAGE_MAX_ROWS));
    currentIdx = FIRST_PAGE_MAX_ROWS;

    while (currentIdx < crewData.length) {
      chunks.push(crewData.slice(currentIdx, currentIdx + SUBSEQUENT_PAGE_MAX_ROWS));
      currentIdx += SUBSEQUENT_PAGE_MAX_ROWS;
    }

    return chunks;
  }, [crewData]);

  const totalPages = pageChunks.length;
  const PAGE_HEIGHT_PX = 1123;
  const PAGE_GAP_PX = 32;
  const rawTotalHeight = totalPages * PAGE_HEIGHT_PX + (totalPages - 1) * PAGE_GAP_PX;

  const displayWidth = 794 * scale;
  const displayHeight = rawTotalHeight * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING STANDARD HEADER LAYOUT */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        {/* LEFT: Code -> Title */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">
            95 03 01
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            Attendance
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
        /* RELATED LINKS TAB */
        <div className="space-y-6 animate-in fade-in duration-300 py-2">
          <div className="space-y-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Related Links & Connected Data Sources</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Daftar modul pendukung yang terhubung secara langsung dengan pencatatan kehadiran personil proyek:
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
                  { code: "95 02 00", name: "Crew Assignment", description: "Penyusunan alokasi tim personil ke dalam zona dan sub-pekerjaan WBS.", nodeId: "95-02-00" },
                  { code: "95 03 00", name: "Crew Daily Log", description: "Laporan harian log jam kerja regular dan lembur (OT) personil.", nodeId: "95-03-00" },
                  { code: "95 04 00", name: "Crew Payroll", description: "Kalkulasi rekapitulasi upah harian, mingguan, dan honor lembur personil.", nodeId: "95-04-00" }
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
                onClick={handleUpdatePresence}
                className="ml-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer print:hidden group whitespace-nowrap"
                title="Update presence log in Crew Daily Log module"
              >
                <span>Update Log</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* 1. DOCUMENT PREVIEW VIEWPORT (MULTI-PAGE A4 PREVIEW WITH PAGINATION) */}
          <div
            ref={containerRef}
            className="w-full flex justify-center py-2"
          >
            {/* 2. SCALE WRAPPER */}
            <div
              className="mx-auto relative transition-all duration-150 ease-out shrink-0"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
              }}
            >
              {/* 3. MULTI-PAGE STACK SCALED ENTIRELY VIA TRANSFORM SCALE */}
              <div
                className="absolute top-0 left-0 flex flex-col gap-8 print:gap-0"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                {pageChunks.map((pageRows, pageIdx) => {
                  const isFirstPage = pageIdx === 0;
                  const isLastPage = pageIdx === totalPages - 1;
                  const startIndex = isFirstPage ? 0 : FIRST_PAGE_MAX_ROWS + (pageIdx - 1) * SUBSEQUENT_PAGE_MAX_ROWS;

                  return (
                    <div
                      key={pageIdx}
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
                        {isFirstPage ? (
                          /* Full Header Branding & Metadata for Page 1 */
                          <>
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
                                <div className="text-[5.5px] font-black text-neutral-900 tracking-wider leading-tight pt-1">Attendance Report</div>
                                <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">Rekapitulasi Kehadiran</div>
                                <div className="w-full border-t border-neutral-300 my-1" />
                                <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">95 03 01</div>
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
                                  { label: "Total Crew", value: `${crewData.length} Personnel` },
                                  { label: "Present Crew", value: `${totalPresent + totalHalfDay} Present` },
                                  { label: "Absent Crew", value: `${totalAbsent} Absent` },
                                ].map((cell, i) => (
                                  <div key={i} className="flex flex-col items-center justify-center">
                                    <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider">{cell.label}</span>
                                    <span className="text-[9px] font-bold text-neutral-900 leading-tight pt-0.5">{cell.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </>
                        ) : (
                          /* Compact Header Bar for Continuation Pages */
                          <div className="border-b border-neutral-300 pb-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-[10px]">Attendance Report</span>
                              <span className="text-neutral-400 text-[9px]">•</span>
                              <span className="font-mono text-neutral-500 text-[9px]">{projInfo.code} {projInfo.cleanName}</span>
                            </div>
                            <div className="text-[9px] text-neutral-500 font-semibold">
                              Date: <span className="font-mono text-neutral-900">{selectedDate.toLocaleDateString("en-GB")}</span>
                            </div>
                          </div>
                        )}

                        {/* MAIN ATTENDANCE ROLE SUMMARY TABLE */}
                        <div className="w-full border-y-2 border-neutral-900 bg-white overflow-hidden my-2">
                          <table className="w-full text-left text-xs border-collapse table-fixed">
                            <colgroup>
                              <col style={{ width: "8%" }} />
                              <col style={{ width: "37%" }} />
                              <col style={{ width: "20%" }} />
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "17%" }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-neutral-50 text-neutral-600 font-bold text-[9.5px] border-b border-neutral-300">
                                <th className="py-2.5 px-2 text-center">No</th>
                                <th className="py-2.5 px-3">Role</th>
                                <th className="py-2.5 px-3 text-center">Number of Crew</th>
                                <th className="py-2.5 px-3 text-center">Present</th>
                                <th className="py-2.5 px-3 text-center">Absent</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 font-medium">
                              {[
                                { role: "Foreman", label: "Foreman" },
                                { role: "Leader", label: "Leader" },
                                { role: "Skilled Worker", label: "Skilled Worker" },
                                { role: "Helper", label: "Helper" },
                                { role: "Operator", label: "Operator" },
                                { role: "Supervisor", label: "Supervisor" },
                              ].map((roleDef, idx) => {
                                const matching = crewData.filter((c) => c.role === roleDef.role);
                                const total = matching.length;
                                const present = matching.filter((c) => c.status === "PRESENT" || c.status === "HALF_DAY").length;
                                const absent = matching.filter((c) => c.status === "ABSENT").length;

                                return (
                                  <tr key={roleDef.role} className="border-b border-neutral-200 hover:bg-neutral-50/60 transition-colors">
                                    <td className="py-2.5 px-2 text-center font-mono font-bold text-neutral-400 text-[10px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-neutral-900 text-[11px]">
                                      {roleDef.label}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-800 text-[11px]">
                                      {total}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 text-[11px]">
                                      {present}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700 text-[11px]">
                                      {absent}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-neutral-100 font-bold text-neutral-900 border-t-2 border-neutral-900 border-b border-neutral-300">
                                <td colSpan={2} className="py-3 px-3 text-[10px] font-extrabold uppercase tracking-tight">
                                  Total Attendance Summary
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-[11.5px] text-neutral-900">
                                  {crewData.length}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-[11.5px] text-emerald-700">
                                  {totalPresent + totalHalfDay}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-[11.5px] text-rose-700">
                                  {totalAbsent}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* PAGE FOOTER FOR EVERY PAGE */}
                      <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                        <span>Adidaya Studio | Attendance</span>
                        <span>CRW 95 03 01 | {pageIdx + 1}/{totalPages}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
