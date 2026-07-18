"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import StageKO from "@/components/flow/projects/project-detail/setup/stages/StageKO";
import StageSD from "@/components/flow/projects/project-detail/setup/stages/StageSD";
import StageDD from "@/components/flow/projects/project-detail/setup/stages/StageDD";
import StageED from "@/components/flow/projects/project-detail/setup/stages/StageED";
import StagePC from "@/components/flow/projects/project-detail/setup/stages/StagePC";
import StageCN from "@/components/flow/projects/project-detail/setup/stages/StageCN";
import StageHO from "@/components/flow/projects/project-detail/setup/stages/StageHO";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { Button } from "@/shared/ui/primitives/button/button";
import { Download, Plus, ArrowUpRight } from "lucide-react";

type StageKey = "KO" | "SD" | "DD" | "ED" | "PC" | "CN" | "HO";

const STAGE_TABS: { key: StageKey; label: string }[] = [
  { key: "KO", label: "KO" },
  { key: "SD", label: "SD" },
  { key: "DD", label: "DD" },
  { key: "ED", label: "ED" },
  { key: "PC", label: "PC" },
  { key: "CN", label: "CN" },
  { key: "HO", label: "HO" },
];

export default function ProjectSetupStagesPage() {
  const { project, isLoading, error } = useProject();
  const [activeStage, setActiveStage] = useState<StageKey>("KO");

  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return <div className="p-12 text-center text-neutral-500">{error || "Project not found"}</div>;
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
  };

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500 px-4 md:px-0">
        <ProjectDetailHeader project={projectForHeader as any} />

        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Stages & Tasks Setup</h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 mb-6">
            <div className="flex flex-wrap gap-1 p-0.5 bg-neutral-100 rounded-full">
              {STAGE_TABS.map((stg) => {
                const active = activeStage === stg.key;
                return (
                  <button
                    key={stg.key}
                    onClick={() => setActiveStage(stg.key)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition-all duration-200 ${
                      active
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    {stg.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => console.log("Export active stage layout")}
                icon={<ArrowUpRight className="w-4 h-4" />}
              >
                Export Latest
              </Button>
              <Button
                size="sm"
                onClick={() => console.log("Add revision:", activeStage)}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Revision
              </Button>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeStage === "KO" && <StageKO />}
            {activeStage === "SD" && <StageSD />}
            {activeStage === "DD" && <StageDD />}
            {activeStage === "ED" && <StageED />}
            {activeStage === "PC" && <StagePC />}
            {activeStage === "CN" && <StageCN />}
            {activeStage === "HO" && <StageHO />}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
