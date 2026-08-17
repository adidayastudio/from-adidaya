"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { fetchCrewMembers, fetchDailyLogs } from "@/lib/api/crew";

interface WorkItem {
  id: string;
  wbs: string;
  description: string;
  location: string;
  volume: string;
  progress: string;
}

interface MaterialItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  incoming: number;
  used: number;
  stock: number;
}

interface QCItem {
  id: string;
  item: string;
  location: string;
  spec: string;
  status: "PASS" | "FAIL" | "PENDING";
  remarks: string;
}

interface HSEItem {
  id: string;
  item: string;
  status: "SAFE" | "ACTION_REQUIRED" | "COMPLIANT";
  action: string;
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
  notes?: string;
  nextPlan?: string;
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
  projectName: "",
  contractorName: "PT. ADIDAYA KREASI NUSA",
  notes: "Pekerjaan pengecoran lantai 2 area A berjalan lancar. Penambahan 4 tukang untuk percepatan waterproofing zone B.",
  nextPlan: "Penambahan 4 tukang untuk percepatan waterproofing zone B dan persiapan pengecoran kolom lantai 2.",
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
  projectName = "",
  onSave,
  onSelectNode
}: {
  data?: DCRData;
  isProjectDetail?: boolean;
  projectName?: string;
  onSave?: (updatedData: DCRData) => void;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preview" | "related">("preview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [projectList, setProjectList] = useState<Array<{
    id: string;
    code: string;
    cleanCode: string;
    name: string;
    fullName: string;
    location?: any;
    stage?: string;
  }>>([]);

  const [crewData, setCrewData] = useState<Array<{
    id: string;
    name: string;
    role: string;
    category: string;
    status: "PRESENT" | "HALF_DAY" | "ABSENT" | "CUTI" | "UNINPUT";
    regularHours: number;
    ot1Hours: number;
    ot2Hours: number;
    ot3Hours: number;
  }>>([]);

  const [workItems, setWorkItems] = useState<WorkItem[]>(initialWorkItems);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [qcLogs, setQcLogs] = useState<QCItem[]>([
    { id: "1", item: "Rebar & Formwork Quality Inspection", location: "Roof Top Area", spec: "SNI / Architect Spec", status: "PASS", remarks: "Approved for concrete pouring" }
  ]);
  const [hseLogs, setHseLogs] = useState<HSEItem[]>([
    { id: "1", item: "PPE & Safety Equipment Inspection", status: "SAFE", action: "All workers compliant with helmets & boots" }
  ]);

  // Dynamic Scale State for Canvas Preview Viewport
  const [scale, setScale] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const newScale = Math.min((availableWidth - 80) / 794, 1);
        setScale(Math.max(newScale, 0.45));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Fetch projects list dynamically from Supabase
  useEffect(() => {
    async function loadProjects() {
      try {
        const wsId = await fetchDefaultWorkspaceId();
        const projects = await fetchProjectsByWorkspace(wsId || undefined);
        if (projects && projects.length > 0) {
          const formatted = projects.map(p => {
            const rawCode = p.code || p.project_code || "";
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
        console.error("Error loading projects list:", err);
      }
    }
    loadProjects();
  }, [projectName]);

  // Load real crew attendance and working hours logs from Supabase
  useEffect(() => {
    async function loadRealCrew() {
      try {
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
          const formatted = filteredMembers.map((m: any) => {
            const log = logsMap.get(m.id);
            const hasLog = Boolean(log);
            const roleUpper = (m.role || "").toUpperCase();

            const category =
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
              role: m.role || "Crew Member",
              category,
              status: hasLog ? (log.status as any) : "UNINPUT",
              regularHours: hasLog ? (log.regularHours || 0) : 0,
              ot1Hours: hasLog ? (log.ot1Hours || 0) : 0,
              ot2Hours: hasLog ? (log.ot2Hours || 0) : 0,
              ot3Hours: hasLog ? (log.ot3Hours || 0) : 0,
            };
          });
          setCrewData(formatted);
        } else {
          setCrewData([]);
        }
      } catch (err) {
        console.error("Error loading crew logs for DCR:", err);
        setCrewData([]);
      }
    }
    loadRealCrew();
  }, [activeProject, selectedDate, projectList]);

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

  // Resolve active project metadata
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

  const handleDateChange = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const handleUpdateDCRData = () => {
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

    router.push(`/feel/dcr?project=${encodeURIComponent(projCode)}&date=${dateStr}`);
  };

  // Real Role Breakdown Computed directly from DB crewData (Strictly no made-up numbers, matching 95 21 00)
  const roleBreakdown = useMemo(() => {
    const categoriesMap: Record<string, { role: string; count: number }> = {
      SUPERVISOR: { role: "Supervisor", count: 0 },
      FOREMAN: { role: "Foreman", count: 0 },
      LEADER: { role: "Leader", count: 0 },
      CRAFTSMAN: { role: "Craftsman / Skilled Worker", count: 0 },
      WORKER: { role: "Worker / Helper", count: 0 },
      OPERATOR: { role: "Operator", count: 0 },
    };

    crewData.forEach((c) => {
      if (c.status === "PRESENT" || c.status === "HALF_DAY") {
        const catKey = (c.category || "WORKER").toUpperCase();
        if (categoriesMap[catKey]) {
          categoriesMap[catKey].count += 1;
        } else {
          categoriesMap["WORKER"].count += 1;
        }
      }
    });

    return [
      categoriesMap.SUPERVISOR,
      categoriesMap.FOREMAN,
      categoriesMap.LEADER,
      categoriesMap.CRAFTSMAN,
      categoriesMap.WORKER,
      categoriesMap.OPERATOR,
    ];
  }, [crewData]);

  const totalCrewPresent = useMemo(() => {
    return roleBreakdown.reduce((acc, r) => acc + r.count, 0);
  }, [roleBreakdown]);

  // Real Working Hours Summary Computed directly from DB crewData (Strictly no made-up numbers)
  const workingHoursSummary = useMemo(() => {
    const reg = crewData.reduce((acc, c) => acc + (c.regularHours || 0), 0);
    const ot1 = crewData.reduce((acc, c) => acc + (c.ot1Hours || 0), 0);
    const ot2 = crewData.reduce((acc, c) => acc + (c.ot2Hours || 0), 0);
    const ot3 = crewData.reduce((acc, c) => acc + (c.ot3Hours || 0), 0);

    return [
      { label: "Regular 08.00–16.00", hours: reg },
      { label: "OT 1 16.00–18.00", hours: ot1 },
      { label: "OT 2 18.00–22.00", hours: ot2 },
      { label: "OT 3 22.00–08.00", hours: ot3 },
    ];
  }, [crewData]);

  const totalManHours = useMemo(() => {
    return workingHoursSummary.reduce((acc, w) => acc + w.hours, 0);
  }, [workingHoursSummary]);

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* MATCHING HEADER LAYOUT */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
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
                  value={activeProject}
                  onChange={(e) => setActiveProject(e.target.value)}
                  className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer transition-all shadow-2xs"
                >
                  {projectList.map((p) => (
                    <option key={p.id} value={p.fullName}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}
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
              Daftar modul pendukung yang terhubung secara langsung dengan Laporan Harian Konstruksi (DCR):
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-mono text-[11px]">
                  <th className="pb-3 pr-4 font-bold">CODE</th>
                  <th className="pb-3 px-4 font-bold">MODULE NAME</th>
                  <th className="pb-3 px-4 font-bold">SHORT DESCRIPTION</th>
                  <th className="pb-3 pl-4 w-32 text-right font-bold">ACTION</th>
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
                    code: "95 20 00",
                    name: "Crew Daily Log",
                    description: "Source data of daily crew timesheet and daily work log.",
                    nodeId: "95-20-00",
                  },
                  {
                    code: "95 21 00",
                    name: "Crew Attendance Summary",
                    description: "Source data of personnel attendance per role (skilled worker, helper, foreman, etc.).",
                    nodeId: "95-21-00",
                  },
                  {
                    code: "95 25 00",
                    name: "Crew Working Hours Summary",
                    description: "Source logging of regular working hours (08.00-16.00) and overtime durations (OT 1, OT 2, OT 3).",
                    nodeId: "95-25-00",
                  },
                  {
                    code: "98 30 00",
                    name: "Weather & Climate Log",
                    description: "Source logging of daily weather conditions (sunny, cloudy, rain) and effective working hours.",
                    nodeId: "98-30-00",
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
                    <td className="py-3.5 pl-4 align-top text-right">
                      <button className="px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-white border border-neutral-200 dark:border-neutral-700 group-hover:border-blue-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs">
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
        /* PRINTABLE DOCUMENT PREVIEW MODE */
        <div className="space-y-4 w-full">
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
                onClick={handleUpdateDCRData}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Update DCR Log</span>
              </button>
            </div>
          </div>

          {/* PAGE VIEWPORT CONTAINER */}
          <div ref={containerRef} className="w-full flex flex-col items-center overflow-x-auto py-2">
            <div
              style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
              className="relative transition-all duration-150 ease-out"
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: "794px",
                  height: `${PAGE_HEIGHT_PX}px`,
                }}
                className="bg-white text-neutral-900 shadow-2xl p-8 flex flex-col justify-between border border-neutral-300 select-none"
              >
                <div className="space-y-3">
                  {/* HEADER BRANDING & STAMP BOX */}
                  <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 pr-1">
                        <img src="/logo-adidaya-red.svg" alt="Adidaya" className="h-8 w-auto object-contain filter brightness-0" />
                      </div>

                      <div className="pl-4 border-l border-neutral-300 space-y-0.5">
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
                        <div className="text-[6px] font-bold text-neutral-400 tracking-widest uppercase pt-1">WORK STAGE</div>
                        <div className="text-[7.5px] font-bold text-neutral-800 leading-tight uppercase">{projInfo.stage}</div>
                      </div>
                    </div>

                    <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                      <div className="font-black text-[26px] text-neutral-900 leading-none tracking-tighter">DCR</div>
                      <div className="text-[6px] font-black text-neutral-900 tracking-wider leading-tight uppercase pt-1">Daily Construction Report</div>
                      <div className="w-full border-t border-neutral-300 my-1" />
                      <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">71 01 00</div>
                      <div className="w-full border-t border-neutral-200 my-1" />
                      <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                        <span className="text-left font-bold uppercase">Report Date</span>
                        <span className="text-right font-bold uppercase">Rev</span>
                        <span className="text-left font-black text-neutral-800">{selectedDate.toLocaleDateString("en-GB")}</span>
                        <span className="text-right font-black text-neutral-800">00</span>
                      </div>
                    </div>
                  </div>

                  {/* DATE META BAR (HORIZONTAL BORDERS ONLY INSIDE) */}
                  <div className="w-full border-y border-neutral-900 py-1.5 my-1.5">
                    <div className="grid grid-cols-5 text-center">
                      {[
                        { label: "Day", value: selectedDate.toLocaleDateString("en-US", { weekday: "long" }) },
                        { label: "Date", value: selectedDate.toLocaleDateString("en-GB") },
                        { label: "Weather", value: "Sunny / Part-Cloudy" },
                        { label: "Total Crew", value: `${totalCrewPresent} Present` },
                        { label: "Total Activities", value: `${workItems.length} Items` },
                      ].map((cell, i) => (
                        <div key={i} className="flex flex-col items-center justify-center">
                          <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider uppercase">{cell.label}</span>
                          <span className="text-[8.5px] font-bold text-neutral-900 leading-tight pt-0.5">{cell.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* TOP ROW: 2 COLUMNS (LEFT: WORK ACTIVITIES, RIGHT: PERSONEL + WORKING HOURS + WEATHER) */}
                  <div className="flex gap-3 items-start">
                    {/* LEFT COLUMN: WORK ACTIVITIES (41 02 00) */}
                    <div className="flex-1">
                      <div className="w-full border-y border-neutral-900 bg-white overflow-hidden">
                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                          <span className="truncate">WORK ACTIVITIES & DESCRIPTION</span>
                          <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                            41 02 00
                          </span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse table-fixed">
                          <colgroup>
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "52%" }} />
                            <col style={{ width: "24%" }} />
                            <col style={{ width: "18%" }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                              <th className="p-1 w-5 text-center">NO</th>
                              <th className="p-1">WORK DESCRIPTION</th>
                              <th className="p-1">LOCATION</th>
                              <th className="p-1 text-center">VOLUME</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 text-[6.5px] font-medium">
                            {workItems.map((item, idx) => (
                              <tr key={item.id} className="border-b border-neutral-200 hover:bg-neutral-50/60">
                                <td className="p-1 text-center font-mono font-bold text-neutral-400">{idx + 1}</td>
                                <td className="p-1 font-bold text-neutral-900">{item.description}</td>
                                <td className="p-1 text-neutral-600">{item.location}</td>
                                <td className="p-1 text-center font-mono font-bold text-neutral-800">{item.volume}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* RIGHT COLUMN SIDEBAR (~200px): PERSONEL + WORKING HOURS + WEATHER */}
                    <div className="w-[200px] shrink-0 flex flex-col gap-2">
                      {/* PERSONEL (95 21 00) */}
                      <div className="w-full border-y border-neutral-900 bg-white overflow-hidden">
                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                          <span className="truncate">PERSONNEL</span>
                          <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                            95 21 00
                          </span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse table-fixed">
                          <tbody className="divide-y divide-neutral-200 text-[6px]">
                            {roleBreakdown.map((r, i) => (
                              <tr key={i} className="border-b border-neutral-200">
                                <td className="p-0.5 pl-1.5 text-neutral-700 font-bold">{r.role}</td>
                                <td className="p-0.5 text-center font-mono font-black text-neutral-900 w-8">{r.count}</td>
                              </tr>
                            ))}
                            <tr className="bg-neutral-100 font-black">
                              <td className="p-0.5 pl-1.5 text-neutral-900">Total</td>
                              <td className="p-0.5 text-center font-mono font-black text-neutral-900 w-8">{totalCrewPresent}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* WORKING HOURS (95 25 00) */}
                      <div className="w-full border-y border-neutral-900 bg-white overflow-hidden">
                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                          <span className="truncate">WORKING HOURS</span>
                          <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                            95 25 00
                          </span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse table-fixed">
                          <tbody className="divide-y divide-neutral-200 text-[6px]">
                            {workingHoursSummary.map((w, i) => (
                              <tr key={i} className="border-b border-neutral-200">
                                <td className="p-0.5 pl-1.5 text-neutral-700 font-semibold">{w.label}</td>
                                <td className="p-0.5 text-center font-mono font-bold text-neutral-900 w-12">{w.hours} Hours</td>
                              </tr>
                            ))}
                            <tr className="bg-neutral-100 font-black">
                              <td className="p-0.5 pl-1.5 text-neutral-900">Total</td>
                              <td className="p-0.5 text-center font-mono font-black text-neutral-900 w-12">{totalManHours} Hours</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* WEATHER (98 30 00) */}
                      <div className="w-full border-y border-neutral-900 bg-white overflow-hidden">
                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                          <span className="truncate">WEATHER</span>
                          <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                            98 30 00
                          </span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse table-fixed">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-300 text-[5.5px] font-extrabold text-neutral-500 uppercase">
                              <th className="p-0.5 pl-1">TIME</th>
                              <th className="p-0.5 text-center w-4">☀️</th>
                              <th className="p-0.5 text-center w-4">⛅</th>
                              <th className="p-0.5 text-center w-4">🌧️</th>
                              <th className="p-0.5 text-center w-8">DURATION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 text-[6px]">
                            <tr className="border-b border-neutral-200">
                              <td className="p-0.5 pl-1 text-neutral-600 font-medium">08.00 - 16.00</td>
                              <td className="p-0.5 text-center font-black text-neutral-900">✓</td>
                              <td className="p-0.5 text-center font-black text-neutral-900"></td>
                              <td className="p-0.5 text-center font-black text-neutral-900"></td>
                              <td className="p-0.5 text-center font-semibold text-neutral-600">8 Hours</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* FULL WIDTH: FIELD MATERIAL, EQUIPMENT & SERVICES (50 00 00) */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-1">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                      <span className="truncate">FIELD MATERIAL, EQUIPMENT & SERVICES</span>
                      <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                        50 00 00
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "42%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "10%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                          <th className="p-1 text-center">NO</th>
                          <th className="p-1">CATEGORY</th>
                          <th className="p-1">MATERIAL / EQUIPMENT / SERVICE NAME</th>
                          <th className="p-1 text-center">UNIT</th>
                          <th className="p-1 text-center">INCOMING</th>
                          <th className="p-1 text-center">USED</th>
                          <th className="p-1 text-center">STOCK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                        {materials.length > 0 ? (
                          materials.map((m, idx) => (
                            <tr key={m.id} className="border-b border-neutral-200">
                              <td className="p-1 text-center font-mono font-bold text-neutral-400">{idx + 1}</td>
                              <td className="p-1 font-bold text-neutral-600 uppercase">{m.category}</td>
                              <td className="p-1 font-bold text-neutral-800">{m.name}</td>
                              <td className="p-1 text-center font-semibold text-neutral-600">{m.unit}</td>
                              <td className="p-1 text-center font-bold text-neutral-800">{m.incoming}</td>
                              <td className="p-1 text-center font-bold text-neutral-800">{m.used}</td>
                              <td className="p-1 text-center font-bold text-neutral-800">{m.stock}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-b border-neutral-200 text-[6.5px]">
                            <td className="p-1 text-center font-bold text-neutral-400">1</td>
                            <td className="p-1 font-bold text-neutral-600 uppercase">MATERIAL</td>
                            <td className="p-1 font-semibold text-neutral-400 italic">No recorded material or equipment entries for this date.</td>
                            <td className="p-1 text-center font-semibold text-neutral-600">unit</td>
                            <td className="p-1 text-center font-bold text-neutral-800">0</td>
                            <td className="p-1 text-center font-bold text-neutral-800">0</td>
                            <td className="p-1 text-center font-bold text-neutral-800">0</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* QC CHECK & INSPECTION LOG (96 01 00) */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-1">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                      <span className="truncate">QC CHECK & INSPECTION LOG</span>
                      <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                        96 01 00
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "35%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "14%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                          <th className="p-1 text-center">NO</th>
                          <th className="p-1">INSPECTION ITEM / WORK</th>
                          <th className="p-1">LOCATION</th>
                          <th className="p-1">SPEC / STANDARD</th>
                          <th className="p-1 text-center">STATUS</th>
                          <th className="p-1">REMARKS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                        {qcLogs.map((q, idx) => (
                          <tr key={q.id} className="border-b border-neutral-200">
                            <td className="p-1 text-center font-mono font-bold text-neutral-400">{idx + 1}</td>
                            <td className="p-1 font-bold text-neutral-800">{q.item}</td>
                            <td className="p-1 text-neutral-600 font-semibold">{q.location}</td>
                            <td className="p-1 text-neutral-600">{q.spec}</td>
                            <td className="p-1 text-center font-black text-emerald-600">{q.status}</td>
                            <td className="p-1 text-neutral-700">{q.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* HSE CHECK & SAFETY LOG (97 01 00) */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-1">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                      <span className="truncate">HSE CHECK & SAFETY LOG</span>
                      <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-neutral-700 transition-colors shrink-0 whitespace-nowrap ml-auto text-right">
                        97 01 00
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "40%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "40%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                          <th className="p-1 text-center">NO</th>
                          <th className="p-1">SAFETY INSPECTION ITEM</th>
                          <th className="p-1 text-center">STATUS</th>
                          <th className="p-1">REMARKS & CORRECTION ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                        {hseLogs.map((h, idx) => (
                          <tr key={h.id} className="border-b border-neutral-200">
                            <td className="p-1 text-center font-mono font-bold text-neutral-400">{idx + 1}</td>
                            <td className="p-1 font-bold text-neutral-800">{h.item}</td>
                            <td className="p-1 text-center font-black text-emerald-600">{h.status}</td>
                            <td className="p-1 text-neutral-700">{h.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* NOTES & ISSUES */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-1">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider">
                      NOTES & ISSUES
                    </div>
                    <div className="p-2 text-[7px] text-neutral-800 min-h-[35px] font-medium leading-relaxed">
                      {data.notes || "No recorded notes or issues for this date."}
                    </div>
                  </div>

                  {/* NEXT PLANNED ACTIVITIES */}
                  <div className="w-full border-y border-neutral-900 bg-white overflow-hidden mt-1">
                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider">
                      NEXT PLANNED ACTIVITIES
                    </div>
                    <div className="p-2 text-[7px] text-neutral-800 min-h-[35px] font-medium leading-relaxed">
                      {data.nextPlan || "Additional 4 workers for Zone B waterproofing acceleration and Level 2 column formwork preparation."}
                    </div>
                  </div>
                </div>

                {/* PAGE FOOTER */}
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                  <span>Adidaya Studio | Daily Construction Report</span>
                  <span>DCR 71 01 00 | 1/1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
