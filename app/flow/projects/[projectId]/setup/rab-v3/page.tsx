"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import RABV3StructuredExcel from "@/components/flow/projects/project-detail/setup/rab-v3/RABV3StructuredExcel";
import { StageCardsOverview } from "@/components/flow/projects/project-detail/setup/common/StageCardsOverview";
import type { WBSStage, StageSummary, ProjectVersion } from "@/lib/flow/types/versioning.types";
import { TableIcon, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { buildWBSTree } from "@/lib/flow/mappers/wbs-tree";

export default function RABV3Page() {
  const projectCtx = useProject();
  const project = projectCtx?.project;
  const loading = projectCtx?.loading;

  const [pageViewMode, setPageViewMode] = useState<"OVERVIEW" | "EDITOR">("OVERVIEW");
  const [selectedStage, setSelectedStage] = useState<WBSStage>("BALLPARK");
  const [dbWbsItems, setDbWbsItems] = useState<any[]>([]);

  // Dynamically fetch active project WBS items from Supabase
  useEffect(() => {
    if (!project?.id) return;

    async function fetchWbs() {
      try {
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
          const { data, error } = await supabase
            .from("project_wbs_items")
            .select("*")
            .eq("project_id", project.id)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error || !data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < pageSize) break;
          page++;
        }

        if (allRows.length > 0) {
          const builtTree = buildWBSTree(allRows);
          setDbWbsItems(builtTree);
        }
      } catch (err) {
        console.error("Error fetching project WBS for RAB V3:", err);
      }
    }

    fetchWbs();
  }, [project?.id]);

  const projectForHeader = useMemo(() => {
    if (!project) return undefined;
    return {
      id: project.id,
      projectNo: (project as any).project_number || project.id,
      code: (project as any).project_code || project.id,
      name: (project as any).project_name || project.name || "Project",
      status: project.status || "active",
      progress: (project.meta as any)?.progress ?? 0,
      type: (project.meta as any)?.type ?? "design-build",
      stage: "sd" as any,
    };
  }, [project]);

  const projectInfo = useMemo(() => {
    if (!project) return undefined;
    let area = 1000;
    const rawArea = (project.meta as any)?.buildingArea || (project as any).buildingArea;
    if (rawArea) {
      const num = parseInt(String(rawArea).replace(/\D/g, ""));
      if (!isNaN(num) && num > 0) area = num;
    }

    const metaWbs = (project.meta as any)?.wbsTree || (project.meta as any)?.customWBS;
    const activeWbsTree = dbWbsItems.length > 0 ? dbWbsItems : (metaWbs || undefined);

    return {
      projectName: (project as any).project_name || project.name || "Project",
      projectCode: (project as any).project_code || project.id,
      buildingArea: area,
      buildingClass: ((project.meta as any)?.rabClass || (project as any).rabClass || "B") as any,
      estimateValues: (project.meta as any)?.estimateValues,
      wbsTree: activeWbsTree,
      stage: selectedStage,
    };
  }, [project, dbWbsItems, selectedStage]);

  // Stage Summaries for Overview Landing View
  const stageSummaries = useMemo<Record<WBSStage, StageSummary>>(() => {
    const dummyVersion: ProjectVersion = {
      id: "v1.0-default",
      projectId: project?.id || "",
      moduleType: "rab",
      stage: "BALLPARK",
      versionCode: "v1.0",
      name: "Target Ballpark RAB",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    return {
      BALLPARK: {
        stage: "BALLPARK",
        activeVersion: { ...dummyVersion, stage: "BALLPARK", name: "Target Ballpark RAB" },
        availableVersions: [{ ...dummyVersion, stage: "BALLPARK", name: "Target Ballpark RAB" }],
        totalCost: 8764220000,
        itemCount: 5,
        updatedAt: new Date().toISOString(),
      },
      ESTIMATES: {
        stage: "ESTIMATES",
        activeVersion: { ...dummyVersion, id: "v1.0-est", stage: "ESTIMATES", name: "Estimates Calculation" },
        availableVersions: [{ ...dummyVersion, id: "v1.0-est", stage: "ESTIMATES", name: "Estimates Calculation" }],
        totalCost: 9120450000,
        itemCount: 18,
        updatedAt: new Date().toISOString(),
      },
      DETAIL: {
        stage: "DETAIL",
        activeVersion: { ...dummyVersion, id: "v1.0-det", stage: "DETAIL", name: "RAB Rinci Pelaksanaan" },
        availableVersions: [{ ...dummyVersion, id: "v1.0-det", stage: "DETAIL", name: "RAB Rinci Pelaksanaan" }],
        totalCost: 9450800000,
        itemCount: 42,
        updatedAt: new Date().toISOString(),
      },
    };
  }, [project]);

  const handleSelectStageFromOverview = (stage: WBSStage) => {
    setSelectedStage(stage);
    setPageViewMode("EDITOR");
  };

  if (loading) {
    return <GlobalLoading />;
  }

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
        {/* HEADER BAR */}
        <ProjectDetailHeader project={projectForHeader as any} />

        {pageViewMode === "OVERVIEW" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  RAB V3 - Structured Excel Overview
                </h2>
                <p className="text-xs text-neutral-500">
                  Pilih tahapan anggaran (Ballpark, Estimates, atau Detail) untuk membuka Editor Excel V3
                </p>
              </div>
            </div>

            {/* STAGE CARDS OVERVIEW (Ballpark, Estimates, Detail) */}
            <StageCardsOverview
              moduleType="rab"
              summaries={stageSummaries}
              onSelectStage={handleSelectStageFromOverview}
              onChangeActiveVersion={() => {}}
              onCreateNewVersion={() => {}}
            />
          </div>
        ) : (
          <div className="w-full">
            <RABV3StructuredExcel
              projectInfo={projectInfo}
              mode={selectedStage}
              onBackToOverview={() => setPageViewMode("OVERVIEW")}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
