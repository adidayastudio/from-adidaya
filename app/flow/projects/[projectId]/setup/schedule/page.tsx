"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { PageHeader, Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import ScheduleSummaryView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleSummaryView";
import ScheduleTimelineView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleTimelineView";
import ScheduleGanttView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleGanttView";
import ScheduleSCurveView from "@/components/flow/projects/project-detail/setup/schedule/views/ScheduleSCurveView";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

// RAB IMPORTS
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import { buildRABFromWBS } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-from-wbs";
import { buildRABEstimates, EstimateValues } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-estimates-builder";
import { RABItem } from "@/components/flow/projects/project-detail/setup/rab/ballpark/types/rab.types";
import { getNodeTotalPerM2 } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-utils";

import { ScheduleMode, ScheduleView, ScheduleValue, WeightedItem } from "@/components/flow/projects/project-detail/setup/schedule/schedule.types";

/* ================= TYPES ================= */

type ScheduleContext = {
  buildingClass: "A" | "B" | "C";
  level: "Luxury" | "Premium" | "Standard";
  area: number;
  province: string;
  city: string;
};

/* ================= TABS ================= */

const SCHEDULE_TABS = [
  { key: "BALLPARK", label: "Ballpark" },
  { key: "ESTIMATES", label: "Estimates" },
  { key: "DETAIL", label: "Detail" },
] satisfies { key: ScheduleMode; label: string }[];

/* ================= PAGE ================= */

export default function ProjectSetupSchedulePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

  const [activeMode, setActiveMode] = useState<ScheduleMode>("BALLPARK");
  const [activeView, setActiveView] = useState<ScheduleView>("GANTT"); // Default to Gantt for interaction

  const [context, setContext] = useState<ScheduleContext>({
    buildingClass: "B",
    level: "Premium",
    area: 1200,
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
  });

  // Initialize Context from Project
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
    }
  }, [project]);

  // STATE: Schedule Values
  const [scheduleValues, setScheduleValues] = useState<Record<string, ScheduleValue>>({});

  // STATE: Estimate Values (To match RAB Page - ideally this should be global context or fetched)
  // For now, we use empty/defaults, but in real app this connects to the same store as RAB Page.
  const [estimateValues, setEstimateValues] = useState<EstimateValues>({});


  /* ===== BUILD RAB TREES (REPLICATED FROM RAB PAGE) ===== */

  // 1. BALLPARK TREE
  const rabTreeBallpark = useMemo(() => {
    // Only basic build, no price overrides for now (simplification)
    return buildRABFromWBS({
      wbs: WBS_BALLPARK,
      rabClass: context.buildingClass,
      rf: 1, df: 1 // Default factors
    });
  }, [context.buildingClass]);

  // 2. ESTIMATES TREE
  const rabTreeEstimates = useMemo(() => {
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    return buildRABEstimates(wbsEstimates, estimateValues, {
      rabClass: context.buildingClass,
      rf: 1, df: 1, adjustmentFactor: 100
    });
  }, [estimateValues, context.buildingClass]);

  // 3. DETAIL TREE
  const rabTreeDetail = useMemo(() => {
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    const wbsDetail = buildDetailFromEstimates(wbsEstimates);
    return buildRABEstimates(wbsDetail, estimateValues, {
      rabClass: context.buildingClass || "C",
      rf: 1.0, df: 1.0, adjustmentFactor: 100
    });
  }, [estimateValues, context.buildingClass]);


  // SELECT ACTIVE TREE
  const activeTree = useMemo(() => {
    if (activeMode === "BALLPARK") return rabTreeBallpark;
    if (activeMode === "DETAIL") return rabTreeDetail;
    return rabTreeEstimates;
  }, [activeMode, rabTreeBallpark, rabTreeEstimates, rabTreeDetail]);


  /* ===== CALCULATE WEIGHTS ===== */
  const { weightedTree, totalCost } = useMemo(() => {
    let total = 0;

    // Calculate Total first
    // Note: Ballpark uses 'unitPrice * area' logic for L0/L1, but deeper might need careful accumulation.
    // For simplicity, we use the `total` property if available, or calculate it.

    const safeArea = Math.max(context.area, 0);

    const calculateTotal = (nodes: RABItem[]): number => {
      return nodes.reduce((acc, node) => {
        // If Ballpark L1/L0, it might use unitPrice as per m2
        // But 'rab-from-wbs' returns unitPrice as 'Price/m2'.
        // We need total Absolute Cost for weighting.

        let nodeCost = 0;
        if (activeMode === "BALLPARK") {
          // In Ballpark mode, lowest nodes are what matters? 
          // Actually getNodeTotalPerM2 handles recursion.
          const perM2 = getNodeTotalPerM2(node);
          nodeCost = perM2 * safeArea;
        } else {
          // Estimates/Detail have .total pre-calculated
          nodeCost = node.total || 0;
        }
        return acc + nodeCost;
      }, 0);
    };

    total = calculateTotal(activeTree);

    // Now map to Weighted Items
    // We need to inject 'weight' and 'schedule' into every node
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


  /* ===== HANDLERS ===== */
  const handleScheduleChange = (code: string, field: keyof ScheduleValue, value: any) => {
    setScheduleValues(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value
      }
    }));
  };

  // === CONDITIONAL RETURNS (must be after all hooks) ===
  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
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

  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Projects", href: "/flow/projects" },
          { label: breadcrumbLabel, href: `/flow/projects/${projectId}` },
          { label: "Setup" },
          { label: "Schedule" },
        ]}
      />

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
          <ProjectDetailHeader project={projectForHeader as any} />

          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4">
              <PageHeader title="Schedule" />
              <div className="flex items-center gap-2">
                <button className="rounded-md border px-3 py-2 text-sm">Export</button>
                <button className="rounded-md bg-brand-red px-3 py-2 text-sm text-white">Save Schedule</button>
              </div>
            </div>

            {/* TABS */}
            <Tabs value={activeMode} onChange={setActiveMode} items={SCHEDULE_TABS} />

            {/* CONTEXT BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-neutral-50 p-4">
              <div className="flex items-center gap-6 text-sm text-neutral-600">
                <div>
                  <span className="text-neutral-400 mr-2">Total Project Cost:</span>
                  <span className="font-semibold text-neutral-900">
                    Rp {totalCost.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 mr-2">Est. Duration:</span>
                  <span className="font-semibold text-neutral-900">
                    - Days
                  </span>
                </div>
              </div>

              {/* VIEW SWITCHER */}
              <div className="flex overflow-hidden rounded-md border bg-white">
                {["SUMMARY", "TIMELINE", "GANTT", "SCURVE"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setActiveView(v as any)}
                    className={`px-4 py-2 text-xs border-r last:border-0 ${activeView === v ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
                  >
                    {v === "SCURVE" ? "S-Curve" : v.charAt(0) + v.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* VIEWS */}
            {activeView === "GANTT" && (
              <ScheduleGanttView
                items={weightedTree}
                onUpdate={handleScheduleChange}
              />
            )}

            {activeView === "SCURVE" && (
              <ScheduleSCurveView items={weightedTree} />
            )}

            {/* Placeholder for other views */}
            {activeView !== "GANTT" && activeView !== "SCURVE" && (
              <div className="p-12 text-center text-neutral-400 border border-dashed rounded-lg">
                {activeView} View is currently under development. Please use Gantt view.
              </div>
            )}

          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
