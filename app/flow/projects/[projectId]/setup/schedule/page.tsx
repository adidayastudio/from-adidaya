"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Save, Download, FileText, ChevronDown } from "lucide-react";
import ScheduleTimelineView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleTimelineView";
import ScheduleGanttView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleGanttView";
import ScheduleWeeklyDistributionView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleWeeklyDistributionView";
import ScheduleSCurveView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleSCurveView";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { supabase } from "@/lib/supabaseClient";

// WBS/RAB IMPORTS
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import { buildRABFromWBS } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-from-wbs";
import { buildRABEstimates, EstimateValues } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-estimates-builder";
import { RABItem } from "@/components/flow/projects/project-detail/setup/rab/ballpark/types/rab.types";
import { getNodeTotalPerM2 } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-utils";

import { ScheduleMode, ScheduleView, ScheduleValue, WeightedItem } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

interface ScheduleContext {
  buildingClass: "A" | "B" | "C";
  level: "Luxury" | "Premium" | "Standard";
  area: number;
  province: string;
  city: string;
}

const SCHEDULE_TABS = [
  { key: "BALLPARK", label: "Ballpark" },
  { key: "ESTIMATES", label: "Estimates" },
  { key: "DETAIL", label: "Detail" },
] satisfies { key: ScheduleMode; label: string }[];

export default function ProjectSetupSchedulePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

  const [activeMode, setActiveMode] = useState<ScheduleMode>("BALLPARK");
  const [activeView, setActiveView] = useState<ScheduleView>("TIMELINE");
  const [isSaving, setIsSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [timeScale, setTimeScale] = useState<"weekly" | "monthly">("weekly");

  const [context, setContext] = useState<ScheduleContext>({
    buildingClass: "B",
    level: "Premium",
    area: 1200,
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
  });

  const [scheduleValues, setScheduleValues] = useState<Record<string, ScheduleValue>>({});

  useEffect(() => {
    if (project) {
      let area = 1200;
      if (project.buildingArea) {
        const num = parseInt(project.buildingArea.replace(/\D/g, ""));
        if (!isNaN(num)) area = num;
      }
      setContext(prev => ({
        ...prev,
        buildingClass: (project.rabClass || "B") as any,
        area
      }));

      const savedSchedules = (project.meta as any)?.scheduleValues || {};
      setScheduleValues(savedSchedules);
    }
  }, [project]);

  const estimateValues = useMemo<EstimateValues>(() => {
    return (project?.meta as any)?.estimateValues || {};
  }, [project]);

  const rabTreeBallpark = useMemo(() => {
    return buildRABFromWBS({
      wbs: WBS_BALLPARK,
      rabClass: context.buildingClass,
      rf: 1, df: 1
    });
  }, [context.buildingClass]);

  const rabTreeEstimates = useMemo(() => {
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    return buildRABEstimates(wbsEstimates, estimateValues, {
      rabClass: context.buildingClass,
      rf: 1, df: 1, adjustmentFactor: 100
    });
  }, [estimateValues, context.buildingClass]);

  const rabTreeDetail = useMemo(() => {
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    const wbsDetail = buildDetailFromEstimates(wbsEstimates);
    return buildRABEstimates(wbsDetail, estimateValues, {
      rabClass: context.buildingClass || "C",
      rf: 1.0, df: 1.0, adjustmentFactor: 100
    });
  }, [estimateValues, context.buildingClass]);

  const activeTree = useMemo(() => {
    if (activeMode === "BALLPARK") return rabTreeBallpark;
    if (activeMode === "DETAIL") return rabTreeDetail;
    return rabTreeEstimates;
  }, [activeMode, rabTreeBallpark, rabTreeEstimates, rabTreeDetail]);

  const { weightedTree, totalCost } = useMemo(() => {
    let total = 0;
    const safeArea = Math.max(context.area, 0);

    const calculateTotal = (nodes: RABItem[]): number => {
      return nodes.reduce((acc, node) => {
        let nodeCost = 0;
        if (activeMode === "BALLPARK") {
          const perM2 = getNodeTotalPerM2(node);
          nodeCost = perM2 * safeArea;
        } else {
          nodeCost = node.total || 0;
        }
        return acc + nodeCost;
      }, 0);
    };

    total = calculateTotal(activeTree);

    const mapWeighted = (nodes: RABItem[]): WeightedItem[] => {
      return nodes.map(node => {
        let nodeCost = 0;
        if (activeMode === "BALLPARK") {
          const perM2 = getNodeTotalPerM2(node);
          nodeCost = perM2 * safeArea;
        } else {
          nodeCost = node.total || 0;
        }

        const weight = total > 0 ? (nodeCost / total) * 100 : 0;

        return {
          ...node,
          weight,
          schedule: scheduleValues[node.code] || {},
          children: node.children ? mapWeighted(node.children) : []
        } as WeightedItem;
      });
    };

    return { weightedTree: mapWeighted(activeTree), totalCost: total };
  }, [activeTree, activeMode, context.area, scheduleValues]);

  const estDuration = useMemo(() => {
    let minDate: number | null = null;
    let maxDate: number | null = null;

    Object.values(scheduleValues).forEach(val => {
      if (val.startDate) {
        const start = new Date(val.startDate).getTime();
        if (!isNaN(start)) {
          if (minDate === null || start < minDate) minDate = start;
        }
      }
      if (val.endDate) {
        const end = new Date(val.endDate).getTime();
        if (!isNaN(end)) {
          if (maxDate === null || end > maxDate) maxDate = end;
        }
      }
    });

    if (minDate !== null && maxDate !== null) {
      const diffMs = maxDate - minDate;
      return Math.round(diffMs / 86400000) + 1;
    }
    return 0;
  }, [scheduleValues]);

  const handleScheduleChange = (code: string, field: keyof ScheduleValue, value: any) => {
    setScheduleValues(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value
      }
    }));
  };

  const handleSaveSchedule = async () => {
    if (!project) return;
    try {
      setIsSaving(true);
      const currentMeta = project.meta || {};
      const updatedMeta = {
        ...currentMeta,
        scheduleValues: scheduleValues,
      };

      const { error: metaErr } = await supabase
        .from("projects")
        .update({ meta: updatedMeta })
        .eq("id", project.id);

      if (metaErr) throw metaErr;
      alert("✅ Schedule successfully saved!");
    } catch (err: any) {
      console.error(err);
      alert("❌ Failed to save schedule: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportXLS = () => {
    if (!project) return;
    setShowExportMenu(false);

    let minStart = new Date().getTime();
    let hasData = false;

    const findStart = (node: WeightedItem) => {
      const startStr = node.schedule?.startDate;
      if (startStr) {
        const t = new Date(startStr).getTime();
        if (!isNaN(t)) {
          minStart = Math.min(minStart, t);
          hasData = true;
        }
      }
      if (node.children) node.children.forEach(findStart);
    };
    weightedTree.forEach(findStart);

    const getSunday = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    };

    const projectStart = hasData ? getSunday(new Date(minStart)) : new Date();

    const timelineWeeks: { index: number; label: string; startDate: Date; endDate: Date }[] = [];
    const sunday = new Date(projectStart);

    if (timeScale === "weekly") {
      for (let i = 1; i <= 16; i++) {
        const wStart = new Date(sunday);
        wStart.setDate(sunday.getDate() + (i - 1) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        timelineWeeks.push({ index: i, label: `W${i}`, startDate: wStart, endDate: wEnd });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(projectStart.getFullYear(), projectStart.getMonth() + i, 1);
        const mEnd = new Date(projectStart.getFullYear(), projectStart.getMonth() + i + 1, 0);
        timelineWeeks.push({ index: i + 1, label: mStart.toLocaleDateString("id-ID", { month: "short" }), startDate: mStart, endDate: mEnd });
      }
    }

    const flatItems: WeightedItem[] = [];
    const flatten = (nodes: WeightedItem[]) => {
      nodes.forEach(n => {
        flatItems.push(n);
        if (n.children) flatten(n.children);
      });
    };
    flatten(weightedTree);

    const getTaskWeeklyWeight = (item: WeightedItem, weekStart: Date, weekEnd: Date) => {
      const startStr = item.schedule?.startDate;
      const duration = item.schedule?.durationDays || 0;
      const weight = item.weight || 0;

      if (!startStr || duration <= 0 || weight <= 0) return 0;

      const start = new Date(startStr);
      const end = new Date(start);
      end.setDate(start.getDate() + duration - 1);

      const overlapStart = new Date(Math.max(start.getTime(), weekStart.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), weekEnd.getTime()));

      if (overlapStart.getTime() <= overlapEnd.getTime()) {
        const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
        return (overlapDays / duration) * weight;
      }
      return 0;
    };

    const weeklyPlanned = timelineWeeks.map(w => {
      let sum = 0;
      flatItems.forEach(item => {
        const hasChildren = item.children && item.children.length > 0;
        if (!hasChildren) sum += getTaskWeeklyWeight(item, w.startDate, w.endDate);
      });
      return sum;
    });

    let cumulative = 0;
    const weeklyCumulative = weeklyPlanned.map(w => {
      cumulative += w;
      return Math.min(100, cumulative);
    });

    let tableRowsHtml = "";
    const addNodeHtml = (node: WeightedItem, depth: number) => {
      const startDate = node.schedule?.startDate || "—";
      const durationDays = node.schedule?.durationDays || "—";
      let finishDate = "—";
      if (startDate && Number(durationDays) > 0) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + Math.max(0, Number(durationDays) - 1));
        finishDate = d.toLocaleDateString("id-ID");
      }
      const predecessor = node.schedule?.predecessor || "—";

      let weekCells = "";
      timelineWeeks.forEach(w => {
        const val = getTaskWeeklyWeight(node, w.startDate, w.endDate);
        const isActive = val > 0;
        weekCells += `
          <td style="mso-number-format:'0\\.0'; text-align: center; ${isActive ? "background-color: #fef2f2; color: #dc2626; font-weight: bold;" : ""}">
            ${isActive ? val.toFixed(1) : ""}
          </td>
        `;
      });

      tableRowsHtml += `
        <tr>
          <td style="text-align: left; mso-number-format:'\\@';">${node.code}</td>
          <td style="text-align: left; padding-left: ${depth * 15}px;">${node.nameEn || node.name}</td>
          <td style="mso-number-format:'0\\.0%';">${node.weight?.toFixed(1) || 0}%</td>
          <td>${startDate}</td>
          <td>${finishDate}</td>
          <td>${durationDays}</td>
          <td>${predecessor}</td>
          ${weekCells}
        </tr>
      `;
      if (node.children) {
        node.children.forEach(c => addNodeHtml(c, depth + 1));
      }
    };
    weightedTree.forEach(c => addNodeHtml(c, 0));

    let weeklyFooterHtml = "";
    let cumulativeFooterHtml = "";
    timelineWeeks.forEach((w, idx) => {
      const pVal = weeklyPlanned[idx];
      const cVal = weeklyCumulative[idx];
      weeklyFooterHtml += `<td style="mso-number-format:'0\\.0'; text-align: center; font-weight: bold; background-color: #f3f4f6;">${pVal.toFixed(1)}</td>`;
      cumulativeFooterHtml += `<td style="mso-number-format:'0\\.0'; text-align: center; font-weight: bold; background-color: #fef2f2; color: #dc2626;">${cVal.toFixed(1)}</td>`;
    });

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Project Schedule</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; font-size: 10pt; text-align: center; }
            td { border: 1px solid #cbd5e1; font-size: 10pt; }
          </style>
        </head>
        <body>
          <h2>Project Schedule - ${project.project_name}</h2>
          <p>Generated: ${new Date().toLocaleDateString("id-ID")}</p>
          <table>
            <thead>
              <tr>
                <th>WBS Code</th>
                <th>Task Name</th>
                <th>Weight (%)</th>
                <th>Start Date</th>
                <th>Finish Date</th>
                <th>Duration (Days)</th>
                <th>Predecessor</th>
                ${timelineWeeks.map(w => `<th>${w.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
              <!-- Totals -->
              <tr style="font-weight: bold;">
                <td colspan="7" style="text-align: left; background-color: #f3f4f6;">Weekly Progress Plan (%)</td>
                ${weeklyFooterHtml}
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="7" style="text-align: left; background-color: #fef2f2; color: #dc2626;">Cumulative Progress Plan (%)</td>
                ${cumulativeFooterHtml}
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;
    const pCode = project.project_code || "TED";
    const modeName = activeMode.charAt(0).toUpperCase() + activeMode.slice(1).toLowerCase();
    const scaleName = timeScale.charAt(0).toUpperCase() + timeScale.slice(1).toLowerCase();
    const customFilename = `${datePrefix}_${pCode}_SCH_${modeName} ${scaleName}_R00`;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    link.setAttribute("download", `${customFilename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!project) return;
    setShowExportMenu(false);

    let minStart = new Date().getTime();
    let hasData = false;

    const findStart = (node: WeightedItem) => {
      const startStr = node.schedule?.startDate;
      if (startStr) {
        const t = new Date(startStr).getTime();
        if (!isNaN(t)) {
          minStart = Math.min(minStart, t);
          hasData = true;
        }
      }
      if (node.children) node.children.forEach(findStart);
    };
    weightedTree.forEach(findStart);

    const getSunday = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    };

    const projectStart = hasData ? getSunday(new Date(minStart)) : new Date();

    const timelineWeeks: { index: number; label: string; startDate: Date; endDate: Date; monthLabel: string }[] = [];
    const sunday = new Date(projectStart);

    if (timeScale === "weekly") {
      for (let i = 1; i <= 16; i++) {
        const wStart = new Date(sunday);
        wStart.setDate(sunday.getDate() + (i - 1) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        const monthName = wStart.toLocaleDateString("id-ID", { month: "long" }).toUpperCase();
        timelineWeeks.push({ 
          index: i, 
          label: `W${i}`, 
          startDate: wStart, 
          endDate: wEnd,
          monthLabel: monthName
        });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(projectStart.getFullYear(), projectStart.getMonth() + i, 1);
        const mEnd = new Date(projectStart.getFullYear(), projectStart.getMonth() + i + 1, 0);
        const monthName = mStart.toLocaleDateString("id-ID", { month: "long" }).toUpperCase();
        timelineWeeks.push({
          index: i + 1,
          label: mStart.toLocaleDateString("id-ID", { month: "short" }),
          startDate: mStart,
          endDate: mEnd,
          monthLabel: monthName
        });
      }
    }

    // Group columns by month for headers
    const monthHeadersMap: Record<string, number> = {};
    timelineWeeks.forEach(w => {
      if (timeScale === "weekly") {
        monthHeadersMap[w.monthLabel] = (monthHeadersMap[w.monthLabel] || 0) + 1;
      } else {
        monthHeadersMap[w.label] = 1;
      }
    });

    const flatItems: WeightedItem[] = [];
    const flatten = (nodes: WeightedItem[]) => {
      nodes.forEach(n => {
        flatItems.push(n);
        if (n.children) flatten(n.children);
      });
    };
    flatten(weightedTree);

    const getTaskWeeklyWeight = (item: WeightedItem, weekStart: Date, weekEnd: Date) => {
      const startStr = item.schedule?.startDate;
      const duration = item.schedule?.durationDays || 0;
      const weight = item.weight || 0;

      if (!startStr || duration <= 0 || weight <= 0) return 0;

      const start = new Date(startStr);
      const end = new Date(start);
      end.setDate(start.getDate() + duration - 1);

      const overlapStart = new Date(Math.max(start.getTime(), weekStart.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), weekEnd.getTime()));

      if (overlapStart.getTime() <= overlapEnd.getTime()) {
        const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
        return (overlapDays / duration) * weight;
      }
      return 0;
    };

    const weeklyPlanned = timelineWeeks.map(w => {
      let sum = 0;
      flatItems.forEach(item => {
        const hasChildren = item.children && item.children.length > 0;
        if (!hasChildren) sum += getTaskWeeklyWeight(item, w.startDate, w.endDate);
      });
      return sum;
    });

    let cumulative = 0;
    const weeklyCumulative = weeklyPlanned.map(w => {
      cumulative += w;
      return Math.min(100, cumulative);
    });

    // Build WBS rows HTML with uniform row height
    const ROW_HEIGHT_PDF = 20; // 20px per row
    let tableRowsHtml = "";
    const addNodeHtml = (node: WeightedItem, depth: number) => {
      const startDate = node.schedule?.startDate || "";
      const durationDays = node.schedule?.durationDays || "";
      
      let finishDate = "";
      if (startDate && Number(durationDays) > 0) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + Math.max(0, Number(durationDays) - 1));
        finishDate = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
      }
      const formattedStart = startDate ? new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "";
      const weightStr = node.weight ? `${node.weight.toFixed(2)}%` : "0,00%";

      let weekCellsHtml = "";
      timelineWeeks.forEach(w => {
        const val = getTaskWeeklyWeight(node, w.startDate, w.endDate);
        const isActive = val > 0;
        weekCellsHtml += `
          <td style="width: 42px; min-width: 42px; max-width: 42px; padding: 0; text-align: center; font-family: monospace; font-size: 8px; border-bottom: 1px solid #cbd5e1; height: ${ROW_HEIGHT_PDF}px; ${
            isActive ? "background-color: #fef2f2; font-weight: 700; color: #dc2626;" : ""
          }">
            ${isActive ? val.toFixed(1) : ""}
          </td>
        `;
      });

      tableRowsHtml += `
        <tr style="height: ${ROW_HEIGHT_PDF}px; ${depth === 0 ? "background-color: #f8fafc; font-weight: 700;" : ""}">
          <td style="width: 200px; min-width: 200px; max-width: 200px; padding: 0 8px; border-bottom: 1px solid #cbd5e1; font-size: 9px; text-align: left; padding-left: ${10 + depth * 10}px; color: ${depth === 0 ? "#0f172a" : "#334155"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: ${ROW_HEIGHT_PDF}px;">
            <span style="font-family: monospace; font-size: 8px; color: #64748b; font-weight: 700; margin-right: 6px;">${node.code}</span>${node.nameEn || node.name}
          </td>
          <td style="width: 60px; min-width: 60px; max-width: 60px; padding: 0; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-size: 9px; color: #475569; height: ${ROW_HEIGHT_PDF}px;">${formattedStart || "—"}</td>
          <td style="width: 60px; min-width: 60px; max-width: 60px; padding: 0; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-size: 9px; color: #475569; height: ${ROW_HEIGHT_PDF}px;">${finishDate || "—"}</td>
          <td style="width: 35px; min-width: 35px; max-width: 35px; padding: 0; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-size: 9px; color: #475569; height: ${ROW_HEIGHT_PDF}px;">${durationDays || "—"}</td>
          <td style="width: 50px; min-width: 50px; max-width: 50px; padding: 0; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-size: 9px; font-weight: 600; color: #0f172a; height: ${ROW_HEIGHT_PDF}px;">${weightStr}</td>
          ${weekCellsHtml}
        </tr>
      `;

      if (node.children) {
        node.children.forEach(c => addNodeHtml(c, depth + 1));
      }
    };
    weightedTree.forEach(c => addNodeHtml(c, 0));

    let weeklyFooterCells = "";
    let cumulativeFooterCells = "";
    timelineWeeks.forEach((w, idx) => {
      const pVal = weeklyPlanned[idx];
      const cVal = weeklyCumulative[idx];
      weeklyFooterCells += `
        <td style="width: 42px; min-width: 42px; max-width: 42px; padding: 0; text-align: center; font-family: monospace; font-size: 9px; font-weight: 700; border-bottom: 1px solid #cbd5e1; background: #f8fafc; color: #334155; height: 26px;">
          ${pVal > 0 ? pVal.toFixed(1) : "0.0"}
        </td>
      `;
      cumulativeFooterCells += `
        <td style="width: 42px; min-width: 42px; max-width: 42px; padding: 0; text-align: center; font-family: monospace; font-size: 9px; font-weight: 800; border-bottom: 1px solid #cbd5e1; background: #fef2f2; color: #dc2626; height: 26px;">
          ${cVal > 0 ? cVal.toFixed(1) : "0.0"}
        </td>
      `;
    });

    // Pure Mathematical Overlay SVG of S-Curve on top of the matrix grid body
    const staticLeftWidth = 200 + 60 + 60 + 35 + 50; // 405px total left cols
    const colW = 42;
    const headerHeight = 36; // total height of th rows in pixels
    const totalBodyRows = flatItems.length;
    const totalBodyHeight = totalBodyRows * ROW_HEIGHT_PDF;

    let svgPathD = "";
    let svgDots = "";

    weeklyCumulative.forEach((cumVal, idx) => {
      const x = staticLeftWidth + (idx * colW) + (colW / 2);
      const y = headerHeight + totalBodyHeight - ((cumVal / 100) * totalBodyHeight);

      svgDots += `
        <circle cx="${x}" cy="${y}" r="3.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.2" />
      `;
      svgPathD += `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    });

    const overlaySvgHtml = `
      <svg width="${staticLeftWidth + timelineWeeks.length * colW}" height="${headerHeight + totalBodyHeight}" style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 15; overflow: visible;">
        <path d="${svgPathD}" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
        ${svgDots}
      </svg>
    `;

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;
    const pCode = project.project_code || "TED";
    const modeName = activeMode.charAt(0).toUpperCase() + activeMode.slice(1).toLowerCase();
    const scaleName = timeScale.charAt(0).toUpperCase() + timeScale.slice(1).toLowerCase();
    const customFilename = `${datePrefix}_${pCode}_SCH_${modeName} ${scaleName}_R00`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>TIME SCHEDULE REPORT - ${project.project_name.toUpperCase()}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 15px; color: #1e293b; background-color: #ffffff; margin: 0; }
            #pdf-container { width: 1100px; margin: 0 auto; background: #fff; page-break-inside: avoid; }
            
            /* CORPORATE HEADER MATCHING RAB SCHEME */
            .header {
              border-bottom: 3px solid #111827;
              padding-bottom: 12px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: stretch;
            }
            .header-left-group {
              display: flex;
              align-items: center;
              flex-grow: 1;
            }
            .logo-container {
              width: 50px;
              height: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              flex-shrink: 0;
            }
            .logo-svg {
              width: 42px;
              height: 42px;
            }
            .logo-path {
              fill: #111827; /* Brand black logo */
            }
            .header-divider {
              width: 1px;
              background-color: #d1d5db;
              align-self: stretch;
              margin-right: 15px;
            }
            .header-info {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
            }
            .info-group {
              margin-bottom: 4px;
            }
            .info-group:last-child {
              margin-bottom: 0;
            }
            .info-label {
              display: block;
              font-size: 7px;
              font-weight: 700;
              color: #9ca3af;
              letter-spacing: 1px;
              margin-bottom: 1px;
              text-transform: uppercase;
            }
            .info-value-project {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .project-code-badge {
              background-color: #111827;
              color: #ffffff;
              font-size: 8px;
              font-weight: 800;
              padding: 1px 5px;
              border-radius: 3px;
              text-transform: uppercase;
            }
            .project-name-text {
              font-size: 11px;
              font-weight: 700;
              color: #111827;
              text-transform: uppercase;
            }
            .info-value-text {
              font-size: 9px;
              font-weight: 600;
              color: #374151;
              text-transform: uppercase;
            }
            .header-code-card {
              width: 170px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              overflow: hidden;
              background-color: #ffffff;
              flex-shrink: 0;
            }
            .card-top-section {
              padding: 6px 0 8px 0;
              text-align: center;
            }
            .card-large-module {
              font-size: 26px;
              font-weight: 800;
              color: #111827;
              line-height: 1.1;
              margin-bottom: 2px;
              letter-spacing: 0.5px;
            }
            .card-sub-en {
              font-size: 7px;
              font-weight: 800;
              color: #111827;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .card-sub-id {
              font-size: 7px;
              font-weight: 600;
              color: #6b7280;
            }
            .card-divider {
              height: 1px;
              background-color: #e5e7eb;
              margin: 0 8px;
            }
            .card-code {
              font-size: 10px;
              font-weight: 700;
              color: #111827;
              padding: 3px 0;
            }
            .card-footer-section {
              padding: 4px 8px 6px 8px;
              display: flex;
              justify-content: space-between;
            }
            .footer-col-left {
              text-align: left;
            }
            .footer-col-right {
              text-align: right;
            }
            .footer-label {
              font-size: 6px;
              font-weight: 750;
              color: #9ca3af;
              margin-bottom: 1px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .footer-val {
              font-size: 8px;
              font-weight: 700;
              color: #374151;
            }

            .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 15px; color: #475569; display: flex; align-items: center; gap: 6px; }
            .section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }

            /* TABLE STYLING WITH TABLE-LAYOUT FIXED AND NO OUTER BORDER */
            .matrix-wrapper { position: relative; margin-top: 8px; width: ${staticLeftWidth + timelineWeeks.length * colW}px; display: block; }
            table.schedule-table { width: ${staticLeftWidth + timelineWeeks.length * colW}px; border-collapse: collapse; table-layout: fixed; border: none; }
            table.schedule-table th { background-color: #0f172a; color: #ffffff; font-size: 8px; font-weight: 700; border-bottom: 1.5px solid #0f172a; border-right: none; border-left: none; border-top: none; padding: 0; text-align: center; height: 18px; }
            table.schedule-table td { padding: 0; text-align: center; }

            #loading-toast { position: fixed; top: 15px; left: 50%; transform: translateX(-50%); background: #111827; color: #fff; padding: 8px 16px; border-radius: 9999px; font-size: 11px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 9999; }
          </style>
        </head>
        <body>
          <div id="loading-toast">Generating Premium 1-Page Time Schedule PDF, please wait...</div>

          <div id="pdf-container">
            <!-- RAB CORPORATE HEADER STYLE -->
            <div class="header">
              <div class="header-left-group">
                <div class="logo-container">
                  <svg width="42" height="42" viewBox="0 0 964.35 1080" class="logo-svg">
                    <path fill="#111827" d="M594.49,903.79h-228.27c-11.87,13.85-19.27,29.88-26.63,46.08-11.98,26.37-24.48,52.51-37.04,78.61-22.58,46.93-92.55,66.66-141.78,37.26-51.77-30.92-62.49-101.56-34.65-143.17,16.71-24.96,35.58-48.51,54.05-72.25,37.65-48.36,75.68-96.42,113.57-144.59,20.65-26.26,41.66-52.24,61.86-78.84,9.22-12.15,20.39-23.37,25.76-41.41-7.42.78-12.75.84-17.85,1.94-71.85,15.58-143.67,31.34-215.51,46.95-10.89,2.37-21.82,4.98-32.87,6.08-41.21,4.08-74.44-10.21-97.88-44.9-21.18-31.34-21.71-64.89-7.9-98.88,11.5-28.31,51.09-63.38,96.47-60.16,19.97,1.42,39.82,4.76,59.67,7.65,66.15,9.65,132.27,19.54,198.44,29.14,3.89.56,8.02-.59,14.77-1.18-6-16.1-16.08-26.52-24.76-37.56-50.95-64.85-102.22-129.45-153.28-194.21-17.93-22.74-35.35-45.89-53.44-68.5-26.39-32.97-30.18-70.02-13.69-106.91C149.95,28.25,180.6,5.83,221.41.97c51.94-6.19,90.43,17.48,111.64,66.07,45.48,104.18,91.23,208.23,137.04,312.26,3.47,7.87,8.37,15.1,12.23,21.96,12.77-.89,12.84-10.49,15.35-17.01,18.38-47.86,36.05-95.99,54.36-143.87,5.96-15.59,12.23-31.21,20.01-45.94,25.26-47.81,87.64-63.42,136.08-38.72,66.49,33.91,75.74,119,23.52,168.74-45.18,43.04-88.7,87.84-132.79,132.02-5.13,5.14-9.27,11.28-16.71,20.45,12.45-1.28,20.14-1.48,27.58-2.93,68.85-13.48,137.65-27.24,206.49-40.77,10.92-2.15,21.98-3.58,32.98-5.31,73.62-11.54,137.51,59.72,107.62,139.6-13.97,37.34-42.32,59.67-82.74,63.4-14.24,1.31-29.06.14-43.23-2.23-70.31-11.77-140.47-24.39-210.72-36.51-10.65-1.84-21.5-5.24-32.2-.68-2.31,11.33,6.02,17.05,11.23,23.59,58.33,73.23,116.98,146.19,175.58,219.2,16.04,19.98,32.84,39.4,48.06,59.99,9.2,12.44,18.2,25.81,23.57,40.15,18.31,48.88-1.16,100.05-46.49,126.29-17.4,10.07-34.7,19.33-56.07,19.27-41.55-.11-73.93-16.3-93.5-53.06-13.57-25.49-23.87-52.72-35.72-79.13-6.33-14.11-12.84-28.13-20.11-44.02ZM482.56,651.15c-2.42,1.41-5.27,2.05-6.02,3.66-23.27,50.31-46.39,100.7-69.27,151.19-1.2,2.65-.15,6.32-.15,10.03,3.26.81,6.3,2.24,9.35,2.24,44.36-.06,88.73-.31,133.09-.58,1.03,0,2.27-.54,3.03-1.25.7-.64.89-1.85,2.17-4.79-17.94-51.94-43.44-102.41-65.3-154.37-1.1-2.61-4.64-4.2-6.89-6.13Z"/>
                  </svg>
                </div>
                <div class="header-divider"></div>
                <div class="header-info">
                  <div class="info-group">
                    <span class="info-label">PROJECT</span>
                    <div class="info-value-project">
                      <span class="project-code-badge">${project.project_code || "TED"}</span>
                      <span class="project-name-text">${project.project_name}</span>
                    </div>
                  </div>
                  <div class="info-group">
                    <span class="info-label">LOCATION</span>
                    <span class="info-value-text">${project.province || "DKI JAKARTA"}${project.city ? ', ' + project.city : ''}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">ESTIMATED DURATION</span>
                    <span class="info-value-text font-bold" style="color: #111827;">${estDuration} HARI &bull; ${timeScale.toUpperCase()} &bull; ${activeMode.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div class="header-code-card">
                <div class="card-top-section">
                  <div class="card-large-module">SCH</div>
                  <div class="card-sub-en">PROJECT TIME SCHEDULE</div>
                  <div class="card-sub-id">Project Schedule & S-Curve</div>
                </div>
                <div class="card-divider"></div>
                <div class="card-code">SCH-00-01</div>
                <div class="card-divider"></div>
                <div class="card-footer-section">
                  <div class="footer-col-left">
                    <div class="footer-label">REPORT DATE</div>
                    <div class="footer-val">${new Date().toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '')}</div>
                  </div>
                  <div class="footer-col-right">
                    <div class="footer-label">REV</div>
                    <div class="footer-val">00</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-title">Schedule Matrix & Overlaid S-Curve</div>

            <!-- Overlapping Container holding matrix + SVG line overlay -->
            <div class="matrix-wrapper">
              <!-- Overlay S-Curve SVG generated mathematically -->
              ${overlaySvgHtml}

              <!-- Core Matrix Table -->
              <table class="schedule-table">
                <thead>
                  <!-- Row 1: Months -->
                  <tr style="height: 18px;">
                    <th rowspan="2" style="width: 200px; text-align: left; padding-left: 10px;">ACTIVITY NAME</th>
                    <th colspan="2" style="width: 120px;">DATE</th>
                    <th rowspan="2" style="width: 35px;">DUR</th>
                    <th rowspan="2" style="width: 50px;">WGT</th>
                    ${Object.entries(monthHeadersMap).map(([mName, span]) => `
                      <th colspan="${span}" style="background-color: #1e293b; text-transform: uppercase;">
                        ${mName}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Row 2: Sub-headers for Weeks/Dates (Fixed shift bug by removing placeholder headers) -->
                  <tr style="height: 18px;">
                    <th style="width: 60px;">START</th>
                    <th style="width: 60px;">FINISH</th>
                    ${timelineWeeks.map(w => `<th style="width: 42px; background-color: #1e293b;">${timeScale === "weekly" ? w.label : "WGT"}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                  <!-- Weekly/Monthly totals -->
                  <tr style="font-weight: 700; background-color: #f8fafc; height: 26px;">
                    <td colspan="5" style="text-align: left; padding-left: 10px; border-bottom: 1px solid #cbd5e1; font-size: 9px; color: #0f172a;">
                      Weekly Progress Plan (%)
                    </td>
                    ${weeklyFooterCells}
                  </tr>
                  <!-- Cumulative totals -->
                  <tr style="font-weight: 800; background-color: #fef2f2; height: 26px;">
                    <td colspan="5" style="text-align: left; padding-left: 10px; border-bottom: 1px solid #cbd5e1; font-size: 9px; color: #dc2626;">Cumulative Progress Plan (%)</td>
                    ${cumulativeFooterCells}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                const element = document.getElementById('pdf-container');
                const opt = {
                  margin:       10,
                  filename:     '${customFilename}.pdf',
                  image:        { type: 'jpeg', quality: 0.98 },
                  html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                  jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' }
                };

                html2pdf().set(opt).from(element).save().then(function() {
                  document.getElementById('loading-toast').style.display = 'none';
                  setTimeout(function() { window.close(); }, 1500);
                }).catch(function(err) {
                  console.error(err);
                  alert("PDF Generation failed: " + err.message);
                });
              }, 1200);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) return <GlobalLoading />;
  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        {error || "Project not found."}
      </div>
    );
  }

  const projectForHeader = {
    id: project.id,
    projectNo: project.project_number,
    code: project.project_code,
    name: project.project_name,
    status: project.status as any,
    progress: (project.meta as any)?.progress ?? 0,
    type: (project.meta as any)?.type ?? "design-build",
    stage: "sd" as any,
    rabClass: (project.meta as any)?.rabClass,
    buildingArea: (project.meta as any)?.buildingArea,
  };

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6 w-full px-6 md:px-8 animate-in fade-in duration-500 pb-36">
        <ProjectDetailHeader project={projectForHeader as any} />

        <div className="space-y-6 w-full">
          {/* HEADER ROW */}
          <div className="flex items-center justify-between gap-4 border-b border-neutral-150 dark:border-neutral-800 pb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">Schedule Manager</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                Set timeline dates, durations, and review S-Curve progress
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 relative">
              {/* EXPORT DROP DOWN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-855 dark:text-neutral-200 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={handleExportXLS}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-neutral-400" />
                      Export to Excel (XLS)
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-400" />
                      Export to PDF
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setScheduleValues((project?.meta as any)?.scheduleValues || {});
                  alert("🔄 Reset unsaved changes.");
                }}
                className="bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-855 dark:text-neutral-200 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="bg-brand-red hover:bg-brand-red/90 disabled:opacity-50 text-white rounded-xl px-4 py-2 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-brand-red/20 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </div>

          {/* MODE TABS & SCALE SWITCHER */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Tabs value={activeMode} onChange={setActiveMode} items={SCHEDULE_TABS} />

            {/* SCALE SELECTOR (WEEKLY vs MONTHLY) */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-neutral-455 uppercase font-bold tracking-wider">Time Scale:</span>
              <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTimeScale("weekly")}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    timeScale === "weekly"
                      ? "bg-neutral-900 dark:bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-450 dark:hover:text-neutral-200"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeScale("monthly")}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    timeScale === "monthly"
                      ? "bg-neutral-900 dark:bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-450 dark:hover:text-neutral-200"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          {/* CONTEXT BAR */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 shadow-sm">
            <div className="flex items-center gap-6 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              <div>
                <span className="text-neutral-400 dark:text-neutral-500 mr-2">Total Project Cost:</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">
                  Rp {totalCost.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="border-l border-neutral-200 dark:border-neutral-800 h-4" />
              <div>
                <span className="text-neutral-400 dark:text-neutral-500 mr-2">Est. Duration:</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">
                  {estDuration > 0 ? `${estDuration} Days` : "— Days"}
                </span>
              </div>
            </div>

            {/* VIEW SWITCHER */}
            <div className="flex overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-0.5">
              {["SUMMARY", "TIMELINE", "GANTT", "SCURVE"].map((v) => (
                <button
                  key={v}
                  onClick={() => setActiveView(v as any)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    activeView === v
                      ? "bg-neutral-900 dark:bg-neutral-850 text-white shadow-sm"
                      : "text-neutral-500 dark:text-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850"
                  }`}
                >
                  {v === "SCURVE"
                    ? "S-Curve"
                    : v.charAt(0) + v.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE VIEW RENDERING */}
          <div className="animate-in fade-in duration-300">
            {activeView === "SUMMARY" && (
              <ScheduleTimelineView
                items={weightedTree}
                onUpdate={handleScheduleChange}
              />
            )}

            {activeView === "TIMELINE" && (
              <ScheduleGanttView
                items={weightedTree}
                onUpdate={handleScheduleChange}
                timeScale={timeScale}
              />
            )}

            {activeView === "GANTT" && (
              <ScheduleWeeklyDistributionView
                items={weightedTree}
                onUpdate={handleScheduleChange}
                timeScale={timeScale}
              />
            )}

            {activeView === "SCURVE" && (
              <ScheduleSCurveView 
                items={weightedTree} 
                timeScale={timeScale}
              />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
