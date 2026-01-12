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
import { Button } from "@/shared/ui/primitives/button/button";
import { Download, Plus } from "lucide-react";

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
    return <div className="p-12 text-center text-neutral-500">Loading...</div>;
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
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mb-4 text-sm">
        <span className="text-neutral-500">Flow</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="text-neutral-500">Projects</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="text-neutral-500">Setup</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="font-medium text-neutral-900">Stages & Tasks</span>
      </div>

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
          <ProjectDetailHeader project={projectForHeader as any} />

          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Stages & Tasks Setup</h2>
            </div>

            <div className="flex items-end justify-between border-b border-neutral-200 mb-6">
              <Tabs<StageKey>
                value={activeStage}
                onChange={setActiveStage}
                items={STAGE_TABS}
                className="gap-6"
              />
              <div className="pb-2 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => console.log("Export stage:", activeStage)}
                  icon={<Download className="w-4 h-4" />}
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
    </div>
  );
}

